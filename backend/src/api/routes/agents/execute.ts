import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../temporal/client";
import { NotFoundError, BadRequestError } from "../../middleware";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";

const executeAgentParamsSchema = z.object({
    id: z.string().uuid()
});

const executeAgentSchema = z.object({
    message: z.string().min(1),
    thread_id: z.string().uuid().optional(), // Optional: use existing thread or create new one
    connection_id: z.string().uuid().optional(), // Optional: override agent's default connection
    model: z.string().optional() // Optional: override agent's default model
});

export async function executeAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;
    const { id: agentId } = executeAgentParamsSchema.parse(request.params);
    const { message, thread_id, connection_id, model } = executeAgentSchema.parse(request.body);

    const agentRepo = new AgentRepository();
    const executionRepo = new AgentExecutionRepository();
    const threadRepo = new ThreadRepository();

    // Check if agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    try {
        // Get or create thread
        let threadId: string;

        if (thread_id) {
            // Use existing thread - verify it exists and belongs to workspace
            const existingThread = await threadRepo.findByIdAndWorkspaceId(thread_id, workspaceId);
            if (!existingThread) {
                throw new NotFoundError("Thread not found");
            }
            // Verify thread belongs to same agent
            if (existingThread.agent_id !== agentId) {
                throw new BadRequestError("Thread belongs to a different agent");
            }
            threadId = thread_id;
        } else {
            // Create new thread - title will be null, frontend will format it with user's timezone
            const newThread = await threadRepo.create({
                user_id: userId,
                workspace_id: workspaceId,
                agent_id: agentId
                // title omitted - frontend will format using user's local timezone
            });
            threadId = newThread.id;
        }

        // Load existing messages from thread to preserve full thread history
        let threadMessages: ThreadMessage[] = [];
        if (thread_id) {
            // Get all previous messages in this thread to build full history
            const messages = await executionRepo.getMessagesByThread(threadId);
            threadMessages = messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                tool_calls: msg.tool_calls || undefined,
                tool_name: msg.tool_name || undefined,
                tool_call_id: msg.tool_call_id || undefined,
                timestamp: msg.created_at
            }));
        }

        // Create execution record linked to thread with full message history
        const execution = await executionRepo.create({
            agent_id: agentId,
            user_id: userId,
            thread_id: threadId,
            status: "running",
            thread_history: threadMessages,
            iterations: 0
        });

        // Start Temporal workflow
        const client = await getTemporalClient();
        await client.workflow.start("agentOrchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId: execution.id,
            args: [
                {
                    executionId: execution.id,
                    agentId,
                    userId,
                    threadId,
                    initialMessage: message,
                    workspaceId,
                    ...(connection_id && { connectionId: connection_id }),
                    ...(model && { model })
                }
            ]
        });

        reply.code(201).send({
            success: true,
            data: {
                executionId: execution.id,
                threadId,
                agentId,
                status: "running"
            }
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to start agent execution"
        );
    }
}
