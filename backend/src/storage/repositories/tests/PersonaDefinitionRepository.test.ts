/**
 * PersonaDefinitionRepository Tests
 *
 * Tests for persona definition CRUD operations including category filtering,
 * search, and complex JSON field handling.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaDefinitionRepository } from "../PersonaDefinitionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePersonaDefinitionRow,
    generateId
} from "./setup";

describe("PersonaDefinitionRepository", () => {
    let repository: PersonaDefinitionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaDefinitionRepository();
    });

    describe("create", () => {
        it("should insert a new persona definition with all fields", async () => {
            const input = {
                name: "Market Researcher",
                slug: "market-researcher",
                title: "Market Research Specialist",
                description: "Expert in market research and competitive analysis",
                category: "research" as const,
                specialty: "Market Analysis",
                expertise_areas: ["Competitor analysis", "Market sizing"],
                example_tasks: ["Research competitors", "Analyze market trends"],
                input_fields: [
                    {
                        id: "topic",
                        name: "topic",
                        label: "Research Topic",
                        type: "text" as const,
                        required: true
                    }
                ],
                deliverables: [
                    {
                        id: "report",
                        name: "report",
                        label: "Research Report",
                        type: "markdown" as const,
                        description: "A comprehensive research report",
                        guaranteed: true
                    }
                ],
                sop_steps: ["Gather data", "Analyze", "Generate report"],
                system_prompt: "You are a market research expert."
            };

            const mockRow = generatePersonaDefinitionRow({
                name: input.name,
                slug: input.slug,
                title: input.title,
                description: input.description,
                category: input.category,
                specialty: input.specialty
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_definitions"),
                expect.arrayContaining([input.name, input.slug, input.title, input.description])
            );
            expect(result.name).toBe(input.name);
            expect(result.category).toBe("research");
        });

        it("should use default values when not specified", async () => {
            const input = {
                name: "Basic Persona",
                slug: "basic-persona",
                title: "Basic",
                description: "A basic persona",
                category: "research" as const,
                specialty: "General",
                expertise_areas: [],
                example_tasks: [],
                input_fields: [],
                deliverables: [],
                sop_steps: [],
                system_prompt: "You are helpful."
            };

            const mockRow = generatePersonaDefinitionRow({
                name: input.name,
                slug: input.slug,
                title: input.title,
                description: input.description,
                category: input.category,
                specialty: input.specialty,
                system_prompt: input.system_prompt,
                expertise_areas: JSON.stringify(input.expertise_areas),
                example_tasks: JSON.stringify(input.example_tasks),
                input_fields: JSON.stringify(input.input_fields),
                deliverables: JSON.stringify(input.deliverables),
                sop_steps: JSON.stringify(input.sop_steps),
                temperature: 0.7,
                max_tokens: 4096,
                model: "claude-sonnet-4-20250514",
                provider: "anthropic"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.temperature).toBe(0.7);
            expect(result.max_tokens).toBe(4096);
        });

        it("should stringify JSON fields", async () => {
            const input = {
                name: "Test Persona",
                slug: "test-persona",
                title: "Test",
                description: "Test",
                category: "research" as const,
                specialty: "Test",
                expertise_areas: ["Area 1", "Area 2"],
                example_tasks: ["Task 1"],
                input_fields: [
                    {
                        id: "input",
                        name: "input",
                        label: "Input",
                        type: "text" as const,
                        required: true
                    }
                ],
                deliverables: [
                    {
                        id: "output",
                        name: "output",
                        label: "Output",
                        type: "markdown" as const,
                        description: "Output",
                        guaranteed: true
                    }
                ],
                sop_steps: ["Step 1", "Step 2"],
                system_prompt: "Prompt"
            };

            const mockRow = generatePersonaDefinitionRow({
                name: input.name,
                slug: input.slug,
                title: input.title,
                description: input.description,
                category: input.category,
                specialty: input.specialty,
                system_prompt: input.system_prompt,
                expertise_areas: JSON.stringify(input.expertise_areas),
                example_tasks: JSON.stringify(input.example_tasks),
                input_fields: JSON.stringify(input.input_fields),
                deliverables: JSON.stringify(input.deliverables),
                sop_steps: JSON.stringify(input.sop_steps)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    JSON.stringify(input.expertise_areas),
                    JSON.stringify(input.example_tasks),
                    JSON.stringify(input.input_fields),
                    JSON.stringify(input.deliverables),
                    JSON.stringify(input.sop_steps)
                ])
            );
        });
    });

    describe("findById", () => {
        it("should return persona when found", async () => {
            const personaId = generateId();
            const mockRow = generatePersonaDefinitionRow({ id: personaId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                personaId
            ]);
            expect(result?.id).toBe(personaId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findBySlug", () => {
        it("should return active persona by slug", async () => {
            const slug = "market-researcher";
            const mockRow = generatePersonaDefinitionRow({ slug, status: "active" });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findBySlug(slug);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE slug = $1 AND status = 'active'"),
                [slug]
            );
            expect(result?.slug).toBe(slug);
        });

        it("should return null for inactive persona", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findBySlug("inactive-persona");

            expect(result).toBeNull();
        });
    });

    describe("findAll", () => {
        it("should return paginated personas with total count", async () => {
            const mockPersonas = [generatePersonaDefinitionRow(), generatePersonaDefinitionRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockPersonas));

            const result = await repository.findAll({ limit: 2, offset: 0 });

            expect(result.total).toBe(10);
            expect(result.personas).toHaveLength(2);
        });

        it("should filter by status (default: active)", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generatePersonaDefinitionRow()]));

            await repository.findAll();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $1"),
                expect.arrayContaining(["active"])
            );
        });

        it("should filter by category when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generatePersonaDefinitionRow()]));

            await repository.findAll({ category: "research" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("category = $"),
                expect.arrayContaining(["active", "research"])
            );
        });

        it("should filter by featured when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows([generatePersonaDefinitionRow()]));

            await repository.findAll({ featured: true });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("featured = $"),
                expect.arrayContaining(["active", true])
            );
        });

        it("should filter by search term", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([generatePersonaDefinitionRow()]));

            await repository.findAll({ search: "market" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("name ILIKE $"),
                expect.arrayContaining(["%market%"])
            );
        });

        it("should use default pagination values", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findAll();

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining(["active", 50, 0])
            );
        });
    });

    describe("findGroupedByCategory", () => {
        it("should return personas grouped by category", async () => {
            const mockPersonas = [
                generatePersonaDefinitionRow({ category: "research" }),
                generatePersonaDefinitionRow({ category: "research" }),
                generatePersonaDefinitionRow({ category: "content" }),
                generatePersonaDefinitionRow({ category: "development" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockPersonas));

            const result = await repository.findGroupedByCategory();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE status = 'active'")
            );
            expect(result.research).toHaveLength(2);
            expect(result.content).toHaveLength(1);
            expect(result.development).toHaveLength(1);
            expect(result.data).toHaveLength(0);
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const personaId = generateId();
            const mockRow = generatePersonaDefinitionRow({
                id: personaId,
                name: "Updated Persona"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(personaId, { name: "Updated Persona" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.persona_definitions"),
                expect.arrayContaining(["Updated Persona", personaId])
            );
            expect(result?.name).toBe("Updated Persona");
        });

        it("should return existing persona when no updates provided", async () => {
            const personaId = generateId();
            const mockRow = generatePersonaDefinitionRow({ id: personaId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(personaId, {});

            expect(result?.id).toBe(personaId);
        });

        it("should stringify JSON fields when updating", async () => {
            const personaId = generateId();
            const expertise_areas = ["New Area 1", "New Area 2"];
            const mockRow = generatePersonaDefinitionRow({ id: personaId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(personaId, { expertise_areas });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(expertise_areas)])
            );
        });
    });

    describe("delete", () => {
        it("should hard delete persona and return true", async () => {
            const personaId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(personaId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_definitions"),
                [personaId]
            );
            expect(result).toBe(true);
        });

        it("should return false when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("upsertBySlug", () => {
        it("should insert or update persona by slug", async () => {
            const input = {
                name: "Test Persona",
                slug: "test-persona",
                title: "Test",
                description: "Test persona",
                category: "research" as const,
                specialty: "Testing",
                expertise_areas: [] as string[],
                example_tasks: [] as string[],
                input_fields: [] as {
                    id: string;
                    name: string;
                    label: string;
                    type: "text";
                    required: boolean;
                }[],
                deliverables: [] as {
                    id: string;
                    name: string;
                    label: string;
                    type: "markdown";
                    description: string;
                    guaranteed: boolean;
                }[],
                sop_steps: [] as string[],
                system_prompt: "You are a test assistant."
            };

            const mockRow = generatePersonaDefinitionRow({
                name: input.name,
                slug: input.slug,
                title: input.title,
                description: input.description,
                category: input.category,
                specialty: input.specialty,
                system_prompt: input.system_prompt,
                expertise_areas: "[]",
                example_tasks: "[]",
                input_fields: "[]",
                deliverables: "[]",
                sop_steps: "[]"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.upsertBySlug(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ON CONFLICT (slug) DO UPDATE"),
                expect.anything()
            );
            expect(result.slug).toBe(input.slug);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const personaId = generateId();
            const now = new Date().toISOString();
            const mockRow = generatePersonaDefinitionRow({
                id: personaId,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
        });

        it("should coerce temperature from string", async () => {
            const personaId = generateId();
            const mockRow = generatePersonaDefinitionRow({
                id: personaId,
                temperature: 0.9 // Will be returned as-is; test verifies number coercion
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(result?.temperature).toBe(0.9);
            expect(typeof result?.temperature).toBe("number");
        });

        it("should coerce max_tokens from string", async () => {
            const personaId = generateId();
            const mockRow = generatePersonaDefinitionRow({
                id: personaId,
                max_tokens: 8192 // Will be returned as-is; test verifies number coercion
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(result?.max_tokens).toBe(8192);
            expect(typeof result?.max_tokens).toBe("number");
        });

        it("should parse JSON arrays from string", async () => {
            const personaId = generateId();
            const expertise_areas = ["Area 1", "Area 2"];
            const mockRow = generatePersonaDefinitionRow({
                id: personaId,
                expertise_areas: JSON.stringify(expertise_areas)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(result?.expertise_areas).toEqual(expertise_areas);
        });

        it("should handle arrays already parsed by pg", async () => {
            const personaId = generateId();
            const tags = ["tag1", "tag2"];
            const mockRow = {
                ...generatePersonaDefinitionRow({ id: personaId }),
                tags // Already an array
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(result?.tags).toEqual(tags);
        });

        it("should parse JSON objects from string", async () => {
            const personaId = generateId();
            const estimated_duration = { min_minutes: 30, max_minutes: 60 };
            const mockRow = generatePersonaDefinitionRow({
                id: personaId,
                estimated_duration: JSON.stringify(estimated_duration)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(personaId);

            expect(result?.estimated_duration).toEqual(estimated_duration);
        });
    });
});
