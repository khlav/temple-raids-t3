"use client";

import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ClassIcon } from "~/components/ui/class-icon";
import { useCompareTray, type PinnedCharacter } from "./compare-tray-context";
import { WOW_CLASSES_SET } from "./constants";

const DEFAULT_ZONES = ["naxxramas", "aq40", "mc", "bwl"];

function getLockoutWeekStart(dateStr: string): string {
  const parts = dateStr.split("-");
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  const dayOfWeek = date.getUTCDay();
  const daysBack = (dayOfWeek + 5) % 7;
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date.toISOString().split("T")[0]!;
}

type WeekStatus = "attendee" | "bench" | "absent";

function buildWeekStatus(
  raids: Array<{ raidId: number; date: string }>,
  attendance: Array<{ raidId: number; primaryCharacterId: number; status: string | null }>,
  primaryCharacterId: number,
): { week: string; status: WeekStatus }[] {
  const raidWeekMap = new Map<number, string>();
  const weekSet = new Set<string>();
  for (const raid of raids) {
    const week = getLockoutWeekStart(String(raid.date));
    raidWeekMap.set(raid.raidId, week);
    weekSet.add(week);
  }

  const weekStatusMap = new Map<string, WeekStatus>();
  for (const week of weekSet) {
    weekStatusMap.set(week, "absent");
  }

  for (const entry of attendance) {
    if (entry.primaryCharacterId !== primaryCharacterId) continue;
    const week = raidWeekMap.get(entry.raidId);
    if (!week) continue;
    const current = weekStatusMap.get(week);
    const next: WeekStatus = entry.status === "attendee" ? "attendee" : "bench";
    if (current === "absent" || (current === "bench" && next === "attendee")) {
      weekStatusMap.set(week, next);
    }
  }

  return Array.from(weekStatusMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, status]) => ({ week, status }));
}

function AttendanceDot({ status }: { status: WeekStatus }) {
  const classes = {
    attendee: "bg-emerald-500",
    bench: "bg-amber-400",
    absent: "bg-muted-foreground/20",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${classes[status]}`} />;
}

function CharacterColumn({
  character,
  raids,
  attendance,
  onUnpin,
}: {
  character: PinnedCharacter;
  raids: Array<{ raidId: number; date: string }>;
  attendance: Array<{ raidId: number; primaryCharacterId: number; status: string | null }>;
  onUnpin: () => void;
}) {
  const weeks = buildWeekStatus(raids, attendance, character.primaryCharacterId);
  const attended = weeks.filter((w) => w.status === "attendee").length;
  const benched = weeks.filter((w) => w.status === "bench").length;
  const denominator = weeks.length;
  const pct = denominator > 0 ? Math.round(((attended + benched * 0.5) / denominator) * 100) : null;
  const isWowClass = !!character.characterClass && WOW_CLASSES_SET.has(character.characterClass);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-md border border-border/50 bg-muted/30 p-2">
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1">
          {isWowClass && character.characterClass && (
            <ClassIcon characterClass={character.characterClass} px={12} />
          )}
          <span className="truncate text-xs font-medium">{character.characterName}</span>
        </div>
        <button
          type="button"
          onClick={onUnpin}
          className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Remove ${character.characterName} from compare`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        {weeks.length > 0 ? (
          weeks.map(({ week, status }) => <AttendanceDot key={week} status={status} />)
        ) : (
          <span className="text-[10px] text-muted-foreground">No data</span>
        )}
        {pct !== null && <span className="ml-1 text-[10px] text-muted-foreground">{pct}%</span>}
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center rounded-md border border-dashed border-border/30 p-2">
      <span className="text-[10px] text-muted-foreground/40">Pin a character</span>
    </div>
  );
}

export function CompareTray() {
  const { pinnedCharacters, unpinCharacter } = useCompareTray();

  const primaryIds = pinnedCharacters.map((c) => c.primaryCharacterId);

  const { data, isLoading } = api.reports.getAttendanceReportData.useQuery(
    { primaryCharacterIds: primaryIds, zones: DEFAULT_ZONES },
    { enabled: pinnedCharacters.length > 0 },
  );

  if (pinnedCharacters.length === 0) return null;

  const raids = data?.raids ?? [];
  const attendance = data?.attendance ?? [];

  const reportUrl = `/reports/attendance?characters=${primaryIds.join(",")}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-xl items-center gap-2">
        <div className="flex flex-1 items-stretch gap-2">
          {pinnedCharacters.map((char) => (
            <CharacterColumn
              key={char.planCharacterId}
              character={char}
              raids={raids}
              attendance={attendance}
              onUnpin={() => unpinCharacter(char.planCharacterId)}
            />
          ))}
          {Array.from({ length: 4 - pinnedCharacters.length }).map((_, i) => (
            <EmptySlot key={i} />
          ))}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          {isLoading && <span className="text-[10px] text-muted-foreground">Loading…</span>}
          <Link
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            Full report
            <ExternalLink className="h-3 w-3" />
          </Link>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> attended
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> bench
          </div>
        </div>
      </div>
    </div>
  );
}
