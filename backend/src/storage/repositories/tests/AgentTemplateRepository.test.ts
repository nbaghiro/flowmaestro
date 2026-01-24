/**
 * AgentTemplateRepository Tests
 *
 * Tests for agent template CRUD operations including search, filtering,
 * categories, and view/use count tracking.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { AgentTemplateRepository } from "../AgentTemplateRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateAgentTemplateRow,
    generateId
} from "./setup";

describe("AgentTemplateRepository", () => {
    let repository: AgentTemplateRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new AgentTemplateRepository();
    });

    describe("create", () => {
        it("should insert a new agent template with all fields", async () => {
            const input = {
                name: "Customer Support Agent",
                description: "An AI agent for customer support",
                system_prompt: "You are a helpful customer support agent.",
                model: "gpt-4",
                provider: "openai" as const,
                category: "support" as const,
                tags: ["customer", "support"],
                featured: true
            };

            const mockRow = generateAgentTemplateRow({
                name: input.name,
                description: input.description,
                system_prompt: input.system_prompt,
                model: input.model,
                provider: input.provider,
                category: input.category,
                tags: input.tags,
                featured: input.featured
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_templates"),
                expect.arrayContaining([
                    input.name,
                    input.description,
                    input.system_prompt,
                    input.model,
                    input.provider
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.featured).toBe(true);
        });

        it("should use default values when not specified", async () => {
            const input = {
                name: "Basic Agent",
                system_prompt: "You are a helpful assistant.",
                model: "gpt-4",
                provider: "openai" as const,
                category: "engineering" as const
            };

            const mockRow = generateAgentTemplateRow({
                name: input.name,
                category: "engineering",
                temperature: 0.7,
                max_tokens: 4000,
                available_tools: "[]",
                tags: [],
                featured: false,
                sort_order: 0,
                version: "1.0.0",
                status: "active"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.temperature).toBe(0.7);
            expect(result.max_tokens).toBe(4000);
            expect(result.available_tools).toEqual([]);
            expect(result.tags).toEqual([]);
            expect(result.featured).toBe(false);
            expect(result.version).toBe("1.0.0");
        });

        it("should stringify available_tools JSON", async () => {
            const availableTools = [
                { name: "search", type: "function" as const, description: "Search the web" }
            ];
            const input = {
                name: "Tool Agent",
                system_prompt: "You can use tools.",
                model: "gpt-4",
                provider: "openai" as const,
                category: "engineering" as const,
                available_tools: availableTools
            };

            const mockRow = generateAgentTemplateRow({
                ...input,
                available_tools: JSON.stringify(availableTools)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(availableTools)])
            );
        });
    });

    describe("findById", () => {
        it("should return template when found", async () => {
            const templateId = generateId();
            const mockRow = generateAgentTemplateRow({ id: templateId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                templateId
            ]);
            expect(result?.id).toBe(templateId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });

        it("should parse JSON available_tools from string", async () => {
            const templateId = generateId();
            const tools = [{ name: "calculator", type: "function" }];
            const mockRow = generateAgentTemplateRow({
                id: templateId,
                available_tools: JSON.stringify(tools)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.available_tools).toEqual(tools);
        });
    });

    describe("findAll", () => {
        it("should return paginated templates with total count", async () => {
            const mockTemplates = [generateAgentTemplateRow(), generateAgentTemplateRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.findAll({ limit: 2, offset: 0 });

            expect(result.total).toBe(10);
            expect(result.templates).toHaveLength(2);
        });

        it("should filter by status (default: active)", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateAgentTemplateRow()]));

            await repository.findAll();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $1"),
                expect.arrayContaining(["active"])
            );
        });

        it("should filter by category when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateAgentTemplateRow()]));

            await repository.findAll({ category: "support" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("category = $2"),
                expect.arrayContaining(["active", "support"])
            );
        });

        it("should filter by tags when provided", async () => {
            const tags = ["customer", "support"];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows([generateAgentTemplateRow()]));

            await repository.findAll({ tags });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("tags && $2"),
                expect.arrayContaining(["active", tags])
            );
        });

        it("should filter by featured when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(4))
                .mockResolvedValueOnce(mockRows([generateAgentTemplateRow()]));

            await repository.findAll({ featured: true });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("featured = $2"),
                expect.arrayContaining(["active", true])
            );
        });

        it("should filter by search term", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([generateAgentTemplateRow()]));

            await repository.findAll({ search: "customer support" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("to_tsvector"),
                expect.arrayContaining(["active", "customer support"])
            );
        });

        it("should use default pagination values", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findAll();

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining(["active", 20, 0])
            );
        });
    });

    describe("findByCategory", () => {
        it("should return active templates in category", async () => {
            const mockTemplates = [
                generateAgentTemplateRow({ category: "support" }),
                generateAgentTemplateRow({ category: "support" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.findByCategory("support");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE category = $1 AND status = 'active'"),
                ["support"]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("getCategories", () => {
        it("should return category counts", async () => {
            const mockCategories = [
                { category: "support", count: "15" },
                { category: "sales", count: "10" },
                { category: "general", count: "5" }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockCategories));

            const result = await repository.getCategories();

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("GROUP BY category"));
            expect(result).toHaveLength(3);
            expect(result[0].count).toBe(15);
            expect(result[1].count).toBe(10);
        });
    });

    describe("incrementViewCount", () => {
        it("should increment view count", async () => {
            const templateId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.incrementViewCount(templateId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET view_count = view_count + 1"),
                [templateId]
            );
        });
    });

    describe("incrementUseCount", () => {
        it("should increment use count", async () => {
            const templateId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.incrementUseCount(templateId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET use_count = use_count + 1"),
                [templateId]
            );
        });
    });

    describe("search", () => {
        it("should return search results ranked by relevance", async () => {
            const mockTemplates = [
                generateAgentTemplateRow({ name: "Customer Support Agent" }),
                generateAgentTemplateRow({ name: "Customer Service Bot" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.search("customer");

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("ts_rank"), [
                "customer",
                20
            ]);
            expect(result).toHaveLength(2);
        });

        it("should respect limit parameter", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.search("test", 5);

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), ["test", 5]);
        });
    });

    describe("getFeatured", () => {
        it("should return featured templates", async () => {
            const mockTemplates = [
                generateAgentTemplateRow({ featured: true }),
                generateAgentTemplateRow({ featured: true })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.getFeatured();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE status = 'active' AND featured = true"),
                [6]
            );
            expect(result).toHaveLength(2);
        });

        it("should respect limit parameter", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getFeatured(3);

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [3]);
        });
    });

    describe("delete", () => {
        it("should hard delete template and return true", async () => {
            const templateId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(templateId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_templates"),
                [templateId]
            );
            expect(result).toBe(true);
        });

        it("should return false when template not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const templateId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateAgentTemplateRow({
                id: templateId,
                created_at: now,
                updated_at: now,
                published_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.published_at).toBeInstanceOf(Date);
        });

        it("should handle null published_at", async () => {
            const templateId = generateId();
            const mockRow = generateAgentTemplateRow({
                id: templateId,
                published_at: null,
                status: "draft"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.published_at).toBeNull();
        });

        it("should coerce temperature from string", async () => {
            const templateId = generateId();
            const mockRow = generateAgentTemplateRow({
                id: templateId,
                temperature: "0.7"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.temperature).toBe(0.7);
            expect(typeof result?.temperature).toBe("number");
        });

        it("should handle available_tools as object (already parsed by pg)", async () => {
            const templateId = generateId();
            const tools = [{ name: "search", type: "function" }];
            const mockRow = {
                ...generateAgentTemplateRow({ id: templateId }),
                available_tools: tools // Already an array, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.available_tools).toEqual(tools);
        });

        it("should handle empty arrays for tags and required_integrations", async () => {
            const templateId = generateId();
            const mockRow = generateAgentTemplateRow({
                id: templateId,
                tags: [],
                required_integrations: []
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.tags).toEqual([]);
            expect(result?.required_integrations).toEqual([]);
        });
    });
});
