/**
 * SafetyLogRepository Tests
 *
 * Tests for safety log operations including append-only logging,
 * filtering by agent/thread, metrics retrieval, and data retention.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { SafetyLogRepository } from "../SafetyLogRepository";
import {
    mockRows,
    mockInsertReturning,
    mockAffectedRows,
    generateSafetyLogRow,
    generateId
} from "./setup";

describe("SafetyLogRepository", () => {
    let repository: SafetyLogRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new SafetyLogRepository();
    });

    describe("create", () => {
        it("should insert a new safety log entry", async () => {
            const input = {
                user_id: generateId(),
                agent_id: generateId(),
                execution_id: generateId(),
                thread_id: generateId(),
                check_type: "content_moderation" as const,
                action: "allow" as const,
                direction: "input" as const,
                original_content: "User message content",
                metadata: { reason: "safe" }
            };

            const mockRow = generateSafetyLogRow({
                user_id: input.user_id,
                agent_id: input.agent_id,
                execution_id: input.execution_id,
                thread_id: input.thread_id,
                check_type: input.check_type,
                action: input.action,
                direction: input.direction,
                original_content: input.original_content,
                metadata: JSON.stringify(input.metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.safety_logs"),
                expect.arrayContaining([
                    input.user_id,
                    input.agent_id,
                    input.execution_id,
                    input.thread_id,
                    input.check_type,
                    input.action,
                    input.direction,
                    input.original_content,
                    null, // redacted_content
                    JSON.stringify(input.metadata)
                ])
            );
            expect(result.agent_id).toBe(input.agent_id);
            expect(result.action).toBe("allow");
        });

        it("should insert a blocked entry with redacted content", async () => {
            const input = {
                user_id: generateId(),
                agent_id: generateId(),
                check_type: "pii_detection" as const,
                action: "redact" as const,
                direction: "output" as const,
                original_content: "User email: test@example.com",
                redacted_content: "User email: [REDACTED]",
                metadata: { detected_pii: ["email"] }
            };

            const mockRow = generateSafetyLogRow({
                ...input,
                metadata: JSON.stringify(input.metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.redacted_content).toBe(input.redacted_content);
        });

        it("should use default values when optional fields not provided", async () => {
            const input = {
                user_id: generateId(),
                agent_id: generateId(),
                check_type: "content_moderation" as const,
                action: "allow" as const,
                direction: "input" as const
            };

            const mockRow = generateSafetyLogRow({
                user_id: input.user_id,
                agent_id: input.agent_id,
                execution_id: null,
                thread_id: null,
                original_content: null,
                redacted_content: null,
                metadata: "{}"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([null, null, null, null, JSON.stringify({})])
            );
        });
    });

    describe("findByAgentId", () => {
        it("should return safety logs for agent", async () => {
            const agentId = generateId();
            const mockLogs = [
                generateSafetyLogRow({ agent_id: agentId }),
                generateSafetyLogRow({ agent_id: agentId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockLogs));

            const result = await repository.findByAgentId(agentId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE agent_id = $1"), [
                agentId
            ]);
            expect(result).toHaveLength(2);
        });

        it("should filter by check_type when provided", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([generateSafetyLogRow()]));

            await repository.findByAgentId(agentId, { checkType: "content_moderation" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("check_type = $2"),
                expect.arrayContaining([agentId, "content_moderation"])
            );
        });

        it("should filter by action when provided", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([generateSafetyLogRow()]));

            await repository.findByAgentId(agentId, { action: "block" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("action = $"),
                expect.arrayContaining([agentId, "block"])
            );
        });

        it("should filter by date range when provided", async () => {
            const agentId = generateId();
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByAgentId(agentId, { startDate, endDate });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("created_at >= $"),
                expect.arrayContaining([agentId, startDate, endDate])
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("created_at <= $"),
                expect.anything()
            );
        });

        it("should use default limit and offset", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByAgentId(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT 100"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("OFFSET 0"),
                expect.anything()
            );
        });

        it("should respect custom limit and offset", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByAgentId(agentId, { limit: 50, offset: 100 });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT 50"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("OFFSET 100"),
                expect.anything()
            );
        });
    });

    describe("findByThreadId", () => {
        it("should return safety logs for thread", async () => {
            const threadId = generateId();
            const mockLogs = [
                generateSafetyLogRow({ thread_id: threadId }),
                generateSafetyLogRow({ thread_id: threadId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockLogs));

            const result = await repository.findByThreadId(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE thread_id = $1"),
                [threadId, 100]
            );
            expect(result).toHaveLength(2);
        });

        it("should respect custom limit", async () => {
            const threadId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByThreadId(threadId, 50);

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [threadId, 50]);
        });
    });

    describe("getMetrics", () => {
        it("should return aggregated metrics for agent", async () => {
            const agentId = generateId();
            const mockMetrics = [
                {
                    agent_id: agentId,
                    check_type: "content_filter",
                    action: "allow",
                    direction: "input",
                    event_count: 100,
                    day: new Date("2024-01-15")
                },
                {
                    agent_id: agentId,
                    check_type: "content_filter",
                    action: "block",
                    direction: "input",
                    event_count: 5,
                    day: new Date("2024-01-15")
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMetrics));

            const result = await repository.getMetrics(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("FROM flowmaestro.safety_metrics"),
                [agentId]
            );
            expect(result).toHaveLength(2);
        });

        it("should filter metrics by check_type", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getMetrics(agentId, { checkType: "pii_detection" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("check_type = $"),
                expect.arrayContaining([agentId, "pii_detection"])
            );
        });

        it("should filter metrics by date range", async () => {
            const agentId = generateId();
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getMetrics(agentId, { startDate, endDate });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("day >= $"),
                expect.arrayContaining([agentId, startDate, endDate])
            );
        });
    });

    describe("getRecentBlocked", () => {
        it("should return recent blocked attempts for agent", async () => {
            const agentId = generateId();
            const mockLogs = [
                generateSafetyLogRow({ agent_id: agentId, action: "block" }),
                generateSafetyLogRow({ agent_id: agentId, action: "block" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockLogs));

            const result = await repository.getRecentBlocked(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND action = 'block'"),
                [agentId, 50]
            );
            expect(result).toHaveLength(2);
        });

        it("should respect custom limit", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getRecentBlocked(agentId, 10);

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [agentId, 10]);
        });
    });

    describe("deleteOlderThan", () => {
        it("should delete old safety logs", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1000));

            const result = await repository.deleteOlderThan(90);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.safety_logs")
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("NOW() - INTERVAL '90 days'")
            );
            expect(result).toBe(1000);
        });

        it("should return 0 when no old logs found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteOlderThan(30);

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const agentId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateSafetyLogRow({
                agent_id: agentId,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByAgentId(agentId);

            expect(result[0].created_at).toBeInstanceOf(Date);
        });

        it("should parse metadata from JSON string", async () => {
            const agentId = generateId();
            const metadata = { detected: ["pii"], score: 0.95 };
            const mockRow = generateSafetyLogRow({
                agent_id: agentId,
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByAgentId(agentId);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle metadata already parsed by pg", async () => {
            const agentId = generateId();
            const metadata = { detected: ["pii"], score: 0.95 };
            const mockRow = {
                ...generateSafetyLogRow({ agent_id: agentId }),
                metadata // Already an object
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByAgentId(agentId);

            expect(result[0].metadata).toEqual(metadata);
        });
    });
});
