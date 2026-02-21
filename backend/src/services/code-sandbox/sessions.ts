/**
 * Session Management
 *
 * TTL-based session store for persistent code execution containers.
 * Allows multi-call stateful execution (e.g., define variable in call 1, use in call 2).
 */

import { createServiceLogger } from "../../core/logging";
import { destroyContainer, isContainerRunning } from "./docker";
import type { SessionState, SupportedLanguage } from "./types";

const logger = createServiceLogger("CodeSessions");

// Session configuration
const SESSION_TTL_MS = parseInt(process.env.CODE_SESSION_TTL_MS || String(10 * 60 * 1000)); // 10 minutes default
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// In-memory session store
const sessions = new Map<string, SessionState>();

// Cleanup timer
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Create a new session
 */
export function createSession(
    sessionId: string,
    containerId: string,
    language: SupportedLanguage,
    userId: string
): SessionState {
    const now = new Date();

    const session: SessionState = {
        sessionId,
        containerId,
        language,
        userId,
        createdAt: now,
        lastActivityAt: now
    };

    sessions.set(sessionId, session);

    logger.info({ sessionId, containerId, language, userId }, "Session created");

    // Start cleanup timer if not running
    if (!cleanupTimer) {
        startCleanupTimer();
    }

    return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): SessionState | undefined {
    return sessions.get(sessionId);
}

/**
 * Update session last activity timestamp
 */
export function touchSession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }

    session.lastActivityAt = new Date();
    return true;
}

/**
 * Delete a session and cleanup its container
 */
export async function deleteSession(sessionId: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) {
        return;
    }

    // Remove from store first
    sessions.delete(sessionId);

    // Cleanup container
    try {
        await destroyContainer(session.containerId);
        logger.info({ sessionId, containerId: session.containerId }, "Session deleted");
    } catch (error) {
        logger.warn({ err: error, sessionId }, "Error cleaning up session container");
    }
}

/**
 * Get session for user
 * Validates that the session belongs to the user
 */
export function getSessionForUser(sessionId: string, userId: string): SessionState | undefined {
    const session = sessions.get(sessionId);
    if (!session) {
        return undefined;
    }

    if (session.userId !== userId) {
        logger.warn(
            { sessionId, requestedBy: userId, ownedBy: session.userId },
            "Session access denied"
        );
        return undefined;
    }

    return session;
}

/**
 * Check if a session's container is still running
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }

    const running = await isContainerRunning(session.containerId);
    if (!running) {
        // Container died, clean up session
        sessions.delete(sessionId);
        logger.info({ sessionId }, "Session cleaned up (container not running)");
        return false;
    }

    return true;
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: string): SessionState[] {
    const userSessions: SessionState[] = [];

    for (const session of sessions.values()) {
        if (session.userId === userId) {
            userSessions.push(session);
        }
    }

    return userSessions;
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
    totalSessions: number;
    sessionsByLanguage: Record<SupportedLanguage, number>;
    oldestSession?: Date;
} {
    const stats: {
        totalSessions: number;
        sessionsByLanguage: Record<SupportedLanguage, number>;
        oldestSession?: Date;
    } = {
        totalSessions: sessions.size,
        sessionsByLanguage: {
            python: 0,
            javascript: 0,
            shell: 0
        }
    };

    let oldest: Date | undefined;

    for (const session of sessions.values()) {
        stats.sessionsByLanguage[session.language]++;

        if (!oldest || session.createdAt < oldest) {
            oldest = session.createdAt;
        }
    }

    stats.oldestSession = oldest;

    return stats;
}

/**
 * Cleanup expired sessions
 */
async function cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    const expiredSessionIds: string[] = [];

    for (const [sessionId, session] of sessions) {
        const age = now - session.lastActivityAt.getTime();
        if (age > SESSION_TTL_MS) {
            expiredSessionIds.push(sessionId);
        }
    }

    if (expiredSessionIds.length === 0) {
        return 0;
    }

    logger.info({ count: expiredSessionIds.length }, "Cleaning up expired sessions");

    // Delete all expired sessions
    await Promise.all(expiredSessionIds.map((id) => deleteSession(id)));

    return expiredSessionIds.length;
}

/**
 * Start the cleanup timer
 */
function startCleanupTimer(): void {
    if (cleanupTimer) {
        return;
    }

    cleanupTimer = setInterval(async () => {
        try {
            const cleaned = await cleanupExpiredSessions();
            if (cleaned > 0) {
                logger.debug({ cleaned }, "Session cleanup completed");
            }

            // Stop timer if no sessions left
            if (sessions.size === 0 && cleanupTimer) {
                clearInterval(cleanupTimer);
                cleanupTimer = null;
            }
        } catch (error) {
            logger.error({ err: error }, "Session cleanup error");
        }
    }, CLEANUP_INTERVAL_MS);

    // Don't keep process alive just for cleanup
    cleanupTimer.unref();
}

/**
 * Stop the cleanup timer (for shutdown)
 */
export function stopCleanupTimer(): void {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

/**
 * Cleanup all sessions (for shutdown)
 */
export async function cleanupAllSessions(): Promise<void> {
    stopCleanupTimer();

    const sessionIds = Array.from(sessions.keys());
    if (sessionIds.length === 0) {
        return;
    }

    logger.info({ count: sessionIds.length }, "Cleaning up all sessions for shutdown");

    await Promise.all(sessionIds.map((id) => deleteSession(id)));
}
