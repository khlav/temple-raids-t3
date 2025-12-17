"use client";

import type { ReportTemplate, VisualizationType } from "~/lib/report-types";
import { ReportTable } from "~/components/reports/report-table";
import { ReportBarChart } from "~/components/reports/report-bar-chart";

interface ReportVisualizationProps {
  data: unknown[];
  template: ReportTemplate;
  visualization: VisualizationType;
  parameters: Record<string, unknown>;
}

export function ReportVisualization({
  data,
  template,
  visualization,
  parameters,
}: ReportVisualizationProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No data found for the selected parameters
      </div>
    );
  }

  switch (visualization) {
    case "table":
      return <ReportTable data={data} template={template} parameters={parameters} />;
    case "bar":
      return <ReportBarChart data={data} template={template} parameters={parameters} />;
    case "line":
      // Line charts can be added later
      return <div>Line charts coming soon...</div>;
    default:
      return <div>Unknown visualization type</div>;
  }
}
