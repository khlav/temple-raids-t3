"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "~/lib/utils";

interface EncounterGroup {
  id: string;
  groupName: string;
  sortOrder: number;
}

interface EncounterItem {
  id: string;
  encounterName: string;
  sortOrder: number;
  groupId: string | null;
  useDefaultGroups?: boolean;
}

interface EncounterSidebarProps {
  encounterGroups: EncounterGroup[];
  encounters: EncounterItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  actions?: React.ReactNode;
  leftActions?: React.ReactNode;
}

export function EncounterSidebar({
  encounterGroups,
  encounters,
  activeTab,
  onTabChange,
  actions,
  leftActions,
}: EncounterSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(encounterGroups.map((g) => g.id)),
  );

  useEffect(() => {
    setExpandedGroups(new Set(encounterGroups.map((g) => g.id)));
  }, [encounterGroups]);

  const { sortedTreeItems, flatEncounterIds, activeLabelMap } = useMemo(() => {
    const groupBuckets = new Map<string, EncounterItem[]>(
      encounterGroups.map((g) => [g.id, []]),
    );
    const ungrouped: EncounterItem[] = [];

    for (const enc of encounters) {
      if (enc.groupId && groupBuckets.has(enc.groupId)) {
        groupBuckets.get(enc.groupId)!.push(enc);
      } else {
        ungrouped.push(enc);
      }
    }

    for (const children of groupBuckets.values()) {
      children.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    type TreeItem =
      | { type: "encounter"; sortOrder: number; enc: EncounterItem }
      | {
          type: "group";
          sortOrder: number;
          group: EncounterGroup;
          children: EncounterItem[];
        };

    const items: TreeItem[] = [
      ...ungrouped.map((enc) => ({
        type: "encounter" as const,
        sortOrder: enc.sortOrder,
        enc,
      })),
      ...encounterGroups.map((g) => ({
        type: "group" as const,
        sortOrder: g.sortOrder,
        group: g,
        children: groupBuckets.get(g.id) ?? [],
      })),
    ].sort((a, b) => a.sortOrder - b.sortOrder);

    const flatEncounterIds = [
      "default",
      ...items.flatMap((item) =>
        item.type === "group" ? item.children.map((c) => c.id) : [item.enc.id],
      ),
    ];

    // Label shown in the mobile select trigger — includes group context for grouped encounters
    const activeLabelMap = new Map<string, string>();
    activeLabelMap.set("default", "Default/Trash");
    for (const item of items) {
      if (item.type === "encounter") {
        activeLabelMap.set(item.enc.id, item.enc.encounterName);
      } else {
        for (const child of item.children) {
          activeLabelMap.set(
            child.id,
            `${item.group.groupName} · ${child.encounterName}`,
          );
        }
      }
    }

    return { sortedTreeItems: items, flatEncounterIds, activeLabelMap };
  }, [encounterGroups, encounters]);

  return (
    <>
      {/* Desktop sidebar tree (≥ lg) */}
      <div className="hidden lg:sticky lg:top-4 lg:flex lg:flex-col lg:gap-0.5 lg:self-start lg:rounded-lg lg:border lg:border-border/50 lg:bg-muted/30 lg:p-2">
        <div className="flex items-center pb-1.5">
          <p className="flex-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Encounters
          </p>
          {leftActions}
          {actions}
        </div>
        {/* Default/Trash — always first */}
        <button
          onClick={() => onTabChange("default")}
          className={cn(
            "w-full rounded-md px-2 py-1 text-left text-xs font-medium",
            activeTab === "default"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
          )}
        >
          Default/Trash
        </button>

        {/* Sorted tree */}
        {sortedTreeItems.map((item) =>
          item.type === "group" ? (
            <Collapsible
              key={item.group.id}
              open={expandedGroups.has(item.group.id)}
              onOpenChange={(open) =>
                setExpandedGroups((prev) => {
                  const next = new Set(prev);
                  open ? next.add(item.group.id) : next.delete(item.group.id);
                  return next;
                })
              }
            >
              <CollapsibleTrigger
                className={cn(
                  "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs font-medium hover:bg-accent/50",
                  item.children.some((c) => c.id === activeTab) &&
                    "bg-accent/40",
                )}
              >
                {item.group.groupName}
                {expandedGroups.has(item.group.id) ? (
                  <ChevronDown className="h-3 w-3 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-0.5 pl-3 pt-0.5">
                {item.children.map((enc) => (
                  <button
                    key={enc.id}
                    onClick={() => onTabChange(enc.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-left text-xs",
                      enc.useDefaultGroups && "italic text-muted-foreground",
                      enc.id === activeTab
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                  >
                    {enc.encounterName}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <button
              key={item.enc.id}
              onClick={() => onTabChange(item.enc.id)}
              className={cn(
                "w-full rounded-md px-2 py-1 text-left text-xs",
                item.enc.useDefaultGroups && "italic text-muted-foreground",
                item.enc.id === activeTab
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
            >
              {item.enc.encounterName}
            </button>
          ),
        )}
      </div>

      {/* Mobile nav (< lg) */}
      <div className="flex w-full items-center gap-2 rounded-xl bg-muted/40 p-1.5 ring-1 ring-border/50 lg:hidden">
        <span className="shrink-0 text-sm text-muted-foreground">
          Encounter:
        </span>

        {/* Select */}
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger className="flex-1">
            <span className="truncate text-sm">
              {activeLabelMap.get(activeTab) ?? activeTab}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default/Trash</SelectItem>
            {sortedTreeItems.map((item) =>
              item.type === "group" ? (
                <SelectGroup key={item.group.id}>
                  <SelectLabel>{item.group.groupName}</SelectLabel>
                  {item.children.map((enc) => (
                    <SelectItem key={enc.id} value={enc.id} className="pl-6">
                      {enc.encounterName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                <SelectItem key={item.enc.id} value={item.enc.id}>
                  {item.enc.encounterName}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {/* Prev button */}
        <button
          onClick={() => {
            const i = flatEncounterIds.indexOf(activeTab);
            if (i > 0) onTabChange(flatEncounterIds[i - 1]!);
          }}
          disabled={flatEncounterIds.indexOf(activeTab) <= 0}
          className="rounded p-1 hover:bg-accent/50 disabled:opacity-40"
          aria-label="Previous encounter"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Next button */}
        <button
          onClick={() => {
            const i = flatEncounterIds.indexOf(activeTab);
            if (i < flatEncounterIds.length - 1)
              onTabChange(flatEncounterIds[i + 1]!);
          }}
          disabled={
            flatEncounterIds.indexOf(activeTab) >= flatEncounterIds.length - 1
          }
          className="rounded p-1 hover:bg-accent/50 disabled:opacity-40"
          aria-label="Next encounter"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Actions (manage button) */}
        {actions}
      </div>
    </>
  );
}
