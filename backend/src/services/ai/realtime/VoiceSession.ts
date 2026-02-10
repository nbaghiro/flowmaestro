import { nanoid } from "nanoid";
import type {
    VoiceSessionState,
    VoiceClientMessage,
    ThreadStreamingEvent
} from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { getTemporalClient } from "../../../temporal/client";
import { redisEventBus } from "../../events/RedisEventBus";
import { DeepgramStreamClient } from "./DeepgramStreamClient";
import { ElevenLabsStreamClient } from "./ElevenLabsStreamClient";
import { sendVoiceMessage } from "./types";
import type { VoiceSessionContext } from "./types";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";
import type WebSocket from "ws";

const logger = createServiceLogger("VoiceSession");

/**
 * VoiceSession orchestrates real-time voice conversation with an agent
 *
 * Flow:
 * 1. User speaks -> audio chunks sent to Deepgram STT
 * 2. Deepgram returns transcripts (interim and final)
 * 3. When user stops speaking (speechFinal), send message to agent
 * 4. Agent processes message via Temporal workflow
 * 5. Subscribe to Redis for streaming tokens from agent
 * 6. Stream tokens to ElevenLabs TTS
 * 7. Forward audio chunks to client for playback
 */
export class VoiceSession {
    private sessionId: string;
    private context: VoiceSessionContext;
    private clientSocket: WebSocket;
    private deepgram: DeepgramStreamClient | null = null;
    private elevenlabs: ElevenLabsStreamClient | null = null;
    private state: VoiceSessionState = "initializing";
    private transcriptBuffer = "";
    private isAgentSpeaking = false;
    private currentExecutionId: string | null = null;
    private eventHandler: ((event: ThreadStreamingEvent) => void) | null = null;

    constructor(
        clientSocket: WebSocket,
        context: Omit<VoiceSessionContext, "sessionId" | "state" | "createdAt">
    ) {
        this.sessionId = nanoid();
        this.clientSocket = clientSocket;
        this.context = {
            ...context,
            sessionId: this.sessionId,
            state: "initializing",
            createdAt: new Date()
        };

        logger.info(
            {
                sessionId: this.sessionId,
                agentId: context.agentId,
                threadId: context.threadId
            },
            "Voice session created"
        );
    }

    /**
     * Initialize the voice session
     * Connects to Deepgram and ElevenLabs WebSockets
     */
    async initialize(): Promise<void> {
        try {
            // Initialize Deepgram STT client
            this.deepgram = new DeepgramStreamClient();
            this.setupDeepgramHandlers();
            await this.deepgram.connect();

            // Load agent's voice config from metadata
            const agentRepo = new AgentRepository();
            const agent = await agentRepo.findByIdAndWorkspaceId(
                this.context.agentId,
                this.context.workspaceId
            );

            // Get voice config from agent metadata
            const agentVoiceConfig = agent?.metadata?.voice as
                | {
                      voiceId?: string;
                      model?: string;
                      stability?: number;
                      similarityBoost?: number;
                  }
                | undefined;

            // Build config object with only defined values (undefined would override defaults)
            const elevenLabsConfig: {
                voiceId?: string;
                modelId?: "eleven_turbo_v2_5" | "eleven_multilingual_v2" | "eleven_flash_v2_5";
                stability?: number;
                similarityBoost?: number;
            } = {};

            if (agentVoiceConfig?.voiceId) {
                elevenLabsConfig.voiceId = agentVoiceConfig.voiceId;
            }
            if (agentVoiceConfig?.model) {
                elevenLabsConfig.modelId = agentVoiceConfig.model as
                    | "eleven_turbo_v2_5"
                    | "eleven_multilingual_v2"
                    | "eleven_flash_v2_5";
            }
            if (agentVoiceConfig?.stability !== undefined) {
                elevenLabsConfig.stability = agentVoiceConfig.stability;
            }
            if (agentVoiceConfig?.similarityBoost !== undefined) {
                elevenLabsConfig.similarityBoost = agentVoiceConfig.similarityBoost;
            }

            // Initialize ElevenLabs TTS client with agent's voice config
            this.elevenlabs = new ElevenLabsStreamClient(elevenLabsConfig);
            this.setupElevenLabsHandlers();
            await this.elevenlabs.connect();

            // Subscribe to thread events for agent responses
            await this.subscribeToThreadEvents();

            this.setState("ready");
            sendVoiceMessage(this.clientSocket, { type: "session_ready" });

            logger.info({ sessionId: this.sessionId }, "Voice session initialized");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to initialize";
            logger.error(
                { err: error, sessionId: this.sessionId },
                "Voice session initialization failed"
            );
            this.setState("error");
            sendVoiceMessage(this.clientSocket, { type: "error", message: errorMessage });
            throw error;
        }
    }

    /**
     * Handle incoming message from client WebSocket
     */
    async handleClientMessage(message: VoiceClientMessage): Promise<void> {
        switch (message.type) {
            case "audio_chunk":
                this.handleAudioChunk(message.data);
                break;

            case "stop_recording":
                await this.handleStopRecording();
                break;

            case "interrupt":
                await this.handleInterrupt();
                break;

            case "end_session":
                await this.close();
                break;

            default:
                logger.warn(
                    { messageType: (message as { type: string }).type },
                    "Unknown message type"
                );
        }
    }

    /**
     * Handle audio chunk from client
     */
    private handleAudioChunk(base64Audio: string): void {
        if (this.state !== "ready" && this.state !== "listening") {
            return;
        }

        this.setState("listening");

        // Forward audio to Deepgram
        this.deepgram?.sendBase64Audio(base64Audio);
    }

    /**
     * Handle stop recording signal
     */
    private async handleStopRecording(): Promise<void> {
        logger.info(
            {
                sessionId: this.sessionId,
                transcriptBuffer: this.transcriptBuffer,
                hasContent: !!this.transcriptBuffer.trim()
            },
            "handleStopRecording called"
        );
        if (this.transcriptBuffer.trim()) {
            await this.sendMessageToAgent(this.transcriptBuffer.trim());
            this.transcriptBuffer = "";
        } else {
            logger.warn({ sessionId: this.sessionId }, "No transcript to send - buffer is empty");
        }
    }

    /**
     * Handle barge-in (user interrupts agent)
     */
    private async handleInterrupt(): Promise<void> {
        if (this.isAgentSpeaking) {
            logger.info({ sessionId: this.sessionId }, "User interrupted agent");

            // Stop ElevenLabs and reconnect for new context
            await this.elevenlabs?.interrupt();

            this.isAgentSpeaking = false;
            this.setState("ready");

            sendVoiceMessage(this.clientSocket, { type: "agent_done" });
        }
    }

    /**
     * Setup Deepgram event handlers
     */
    private setupDeepgramHandlers(): void {
        if (!this.deepgram) return;

        this.deepgram.setOnTranscript((text, isFinal, speechFinal) => {
            logger.debug(
                {
                    sessionId: this.sessionId,
                    text,
                    isFinal,
                    speechFinal,
                    currentBuffer: this.transcriptBuffer
                },
                "Deepgram transcript received"
            );

            // Send interim transcripts to client for display
            sendVoiceMessage(this.clientSocket, {
                type: "transcript",
                text,
                isFinal
            });

            if (isFinal) {
                // Accumulate final transcripts
                this.transcriptBuffer += text + " ";
                logger.debug(
                    { sessionId: this.sessionId, newBuffer: this.transcriptBuffer },
                    "Transcript buffer updated"
                );
            }

            if (speechFinal && this.transcriptBuffer.trim()) {
                // User finished speaking - send to agent
                const message = this.transcriptBuffer.trim();
                this.transcriptBuffer = "";
                logger.info(
                    { sessionId: this.sessionId, message },
                    "Speech final - sending to agent"
                );
                this.sendMessageToAgent(message);
            }
        });

        this.deepgram.setOnError((error) => {
            logger.error({ error, sessionId: this.sessionId }, "Deepgram error");
            sendVoiceMessage(this.clientSocket, { type: "error", message: error });
        });

        this.deepgram.setOnClose(() => {
            logger.info({ sessionId: this.sessionId }, "Deepgram connection closed");
        });
    }

    /**
     * Setup ElevenLabs event handlers
     */
    private setupElevenLabsHandlers(): void {
        if (!this.elevenlabs) return;

        this.elevenlabs.setOnAudioChunk((audioBase64) => {
            // Forward audio chunk to client
            sendVoiceMessage(this.clientSocket, {
                type: "audio_chunk",
                data: audioBase64
            });
        });

        this.elevenlabs.setOnComplete(() => {
            this.isAgentSpeaking = false;
            this.setState("ready");
            sendVoiceMessage(this.clientSocket, { type: "agent_done" });
        });

        this.elevenlabs.setOnError((error) => {
            logger.error({ error, sessionId: this.sessionId }, "ElevenLabs error");
            sendVoiceMessage(this.clientSocket, { type: "error", message: error });
        });

        this.elevenlabs.setOnClose(() => {
            logger.info({ sessionId: this.sessionId }, "ElevenLabs connection closed");
        });
    }

    /**
     * Subscribe to thread events for agent responses
     */
    private async subscribeToThreadEvents(): Promise<void> {
        this.eventHandler = (event: ThreadStreamingEvent) => {
            this.handleThreadEvent(event);
        };

        await redisEventBus.subscribeToThread(this.context.threadId, this.eventHandler);
    }

    /**
     * Handle events from agent execution
     */
    private handleThreadEvent(event: ThreadStreamingEvent): void {
        // Only handle events for current execution
        if (
            this.currentExecutionId &&
            "executionId" in event &&
            event.executionId !== this.currentExecutionId
        ) {
            return;
        }

        switch (event.type) {
            case "agent:thinking":
                sendVoiceMessage(this.clientSocket, { type: "agent_thinking" });
                break;

            case "agent:token":
                if ("token" in event) {
                    // Forward token to client for chat display
                    logger.debug(
                        { sessionId: this.sessionId, tokenLength: event.token.length },
                        "Forwarding agent token to client"
                    );
                    sendVoiceMessage(this.clientSocket, {
                        type: "agent_token",
                        token: event.token
                    });

                    // Stream token to ElevenLabs for TTS
                    if (this.elevenlabs) {
                        if (!this.isAgentSpeaking) {
                            this.isAgentSpeaking = true;
                            this.setState("speaking");
                            sendVoiceMessage(this.clientSocket, { type: "agent_speaking" });
                        }
                        this.elevenlabs.streamText(event.token);
                    }
                }
                break;

            case "agent:execution:completed":
                // Signal end of text to ElevenLabs
                this.elevenlabs?.endText();
                this.currentExecutionId = null;
                break;

            case "agent:execution:failed":
                if ("error" in event) {
                    sendVoiceMessage(this.clientSocket, {
                        type: "error",
                        message: event.error
                    });
                }
                this.isAgentSpeaking = false;
                this.currentExecutionId = null;
                this.setState("ready");
                break;
        }
    }

    /**
     * Send transcribed message to agent
     */
    private async sendMessageToAgent(message: string): Promise<void> {
        try {
            this.setState("processing");
            sendVoiceMessage(this.clientSocket, { type: "agent_thinking" });

            const agentRepo = new AgentRepository();
            const executionRepo = new AgentExecutionRepository();

            // Verify agent exists
            const agent = await agentRepo.findByIdAndWorkspaceId(
                this.context.agentId,
                this.context.workspaceId
            );
            if (!agent) {
                throw new Error("Agent not found");
            }

            // Load thread messages for context
            const messages = await executionRepo.getMessagesByThread(this.context.threadId);
            const threadMessages: ThreadMessage[] = messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                tool_calls: msg.tool_calls || undefined,
                tool_name: msg.tool_name || undefined,
                tool_call_id: msg.tool_call_id || undefined,
                timestamp: msg.created_at
            }));

            // Create execution record
            const execution = await executionRepo.create({
                agent_id: this.context.agentId,
                user_id: this.context.userId,
                thread_id: this.context.threadId,
                status: "running",
                thread_history: threadMessages,
                iterations: 0
            });

            this.currentExecutionId = execution.id;

            // Notify client that execution has started so it can show the user message
            // and subscribe to the streaming response
            logger.info(
                {
                    sessionId: this.sessionId,
                    executionId: execution.id,
                    threadId: this.context.threadId,
                    userMessage: message
                },
                "Sending execution_started to client"
            );
            sendVoiceMessage(this.clientSocket, {
                type: "execution_started",
                executionId: execution.id,
                threadId: this.context.threadId,
                userMessage: message
            });

            // Start Temporal workflow
            const client = await getTemporalClient();
            await client.workflow.start("agentOrchestratorWorkflow", {
                taskQueue: "flowmaestro-orchestrator",
                workflowId: execution.id,
                args: [
                    {
                        executionId: execution.id,
                        agentId: this.context.agentId,
                        userId: this.context.userId,
                        threadId: this.context.threadId,
                        initialMessage: message,
                        workspaceId: this.context.workspaceId
                    }
                ]
            });

            logger.info(
                {
                    sessionId: this.sessionId,
                    executionId: execution.id,
                    message
                },
                "Agent execution started from voice"
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to send message";
            logger.error(
                { err: error, sessionId: this.sessionId },
                "Failed to send message to agent"
            );
            sendVoiceMessage(this.clientSocket, { type: "error", message: errorMessage });
            this.setState("ready");
        }
    }

    /**
     * Update session state
     */
    private setState(newState: VoiceSessionState): void {
        this.state = newState;
        this.context.state = newState;
        logger.debug({ sessionId: this.sessionId, state: newState }, "State changed");
    }

    /**
     * Get session ID
     */
    getSessionId(): string {
        return this.sessionId;
    }

    /**
     * Get session state
     */
    getState(): VoiceSessionState {
        return this.state;
    }

    /**
     * Close the voice session
     */
    async close(): Promise<void> {
        logger.info({ sessionId: this.sessionId }, "Closing voice session");

        this.setState("closed");

        // Unsubscribe from thread events
        if (this.eventHandler) {
            await redisEventBus.unsubscribeFromThread(this.context.threadId, this.eventHandler);
        }

        // Close Deepgram connection
        await this.deepgram?.close();

        // Close ElevenLabs connection
        await this.elevenlabs?.close();

        logger.info({ sessionId: this.sessionId }, "Voice session closed");
    }
}
