// src/server/api/v2/helpers/attendance.ts
import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import { type db as dbType } from "~/server/db";
import { raids, raidLogs, raidLogAttendeeMap, raidBenchMap } from "~/server/db/schema";
import type {
  AttendanceReportData,
  AttendanceWeekData,
  ZoneAttendanceData,
} from "../types/attendance-types";
import { getLockoutWeeks } from "./lockout-weeks";
import { GQL_ZONE_TO_DB, ALL_GQL_ZONES } from "../types/enums";

export type AttendanceArgs = {
  characterIds: number[];
  zones?: string[] | null; // GQL enum values e.g. ["NAXXRAMAS"]
  weeksBack: number;
  includeCurrentWeek: boolean;
  db: typeof dbType;
};

function buildEmptyReport(weeksBack: number, includeCurrentWeek: boolean): AttendanceReportData {
  const allWeeks = getLockoutWeeks(weeksBack, includeCurrentWeek);
  return {
    weeksBack,
    weightedAttendance: 0,
    weightedTotal: weeksBack * 3,
    weightedAttendancePct: 0,
    weeks: allWeeks.map((w) => ({
      weekStart: w.start.toISOString().split("T")[0]!,
      isCurrentWeek: w.isCurrentWeek,
      zones: [],
    })),
  };
}

export async function computeAttendance(args: AttendanceArgs): Promise<AttendanceReportData> {
  const { characterIds, zones, weeksBack, includeCurrentWeek, db } = args;

  if (characterIds.length === 0) return buildEmptyReport(weeksBack, includeCurrentWeek);

  const allWeeks = getLockoutWeeks(weeksBack, includeCurrentWeek);
  const startDateStr = allWeeks[0]!.start.toISOString().split("T")[0]!;
  const endDateStr = allWeeks[allWeeks.length - 1]!.end.toISOString().split("T")[0]!;

  // Resolve DB zone strings to filter on (null = all zones)
  const dbZones =
    zones && zones.length > 0
      ? zones.map((z) => GQL_ZONE_TO_DB[z]).filter((z): z is string => !!z)
      : null;

  // 1. All raids in the date range
  const raidsInRange = await db
    .select()
    .from(raids)
    .where(
      and(
        gte(raids.date, startDateStr),
        lt(raids.date, endDateStr),
        dbZones ? inArray(raids.zone, dbZones) : undefined,
      ),
    );

  if (raidsInRange.length === 0) return buildEmptyReport(weeksBack, includeCurrentWeek);

  const raidIds = raidsInRange.map((r) => r.raidId);

  // 2. Attendee status: character appeared in any log for this raid
  const attendeeRows = await db
    .selectDistinct({ raidId: raidLogs.raidId })
    .from(raidLogAttendeeMap)
    .innerJoin(raidLogs, eq(raidLogAttendeeMap.raidLogId, raidLogs.raidLogId))
    .where(
      and(
        isNotNull(raidLogs.raidId),
        inArray(raidLogs.raidId, raidIds),
        inArray(raidLogAttendeeMap.characterId, characterIds),
        eq(raidLogAttendeeMap.isIgnored, false),
      ),
    );

  // 3. Bench status
  const benchRows = await db
    .select({ raidId: raidBenchMap.raidId })
    .from(raidBenchMap)
    .where(
      and(inArray(raidBenchMap.raidId, raidIds), inArray(raidBenchMap.characterId, characterIds)),
    );

  const attendedRaidIds = new Set(
    attendeeRows.map((r) => r.raidId).filter((id): id is number => id !== null),
  );
  const benchRaidIds = new Set(benchRows.map((r) => r.raidId));

  // 4. Build week-by-zone results
  const zonesToReport = zones && zones.length > 0 ? zones : ALL_GQL_ZONES;
  let weightedAttendance = 0;
  const weekResults: AttendanceWeekData[] = [];

  for (const week of allWeeks) {
    const weekStartStr = week.start.toISOString().split("T")[0]!;
    const weekEndStr = week.end.toISOString().split("T")[0]!;

    const weekRaids = raidsInRange.filter((r) => r.date >= weekStartStr && r.date < weekEndStr);

    // Group raids by DB zone
    const byDbZone = new Map<string, typeof raidsInRange>();
    for (const r of weekRaids) {
      if (!byDbZone.has(r.zone)) byDbZone.set(r.zone, []);
      byDbZone.get(r.zone)!.push(r);
    }

    const zoneResults: ZoneAttendanceData[] = [];
    let weekWeightedSum = 0;

    for (const gqlZone of zonesToReport) {
      const dbZone = GQL_ZONE_TO_DB[gqlZone];
      if (!dbZone) continue;
      const zoneRaids = byDbZone.get(dbZone) ?? [];
      if (zoneRaids.length === 0) continue;

      let status: "ATTENDED" | "BENCH" | "ABSENT" = "ABSENT";
      let maxWeight = 0;
      const attendedRaids: typeof raidsInRange = [];

      for (const raid of zoneRaids) {
        if (attendedRaidIds.has(raid.raidId)) {
          status = "ATTENDED";
          if (raid.attendanceWeight > maxWeight) maxWeight = raid.attendanceWeight;
          attendedRaids.push(raid);
        } else if (benchRaidIds.has(raid.raidId) && status === "ABSENT") {
          status = "BENCH";
        }
      }

      const zoneWeight = status === "ATTENDED" ? maxWeight : 0;
      weekWeightedSum += zoneWeight;

      zoneResults.push({
        zone: gqlZone,
        status,
        attendanceWeight: zoneWeight,
        raids: attendedRaids,
      });
    }

    // Cap weekly sum at 3.0 (matches DB view behavior)
    weightedAttendance += Math.min(weekWeightedSum, 3.0);
    weekResults.push({
      weekStart: weekStartStr,
      isCurrentWeek: week.isCurrentWeek,
      zones: zoneResults,
    });
  }

  const weightedTotal = weeksBack * 3;
  return {
    weeksBack,
    weightedAttendance,
    weightedTotal,
    weightedAttendancePct: weightedTotal > 0 ? (weightedAttendance / weightedTotal) * 100 : 0,
    weeks: weekResults,
  };
}
