import { z } from "zod";

/**
 * Typeform Zod Schemas for validation
 */

// Common schemas
export const TypeformFormIdSchema = z
    .string()
    .min(1)
    .describe("The unique identifier of the Typeform");

export const TypeformWorkspaceIdSchema = z
    .string()
    .min(1)
    .describe("The unique identifier of the workspace");

// Pagination schemas
export const PageSchema = z.number().int().min(1).optional().describe("Page number (1-based)");

export const PageSizeSchema = z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("Number of items per page (max 200)");

// List forms schema
export const ListFormsSchema = z.object({
    page: PageSchema,
    pageSize: PageSizeSchema,
    search: z.string().optional().describe("Search query to filter forms by title"),
    workspaceId: TypeformWorkspaceIdSchema.optional().describe("Filter forms by workspace ID")
});

export type ListFormsParams = z.infer<typeof ListFormsSchema>;

// Get form schema
export const GetFormSchema = z.object({
    formId: TypeformFormIdSchema.describe("The ID of the form to retrieve")
});

export type GetFormParams = z.infer<typeof GetFormSchema>;

// List responses schema
export const ListResponsesSchema = z.object({
    formId: TypeformFormIdSchema.describe("The ID of the form to get responses for"),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of responses to return (max 1000)"),
    since: z
        .string()
        .optional()
        .describe("Retrieve responses submitted since this date/time (ISO 8601 format)"),
    until: z
        .string()
        .optional()
        .describe("Retrieve responses submitted until this date/time (ISO 8601 format)"),
    after: z
        .string()
        .optional()
        .describe("Retrieve responses after this token (for cursor-based pagination)"),
    before: z
        .string()
        .optional()
        .describe("Retrieve responses before this token (for cursor-based pagination)"),
    includedResponseIds: z
        .string()
        .optional()
        .describe("Comma-separated list of response IDs to include"),
    completed: z
        .boolean()
        .optional()
        .describe("Filter by completion status (true = completed only)"),
    sort: z
        .enum(["submitted_at,asc", "submitted_at,desc"])
        .optional()
        .describe("Sort order for responses"),
    query: z.string().optional().describe("Search query to filter responses by answer content"),
    fields: z.array(z.string()).optional().describe("List of field IDs to include in the response")
});

export type ListResponsesParams = z.infer<typeof ListResponsesSchema>;

// List workspaces schema
export const ListWorkspacesSchema = z.object({
    page: PageSchema,
    pageSize: PageSizeSchema,
    search: z.string().optional().describe("Search query to filter workspaces by name")
});

export type ListWorkspacesParams = z.infer<typeof ListWorkspacesSchema>;

// Response schemas for output validation
export const TypeformFormSchema = z.object({
    id: z.string(),
    title: z.string(),
    last_updated_at: z.string().optional(),
    created_at: z.string().optional(),
    workspace: z
        .object({
            href: z.string()
        })
        .optional(),
    theme: z
        .object({
            href: z.string()
        })
        .optional(),
    _links: z
        .object({
            display: z.string()
        })
        .optional()
});

export const TypeformFormsResponseSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(TypeformFormSchema)
});

export const TypeformAnswerSchema = z.object({
    field: z.object({
        id: z.string(),
        type: z.string(),
        ref: z.string().optional()
    }),
    type: z.string(),
    text: z.string().optional(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    number: z.number().optional(),
    boolean: z.boolean().optional(),
    date: z.string().optional(),
    url: z.string().optional(),
    file_url: z.string().optional(),
    choice: z
        .object({
            id: z.string().optional(),
            label: z.string().optional(),
            ref: z.string().optional()
        })
        .optional(),
    choices: z
        .object({
            ids: z.array(z.string()).optional(),
            labels: z.array(z.string()).optional(),
            refs: z.array(z.string()).optional()
        })
        .optional()
});

export const TypeformResponseSchema = z.object({
    landing_id: z.string(),
    token: z.string(),
    response_id: z.string().optional(),
    landed_at: z.string(),
    submitted_at: z.string().optional(),
    metadata: z
        .object({
            user_agent: z.string().optional(),
            platform: z.string().optional(),
            referer: z.string().optional(),
            network_id: z.string().optional(),
            browser: z.string().optional()
        })
        .optional(),
    hidden: z.record(z.string()).optional(),
    calculated: z
        .object({
            score: z.number().optional()
        })
        .optional(),
    answers: z.array(TypeformAnswerSchema).optional()
});

export const TypeformResponsesResponseSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(TypeformResponseSchema)
});

export const TypeformWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    default: z.boolean().optional(),
    shared: z.boolean().optional(),
    forms: z
        .object({
            count: z.number(),
            href: z.string()
        })
        .optional(),
    self: z
        .object({
            href: z.string()
        })
        .optional()
});

export const TypeformWorkspacesResponseSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(TypeformWorkspaceSchema)
});
