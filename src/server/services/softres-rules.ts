/**
 * SoftRes rule definitions and evaluation engine
 */

import type { SoftResRule, RuleEvaluationContext } from "./softres-rule-types";

/**
 * Rule 1: Info - First raid in this zone
 * Character has no recorded previous raids in the zone
 * Ignored when zone is null (unknown instance)
 */
const firstRaidInZoneRule: SoftResRule = {
  id: "first-raid-zone",
  name: "First raid in this zone",
  level: "info",
  evaluate: (ctx) =>
    ctx.zone !== null &&
    ctx.characterId !== null &&
    ctx.totalRaidsAttendedBenched !== null &&
    ctx.zoneRaidsAttendedBenched !== null &&
    ctx.totalRaidsAttendedBenched > 0 &&
    ctx.zoneRaidsAttendedBenched === 0,
  icon: "Info",
  color: "blue",
};

/**
 * Rule 2: Warning - No previous raids
 * Character has no recorded previous raids at all
 */
const noPreviousRaidsRule: SoftResRule = {
  id: "no-previous-raids",
  name: "No previous raids",
  level: "warning",
  evaluate: (ctx) =>
    ctx.characterId !== null && ctx.totalRaidsAttendedBenched === 0,
  icon: "AlertTriangle",
  color: "yellow",
};

/**
 * Rule 3: Warning - No database match
 * Character from SoftRes was not found in the database
 */
const noDatabaseMatchRule: SoftResRule = {
  id: "no-database-match",
  name: "No database match",
  level: "warning",
  evaluate: (ctx) => ctx.characterId === null,
  icon: "AlertTriangle",
  color: "yellow",
};

/**
 * Registry of all rules
 * Add new rules here to make them available for evaluation
 */
export const SOFTRES_RULES: SoftResRule[] = [
  firstRaidInZoneRule,
  noPreviousRaidsRule,
  noDatabaseMatchRule,
];

/**
 * Evaluate all rules for a given context
 * Returns array of rule IDs that match
 */
export function evaluateRules(ctx: RuleEvaluationContext): string[] {
  return SOFTRES_RULES.filter((rule) => rule.evaluate(ctx)).map(
    (rule) => rule.id,
  );
}

/**
 * Get rule by ID
 */
export function getRuleById(ruleId: string): SoftResRule | undefined {
  return SOFTRES_RULES.find((rule) => rule.id === ruleId);
}

/**
 * Get all matching rules with full rule data
 */
export function getMatchingRules(ctx: RuleEvaluationContext): SoftResRule[] {
  return SOFTRES_RULES.filter((rule) => rule.evaluate(ctx));
}
