/**
 * Helper functions for report generation
 */

import { format } from "date-fns";

/**
 * Calculate the lockout week start date for a given date
 * Lockout weeks run Tuesday-Monday
 *
 * @param date - The date to calculate lockout week for
 * @returns The Tuesday that starts the lockout week containing the given date
 */
export function getLockoutWeekStart(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate days since Tuesday (2)
  // Tuesday = 2, so we want to subtract (dayOfWeek - 2) % 7
  let daysSinceTuesday = dayOfWeek - 2;
  if (daysSinceTuesday < 0) {
    daysSinceTuesday += 7;
  }

  const tuesday = new Date(date);
  tuesday.setDate(date.getDate() - daysSinceTuesday);
  tuesday.setHours(0, 0, 0, 0);

  return tuesday;
}

/**
 * Format a lockout week for display
 *
 * @param weekStart - The Tuesday that starts the lockout week
 * @returns Formatted week string (e.g., "Week of Jan 2, 2024")
 */
export function formatLockoutWeek(weekStart: Date): string {
  return `Week of ${format(weekStart, "MMM d, yyyy")}`;
}

/**
 * Get all lockout week starts in a date range
 *
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Array of Tuesday dates representing lockout week starts
 */
export function getLockoutWeeksInRange(startDate: Date, endDate: Date): Date[] {
  const weeks: Date[] = [];
  const firstWeekStart = getLockoutWeekStart(startDate);

  let currentWeek = new Date(firstWeekStart);
  while (currentWeek <= endDate) {
    weeks.push(new Date(currentWeek));
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  return weeks;
}

/**
 * Transform flat row data into pivot table format (rows × columns)
 *
 * @param data - Array of data rows
 * @param rowKey - Key to use for rows (e.g., "characterName")
 * @param columnKey - Key to use for columns (e.g., "zone" or "lockoutWeekStart")
 * @param valueKey - Key to use for cell values (e.g., "raidsAttended")
 * @returns Pivoted data structure
 */
export function pivotData<T extends Record<string, unknown>>(
  data: T[],
  rowKey: string,
  columnKey: string,
  valueKey: string
): Array<Record<string, unknown>> {
  const pivoted: Record<string, Record<string, unknown>> = {};

  // Get unique column values
  const columns = new Set<string>();

  for (const row of data) {
    const rowId = String(row[rowKey]);
    const colId = String(row[columnKey]);
    const value = row[valueKey];

    if (!pivoted[rowId]) {
      pivoted[rowId] = { [rowKey]: row[rowKey] };
    }

    pivoted[rowId][colId] = value;
    columns.add(colId);
  }

  return Object.values(pivoted);
}

/**
 * Convert data to CSV format
 *
 * @param data - Array of data objects
 * @param columns - Optional array of column names to include (in order)
 * @returns CSV string
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: string[]
): string {
  if (data.length === 0) {
    return "";
  }

  // Use provided columns or extract from first row
  const cols = columns ?? Object.keys(data[0]!);

  // Header row
  const header = cols.map(escapeCSVValue).join(",");

  // Data rows
  const rows = data.map(row => {
    return cols.map(col => escapeCSVValue(row[col])).join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Calculate attendance percentage
 *
 * @param attended - Number of raids attended
 * @param total - Total number of raids
 * @returns Percentage (0-100)
 */
export function calculateAttendancePercentage(attended: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((attended / total) * 100 * 10) / 10; // Round to 1 decimal place
}
