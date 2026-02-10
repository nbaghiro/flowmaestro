import { z } from "zod";
import {
    AGENT_TEMPLATE_CATEGORIES,
    AGENT_TEMPLATE_STATUSES
} from "../../storage/models/AgentTemplate";

// Agent template categories enum
export const agentTemplateCategorySchema = z.enum(AGENT_TEMPLATE_CATEGORIES);

// Agent template status enum
export const agentTemplateStatusSchema = z.enum(AGENT_TEMPLATE_STATUSES);

// Query parameters for listing agent templates
export const listAgentTemplatesQuerySchema = z.object({
    category: agentTemplateCategorySchema.optional(),
    tags: z
        .string()
        .transform((val) => val.split(",").map((t) => t.trim()))
        .optional(),
    featured: z
        .string()
        .transform((val) => val === "true")
        .optional(),
    search: z.string().max(100).optional(),
    status: agentTemplateStatusSchema.optional(),
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(200))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional()
});

// URL parameters for agent template ID
export const agentTemplateIdParamSchema = z.object({
    id: z.string().uuid()
});

// Request body for copying an agent template
export const copyAgentTemplateBodySchema = z.object({
    name: z.string().min(1).max(255).optional()
});

// Export types
export type ListAgentTemplatesQuery = z.infer<typeof listAgentTemplatesQuerySchema>;
export type AgentTemplateIdParam = z.infer<typeof agentTemplateIdParamSchema>;
export type CopyAgentTemplateBody = z.infer<typeof copyAgentTemplateBodySchema>;
