# Supabase Migration Runbook

This project uses Supabase as hosted Postgres only. Application auth remains in the existing NextAuth + Drizzle tables under `public`, and application traffic stays on `postgres-js`.

## Connection Model

- `DATABASE_URL`: runtime application traffic
  - For Supabase on Vercel/serverless, use the transaction pooler URL.
- `DATABASE_MIGRATION_URL`: schema admin, dump/restore, and Drizzle migration traffic
  - Prefer Supabase direct connection when IPv6 is available.
  - Otherwise use the Supabase session pooler.

The runtime client in [src/server/db/index.ts](/Users/kirkhlavka/workspace/repos/temple-raids/temple-raids-t3/src/server/db/index.ts) automatically disables prepared statements when `DATABASE_URL` points at port `6543`, which is required for Supabase transaction pooling.

## Recommended Environment Variables

```bash
DATABASE_URL=postgres://...                 # runtime URL
DATABASE_MIGRATION_URL=postgres://...       # admin/migration URL

NEON_DATABASE_URL=postgres://...            # source for production export
SUPABASE_DEV_MIGRATION_URL=postgres://...   # DEV target for rehearsal
SUPABASE_PROD_MIGRATION_URL=postgres://...  # PROD target for cutover
```

The helper scripts below use `SOURCE_DATABASE_URL` and `TARGET_DATABASE_URL` by default. You can either export those directly or map them from the environment-specific variables above inline when running a command.

Dump artifacts exclude the Neon-managed `neon_auth` schema so provider-specific objects are not restored into Supabase.

## Rehearsal Workflow

1. Preflight the source and target databases.
2. Rehearse a full Neon dump into Supabase DEV.
3. Compare row counts.
4. Spot-check views, login, and write paths.

### 1. Preflight

```bash
SOURCE_DATABASE_URL="$NEON_DATABASE_URL" pnpm db:migration:preflight SOURCE_DATABASE_URL
TARGET_DATABASE_URL="$SUPABASE_DEV_MIGRATION_URL" pnpm db:migration:preflight TARGET_DATABASE_URL
```

The preflight script prints:

- database size
- Postgres version
- installed extensions
- presence of the `public` and `views` schemas

### 2. Full dump rehearsal

```bash
SOURCE_DATABASE_URL="$NEON_DATABASE_URL" pnpm db:migration:dump:full

DUMP_FILE=/absolute/path/to/backups/db-migration/<timestamp>-full.dump \
TARGET_DATABASE_URL="$SUPABASE_DEV_MIGRATION_URL" \
RESTORE_CLEAN=1 \
pnpm db:migration:restore
```

Notes:

- `RESTORE_CLEAN=1` adds `--clean --if-exists` to `pg_restore`.
- Rehearse against a reset or disposable DEV target when restoring schema + data together.
- If full restore collides with schema management, fall back to `pnpm db:migrate` against `DATABASE_MIGRATION_URL`, then use the data-only dump path below.

### 3. Data-only fallback

```bash
SOURCE_DATABASE_URL="$NEON_DATABASE_URL" pnpm db:migration:dump:data

DATABASE_URL="$SUPABASE_DEV_MIGRATION_URL" \
DATABASE_MIGRATION_URL="$SUPABASE_DEV_MIGRATION_URL" \
pnpm db:migrate

DUMP_FILE=/absolute/path/to/backups/db-migration/<timestamp>-data-only.dump \
TARGET_DATABASE_URL="$SUPABASE_DEV_MIGRATION_URL" \
pnpm db:migration:restore
```

## Row Count Validation

Compare Neon to Supabase after a rehearsal or cutover:

```bash
SOURCE_DATABASE_URL="$NEON_DATABASE_URL" \
TARGET_DATABASE_URL="$SUPABASE_DEV_MIGRATION_URL" \
pnpm db:migration:compare
```

The comparison checks these critical tables:

- `auth_account`
- `auth_session`
- `auth_user`
- `auth_verification_token`
- `character`
- `character_spells`
- `raid`
- `raid_bench_map`
- `raid_log`
- `raid_log_attendee_map`
- `raid_plan*`
- `recipes`

## Production Cutover

1. Run the full rehearsal successfully in DEV.
2. Prepare Vercel env vars ahead of time:
   - `DATABASE_URL` -> Supabase PROD runtime URL
   - `DATABASE_MIGRATION_URL` -> Supabase PROD admin URL
3. Enter a write freeze.
4. Create a final Neon dump.
5. Restore into a clean Supabase PROD database.
6. Run row-count validation and smoke tests.
7. Flip Vercel env vars and redeploy.

### Final export

```bash
SOURCE_DATABASE_URL="$NEON_DATABASE_URL" pnpm db:migration:dump:full
```

Preserve the generated dump artifact as the rollback snapshot.

### Production restore

```bash
DUMP_FILE=/absolute/path/to/backups/db-migration/<timestamp>-full.dump \
TARGET_DATABASE_URL="$SUPABASE_PROD_MIGRATION_URL" \
RESTORE_CLEAN=1 \
pnpm db:migration:restore
```

### Production parity check

```bash
SOURCE_DATABASE_URL="$NEON_DATABASE_URL" \
TARGET_DATABASE_URL="$SUPABASE_PROD_MIGRATION_URL" \
pnpm db:migration:compare
```

## Acceptance Checklist

- Row counts match on all critical tables.
- `views` schema queries succeed.
- Discord sign-in creates and reads sessions correctly.
- Raid create/edit flows work.
- Report queries work.
- New inserts do not collide on sequence-backed IDs.
- Runtime traffic through Supabase pooler works without prepared-statement errors.

## Rollback

Rollback is environment-switch only:

1. Restore Vercel `DATABASE_URL` to Neon.
2. Restore Vercel `DATABASE_MIGRATION_URL` to Neon admin URL if needed.
3. Redeploy immediately.

Do not attempt back-sync from failed Supabase writes during the first cutover.
