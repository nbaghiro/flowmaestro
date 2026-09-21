import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import {
    executionEventLog,
    TERMINAL_EVENT_TYPES,
    type ExecutionEvent
} from "../../../services/events/ExecutionEventLog";
import { createSSEHandler, sendTerminalEvent } from "../../../services/sse";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { NotFoundError } from "../../middleware";
import type { AgentExecutionModel } from "../../../storage/models/AgentExecution";

const logger = createServiceLogger("SSEStream");

/** How long one XREAD waits for new entries before the loop re-checks the execution. */
const READ_BLOCK_MS = 15000;

const streamParamsSchema = z.object({
    id: z.string().uuid(),
    executionId: z.string().uuid()
});

/**
 * Stream agent execution updates via Server-Sent Events.
 *
 * Events are relayed from the execution's Redis Stream (see ExecutionEventLog) rather
 * than from pub/sub, so a client that connects after the run started, or reconnects
 * after a dropped connection, gets everything it missed. Each SSE event carries the
 * stream id; the browser sends it back as Last-Event-ID on reconnect and the relay
 * resumes from there. Without one, a fresh connection starts at the current turn.
 */
export async function streamAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: agentId, executionId } = streamParamsSchema.parse(request.params);

    const executionRepo = new AgentExecutionRepository();

    // Verify execution exists and belongs to user
    const execution = await executionRepo.findById(executionId);
    if (!execution || execution.user_id !== userId || execution.agent_id !== agentId) {
        throw new NotFoundError("Execution not found");
    }

    // Create SSE handler with CORS headers
    // Use request origin directly - security is handled by JWT auth
    const origin = request.headers.origin || "*";

    const sse = createSSEHandler(request, reply, {
        keepAliveInterval: 15000,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers":
                "Authorization, X-Session-ID, X-Workspace-Id, Cache-Control, Last-Event-ID"
        }
    });

    const reader = executionEventLog.createReader();
    let closed = false;
    const cleanup = (): void => {
        closed = true;
        reader.close();
    };

    sse.onDisconnect(() => {
        logger.info({ executionId }, "Client disconnected");
        cleanup();
    });

    // Send initial connection event
    sse.sendEvent("connected", {
        executionId,
        status: execution.status
    });

    const replayFromRecord = async (record: AgentExecutionModel): Promise<void> => {
        if (record.status === "completed") {
            const finalMessage = await findFinalAssistantMessage(executionRepo, record);
            logger.info({ executionId }, "Replaying completed event from the execution record");
            sendTerminalEvent(
                sse,
                "completed",
                { finalMessage, iterations: record.iterations, executionId },
                cleanup
            );
        } else {
            logger.info(
                { executionId, status: record.status },
                "Replaying error event from the execution record"
            );
            sendTerminalEvent(
                sse,
                "error",
                { error: record.error || `Execution ${record.status}`, executionId },
                cleanup
            );
        }
    };

    // Where to start reading
    let cursor: string;
    const lastEventId = request.headers["last-event-id"];
    if (typeof lastEventId === "string" && lastEventId.length > 0) {
        cursor = lastEventId;
        logger.info({ executionId, lastEventId }, "Resuming stream from Last-Event-ID");
    } else {
        const resume = await executionEventLog.findResumePoint(executionId);
        if (resume.terminal) {
            sendTerminalEvent(
                sse,
                resume.terminal.type,
                resume.terminal.data,
                cleanup,
                resume.terminal.id
            );
            return;
        }
        if (!resume.exists && execution.status !== "running") {
            // Finished before the log existed, or the stream expired.
            await replayFromRecord(execution);
            return;
        }
        cursor = resume.after;
    }

    const follow = async (): Promise<void> => {
        while (!closed) {
            let events: ExecutionEvent[];
            try {
                events = await reader.read(executionId, cursor, READ_BLOCK_MS);
            } catch (error) {
                if (!closed) {
                    logger.error({ err: error, executionId }, "Failed to read execution events");
                    cleanup();
                    sse.close();
                }
                return;
            }
            if (closed) {
                return;
            }

            if (events.length === 0) {
                // Nothing within the block window. An execution that ended without a
                // terminal entry (older than the log, or an expired stream) is finished
                // from the record; otherwise keep waiting.
                const current = await executionRepo.findById(executionId);
                if (current && current.status !== "running") {
                    await replayFromRecord(current);
                    return;
                }
                continue;
            }

            for (const event of events) {
                cursor = event.id;
                if (TERMINAL_EVENT_TYPES.has(event.type)) {
                    sendTerminalEvent(sse, event.type, event.data, cleanup, event.id);
                    return;
                }
                sse.sendEvent(event.type, event.data, event.id);
            }
        }
    };

    follow().catch((error) => {
        logger.error({ err: error, executionId }, "Execution stream relay failed");
        cleanup();
        sse.close();
    });

    logger.info({ executionId }, "Stream handler initialized");
}

async function findFinalAssistantMessage(
    executionRepo: AgentExecutionRepository,
    execution: AgentExecutionModel
): Promise<string> {
    const fromHistory = [...execution.thread_history]
        .reverse()
        .find((message) => message.role === "assistant" && message.content);
    if (fromHistory) {
        return fromHistory.content;
    }

    const stored = await executionRepo.getMessages(execution.id);
    const fromStored = [...stored]
        .reverse()
        .find((message) => message.role === "assistant" && message.content);
    return fromStored?.content ?? "";
}
