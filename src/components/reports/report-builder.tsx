"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ReportParameterForm } from "~/components/reports/report-parameter-form";
import { ReportVisualization } from "~/components/reports/report-visualization";
import type { VisualizationType } from "~/lib/report-types";
import { Skeleton } from "~/components/ui/skeleton";
import { Link2, Check } from "lucide-react";
import { useToast } from "~/hooks/use-toast";

export function ReportBuilder() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [visualization, setVisualization] = useState<VisualizationType>("table");
  const [hasExecuted, setHasExecuted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  // Load report from URL parameters on mount
  useEffect(() => {
    const templateId = searchParams.get("template");
    const paramsEncoded = searchParams.get("params");
    const viz = searchParams.get("viz") as VisualizationType;

    if (templateId && paramsEncoded) {
      try {
        const decodedParams = JSON.parse(decodeURIComponent(paramsEncoded)) as Record<string, unknown>;
        setSelectedTemplateId(templateId);
        setParameters(decodedParams);
        setVisualization(viz ?? "table");
        setHasExecuted(true);
        // The query will auto-execute because parameters are set
      } catch (error) {
        console.error("Failed to parse URL parameters:", error);
      }
    }
  }, [searchParams]);

  // Auto-execute when loaded from URL
  useEffect(() => {
    if (hasExecuted && selectedTemplateId && Object.keys(parameters).length > 0) {
      void executeReport();
    }
  }, [hasExecuted, selectedTemplateId, parameters, executeReport]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setParameters({});
    setHasExecuted(false);
    // Clear URL parameters when selecting new template
    router.push(pathname);
  };

  const handleParametersChange = (newParams: Record<string, unknown>) => {
    setParameters(newParams);
  };

  const handleExecute = async () => {
    await executeReport();
    setHasExecuted(true);

    // Update URL with report parameters
    const params = new URLSearchParams();
    params.set("template", selectedTemplateId!);
    params.set("params", encodeURIComponent(JSON.stringify(parameters)));
    params.set("viz", visualization);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCopyLink = async () => {
    const params = new URLSearchParams();
    params.set("template", selectedTemplateId!);
    params.set("params", encodeURIComponent(JSON.stringify(parameters)));
    params.set("viz", visualization);

    const url = `${window.location.origin}${pathname}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({
        title: "Link copied!",
        description: "Report link has been copied to clipboard",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        disabled={!reportData}
                      >
                        {linkCopied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Link2 className="mr-2 h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </Button>
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
