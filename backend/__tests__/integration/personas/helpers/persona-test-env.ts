/**
 * Persona Test Environment Helper
 *
 * Provides utilities for testing persona workflows with mocked repositories
 * and external services. Enables integration testing of persona orchestration.
 */

import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import type { PersonaDefinitionModel } from "../../../../src/storage/models/PersonaDefinition";
import type {
    PersonaInstanceModel,
    PersonaInstanceSummary
} from "../../../../src/storage/models/PersonaInstance";
import type { PersonaApprovalRequestModel } from "../../../../src/storage/models/PersonaApprovalRequest";
import type { PersonaInstanceMessageModel } from "../../../../src/storage/repositories/PersonaInstanceMessageRepository";
import type { PersonaInstanceDeliverableModel } from "../../../../src/storage/models/PersonaInstanceDeliverable";
import type { PersonaInstanceConnectionModel } from "../../../../src/storage/models/PersonaInstanceConnection";
import type { PersonaTaskTemplateModel } from "../../../../src/storage/models/PersonaTaskTemplate";
import {
    createTestServer,
    closeTestServer,
    createTestUser,
    createTestWorkspace,
    createAuthToken,
    authenticatedRequest,
    type TestUser,
    type TestWorkspace,
    type InjectOptions,
    type InjectResponse
} from "../../../helpers/fastify-test-client";

// ============================================================================
// TYPES
// ============================================================================

export interface PersonaTestEnvironment {
    fastify: FastifyInstance;
    repositories: PersonaRepositoryMocks;
    temporal: TemporalMocks;
    eventBus: EventBusMock;
    testUser: TestUser;
    testWorkspace: TestWorkspace;
    authToken: string;
    /** Helper to make authenticated requests */
    request: (options: InjectOptions) => Promise<InjectResponse>;
    cleanup: () => Promise<void>;
}

export interface PersonaRepositoryMocks {
    personaDefinition: MockPersonaDefinitionRepository;
    personaInstance: MockPersonaInstanceRepository;
    personaApproval: MockPersonaApprovalRequestRepository;
    personaMessage: MockPersonaInstanceMessageModelRepository;
    personaDeliverable: MockPersonaInstanceDeliverableModelRepository;
    personaConnection: MockPersonaInstanceConnectionModelRepository;
    personaTemplate: MockPersonaTaskTemplateModelRepository;
}

export interface TemporalMocks {
    client: MockTemporalClient;
    signalWorkflow: jest.Mock;
    cancelWorkflow: jest.Mock;
    startWorkflow: jest.Mock;
}

export interface EventBusMock {
    publish: jest.Mock;
    subscribe: jest.Mock;
    publishedEvents: PublishedEvent[];
}

export interface PublishedEvent {
    channel: string;
    event: string;
    data: Record<string, unknown>;
    timestamp: number;
}

// ============================================================================
// MOCK REPOSITORY TYPES
// ============================================================================

export interface MockPersonaDefinitionRepository {
    findById: jest.Mock<Promise<PersonaDefinitionModel | null>>;
    findBySlug: jest.Mock<Promise<PersonaDefinitionModel | null>>;
    findAll: jest.Mock<Promise<PersonaDefinitionModel[]>>;
    findByCategory: jest.Mock<Promise<PersonaDefinitionModel[]>>;
    findFeatured: jest.Mock<Promise<PersonaDefinitionModel[]>>;
    search: jest.Mock<Promise<PersonaDefinitionModel[]>>;
    getCategories: jest.Mock<Promise<Map<string, PersonaDefinitionModel[]>>>;
}

export interface MockPersonaInstanceRepository {
    create: jest.Mock<Promise<PersonaInstanceModel>>;
    findById: jest.Mock<Promise<PersonaInstanceModel | null>>;
    findByIdAndWorkspaceId: jest.Mock<Promise<PersonaInstanceModel | null>>;
    findByWorkspaceId: jest.Mock<Promise<PersonaInstanceModel[]>>;
    findSummariesByWorkspaceId: jest.Mock<Promise<PersonaInstanceSummary[]>>;
    findByStatus: jest.Mock<Promise<PersonaInstanceModel[]>>;
    update: jest.Mock<Promise<PersonaInstanceModel | null>>;
    softDelete: jest.Mock<Promise<boolean>>;
    getDashboard: jest.Mock;
    countNeedsAttention: jest.Mock<Promise<number>>;
}

export interface MockPersonaApprovalRequestRepository {
    create: jest.Mock<Promise<PersonaApprovalRequestModel>>;
    findById: jest.Mock<Promise<PersonaApprovalRequestModel | null>>;
    findPendingByInstanceId: jest.Mock<Promise<PersonaApprovalRequestModel[]>>;
    findByInstanceId: jest.Mock<Promise<PersonaApprovalRequestModel[]>>;
    findPendingByWorkspaceId: jest.Mock;
    countPendingByWorkspaceId: jest.Mock<Promise<number>>;
    update: jest.Mock<Promise<PersonaApprovalRequestModel | null>>;
    expirePendingBefore: jest.Mock<Promise<number>>;
    cancelPendingByInstanceId: jest.Mock<Promise<number>>;
}

export interface MockPersonaInstanceMessageModelRepository {
    create: jest.Mock<Promise<PersonaInstanceMessageModel>>;
    findByInstanceId: jest.Mock<Promise<PersonaInstanceMessageModel[]>>;
    findLatestByInstanceId: jest.Mock<Promise<PersonaInstanceMessageModel[]>>;
    countByInstanceId: jest.Mock<Promise<number>>;
    deleteByInstanceId: jest.Mock<Promise<number>>;
}

export interface MockPersonaInstanceDeliverableModelRepository {
    create: jest.Mock<Promise<PersonaInstanceDeliverableModel>>;
    findById: jest.Mock<Promise<PersonaInstanceDeliverableModel | null>>;
    findByInstanceId: jest.Mock<Promise<PersonaInstanceDeliverableModel[]>>;
    getSummariesByInstanceId: jest.Mock;
    getContent: jest.Mock;
    update: jest.Mock<Promise<PersonaInstanceDeliverableModel | null>>;
    delete: jest.Mock<Promise<boolean>>;
    deleteByInstanceId: jest.Mock<Promise<number>>;
    countByInstanceId: jest.Mock<Promise<number>>;
}

export interface MockPersonaInstanceConnectionModelRepository {
    create: jest.Mock<Promise<PersonaInstanceConnectionModel>>;
    createMany: jest.Mock<Promise<PersonaInstanceConnectionModel[]>>;
    findByInstanceId: jest.Mock<Promise<PersonaInstanceConnectionModel[]>>;
    findByInstanceIdWithDetails: jest.Mock;
    findByInstanceAndConnection: jest.Mock<Promise<PersonaInstanceConnectionModel | null>>;
    hasProviderAccess: jest.Mock<Promise<boolean>>;
    getConnectionForProvider: jest.Mock;
    updateScopes: jest.Mock<Promise<PersonaInstanceConnectionModel | null>>;
    delete: jest.Mock<Promise<boolean>>;
    deleteAllForInstance: jest.Mock<Promise<number>>;
}

export interface MockPersonaTaskTemplateModelRepository {
    create: jest.Mock<Promise<PersonaTaskTemplateModel>>;
    findById: jest.Mock<Promise<PersonaTaskTemplateModel | null>>;
    findByPersonaSlug: jest.Mock<Promise<PersonaTaskTemplateModel[]>>;
    findByPersonaDefinitionId: jest.Mock<Promise<PersonaTaskTemplateModel[]>>;
    incrementUsageCount: jest.Mock<Promise<void>>;
    update: jest.Mock<Promise<PersonaTaskTemplateModel | null>>;
    delete: jest.Mock<Promise<boolean>>;
}

export interface MockTemporalClient {
    workflow: {
        start: jest.Mock;
        getHandle: jest.Mock;
        execute: jest.Mock;
    };
}

// ============================================================================
// MOCK FACTORY FUNCTIONS
// ============================================================================

export function createMockPersonaDefinitionRepository(): MockPersonaDefinitionRepository {
    return {
        findById: jest.fn().mockResolvedValue(null),
        findBySlug: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
        findByCategory: jest.fn().mockResolvedValue([]),
        findFeatured: jest.fn().mockResolvedValue([]),
        search: jest.fn().mockResolvedValue([]),
        getCategories: jest.fn().mockResolvedValue(new Map())
    };
}

export function createMockPersonaInstanceRepository(): MockPersonaInstanceRepository {
    return {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        findByIdAndWorkspaceId: jest.fn().mockResolvedValue(null),
        findByWorkspaceId: jest.fn().mockResolvedValue([]),
        findSummariesByWorkspaceId: jest.fn().mockResolvedValue([]),
        findByStatus: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        softDelete: jest.fn().mockResolvedValue(true),
        getDashboard: jest.fn().mockResolvedValue({
            needs_attention: [],
            running: [],
            recent_completed: []
        }),
        countNeedsAttention: jest.fn().mockResolvedValue(0)
    };
}

export function createMockPersonaApprovalRequestRepository(): MockPersonaApprovalRequestRepository {
    return {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        findPendingByInstanceId: jest.fn().mockResolvedValue([]),
        findByInstanceId: jest.fn().mockResolvedValue([]),
        findPendingByWorkspaceId: jest.fn().mockResolvedValue({ approvals: [], total: 0 }),
        countPendingByWorkspaceId: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        expirePendingBefore: jest.fn().mockResolvedValue(0),
        cancelPendingByInstanceId: jest.fn().mockResolvedValue(0)
    };
}

export function createMockPersonaInstanceMessageModelRepository(): MockPersonaInstanceMessageModelRepository {
    return {
        create: jest.fn(),
        findByInstanceId: jest.fn().mockResolvedValue([]),
        findLatestByInstanceId: jest.fn().mockResolvedValue([]),
        countByInstanceId: jest.fn().mockResolvedValue(0),
        deleteByInstanceId: jest.fn().mockResolvedValue(0)
    };
}

export function createMockPersonaInstanceDeliverableModelRepository(): MockPersonaInstanceDeliverableModelRepository {
    return {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        findByInstanceId: jest.fn().mockResolvedValue([]),
        getSummariesByInstanceId: jest.fn().mockResolvedValue([]),
        getContent: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(true),
        deleteByInstanceId: jest.fn().mockResolvedValue(0),
        countByInstanceId: jest.fn().mockResolvedValue(0)
    };
}

export function createMockPersonaInstanceConnectionModelRepository(): MockPersonaInstanceConnectionModelRepository {
    return {
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue([]),
        findByInstanceId: jest.fn().mockResolvedValue([]),
        findByInstanceIdWithDetails: jest.fn().mockResolvedValue([]),
        findByInstanceAndConnection: jest.fn().mockResolvedValue(null),
        hasProviderAccess: jest.fn().mockResolvedValue(false),
        getConnectionForProvider: jest.fn().mockResolvedValue(null),
        updateScopes: jest.fn(),
        delete: jest.fn().mockResolvedValue(true),
        deleteAllForInstance: jest.fn().mockResolvedValue(0)
    };
}

export function createMockPersonaTaskTemplateModelRepository(): MockPersonaTaskTemplateModelRepository {
    return {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        findByPersonaSlug: jest.fn().mockResolvedValue([]),
        findByPersonaDefinitionId: jest.fn().mockResolvedValue([]),
        incrementUsageCount: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(true)
    };
}

export function createMockTemporalClient(): MockTemporalClient {
    const mockHandle = {
        signal: jest.fn().mockResolvedValue(undefined),
        cancel: jest.fn().mockResolvedValue(undefined),
        result: jest.fn().mockResolvedValue({ success: true }),
        workflowId: "test-workflow-id"
    };

    return {
        workflow: {
            start: jest.fn().mockResolvedValue(mockHandle),
            getHandle: jest.fn().mockReturnValue(mockHandle),
            execute: jest.fn().mockResolvedValue({ success: true })
        }
    };
}

export function createMockEventBus(): EventBusMock {
    const publishedEvents: PublishedEvent[] = [];

    return {
        publish: jest.fn().mockImplementation((channel, event, data) => {
            publishedEvents.push({
                channel,
                event,
                data,
                timestamp: Date.now()
            });
            return Promise.resolve();
        }),
        subscribe: jest.fn().mockResolvedValue(undefined),
        publishedEvents
    };
}

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

export interface CreatePersonaTestEnvOptions {
    /** Custom test user */
    testUser?: Partial<TestUser>;
    /** Custom test workspace */
    testWorkspace?: Partial<TestWorkspace>;
    /** Skip server creation (for unit tests) */
    skipServer?: boolean;
}

/**
 * Create a persona test environment with mocked dependencies
 */
export async function createPersonaTestEnvironment(
    options: CreatePersonaTestEnvOptions = {}
): Promise<PersonaTestEnvironment> {
    // Create test user and workspace
    const testUser = createTestUser(options.testUser);
    const testWorkspace = createTestWorkspace({
        ownerId: testUser.id,
        ...options.testWorkspace
    });

    // Create mocked repositories
    const repositories: PersonaRepositoryMocks = {
        personaDefinition: createMockPersonaDefinitionRepository(),
        personaInstance: createMockPersonaInstanceRepository(),
        personaApproval: createMockPersonaApprovalRequestRepository(),
        personaMessage: createMockPersonaInstanceMessageModelRepository(),
        personaDeliverable: createMockPersonaInstanceDeliverableModelRepository(),
        personaConnection: createMockPersonaInstanceConnectionModelRepository(),
        personaTemplate: createMockPersonaTaskTemplateModelRepository()
    };

    // Create mocked Temporal client
    const temporalClient = createMockTemporalClient();
    const temporal: TemporalMocks = {
        client: temporalClient,
        signalWorkflow: temporalClient.workflow.getHandle().signal,
        cancelWorkflow: temporalClient.workflow.getHandle().cancel,
        startWorkflow: temporalClient.workflow.start
    };

    // Create mocked event bus
    const eventBus = createMockEventBus();

    // Create test server (if not skipped)
    const fastify = options.skipServer ? (null as unknown as FastifyInstance) : await createTestServer();
    const authToken = fastify ? createAuthToken(fastify, testUser) : "";

    // Create request helper
    const request = async (injectOptions: InjectOptions): Promise<InjectResponse> => {
        if (!fastify) {
            throw new Error("Server not created - use skipServer: false");
        }
        return authenticatedRequest(fastify, testUser, {
            ...injectOptions,
            workspaceId: testWorkspace.id
        });
    };

    // Cleanup function
    const cleanup = async (): Promise<void> => {
        if (fastify) {
            await closeTestServer(fastify);
        }
        // Clear all mocks
        jest.clearAllMocks();
    };

    return {
        fastify,
        repositories,
        temporal,
        eventBus,
        testUser,
        testWorkspace,
        authToken,
        request,
        cleanup
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for test entities
 */
export function generateTestId(prefix: string = "test"): string {
    return `${prefix}-${uuidv4()}`;
}

/**
 * Wait for async operations to complete
 */
export async function flushPromises(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a delay in tests
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that an event was published
 */
export function expectEventPublished(
    eventBus: EventBusMock,
    eventName: string,
    matcher?: (data: Record<string, unknown>) => boolean
): void {
    const matchingEvents = eventBus.publishedEvents.filter((e) => e.event === eventName);
    expect(matchingEvents.length).toBeGreaterThan(0);

    if (matcher) {
        const matched = matchingEvents.some((e) => matcher(e.data));
        expect(matched).toBe(true);
    }
}

/**
 * Get all events of a specific type
 */
export function getPublishedEvents(
    eventBus: EventBusMock,
    eventName: string
): PublishedEvent[] {
    return eventBus.publishedEvents.filter((e) => e.event === eventName);
}

/**
 * Clear published events
 */
export function clearPublishedEvents(eventBus: EventBusMock): void {
    eventBus.publishedEvents.length = 0;
}

// ============================================================================
// MOCK SETUP HELPERS
// ============================================================================

/**
 * Setup mock for Temporal client
 * Call this before creating the test environment if you need custom Temporal behavior
 */
export function setupTemporalMock(mockClient: MockTemporalClient): void {
    jest.mock("../../../../src/temporal/client", () => ({
        getTemporalClient: jest.fn().mockReturnValue(mockClient)
    }));
}

/**
 * Setup mock for Redis event bus
 */
export function setupEventBusMock(mockEventBus: EventBusMock): void {
    jest.mock("../../../../src/services/events/RedisEventBus", () => ({
        redisEventBus: mockEventBus
    }));
}

/**
 * Install repository mocks - call before importing route handlers
 */
export function installPersonaRepositoryMocks(repositories: PersonaRepositoryMocks): void {
    jest.mock("../../../../src/storage/repositories/PersonaDefinitionRepository", () => ({
        PersonaDefinitionRepository: jest.fn().mockImplementation(() => repositories.personaDefinition)
    }));

    jest.mock("../../../../src/storage/repositories/PersonaInstanceRepository", () => ({
        PersonaInstanceRepository: jest.fn().mockImplementation(() => repositories.personaInstance)
    }));

    jest.mock("../../../../src/storage/repositories/PersonaApprovalRequestRepository", () => ({
        PersonaApprovalRequestRepository: jest
            .fn()
            .mockImplementation(() => repositories.personaApproval)
    }));

    jest.mock("../../../../src/storage/repositories/PersonaInstanceMessageModelRepository", () => ({
        PersonaInstanceMessageModelRepository: jest
            .fn()
            .mockImplementation(() => repositories.personaMessage)
    }));

    jest.mock("../../../../src/storage/repositories/PersonaInstanceDeliverableModelRepository", () => ({
        PersonaInstanceDeliverableModelRepository: jest
            .fn()
            .mockImplementation(() => repositories.personaDeliverable)
    }));

    jest.mock("../../../../src/storage/repositories/PersonaInstanceConnectionModelRepository", () => ({
        PersonaInstanceConnectionModelRepository: jest
            .fn()
            .mockImplementation(() => repositories.personaConnection)
    }));

    jest.mock("../../../../src/storage/repositories/PersonaTaskTemplateModelRepository", () => ({
        PersonaTaskTemplateModelRepository: jest
            .fn()
            .mockImplementation(() => repositories.personaTemplate)
    }));
}
