"use client";

import type { ReportTemplate } from "~/lib/report-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Download } from "lucide-react";
import { api } from "~/trpc/react";
import { useState } from "react";

interface ReportTableProps {
  data: unknown[];
  template: ReportTemplate;
  parameters: Record<string, unknown>;
}

export function ReportTable({ data, template, parameters }: ReportTableProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exportMutation = api.report.exportReport.useMutation();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csv = await exportMutation.mutateAsync({
        templateId: template.id,
        parameters,
      });

      // Trigger download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!data || data.length === 0) {
    return <div className="text-muted-foreground">No data to display</div>;
  }

  // Get columns from first row
  const firstRow = data[0] as Record<string, unknown>;
  const columns = Object.keys(firstRow).filter(key => key !== "characterId");

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>
      <div className="max-h-[600px] overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold">
                  {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, " $1")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => {
              const rowData = row as Record<string, unknown>;
              return (
                <TableRow key={idx}>
                  {columns.map((col) => (
                    <TableCell key={col}>
                      {formatCellValue(rowData[col])}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        Showing {data.length} rows
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return value.toFixed(2);
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value);
}
