// src/server/api/v2/types/attendance-types.ts
import type { RaidRow } from "../refs";

export type ZoneAttendanceData = {
  zone: string; // GQL enum value e.g. "NAXXRAMAS"
  status: "ATTENDED" | "BENCH" | "ABSENT";
  raids: RaidRow[]; // raids where the character(s) attended
};

export type AttendanceWeekData = {
  weekStart: string; // ISO date "YYYY-MM-DD", Tuesday
  isCurrentWeek: boolean;
  zones: ZoneAttendanceData[];
};

export type AttendanceReportData = {
  weeksBack: number;
  weeks: AttendanceWeekData[];
};
