// src/server/api/v2/schema.ts
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { accounts, characters, raids, users } from "~/server/db/schema";
import { builder } from "./builder";
import { requireUser } from "./context";

// Import all type files — each .implement() call is a side effect
import "./types/enums";
import "./types/attendance";
import "./types/raid";
import "./types/character";
import "./types/character-family";

// User type defines and exports UserRef directly (not via refs.ts)
import { UserRef, type UserData } from "./types/user";
import { CharacterRef, CharacterFamilyRef, RaidRef } from "./refs";
import { CharacterTypeEnum, RaidZoneEnum, GQL_ZONE_TO_DB } from "./types/enums";

builder.queryType({
  fields: (t) => ({
    /** Look up users by Discord user ID (providerAccountId from auth_account WHERE provider='discord') */
    users: t.field({
      type: [UserRef],
      args: {
        discordIds: t.arg.stringList({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        requireUser(ctx);
        if (args.discordIds.length === 0) return [];
        const rows = await ctx.db
          .select({
            id: users.id,
            discordId: accounts.providerAccountId,
            name: users.name,
            image: users.image,
            isRaidManager: users.isRaidManager,
            isAdmin: users.isAdmin,
            characterId: users.characterId,
          })
          .from(users)
          .innerJoin(accounts, and(eq(accounts.userId, users.id), eq(accounts.provider, "discord")))
          .where(inArray(accounts.providerAccountId, args.discordIds));
        return rows as UserData[];
      },
    }),

    /** Single character by DB character ID */
    character: t.field({
      type: CharacterRef,
      nullable: true,
      args: {
        id: t.arg.int({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        requireUser(ctx);
        const result = await ctx.db
          .select()
          .from(characters)
          .where(eq(characters.characterId, args.id))
          .limit(1);
        return result[0] ?? null;
      },
    }),

    /** Family-level attendance (primary + all secondaries aggregated) */
    characterFamily: t.field({
      type: CharacterFamilyRef,
      nullable: true,
      args: {
        primaryCharacterId: t.arg.int({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        requireUser(ctx);
        const result = await ctx.db
          .select({ characterId: characters.characterId })
          .from(characters)
          .where(eq(characters.characterId, args.primaryCharacterId))
          .limit(1);
        if (!result[0]) return null;
        return { primaryCharacterId: args.primaryCharacterId };
      },
    }),

    /** List all non-ignored characters with optional type filter and name search */
    characters: t.field({
      type: [CharacterRef],
      args: {
        type: t.arg({ type: CharacterTypeEnum, required: false }),
        search: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        requireUser(ctx);
        const conditions = [eq(characters.isIgnored, false)];

        if (args.type === "PRIMARY") {
          conditions.push(eq(characters.isPrimary, true));
        } else if (args.type === "SECONDARY") {
          conditions.push(eq(characters.isPrimary, false));
        }

        if (args.search) {
          conditions.push(ilike(characters.name, `%${args.search}%`));
        }

        return ctx.db
          .select()
          .from(characters)
          .where(and(...conditions));
      },
    }),

    /** List raids with optional zone filter, newest first, offset/limit pagination */
    raids: t.field({
      type: [RaidRef],
      args: {
        zone: t.arg({ type: RaidZoneEnum, required: false }),
        limit: t.arg.int({ defaultValue: 50 }),
        offset: t.arg.int({ defaultValue: 0 }),
      },
      resolve: async (_root, args, ctx) => {
        requireUser(ctx);
        const conditions = [];
        if (args.zone) {
          const dbZone = GQL_ZONE_TO_DB[args.zone];
          if (dbZone) conditions.push(eq(raids.zone, dbZone));
        }
        return ctx.db
          .select()
          .from(raids)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(raids.date))
          .limit(args.limit ?? 50)
          .offset(args.offset ?? 0);
      },
    }),
  }),
});

export const schema = builder.toSchema();
