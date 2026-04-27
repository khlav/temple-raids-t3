"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { ClassIcon } from "~/components/ui/class-icon";
import { AA_CLASS_COLORS } from "~/lib/aa-formatting";
import { AATemplateRenderer } from "./aa-template-renderer";
import type { RaidPlanCharacter, AASlotAssignment } from "./types";

export interface CharacterEncounterSummary {
  encounterId: string | "default";
  encounterName: string;
  slotNames: string[];
  /** extractCharacterLines(fullTemplate, slotNames).join('\n') */
  template: string;
  /** Assignments filtered to this encounter context */
  slotAssignments: AASlotAssignment[];
  /** planId when encounterId === "default"; encounter UUID otherwise */
  contextId: string;
}

interface CharacterSummaryPanelProps {
  viewAsCharacter: { name: string; class: string | null };
  encounterSummaries: CharacterEncounterSummary[];
  allCharacters: RaidPlanCharacter[];
  onEncounterClick: (encounterId: string) => void;
}

export function CharacterSummaryPanel({
  viewAsCharacter,
  encounterSummaries,
  allCharacters,
  onEncounterClick,
}: CharacterSummaryPanelProps) {
  const [showDetails, setShowDetails] = useState(true);

  const classColor = viewAsCharacter.class
    ? (AA_CLASS_COLORS[
        viewAsCharacter.class.toLowerCase().replace(/\s+/g, "")
      ] ?? undefined)
    : undefined;

  const MAX_SUMMARY = 3;
  const summaryEncounters = encounterSummaries.slice(0, MAX_SUMMARY);
  const remainingCount = Math.max(0, encounterSummaries.length - MAX_SUMMARY);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border bg-card">
      {/* Summary line */}
      <div className="flex items-start justify-between gap-3 p-3">
        {encounterSummaries.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No assignments found for{" "}
            <span className="font-semibold">{viewAsCharacter.name}</span> — show
            up, stay alive, and try not to stand in the bad. GLHF.
          </p>
        ) : (
          <p className="flex-1 text-sm leading-relaxed">
            {viewAsCharacter.class && (
              <ClassIcon
                characterClass={viewAsCharacter.class}
                px={16}
                className="mr-1 inline-block align-middle"
              />
            )}
            <span
              className="font-bold"
              style={classColor ? { color: classColor } : undefined}
            >
              {viewAsCharacter.name}
            </span>{" "}
            has assignments in{" "}
            {summaryEncounters.map((s, i) => (
              <span key={s.contextId}>
                <span className="font-semibold text-foreground">
                  {s.encounterName}
                </span>{" "}
                (
                {s.slotNames.map((name, j) => (
                  <span key={name}>
                    <span className="inline-block rounded border border-purple-500/25 bg-purple-500/10 px-1 text-xs font-medium text-purple-300">
                      {name}
                    </span>
                    {j < s.slotNames.length - 1 ? " " : ""}
                  </span>
                ))}
                ){i < summaryEncounters.length - 1 ? ", " : ""}
              </span>
            ))}
            {remainingCount > 0 &&
              `, and ${remainingCount} more encounter${remainingCount !== 1 ? "s" : ""}.`}
          </p>
        )}
        {encounterSummaries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-muted-foreground hover:text-foreground"
          >
            {showDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {showDetails ? "Hide details" : "Show details"}
          </button>
        )}
      </div>

      {/* Encounter grid */}
      {showDetails && encounterSummaries.length > 0 && (
        <div className="border-t border-border p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {encounterSummaries.map((summary) => (
              <button
                key={summary.contextId}
                type="button"
                onClick={() => onEncounterClick(summary.encounterId)}
                className="w-full cursor-pointer overflow-hidden rounded-md border border-border bg-muted/30 text-left transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                  <div className="h-3 w-0.5 shrink-0 rounded-full bg-purple-400" />
                  <span className="flex-1 truncate text-xs font-semibold text-foreground">
                    {summary.encounterName}
                  </span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                </div>
                <div className="p-2">
                  <AATemplateRenderer
                    template={summary.template}
                    encounterId={
                      summary.encounterId !== "default"
                        ? summary.contextId
                        : undefined
                    }
                    raidPlanId={
                      summary.encounterId === "default"
                        ? summary.contextId
                        : undefined
                    }
                    characters={allCharacters}
                    slotAssignments={summary.slotAssignments}
                    disabled
                    hideUnassigned
                    skipDndContext
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
