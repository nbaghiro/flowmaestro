/**
 * Voice Agent Worker
 * Connects to LiveKit rooms and handles voice calls
 *
 * IMPORTANT: This is a TypeScript implementation of the LiveKit agent.
 * Some features require additional setup:
 *
 * 1. Audio Processing: Requires browser-like AudioContext in Node.js
 *    - Install: npm install node-web-audio-api
 *    - Or use: @discordjs/opus for audio encoding/decoding
 *
 * 2. LiveKit Client: May need server-side specific implementation
 *    - Consider using livekit-server-sdk instead of livekit-client
 *
 * 3. Media Streams: Node.js doesn't have native MediaStream
 *    - Use node-webrtc or similar for WebRTC in Node.js
 *
 * For production, you may want to:
 * - Use Python with livekit-agents (has more built-in features)
 * - Use a hybrid approach (TypeScript for logic, Python for media)
 * - Use dedicated audio processing libraries for Node.js
 */

import Redis from "ioredis";
import { Room, VideoPresets } from "livekit-client";
import { getVoiceCommandBus } from "../services/events/VoiceCommandBus";
import { VoiceAgent } from "./VoiceAgent";

interface WorkerConfig {
    livekitUrl: string;
    livekitApiKey: string;
    livekitApiSecret: string;
    redisUrl: string;
}

export class VoiceAgentWorker {
    private config: WorkerConfig;
    private redis: Redis;
    private activeAgents: Map<string, VoiceAgent> = new Map();

    constructor(config: WorkerConfig) {
        this.config = config;
        this.redis = new Redis(config.redisUrl);
    }

    /**
     * Start the worker
     */
    async start(): Promise<void> {
        console.log("=".repeat(60));
        console.log("🎙️  FlowMaestro Voice Agent Worker");
        console.log("=".repeat(60));
        console.log(`LiveKit URL: ${this.config.livekitUrl}`);
        console.log(`Redis URL: ${this.config.redisUrl}`);
        console.log("=".repeat(60));

        // Subscribe to room creation events
        await this.subscribeToRoomEvents();

        console.log("✅ Voice agent worker started");
        console.log("📞 Waiting for incoming calls...\n");
    }

    /**
     * Stop the worker
     */
    async stop(): Promise<void> {
        console.log("\n⏹️  Stopping voice agent worker...");

        // Stop all active agents
        for (const [roomName, agent] of this.activeAgents.entries()) {
            console.log(`Stopping agent for room: ${roomName}`);
            await agent.stop();
        }

        this.activeAgents.clear();

        await this.redis.quit();

        console.log("✅ Voice agent worker stopped");
    }

    /**
     * Subscribe to Redis events for new rooms
     */
    private async subscribeToRoomEvents(): Promise<void> {
        // Subscribe to LiveKit webhook events via Redis
        // The backend publishes these when a new call comes in

        await this.redis.subscribe("livekit:room:created");

        this.redis.on("message", async (channel, message) => {
            if (channel === "livekit:room:created") {
                try {
                    const event = JSON.parse(message);
                    await this.handleNewRoom(event);
                } catch (error) {
                    console.error("Error handling room event:", error);
                }
            }
        });

        console.log("📡 Subscribed to room creation events");
    }

    /**
     * Handle new LiveKit room
     */
    private async handleNewRoom(event: {
        roomName: string;
        callExecutionId: string;
    }): Promise<void> {
        const { roomName, callExecutionId } = event;

        console.log(`\n📞 New call in room: ${roomName}`);
        console.log(`   Call ID: ${callExecutionId}`);

        try {
            // Create room connection
            const room = await this.connectToRoom(roomName);

            // Create agent for this call
            const commandBus = getVoiceCommandBus();
            const agent = new VoiceAgent(room, callExecutionId, commandBus);

            // Start the agent
            await agent.start();

            // Track active agent
            this.activeAgents.set(roomName, agent);

            console.log(`✅ Agent started for room: ${roomName}\n`);

            // Handle agent cleanup when call ends
            room.on("disconnected", () => {
                this.activeAgents.delete(roomName);
                console.log(`🔌 Agent disconnected from room: ${roomName}`);
            });
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ Failed to handle room ${roomName}:`, errorMsg);
        }
    }

    /**
     * Connect to a LiveKit room
     */
    private async connectToRoom(roomName: string): Promise<Room> {
        // Generate access token for the agent
        const token = await this.generateAccessToken(roomName);

        // Create room
        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: VideoPresets.h720.resolution
            }
        });

        // Connect to room
        await room.connect(this.config.livekitUrl, token);

        console.log(`🔗 Connected to room: ${roomName}`);

        return room;
    }

    /**
     * Generate LiveKit access token
     */
    private async generateAccessToken(roomName: string): Promise<string> {
        // TODO: Implement proper JWT token generation
        // For now, this is a placeholder
        // You'd use livekit-server-sdk to generate tokens properly

        const livekitSdk = await import("livekit-server-sdk");
        const { AccessToken } = livekitSdk;

        const at = new AccessToken(this.config.livekitApiKey, this.config.livekitApiSecret, {
            identity: `agent-${Date.now()}`,
            ttl: "10m"
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true
        });

        return at.toJwt();
    }

    /**
     * Get worker statistics
     */
    getStats(): {
        activeAgents: number;
        rooms: string[];
    } {
        return {
            activeAgents: this.activeAgents.size,
            rooms: Array.from(this.activeAgents.keys())
        };
    }
}

// Main entry point
if (require.main === module) {
    const worker = new VoiceAgentWorker({
        livekitUrl: process.env.LIVEKIT_WS_URL || "ws://localhost:7880",
        livekitApiKey: process.env.LIVEKIT_API_KEY || "",
        livekitApiSecret: process.env.LIVEKIT_API_SECRET || "",
        redisUrl: process.env.REDIS_URL || "redis://localhost:6379"
    });

    // Start worker
    worker.start().catch((error) => {
        console.error("Failed to start worker:", error);
        process.exit(1);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
        console.log("\n📥 Received SIGINT signal");
        await worker.stop();
        process.exit(0);
    });

    process.on("SIGTERM", async () => {
        console.log("\n📥 Received SIGTERM signal");
        await worker.stop();
        process.exit(0);
    });

    // Log stats periodically
    setInterval(() => {
        const stats = worker.getStats();
        if (stats.activeAgents > 0) {
            console.log(`\n📊 Active agents: ${stats.activeAgents}`);
            console.log(`   Rooms: ${stats.rooms.join(", ")}`);
        }
    }, 30000); // Every 30 seconds
}
