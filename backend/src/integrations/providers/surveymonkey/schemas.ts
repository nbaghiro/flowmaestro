import { z } from "zod";

/**
 * SurveyMonkey Zod Schemas for validation
 */

// Common schemas
export const SurveyIdSchema = z.string().min(1).describe("The unique identifier of the survey");

export const ResponseIdSchema = z.string().min(1).describe("The unique identifier of the response");

// Pagination schemas
export const PageSchema = z.number().int().min(1).optional().describe("Page number (1-indexed)");

export const PerPageSchema = z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of items per page (max 100)");

// Response status enum
export const ResponseStatusSchema = z
    .enum(["completed", "partial", "overquota", "disqualified"])
    .optional()
    .describe("Filter by response status");

// List surveys schema
export const ListSurveysSchema = z.object({
    page: PageSchema,
    perPage: PerPageSchema
});

export type ListSurveysParams = z.infer<typeof ListSurveysSchema>;

// Get survey schema
export const GetSurveySchema = z.object({
    surveyId: SurveyIdSchema.describe("The ID of the survey to retrieve")
});

export type GetSurveyParams = z.infer<typeof GetSurveySchema>;

// Get survey details schema
export const GetSurveyDetailsSchema = z.object({
    surveyId: SurveyIdSchema.describe("The ID of the survey to retrieve with full details")
});

export type GetSurveyDetailsParams = z.infer<typeof GetSurveyDetailsSchema>;

// List responses schema
export const ListResponsesSchema = z.object({
    surveyId: SurveyIdSchema.describe("The ID of the survey to get responses for"),
    page: PageSchema,
    perPage: PerPageSchema,
    startCreatedAt: z
        .string()
        .optional()
        .describe("Filter responses created on or after this date (ISO 8601 format)"),
    endCreatedAt: z
        .string()
        .optional()
        .describe("Filter responses created before this date (ISO 8601 format)"),
    status: ResponseStatusSchema
});

export type ListResponsesParams = z.infer<typeof ListResponsesSchema>;

// Get response details schema
export const GetResponseDetailsSchema = z.object({
    surveyId: SurveyIdSchema.describe("The ID of the survey"),
    responseId: ResponseIdSchema.describe("The ID of the response to retrieve")
});

export type GetResponseDetailsParams = z.infer<typeof GetResponseDetailsSchema>;

// List collectors schema
export const ListCollectorsSchema = z.object({
    surveyId: SurveyIdSchema.describe("The ID of the survey to get collectors for"),
    page: PageSchema,
    perPage: PerPageSchema
});

export type ListCollectorsParams = z.infer<typeof ListCollectorsSchema>;

// Response schemas for output validation
export const SurveyMonkeySurveySchema = z.object({
    id: z.string(),
    title: z.string(),
    nickname: z.string().optional(),
    href: z.string().optional(),
    language: z.string().optional(),
    question_count: z.number().optional(),
    page_count: z.number().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    response_count: z.number().optional(),
    folder_id: z.string().optional(),
    preview_url: z.string().optional(),
    collect_url: z.string().optional()
});

export const SurveyMonkeyResponseSchema = z.object({
    id: z.string(),
    survey_id: z.string().optional(),
    collector_id: z.string().optional(),
    total_time: z.number().optional(),
    response_status: z.enum(["completed", "partial", "overquota", "disqualified"]).optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

export const SurveyMonkeyCollectorSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(["open", "closed", "new"]).optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    response_count: z.number().optional(),
    url: z.string().optional()
});
