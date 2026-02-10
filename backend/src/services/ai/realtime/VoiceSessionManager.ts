import { createServiceLogger } from "../../../core/logging";
import { VoiceSession } from "./VoiceSession";
import type { VoiceSessionContext } from "./types";
import type WebSocket from "ws";

const logger = createServiceLogger("VoiceSessionManager");

/**
 * Manages active voice sessions across the application
 */
export class VoiceSessionManager {
    private static instance: VoiceSessionManager;
    private sessions: Map<string, VoiceSession> = new Map();
    private sessionsBySocket: Map<WebSocket, string> = new Map();

    private constructor() {}

    static getInstance(): VoiceSessionManager {
        if (!VoiceSessionManager.instance) {
            VoiceSessionManager.instance = new VoiceSessionManager();
        }
        return VoiceSessionManager.instance;
    }

    /**
     * Create a new voice session for a WebSocket connection
     */
    async createSession(
        socket: WebSocket,
        context: Omit<VoiceSessionContext, "sessionId" | "state" | "createdAt">
    ): Promise<VoiceSession> {
        // Check if socket already has a session
        const existingSessionId = this.sessionsBySocket.get(socket);
        if (existingSessionId) {
            const existingSession = this.sessions.get(existingSessionId);
            if (existingSession) {
                logger.warn(
                    { existingSessionId },
                    "Socket already has an active session, closing it"
                );
                await this.closeSession(existingSessionId);
            }
        }

        // Create new session
        const session = new VoiceSession(socket, context);

        // Track session
        this.sessions.set(session.getSessionId(), session);
        this.sessionsBySocket.set(socket, session.getSessionId());

        // Initialize session (connects to Deepgram/ElevenLabs)
        await session.initialize();

        logger.info(
            {
                sessionId: session.getSessionId(),
                agentId: context.agentId,
                threadId: context.threadId,
                activeSessions: this.sessions.size
            },
            "Voice session created and initialized"
        );

        return session;
    }

    /**
     * Get a session by ID
     */
    getSession(sessionId: string): VoiceSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Get a session by socket
     */
    getSessionBySocket(socket: WebSocket): VoiceSession | undefined {
        const sessionId = this.sessionsBySocket.get(socket);
        if (!sessionId) return undefined;
        return this.sessions.get(sessionId);
    }

    /**
     * Close a session by ID
     */
    async closeSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            logger.warn({ sessionId }, "Session not found for closure");
            return;
        }

        await session.close();
        this.sessions.delete(sessionId);

        // Find and remove socket mapping
        for (const [socket, id] of this.sessionsBySocket.entries()) {
            if (id === sessionId) {
                this.sessionsBySocket.delete(socket);
                break;
            }
        }

        logger.info({ sessionId, activeSessions: this.sessions.size }, "Voice session closed");
    }

    /**
     * Close a session by socket
     */
    async closeSessionBySocket(socket: WebSocket): Promise<void> {
        const sessionId = this.sessionsBySocket.get(socket);
        if (sessionId) {
            await this.closeSession(sessionId);
        }
    }

    /**
     * Get count of active sessions
     */
    getActiveSessionCount(): number {
        return this.sessions.size;
    }

    /**
     * Get all active session IDs
     */
    getActiveSessionIds(): string[] {
        return Array.from(this.sessions.keys());
    }

    /**
     * Close all sessions (for graceful shutdown)
     */
    async closeAllSessions(): Promise<void> {
        logger.info({ count: this.sessions.size }, "Closing all voice sessions");

        const closePromises = Array.from(this.sessions.keys()).map((sessionId) =>
            this.closeSession(sessionId)
        );

        await Promise.all(closePromises);

        logger.info("All voice sessions closed");
    }
}

// Export singleton instance
export const voiceSessionManager = VoiceSessionManager.getInstance();
