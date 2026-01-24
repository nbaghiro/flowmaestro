import { z } from "zod";

/**
 * HelloSign common schemas for validation
 */

// Signature request ID
export const HelloSignRequestIdSchema = z
    .string()
    .min(1)
    .describe("The ID of the signature request");

// Template ID
export const HelloSignTemplateIdSchema = z
    .string()
    .min(1)
    .describe("The ID of the template to use");

// Signer schema
export const HelloSignSignerSchema = z.object({
    email_address: z.string().email().describe("Email address of the signer"),
    name: z.string().min(1).describe("Full name of the signer"),
    order: z.number().int().min(0).optional().describe("Signing order (0-indexed)"),
    pin: z.string().optional().describe("4-12 digit PIN for signer verification")
});

// CC recipient schema
export const HelloSignCCSchema = z.object({
    email_address: z.string().email().describe("Email address to CC"),
    role_name: z.string().optional().describe("Role name for template-based requests")
});

// File options
export const HelloSignFileSchema = z.object({
    file_url: z.string().url().optional().describe("URL of file to send for signing"),
    file_urls: z.array(z.string().url()).optional().describe("Array of file URLs")
});

// Pagination schema
export const HelloSignPaginationSchema = z.object({
    page: z.number().int().min(1).default(1).describe("Page number (starting at 1)"),
    page_size: z.number().int().min(1).max(100).default(20).describe("Number of results per page")
});

// Request status filter
export const HelloSignStatusFilterSchema = z
    .enum(["all", "awaiting_signature", "declined", "signed", "complete"])
    .optional()
    .describe("Filter by signature request status");

// Output variable for storing results
export const HelloSignOutputVariableSchema = z
    .string()
    .optional()
    .describe("Variable name to store the result");
