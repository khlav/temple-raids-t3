"use client";

import { TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

interface EncounterTabItem {
  id: string;
  encounterName: string;
  useDefaultGroups?: boolean;
}

interface EncounterTabNavProps {
  encounters: EncounterTabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  /** Extra buttons (add, manage) rendered inline — horizontal on all sizes */
  actions?: React.ReactNode;
}

export function EncounterTabNav({
  encounters,
  activeTab,
  onTabChange,
  actions,
}: EncounterTabNavProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Mobile: styled dropdown */}
      <span className="shrink-0 text-sm font-medium text-muted-foreground md:hidden">
        Encounter:
      </span>
      <Select value={activeTab} onValueChange={onTabChange}>
        <SelectTrigger className="h-9 md:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default/Trash</SelectItem>
          {encounters.map((encounter) => (
            <SelectItem
              key={encounter.id}
              value={encounter.id}
              className={cn(
                encounter.useDefaultGroups ? "italic opacity-50" : "",
              )}
            >
              {encounter.encounterName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Desktop: tabs */}
      <TabsList className="hidden h-auto flex-wrap md:inline-flex">
        <TabsTrigger value="default">Default/Trash</TabsTrigger>
        {encounters.map((encounter) => (
          <TabsTrigger
            key={encounter.id}
            value={encounter.id}
            className={cn(
              encounter.useDefaultGroups ? "italic opacity-50" : "",
            )}
          >
            {encounter.encounterName}
          </TabsTrigger>
        ))}
      </TabsList>

      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
