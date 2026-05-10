// src/server/api/v2/refs.ts
import { builder } from "./builder";
import type { characters, raids, raidLogs } from "~/server/db/schema";
import type {
  AttendanceReportData,
  AttendanceWeekData,
  ZoneAttendanceData,
} from "./types/attendance-types";

type CharacterRow = typeof characters.$inferSelect;
type RaidRow = typeof raids.$inferSelect;
type RaidLogRow = typeof raidLogs.$inferSelect;

export type { CharacterRow, RaidRow, RaidLogRow };

export const CharacterRef = builder.objectRef<CharacterRow>("Character");
export const CharacterFamilyRef = builder.objectRef<{ primaryCharacterId: number }>(
  "CharacterFamily",
);
export const RaidRef = builder.objectRef<RaidRow>("Raid");
export const RaidLogRef = builder.objectRef<RaidLogRow>("RaidLog");
export const RaidLogAttendeeRef = builder.objectRef<{
  character: CharacterRow;
  status: string;
}>("RaidLogAttendee");
export const AttendanceReportRef = builder.objectRef<AttendanceReportData>("AttendanceReport");
export const AttendanceWeekRef = builder.objectRef<AttendanceWeekData>("AttendanceWeek");
export const ZoneAttendanceRef = builder.objectRef<ZoneAttendanceData>("ZoneAttendance");
