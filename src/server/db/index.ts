import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "~/server/db/schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const isSupabasePooler = env.DATABASE_URL.includes(":6543");

const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    // Keep the serverless footprint small so warm Vercel instances do not
    // each hold multiple idle connections.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    // Supabase transaction pooler (port 6543) does not support prepared
    // statements — disable them to avoid "prepared statement does not exist" errors.
    prepare: !isSupabasePooler,
  });
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
