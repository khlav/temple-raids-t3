/**
 * tRPC router for SoftRes operations
 */

import { z } from "zod";
import { createTRPCRouter, raidManagerProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { SoftResRaidData } from "~/server/api/interfaces/softres";
import {
  matchCharactersBatch,
  getCharacterStatsBatch,
  type MatchedCharacterStats,
} from "~/server/services/softres-matcher-batch";
import { mapSoftResInstanceToDb } from "~/lib/softres-zone-mapping";
import { getMatchingRules } from "~/server/services/softres-rules";
import type { RuleEvaluationContext } from "~/server/services/softres-rule-types";
import { getAllItemsForZone, getAllItems } from "~/lib/item-mappings";
import { getSpecNameById } from "~/lib/class-specs";

export interface SoftResScanResult {
  characterId: number | null; // null for unmatched characters
  characterName: string;
  characterClass: string;
  primaryCharacterId: number | null;
  primaryCharacterName: string | null;
  classDetail: string; // Will be derived from class + spec
  srItems: Array<{
    itemId: number;
    itemName: string | undefined;
  }>;
  matchingRules: Array<{
    id: string;
    name: string;
    level: "info" | "warning" | "error";
    icon: string;
    color: string;
  }>;
  stats: {
    totalRaidsAttendedBenched: number;
    zoneRaidsAttendedBenched: number;
    primaryAttendancePct: number | null;
  } | null; // null for unmatched characters
}

export interface SoftResScanResponse {
  raidId: string;
  instance: string | null; // SoftRes instance identifier (can be null)
  zone: string | null; // Database zone name (null if mapping failed)
  raidDate: string;
  results: SoftResScanResult[];
}

/**
 * Fetch SoftRes raid data from the API
 */
async function fetchSoftResRaidData(raidId: string): Promise<SoftResRaidData> {
  const response = await fetch(`https://softres.it/api/raid/${raidId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `SoftRes raid with ID "${raidId}" not found`,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to fetch SoftRes data: ${response.statusText}`,
    });
  }

  return (await response.json()) as SoftResRaidData;
}

/**
 * Get class detail string from class and spec
 * Formats as "Class - Spec" (e.g., "Warrior - Protection")
 */
function getClassDetail(className: string, spec: number): string {
  const specName = getSpecNameById(spec);
  if (specName) {
    return `${className} - ${specName}`;
  }
  return className;
}

export const softres = createTRPCRouter({
  /**
   * Get SoftRes raid data and match characters to database
   * Returns enriched data with attendance stats and rule evaluations
   */
  getSoftResRaidData: raidManagerProcedure
    .input(z.string().min(1))
    .query(async ({ ctx, input }): Promise<SoftResScanResponse> => {
      const raidId = input;

      // Fetch SoftRes data
      const softresData = await fetchSoftResRaidData(raidId);

      // Map instance to database zone
      // Try instance first, then check instances array if instance is null
      let zone = mapSoftResInstanceToDb(softresData.instance);
      if (!zone && softresData.instances && softresData.instances.length > 0) {
        // Try each instance in the array until we find a match
        for (const instance of softresData.instances) {
          zone = mapSoftResInstanceToDb(instance);
          if (zone) break;
        }
      }

      // Pre-load item mappings - use all items if zone is unknown
      const zoneItems = zone
        ? await getAllItemsForZone(zone)
        : await getAllItems();

      // Step 1: Match all characters in batch (1 query)
      const characterMatches = await matchCharactersBatch(
        ctx.db,
        softresData.reserved,
      );

      // Separate matched and unmatched characters
      const matchedCharacterIds: number[] = [];
      const matchedReservedChars: SoftResRaidData["reserved"] = [];
      const unmatched: Array<{
        name: string;
        class: string;
        classDetail: string;
        srItems: Array<{
          itemId: number;
          itemName: string | undefined;
        }>;
      }> = [];

      for (const reservedChar of softresData.reserved) {
        const matchedId = characterMatches.get(reservedChar.name);
        if (matchedId === null || matchedId === undefined) {
          // Resolve items and class detail for unmatched characters
          const srItems = reservedChar.items.map((itemId) => ({
            itemId,
            itemName: zoneItems[itemId]?.name,
          }));

          unmatched.push({
            name: reservedChar.name,
            class: reservedChar.class,
            classDetail: getClassDetail(reservedChar.class, reservedChar.spec),
            srItems,
          });
        } else {
          matchedCharacterIds.push(matchedId);
          matchedReservedChars.push(reservedChar);
        }
      }

      // Step 2: Get all character stats in batch (6 queries total)
      // Can still get basic stats even when zone is null (zone-specific stats will be 0)
      const characterStatsMap = await getCharacterStatsBatch(
        ctx.db,
        matchedCharacterIds,
        zone ?? null,
      );

      // Step 3: Build complete dataset
      interface CharacterDataset {
        reservedChar: SoftResRaidData["reserved"][number];
        matchedCharacterId: number;
        stats: MatchedCharacterStats;
        srItems: Array<{
          itemId: number;
          itemName: string | undefined;
        }>;
        classDetail: string;
      }

      const characterDataset: CharacterDataset[] = [];

      for (const reservedChar of matchedReservedChars) {
        const matchedId = characterMatches.get(reservedChar.name);
        if (!matchedId) continue;

        const stats = characterStatsMap.get(matchedId);
        if (!stats) continue;

        // Get item names from pre-loaded zone items
        const srItems = reservedChar.items.map((itemId) => ({
          itemId,
          itemName: zoneItems[itemId]?.name,
        }));

        characterDataset.push({
          reservedChar,
          matchedCharacterId: matchedId,
          stats,
          srItems,
          classDetail: getClassDetail(reservedChar.class, reservedChar.spec),
        });
      }

      // Step 2: Evaluate all rules on the complete dataset
      const results: SoftResScanResult[] = [];

      for (const data of characterDataset) {
        if (!data.stats) continue; // Skip if no stats (shouldn't happen, but type safety)

        // Build evaluation context from complete dataset
        const evalContext: RuleEvaluationContext = {
          characterId: data.stats.characterId,
          characterName: data.stats.characterName,
          characterClass: data.stats.characterClass,
          primaryCharacterId: data.stats.primaryCharacterId,
          primaryCharacterName: data.stats.primaryCharacterName,
          totalRaidsAttendedBenched: data.stats.totalRaidsAttendedBenched,
          zoneRaidsAttendedBenched: data.stats.zoneRaidsAttendedBenched,
          primaryAttendancePct: data.stats.primaryAttendancePct,
          srItems: data.reservedChar.items,
          zone: zone ?? null,
        };

        // Evaluate all rules
        const matchingRules = getMatchingRules(evalContext);

        results.push({
          characterId: data.stats.characterId,
          characterName: data.stats.characterName,
          characterClass: data.stats.characterClass,
          primaryCharacterId: data.stats.primaryCharacterId,
          primaryCharacterName: data.stats.primaryCharacterName,
          classDetail: data.classDetail,
          srItems: data.srItems,
          matchingRules: matchingRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            level: rule.level,
            icon: rule.icon,
            color: rule.color,
          })),
          stats: {
            totalRaidsAttendedBenched: data.stats.totalRaidsAttendedBenched,
            zoneRaidsAttendedBenched: data.stats.zoneRaidsAttendedBenched,
            primaryAttendancePct: data.stats.primaryAttendancePct,
          },
        });
      }

      // Add unmatched characters to results and evaluate rules for them
      for (const unmatchedChar of unmatched) {
        // Build evaluation context for unmatched character
        const evalContext: RuleEvaluationContext = {
          characterId: null,
          characterName: unmatchedChar.name,
          characterClass: unmatchedChar.class,
          primaryCharacterId: null,
          primaryCharacterName: null,
          totalRaidsAttendedBenched: null,
          zoneRaidsAttendedBenched: null,
          primaryAttendancePct: null,
          srItems: unmatchedChar.srItems.map((item) => item.itemId),
          zone: zone ?? null,
        };

        // Evaluate all rules (will match "no-database-match" rule)
        const matchingRules = getMatchingRules(evalContext);

        results.push({
          characterId: null,
          characterName: unmatchedChar.name,
          characterClass: unmatchedChar.class,
          primaryCharacterId: null,
          primaryCharacterName: null,
          classDetail: unmatchedChar.classDetail,
          srItems: unmatchedChar.srItems,
          matchingRules: matchingRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            level: rule.level,
            icon: rule.icon,
            color: rule.color,
          })),
          stats: null,
        });
      }

      // Sort results by severity (error > warning > info), then by count of rules at that severity
      const severityOrder = { error: 3, warning: 2, info: 1 } as const;

      results.sort((a, b) => {
        // Get highest severity for each result
        const aMaxSeverity =
          a.matchingRules.length > 0
            ? Math.max(...a.matchingRules.map((r) => severityOrder[r.level]))
            : 0;
        const bMaxSeverity =
          b.matchingRules.length > 0
            ? Math.max(...b.matchingRules.map((r) => severityOrder[r.level]))
            : 0;

        // Sort by highest severity first (descending)
        if (aMaxSeverity !== bMaxSeverity) {
          return bMaxSeverity - aMaxSeverity;
        }

        // If same max severity, sort by count of rules at that severity
        if (aMaxSeverity > 0) {
          const aCountAtMax = a.matchingRules.filter(
            (r) => severityOrder[r.level] === aMaxSeverity,
          ).length;
          const bCountAtMax = b.matchingRules.filter(
            (r) => severityOrder[r.level] === bMaxSeverity,
          ).length;

          if (aCountAtMax !== bCountAtMax) {
            return bCountAtMax - aCountAtMax;
          }
        }

        // Finally, sort by total rule count (descending)
        return b.matchingRules.length - a.matchingRules.length;
      });

      return {
        raidId: softresData.raidId,
        instance: softresData.instance,
        zone: zone ?? null,
        raidDate: softresData.raidDate,
        results,
      };
    }),
});
