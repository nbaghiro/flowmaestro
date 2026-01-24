/**
 * TemplateRepository Tests
 *
 * Tests for template CRUD operations including search, filtering,
 * categories, and view/use count tracking.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { TemplateRepository } from "../TemplateRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateTemplateRow,
    generateId
} from "./setup";

describe("TemplateRepository", () => {
    let repository: TemplateRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new TemplateRepository();
    });

    describe("create", () => {
        it("should insert a new template with all fields", async () => {
            const input = {
                name: "Email Automation",
                description: "Automate email sending",
                definition: { name: "Email Automation", nodes: {}, edges: [], entryPoint: "start" },
                category: "marketing" as const,
                tags: ["email", "marketing"],
                icon: "mail",
                color: "#3b82f6",
                author_name: "Test Author",
                featured: true,
                sort_order: 1
            };

            const mockRow = generateTemplateRow({
                name: input.name,
                description: input.description,
                category: input.category,
                tags: input.tags,
                featured: input.featured
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workflow_templates"),
                expect.arrayContaining([
                    input.name,
                    input.description,
                    JSON.stringify(input.definition),
                    input.category
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.featured).toBe(true);
        });

        it("should use default values when not specified", async () => {
            const input = {
                name: "Basic Template",
                definition: { name: "Basic Template", nodes: {}, edges: [], entryPoint: "start" },
                category: "engineering" as const
            };

            const mockRow = generateTemplateRow({
                name: input.name,
                category: input.category,
                tags: [],
                featured: false,
                sort_order: 0,
                version: "1.0.0",
                status: "active"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.tags).toEqual([]);
            expect(result.featured).toBe(false);
            expect(result.version).toBe("1.0.0");
        });

        it("should set published_at when status is active", async () => {
            const input = {
                name: "Active Template",
                definition: { name: "Active Template", nodes: {}, edges: [], entryPoint: "start" },
                category: "marketing" as const,
                status: "active" as const
            };

            const mockRow = generateTemplateRow({
                name: input.name,
                status: "active",
                published_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.published_at).toBeInstanceOf(Date);
        });
    });

    describe("findById", () => {
        it("should return template when found", async () => {
            const templateId = generateId();
            const mockRow = generateTemplateRow({ id: templateId });

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

        it("should parse JSON definition from string", async () => {
            const templateId = generateId();
            const definition = { nodes: { node1: {} }, edges: [{ id: "edge1" }] };
            const mockRow = generateTemplateRow({
                id: templateId,
                definition: JSON.stringify(definition)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.definition).toEqual(definition);
        });
    });

    describe("findAll", () => {
        it("should return paginated templates with total count", async () => {
            const mockTemplates = [generateTemplateRow(), generateTemplateRow()];

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
                .mockResolvedValueOnce(mockRows([generateTemplateRow()]));

            await repository.findAll();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $1"),
                expect.arrayContaining(["active"])
            );
        });

        it("should filter by category when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateTemplateRow()]));

            await repository.findAll({ category: "marketing" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("category = $2"),
                expect.arrayContaining(["active", "marketing"])
            );
        });

        it("should filter by tags when provided", async () => {
            const tags = ["email", "marketing"];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows([generateTemplateRow()]));

            await repository.findAll({ tags });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("tags && $2"),
                expect.arrayContaining(["active", tags])
            );
        });

        it("should filter by featured when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(4))
                .mockResolvedValueOnce(mockRows([generateTemplateRow()]));

            await repository.findAll({ featured: true });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("featured = $2"),
                expect.arrayContaining(["active", true])
            );
        });

        it("should filter by search term", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([generateTemplateRow()]));

            await repository.findAll({ search: "email automation" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("to_tsvector"),
                expect.arrayContaining(["active", "email automation"])
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
                generateTemplateRow({ category: "marketing" }),
                generateTemplateRow({ category: "marketing" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.findByCategory("marketing");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE category = $1 AND status = 'active'"),
                ["marketing"]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("getCategories", () => {
        it("should return category counts", async () => {
            const mockCategories = [
                { category: "automation", count: "15" },
                { category: "integration", count: "10" },
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
                generateTemplateRow({ name: "Email Automation" }),
                generateTemplateRow({ name: "Email Notifications" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.search("email");

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("ts_rank"), [
                "email",
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
                generateTemplateRow({ featured: true }),
                generateTemplateRow({ featured: true })
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
                expect.stringContaining("DELETE FROM flowmaestro.workflow_templates"),
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
            const mockRow = generateTemplateRow({
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
            const mockRow = generateTemplateRow({
                id: templateId,
                published_at: null,
                status: "draft"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.published_at).toBeNull();
        });

        it("should handle definition as object (already parsed by pg)", async () => {
            const templateId = generateId();
            const definition = { nodes: { node1: {} }, edges: [] };
            const mockRow = {
                ...generateTemplateRow({ id: templateId }),
                definition // Already an object, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.definition).toEqual(definition);
        });

        it("should handle empty arrays for tags and required_integrations", async () => {
            const templateId = generateId();
            const mockRow = generateTemplateRow({
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
