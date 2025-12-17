"use client";

import type { ReportTemplate } from "~/lib/report-types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ReportBarChartProps {
  data: unknown[];
  template: ReportTemplate;
  parameters: Record<string, unknown>;
}

export function ReportBarChart({
  data,
  template: _template,
  parameters: _parameters,
}: ReportBarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground">No data to display</div>;
  }

  // Transform data for Recharts
  const chartData = data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      name: String(r.name ?? r.zone ?? "Unknown"),
      value: Number(r.raidsAttended ?? r.weightedPoints ?? r.raidsInZone ?? 0),
    };
  });

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="hsl(var(--primary))" name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
