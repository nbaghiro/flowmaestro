import { z } from "zod";
import { TEMPLATE_CATEGORIES, TEMPLATE_STATUSES } from "../../storage/models/Template";

// Template categories enum
export const templateCategorySchema = z.enum(TEMPLATE_CATEGORIES);

// Template status enum
export const templateStatusSchema = z.enum(TEMPLATE_STATUSES);

// Template sort options
export const templateSortBySchema = z.enum(["default", "complexity", "popularity", "newest"]);

// Query parameters for listing templates
export const listTemplatesQuerySchema = z.object({
    category: templateCategorySchema.optional(),
    tags: z
        .string()
        .transform((val) => val.split(",").map((t) => t.trim()))
        .optional(),
    featured: z
        .string()
        .transform((val) => val === "true")
        .optional(),
    search: z.string().max(100).optional(),
    status: templateStatusSchema.optional(),
    sortBy: templateSortBySchema.optional(),
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(50))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional()
});

// URL parameters for template ID
export const templateIdParamSchema = z.object({
    id: z.string().uuid()
});

// Request body for copying a template
export const copyTemplateBodySchema = z.object({
    name: z.string().min(1).max(255).optional()
});

// Export types
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type TemplateIdParam = z.infer<typeof templateIdParamSchema>;
export type CopyTemplateBody = z.infer<typeof copyTemplateBodySchema>;
