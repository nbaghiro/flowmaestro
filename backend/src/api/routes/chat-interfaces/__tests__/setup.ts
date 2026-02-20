/**
 * Shared test setup for Chat Interface route tests
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// Note: Test files import closeTestServer directly from fastify-test-client

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

export const mockChatInterfaceRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByAgentIdAndWorkspaceId: jest.fn(),
    isSlugAvailableInWorkspace: jest.fn(),
    create: jest.fn(),
    updateByWorkspaceId: jest.fn(),
    softDeleteByWorkspaceId: jest.fn(),
    publishByWorkspaceId: jest.fn(),
    unpublishByWorkspaceId: jest.fn(),
    duplicateByWorkspaceId: jest.fn()
};

export const mockSessionRepo = {
    findByInterfaceId: jest.fn(),
    findById: jest.fn(),
    getSessionStats: jest.fn()
};

export const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

export const mockGCSService = {
    upload: jest.fn(),
    uploadBuffer: jest.fn(),
    getPublicUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn()
};

// ============================================================================
// MOCK SETUP FUNCTIONS
// ============================================================================

export function setupRepositoryMocks(): void {
    jest.mock("../../../../storage/repositories/ChatInterfaceRepository", () => ({
        ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo)
    }));

    jest.mock("../../../../storage/repositories/ChatInterfaceSessionRepository", () => ({
        ChatInterfaceSessionRepository: jest.fn().mockImplementation(() => mockSessionRepo)
    }));

    jest.mock("../../../../storage/repositories/AgentRepository", () => ({
        AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
    }));

    jest.mock("../../../../storage/repositories", () => ({
        ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo),
        ChatInterfaceSessionRepository: jest.fn().mockImplementation(() => mockSessionRepo),
        AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo),
        UserRepository: jest.fn().mockImplementation(() => ({
            findById: jest.fn(),
            findByEmail: jest.fn()
        }))
    }));

    jest.mock("../../../../services/GCSStorageService", () => ({
        getUploadsStorageService: jest.fn().mockImplementation(() => mockGCSService),
        getArtifactsStorageService: jest.fn().mockImplementation(() => mockGCSService)
    }));
}

// ============================================================================
// MOCK DATA TYPES
// ============================================================================

export interface MockChatInterface {
    id: string;
    userId: string;
    workspaceId: string;
    name: string;
    slug: string;
    title: string;
    description: string | null;
    agentId: string;
    status: "draft" | "published";
    coverType: "gradient" | "image" | "color";
    coverValue: string;
    iconUrl: string | null;
    primaryColor: string;
    fontFamily: string;
    borderRadius: number;
    welcomeMessage: string;
    placeholderText: string;
    suggestedPrompts: Array<{ text: string; icon?: string }>;
    allowFileUpload: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    persistenceType: "session" | "browser" | "none";
    sessionTimeoutMinutes: number;
    widgetPosition: "bottom-right" | "bottom-left";
    widgetButtonIcon: string;
    widgetButtonText: string | null;
    widgetInitialState: "collapsed" | "expanded";
    rateLimitMessages: number;
    rateLimitWindowSeconds: number;
    sessionCount: number;
    messageCount: number;
    lastActivityAt: Date | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    folderId: string | null;
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

export function createMockChatInterface(
    overrides: Partial<MockChatInterface> = {}
): MockChatInterface {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || uuidv4(),
        workspaceId: overrides.workspaceId || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Chat Interface",
        slug: overrides.slug || `test-chat-${Date.now()}`,
        title: overrides.title || "Test Chat",
        description: overrides.description ?? "A test chat interface",
        agentId: overrides.agentId || uuidv4(),
        status: overrides.status || "draft",
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#3b82f6",
        iconUrl: overrides.iconUrl ?? null,
        primaryColor: overrides.primaryColor || "#3b82f6",
        fontFamily: overrides.fontFamily || "Inter",
        borderRadius: overrides.borderRadius ?? 8,
        welcomeMessage: overrides.welcomeMessage || "Hello! How can I help you?",
        placeholderText: overrides.placeholderText || "Type your message...",
        suggestedPrompts: overrides.suggestedPrompts || [],
        allowFileUpload: overrides.allowFileUpload ?? true,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || ["application/pdf"],
        persistenceType: overrides.persistenceType || "session",
        sessionTimeoutMinutes: overrides.sessionTimeoutMinutes ?? 30,
        widgetPosition: overrides.widgetPosition || "bottom-right",
        widgetButtonIcon: overrides.widgetButtonIcon || "chat",
        widgetButtonText: overrides.widgetButtonText ?? null,
        widgetInitialState: overrides.widgetInitialState || "collapsed",
        rateLimitMessages: overrides.rateLimitMessages ?? 10,
        rateLimitWindowSeconds: overrides.rateLimitWindowSeconds ?? 60,
        sessionCount: overrides.sessionCount ?? 0,
        messageCount: overrides.messageCount ?? 0,
        lastActivityAt: overrides.lastActivityAt ?? null,
        publishedAt: overrides.publishedAt ?? null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
        deletedAt: overrides.deletedAt ?? null,
        folderId: overrides.folderId ?? null
    };
}

export function createMockSession(
    overrides: Partial<{
        id: string;
        interfaceId: string;
        sessionToken: string;
        threadId: string | null;
        status: string;
        messageCount: number;
        createdAt: Date;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        interfaceId: overrides.interfaceId || uuidv4(),
        sessionToken: overrides.sessionToken || `tok_${uuidv4()}`,
        threadId: overrides.threadId ?? null,
        status: overrides.status || "active",
        messageCount: overrides.messageCount ?? 0,
        firstSeenAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: overrides.createdAt || new Date()
    };
}

export function createMockAgent(
    overrides: Partial<{
        id: string;
        name: string;
        workspaceId: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "Test Agent",
        workspaceId: overrides.workspaceId || DEFAULT_TEST_WORKSPACE_ID,
        description: "A test agent",
        model: "gpt-4",
        provider: "openai"
    };
}

// ============================================================================
// RESET MOCKS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset default behaviors
    mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({ chatInterfaces: [], total: 0 });
    mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockChatInterfaceRepo.findByAgentIdAndWorkspaceId.mockResolvedValue([]);
    mockChatInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(true);
    mockChatInterfaceRepo.create.mockImplementation((userId, workspaceId, data) =>
        Promise.resolve(createMockChatInterface({ userId, workspaceId, ...data, id: uuidv4() }))
    );
    mockChatInterfaceRepo.updateByWorkspaceId.mockImplementation((id, _workspaceId, data) =>
        Promise.resolve(createMockChatInterface({ id, ...data }))
    );
    mockChatInterfaceRepo.softDeleteByWorkspaceId.mockResolvedValue(true);
    mockChatInterfaceRepo.publishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(
            createMockChatInterface({ id, status: "published", publishedAt: new Date() })
        )
    );
    mockChatInterfaceRepo.unpublishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(createMockChatInterface({ id, status: "draft", publishedAt: null }))
    );
    mockChatInterfaceRepo.duplicateByWorkspaceId.mockImplementation(() =>
        Promise.resolve(createMockChatInterface({ status: "draft" }))
    );

    mockSessionRepo.findByInterfaceId.mockResolvedValue({ sessions: [], total: 0 });
    mockSessionRepo.findById.mockResolvedValue(null);
    mockSessionRepo.getSessionStats.mockResolvedValue({
        totalSessions: 0,
        activeSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0
    });

    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    mockGCSService.upload.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.uploadBuffer.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.getPublicUrl.mockReturnValue(
        "https://storage.googleapis.com/test-bucket/test-file"
    );
    mockGCSService.getSignedDownloadUrl.mockResolvedValue(
        "https://storage.googleapis.com/signed/test-file?token=abc"
    );
}

// ============================================================================
// TEST SERVER SETUP
// ============================================================================

export async function createChatInterfaceTestServer(): Promise<FastifyInstance> {
    const fastify = await createTestServer();
    const { chatInterfaceRoutes } = await import("../index");
    await fastify.register(chatInterfaceRoutes, { prefix: "/chat-interfaces" });
    return fastify;
}
