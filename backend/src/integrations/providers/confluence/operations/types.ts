import { z } from "zod";

/**
 * Confluence Cloud Integration - Zod Validation Schemas
 * All schemas for the 8 Confluence operations (REST API v2)
 */

// ============================================================================
// SPACE OPERATIONS
// ============================================================================

export const listSpacesInputSchema = z.object({
    limit: z.number().int().min(1).max(250).optional().describe("Maximum number of spaces"),
    cursor: z.string().optional().describe("Pagination cursor"),
    type: z.enum(["global", "personal"]).optional().describe("Space type filter")
});

export type ListSpacesInput = z.infer<typeof listSpacesInputSchema>;

export const getSpaceInputSchema = z.object({
    spaceId: z.string().describe("The ID of the space")
});

export type GetSpaceInput = z.infer<typeof getSpaceInputSchema>;

// ============================================================================
// PAGE OPERATIONS
// ============================================================================

export const listPagesInputSchema = z.object({
    spaceId: z.string().optional().describe("Filter by space ID"),
    limit: z.number().int().min(1).max(250).optional().describe("Maximum number of pages"),
    cursor: z.string().optional().describe("Pagination cursor"),
    status: z.enum(["current", "draft", "archived"]).optional().describe("Page status filter")
});

export type ListPagesInput = z.infer<typeof listPagesInputSchema>;

export const getPageInputSchema = z.object({
    pageId: z.string().describe("The ID of the page"),
    bodyFormat: z
        .enum(["storage", "atlas_doc_format", "view"])
        .optional()
        .describe("Format for the page body")
});

export type GetPageInput = z.infer<typeof getPageInputSchema>;

export const createPageInputSchema = z.object({
    spaceId: z.string().describe("The ID of the space to create the page in"),
    title: z.string().min(1).max(255).describe("Page title"),
    body: z.string().describe("Page body content in storage format"),
    parentId: z.string().optional().describe("Parent page ID for nesting"),
    status: z.enum(["current", "draft"]).optional().describe("Page status")
});

export type CreatePageInput = z.infer<typeof createPageInputSchema>;

export const updatePageInputSchema = z.object({
    pageId: z.string().describe("The ID of the page to update"),
    title: z.string().min(1).max(255).describe("Updated page title"),
    body: z.string().describe("Updated page body content in storage format"),
    version: z.number().int().describe("Current version number (for optimistic concurrency)"),
    status: z.enum(["current", "draft"]).optional().describe("Page status")
});

export type UpdatePageInput = z.infer<typeof updatePageInputSchema>;

export const getPageChildrenInputSchema = z.object({
    pageId: z.string().describe("The ID of the parent page"),
    limit: z.number().int().min(1).max(250).optional().describe("Maximum number of children"),
    cursor: z.string().optional().describe("Pagination cursor")
});

export type GetPageChildrenInput = z.infer<typeof getPageChildrenInputSchema>;

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export const searchContentInputSchema = z.object({
    query: z.string().min(1).describe("Search query (CQL syntax)"),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum number of results"),
    cursor: z.string().optional().describe("Pagination cursor")
});

export type SearchContentInput = z.infer<typeof searchContentInputSchema>;

// ============================================================================
// CONNECTION METADATA
// ============================================================================

export interface ConfluenceConnectionMetadata {
    cloudId: string;
    siteUrl: string;
    siteName: string;
    availableSites?: Array<{
        cloudId: string;
        url: string;
        name: string;
        scopes: string[];
    }>;
}
