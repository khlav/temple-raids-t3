// src/server/api/v2/types/attendance-types.ts
import type { raids } from "~/server/db/schema";

export type RaidRow = typeof raids.$inferSelect;

export type ZoneAttendanceData = {
  zone: string; // GQL enum value e.g. "NAXXRAMAS"
  status: "ATTENDED" | "BENCH" | "ABSENT";
  attendanceWeight: number; // weight of the best-attended raid in this zone/week
  raids: RaidRow[]; // raids where the character(s) attended
};

export type AttendanceWeekData = {
  weekStart: string; // ISO date "YYYY-MM-DD", Tuesday
  isCurrentWeek: boolean;
  zones: ZoneAttendanceData[];
};

export type AttendanceReportData = {
  weeksBack: number;
  weightedAttendance: number; // points earned (0 – weeksBack * 3)
  weightedTotal: number; // max possible = weeksBack * 3
  weightedAttendancePct: number; // 0–100
  weeks: AttendanceWeekData[];
};
