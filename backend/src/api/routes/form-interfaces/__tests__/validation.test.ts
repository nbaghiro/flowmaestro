/**
 * Form Interface Validation Route Tests
 *
 * Tests for slug validation, reserved slugs, and multi-tenant isolation.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP (must be before imports)
// ============================================================================

const mockFormInterfaceRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkflowIdAndWorkspaceId: jest.fn(),
    findByAgentIdAndWorkspaceId: jest.fn(),
    isSlugAvailableInWorkspace: jest.fn(),
    create: jest.fn(),
    updateByWorkspaceId: jest.fn(),
    softDeleteByWorkspaceId: jest.fn(),
    publishByWorkspaceId: jest.fn(),
    unpublishByWorkspaceId: jest.fn(),
    duplicateByWorkspaceId: jest.fn(),
    setTriggerId: jest.fn()
};

const mockTriggerRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/FormInterfaceRepository", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo),
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

import {
    authenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectStatus,
    expectErrorResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import { createMockFormInterface } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
    mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({ formInterfaces: [], total: 0 });
    mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockFormInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(true);
    mockFormInterfaceRepo.create.mockImplementation((userId, workspaceId, data) =>
        Promise.resolve(createMockFormInterface({ userId, workspaceId, ...data, id: uuidv4() }))
    );
    mockFormInterfaceRepo.updateByWorkspaceId.mockImplementation((id, _workspaceId, data) =>
        Promise.resolve(createMockFormInterface({ id, ...data }))
    );
    mockFormInterfaceRepo.softDeleteByWorkspaceId.mockResolvedValue(true);
}

describe("Form Interface Validation", () => {
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
    // RESERVED SLUGS
    // ========================================================================

    describe("Reserved slugs", () => {
        const reservedSlugs = [
            "api",
            "admin",
            "login",
            "logout",
            "signup",
            "register",
            "settings",
            "dashboard",
            "workflows",
            "agents",
            "form-interfaces",
            "connections",
            "knowledge-bases",
            "templates"
        ];

        it.each(reservedSlugs)("should reject reserved slug on create: %s", async (slug) => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug,
                    title: "Test Title",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectErrorResponse(response, 400);
        });
    });

    // ========================================================================
    // SLUG VALIDATION
    // ========================================================================

    describe("Slug validation", () => {
        const invalidSlugs = [
            { slug: "a", reason: "too short (1 char)" },
            { slug: "-test", reason: "starts with hyphen" },
            { slug: "test-", reason: "ends with hyphen" },
            { slug: "TEST", reason: "uppercase letters" },
            { slug: "test_slug", reason: "underscore character" },
            { slug: "test slug", reason: "space character" },
            { slug: "test.slug", reason: "period character" }
        ];

        it.each(invalidSlugs)(
            "should reject invalid slug on create: $slug ($reason)",
            async ({ slug }) => {
                const testUser = createTestUser();

                const response = await authenticatedRequest(fastify, testUser, {
                    method: "POST",
                    url: "/form-interfaces",
                    payload: {
                        name: "Test",
                        slug,
                        title: "Test Title",
                        targetType: "workflow",
                        workflowId: uuidv4()
                    }
                });

                expectErrorResponse(response, 400);
            }
        );

        const validSlugs = ["ab", "test-form", "my-form-interface", "form123", "123form", "a1b2c3"];

        it.each(validSlugs)("should accept valid slug on create: %s", async (slug) => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug,
                    title: "Test Title",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectStatus(response, 201);
        });
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION
    // ========================================================================

    describe("Multi-tenant Isolation", () => {
        it("form interfaces are filtered by workspace ID", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces"
            });

            expect(mockFormInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("form interfaces created are assigned to authenticated user and workspace", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.create.mockImplementation((userId, workspaceId, data) =>
                Promise.resolve(createMockFormInterface({ userId, workspaceId, ...data }))
            );

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test Form",
                    slug: "test-form",
                    title: "Test",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expect(mockFormInterfaceRepo.create).toHaveBeenCalledWith(
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("updates are scoped to workspace", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);
            mockFormInterfaceRepo.updateByWorkspaceId.mockResolvedValue(existingForm);

            await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { name: "Updated" }
            });

            expect(mockFormInterfaceRepo.updateByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("deletes are scoped to workspace", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);

            await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${formId}`
            });

            expect(mockFormInterfaceRepo.softDeleteByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });
    });
});
