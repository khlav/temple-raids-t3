"use client";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { EXAMPLE_MRT_STRING } from "~/lib/mrt-codec";

interface MRTEnrichInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function MRTEnrichInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: MRTEnrichInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleLoadExample = () => {
    onChange(EXAMPLE_MRT_STRING);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="mrt-input" className="text-sm font-medium">
          MRT Raid Composition String
        </label>
        <Textarea
          id="mrt-input"
          placeholder="Paste your MRT-encoded raid composition string here (e.g., MRTRGR1...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!value.trim() || isLoading}>
          {isLoading ? "Enriching..." : "Enrich"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadExample}
          disabled={isLoading}
        >
          Load Example
        </Button>
      </div>
    </form>
  );
}
