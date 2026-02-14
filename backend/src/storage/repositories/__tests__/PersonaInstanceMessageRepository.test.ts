/**
 * Tests for PersonaInstanceMessageRepository
 */

const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaInstanceMessageRepository } from "../PersonaInstanceMessageRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePersonaInstanceMessageRow,
    generateId
} from "./setup";

describe("PersonaInstanceMessageRepository", () => {
    let repository: PersonaInstanceMessageRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaInstanceMessageRepository();
    });

    describe("create", () => {
        it("should create a user message", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                role: "user" as const,
                content: "Please research AI market trends"
            };

            const mockRow = generatePersonaInstanceMessageRow({
                instance_id: instanceId,
                role: "user",
                content: "Please research AI market trends"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_instance_messages"),
                [instanceId, "user", "Please research AI market trends", expect.any(String)]
            );
            expect(result.instance_id).toBe(instanceId);
            expect(result.role).toBe("user");
            expect(result.content).toBe("Please research AI market trends");
        });

        it("should create an assistant message", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                role: "assistant" as const,
                content: "I'll research AI market trends for you."
            };

            const mockRow = generatePersonaInstanceMessageRow({
                instance_id: instanceId,
                role: "assistant",
                content: input.content
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.role).toBe("assistant");
        });

        it("should create a message with tool_calls in metadata", async () => {
            const instanceId = generateId();
            const toolCalls = [
                { id: "call_1", name: "web_search", arguments: { query: "AI trends" } }
            ];
            const input = {
                instance_id: instanceId,
                role: "assistant" as const,
                content: "Let me search for that.",
                tool_calls: toolCalls
            };

            const mockRow = generatePersonaInstanceMessageRow({
                instance_id: instanceId,
                role: "assistant",
                content: input.content,
                metadata: JSON.stringify({ tool_calls: toolCalls })
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            // Verify the metadata includes tool_calls
            const queryCall = mockQuery.mock.calls[0];
            const metadataArg = queryCall[1][3];
            const parsedMetadata = JSON.parse(metadataArg);
            expect(parsedMetadata.tool_calls).toEqual(toolCalls);
        });

        it("should create a tool result message", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                role: "tool" as const,
                content: JSON.stringify({ results: ["trend 1", "trend 2"] }),
                tool_name: "web_search",
                tool_call_id: "call_1"
            };

            const mockRow = generatePersonaInstanceMessageRow({
                instance_id: instanceId,
                role: "tool",
                content: input.content,
                metadata: JSON.stringify({
                    tool_name: "web_search",
                    tool_call_id: "call_1"
                })
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.role).toBe("tool");
        });

        it("should include thread_id in metadata when provided", async () => {
            const instanceId = generateId();
            const threadId = generateId();
            const input = {
                instance_id: instanceId,
                thread_id: threadId,
                role: "user" as const,
                content: "Hello"
            };

            const mockRow = generatePersonaInstanceMessageRow({
                instance_id: instanceId,
                metadata: JSON.stringify({ thread_id: threadId })
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            const queryCall = mockQuery.mock.calls[0];
            const metadataArg = queryCall[1][3];
            const parsedMetadata = JSON.parse(metadataArg);
            expect(parsedMetadata.thread_id).toBe(threadId);
        });
    });

    describe("findByInstanceId", () => {
        it("should return messages ordered by created_at ASC", async () => {
            const instanceId = generateId();
            const oldDate = new Date("2024-01-01T10:00:00Z");
            const newDate = new Date("2024-01-01T10:05:00Z");

            const mockMessages = [
                generatePersonaInstanceMessageRow({
                    instance_id: instanceId,
                    role: "user",
                    content: "First message",
                    created_at: oldDate
                }),
                generatePersonaInstanceMessageRow({
                    instance_id: instanceId,
                    role: "assistant",
                    content: "Second message",
                    created_at: newDate
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMessages));

            const result = await repository.findByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                [instanceId, 100, 0]
            );
            expect(result).toHaveLength(2);
        });

        it("should apply pagination options", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByInstanceId(instanceId, { limit: 50, offset: 10 });

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("LIMIT $2 OFFSET $3"), [
                instanceId,
                50,
                10
            ]);
        });

        it("should return empty array when no messages exist", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByInstanceId("instance-without-messages");

            expect(result).toEqual([]);
        });
    });

    describe("findLatestByInstanceId", () => {
        it("should return latest N messages in chronological order", async () => {
            const instanceId = generateId();
            const mockMessages = [
                generatePersonaInstanceMessageRow({ content: "Message 1" }),
                generatePersonaInstanceMessageRow({ content: "Message 2" }),
                generatePersonaInstanceMessageRow({ content: "Message 3" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMessages));

            const result = await repository.findLatestByInstanceId(instanceId, 10);

            // The query uses a subquery to get DESC order then re-orders ASC
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                [instanceId, 10]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                [instanceId, 10]
            );
            expect(result).toHaveLength(3);
        });

        it("should use default limit of 50", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findLatestByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [instanceId, 50]);
        });

        it("should return empty array when no messages", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findLatestByInstanceId("instance-id");

            expect(result).toEqual([]);
        });
    });

    describe("countByInstanceId", () => {
        it("should return message count", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockCountResult(15));

            const result = await repository.countByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT COUNT(*) as count"),
                [instanceId]
            );
            expect(result).toBe(15);
        });

        it("should return 0 when no messages", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countByInstanceId("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("deleteByInstanceId", () => {
        it("should delete all messages for an instance", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(10));

            const result = await repository.deleteByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_instance_messages"),
                [instanceId]
            );
            expect(result).toBe(10);
        });

        it("should return 0 when no messages to delete", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByInstanceId("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should parse metadata from JSON string", async () => {
            const metadata = {
                thread_id: generateId(),
                tool_calls: [{ id: "call_1", name: "test" }]
            };
            const mockRow = generatePersonaInstanceMessageRow({
                metadata: JSON.stringify(metadata)
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should extract tool_calls from metadata", async () => {
            const toolCalls = [{ id: "call_1", name: "web_search", arguments: {} }];
            const mockRow = generatePersonaInstanceMessageRow({
                metadata: JSON.stringify({ tool_calls: toolCalls })
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result[0].tool_calls).toEqual(toolCalls);
        });

        it("should extract tool_name from metadata", async () => {
            const mockRow = generatePersonaInstanceMessageRow({
                role: "tool",
                metadata: JSON.stringify({ tool_name: "web_search", tool_call_id: "call_1" })
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result[0].tool_name).toBe("web_search");
            expect(result[0].tool_call_id).toBe("call_1");
        });

        it("should convert created_at to Date", async () => {
            const createdAt = new Date("2024-06-15T10:00:00Z");
            const mockRow = generatePersonaInstanceMessageRow({
                created_at: createdAt
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result[0].created_at).toBeInstanceOf(Date);
        });

        it("should handle metadata as object (already parsed)", async () => {
            const metadata = { key: "value" };
            const mockRow = {
                ...generatePersonaInstanceMessageRow(),
                metadata: metadata as unknown as string // Simulate already-parsed object
            };
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle empty metadata", async () => {
            const mockRow = generatePersonaInstanceMessageRow({
                metadata: "{}"
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result[0].metadata).toEqual({});
            expect(result[0].tool_calls).toBeUndefined();
            expect(result[0].tool_name).toBeUndefined();
        });
    });
});
