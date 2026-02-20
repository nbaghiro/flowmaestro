/**
 * Shared test utilities for workflow route tests.
 * Provides mock repositories, services, helper functions, and type definitions.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    authenticatedRequest as baseAuthenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser as baseCreateTestUser,
    createSimpleWorkflowDefinition as baseCreateSimpleWorkflowDefinition,
    expectErrorResponse as baseExpectErrorResponse,
    expectStatus as baseExpectStatus,
    expectSuccessResponse as baseExpectSuccessResponse,
    unauthenticatedRequest as baseUnauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    name: string;
}

export interface MockWorkflowOverrides {
    id?: string;
    user_id?: string;
    workspace_id?: string;
    name?: string;
    description?: string;
    definition?: object;
    ai_generated?: boolean;
    ai_prompt?: string | null;
    folder_id?: string | null;
}

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

export const mockWorkflowRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findById: jest.fn(),
    findBySystemKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

export const mockUserRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn()
};

// ============================================================================
// MOCK SERVICES
// ============================================================================

export const mockTemporalWorkflowHandle = {
    result: jest.fn().mockResolvedValue({ status: "completed", output: { result: "success" } })
};

export const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalWorkflowHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalWorkflowHandle)
    }
};

export const mockGCSService = {
    upload: jest.fn().mockResolvedValue("gs://test-bucket/workflow-files/test.pdf"),
    getMetadata: jest.fn().mockResolvedValue({ size: 1024 }),
    getPublicUrl: jest.fn().mockReturnValue("https://storage.googleapis.com/test-bucket/test.pdf")
};

export const mockGeneratedWorkflow = {
    nodes: [],
    edges: [],
    metadata: {
        name: "Generated Workflow",
        entryNodeId: "input",
        description: "AI-generated workflow"
    }
};

export const mockGenerationChatService = {
    processMessage: jest.fn().mockResolvedValue({
        content: "Generated response",
        workflowPlan: null
    }),
    createWorkflowFromPlan: jest.fn().mockResolvedValue({
        id: "new-workflow-id",
        name: "Created Workflow"
    })
};

export const mockChatService = {
    processChat: jest.fn().mockResolvedValue({
        response: "Chat response",
        changes: []
    })
};

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

export { DEFAULT_TEST_WORKSPACE_ID };

export function createMockWorkflow(overrides: MockWorkflowOverrides = {}) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Workflow",
        description: overrides.description || "A test workflow",
        definition: overrides.definition || baseCreateSimpleWorkflowDefinition(),
        ai_generated: overrides.ai_generated ?? false,
        ai_prompt: overrides.ai_prompt ?? null,
        folder_id: overrides.folder_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

// ============================================================================
// RESET HELPERS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset default behaviors
    mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({ workflows: [], total: 0 });
    mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockWorkflowRepo.findById.mockResolvedValue(null);
    mockWorkflowRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockWorkflow({ ...data, id: uuidv4() }))
    );
    mockWorkflowRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockWorkflow({ id, ...data }))
    );
    mockWorkflowRepo.delete.mockResolvedValue(true);

    // Reset GCS mock
    mockGCSService.upload.mockResolvedValue("gs://test-bucket/workflow-files/test.pdf");
    mockGCSService.getMetadata.mockResolvedValue({ size: 1024 });

    // Reset AI service mocks
    mockGenerationChatService.processMessage.mockResolvedValue({
        content: "Generated response",
        workflowPlan: null
    });
    mockGenerationChatService.createWorkflowFromPlan.mockResolvedValue({
        id: "new-workflow-id",
        name: "Created Workflow"
    });
    mockChatService.processChat.mockResolvedValue({
        response: "Chat response",
        changes: []
    });

    // Reset user repo mock (for admin middleware)
    mockUserRepo.findById.mockResolvedValue(null);
    mockWorkflowRepo.findBySystemKey.mockResolvedValue(null);
}

// ============================================================================
// SERVER HELPERS
// ============================================================================

export async function createWorkflowTestServer(): Promise<FastifyInstance> {
    return createTestServer();
}

export async function closeWorkflowTestServer(fastify: FastifyInstance): Promise<void> {
    return closeTestServer(fastify);
}

// ============================================================================
// ADMIN REQUEST HELPER
// ============================================================================

export async function authenticatedAdminRequest(
    fastify: FastifyInstance,
    user: ReturnType<typeof baseCreateTestUser>,
    options: Parameters<typeof baseAuthenticatedRequest>[2]
) {
    // Set up admin user in mock repo
    mockUserRepo.findById.mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: true,
        created_at: new Date(),
        updated_at: new Date()
    });

    return baseAuthenticatedRequest(fastify, user, options);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export const createTestUser = baseCreateTestUser;
export const authenticatedRequest = baseAuthenticatedRequest;
export const unauthenticatedRequest = baseUnauthenticatedRequest;
export const createSimpleWorkflowDefinition = baseCreateSimpleWorkflowDefinition;
export const expectStatus = baseExpectStatus;
export const expectSuccessResponse = baseExpectSuccessResponse;
export const expectErrorResponse = baseExpectErrorResponse;
export { uuidv4 };
