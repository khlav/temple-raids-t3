"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { cn } from "~/lib/utils";

interface EnrichmentResult {
  position: number;
  name: string;
  enrichedName: string;
  status: "already-complete" | "enriched" | "not-found";
  server: string | null;
}

interface MRTEnrichResultsProps {
  results: EnrichmentResult[];
  enrichedString: string;
}

const statusConfig = {
  "already-complete": {
    className: "text-muted-foreground",
  },
  enriched: {
    className: "text-green-600 dark:text-green-400 font-medium",
  },
  "not-found": {
    className: "text-yellow-600 dark:text-yellow-400",
    icon: AlertTriangle,
    tooltip: "Character not found in database. Server could not be added.",
  },
};

function PlayerSlot({ player }: { player: EnrichmentResult }) {
  const config = statusConfig[player.status];
  const Icon = "icon" in config ? config.icon : undefined;
  const tooltip = "tooltip" in config ? config.tooltip : undefined;

  const slotContent = (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <div className={cn("flex-1 truncate text-sm", config.className)}>
        {player.enrichedName || player.name}
      </div>
      {Icon && (
        <Icon className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
      )}
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{slotContent}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return slotContent;
}

export function MRTEnrichResults({
  results,
  enrichedString,
}: MRTEnrichResultsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enrichedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Organize players into 8 groups of 5
  const groups: EnrichmentResult[][] = Array.from({ length: 8 }, () => []);
  for (const result of results) {
    const groupIndex = Math.floor((result.position - 1) / 5);
    if (groupIndex >= 0 && groupIndex < 8) {
      groups[groupIndex]!.push(result);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Enriched Composition</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy MRT String
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {groups.map((groupPlayers, groupIndex) => (
          <Card key={groupIndex}>
            <CardHeader>
              <CardTitle className="text-sm">Group {groupIndex + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {groupPlayers.length > 0 ? (
                  groupPlayers.map((player) => (
                    <PlayerSlot key={player.position} player={player} />
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
