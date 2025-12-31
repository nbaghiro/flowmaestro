import { z } from "zod";

export const interfaceTargetTypeSchema = z.enum(["workflow", "agent"]);
export const interfaceCoverTypeSchema = z.enum(["image", "color", "stock"]);

const baseInterfaceCongifSchema = z
    .object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100),
        title: z.string().min(1).max(255),

        description: z.string().optional(),

        coverType: interfaceCoverTypeSchema.optional(),
        coverValue: z.string().optional(),

        targetType: interfaceTargetTypeSchema,
        workflowId: z.string().uuid().optional(),
        agentId: z.string().uuid().optional()
    })
    .superRefine((val, ctx) => {
        if (val.targetType === "workflow") {
            if (!val.workflowId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "workflowId is required when targetType is 'Workflow'",
                    path: ["workflow"]
                });
            }
            if (val.agentId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "agentId must be omitted when targerType is 'workflow'",
                    path: ["agentId"]
                });
            }
        }
        if (val.targetType === "agent") {
            if (!val.agentId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "agentId is required when targetType is 'agent'",
                    path: ["agentId"]
                });
            }
            if (val.workflowId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "workflowId must be omitted when targetType is 'agent'",
                    path: ["workflowId"]
                });
            }
        }
    });

export const createFormInterfaceSchema = baseInterfaceCongifSchema;
export type CreateFormInterfaceRequest = z.infer<typeof createFormInterfaceSchema>;

export const updateFormInterfaceSchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(100).optional(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),

        coverType: interfaceCoverTypeSchema.optional(),
        coverValue: z.string().optional(),
        iconUrl: z.string().url().optional(),

        inputPlaceholder: z.string().optional(),
        inputLabel: z.string().optional(),
        allowFileUpload: z.boolean().optional(),
        allowUrlInput: z.boolean().optional(),
        maxFiles: z.number().optional(),
        maxFileSizeMb: z.number().optional(),
        allowedFileTypes: z.array(z.string()).optional(),

        outputLabel: z.string().optional(),
        showCopyButton: z.boolean().optional(),
        showDownloadButton: z.boolean().optional(),
        allowOutputEdit: z.boolean().optional(),

        submitBottonText: z.string().optional(),
        submitLoadingText: z.string().optional(),

        // Allow changing target later, but enforce rule if they do
        targetType: interfaceTargetTypeSchema.optional(),
        worklowId: z.string().uuid().optional(),
        agentId: z.string().uuid().optional()
    })
    .superRefine((val, ctx) => {
        // Only validate target linkage if any of these are being changed in the payload
        const touchesTarget =
            val.targetType !== undefined ||
            val.worklowId !== undefined ||
            val.agentId !== undefined;

        if (!touchesTarget) return;

        const targetType = val.targetType;
        if (!targetType) return; // if they didn't send targetType, repo will keep current

        if (targetType === "workflow") {
            if (!val.worklowId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "workflowId is required when targetType is 'workflow'",
                    path: ["workflowId"]
                });
            }
            if (val.agentId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "agentId must be omitted when targerType is 'agent'",
                    path: ["agentId"]
                });
            }
        }
        if (targetType === "agent") {
            if (!val.agentId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "agentId is required when targetType is 'agent'",
                    path: ["agentId"]
                });
            }
            if (val.worklowId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "workflowId must be omitted when targetType is 'agent'",
                    path: ["workflowId"]
                });
            }
        }
    });

export type UpdateFormInterfaceRequest = z.infer<typeof updateFormInterfaceSchema>;
