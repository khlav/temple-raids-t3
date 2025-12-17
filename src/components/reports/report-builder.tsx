"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ReportParameterForm } from "~/components/reports/report-parameter-form";
import { ReportVisualization } from "~/components/reports/report-visualization";
import type { VisualizationType } from "~/lib/report-types";
import { Skeleton } from "~/components/ui/skeleton";

export function ReportBuilder() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [visualization, setVisualization] = useState<VisualizationType>("table");
  const [hasExecuted, setHasExecuted] = useState(false);

  // Fetch template list
  const { data: templates, isLoading: templatesLoading } = api.report.getTemplates.useQuery();

  // Fetch selected template details
  const { data: template } = api.report.getTemplateById.useQuery(
    { templateId: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  // Execute report query
  const {
    data: reportData,
    isLoading: reportLoading,
    refetch: executeReport,
  } = api.report.executeReport.useQuery(
    {
      templateId: selectedTemplateId!,
      parameters,
      visualization,
    },
    { enabled: false } // Only execute when explicitly called
  );

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setParameters({});
    setHasExecuted(false);
  };

  const handleParametersChange = (newParams: Record<string, unknown>) => {
    setParameters(newParams);
  };

  const handleExecute = async () => {
    await executeReport();
    setHasExecuted(true);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Template Selector - Left Sidebar */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
            <CardDescription>Select a report template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templatesLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : (
              templates?.map((t) => (
                <Button
                  key={t.id}
                  variant={selectedTemplateId === t.id ? "default" : "outline"}
                  className="h-auto w-full justify-start p-4 text-left"
                  onClick={() => handleTemplateSelect(t.id)}
                >
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Area - Parameters and Results */}
      <div className="lg:col-span-9">
        {!selectedTemplateId ? (
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">
                Select a report template to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Parameter Form */}
            {template && (
              <Card>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportParameterForm
                    template={template}
                    parameters={parameters}
                    onParametersChange={handleParametersChange}
                    onExecute={handleExecute}
                    isExecuting={reportLoading}
                  />
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {hasExecuted && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Results</CardTitle>
                      {reportData && (
                        <CardDescription>
                          {reportData.data.length} rows • Executed in{" "}
                          {reportData.executionTime}ms
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {template?.availableVisualizations.map((viz) => (
                        <Button
                          key={viz}
                          variant={visualization === viz ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVisualization(viz)}
                        >
                          {viz.charAt(0).toUpperCase() + viz.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : reportData ? (
                    <ReportVisualization
                      data={reportData.data}
                      template={template!}
                      visualization={visualization}
                      parameters={parameters}
                    />
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
