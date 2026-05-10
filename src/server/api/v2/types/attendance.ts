// src/server/api/v2/types/attendance.ts
import { AttendanceReportRef, AttendanceWeekRef, ZoneAttendanceRef, RaidRef } from "../refs";
import { RaidZoneEnum, AttendanceStatusEnum, type RaidZoneValues } from "./enums";

AttendanceReportRef.implement({
  fields: (t) => ({
    weeksBack: t.exposeInt("weeksBack"),
    weeks: t.field({
      type: [AttendanceWeekRef],
      resolve: (report) => report.weeks,
    }),
  }),
});

AttendanceWeekRef.implement({
  fields: (t) => ({
    weekStart: t.exposeString("weekStart"),
    isCurrentWeek: t.exposeBoolean("isCurrentWeek"),
    zones: t.field({
      type: [ZoneAttendanceRef],
      resolve: (week) => week.zones,
    }),
  }),
});

ZoneAttendanceRef.implement({
  fields: (t) => ({
    zone: t.field({
      type: RaidZoneEnum,
      resolve: (z) => z.zone as RaidZoneValues,
    }),
    status: t.field({
      type: AttendanceStatusEnum,
      resolve: (z) => z.status,
    }),
    raids: t.field({
      type: [RaidRef],
      resolve: (z) => z.raids,
    }),
  }),
});
