/**
 * GitBook Page Operations
 *
 * Pages are the individual documents within a GitBook space.
 * They can be retrieved by ID or by their path.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GitBookClient } from "../client/GitBookClient";
import type { GitBookPage, GitBookRevision } from "../types";

// ============================================
// List Pages
// ============================================

export const listPagesSchema = z.object({
    spaceId: z.string().describe("The space ID to list pages from")
});

export type ListPagesParams = z.infer<typeof listPagesSchema>;

export const listPagesOperation: OperationDefinition = {
    id: "listPages",
    name: "List Pages",
    description: "List all pages in a GitBook space. Returns the full content structure/hierarchy.",
    category: "pages",
    inputSchema: listPagesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListPages(
    client: GitBookClient,
    params: ListPagesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listPages(params.spaceId)) as GitBookRevision;

        return {
            success: true,
            data: {
                pages: response.pages || [],
                files: response.files || []
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list pages";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}

// ============================================
// Get Page
// ============================================

export const getPageSchema = z
    .object({
        spaceId: z.string().describe("The space ID containing the page"),
        pageId: z
            .string()
            .optional()
            .describe("The unique ID of the page (use either pageId or pagePath)"),
        pagePath: z
            .string()
            .optional()
            .describe("The path to the page (use either pageId or pagePath)")
    })
    .refine((data) => data.pageId || data.pagePath, {
        message: "Either pageId or pagePath must be provided"
    });

export type GetPageParams = z.infer<typeof getPageSchema>;

export const getPageOperation: OperationDefinition = {
    id: "getPage",
    name: "Get Page",
    description:
        "Retrieve a page from a GitBook space by ID or path. Includes the full page content.",
    category: "pages",
    inputSchema: getPageSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPage(
    client: GitBookClient,
    params: GetPageParams
): Promise<OperationResult> {
    try {
        let page: GitBookPage;

        if (params.pageId) {
            page = (await client.getPageById(params.spaceId, params.pageId)) as GitBookPage;
        } else if (params.pagePath) {
            page = (await client.getPageByPath(params.spaceId, params.pagePath)) as GitBookPage;
        } else {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either pageId or pagePath must be provided",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: page
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get page";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
