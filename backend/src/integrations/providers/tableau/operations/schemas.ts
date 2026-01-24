import { z } from "zod";

/**
 * Tableau Shared Schemas
 */

// Site ID
export const TableauSiteIdSchema = z.string().describe("The unique identifier of the site");

// Workbook ID
export const TableauWorkbookIdSchema = z.string().describe("The unique identifier of the workbook");

// View ID
export const TableauViewIdSchema = z.string().describe("The unique identifier of the view");

// Data source ID
export const TableauDataSourceIdSchema = z
    .string()
    .describe("The unique identifier of the data source");

// Project ID
export const TableauProjectIdSchema = z.string().describe("The unique identifier of the project");

// Pagination parameters
export const TableauPageSizeSchema = z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Number of items to return per page");

export const TableauPageNumberSchema = z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number to return (1-indexed)");

// Filter expression
export const TableauFilterSchema = z
    .string()
    .optional()
    .describe("Filter expression (e.g., 'name:eq:MyWorkbook')");

// Image resolution
export const TableauResolutionSchema = z
    .enum(["high", "standard"])
    .default("standard")
    .describe("Image resolution for view export");

// Image dimensions
export const TableauWidthSchema = z
    .number()
    .int()
    .min(1)
    .max(4000)
    .optional()
    .describe("Width of the exported image in pixels");

export const TableauHeightSchema = z
    .number()
    .int()
    .min(1)
    .max(4000)
    .optional()
    .describe("Height of the exported image in pixels");

// Cache max age
export const TableauMaxAgeSchema = z
    .number()
    .int()
    .min(0)
    .max(240)
    .optional()
    .describe("Maximum cache age in minutes (0-240)");

// Download format
export const TableauDownloadFormatSchema = z
    .enum(["pdf", "pptx"])
    .default("pdf")
    .describe("Format for workbook download");

// PDF options
export const TableauPageTypeSchema = z
    .enum([
        "a3",
        "a4",
        "a5",
        "b5",
        "executive",
        "folio",
        "ledger",
        "legal",
        "letter",
        "note",
        "quarto",
        "tabloid",
        "unspecified"
    ])
    .default("letter")
    .describe("Page size for PDF export");

export const TableauOrientationSchema = z
    .enum(["portrait", "landscape"])
    .default("portrait")
    .describe("Page orientation for PDF export");
