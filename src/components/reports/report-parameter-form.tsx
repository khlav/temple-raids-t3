"use client";

import { useState, useEffect } from "react";
import type { ReportTemplate } from "~/lib/report-types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { X } from "lucide-react";

interface ReportParameterFormProps {
  template: ReportTemplate;
  parameters: Record<string, unknown>;
  onParametersChange: (parameters: Record<string, unknown>) => void;
  onExecute: () => void;
  isExecuting: boolean;
}

export function ReportParameterForm({
  template,
  parameters,
  onParametersChange,
  onExecute,
  isExecuting,
}: ReportParameterFormProps) {
  const [localParams, setLocalParams] = useState(parameters);

  // Fetch primary characters for character selection
  const { data: primaryCharacters } = api.report.getPrimaryCharacters.useQuery();

  useEffect(() => {
    setLocalParams(parameters);
  }, [parameters]);

  const updateParameter = (key: string, value: unknown) => {
    const newParams = { ...localParams, [key]: value };
    setLocalParams(newParams);
    onParametersChange(newParams);
  };

  const handleExecute = () => {
    onExecute();
  };

  return (
    <div className="space-y-4">
      {template.parameters.map((param) => (
        <div key={param.key} className="space-y-2">
          <Label>
            {param.label}
            {param.required && <span className="text-destructive"> *</span>}
          </Label>
          {param.helpText && (
            <p className="text-xs text-muted-foreground">{param.helpText}</p>
          )}

          {/* Date Range Input */}
          {param.type === "dateRange" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={(localParams[param.key] as { start: string })?.start ?? ""}
                  onChange={(e) =>
                    updateParameter(param.key, {
                      ...(localParams[param.key] as object),
                      start: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={(localParams[param.key] as { end: string })?.end ?? ""}
                  onChange={(e) =>
                    updateParameter(param.key, {
                      ...(localParams[param.key] as object),
                      end: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Enum Select */}
          {param.type === "enum" && param.options && (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={String(localParams[param.key] ?? param.defaultValue ?? "")}
              onChange={(e) => updateParameter(param.key, e.target.value)}
            >
              {param.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Multi-Select (simplified with checkboxes) */}
          {param.type === "multiSelect" && param.options && (
            <div className="space-y-2 rounded-md border p-3">
              {param.options.map((opt) => {
                const selected = (localParams[param.key] as unknown[] | undefined) ?? [];
                const isChecked = selected.includes(opt.value);

                return (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${param.key}-${opt.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const current = (localParams[param.key] as unknown[]) ?? [];
                        const updated = checked
                          ? [...current, opt.value]
                          : current.filter((v) => v !== opt.value);
                        updateParameter(param.key, updated);
                      }}
                    />
                    <Label
                      htmlFor={`${param.key}-${opt.value}`}
                      className="text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {/* Character Multi-Select */}
          {param.type === "characterMultiSelect" && (
            <div className="space-y-2">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value=""
                onChange={(e) => {
                  const characterId = Number(e.target.value);
                  const character = primaryCharacters?.find(
                    (c) => c.characterId === characterId
                  );
                  if (character) {
                    const current = (localParams[param.key] as number[]) ?? [];
                    if (!current.includes(characterId)) {
                      updateParameter(param.key, [...current, characterId]);
                    }
                  }
                }}
              >
                <option value="">Select a character...</option>
                {primaryCharacters?.map((char) => (
                  <option key={char.characterId} value={char.characterId}>
                    {char.name} ({char.class})
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {((localParams[param.key] as number[]) ?? []).map((charId) => {
                  const char = primaryCharacters?.find(
                    (c) => c.characterId === charId
                  );
                  return char ? (
                    <Badge key={charId} variant="secondary">
                      {char.name}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => {
                          const current = (localParams[param.key] as number[]) ?? [];
                          updateParameter(
                            param.key,
                            current.filter((id) => id !== charId)
                          );
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Boolean Checkbox */}
          {param.type === "boolean" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={param.key}
                checked={Boolean(localParams[param.key] ?? param.defaultValue)}
                onCheckedChange={(checked) => updateParameter(param.key, checked)}
              />
              <Label htmlFor={param.key} className="text-sm font-normal">
                Enable
              </Label>
            </div>
          )}
        </div>
      ))}

      <Button onClick={handleExecute} disabled={isExecuting} className="w-full">
        {isExecuting ? "Executing..." : "Run Report"}
      </Button>
    </div>
  );
}
