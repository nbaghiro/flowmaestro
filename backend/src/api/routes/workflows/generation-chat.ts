/**
 * Generation Chat Route
 *
 * POST endpoint to initiate workflow generation chat with extended thinking support.
 */

import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GenerationChatMessage, WorkflowPlan } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { WorkflowGenerationChatService } from "../../../services/WorkflowGenerationChatService";
import { authMiddleware, validateRequest } from "../../middleware";
import { emitGenerationEvent } from "./generation-chat-stream";

const logger = createServiceLogger("GenerationChatRoute");

const generationChatService = new WorkflowGenerationChatService();

// ============================================================================
// SCHEMAS
// ============================================================================

const generationChatMessageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    thinking: z.string().optional(),
    thinkingExpanded: z.boolean().optional(),
    timestamp: z.string(),
    workflowPlan: z.unknown().optional()
});

const generationChatRequestSchema = z.object({
    message: z.string().min(1, "Message is required"),
    conversationHistory: z.array(generationChatMessageSchema).default([]),
    connectionId: z.string().uuid("Invalid connection ID"),
    model: z.string().min(1, "Model is required"),
    enableThinking: z.boolean().default(false),
    thinkingBudget: z.number().int().min(1024).max(32768).optional()
});

type GenerationChatRequest = z.infer<typeof generationChatRequestSchema>;

const createFromPlanRequestSchema = z.object({
    plan: z.object({
        name: z.string().min(1),
        description: z.string(),
        summary: z.string(),
        entryNodeId: z.string(),
        nodes: z.array(z.unknown()),
        edges: z.array(z.unknown()),
        nodeCountByCategory: z.record(z.number()).optional()
    }),
    folderId: z.string().uuid().optional()
});

type CreateFromPlanRequest = z.infer<typeof createFromPlanRequestSchema>;

// ============================================================================
// ROUTES
// ============================================================================

export async function generationChatRoute(fastify: FastifyInstance) {
    /**
     * POST /generation/chat
     * Initiate a workflow generation chat message
     */
    fastify.post(
        "/generation/chat",
        {
            preHandler: [authMiddleware, validateRequest(generationChatRequestSchema)]
        },
        async (request, reply) => {
            const body = request.body as GenerationChatRequest;

            try {
                logger.info(
                    {
                        userId: request.user!.id,
                        messageLength: body.message.length,
                        historyLength: body.conversationHistory.length,
                        enableThinking: body.enableThinking
                    },
                    "Received generation chat request"
                );

                // Generate execution ID
                const executionId = randomUUID();
                const messageId = randomUUID();

                // Return execution ID immediately
                reply.status(200).send({
                    success: true,
                    data: { executionId, messageId }
                });

                // Process chat in background with streaming callbacks
                let tokenCount = 0;
                let thinkingTokenCount = 0;
                let firstTokenTime: number | null = null;

                generationChatService
                    .processMessage(
                        body.message,
                        body.conversationHistory as GenerationChatMessage[],
                        body.connectionId,
                        body.model,
                        body.enableThinking,
                        body.thinkingBudget,
                        {
                            onThinkingStart: () => {
                                logger.info({ executionId }, "Thinking started");
                                emitGenerationEvent(executionId, "thinking_start", {});
                            },
                            onThinkingToken: (token: string) => {
                                thinkingTokenCount++;
                                emitGenerationEvent(executionId, "thinking_token", token);
                            },
                            onThinkingComplete: (content: string) => {
                                logger.info(
                                    { executionId, thinkingTokenCount },
                                    "Thinking completed"
                                );
                                emitGenerationEvent(executionId, "thinking_complete", content);
                            },
                            onToken: (token: string) => {
                                tokenCount++;
                                if (tokenCount === 1) {
                                    firstTokenTime = Date.now();
                                    logger.info({ executionId }, "First response token received");
                                }
                                emitGenerationEvent(executionId, "token", token);
                            },
                            onComplete: (response) => {
                                const duration = firstTokenTime ? Date.now() - firstTokenTime : 0;
                                logger.info(
                                    {
                                        executionId,
                                        tokenCount,
                                        thinkingTokenCount,
                                        durationMs: duration,
                                        hasPlan: !!response.workflowPlan
                                    },
                                    "Generation chat completed"
                                );

                                // Emit plan_detected if a plan was generated
                                if (response.workflowPlan) {
                                    emitGenerationEvent(
                                        executionId,
                                        "plan_detected",
                                        response.workflowPlan
                                    );
                                }

                                emitGenerationEvent(executionId, "complete", response);
                            },
                            onError: (error: Error) => {
                                emitGenerationEvent(executionId, "error", error.message);
                            }
                        }
                    )
                    .catch((error) => {
                        logger.error({ executionId, error }, "Background processing error");
                        const message =
                            error instanceof Error
                                ? error.message
                                : "Failed to process generation chat";
                        emitGenerationEvent(executionId, "error", message);
                    });
            } catch (error) {
                logger.error({ error }, "Error initiating generation chat");

                const message =
                    error instanceof Error ? error.message : "Failed to initiate generation chat";

                return reply.status(500).send({
                    success: false,
                    error: {
                        message,
                        code: "GENERATION_CHAT_INITIATION_FAILED"
                    }
                });
            }
        }
    );

    /**
     * POST /generation/create
     * Create a workflow from an approved plan
     */
    fastify.post(
        "/generation/create",
        {
            preHandler: [authMiddleware, validateRequest(createFromPlanRequestSchema)]
        },
        async (request, reply) => {
            const body = request.body as CreateFromPlanRequest;
            const userId = request.user!.id;

            try {
                logger.info(
                    {
                        userId,
                        planName: body.plan.name,
                        nodeCount: body.plan.nodes.length
                    },
                    "Creating workflow from plan"
                );

                const result = await generationChatService.createWorkflowFromPlan(
                    body.plan as WorkflowPlan,
                    userId,
                    body.folderId
                );

                return reply.status(201).send({
                    success: true,
                    data: result
                });
            } catch (error) {
                logger.error({ error }, "Error creating workflow from plan");

                const message =
                    error instanceof Error ? error.message : "Failed to create workflow from plan";

                return reply.status(500).send({
                    success: false,
                    error: {
                        message,
                        code: "WORKFLOW_CREATION_FAILED"
                    }
                });
            }
        }
    );
}
