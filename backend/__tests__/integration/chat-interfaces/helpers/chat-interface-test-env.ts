/**
 * Chat Interface Test Environment
 *
 * Provides a configured test environment for chat interface integration tests.
 * Sets up mocked dependencies for route testing.
 */

import Fastify, { FastifyInstance } from "fastify";
import type {
    ChatInterface,
    ChatInterfaceSession,
    PublicChatInterface,
    ThreadStreamingEvent
} from "@flowmaestro/shared";
import { MockRedisClient, createMockRedis } from "../../../helpers/redis-mock";
import {
    createMockEmbeddingService,
    type MockEmbeddingService,
    type EmbeddingMockOptions
} from "../../knowledge-base/helpers/embedding-mock";
import type {
    ChatInterfaceMessageChunk,
    ChunkSearchResult,
    CreateChunkInput
} from "../../../../src/storage/repositories/ChatInterfaceMessageChunkRepository";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatInterfaceTestEnvironment {
    /** Fastify instance */
    fastify: FastifyInstance;
    /** Mock Redis client (extended with sorted sets) */
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

export interface ChatInterfaceTestOptions {
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
    chatInterface: MockChatInterfaceRepository;
    session: MockChatInterfaceSessionRepository;
    chunk: MockChatInterfaceMessageChunkRepository;
    thread: MockThreadRepository;
    execution: MockAgentExecutionRepository;
}

export interface MockServices {
    gcs: MockGCSService;
    embedding: MockEmbeddingService;
    temporal: MockTemporalClient;
    eventBus: MockRedisEventBus;
    attachmentProcessor: MockAttachmentProcessor;
}

// ============================================================================
// MOCK REPOSITORY INTERFACES
// ============================================================================

export interface MockChatInterfaceRepository {
    findBySlug: jest.Mock<Promise<ChatInterface | null>, [string]>;
    findBySlugPublic: jest.Mock<Promise<PublicChatInterface | null>, [string]>;
    findByIdAndWorkspaceId: jest.Mock<Promise<ChatInterface | null>, [string, string]>;
}

export interface MockChatInterfaceSessionRepository {
    create: jest.Mock<Promise<ChatInterfaceSession>, [unknown]>;
    findBySessionToken: jest.Mock<Promise<ChatInterfaceSession | null>, [string, string]>;
    findBySlugAndToken: jest.Mock<Promise<ChatInterfaceSession | null>, [string, string]>;
    findByPersistenceToken: jest.Mock<Promise<ChatInterfaceSession | null>, [string, string]>;
    findByFingerprint: jest.Mock<Promise<ChatInterfaceSession | null>, [string, string]>;
    updateLastActivity: jest.Mock<Promise<void>, [string]>;
    updateThreadId: jest.Mock<Promise<void>, [string, string]>;
    incrementMessageCount: jest.Mock<Promise<void>, [string]>;
    updateExecutionStatus: jest.Mock<Promise<void>, [string, string, string]>;
    generatePersistenceToken: jest.Mock<string, []>;
}

export interface MockChatInterfaceMessageChunkRepository {
    createChunks: jest.Mock<Promise<ChatInterfaceMessageChunk[]>, [CreateChunkInput[]]>;
    searchSimilar: jest.Mock<Promise<ChunkSearchResult[]>, [unknown]>;
    deleteBySessionId: jest.Mock<Promise<number>, [string]>;
    findBySessionId: jest.Mock<Promise<ChatInterfaceMessageChunk[]>, [string]>;
    countBySessionId: jest.Mock<Promise<number>, [string]>;
}

export interface MockThreadRepository {
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
    findById: jest.Mock<Promise<unknown | null>, [string]>;
}

export interface MockAgentExecutionRepository {
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
    getMessagesByThread: jest.Mock<Promise<unknown[]>, [string]>;
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

export interface MockRedisEventBus {
    subscribeToThread: jest.Mock<Promise<void>, [string, (event: ThreadStreamingEvent) => void]>;
    unsubscribeFromThread: jest.Mock<
        Promise<void>,
        [string, (event: ThreadStreamingEvent) => void]
    >;
    publishToThread: jest.Mock<Promise<void>, [string, ThreadStreamingEvent]>;
    subscriptions: Map<string, Set<(event: ThreadStreamingEvent) => void>>;
    simulateEvent: (threadId: string, event: ThreadStreamingEvent) => void;
    clear: () => void;
}

export interface MockAttachmentProcessor {
    processAttachments: jest.Mock<
        Promise<
            Array<{ success: boolean; fileName: string; chunksCreated: number; error?: string }>
        >,
        [unknown]
    >;
}

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

function createMockChatInterfaceRepository(): MockChatInterfaceRepository {
    return {
        findBySlug: jest.fn(),
        findBySlugPublic: jest.fn(),
        findByIdAndWorkspaceId: jest.fn()
    };
}

function createMockSessionRepository(): MockChatInterfaceSessionRepository {
    return {
        create: jest.fn(),
        findBySessionToken: jest.fn(),
        findBySlugAndToken: jest.fn(),
        findByPersistenceToken: jest.fn(),
        findByFingerprint: jest.fn(),
        updateLastActivity: jest.fn().mockResolvedValue(undefined),
        updateThreadId: jest.fn().mockResolvedValue(undefined),
        incrementMessageCount: jest.fn().mockResolvedValue(undefined),
        updateExecutionStatus: jest.fn().mockResolvedValue(undefined),
        generatePersistenceToken: jest.fn().mockReturnValue(`persist_${Date.now()}`)
    };
}

function createMockChunkRepository(): MockChatInterfaceMessageChunkRepository {
    return {
        createChunks: jest.fn().mockResolvedValue([]),
        searchSimilar: jest.fn().mockResolvedValue([]),
        deleteBySessionId: jest.fn().mockResolvedValue(0),
        findBySessionId: jest.fn().mockResolvedValue([]),
        countBySessionId: jest.fn().mockResolvedValue(0)
    };
}

function createMockThreadRepository(): MockThreadRepository {
    return {
        create: jest.fn().mockResolvedValue({ id: `thread-${Date.now()}` }),
        findById: jest.fn()
    };
}

function createMockExecutionRepository(): MockAgentExecutionRepository {
    return {
        create: jest.fn().mockResolvedValue({ id: `exec-${Date.now()}` }),
        getMessagesByThread: jest.fn().mockResolvedValue([])
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
    const subscriptions = new Map<string, Set<(event: ThreadStreamingEvent) => void>>();

    return {
        subscribeToThread: jest.fn(
            async (threadId: string, handler: (event: ThreadStreamingEvent) => void) => {
                if (!subscriptions.has(threadId)) {
                    subscriptions.set(threadId, new Set());
                }
                subscriptions.get(threadId)!.add(handler);
            }
        ),
        unsubscribeFromThread: jest.fn(
            async (threadId: string, handler: (event: ThreadStreamingEvent) => void) => {
                subscriptions.get(threadId)?.delete(handler);
            }
        ),
        publishToThread: jest.fn(async (threadId: string, event: ThreadStreamingEvent) => {
            const handlers = subscriptions.get(threadId);
            if (handlers) {
                for (const handler of handlers) {
                    handler(event);
                }
            }
        }),
        subscriptions,
        simulateEvent: (threadId: string, event: ThreadStreamingEvent) => {
            const handlers = subscriptions.get(threadId);
            if (handlers) {
                for (const handler of handlers) {
                    handler(event);
                }
            }
        },
        clear: () => {
            subscriptions.clear();
        }
    };
}

function createMockAttachmentProcessor(): MockAttachmentProcessor {
    return {
        processAttachments: jest.fn(async (input: unknown) => {
            const inp = input as { attachments?: unknown[] };
            const count = inp.attachments?.length || 0;
            return Array.from({ length: count }, (_, i) => ({
                success: true,
                fileName: `file-${i}.pdf`,
                chunksCreated: 3
            }));
        })
    };
}

// ============================================================================
// TEST ENVIRONMENT FACTORY
// ============================================================================

/**
 * Create a chat interface test environment with mocked dependencies.
 */
export async function createChatInterfaceTestEnvironment(
    options: ChatInterfaceTestOptions = {}
): Promise<ChatInterfaceTestEnvironment> {
    const { embeddingDimensions = 1536, embeddingOptions = {}, seedFiles = {} } = options;

    // Create Fastify instance
    const fastify = Fastify({
        logger: false
    });

    // Create mock Redis
    const redis = createMockRedis({ connected: true });

    // Create mock repositories
    const repositories: MockRepositories = {
        chatInterface: createMockChatInterfaceRepository(),
        session: createMockSessionRepository(),
        chunk: createMockChunkRepository(),
        thread: createMockThreadRepository(),
        execution: createMockExecutionRepository()
    };

    // Create mock services
    const embeddingMock = createMockEmbeddingService({
        dimensions: embeddingDimensions,
        ...embeddingOptions
    });

    const gcsMock = createMockGCSService();
    const temporalMock = createMockTemporalClient();
    const eventBusMock = createMockRedisEventBus();
    const attachmentProcessorMock = createMockAttachmentProcessor();

    // Seed files
    for (const [path, content] of Object.entries(seedFiles)) {
        gcsMock.seedFile(path, content);
    }

    const services: MockServices = {
        gcs: gcsMock,
        embedding: embeddingMock,
        temporal: temporalMock,
        eventBus: eventBusMock,
        attachmentProcessor: attachmentProcessorMock
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

export interface SimpleChatInterfaceTestEnvironment {
    redis: MockRedisClient;
    repositories: MockRepositories;
    services: MockServices;
    cleanup: () => void;
}

/**
 * Create a simple test environment without Fastify.
 * Use this for unit-style integration tests.
 */
export function createSimpleChatInterfaceTestEnvironment(
    options: { embeddingDimensions?: number; embeddingOptions?: EmbeddingMockOptions } = {}
): SimpleChatInterfaceTestEnvironment {
    const { embeddingDimensions = 1536, embeddingOptions = {} } = options;

    const redis = createMockRedis({ connected: true });

    const repositories: MockRepositories = {
        chatInterface: createMockChatInterfaceRepository(),
        session: createMockSessionRepository(),
        chunk: createMockChunkRepository(),
        thread: createMockThreadRepository(),
        execution: createMockExecutionRepository()
    };

    const embeddingMock = createMockEmbeddingService({
        dimensions: embeddingDimensions,
        ...embeddingOptions
    });

    const services: MockServices = {
        gcs: createMockGCSService(),
        embedding: embeddingMock,
        temporal: createMockTemporalClient(),
        eventBus: createMockRedisEventBus(),
        attachmentProcessor: createMockAttachmentProcessor()
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
