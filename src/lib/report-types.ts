/**
 * Type definitions for the Report Template Builder system
 */

export type VisualizationType = "table" | "bar" | "line";
export type ReportCategory = "raid" | "character" | "hybrid";
export type AggregateFunction = "count" | "countDistinct" | "sum" | "avg" | "min" | "max";
export type FilterOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "notIn" | "like" | "between";
export type JoinType = "leftJoin" | "innerJoin" | "rightJoin";
export type OrderDirection = "asc" | "desc";
export type ParameterType = "date" | "dateRange" | "multiSelect" | "select" | "enum" | "boolean" | "characterMultiSelect";

/**
 * Column configuration for SELECT clause
 */
export interface ColumnConfig {
  table: string;
  column: string;
  alias: string;
  aggregate?: AggregateFunction;
  label?: string;
  color?: string;
}

/**
 * Join configuration for JOIN clauses
 */
export interface JoinConfig {
  type: JoinType;
  table: string;
  alias?: string;
  on: {
    left: string;  // Format: "table.column"
    right: string; // Format: "table.column"
  };
}

/**
 * Filter configuration for WHERE clauses
 */
export interface FilterConfig {
  column: string; // Format: "table.column"
  operator: FilterOperator;
  parameterKey?: string; // Reference to parameter value (e.g., "dateRange.start")
  value?: unknown; // Static value if not using parameter
}

/**
 * Group By configuration
 */
export interface GroupByConfig {
  table: string;
  column: string;
}

/**
 * Order By configuration
 */
export interface OrderByConfig {
  column: string; // Just the alias or column name
  direction: OrderDirection;
}

/**
 * Parameter option for select/multiSelect types
 */
export interface ParameterOption {
  label: string;
  value: string | number;
}

/**
 * Parameter definition for user inputs
 */
export interface ParameterDefinition {
  key: string;
  label: string;
  type: ParameterType;
  required: boolean;
  defaultValue?: unknown;
  options?: ParameterOption[];
  min?: number; // For multi-select minimum selections
  helpText?: string;
}

/**
 * Complete report template configuration
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  startingEntity: string; // Table name to start FROM
  defaultVisualization: VisualizationType;
  availableVisualizations: VisualizationType[];

  // Query configuration
  columns: ColumnConfig[];
  joins: JoinConfig[];
  filters: FilterConfig[];
  groupBy?: GroupByConfig[];
  orderBy?: OrderByConfig[];

  // Parameter definitions for user customization
  parameters: ParameterDefinition[];

  // Metadata
  createdBy: string;
  version: number;
}

/**
 * Template metadata for listing (lightweight)
 */
export interface ReportTemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  defaultVisualization: VisualizationType;
}

/**
 * Report execution parameters
 */
export interface ReportExecutionParams {
  templateId: string;
  parameters: Record<string, unknown>;
  visualization: VisualizationType;
}

/**
 * Report execution result
 */
export interface ReportExecutionResult<T = unknown> {
  data: T[];
  template: ReportTemplate;
  parameters: Record<string, unknown>;
  executionTime?: number;
}

/**
 * Date range parameter value
 */
export interface DateRangeValue {
  start: string; // ISO date string
  end: string;   // ISO date string
}

/**
 * Character selection parameter value
 */
export interface CharacterSelection {
  characterId: number;
  name: string;
  class: string;
}
