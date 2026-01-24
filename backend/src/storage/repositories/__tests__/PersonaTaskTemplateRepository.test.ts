/**
 * PersonaTaskTemplateRepository Tests
 *
 * Tests for persona task template operations including CRUD,
 * filtering by persona, usage count incrementing, and upsert.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaTaskTemplateRepository } from "../PersonaTaskTemplateRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generatePersonaTaskTemplateRow,
    generateId
} from "./setup";

describe("PersonaTaskTemplateRepository", () => {
    let repository: PersonaTaskTemplateRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaTaskTemplateRepository();
    });

    describe("create", () => {
        it("should insert a new task template with all fields", async () => {
            const input = {
                persona_definition_id: generateId(),
                name: "Quick Research",
                description: "Perform quick research on a topic",
                icon: "search",
                task_template: "Research {{topic}} and provide a summary.",
                variables: [
                    {
                        id: "topic",
                        name: "topic",
                        label: "Topic",
                        type: "text" as const,
                        required: true
                    }
                ],
                suggested_duration_hours: 2.0,
                suggested_max_cost: 50,
                sort_order: 1,
                status: "active" as const
            };

            const mockRow = generatePersonaTaskTemplateRow({
                persona_definition_id: input.persona_definition_id,
                name: input.name,
                description: input.description,
                icon: input.icon,
                task_template: input.task_template,
                variables: JSON.stringify(input.variables),
                suggested_duration_hours: input.suggested_duration_hours,
                suggested_max_cost: input.suggested_max_cost
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_task_templates"),
                expect.arrayContaining([
                    input.persona_definition_id,
                    input.name,
                    input.description,
                    input.icon,
                    input.task_template,
                    JSON.stringify(input.variables)
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.status).toBe("active");
        });

        it("should use default values when optional fields not provided", async () => {
            const input = {
                persona_definition_id: generateId(),
                name: "Basic Template",
                description: "A basic template",
                task_template: "Do something",
                variables: []
            };

            const mockRow = generatePersonaTaskTemplateRow({
                persona_definition_id: input.persona_definition_id,
                name: input.name,
                suggested_duration_hours: 2.0,
                suggested_max_cost: 50,
                sort_order: 0,
                status: "active"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.suggested_duration_hours).toBe(2.0);
            expect(result.suggested_max_cost).toBe(50);
            expect(result.sort_order).toBe(0);
        });
    });

    describe("findById", () => {
        it("should return template when found", async () => {
            const templateId = generateId();
            const mockRow = generatePersonaTaskTemplateRow({ id: templateId });

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
    });

    describe("findByPersonaId", () => {
        it("should return active templates for persona ordered by sort_order", async () => {
            const personaId = generateId();
            const mockTemplates = [
                generatePersonaTaskTemplateRow({
                    persona_definition_id: personaId,
                    name: "Template 1",
                    sort_order: 0
                }),
                generatePersonaTaskTemplateRow({
                    persona_definition_id: personaId,
                    name: "Template 2",
                    sort_order: 1
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.findByPersonaId(personaId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE persona_definition_id = $1"),
                [personaId, "active"]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND status = $2"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY sort_order ASC"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
        });

        it("should filter by custom status", async () => {
            const personaId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByPersonaId(personaId, "beta");

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [personaId, "beta"]);
        });
    });

    describe("findByPersonaSlug", () => {
        it("should return templates for persona by slug", async () => {
            const personaSlug = "research-assistant";
            const mockTemplates = [generatePersonaTaskTemplateRow({ name: "Template 1" })];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.findByPersonaSlug(personaSlug);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("JOIN flowmaestro.persona_definitions p"),
                [personaSlug, "active"]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE p.slug = $1"),
                expect.anything()
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("findAll", () => {
        it("should return all active templates with default options", async () => {
            const mockTemplates = [
                generatePersonaTaskTemplateRow(),
                generatePersonaTaskTemplateRow()
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTemplates));

            const result = await repository.findAll();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("t.status = 'active'"),
                []
            );
            expect(result).toHaveLength(2);
        });

        it("should filter by persona_definition_id", async () => {
            const personaId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findAll({ persona_definition_id: personaId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("t.persona_definition_id = $1"),
                [personaId]
            );
        });

        it("should filter by persona_slug", async () => {
            const slug = "research-assistant";

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findAll({ persona_slug: slug });

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("p.slug = $1"), [slug]);
        });

        it("should filter by custom status", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findAll({ status: "beta" });

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("t.status = $1"), [
                "beta"
            ]);
        });

        it("should respect pagination options", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findAll({ limit: 10, offset: 20 });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT 10 OFFSET 20"),
                expect.anything()
            );
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const templateId = generateId();
            const mockRow = generatePersonaTaskTemplateRow({
                id: templateId,
                name: "Updated Name"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(templateId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.persona_task_templates"),
                expect.arrayContaining(["Updated Name", templateId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should return existing template when no updates provided", async () => {
            const templateId = generateId();
            const mockRow = generatePersonaTaskTemplateRow({ id: templateId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(templateId, {});

            // Should call findById instead of update
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                templateId
            ]);
            expect(result?.id).toBe(templateId);
        });

        it("should stringify variables when updating", async () => {
            const templateId = generateId();
            const variables = [
                {
                    id: "new_var",
                    name: "new_var",
                    label: "New Variable",
                    type: "text" as const,
                    required: true
                }
            ];
            const mockRow = generatePersonaTaskTemplateRow({ id: templateId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(templateId, { variables });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(variables)])
            );
        });

        it("should return null when template not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.update("non-existent", { name: "New Name" });

            expect(result).toBeNull();
        });
    });

    describe("incrementUsageCount", () => {
        it("should increment usage count", async () => {
            const templateId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.incrementUsageCount(templateId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET usage_count = usage_count + 1"),
                [templateId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1"),
                expect.anything()
            );
        });
    });

    describe("delete", () => {
        it("should delete template and return true", async () => {
            const templateId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(templateId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_task_templates"),
                [templateId]
            );
            expect(result).toBe(true);
        });

        it("should return false when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("upsertByPersonaAndName", () => {
        it("should insert or update template by persona and name", async () => {
            const input = {
                persona_definition_id: generateId(),
                name: "Test Template",
                description: "Test description",
                task_template: "Do {{task}}",
                variables: [
                    {
                        id: "task",
                        name: "task",
                        label: "Task",
                        type: "text" as const,
                        required: true
                    }
                ]
            };

            const mockRow = generatePersonaTaskTemplateRow({
                persona_definition_id: input.persona_definition_id,
                name: input.name
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.upsertByPersonaAndName(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ON CONFLICT (persona_definition_id, name) DO UPDATE"),
                expect.anything()
            );
            expect(result.name).toBe(input.name);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const templateId = generateId();
            const now = new Date().toISOString();
            const mockRow = generatePersonaTaskTemplateRow({
                id: templateId,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
        });

        it("should parse variables from JSON string", async () => {
            const templateId = generateId();
            const variables = [{ id: "topic", label: "Topic", type: "text" }];
            const mockRow = generatePersonaTaskTemplateRow({
                id: templateId,
                variables: JSON.stringify(variables)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.variables).toEqual(variables);
        });

        it("should handle variables already parsed as array", async () => {
            const templateId = generateId();
            const variables = [{ id: "topic", label: "Topic", type: "text" }];
            const mockRow = {
                ...generatePersonaTaskTemplateRow({ id: templateId }),
                variables // Already an array
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.variables).toEqual(variables);
        });

        it("should coerce numeric fields from string", async () => {
            const templateId = generateId();
            const mockRow = generatePersonaTaskTemplateRow({
                id: templateId,
                suggested_duration_hours: "3.5",
                suggested_max_cost: "75",
                sort_order: "2",
                usage_count: "10"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(templateId);

            expect(result?.suggested_duration_hours).toBe(3.5);
            expect(typeof result?.suggested_duration_hours).toBe("number");
            expect(result?.suggested_max_cost).toBe(75);
            expect(result?.sort_order).toBe(2);
            expect(result?.usage_count).toBe(10);
        });
    });
});
