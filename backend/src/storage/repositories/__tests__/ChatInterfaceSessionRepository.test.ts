/**
 * ChatInterfaceSessionRepository Tests
 *
 * Tests for chat interface session CRUD operations including token handling,
 * session continuity, visitor tracking, and session statistics.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ChatInterfaceSessionRepository } from "../ChatInterfaceSessionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateChatInterfaceSessionRow,
    generateId
} from "./setup";

describe("ChatInterfaceSessionRepository", () => {
    let repository: ChatInterfaceSessionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ChatInterfaceSessionRepository();
    });

    describe("create", () => {
        it("should insert a new session with generated token", async () => {
            const input = {
                interfaceId: generateId(),
                browserFingerprint: "fp_abc123",
                ipAddress: "192.168.1.1",
                userAgent: "Mozilla/5.0",
                referrer: "https://example.com",
                countryCode: "US"
            };

            const mockRow = generateChatInterfaceSessionRow({
                interface_id: input.interfaceId,
                browser_fingerprint: input.browserFingerprint,
                ip_address: input.ipAddress,
                user_agent: input.userAgent,
                referrer: input.referrer,
                country_code: input.countryCode
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.chat_interface_sessions"),
                expect.arrayContaining([
                    input.interfaceId,
                    expect.any(String), // session_token
                    input.browserFingerprint,
                    input.ipAddress,
                    input.userAgent,
                    input.referrer,
                    input.countryCode
                ])
            );
            expect(result.interfaceId).toBe(input.interfaceId);
            expect(result.status).toBe("active");
        });

        it("should use default null values when optional fields not provided", async () => {
            const input = {
                interfaceId: generateId()
            };

            const mockRow = generateChatInterfaceSessionRow({
                interface_id: input.interfaceId,
                browser_fingerprint: null,
                ip_address: null,
                user_agent: null,
                referrer: null,
                country_code: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    input.interfaceId,
                    expect.any(String),
                    null,
                    null,
                    null,
                    null,
                    null
                ])
            );
        });

        it("should include persistence token when provided", async () => {
            const persistenceToken = "persist_123";
            const input = {
                interfaceId: generateId(),
                persistenceToken
            };

            const mockRow = generateChatInterfaceSessionRow({
                interface_id: input.interfaceId,
                persistence_token: persistenceToken
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.persistenceToken).toBe(persistenceToken);
        });
    });

    describe("findById", () => {
        it("should return session when found", async () => {
            const sessionId = generateId();
            const mockRow = generateChatInterfaceSessionRow({ id: sessionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                sessionId
            ]);
            expect(result?.id).toBe(sessionId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findBySessionToken", () => {
        it("should return session when found by token", async () => {
            const interfaceId = generateId();
            const sessionToken = "sess_abc123";
            const mockRow = generateChatInterfaceSessionRow({
                interface_id: interfaceId,
                session_token: sessionToken
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findBySessionToken(interfaceId, sessionToken);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE interface_id = $1 AND session_token = $2"),
                [interfaceId, sessionToken]
            );
            expect(result?.sessionToken).toBe(sessionToken);
        });
    });

    describe("findByPersistenceToken", () => {
        it("should return active session with persistence token", async () => {
            const interfaceId = generateId();
            const persistenceToken = "persist_123";
            const mockRow = generateChatInterfaceSessionRow({
                interface_id: interfaceId,
                persistence_token: persistenceToken,
                status: "active"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByPersistenceToken(interfaceId, persistenceToken);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("persistence_token = $2 AND status = 'active'"),
                [interfaceId, persistenceToken]
            );
            expect(result?.persistenceToken).toBe(persistenceToken);
        });
    });

    describe("findByFingerprint", () => {
        it("should return active session by browser fingerprint", async () => {
            const interfaceId = generateId();
            const fingerprint = "fp_abc123";
            const mockRow = generateChatInterfaceSessionRow({
                interface_id: interfaceId,
                browser_fingerprint: fingerprint,
                status: "active"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByFingerprint(interfaceId, fingerprint);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("browser_fingerprint = $2 AND status = 'active'"),
                [interfaceId, fingerprint]
            );
            expect(result?.browserFingerprint).toBe(fingerprint);
        });
    });

    describe("findByInterfaceId", () => {
        it("should return paginated sessions with total count", async () => {
            const interfaceId = generateId();
            const mockSessions = [
                generateChatInterfaceSessionRow({ interface_id: interfaceId }),
                generateChatInterfaceSessionRow({ interface_id: interfaceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockSessions));

            const result = await repository.findByInterfaceId(interfaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.sessions).toHaveLength(2);
        });

        it("should filter by status when provided", async () => {
            const interfaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateChatInterfaceSessionRow()]));

            await repository.findByInterfaceId(interfaceId, { status: "active" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND status = $2"),
                expect.arrayContaining([interfaceId, "active"])
            );
        });

        it("should use default pagination values", async () => {
            const interfaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByInterfaceId(interfaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining([interfaceId, 50, 0])
            );
        });
    });

    describe("updateThreadId", () => {
        it("should update thread ID and last_activity_at", async () => {
            const sessionId = generateId();
            const threadId = generateId();
            const mockRow = generateChatInterfaceSessionRow({
                id: sessionId,
                thread_id: threadId
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateThreadId(sessionId, threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET thread_id = $2, last_activity_at = CURRENT_TIMESTAMP"),
                [sessionId, threadId]
            );
            expect(result?.threadId).toBe(threadId);
        });
    });

    describe("incrementMessageCount", () => {
        it("should increment message count and update activity", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.incrementMessageCount(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("message_count = message_count + 1"),
                [sessionId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("last_activity_at = CURRENT_TIMESTAMP"),
                expect.anything()
            );
        });
    });

    describe("updateLastActivity", () => {
        it("should update last activity timestamp", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.updateLastActivity(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET last_activity_at = CURRENT_TIMESTAMP"),
                [sessionId]
            );
        });
    });

    describe("endSession", () => {
        it("should set status to ended and set ended_at", async () => {
            const sessionId = generateId();
            const mockRow = generateChatInterfaceSessionRow({
                id: sessionId,
                status: "ended",
                ended_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.endSession(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'ended', ended_at = CURRENT_TIMESTAMP"),
                [sessionId]
            );
            expect(result?.status).toBe("ended");
        });
    });

    describe("expireOldSessions", () => {
        it("should expire inactive sessions", async () => {
            const interfaceId = generateId();
            const timeoutMinutes = 30;

            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.expireOldSessions(interfaceId, timeoutMinutes);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET status = 'expired'"),
                [interfaceId, timeoutMinutes]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("NOW() - INTERVAL '1 minute' * $2"),
                expect.anything()
            );
            expect(result).toBe(5);
        });
    });

    describe("countActiveSessions", () => {
        it("should return count of active sessions", async () => {
            const interfaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(25));

            const result = await repository.countActiveSessions(interfaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE interface_id = $1 AND status = 'active'"),
                [interfaceId]
            );
            expect(result).toBe(25);
        });
    });

    describe("getSessionStats", () => {
        it("should return session statistics", async () => {
            const interfaceId = generateId();
            const mockStats = {
                total_sessions: "100",
                active_sessions: "25",
                total_messages: "500",
                avg_messages: "5.0"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockStats]));

            const result = await repository.getSessionStats(interfaceId, 24);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("COUNT(*) as total_sessions"),
                [interfaceId, 24]
            );
            expect(result.totalSessions).toBe(100);
            expect(result.activeSessions).toBe(25);
            expect(result.totalMessages).toBe(500);
            expect(result.avgMessagesPerSession).toBe(5.0);
        });
    });

    describe("generatePersistenceToken", () => {
        it("should generate a random token", () => {
            const token = repository.generatePersistenceToken();

            expect(token).toBeDefined();
            expect(typeof token).toBe("string");
            expect(token.length).toBeGreaterThan(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const sessionId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateChatInterfaceSessionRow({
                id: sessionId,
                first_seen_at: now,
                last_activity_at: now,
                ended_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(sessionId);

            expect(result?.firstSeenAt).toBeInstanceOf(Date);
            expect(result?.lastActivityAt).toBeInstanceOf(Date);
            expect(result?.endedAt).toBeInstanceOf(Date);
        });

        it("should handle null ended_at", async () => {
            const sessionId = generateId();
            const mockRow = generateChatInterfaceSessionRow({
                id: sessionId,
                ended_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(sessionId);

            expect(result?.endedAt).toBeNull();
        });
    });
});
