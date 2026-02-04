import { z } from "zod";

/**
 * PandaDoc common schemas for validation
 */

// Document ID
export const PandaDocDocumentIdSchema = z
    .string()
    .min(1)
    .describe("The ID of the PandaDoc document");

// Template UUID
export const PandaDocTemplateUuidSchema = z
    .string()
    .min(1)
    .describe("The UUID of the PandaDoc template");

// Recipient schema
export const PandaDocRecipientSchema = z.object({
    email: z.string().email().describe("Email address of the recipient"),
    firstName: z.string().min(1).describe("First name of the recipient"),
    lastName: z.string().min(1).describe("Last name of the recipient"),
    role: z.string().optional().describe("Role name as defined in the template")
});

// Pagination schema
export const PandaDocPaginationSchema = z.object({
    count: z.number().min(1).max(100).optional().describe("Number of results per page (max 100)"),
    page: z.number().min(1).optional().describe("Page number (1-based)")
});
