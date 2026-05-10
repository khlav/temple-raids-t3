// src/server/api/v2/types/raid.ts
import { and, eq, inArray } from "drizzle-orm";
import { raidLogs, raidLogAttendeeMap, raidBenchMap, characters } from "~/server/db/schema";
import { RaidRef, RaidLogRef, RaidLogAttendeeRef, CharacterRef } from "../refs";
import { RaidZoneEnum, DB_ZONE_TO_GQL, type RaidZoneValues } from "./enums";
import { requireUser } from "../context";

RaidRef.implement({
  fields: (t) => ({
    id: t.exposeInt("raidId"),
    name: t.exposeString("name"),
    date: t.exposeString("date"),
    zone: t.field({
      type: RaidZoneEnum,
      resolve: (raid) => (DB_ZONE_TO_GQL[raid.zone] ?? "MOLTEN_CORE") as RaidZoneValues,
    }),
    attendanceWeight: t.exposeFloat("attendanceWeight"),
    logs: t.field({
      type: [RaidLogRef],
      resolve: async (raid, _args, ctx) => {
        requireUser(ctx);
        return ctx.db.select().from(raidLogs).where(eq(raidLogs.raidId, raid.raidId));
      },
    }),
    bench: t.field({
      type: [CharacterRef],
      resolve: async (raid, _args, ctx) => {
        requireUser(ctx);
        const benchRows = await ctx.db
          .select({ characterId: raidBenchMap.characterId })
          .from(raidBenchMap)
          .where(eq(raidBenchMap.raidId, raid.raidId));
        if (benchRows.length === 0) return [];
        return ctx.db
          .select()
          .from(characters)
          .where(
            inArray(
              characters.characterId,
              benchRows.map((r) => r.characterId),
            ),
          );
      },
    }),
  }),
});

RaidLogRef.implement({
  fields: (t) => ({
    id: t.exposeString("raidLogId"),
    name: t.exposeString("name"),
    zone: t.exposeString("zone", { nullable: true }),
    kills: t.field({
      type: ["String"],
      resolve: (log) => log.kills,
    }),
    killCount: t.field({
      type: "Int",
      nullable: true,
      resolve: (log) => log.killCount,
    }),
    startTime: t.field({
      type: "String",
      nullable: true,
      resolve: (log) => log.startTimeUTC?.toISOString() ?? null,
    }),
    endTime: t.field({
      type: "String",
      nullable: true,
      resolve: (log) => log.endTimeUTC?.toISOString() ?? null,
    }),
    attendees: t.field({
      type: [RaidLogAttendeeRef],
      resolve: async (log, _args, ctx) => {
        requireUser(ctx);
        const rows = await ctx.db
          .select({
            characterId: raidLogAttendeeMap.characterId,
            isIgnored: raidLogAttendeeMap.isIgnored,
          })
          .from(raidLogAttendeeMap)
          .where(
            and(
              eq(raidLogAttendeeMap.raidLogId, log.raidLogId),
              eq(raidLogAttendeeMap.isIgnored, false),
            ),
          );
        if (rows.length === 0) return [];
        const charRows = await ctx.db
          .select()
          .from(characters)
          .where(
            inArray(
              characters.characterId,
              rows.map((r) => r.characterId),
            ),
          );
        return charRows.map((c) => ({ character: c, status: "ATTENDED" }));
      },
    }),
  }),
});

RaidLogAttendeeRef.implement({
  fields: (t) => ({
    character: t.field({
      type: CharacterRef,
      resolve: (attendee) => attendee.character,
    }),
    status: t.exposeString("status"),
  }),
});
