/**
 * Shared test utilities for folder route tests
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    TestUser,
    mockDbQuery,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock FolderRepository
export const mockFolderRepo = {
    findByWorkspaceIdWithCounts: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    getItemCounts: jest.fn(),
    getFolderTreeByWorkspace: jest.fn(),
    getContentsInWorkspace: jest.fn(),
    getChildrenInWorkspace: jest.fn(),
    create: jest.fn(),
    updateInWorkspace: jest.fn(),
    deleteInWorkspace: jest.fn(),
    moveFolderInWorkspace: jest.fn(),
    isNameAvailableInWorkspace: jest.fn()
};

// ============================================================================
// TYPES
// ============================================================================

export interface MockFolder {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    color: string;
    position: number;
    parent_id: string | null;
    depth: number;
    path: string;
    created_at: Date;
    updated_at: Date;
}

export interface MockItemCounts {
    workflows: number;
    agents: number;
    formInterfaces: number;
    chatInterfaces: number;
    knowledgeBases: number;
    total: number;
}

export interface MockFolderWithCounts {
    id: string;
    userId: string;
    name: string;
    color: string;
    position: number;
    parentId: string | null;
    depth: number;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    itemCounts: MockItemCounts;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createMockFolder(overrides: Partial<MockFolder> = {}): MockFolder {
    const name = overrides.name || "Test Folder";
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name,
        color: overrides.color || "#6366f1",
        position: overrides.position ?? 0,
        parent_id: overrides.parent_id ?? null,
        depth: overrides.depth ?? 0,
        path: overrides.path || `/${name}`,
        created_at: overrides.created_at || new Date(),
        updated_at: overrides.updated_at || new Date()
    };
}

export function createMockItemCounts(overrides: Partial<MockItemCounts> = {}): MockItemCounts {
    const counts = {
        workflows: overrides.workflows ?? 0,
        agents: overrides.agents ?? 0,
        formInterfaces: overrides.formInterfaces ?? 0,
        chatInterfaces: overrides.chatInterfaces ?? 0,
        knowledgeBases: overrides.knowledgeBases ?? 0,
        total: 0
    };
    counts.total =
        counts.workflows +
        counts.agents +
        counts.formInterfaces +
        counts.chatInterfaces +
        counts.knowledgeBases;
    return counts;
}

export function createMockFolderWithCounts(
    overrides: Partial<MockFolderWithCounts> = {}
): MockFolderWithCounts {
    const name = overrides.name || "Test Folder";
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || uuidv4(),
        name,
        color: overrides.color || "#6366f1",
        position: overrides.position ?? 0,
        parentId: overrides.parentId ?? null,
        depth: overrides.depth ?? 0,
        path: overrides.path || `/${name}`,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
        itemCounts: overrides.itemCounts || createMockItemCounts()
    };
}

export function resetAllMocks(): void {
    jest.clearAllMocks();
    mockDbQuery.mockReset();
}

export async function createFolderTestServer(): Promise<FastifyInstance> {
    return createTestServer();
}

// Re-export commonly used utilities
export {
    createTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    mockDbQuery,
    DEFAULT_TEST_WORKSPACE_ID
};
export type { TestUser };
