import { z } from "zod";

// Workflow node schema
export const workflowNodeSchema = z.object({
    type: z.string(),
    name: z.string(),
    config: z.record(z.any()),
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    style: z.record(z.any()).optional(), // React Flow node styles (width, height, etc.)
    onError: z
        .object({
            strategy: z.enum(["continue", "fallback", "goto", "fail"]),
            fallbackValue: z.any().optional(),
            gotoNode: z.string().optional()
        })
        .optional()
});

// Workflow edge schema
export const workflowEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional()
});

// Workflow definition schema
export const workflowDefinitionSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    version: z.number().optional(),
    nodes: z.record(workflowNodeSchema),
    edges: z.array(workflowEdgeSchema),
    entryPoint: z.string(),
    settings: z
        .object({
            timeout: z.number().optional(),
            maxConcurrentNodes: z.number().optional(),
            enableCache: z.boolean().optional()
        })
        .optional()
});

// Create workflow request
export const createWorkflowSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    definition: workflowDefinitionSchema,
    aiGenerated: z.boolean().optional(),
    aiPrompt: z.string().max(2000).optional()
});

// Update workflow request
export const updateWorkflowSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    definition: workflowDefinitionSchema.optional(),
    aiGenerated: z.boolean().optional(),
    aiPrompt: z.string().max(2000).optional()
});

// Query parameters for listing workflows
export const listWorkflowsQuerySchema = z.object({
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(100))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional(),
    folderId: z.string().optional() // "null" for root level, UUID for specific folder, undefined for all
});

// URL parameters
export const workflowIdParamSchema = z.object({
    id: z.string().uuid()
});

// Generate workflow request (AI generation)
export const generateWorkflowSchema = z.object({
    prompt: z.string().min(10).max(2000),
    connectionId: z.string().uuid()
});

export type CreateWorkflowRequest = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowRequest = z.infer<typeof updateWorkflowSchema>;
export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
export type WorkflowIdParam = z.infer<typeof workflowIdParamSchema>;
export type GenerateWorkflowRequest = z.infer<typeof generateWorkflowSchema>;
