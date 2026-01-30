"use client";

import { useState } from "react";
import { MRTEnrichInput } from "./mrt-enrich-input";
import { MRTEnrichResults } from "./mrt-enrich-results";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";

export function MRTEnrichContent() {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();

  const enrichMutation = api.character.enrichMRTComposition.useMutation({
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enrich MRT composition",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter an MRT string",
        variant: "destructive",
      });
      return;
    }

    enrichMutation.mutate(inputValue);
  };

  return (
    <div className="space-y-8">
      <MRTEnrichInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isLoading={enrichMutation.isPending}
      />

      {enrichMutation.data && (
        <MRTEnrichResults
          results={enrichMutation.data.results}
          enrichedString={enrichMutation.data.enriched}
        />
      )}
    </div>
  );
}
