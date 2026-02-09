/**
 * AgentRepository Tests
 *
 * Tests for agent CRUD operations including JSON config handling,
 * type coercion for numeric fields, and folder filtering.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { AgentRepository } from "../AgentRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateAgentRow,
    generateId
} from "./setup";

describe("AgentRepository", () => {
    let repository: AgentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new AgentRepository();
    });

    describe("create", () => {
        it("should insert a new agent with default values", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Test Agent",
                model: "gpt-4",
                provider: "openai" as const,
                system_prompt: "You are a helpful assistant."
            };

            const mockRow = generateAgentRow({
                ...input,
                temperature: 0.7,
                max_tokens: 4000,
                max_iterations: 100
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agents"),
                expect.arrayContaining([
                    input.user_id,
                    input.workspace_id,
                    input.name,
                    null, // description
                    input.model,
                    input.provider
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.temperature).toBe(0.7);
            expect(result.max_tokens).toBe(4000);
        });

        it("should stringify JSON fields", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Agent with Tools",
                model: "gpt-4",
                provider: "openai" as const,
                system_prompt: "You are a helpful assistant.",
                available_tools: [
                    {
                        id: "tool-1",
                        name: "web_search",
                        description: "Search the web",
                        type: "builtin" as const,
                        schema: {},
                        config: {}
                    }
                ],
                memory_config: { type: "buffer" as const, max_messages: 30 },
                metadata: { custom_field: "value" }
            };

            const mockRow = generateAgentRow({
                ...input,
                available_tools: JSON.stringify(input.available_tools),
                memory_config: JSON.stringify(input.memory_config),
                metadata: JSON.stringify(input.metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    JSON.stringify(input.available_tools),
                    JSON.stringify(input.memory_config),
                    JSON.stringify(input.metadata)
                ])
            );
            expect(result.available_tools).toEqual(input.available_tools);
        });

        it("should handle custom temperature and max_tokens", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Custom Agent",
                model: "claude-3-opus",
                provider: "anthropic" as const,
                system_prompt: "You are Claude.",
                temperature: 0.5,
                max_tokens: 8000,
                max_iterations: 50
            };

            const mockRow = generateAgentRow(input);

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.temperature).toBe(0.5);
            expect(result.max_tokens).toBe(8000);
            expect(result.max_iterations).toBe(50);
        });
    });

    describe("findById", () => {
        it("should return agent when found", async () => {
            const agentId = generateId();
            const mockRow = generateAgentRow({ id: agentId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [agentId]
            );
            expect(result?.id).toBe(agentId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });

        it("should parse JSON fields from strings", async () => {
            const agentId = generateId();
            const availableTools = [{ type: "builtin", tool_id: "web_search" }];
            const memoryConfig = { type: "buffer", max_messages: 20 };
            const mockRow = generateAgentRow({
                id: agentId,
                available_tools: JSON.stringify(availableTools),
                memory_config: JSON.stringify(memoryConfig)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(agentId);

            expect(result?.available_tools).toEqual(availableTools);
            expect(result?.memory_config).toEqual(memoryConfig);
        });

        it("should coerce numeric fields from strings", async () => {
            const agentId = generateId();
            const mockRow = generateAgentRow({
                id: agentId,
                temperature: "0.8" as unknown as number,
                max_tokens: "2000" as unknown as number,
                max_iterations: "50" as unknown as number
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(agentId);

            expect(result?.temperature).toBe(0.8);
            expect(typeof result?.temperature).toBe("number");
            expect(result?.max_tokens).toBe(2000);
            expect(typeof result?.max_tokens).toBe("number");
            expect(result?.max_iterations).toBe(50);
            expect(typeof result?.max_iterations).toBe("number");
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find agent by id and workspace id", async () => {
            const agentId = generateId();
            const workspaceId = generateId();
            const mockRow = generateAgentRow({ id: agentId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(agentId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL"
                ),
                [agentId, workspaceId]
            );
            expect(result?.id).toBe(agentId);
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find agent by id and workspace id", async () => {
            const agentId = generateId();
            const workspaceId = generateId();
            const mockRow = generateAgentRow({ id: agentId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(agentId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL"
                ),
                [agentId, workspaceId]
            );
            expect(result?.id).toBe(agentId);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated agents with total count", async () => {
            const workspaceId = generateId();
            const mockAgents = [generateAgentRow(), generateAgentRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockAgents));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.agents).toHaveLength(2);
        });

        it("should apply folder filter when folderId is provided", async () => {
            const workspaceId = generateId();
            const folderId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateAgentRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("$2 = ANY(COALESCE(folder_ids"),
                expect.arrayContaining([workspaceId, folderId])
            );
        });

        it("should filter for root-level items when folderId is null", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateAgentRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId: null });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("folder_ids IS NULL OR folder_ids = ARRAY[]::UUID[]"),
                expect.arrayContaining([workspaceId])
            );
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const agentId = generateId();
            const mockRow = generateAgentRow({ id: agentId, name: "Updated Agent" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(agentId, { name: "Updated Agent" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.agents"),
                expect.arrayContaining(["Updated Agent", agentId])
            );
            expect(result?.name).toBe("Updated Agent");
        });

        it("should stringify JSON fields when updating", async () => {
            const agentId = generateId();
            const newTools = [{ type: "workflow", workflow_id: "wf-123" }];
            const mockRow = generateAgentRow({
                id: agentId,
                available_tools: JSON.stringify(newTools)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(agentId, { available_tools: newTools as never });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("available_tools = $1"),
                expect.arrayContaining([JSON.stringify(newTools), agentId])
            );
        });

        it("should return existing agent when no updates provided", async () => {
            const agentId = generateId();
            const mockRow = generateAgentRow({ id: agentId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(agentId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.agents"),
                [agentId]
            );
            expect(result?.id).toBe(agentId);
        });

        it("should return null when agent not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.update("non-existent", { name: "New Name" });

            expect(result).toBeNull();
        });

        it("should update model and provider", async () => {
            const agentId = generateId();
            const mockRow = generateAgentRow({
                id: agentId,
                model: "claude-3-sonnet",
                provider: "anthropic"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(agentId, {
                model: "claude-3-sonnet",
                provider: "anthropic"
            });

            expect(result?.model).toBe("claude-3-sonnet");
            expect(result?.provider).toBe("anthropic");
        });
    });

    describe("delete", () => {
        it("should soft delete agent and return true", async () => {
            const agentId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [agentId]
            );
            expect(result).toBe(true);
        });

        it("should return false when agent not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("hardDelete", () => {
        it("should permanently delete agent", async () => {
            const agentId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.hardDelete(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agents"),
                [agentId]
            );
            expect(result).toBe(true);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const agentId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateAgentRow({
                id: agentId,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(agentId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.deleted_at).toBeNull();
        });

        it("should handle JSON fields already parsed by pg", async () => {
            const agentId = generateId();
            const availableTools = [{ type: "builtin", tool_id: "test" }];
            const mockRow = {
                ...generateAgentRow({ id: agentId }),
                available_tools: availableTools // Already an array, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(agentId);

            expect(result?.available_tools).toEqual(availableTools);
        });
    });
});
