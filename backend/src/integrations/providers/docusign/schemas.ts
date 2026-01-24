import { z } from "zod";

/**
 * DocuSign common schemas for validation
 */

// Envelope ID
export const DocuSignEnvelopeIdSchema = z.string().min(1).describe("The ID of the envelope");

// Template ID
export const DocuSignTemplateIdSchema = z.string().min(1).describe("The ID of the template to use");

// Recipient schema
export const DocuSignRecipientSchema = z.object({
    email: z.string().email().describe("Email address of the recipient"),
    name: z.string().min(1).describe("Full name of the recipient"),
    recipientId: z
        .string()
        .optional()
        .describe("Unique recipient ID (auto-generated if not provided)"),
    routingOrder: z.string().optional().describe("Order for signing (e.g., '1', '2')"),
    clientUserId: z.string().optional().describe("Client user ID for embedded signing")
});

// Signer schema (extends recipient)
export const DocuSignSignerSchema = DocuSignRecipientSchema.extend({
    tabs: z
        .object({
            signHereTabs: z
                .array(
                    z.object({
                        documentId: z.string().describe("Document ID"),
                        pageNumber: z.string().describe("Page number"),
                        xPosition: z.string().describe("X position"),
                        yPosition: z.string().describe("Y position")
                    })
                )
                .optional(),
            dateSignedTabs: z
                .array(
                    z.object({
                        documentId: z.string().describe("Document ID"),
                        pageNumber: z.string().describe("Page number"),
                        xPosition: z.string().describe("X position"),
                        yPosition: z.string().describe("Y position")
                    })
                )
                .optional()
        })
        .optional()
        .describe("Signature and form field tabs")
});

// CC recipient schema
export const DocuSignCCSchema = z.object({
    email: z.string().email().describe("Email address to CC"),
    name: z.string().min(1).describe("Name of the CC recipient"),
    recipientId: z.string().optional().describe("Unique recipient ID"),
    routingOrder: z.string().optional().describe("Routing order")
});

// Document schema
export const DocuSignDocumentSchema = z.object({
    documentId: z.string().describe("Unique document ID (e.g., '1', '2')"),
    name: z.string().describe("Document name"),
    fileExtension: z.string().optional().describe("File extension (e.g., 'pdf', 'docx')"),
    documentBase64: z.string().optional().describe("Base64-encoded document content"),
    remoteUrl: z.string().url().optional().describe("Remote URL to fetch document from")
});

// Pagination schema
export const DocuSignPaginationSchema = z.object({
    count: z.string().optional().describe("Number of results to return"),
    startPosition: z.string().optional().describe("Starting position for results")
});

// Envelope status filter
export const DocuSignStatusFilterSchema = z
    .enum(["created", "sent", "delivered", "signed", "completed", "declined", "voided", "deleted"])
    .optional()
    .describe("Filter by envelope status");

// Date filter schema
export const DocuSignDateFilterSchema = z.object({
    fromDate: z.string().optional().describe("Start date (ISO 8601 format)"),
    toDate: z.string().optional().describe("End date (ISO 8601 format)")
});
