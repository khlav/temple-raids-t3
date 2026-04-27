"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { ClassIcon } from "~/components/ui/class-icon";
import { AA_CLASS_COLORS } from "~/lib/aa-formatting";

export interface CharacterEncounterSummary {
  encounterId: string | "default";
  encounterName: string;
  slotNames: string[];
}

interface CharacterSummaryPanelProps {
  viewAsCharacter: { name: string; class: string | null };
  encounterSummaries: CharacterEncounterSummary[];
  onEncounterClick: (encounterId: string) => void;
}

export function CharacterSummaryPanel({
  viewAsCharacter,
  encounterSummaries,
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
      <div className="flex items-start justify-between gap-3 px-3 py-2">
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
              <span key={s.encounterId}>
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

      {/* Encounter list — two columns, no cards */}
      {showDetails && encounterSummaries.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <div className="columns-2 gap-x-6">
            {encounterSummaries.map((summary) => (
              <button
                key={summary.encounterId}
                type="button"
                onClick={() => onEncounterClick(summary.encounterId)}
                className="flex w-full break-inside-avoid items-center gap-2 py-0.5 text-left text-sm transition-opacity hover:opacity-70"
              >
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className="shrink-0 font-semibold text-foreground">
                  {summary.encounterName}
                </span>
                <div className="flex flex-wrap gap-1">
                  {summary.slotNames.map((name) => (
                    <span
                      key={name}
                      className="inline-block rounded border border-purple-500/25 bg-purple-500/10 px-1 text-xs font-medium text-purple-300"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
