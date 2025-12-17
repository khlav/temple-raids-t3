/**
 * Report router for flexible reporting interface
 * Raid manager-only access
 */

import { z } from "zod";
import { createTRPCRouter, raidManagerProcedure } from "~/server/api/trpc";
import {
  getReportTemplateList,
  getReportTemplate,
} from "~/lib/report-templates";
import { buildAndExecuteQuery } from "~/server/api/helpers/query-builder";
import { convertToCSV, pivotData } from "~/lib/report-helpers";

export const report = createTRPCRouter({
  /**
   * Get list of available report templates (metadata only)
   */
  getTemplates: raidManagerProcedure.query(async () => {
    return getReportTemplateList();
  }),

  /**
   * Get full template configuration by ID
   */
  getTemplateById: raidManagerProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ input }) => {
      const template = getReportTemplate(input.templateId);
      if (!template) {
        throw new Error(`Template not found: ${input.templateId}`);
      }
      return template;
    }),

  /**
   * Execute a report with parameters
   */
  executeReport: raidManagerProcedure
    .input(
      z.object({
        templateId: z.string(),
        parameters: z.record(z.string(), z.unknown()),
        visualization: z.enum(["table", "bar", "line"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Get template
      const template = getReportTemplate(input.templateId);
      if (!template) {
        throw new Error(`Template not found: ${input.templateId}`);
      }

      // Execute query
      const data = await buildAndExecuteQuery(
        ctx.db,
        template,
        input.parameters,
      );

      // Apply pivot transformation if requested
      let transformedData = data;
      const pivotByWeek = input.parameters.pivotByWeek as boolean;
      const groupByWeek = input.parameters.groupByWeek as boolean;

      if (pivotByWeek && groupByWeek) {
        // Pivot by week: rows=characters, columns=weeks
        transformedData = pivotData(
          data as Array<Record<string, unknown>>,
          "name",
          "lockoutWeekStart",
          "raidsAttended",
        );
      }

      const executionTime = Date.now() - startTime;

      return {
        data: transformedData,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
        },
        parameters: input.parameters,
        executionTime,
      };
    }),

  /**
   * Export report as CSV
   */
  exportReport: raidManagerProcedure
    .input(
      z.object({
        templateId: z.string(),
        parameters: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get template
      const template = getReportTemplate(input.templateId);
      if (!template) {
        throw new Error(`Template not found: ${input.templateId}`);
      }

      // Execute query
      const data = await buildAndExecuteQuery(
        ctx.db,
        template,
        input.parameters,
      );

      // Apply pivot transformation if requested
      let transformedData = data;
      const pivotByWeek = input.parameters.pivotByWeek as boolean;
      const groupByWeek = input.parameters.groupByWeek as boolean;

      if (pivotByWeek && groupByWeek) {
        transformedData = pivotData(
          data as Array<Record<string, unknown>>,
          "name",
          "lockoutWeekStart",
          "raidsAttended",
        );
      }

      // Convert to CSV
      const csv = convertToCSV(
        transformedData as Array<Record<string, unknown>>,
      );

      return csv;
    }),

  /**
   * Get list of primary characters for character selection
   */
  getPrimaryCharacters: raidManagerProcedure.query(async ({ ctx }) => {
    const characters = await ctx.db.query.characters.findMany({
      where: (characters, { eq, and }) =>
        and(eq(characters.isPrimary, true), eq(characters.isIgnored, false)),
      columns: {
        characterId: true,
        name: true,
        class: true,
      },
      orderBy: (characters, { asc }) => [asc(characters.name)],
    });

    return characters;
  }),
});
