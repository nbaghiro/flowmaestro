/**
 * ThreadRepository Tests
 *
 * Tests for thread CRUD operations including filtering by agent,
 * status management, archiving, and statistics.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ThreadRepository } from "../ThreadRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateThreadRow,
    generateId
} from "./setup";

describe("ThreadRepository", () => {
    let repository: ThreadRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ThreadRepository();
    });

    describe("create", () => {
        it("should insert a new thread with default values", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                agent_id: generateId()
            };

            const mockRow = generateThreadRow({
                ...input,
                title: undefined
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.threads"),
                expect.arrayContaining([
                    input.user_id,
                    input.workspace_id,
                    input.agent_id,
                    null,
                    "active"
                ])
            );
            expect(result.agent_id).toBe(input.agent_id);
            expect(result.status).toBe("active");
        });

        it("should create thread with title and metadata", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                agent_id: generateId(),
                title: "My Conversation",
                metadata: { source: "web" }
            };

            const mockRow = generateThreadRow({
                ...input,
                metadata: JSON.stringify(input.metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.title).toBe(input.title);
            expect(result.metadata).toEqual(input.metadata);
        });
    });

    describe("findById", () => {
        it("should return thread when found", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [threadId]
            );
            expect(result?.id).toBe(threadId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find thread by id and workspace id", async () => {
            const threadId = generateId();
            const workspaceId = generateId();
            const mockRow = generateThreadRow({ id: threadId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(threadId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL"
                ),
                [threadId, workspaceId]
            );
            expect(result?.id).toBe(threadId);
        });
    });

    describe("list", () => {
        it("should return paginated threads with total count", async () => {
            const workspaceId = generateId();
            const mockThreads = [generateThreadRow(), generateThreadRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockThreads));

            const result = await repository.list({
                workspace_id: workspaceId,
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.threads).toHaveLength(2);
        });

        it("should filter by agent_id", async () => {
            const workspaceId = generateId();
            const agentId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateThreadRow()]));

            await repository.list({
                workspace_id: workspaceId,
                agent_id: agentId
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("agent_id = $2"),
                expect.arrayContaining([workspaceId, agentId])
            );
        });

        it("should filter by status", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateThreadRow()]));

            await repository.list({
                workspace_id: workspaceId,
                status: "archived"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $2"),
                expect.arrayContaining([workspaceId, "archived"])
            );
        });

        it("should filter by search term", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows([generateThreadRow()]));

            await repository.list({
                workspace_id: workspaceId,
                search: "test"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("title ILIKE $2"),
                expect.arrayContaining([workspaceId, "%test%"])
            );
        });
    });

    describe("findByWorkspaceId", () => {
        it("should delegate to list method", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateThreadRow()]));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 10,
                offset: 5,
                agentId: generateId()
            });

            expect(result.total).toBe(5);
        });
    });

    describe("findByAgentAndWorkspace", () => {
        it("should find threads for specific agent in workspace", async () => {
            const agentId = generateId();
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateThreadRow()]));

            const result = await repository.findByAgentAndWorkspace(agentId, workspaceId);

            expect(result.total).toBe(3);
        });
    });

    describe("findMostRecentActiveByWorkspace", () => {
        it("should return most recent active thread", async () => {
            const agentId = generateId();
            const workspaceId = generateId();
            const mockRow = generateThreadRow({
                agent_id: agentId,
                workspace_id: workspaceId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findMostRecentActiveByWorkspace(agentId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'active'"), [
                agentId,
                workspaceId
            ]);
            expect(result).not.toBeNull();
        });

        it("should return null when no active thread", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findMostRecentActiveByWorkspace(
                generateId(),
                generateId()
            );

            expect(result).toBeNull();
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId, title: "Updated Title" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(threadId, { title: "Updated Title" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.threads"),
                expect.arrayContaining(["Updated Title", threadId])
            );
            expect(result?.title).toBe("Updated Title");
        });

        it("should auto-set archived_at when status changes to archived", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(threadId, { status: "archived" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("archived_at = CURRENT_TIMESTAMP"),
                expect.arrayContaining(["archived", threadId])
            );
        });

        it("should return existing thread when no updates provided", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(threadId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.threads"),
                [threadId]
            );
            expect(result?.id).toBe(threadId);
        });
    });

    describe("updateTitle", () => {
        it("should update thread title", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId, title: "New Title" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateTitle(threadId, "New Title");

            expect(result?.title).toBe("New Title");
        });
    });

    describe("archive", () => {
        it("should archive thread with timestamp", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.archive(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $1"),
                expect.arrayContaining(["archived"])
            );
        });
    });

    describe("unarchive", () => {
        it("should unarchive thread and clear archived_at", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({ id: threadId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.unarchive(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $1"),
                expect.arrayContaining(["active"])
            );
        });
    });

    describe("delete", () => {
        it("should soft delete thread and return true", async () => {
            const threadId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'"),
                [threadId]
            );
            expect(result).toBe(true);
        });

        it("should return false when thread not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("hardDelete", () => {
        it("should permanently delete thread", async () => {
            const threadId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.hardDelete(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.threads"),
                [threadId]
            );
            expect(result).toBe(true);
        });
    });

    describe("getStats", () => {
        it("should return thread statistics", async () => {
            const threadId = generateId();
            const now = new Date().toISOString();

            mockQuery.mockResolvedValueOnce(
                mockRows([
                    {
                        message_count: "10",
                        execution_count: "3",
                        first_message_at: now,
                        last_message_at: now
                    }
                ])
            );

            const result = await repository.getStats(threadId);

            expect(result.message_count).toBe(10);
            expect(result.execution_count).toBe(3);
            expect(result.first_message_at).toBeInstanceOf(Date);
            expect(result.last_message_at).toBeInstanceOf(Date);
        });

        it("should return zeros when thread has no messages", async () => {
            const threadId = generateId();

            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getStats(threadId);

            expect(result.message_count).toBe(0);
            expect(result.execution_count).toBe(0);
            expect(result.first_message_at).toBeNull();
            expect(result.last_message_at).toBeNull();
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const threadId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateThreadRow({
                id: threadId,
                created_at: now,
                updated_at: now,
                last_message_at: now,
                archived_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(threadId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.last_message_at).toBeInstanceOf(Date);
            expect(result?.archived_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const threadId = generateId();
            const mockRow = generateThreadRow({
                id: threadId,
                last_message_at: null,
                archived_at: null,
                deleted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(threadId);

            expect(result?.last_message_at).toBeNull();
            expect(result?.archived_at).toBeNull();
            expect(result?.deleted_at).toBeNull();
        });

        it("should parse JSON metadata from string", async () => {
            const threadId = generateId();
            const metadata = { source: "api", version: 2 };
            const mockRow = generateThreadRow({
                id: threadId,
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(threadId);

            expect(result?.metadata).toEqual(metadata);
        });
    });
});
