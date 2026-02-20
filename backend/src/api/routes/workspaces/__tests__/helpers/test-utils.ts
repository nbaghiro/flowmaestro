/**
 * Shared test utilities for workspace route tests.
 * Provides mock repositories, services, helper functions, and type definitions.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    createTestUser as baseCreateTestUser,
    authenticatedRequest as baseAuthenticatedRequest,
    unauthenticatedRequest as baseUnauthenticatedRequest,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo
} from "../../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    name?: string;
}

export interface MockWorkspace {
    id: string;
    name: string;
    type: string;
    owner_id: string;
    description: string;
    max_workflows: number;
    max_agents: number;
    max_knowledge_bases: number;
    max_kb_chunks: number;
    max_members: number;
    max_connections: number;
    execution_history_days: number;
    created_at: Date;
    updated_at: Date;
}

// ============================================================================
// MOCK SERVICES
// ============================================================================

export const mockWorkspaceService = {
    createWorkspace: jest.fn(),
    getWorkspacesForUser: jest.fn(),
    getWorkspaceWithStats: jest.fn(),
    updateWorkspace: jest.fn(),
    deleteWorkspace: jest.fn()
};

export const mockCreditService = {
    getBalance: jest.fn(),
    getTransactions: jest.fn(),
    estimateWorkflowCredits: jest.fn()
};

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

export const mockInvitationRepo = {
    findByWorkspaceId: jest.fn(),
    findPendingByWorkspaceId: jest.fn(),
    findPendingByWorkspaceAndEmail: jest.fn(),
    findById: jest.fn(),
    findByToken: jest.fn(),
    findByTokenWithDetails: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    markAsAccepted: jest.fn(),
    markAsDeclined: jest.fn()
};

export const mockCreditRepo = {
    getBalance: jest.fn(),
    addBonusCredits: jest.fn(),
    createTransaction: jest.fn()
};

export const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn()
};

// Re-export the shared mocks
export const mockWorkspaceRepoInstance = mockWorkspaceRepo;
export const mockMemberRepoInstance = mockWorkspaceMemberRepo;

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

export const DEFAULT_TEST_WORKSPACE_ID = "test-workspace-id";

export function createMockWorkspace(overrides?: Partial<MockWorkspace>): MockWorkspace {
    return {
        id: DEFAULT_TEST_WORKSPACE_ID,
        name: "Test Workspace",
        type: "personal",
        owner_id: "user-1",
        description: "A test workspace",
        max_workflows: 100,
        max_agents: 50,
        max_knowledge_bases: 20,
        max_kb_chunks: 10000,
        max_members: 10,
        max_connections: 50,
        execution_history_days: 30,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
        ...overrides
    };
}

// ============================================================================
// RESET HELPERS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();
}

// ============================================================================
// SERVER HELPERS
// ============================================================================

export async function createWorkspaceTestServer(): Promise<FastifyInstance> {
    return createTestServer();
}

export async function closeWorkspaceTestServer(fastify: FastifyInstance): Promise<void> {
    return closeTestServer(fastify);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export const createTestUser = baseCreateTestUser;
export const authenticatedRequest = baseAuthenticatedRequest;
export const unauthenticatedRequest = baseUnauthenticatedRequest;
