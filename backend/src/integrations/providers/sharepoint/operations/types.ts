import { z } from "zod";

/**
 * SharePoint Integration - Zod Validation Schemas
 * All schemas for the 8 SharePoint operations (Microsoft Graph API v1.0)
 */

// ============================================================================
// SITE OPERATIONS
// ============================================================================

export const listSitesInputSchema = z.object({
    query: z.string().optional().describe("Search query for sites (defaults to '*' to list all)"),
    top: z.number().int().min(1).max(500).optional().describe("Maximum number of sites to return")
});

export type ListSitesInput = z.infer<typeof listSitesInputSchema>;

export const getSiteInputSchema = z.object({
    siteId: z.string().describe("The ID of the SharePoint site")
});

export type GetSiteInput = z.infer<typeof getSiteInputSchema>;

// ============================================================================
// LIST OPERATIONS
// ============================================================================

export const listListsInputSchema = z.object({
    siteId: z.string().describe("The ID of the SharePoint site"),
    top: z.number().int().min(1).max(500).optional().describe("Maximum number of lists to return")
});

export type ListListsInput = z.infer<typeof listListsInputSchema>;

export const getListInputSchema = z.object({
    siteId: z.string().describe("The ID of the SharePoint site"),
    listId: z.string().describe("The ID of the list")
});

export type GetListInput = z.infer<typeof getListInputSchema>;

// ============================================================================
// ITEM OPERATIONS
// ============================================================================

export const listItemsInputSchema = z.object({
    siteId: z.string().describe("The ID of the SharePoint site"),
    listId: z.string().describe("The ID of the list"),
    top: z.number().int().min(1).max(500).optional().describe("Maximum number of items to return"),
    filter: z.string().optional().describe("OData filter expression")
});

export type ListItemsInput = z.infer<typeof listItemsInputSchema>;

export const createItemInputSchema = z.object({
    siteId: z.string().describe("The ID of the SharePoint site"),
    listId: z.string().describe("The ID of the list"),
    fields: z.record(z.unknown()).describe("Field values for the new list item")
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export const listDriveItemsInputSchema = z.object({
    siteId: z.string().describe("The ID of the SharePoint site"),
    folderId: z.string().optional().describe("Folder ID to list contents (defaults to root)"),
    top: z.number().int().min(1).max(500).optional().describe("Maximum number of items to return")
});

export type ListDriveItemsInput = z.infer<typeof listDriveItemsInputSchema>;

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export const searchContentInputSchema = z.object({
    query: z.string().min(1).describe("Search query string"),
    top: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of results to return"),
    entityTypes: z
        .array(z.string())
        .optional()
        .describe("Entity types to search (e.g., 'site', 'list', 'listItem', 'driveItem')")
});

export type SearchContentInput = z.infer<typeof searchContentInputSchema>;
