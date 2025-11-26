/**
 * Type definitions for SoftRes rule system
 */

export type RuleLevel = "info" | "warning" | "error";

export interface RuleEvaluationContext {
  // Character data
  characterId: number | null; // null for unmatched characters
  characterName: string;
  characterClass: string;
  primaryCharacterId: number | null;
  primaryCharacterName: string | null;

  // Attendance statistics (null for unmatched characters)
  totalRaidsAttendedBenched: number | null;
  zoneRaidsAttendedBenched: number | null;
  primaryAttendancePct: number | null;

  // SoftRes data
  srItems: number[]; // Array of item IDs
  zone: string | null; // Database zone name (mapped from SoftRes, null if unknown)
}

export interface SoftResRule {
  id: string;
  name: string;
  level: RuleLevel;
  evaluate: (ctx: RuleEvaluationContext) => boolean;
  icon: string; // lucide-react icon name
  color: string; // CSS color or Tailwind color class
}
