import Redis from "ioredis";
import { nanoid } from "nanoid";

/**
 * Voice Command Bus
 * Facilitates communication between Temporal activities and LiveKit voice agents via Redis pub/sub
 */

export interface VoiceCommand {
    type: "speak" | "listen" | "menu" | "hangup" | "transfer" | "dtmf_collect" | "record";
    requestId: string;
    callExecutionId: string;
    payload: Record<string, unknown>;
}

export interface VoiceCommandResponse {
    requestId: string;
    callExecutionId: string;
    success: boolean;
    result?: Record<string, unknown>;
    error?: string;
}

export interface VoiceEvent {
    type: string;
    callExecutionId: string;
    timestamp: number;
    data: Record<string, unknown>;
}

export class VoiceCommandBus {
    private publisher: Redis;
    private subscriber: Redis;
    private pendingRequests: Map<
        string,
        {
            resolve: (response: VoiceCommandResponse) => void;
            reject: (error: Error) => void;
            timeout: NodeJS.Timeout;
        }
    >;

    constructor() {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

        this.publisher = new Redis(redisUrl);
        this.subscriber = new Redis(redisUrl);
        this.pendingRequests = new Map();

        // Subscribe to response channel
        this.subscriber.subscribe("voice:responses");

        // Handle responses
        this.subscriber.on("message", (channel, message) => {
            if (channel === "voice:responses") {
                try {
                    const response: VoiceCommandResponse = JSON.parse(message);
                    this.handleResponse(response);
                } catch (error) {
                    console.error("[VoiceCommandBus] Failed to parse response:", error);
                }
            }
        });
    }

    /**
     * Send a command to the voice agent and wait for response
     */
    async sendCommand(
        callExecutionId: string,
        type: VoiceCommand["type"],
        payload: Record<string, unknown>,
        timeoutMs: number = 30000
    ): Promise<VoiceCommandResponse> {
        const requestId = nanoid();

        const command: VoiceCommand = {
            type,
            requestId,
            callExecutionId,
            payload
        };

        // Create promise that will be resolved when response arrives
        const promise = new Promise<VoiceCommandResponse>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Voice command timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeout
            });
        });

        // Publish command
        await this.publisher.publish(`voice:commands:${callExecutionId}`, JSON.stringify(command));

        console.log(`[VoiceCommandBus] Sent command: ${type} (${requestId})`);

        return promise;
    }

    /**
     * Handle response from agent
     */
    private handleResponse(response: VoiceCommandResponse): void {
        const pending = this.pendingRequests.get(response.requestId);

        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.requestId);

            if (response.success) {
                pending.resolve(response);
            } else {
                pending.reject(new Error(response.error || "Voice command failed"));
            }

            console.log(`[VoiceCommandBus] Received response: ${response.requestId}`);
        } else {
            console.warn(
                `[VoiceCommandBus] Received response for unknown request: ${response.requestId}`
            );
        }
    }

    /**
     * Publish an event (one-way, no response expected)
     */
    async publishEvent(event: VoiceEvent): Promise<void> {
        await this.publisher.publish(
            `voice:events:${event.callExecutionId}`,
            JSON.stringify(event)
        );
    }

    /**
     * Subscribe to events for a specific call
     */
    async subscribeToEvents(
        callExecutionId: string,
        handler: (event: VoiceEvent) => void
    ): Promise<void> {
        const channel = `voice:events:${callExecutionId}`;

        const eventSubscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
        await eventSubscriber.subscribe(channel);

        eventSubscriber.on("message", (ch, message) => {
            if (ch === channel) {
                try {
                    const event: VoiceEvent = JSON.parse(message);
                    handler(event);
                } catch (error) {
                    console.error("[VoiceCommandBus] Failed to parse event:", error);
                }
            }
        });
    }

    /**
     * Close all connections
     */
    async close(): Promise<void> {
        await this.publisher.quit();
        await this.subscriber.quit();
    }
}

// Singleton instance
let voiceCommandBusInstance: VoiceCommandBus | null = null;

export function getVoiceCommandBus(): VoiceCommandBus {
    if (!voiceCommandBusInstance) {
        voiceCommandBusInstance = new VoiceCommandBus();
    }
    return voiceCommandBusInstance;
}
