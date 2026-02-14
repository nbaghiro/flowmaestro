/**
 * Persona Routes Tests
 *
 * Tests for persona definition endpoints including:
 * - List personas
 * - Get persona by slug
 * - Get personas by category
 * - List templates for persona
 * - Generate task from template
 * - Get available connections for persona
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock persona definition repository
const mockPersonaDefinitionRepo = {
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    findGroupedByCategory: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaDefinitionRepository", () => ({
    PersonaDefinitionRepository: jest.fn().mockImplementation(() => mockPersonaDefinitionRepo)
}));

// Mock persona task template repository
const mockPersonaTaskTemplateRepo = {
    findByPersonaSlug: jest.fn(),
    findById: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaTaskTemplateRepository", () => ({
    PersonaTaskTemplateRepository: jest.fn().mockImplementation(() => mockPersonaTaskTemplateRepo)
}));

// Mock connection repository
const mockConnectionRepo = {
    findByWorkspaceId: jest.fn()
};

jest.mock("../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockPersonaDefinition(
    overrides: Partial<{
        id: string;
        name: string;
        slug: string;
        title: string;
        description: string;
        category: string;
        avatar_url: string | null;
        tags: string[];
        specialty: string;
        expertise_areas: string[];
        example_tasks: string[];
        typical_deliverables: string[];
        input_fields: object[];
        deliverables: object[];
        sop_steps: string[];
        estimated_duration: object;
        estimated_cost_credits: number;
        system_prompt: string;
        model: string;
        provider: string;
        temperature: number;
        max_tokens: number;
        default_tools: object[];
        default_max_duration_hours: number;
        default_max_cost_credits: number;
        autonomy_level: string;
        featured: boolean;
        sort_order: number;
        status: string;
        connection_requirements: object[];
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "Research Assistant",
        slug: overrides.slug || "research-assistant",
        title: overrides.title || "Research Assistant",
        description: overrides.description || "A helpful research assistant",
        category: overrides.category || "research",
        avatar_url: overrides.avatar_url ?? null,
        tags: overrides.tags || ["research", "analysis"],
        specialty: overrides.specialty || "General research",
        expertise_areas: overrides.expertise_areas || ["Market research"],
        example_tasks: overrides.example_tasks || ["Research competitors"],
        typical_deliverables: overrides.typical_deliverables || ["Report"],
        input_fields: overrides.input_fields || [],
        deliverables: overrides.deliverables || [],
        sop_steps: overrides.sop_steps || [],
        estimated_duration: overrides.estimated_duration || { min_minutes: 15, max_minutes: 30 },
        estimated_cost_credits: overrides.estimated_cost_credits ?? 25,
        system_prompt: overrides.system_prompt || "You are a helpful assistant.",
        model: overrides.model || "claude-sonnet-4-20250514",
        provider: overrides.provider || "anthropic",
        temperature: overrides.temperature ?? 0.7,
        max_tokens: overrides.max_tokens ?? 4096,
        default_tools: overrides.default_tools || [],
        default_max_duration_hours: overrides.default_max_duration_hours ?? 4.0,
        default_max_cost_credits: overrides.default_max_cost_credits ?? 100,
        autonomy_level: overrides.autonomy_level || "approve_high_risk",
        featured: overrides.featured ?? false,
        sort_order: overrides.sort_order ?? 0,
        status: overrides.status || "active",
        connection_requirements: overrides.connection_requirements || [],
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockPersonaTemplate(
    overrides: Partial<{
        id: string;
        persona_definition_id: string;
        name: string;
        description: string;
        icon: string | null;
        task_template: string;
        variables: object[];
        suggested_duration_hours: number;
        suggested_max_cost: number;
        sort_order: number;
        usage_count: number;
        status: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        persona_definition_id: overrides.persona_definition_id || uuidv4(),
        name: overrides.name || "Quick Research",
        description: overrides.description || "A quick research task",
        icon: overrides.icon ?? null,
        task_template: overrides.task_template || "Research {{topic}} and provide a summary.",
        variables: overrides.variables || [
            { name: "topic", label: "Topic", type: "text", required: true }
        ],
        suggested_duration_hours: overrides.suggested_duration_hours ?? 2.0,
        suggested_max_cost: overrides.suggested_max_cost ?? 50,
        sort_order: overrides.sort_order ?? 0,
        usage_count: overrides.usage_count ?? 0,
        status: overrides.status || "active",
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockConnection(
    overrides: Partial<{
        id: string;
        name: string;
        provider: string;
        connection_method: string;
        status: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "My Slack Connection",
        provider: overrides.provider || "slack",
        connection_method: overrides.connection_method || "oauth2",
        status: overrides.status || "active"
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset persona definition repository behaviors
    mockPersonaDefinitionRepo.findAll.mockResolvedValue({
        personas: [],
        total: 0,
        limit: 50,
        offset: 0
    });
    mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);
    mockPersonaDefinitionRepo.findGroupedByCategory.mockResolvedValue({});

    // Reset persona task template repository behaviors
    mockPersonaTaskTemplateRepo.findByPersonaSlug.mockResolvedValue([]);
    mockPersonaTaskTemplateRepo.findById.mockResolvedValue(null);

    // Reset connection repository behaviors
    mockConnectionRepo.findByWorkspaceId.mockResolvedValue({ connections: [], total: 0 });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Persona Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // LIST PERSONAS
    // ========================================================================

    describe("GET /personas", () => {
        it("should list all personas", async () => {
            const personas = [
                createMockPersonaDefinition({
                    name: "Research Assistant",
                    slug: "research-assistant"
                }),
                createMockPersonaDefinition({ name: "Content Writer", slug: "content-writer" })
            ];
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas,
                total: 2,
                limit: 50,
                offset: 0
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ personas: object[]; total: number }>(response);
            expect(body.data.personas).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should filter personas by category", async () => {
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas: [createMockPersonaDefinition({ category: "research" })],
                total: 1,
                limit: 50,
                offset: 0
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas",
                query: { category: "research" }
            });

            expectStatus(response, 200);
            expect(mockPersonaDefinitionRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ category: "research" })
            );
        });

        it("should filter personas by featured status", async () => {
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas: [createMockPersonaDefinition({ featured: true })],
                total: 1,
                limit: 50,
                offset: 0
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas",
                query: { featured: "true" }
            });

            expectStatus(response, 200);
            expect(mockPersonaDefinitionRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ featured: true })
            );
        });

        it("should search personas by name or description", async () => {
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas: [createMockPersonaDefinition({ name: "AI Research Assistant" })],
                total: 1,
                limit: 50,
                offset: 0
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas",
                query: { search: "research" }
            });

            expectStatus(response, 200);
            expect(mockPersonaDefinitionRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ search: "research" })
            );
        });

        it("should apply pagination", async () => {
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas: [],
                total: 100,
                limit: 10,
                offset: 20
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas",
                query: { limit: "10", offset: "20" }
            });

            expectStatus(response, 200);
            expect(mockPersonaDefinitionRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 10, offset: 20 })
            );
        });

        it("should return empty list when no personas exist", async () => {
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas: [],
                total: 0,
                limit: 50,
                offset: 0
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ personas: object[] }>(response);
            expect(body.data.personas).toHaveLength(0);
        });

        it("should work with optional authentication", async () => {
            const testUser = createTestUser();
            mockPersonaDefinitionRepo.findAll.mockResolvedValue({
                personas: [createMockPersonaDefinition()],
                total: 1,
                limit: 50,
                offset: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/personas"
            });

            expectStatus(response, 200);
        });
    });

    // ========================================================================
    // GET PERSONAS BY CATEGORY
    // ========================================================================

    describe("GET /personas/categories", () => {
        it("should return personas grouped by category", async () => {
            const grouped = {
                research: [createMockPersonaDefinition({ category: "research" })],
                writing: [createMockPersonaDefinition({ category: "writing" })]
            };
            mockPersonaDefinitionRepo.findGroupedByCategory.mockResolvedValue(grouped);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/categories"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<Record<string, object[]>>(response);
            expect(body.data).toHaveProperty("research");
            expect(body.data).toHaveProperty("writing");
        });

        it("should return empty object when no personas exist", async () => {
            mockPersonaDefinitionRepo.findGroupedByCategory.mockResolvedValue({});

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/categories"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<Record<string, object[]>>(response);
            expect(Object.keys(body.data)).toHaveLength(0);
        });
    });

    // ========================================================================
    // GET PERSONA BY SLUG
    // ========================================================================

    describe("GET /personas/:slug", () => {
        it("should return persona by slug", async () => {
            const persona = createMockPersonaDefinition({
                slug: "research-assistant",
                name: "Research Assistant"
            });
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/research-assistant"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string; slug: string }>(response);
            expect(body.data.slug).toBe("research-assistant");
            expect(body.data.name).toBe("Research Assistant");
        });

        it("should return 404 when persona not found", async () => {
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/non-existent-slug"
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // LIST TEMPLATES FOR PERSONA
    // ========================================================================

    describe("GET /personas/:slug/templates", () => {
        it("should return templates for a persona", async () => {
            const personaId = uuidv4();
            const persona = createMockPersonaDefinition({
                id: personaId,
                slug: "research-assistant"
            });
            const templates = [
                createMockPersonaTemplate({
                    persona_definition_id: personaId,
                    name: "Quick Research"
                }),
                createMockPersonaTemplate({ persona_definition_id: personaId, name: "Deep Dive" })
            ];

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findByPersonaSlug.mockResolvedValue(templates);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/research-assistant/templates"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ templates: object[] }>(response);
            expect(body.data.templates).toHaveLength(2);
        });

        it("should return 404 when persona not found", async () => {
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/non-existent/templates"
            });

            expectStatus(response, 404);
        });

        it("should return empty array when persona has no templates", async () => {
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findByPersonaSlug.mockResolvedValue([]);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/research-assistant/templates"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ templates: object[] }>(response);
            expect(body.data.templates).toHaveLength(0);
        });
    });

    // ========================================================================
    // GENERATE TASK FROM TEMPLATE
    // ========================================================================

    describe("POST /personas/:slug/templates/:templateId/generate", () => {
        it("should generate task description from template", async () => {
            const personaId = uuidv4();
            const templateId = uuidv4();
            const persona = createMockPersonaDefinition({
                id: personaId,
                slug: "research-assistant"
            });
            const template = createMockPersonaTemplate({
                id: templateId,
                persona_definition_id: personaId,
                task_template: "Research {{topic}} and analyze {{focus_area}}.",
                variables: [
                    { name: "topic", label: "Topic", type: "text", required: true },
                    { name: "focus_area", label: "Focus Area", type: "text", required: false }
                ],
                suggested_duration_hours: 3,
                suggested_max_cost: 75
            });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/research-assistant/templates/${templateId}/generate`,
                payload: {
                    variables: {
                        topic: "AI market trends",
                        focus_area: "enterprise adoption"
                    }
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                task_description: string;
                suggested_duration_hours: number;
                suggested_max_cost: number;
            }>(response);
            expect(body.data.task_description).toContain("AI market trends");
            expect(body.data.task_description).toContain("enterprise adoption");
            expect(body.data.suggested_duration_hours).toBe(3);
            expect(body.data.suggested_max_cost).toBe(75);
        });

        it("should return 404 when persona not found", async () => {
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/non-existent/templates/${uuidv4()}/generate`,
                payload: { variables: {} }
            });

            expectStatus(response, 404);
        });

        it("should return 404 when template not found", async () => {
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findById.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/research-assistant/templates/${uuidv4()}/generate`,
                payload: { variables: {} }
            });

            expectStatus(response, 404);
        });

        it("should return 404 when template belongs to different persona", async () => {
            const personaId = uuidv4();
            const differentPersonaId = uuidv4();
            const templateId = uuidv4();

            const persona = createMockPersonaDefinition({
                id: personaId,
                slug: "research-assistant"
            });
            const template = createMockPersonaTemplate({
                id: templateId,
                persona_definition_id: differentPersonaId // Different persona
            });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/research-assistant/templates/${templateId}/generate`,
                payload: { variables: {} }
            });

            expectStatus(response, 404);
        });

        it("should return 400 when required variables are missing", async () => {
            const personaId = uuidv4();
            const templateId = uuidv4();
            const persona = createMockPersonaDefinition({
                id: personaId,
                slug: "research-assistant"
            });
            const template = createMockPersonaTemplate({
                id: templateId,
                persona_definition_id: personaId,
                variables: [
                    { name: "topic", label: "Topic", type: "text", required: true },
                    { name: "urgency", label: "Urgency", type: "select", required: true }
                ]
            });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/research-assistant/templates/${templateId}/generate`,
                payload: {
                    variables: {
                        topic: "AI" // Missing required 'urgency'
                    }
                }
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("urgency");
        });

        it("should handle conditional blocks in templates", async () => {
            const personaId = uuidv4();
            const templateId = uuidv4();
            const persona = createMockPersonaDefinition({
                id: personaId,
                slug: "research-assistant"
            });
            const template = createMockPersonaTemplate({
                id: templateId,
                persona_definition_id: personaId,
                task_template:
                    "Research {{topic}}.{{#if include_competitors}} Include competitor analysis.{{/if}}",
                variables: [
                    { name: "topic", label: "Topic", type: "text", required: true },
                    {
                        name: "include_competitors",
                        label: "Include Competitors",
                        type: "checkbox",
                        required: false
                    }
                ]
            });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockPersonaTaskTemplateRepo.findById.mockResolvedValue(template);

            // With conditional true
            const responseWith = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/research-assistant/templates/${templateId}/generate`,
                payload: {
                    variables: { topic: "AI", include_competitors: true }
                }
            });

            expectStatus(responseWith, 200);
            const bodyWith = expectSuccessResponse<{ task_description: string }>(responseWith);
            expect(bodyWith.data.task_description).toContain("competitor analysis");

            // With conditional false
            const responseWithout = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/personas/research-assistant/templates/${templateId}/generate`,
                payload: {
                    variables: { topic: "AI", include_competitors: false }
                }
            });

            expectStatus(responseWithout, 200);
            const bodyWithout = expectSuccessResponse<{ task_description: string }>(
                responseWithout
            );
            expect(bodyWithout.data.task_description).not.toContain("competitor analysis");
        });

        it("should return 400 for invalid templateId format", async () => {
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/personas/research-assistant/templates/not-a-uuid/generate",
                payload: { variables: {} }
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // GET AVAILABLE CONNECTIONS FOR PERSONA
    // ========================================================================

    describe("GET /personas/:slug/available-connections", () => {
        it("should return available connections for persona (requires auth)", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({
                slug: "slack-assistant",
                connection_requirements: [
                    { provider: "slack", required: true, suggested_scopes: ["chat:write"] }
                ]
            });
            const connections = [createMockConnection({ provider: "slack", name: "My Slack" })];

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockConnectionRepo.findByWorkspaceId.mockResolvedValue({
                connections,
                total: 1
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/personas/slack-assistant/available-connections"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                persona_slug: string;
                requirements: object[];
                available_connections: object[];
                missing_required: object[];
            }>(response);
            expect(body.data.persona_slug).toBe("slack-assistant");
            expect(body.data.available_connections).toHaveLength(1);
            expect(body.data.missing_required).toHaveLength(0);
        });

        it("should identify missing required connections", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({
                slug: "multi-tool-assistant",
                connection_requirements: [
                    { provider: "slack", required: true, suggested_scopes: ["chat:write"] },
                    { provider: "github", required: true, suggested_scopes: ["repo"] }
                ]
            });
            const connections = [
                createMockConnection({ provider: "slack", name: "My Slack" })
                // No GitHub connection
            ];

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockConnectionRepo.findByWorkspaceId.mockResolvedValue({
                connections,
                total: 1
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/personas/multi-tool-assistant/available-connections"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                missing_required: { provider: string }[];
            }>(response);
            expect(body.data.missing_required).toHaveLength(1);
            expect(body.data.missing_required[0].provider).toBe("github");
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/personas/slack-assistant/available-connections"
            });

            expectErrorResponse(response, 401);
        });

        it("should return 404 when persona not found", async () => {
            const testUser = createTestUser();
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/personas/non-existent/available-connections"
            });

            expectErrorResponse(response, 404);
        });

        it("should include non-required connections from workspace", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({
                slug: "flexible-assistant",
                connection_requirements: [
                    { provider: "slack", required: false, suggested_scopes: [] }
                ]
            });
            const connections = [
                createMockConnection({ provider: "slack", name: "Work Slack" }),
                createMockConnection({ provider: "github", name: "My GitHub" }) // Not in requirements
            ];

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockConnectionRepo.findByWorkspaceId.mockResolvedValue({
                connections,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/personas/flexible-assistant/available-connections"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                available_connections: { provider: string }[];
            }>(response);
            // Should include both connections
            expect(body.data.available_connections).toHaveLength(2);
        });
    });
});
