/**
 * Form Interface Test Environment
 *
 * Provides a configured test environment for form interface integration tests.
 * Sets up mocked dependencies for route testing.
 */

import Fastify, { FastifyInstance } from "fastify";
import type {
    FormInterface,
    FormInterfaceSubmission,
    FormSubmissionExecutionStatus,
    FormSubmissionAttachmentsStatus
} from "@flowmaestro/shared";
import { MockRedisClient, createMockRedis } from "../../../helpers/redis-mock";
import {
    createMockEmbeddingService,
    type MockEmbeddingService,
    type EmbeddingMockOptions
} from "../../knowledge-base/helpers/embedding-mock";

// ============================================================================
// TYPES
// ============================================================================

export interface FormInterfaceTestEnvironment {
    /** Fastify instance */
    fastify: FastifyInstance;
    /** Mock Redis client */
    redis: MockRedisClient;
    /** Mock repositories */
    repositories: MockRepositories;
    /** Mock services */
    services: MockServices;
    /** Cleanup function */
    cleanup: () => Promise<void>;
    /** Inject a request and get response */
    inject: FastifyInstance["inject"];
}

export interface FormInterfaceTestOptions {
    /** Embedding dimensions (default: 1536) */
    embeddingDimensions?: number;
    /** Embedding mock options */
    embeddingOptions?: EmbeddingMockOptions;
    /** Files to pre-seed in GCS mock */
    seedFiles?: Record<string, string>;
    /** Whether to register routes (default: true) */
    registerRoutes?: boolean;
}

export interface MockRepositories {
    formInterface: MockFormInterfaceRepository;
    submission: MockFormInterfaceSubmissionRepository;
    submissionChunk: MockFormInterfaceSubmissionChunkRepository;
    workflow: MockWorkflowRepository;
    agent: MockAgentRepository;
    trigger: MockTriggerRepository;
    execution: MockExecutionRepository;
    agentExecution: MockAgentExecutionRepository;
    thread: MockThreadRepository;
}

export interface MockServices {
    gcs: MockGCSService;
    embedding: MockEmbeddingService;
    temporal: MockTemporalClient;
    eventBus: MockRedisEventBus;
}

// ============================================================================
// MOCK REPOSITORY INTERFACES
// ============================================================================

export interface MockFormInterfaceRepository {
    create: jest.Mock<Promise<FormInterface>, [string, string, unknown]>;
    findById: jest.Mock<Promise<FormInterface | null>, [string]>;
    findBySlug: jest.Mock<Promise<FormInterface | null>, [string]>;
    findByIdAndWorkspaceId: jest.Mock<Promise<FormInterface | null>, [string, string]>;
    findByWorkspaceId: jest.Mock<
        Promise<{ formInterfaces: FormInterface[]; total: number }>,
        [string, unknown]
    >;
    isSlugAvailableInWorkspace: jest.Mock<Promise<boolean>, [string, string, string?]>;
    updateByWorkspaceId: jest.Mock<Promise<FormInterface | null>, [string, string, unknown]>;
    publishByWorkspaceId: jest.Mock<Promise<FormInterface | null>, [string, string]>;
    unpublishByWorkspaceId: jest.Mock<Promise<FormInterface | null>, [string, string]>;
    duplicateByWorkspaceId: jest.Mock<Promise<FormInterface | null>, [string, string]>;
    softDeleteByWorkspaceId: jest.Mock<Promise<boolean>, [string, string]>;
    setTriggerId: jest.Mock<Promise<FormInterface | null>, [string, string | null]>;
}

export interface MockFormInterfaceSubmissionRepository {
    create: jest.Mock<Promise<FormInterfaceSubmission>, [unknown]>;
    findById: jest.Mock<Promise<FormInterfaceSubmission | null>, [string]>;
    findByInterfaceId: jest.Mock<
        Promise<{ submissions: FormInterfaceSubmission[]; total: number }>,
        [string, unknown]
    >;
    countByInterfaceId: jest.Mock<Promise<number>, [string]>;
    updateOutput: jest.Mock<Promise<FormInterfaceSubmission | null>, [string, string]>;
    updateExecutionStatus: jest.Mock<
        Promise<FormInterfaceSubmission | null>,
        [string, FormSubmissionExecutionStatus, string?, string?]
    >;
    updateAttachmentsStatus: jest.Mock<
        Promise<FormInterfaceSubmission | null>,
        [string, FormSubmissionAttachmentsStatus]
    >;
    findByExecutionId: jest.Mock<Promise<FormInterfaceSubmission | null>, [string]>;
}

/**
 * Search result type that supports both ID-based and index-based chunk identification.
 * Different test scenarios may use different field combinations.
 */
export interface SearchResult {
    id?: string;
    content: string;
    sourceType: string;
    sourceName: string;
    similarity: number;
    chunkIndex?: number;
    sourceIndex?: number;
    submissionId?: string;
    embedding?: number[];
    metadata?: Record<string, unknown>;
}

export interface MockFormInterfaceSubmissionChunkRepository {
    createChunks: jest.Mock<Promise<void>, [unknown[]]>;
    searchSimilar: jest.Mock<Promise<SearchResult[]>, [unknown]>;
}

export interface MockWorkflowRepository {
    findByIdAndWorkspaceId: jest.Mock<Promise<unknown | null>, [string, string]>;
}

export interface MockAgentRepository {
    findByIdAndWorkspaceId: jest.Mock<Promise<unknown | null>, [string, string]>;
}

export interface MockTriggerRepository {
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
    softDelete: jest.Mock<Promise<boolean>, [string]>;
    findByWorkflowId: jest.Mock<Promise<unknown[]>, [string]>;
}

export interface MockExecutionRepository {
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
    findById: jest.Mock<Promise<unknown | null>, [string]>;
    updateStatus: jest.Mock<Promise<void>, [string, string]>;
}

export interface MockAgentExecutionRepository {
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
    getMessagesByThread: jest.Mock<Promise<unknown[]>, [string]>;
}

export interface MockThreadRepository {
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
    findById: jest.Mock<Promise<unknown | null>, [string]>;
}

// ============================================================================
// MOCK SERVICE INTERFACES
// ============================================================================

export interface MockGCSService {
    upload: jest.Mock<Promise<string>, [unknown, unknown]>;
    download: jest.Mock<Promise<Buffer>, [string]>;
    downloadToTemp: jest.Mock<Promise<string>, [{ gcsUri: string }]>;
    getSignedDownloadUrl: jest.Mock<Promise<string>, [string, number]>;
    files: Map<string, Buffer>;
    seedFile: (path: string, content: string | Buffer) => void;
    clear: () => void;
}

export interface MockTemporalClient {
    workflow: {
        start: jest.Mock<Promise<{ workflowId: string }>, [unknown, unknown]>;
    };
    getWorkflowCalls: () => Array<{ workflow: unknown; options: unknown }>;
    clear: () => void;
}

export interface FormStreamingEvent {
    type: string;
    executionId?: string;
    submissionId?: string;
    timestamp?: number;
    [key: string]: unknown;
}

export interface MockRedisEventBus {
    subscribe: jest.Mock<Promise<void>, [string, (message: string) => void]>;
    unsubscribe: jest.Mock<Promise<void>, [string, (message: string) => void]>;
    publish: jest.Mock<Promise<void>, [string, string]>;
    subscriptions: Map<string, Set<(message: string) => void>>;
    simulateEvent: (channel: string, event: FormStreamingEvent) => void;
    clear: () => void;
}

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

function createMockFormInterfaceRepository(): MockFormInterfaceRepository {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findBySlug: jest.fn(),
        findByIdAndWorkspaceId: jest.fn(),
        findByWorkspaceId: jest.fn().mockResolvedValue({ formInterfaces: [], total: 0 }),
        isSlugAvailableInWorkspace: jest.fn().mockResolvedValue(true),
        updateByWorkspaceId: jest.fn(),
        publishByWorkspaceId: jest.fn(),
        unpublishByWorkspaceId: jest.fn(),
        duplicateByWorkspaceId: jest.fn(),
        softDeleteByWorkspaceId: jest.fn().mockResolvedValue(true),
        setTriggerId: jest.fn()
    };
}

function createMockSubmissionRepository(): MockFormInterfaceSubmissionRepository {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findByInterfaceId: jest.fn().mockResolvedValue({ submissions: [], total: 0 }),
        countByInterfaceId: jest.fn().mockResolvedValue(0),
        updateOutput: jest.fn(),
        updateExecutionStatus: jest.fn(),
        updateAttachmentsStatus: jest.fn(),
        findByExecutionId: jest.fn()
    };
}

function createMockSubmissionChunkRepository(): MockFormInterfaceSubmissionChunkRepository {
    return {
        createChunks: jest.fn().mockResolvedValue(undefined),
        searchSimilar: jest.fn().mockResolvedValue([])
    };
}

function createMockWorkflowRepository(): MockWorkflowRepository {
    return {
        findByIdAndWorkspaceId: jest.fn()
    };
}

function createMockAgentRepository(): MockAgentRepository {
    return {
        findByIdAndWorkspaceId: jest.fn()
    };
}

function createMockTriggerRepository(): MockTriggerRepository {
    return {
        create: jest.fn().mockResolvedValue({ id: `trigger-${Date.now()}` }),
        softDelete: jest.fn().mockResolvedValue(true),
        findByWorkflowId: jest.fn().mockResolvedValue([])
    };
}

function createMockExecutionRepository(): MockExecutionRepository {
    return {
        create: jest.fn().mockResolvedValue({ id: `exec-${Date.now()}` }),
        findById: jest.fn(),
        updateStatus: jest.fn().mockResolvedValue(undefined)
    };
}

function createMockAgentExecutionRepository(): MockAgentExecutionRepository {
    return {
        create: jest.fn().mockResolvedValue({ id: `agent-exec-${Date.now()}` }),
        getMessagesByThread: jest.fn().mockResolvedValue([])
    };
}

function createMockThreadRepository(): MockThreadRepository {
    return {
        create: jest.fn().mockResolvedValue({ id: `thread-${Date.now()}` }),
        findById: jest.fn()
    };
}

function createMockGCSService(): MockGCSService {
    const files = new Map<string, Buffer>();

    return {
        upload: jest.fn(async (_stream: unknown, options: unknown) => {
            const opts = options as { filename?: string };
            return `gs://test-bucket/uploads/${opts.filename || "file"}`;
        }),
        download: jest.fn(async (path: string): Promise<Buffer> => {
            const content = files.get(path);
            if (!content) {
                throw new Error(`File not found: ${path}`);
            }
            return content;
        }),
        downloadToTemp: jest.fn(async ({ gcsUri }: { gcsUri: string }): Promise<string> => {
            return `/tmp/test-${Date.now()}-${gcsUri.split("/").pop()}`;
        }),
        getSignedDownloadUrl: jest.fn(async (uri: string, _ttl: number): Promise<string> => {
            return `https://storage.googleapis.com/signed/${uri}?token=test`;
        }),
        files,
        seedFile: (path: string, content: string | Buffer) => {
            const buffer = typeof content === "string" ? Buffer.from(content) : content;
            files.set(path, buffer);
        },
        clear: () => files.clear()
    };
}

function createMockTemporalClient(): MockTemporalClient {
    const workflowCalls: Array<{ workflow: unknown; options: unknown }> = [];

    return {
        workflow: {
            start: jest.fn(async (workflow: unknown, options: unknown) => {
                workflowCalls.push({ workflow, options });
                return { workflowId: `wf-${Date.now()}` };
            })
        },
        getWorkflowCalls: () => [...workflowCalls],
        clear: () => {
            workflowCalls.length = 0;
        }
    };
}

function createMockRedisEventBus(): MockRedisEventBus {
    const subscriptions = new Map<string, Set<(message: string) => void>>();

    return {
        subscribe: jest.fn(async (channel: string, handler: (message: string) => void) => {
            if (!subscriptions.has(channel)) {
                subscriptions.set(channel, new Set());
            }
            subscriptions.get(channel)!.add(handler);
        }),
        unsubscribe: jest.fn(async (channel: string, handler: (message: string) => void) => {
            subscriptions.get(channel)?.delete(handler);
        }),
        publish: jest.fn(async (channel: string, message: string) => {
            const handlers = subscriptions.get(channel);
            if (handlers) {
                for (const handler of handlers) {
                    handler(message);
                }
            }
        }),
        subscriptions,
        simulateEvent: (channel: string, event: FormStreamingEvent) => {
            const handlers = subscriptions.get(channel);
            if (handlers) {
                const message = JSON.stringify(event);
                for (const handler of handlers) {
                    handler(message);
                }
            }
        },
        clear: () => {
            subscriptions.clear();
        }
    };
}

// ============================================================================
// TEST ENVIRONMENT FACTORY
// ============================================================================

/**
 * Create a form interface test environment with mocked dependencies.
 */
export async function createFormInterfaceTestEnvironment(
    options: FormInterfaceTestOptions = {}
): Promise<FormInterfaceTestEnvironment> {
    const { embeddingDimensions = 1536, embeddingOptions = {}, seedFiles = {} } = options;

    // Create Fastify instance
    const fastify = Fastify({
        logger: false
    });

    // Create mock Redis
    const redis = createMockRedis({ connected: true });

    // Create mock repositories
    const repositories: MockRepositories = {
        formInterface: createMockFormInterfaceRepository(),
        submission: createMockSubmissionRepository(),
        submissionChunk: createMockSubmissionChunkRepository(),
        workflow: createMockWorkflowRepository(),
        agent: createMockAgentRepository(),
        trigger: createMockTriggerRepository(),
        execution: createMockExecutionRepository(),
        agentExecution: createMockAgentExecutionRepository(),
        thread: createMockThreadRepository()
    };

    // Create mock services
    const embeddingMock = createMockEmbeddingService({
        dimensions: embeddingDimensions,
        ...embeddingOptions
    });

    const gcsMock = createMockGCSService();
    const temporalMock = createMockTemporalClient();
    const eventBusMock = createMockRedisEventBus();

    // Seed files
    for (const [path, content] of Object.entries(seedFiles)) {
        gcsMock.seedFile(path, content);
    }

    const services: MockServices = {
        gcs: gcsMock,
        embedding: embeddingMock,
        temporal: temporalMock,
        eventBus: eventBusMock
    };

    // Cleanup function
    const cleanup = async () => {
        await fastify.close();
        redis.clear();
        embeddingMock.reset();
        gcsMock.clear();
        temporalMock.clear();
        eventBusMock.clear();
        jest.clearAllMocks();
    };

    return {
        fastify,
        redis,
        repositories,
        services,
        cleanup,
        inject: fastify.inject.bind(fastify)
    };
}

// ============================================================================
// SIMPLE TEST ENVIRONMENT (No Fastify)
// ============================================================================

export interface SimpleFormInterfaceTestEnvironment {
    redis: MockRedisClient;
    repositories: MockRepositories;
    services: MockServices;
    cleanup: () => void;
}

/**
 * Create a simple test environment without Fastify.
 * Use this for unit-style integration tests.
 */
export function createSimpleFormInterfaceTestEnvironment(
    options: { embeddingDimensions?: number; embeddingOptions?: EmbeddingMockOptions } = {}
): SimpleFormInterfaceTestEnvironment {
    const { embeddingDimensions = 1536, embeddingOptions = {} } = options;

    const redis = createMockRedis({ connected: true });

    const repositories: MockRepositories = {
        formInterface: createMockFormInterfaceRepository(),
        submission: createMockSubmissionRepository(),
        submissionChunk: createMockSubmissionChunkRepository(),
        workflow: createMockWorkflowRepository(),
        agent: createMockAgentRepository(),
        trigger: createMockTriggerRepository(),
        execution: createMockExecutionRepository(),
        agentExecution: createMockAgentExecutionRepository(),
        thread: createMockThreadRepository()
    };

    const embeddingMock = createMockEmbeddingService({
        dimensions: embeddingDimensions,
        ...embeddingOptions
    });

    const services: MockServices = {
        gcs: createMockGCSService(),
        embedding: embeddingMock,
        temporal: createMockTemporalClient(),
        eventBus: createMockRedisEventBus()
    };

    const cleanup = () => {
        redis.clear();
        embeddingMock.reset();
        services.gcs.clear();
        services.temporal.clear();
        services.eventBus.clear();
        jest.clearAllMocks();
    };

    return {
        redis,
        repositories,
        services,
        cleanup
    };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a Temporal workflow was started with specific arguments.
 */
export function assertWorkflowStarted(
    temporal: MockTemporalClient,
    expectedWorkflowId?: string | RegExp
): void {
    expect(temporal.workflow.start).toHaveBeenCalled();

    if (expectedWorkflowId) {
        const calls = temporal.getWorkflowCalls();
        const matchingCall = calls.find((call) => {
            const opts = call.options as { workflowId?: string };
            if (typeof expectedWorkflowId === "string") {
                return opts.workflowId === expectedWorkflowId;
            }
            return expectedWorkflowId.test(opts.workflowId || "");
        });
        expect(matchingCall).toBeDefined();
    }
}

/**
 * Assert that rate limiting recorded a request.
 */
export function assertRateLimitRecorded(redis: MockRedisClient, keyPattern: RegExp): void {
    const store = redis.getStore();
    const matchingKey = [...store.keys()].find((key) => keyPattern.test(key));
    expect(matchingKey).toBeDefined();
}

/**
 * Assert that an SSE event was published to the event bus.
 */
export function assertEventPublished(
    eventBus: MockRedisEventBus,
    channel: string | RegExp,
    eventType?: string
): void {
    expect(eventBus.publish).toHaveBeenCalled();

    const calls = eventBus.publish.mock.calls;
    const matchingCall = calls.find(([callChannel, message]) => {
        const channelMatch =
            typeof channel === "string" ? callChannel === channel : channel.test(callChannel);

        if (!channelMatch) return false;
        if (!eventType) return true;

        try {
            const parsed = JSON.parse(message);
            return parsed.type === eventType;
        } catch {
            return false;
        }
    });

    expect(matchingCall).toBeDefined();
}
