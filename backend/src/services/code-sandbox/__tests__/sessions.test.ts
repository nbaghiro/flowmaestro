/**
 * Session Management Unit Tests
 *
 * Tests for TTL-based session store for persistent code execution containers.
 */

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn(() => mockLogger)
}));

// Mock docker functions
const mockDestroyContainer = jest.fn();
const mockIsContainerRunning = jest.fn();

jest.mock("../docker", () => ({
    destroyContainer: mockDestroyContainer,
    isContainerRunning: mockIsContainerRunning
}));

import {
    createSession,
    getSession,
    touchSession,
    deleteSession,
    getSessionForUser,
    isSessionActive,
    getUserSessions,
    getSessionStats,
    stopCleanupTimer,
    cleanupAllSessions
} from "../sessions";

describe("Session Management", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear all sessions between tests by cleaning up
        stopCleanupTimer();
    });

    afterEach(async () => {
        // Clean up sessions after each test
        await cleanupAllSessions();
    });

    describe("createSession", () => {
        it("should create a new session", () => {
            const session = createSession("session-1", "container-abc", "python", "user-1");

            expect(session.sessionId).toBe("session-1");
            expect(session.containerId).toBe("container-abc");
            expect(session.language).toBe("python");
            expect(session.userId).toBe("user-1");
            expect(session.createdAt).toBeInstanceOf(Date);
            expect(session.lastActivityAt).toBeInstanceOf(Date);
        });

        it("should log session creation", () => {
            createSession("session-2", "container-xyz", "javascript", "user-2");

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: "session-2",
                    containerId: "container-xyz",
                    language: "javascript",
                    userId: "user-2"
                }),
                "Session created"
            );
        });

        it("should store session for retrieval", () => {
            createSession("session-3", "container-123", "shell", "user-3");

            const retrieved = getSession("session-3");
            expect(retrieved).toBeDefined();
            expect(retrieved?.sessionId).toBe("session-3");
        });
    });

    describe("getSession", () => {
        it("should return session if it exists", () => {
            createSession("session-get-1", "container-1", "python", "user-1");

            const session = getSession("session-get-1");

            expect(session).toBeDefined();
            expect(session?.sessionId).toBe("session-get-1");
        });

        it("should return undefined for non-existent session", () => {
            const session = getSession("non-existent-session");

            expect(session).toBeUndefined();
        });
    });

    describe("touchSession", () => {
        it("should update last activity timestamp", async () => {
            createSession("session-touch-1", "container-1", "python", "user-1");
            const originalSession = getSession("session-touch-1");
            const originalTime = originalSession?.lastActivityAt.getTime();

            // Wait a bit to ensure time difference
            await new Promise((resolve) => setTimeout(resolve, 10));

            const result = touchSession("session-touch-1");

            expect(result).toBe(true);
            const updatedSession = getSession("session-touch-1");
            expect(updatedSession?.lastActivityAt.getTime()).toBeGreaterThan(originalTime!);
        });

        it("should return false for non-existent session", () => {
            const result = touchSession("non-existent-session");

            expect(result).toBe(false);
        });
    });

    describe("deleteSession", () => {
        it("should delete session and destroy container", async () => {
            createSession("session-delete-1", "container-del-1", "python", "user-1");
            mockDestroyContainer.mockResolvedValue(undefined);

            await deleteSession("session-delete-1");

            expect(getSession("session-delete-1")).toBeUndefined();
            expect(mockDestroyContainer).toHaveBeenCalledWith("container-del-1");
        });

        it("should handle container cleanup errors gracefully", async () => {
            createSession("session-delete-2", "container-del-2", "python", "user-1");
            mockDestroyContainer.mockRejectedValue(new Error("Container not found"));

            // Should not throw
            await deleteSession("session-delete-2");

            expect(getSession("session-delete-2")).toBeUndefined();
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it("should do nothing for non-existent session", async () => {
            await deleteSession("non-existent-session");

            expect(mockDestroyContainer).not.toHaveBeenCalled();
        });
    });

    describe("getSessionForUser", () => {
        it("should return session if user owns it", () => {
            createSession("session-user-1", "container-1", "python", "user-owner");

            const session = getSessionForUser("session-user-1", "user-owner");

            expect(session).toBeDefined();
            expect(session?.sessionId).toBe("session-user-1");
        });

        it("should return undefined if user does not own session", () => {
            createSession("session-user-2", "container-2", "python", "user-owner");

            const session = getSessionForUser("session-user-2", "user-other");

            expect(session).toBeUndefined();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: "session-user-2",
                    requestedBy: "user-other",
                    ownedBy: "user-owner"
                }),
                "Session access denied"
            );
        });

        it("should return undefined for non-existent session", () => {
            const session = getSessionForUser("non-existent", "user-1");

            expect(session).toBeUndefined();
        });
    });

    describe("isSessionActive", () => {
        it("should return true if container is running", async () => {
            createSession("session-active-1", "container-running", "python", "user-1");
            mockIsContainerRunning.mockResolvedValue(true);

            const isActive = await isSessionActive("session-active-1");

            expect(isActive).toBe(true);
            expect(mockIsContainerRunning).toHaveBeenCalledWith("container-running");
        });

        it("should return false and cleanup if container is not running", async () => {
            createSession("session-active-2", "container-stopped", "python", "user-1");
            mockIsContainerRunning.mockResolvedValue(false);

            const isActive = await isSessionActive("session-active-2");

            expect(isActive).toBe(false);
            expect(getSession("session-active-2")).toBeUndefined();
        });

        it("should return false for non-existent session", async () => {
            const isActive = await isSessionActive("non-existent");

            expect(isActive).toBe(false);
            expect(mockIsContainerRunning).not.toHaveBeenCalled();
        });
    });

    describe("getUserSessions", () => {
        it("should return all sessions for a user", () => {
            createSession("session-user-a-1", "container-1", "python", "user-a");
            createSession("session-user-a-2", "container-2", "javascript", "user-a");
            createSession("session-user-b-1", "container-3", "shell", "user-b");

            const userASessions = getUserSessions("user-a");

            expect(userASessions).toHaveLength(2);
            expect(userASessions.map((s) => s.sessionId)).toContain("session-user-a-1");
            expect(userASessions.map((s) => s.sessionId)).toContain("session-user-a-2");
        });

        it("should return empty array if user has no sessions", () => {
            createSession("session-other", "container-1", "python", "other-user");

            const sessions = getUserSessions("user-no-sessions");

            expect(sessions).toHaveLength(0);
        });
    });

    describe("getSessionStats", () => {
        it("should return accurate statistics", () => {
            createSession("session-stats-1", "container-1", "python", "user-1");
            createSession("session-stats-2", "container-2", "python", "user-2");
            createSession("session-stats-3", "container-3", "javascript", "user-1");
            createSession("session-stats-4", "container-4", "shell", "user-3");

            const stats = getSessionStats();

            expect(stats.totalSessions).toBe(4);
            expect(stats.sessionsByLanguage.python).toBe(2);
            expect(stats.sessionsByLanguage.javascript).toBe(1);
            expect(stats.sessionsByLanguage.shell).toBe(1);
            expect(stats.oldestSession).toBeInstanceOf(Date);
        });

        it("should handle empty session store", async () => {
            await cleanupAllSessions();

            const stats = getSessionStats();

            expect(stats.totalSessions).toBe(0);
            expect(stats.sessionsByLanguage.python).toBe(0);
            expect(stats.sessionsByLanguage.javascript).toBe(0);
            expect(stats.sessionsByLanguage.shell).toBe(0);
            expect(stats.oldestSession).toBeUndefined();
        });
    });

    describe("cleanupAllSessions", () => {
        it("should delete all sessions", async () => {
            createSession("session-cleanup-1", "container-1", "python", "user-1");
            createSession("session-cleanup-2", "container-2", "javascript", "user-2");
            mockDestroyContainer.mockResolvedValue(undefined);

            await cleanupAllSessions();

            expect(getSession("session-cleanup-1")).toBeUndefined();
            expect(getSession("session-cleanup-2")).toBeUndefined();
            expect(mockDestroyContainer).toHaveBeenCalledTimes(2);
        });

        it("should handle empty session store", async () => {
            await cleanupAllSessions(); // Ensure empty

            // Should not throw
            await cleanupAllSessions();

            expect(mockDestroyContainer).not.toHaveBeenCalled();
        });
    });

    describe("stopCleanupTimer", () => {
        it("should stop the cleanup timer without error", () => {
            // Create a session to start the timer
            createSession("session-timer-1", "container-1", "python", "user-1");

            // Should not throw
            stopCleanupTimer();
        });

        it("should be safe to call multiple times", () => {
            stopCleanupTimer();
            stopCleanupTimer();
            stopCleanupTimer();

            // No assertions needed - just shouldn't throw
        });
    });
});
