/**
 * Report template configurations
 */

import type { ReportTemplate, ReportTemplateMetadata } from "~/lib/report-types";
import { RAID_ZONES } from "~/lib/raid-zones";

/**
 * Template 1: Character Attendance Report
 * Individual character performance with flexible filtering and week grouping
 */
const CHARACTER_ATTENDANCE_REPORT: ReportTemplate = {
  id: "character-attendance-report",
  name: "Character Attendance Report",
  description: "Individual character performance with weighted attendance, filterable by date range, character type, zone, and class. Supports week-based grouping and pivoting.",
  category: "character",
  startingEntity: "characters",
  defaultVisualization: "table",
  availableVisualizations: ["table", "bar"],

  columns: [
    { table: "characters", column: "characterId", alias: "characterId" },
    { table: "characters", column: "name", alias: "name", label: "Character" },
    { table: "characters", column: "class", alias: "class", label: "Class" },
    { table: "raidLogAttendeeMap", column: "raidLogId", alias: "raidsAttended", aggregate: "countDistinct", label: "Raids Attended" },
    { table: "raidBenchMap", column: "raidId", alias: "timesBenched", aggregate: "countDistinct", label: "Times Benched" },
    { table: "raids", column: "attendanceWeight", alias: "weightedPoints", aggregate: "sum", label: "Weighted Points" },
  ],

  joins: [
    {
      type: "leftJoin",
      table: "raidLogAttendeeMap",
      on: { left: "characters.characterId", right: "raidLogAttendeeMap.characterId" }
    },
    {
      type: "leftJoin",
      table: "raidLogs",
      on: { left: "raidLogAttendeeMap.raidLogId", right: "raidLogs.raidLogId" }
    },
    {
      type: "leftJoin",
      table: "raids",
      on: { left: "raidLogs.raidId", right: "raids.raidId" }
    },
    {
      type: "leftJoin",
      table: "raidBenchMap",
      alias: "raidBenchMap",
      on: { left: "characters.characterId", right: "raidBenchMap.characterId" }
    }
  ],

  filters: [
    { column: "characters.isIgnored", operator: "eq", value: false },
    { column: "raids.date", operator: "gte", parameterKey: "dateRange.start" },
    { column: "raids.date", operator: "lte", parameterKey: "dateRange.end" },
  ],

  groupBy: [
    { table: "characters", column: "characterId" },
    { table: "characters", column: "name" },
    { table: "characters", column: "class" },
  ],

  orderBy: [
    { column: "weightedPoints", direction: "desc" }
  ],

  parameters: [
    {
      key: "dateRange",
      label: "Date Range",
      type: "dateRange",
      required: true,
      helpText: "Select the date range for attendance calculation"
    },
    {
      key: "characterType",
      label: "Character Type",
      type: "enum",
      required: false,
      defaultValue: "primary",
      options: [
        { label: "All Characters", value: "all" },
        { label: "Primary Only", value: "primary" },
        { label: "Secondary Only", value: "secondary" },
      ],
      helpText: "Filter by primary characters, secondary characters, or show all"
    },
    {
      key: "zones",
      label: "Zones",
      type: "multiSelect",
      required: false,
      options: RAID_ZONES.map(zone => ({ label: zone, value: zone })),
      helpText: "Filter by specific raid zones (leave empty for all zones)"
    },
    {
      key: "classes",
      label: "Classes",
      type: "multiSelect",
      required: false,
      options: [
        { label: "Druid", value: "Druid" },
        { label: "Hunter", value: "Hunter" },
        { label: "Mage", value: "Mage" },
        { label: "Paladin", value: "Paladin" },
        { label: "Priest", value: "Priest" },
        { label: "Rogue", value: "Rogue" },
        { label: "Shaman", value: "Shaman" },
        { label: "Warlock", value: "Warlock" },
        { label: "Warrior", value: "Warrior" },
      ],
      helpText: "Filter by specific classes (leave empty for all classes)"
    },
    {
      key: "groupByWeek",
      label: "Group by Week",
      type: "boolean",
      required: false,
      defaultValue: false,
      helpText: "Group attendance by lockout week (Tuesday-Monday)"
    },
    {
      key: "pivotByWeek",
      label: "Pivot by Week",
      type: "boolean",
      required: false,
      defaultValue: false,
      helpText: "Display weeks as columns (requires Group by Week)"
    },
  ],

  createdBy: "system",
  version: 1,
};

/**
 * Template 2: Compare Attendance for Primary Characters
 * Side-by-side comparison for selected characters or classes
 */
const COMPARE_ATTENDANCE_REPORT: ReportTemplate = {
  id: "compare-attendance-report",
  name: "Compare Attendance for Primary Characters",
  description: "Side-by-side comparison of attendance for 2+ selected characters or classes. Shows raids attended per zone with week-based grouping support.",
  category: "character",
  startingEntity: "characters",
  defaultVisualization: "table",
  availableVisualizations: ["table", "bar"],

  columns: [
    { table: "characters", column: "characterId", alias: "characterId" },
    { table: "characters", column: "name", alias: "name", label: "Character" },
    { table: "characters", column: "class", alias: "class", label: "Class" },
    { table: "raids", column: "zone", alias: "zone", label: "Zone" },
    { table: "raids", column: "raidId", alias: "raidsInZone", aggregate: "countDistinct", label: "Raids" },
    { table: "raids", column: "attendanceWeight", alias: "weightedPoints", aggregate: "sum", label: "Weighted Points" },
  ],

  joins: [
    {
      type: "innerJoin",
      table: "raidLogAttendeeMap",
      on: { left: "characters.characterId", right: "raidLogAttendeeMap.characterId" }
    },
    {
      type: "innerJoin",
      table: "raidLogs",
      on: { left: "raidLogAttendeeMap.raidLogId", right: "raidLogs.raidLogId" }
    },
    {
      type: "innerJoin",
      table: "raids",
      on: { left: "raidLogs.raidId", right: "raids.raidId" }
    },
  ],

  filters: [
    { column: "characters.isPrimary", operator: "eq", value: true },
    { column: "characters.isIgnored", operator: "eq", value: false },
    { column: "raids.date", operator: "gte", parameterKey: "dateRange.start" },
    { column: "raids.date", operator: "lte", parameterKey: "dateRange.end" },
  ],

  groupBy: [
    { table: "characters", column: "characterId" },
    { table: "characters", column: "name" },
    { table: "characters", column: "class" },
    { table: "raids", column: "zone" },
  ],

  orderBy: [
    { column: "name", direction: "asc" },
    { column: "zone", direction: "asc" },
  ],

  parameters: [
    {
      key: "characterIds",
      label: "Characters",
      type: "characterMultiSelect",
      required: true,
      min: 2,
      helpText: "Select 2 or more primary characters to compare (or use class filter instead)"
    },
    {
      key: "classes",
      label: "Classes (Alternative)",
      type: "multiSelect",
      required: false,
      options: [
        { label: "Druid", value: "Druid" },
        { label: "Hunter", value: "Hunter" },
        { label: "Mage", value: "Mage" },
        { label: "Paladin", value: "Paladin" },
        { label: "Priest", value: "Priest" },
        { label: "Rogue", value: "Rogue" },
        { label: "Shaman", value: "Shaman" },
        { label: "Warlock", value: "Warlock" },
        { label: "Warrior", value: "Warrior" },
      ],
      helpText: "Or compare all characters of selected classes (aggregated)"
    },
    {
      key: "dateRange",
      label: "Date Range",
      type: "dateRange",
      required: true,
      helpText: "Select the date range for comparison"
    },
    {
      key: "zones",
      label: "Zones",
      type: "multiSelect",
      required: false,
      options: RAID_ZONES.map(zone => ({ label: zone, value: zone })),
      helpText: "Filter by specific raid zones (leave empty for all zones)"
    },
    {
      key: "groupByWeek",
      label: "Group by Week",
      type: "boolean",
      required: false,
      defaultValue: false,
      helpText: "Group attendance by lockout week (Tuesday-Monday)"
    },
    {
      key: "pivotByWeek",
      label: "Pivot by Week",
      type: "boolean",
      required: false,
      defaultValue: false,
      helpText: "Display weeks as columns instead of zones (requires Group by Week)"
    },
  ],

  createdBy: "system",
  version: 1,
};

/**
 * All available report templates
 */
const REPORT_TEMPLATES: ReportTemplate[] = [
  CHARACTER_ATTENDANCE_REPORT,
  COMPARE_ATTENDANCE_REPORT,
];

/**
 * Get list of all report templates (metadata only)
 */
export function getReportTemplateList(): ReportTemplateMetadata[] {
  return REPORT_TEMPLATES.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    defaultVisualization: template.defaultVisualization,
  }));
}

/**
 * Get full report template by ID
 */
export function getReportTemplate(templateId: string): ReportTemplate | null {
  return REPORT_TEMPLATES.find(t => t.id === templateId) ?? null;
}

/**
 * Get all report templates
 */
export function getAllReportTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES;
}
