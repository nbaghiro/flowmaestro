import { z } from "zod";

/**
 * Looker Shared Schemas
 */

// Dashboard ID (string in Looker API)
export const LookerDashboardIdSchema = z
    .string()
    .describe("The unique identifier of the dashboard");

// Look ID (numeric in Looker API)
export const LookerLookIdSchema = z.number().int().describe("The unique identifier of the Look");

// Query ID (numeric in Looker API)
export const LookerQueryIdSchema = z.number().int().describe("The unique identifier of the query");

// Folder ID
export const LookerFolderIdSchema = z.string().optional().describe("Filter by folder ID");

// Fields array for limiting returned data
export const LookerFieldsSchema = z
    .array(z.string())
    .optional()
    .describe("Specific fields to return (e.g., ['id', 'title', 'folder'])");

// Format for query results
export const LookerFormatSchema = z
    .enum(["json", "csv", "txt", "xlsx", "html", "md", "png", "jpg"])
    .default("json")
    .describe("Output format for query results");

// Limit for query results
export const LookerLimitSchema = z
    .number()
    .int()
    .min(-1)
    .max(5000)
    .default(500)
    .describe("Maximum number of rows to return (-1 for unlimited)");

// Model name for explores
export const LookerModelSchema = z.string().describe("The name of the LookML model");

// Explore name
export const LookerExploreSchema = z.string().describe("The name of the explore");

// Search term
export const LookerSearchTermSchema = z
    .string()
    .min(1)
    .describe("Search term to find dashboards and looks");

// Query filters
export const LookerFiltersSchema = z
    .record(z.string())
    .optional()
    .describe("Filter conditions as key-value pairs (e.g., {'dimension': 'value'})");

// Query sorts
export const LookerSortsSchema = z
    .array(z.string())
    .optional()
    .describe("Sort order for results (e.g., ['field_name desc', 'other_field asc'])");

// Query pivots
export const LookerPivotsSchema = z.array(z.string()).optional().describe("Fields to pivot on");

// Dynamic fields for query
export const LookerDynamicFieldsSchema = z
    .string()
    .optional()
    .describe("JSON string of dynamic field definitions (table calculations, custom dimensions)");
