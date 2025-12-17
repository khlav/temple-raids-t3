/**
 * Query builder for report templates
 * Translates report template configurations into Drizzle ORM queries
 */

import { and, count, countDistinct, desc, eq, gte, inArray, lte, sql, sum, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { DB } from "~/server/db";
import {
  characters,
  raids,
  raidLogs,
  raidLogAttendeeMap,
  raidBenchMap,
} from "~/server/db/schema";
import type { ReportTemplate } from "~/lib/report-types";

/**
 * Build and execute a Drizzle query from a report template
 *
 * @param db - Database connection
 * @param template - Report template configuration
 * @param parameters - User-provided parameters
 * @returns Query results
 */
export async function buildAndExecuteQuery(
  db: DB,
  template: ReportTemplate,
  parameters: Record<string, unknown>
): Promise<unknown[]> {
  // Route to template-specific query builders
  switch (template.id) {
    case "character-attendance-report":
      return executeCharacterAttendanceReport(db, parameters);
    case "compare-attendance-report":
      return executeCompareAttendanceReport(db, parameters);
    default:
      throw new Error(`Unknown template ID: ${template.id}`);
  }
}

/**
 * Execute Character Attendance Report query
 */
async function executeCharacterAttendanceReport(
  db: DB,
  parameters: Record<string, unknown>
): Promise<unknown[]> {
  const dateRange = parameters.dateRange as { start: string; end: string };
  const characterType = (parameters.characterType as string) ?? "primary";
  const zones = parameters.zones as string[] | undefined;
  const classes = parameters.classes as string[] | undefined;
  const groupByWeek = (parameters.groupByWeek as boolean) ?? false;

  // Build WHERE conditions
  const conditions: SQL[] = [
    eq(characters.isIgnored, false),
  ];

  // Character type filter
  if (characterType === "primary") {
    conditions.push(eq(characters.isPrimary, true));
  } else if (characterType === "secondary") {
    conditions.push(eq(characters.isPrimary, false));
  }

  // Date range filter
  if (dateRange) {
    conditions.push(gte(raids.date, dateRange.start));
    conditions.push(lte(raids.date, dateRange.end));
  }

  // Zone filter
  if (zones && zones.length > 0) {
    conditions.push(inArray(raids.zone, zones));
  }

  // Class filter
  if (classes && classes.length > 0) {
    conditions.push(inArray(characters.class, classes));
  }

  // Week calculation SQL (Tuesday start)
  const lockoutWeekSQL = sql<string>`DATE_TRUNC('week', ${raids.date}::timestamp - INTERVAL '2 days') + INTERVAL '2 days'`;

  // Build SELECT clause
  if (groupByWeek) {
    // With week grouping
    const result = await db
      .select({
        characterId: characters.characterId,
        name: characters.name,
        class: characters.class,
        lockoutWeekStart: lockoutWeekSQL,
        raidsAttended: countDistinct(raidLogAttendeeMap.raidLogId),
        weightedPoints: sum(raids.attendanceWeight),
      })
      .from(characters)
      .leftJoin(
        raidLogAttendeeMap,
        eq(characters.characterId, raidLogAttendeeMap.characterId)
      )
      .leftJoin(
        raidLogs,
        eq(raidLogAttendeeMap.raidLogId, raidLogs.raidLogId)
      )
      .leftJoin(raids, eq(raidLogs.raidId, raids.raidId))
      .where(and(...conditions))
      .groupBy(
        characters.characterId,
        characters.name,
        characters.class,
        lockoutWeekSQL
      )
      .orderBy(characters.name, lockoutWeekSQL);

    return result;
  } else {
    // Without week grouping
    const result = await db
      .select({
        characterId: characters.characterId,
        name: characters.name,
        class: characters.class,
        raidsAttended: countDistinct(raidLogAttendeeMap.raidLogId),
        timesBenched: countDistinct(sql`CASE WHEN ${raidBenchMap.raidId} IS NOT NULL AND ${raids.raidId} = ${raidBenchMap.raidId} THEN ${raidBenchMap.raidId} END`),
        weightedPoints: sum(raids.attendanceWeight),
      })
      .from(characters)
      .leftJoin(
        raidLogAttendeeMap,
        eq(characters.characterId, raidLogAttendeeMap.characterId)
      )
      .leftJoin(
        raidLogs,
        eq(raidLogAttendeeMap.raidLogId, raidLogs.raidLogId)
      )
      .leftJoin(raids, eq(raidLogs.raidId, raids.raidId))
      .leftJoin(
        raidBenchMap,
        and(
          eq(characters.characterId, raidBenchMap.characterId),
          eq(raids.raidId, raidBenchMap.raidId)
        )
      )
      .where(and(...conditions))
      .groupBy(characters.characterId, characters.name, characters.class)
      .orderBy(desc(sum(raids.attendanceWeight)));

    return result;
  }
}

/**
 * Execute Compare Attendance Report query
 */
async function executeCompareAttendanceReport(
  db: DB,
  parameters: Record<string, unknown>
): Promise<unknown[]> {
  const dateRange = parameters.dateRange as { start: string; end: string };
  const characterIds = parameters.characterIds as number[] | undefined;
  const classes = parameters.classes as string[] | undefined;
  const zones = parameters.zones as string[] | undefined;
  const groupByWeek = (parameters.groupByWeek as boolean) ?? false;

  // Build WHERE conditions
  const conditions: SQL[] = [
    eq(characters.isPrimary, true),
    eq(characters.isIgnored, false),
  ];

  // Character or class filter (at least one required)
  if (characterIds && characterIds.length > 0) {
    conditions.push(inArray(characters.characterId, characterIds));
  } else if (classes && classes.length > 0) {
    conditions.push(inArray(characters.class, classes));
  } else {
    throw new Error("Either characterIds or classes must be provided");
  }

  // Date range filter
  if (dateRange) {
    conditions.push(gte(raids.date, dateRange.start));
    conditions.push(lte(raids.date, dateRange.end));
  }

  // Zone filter
  if (zones && zones.length > 0) {
    conditions.push(inArray(raids.zone, zones));
  }

  // Week calculation SQL (Tuesday start)
  const lockoutWeekSQL = sql<string>`DATE_TRUNC('week', ${raids.date}::timestamp - INTERVAL '2 days') + INTERVAL '2 days'`;

  if (groupByWeek) {
    // With week grouping
    const result = await db
      .select({
        characterId: characters.characterId,
        name: characters.name,
        class: characters.class,
        lockoutWeekStart: lockoutWeekSQL,
        raidsAttended: countDistinct(raids.raidId),
        weightedPoints: sum(raids.attendanceWeight),
      })
      .from(characters)
      .innerJoin(
        raidLogAttendeeMap,
        eq(characters.characterId, raidLogAttendeeMap.characterId)
      )
      .innerJoin(
        raidLogs,
        eq(raidLogAttendeeMap.raidLogId, raidLogs.raidLogId)
      )
      .innerJoin(raids, eq(raidLogs.raidId, raids.raidId))
      .where(and(...conditions))
      .groupBy(
        characters.characterId,
        characters.name,
        characters.class,
        lockoutWeekSQL
      )
      .orderBy(characters.name, lockoutWeekSQL);

    return result;
  } else {
    // Without week grouping - group by zone
    const result = await db
      .select({
        characterId: characters.characterId,
        name: characters.name,
        class: characters.class,
        zone: raids.zone,
        raidsInZone: countDistinct(raids.raidId),
        weightedPoints: sum(raids.attendanceWeight),
      })
      .from(characters)
      .innerJoin(
        raidLogAttendeeMap,
        eq(characters.characterId, raidLogAttendeeMap.characterId)
      )
      .innerJoin(
        raidLogs,
        eq(raidLogAttendeeMap.raidLogId, raidLogs.raidLogId)
      )
      .innerJoin(raids, eq(raidLogs.raidId, raids.raidId))
      .where(and(...conditions))
      .groupBy(
        characters.characterId,
        characters.name,
        characters.class,
        raids.zone
      )
      .orderBy(characters.name, raids.zone);

    return result;
  }
}
