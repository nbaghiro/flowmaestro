/**
 * Knowledge Base Test Environment
 *
 * Provides a configured test environment for knowledge base integration tests.
 * Sets up Temporal workflow testing with mocked activities.
 */

import { Client } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker, Runtime } from "@temporalio/worker";
import { nanoid } from "nanoid";
import {
    createMockEmbeddingService,
    type MockEmbeddingService,
    type EmbeddingMockOptions
} from "./embedding-mock";
import { sampleContents, createChunkData, type ChunkData } from "./kb-fixtures";
import type { DocumentFileType } from "../../../../src/storage/models/KnowledgeDocument";

// ============================================================================
// TYPES
// ============================================================================

export interface KBTestEnvironment {
    /** Temporal test workflow environment */
    env: TestWorkflowEnvironment;
    /** Temporal worker */
    worker: Worker;
    /** Temporal client */
    client: Client;
    /** Cleanup function */
    cleanup: () => Promise<void>;
    /** Mock embedding service */
    embeddingMock: MockEmbeddingService;
    /** Mock GCS storage */
    gcsMock: MockGCSService;
    /** Mock repositories */
    repositories: MockRepositories;
    /** Activity tracking */
    activityLog: ActivityLogEntry[];
    /** Get activity calls by name */
    getActivityCalls: (activityName: string) => ActivityLogEntry[];
}

export interface KBTestOptions {
    /** Embedding dimensions (default: 1536) */
    embeddingDimensions?: number;
    /** Chunk size for processing (default: 1000) */
    chunkSize?: number;
    /** Chunk overlap (default: 200) */
    chunkOverlap?: number;
    /** Embedding mock options */
    embeddingOptions?: EmbeddingMockOptions;
    /** Files to pre-seed in GCS mock */
    seedFiles?: Record<string, string>;
    /** Custom activity overrides */
    activityOverrides?: Partial<MockActivities>;
}

export interface MockGCSService {
    /** Upload a file */
    upload: jest.Mock<Promise<void>, [string, Buffer | string]>;
    /** Download a file */
    download: jest.Mock<Promise<Buffer>, [string]>;
    /** Delete a file */
    delete: jest.Mock<Promise<void>, [string]>;
    /** Get file metadata */
    getMetadata: jest.Mock<Promise<{ size: number; contentType: string } | null>, [string]>;
    /** Internal file storage for testing */
    files: Map<string, Buffer>;
    /** Seed files for testing */
    seedFile: (path: string, content: string | Buffer) => void;
    /** Clear all files */
    clear: () => void;
}

export interface MockRepositories {
    knowledgeBase: {
        findById: jest.Mock;
        findByIdAndWorkspaceId: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        getStats: jest.Mock;
    };
    knowledgeDocument: {
        findById: jest.Mock;
        findByKnowledgeBaseId: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        updateStatus: jest.Mock;
        delete: jest.Mock;
    };
    knowledgeChunk: {
        findById: jest.Mock;
        findByDocumentId: jest.Mock;
        create: jest.Mock;
        batchInsert: jest.Mock;
        searchSimilar: jest.Mock;
        deleteByDocumentId: jest.Mock;
        deleteByKnowledgeBaseId: jest.Mock;
        countByKnowledgeBaseId: jest.Mock;
    };
}

export interface ActivityLogEntry {
    activityName: string;
    input: unknown;
    output: unknown;
    timestamp: number;
    success: boolean;
    error?: string;
}

export interface MockActivities {
    extractTextActivity: jest.Mock;
    chunkTextActivity: jest.Mock;
    generateAndStoreEmbeddingsActivity: jest.Mock;
    completeDocumentProcessingActivity: jest.Mock;
}

export interface ProcessingResult {
    documentId: string;
    success: boolean;
    chunkCount: number;
    error?: string;
}

// ============================================================================
// MOCK GCS SERVICE
// ============================================================================

function createMockGCSService(): MockGCSService {
    const files = new Map<string, Buffer>();

    const upload = jest.fn(async (path: string, content: Buffer | string): Promise<void> => {
        const buffer = typeof content === "string" ? Buffer.from(content) : content;
        files.set(path, buffer);
    });

    const download = jest.fn(async (path: string): Promise<Buffer> => {
        const content = files.get(path);
        if (!content) {
            throw new Error(`File not found: ${path}`);
        }
        return content;
    });

    const deleteFile = jest.fn(async (path: string): Promise<void> => {
        files.delete(path);
    });

    const getMetadata = jest.fn(
        async (path: string): Promise<{ size: number; contentType: string } | null> => {
            const content = files.get(path);
            if (!content) {
                return null;
            }
            return {
                size: content.length,
                contentType: "application/octet-stream"
            };
        }
    );

    return {
        upload,
        download,
        delete: deleteFile,
        getMetadata,
        files,
        seedFile: (path: string, content: string | Buffer) => {
            const buffer = typeof content === "string" ? Buffer.from(content) : content;
            files.set(path, buffer);
        },
        clear: () => files.clear()
    };
}

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

function createMockRepositories(): MockRepositories {
    return {
        knowledgeBase: {
            findById: jest.fn(),
            findByIdAndWorkspaceId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getStats: jest.fn()
        },
        knowledgeDocument: {
            findById: jest.fn(),
            findByKnowledgeBaseId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            delete: jest.fn()
        },
        knowledgeChunk: {
            findById: jest.fn(),
            findByDocumentId: jest.fn(),
            create: jest.fn(),
            batchInsert: jest.fn(),
            searchSimilar: jest.fn(),
            deleteByDocumentId: jest.fn(),
            deleteByKnowledgeBaseId: jest.fn(),
            countByKnowledgeBaseId: jest.fn()
        }
    };
}

// ============================================================================
// MOCK ACTIVITIES
// ============================================================================

interface ExtractTextInput {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: DocumentFileType;
    userId?: string;
}

interface ChunkTextInput extends ExtractTextInput {
    content: string;
}

interface GenerateEmbeddingsInput extends ExtractTextInput {
    chunks: ChunkData[];
}

function createMockActivities(
    options: KBTestOptions,
    gcsMock: MockGCSService,
    embeddingMock: MockEmbeddingService,
    activityLog: ActivityLogEntry[]
): MockActivities {
    const { chunkSize = 1000, chunkOverlap = 200 } = options;

    const logActivity = (
        name: string,
        input: unknown,
        output: unknown,
        success: boolean,
        error?: string
    ) => {
        activityLog.push({
            activityName: name,
            input,
            output,
            timestamp: Date.now(),
            success,
            error
        });
    };

    // Extract text from document
    const extractTextActivity = jest.fn(async (input: ExtractTextInput): Promise<string> => {
        try {
            let content: string;

            if (input.sourceUrl) {
                // URL-based document - return sample HTML content
                content = sampleContents.html;
            } else if (input.filePath) {
                // File-based document
                const fileBuffer = gcsMock.files.get(input.filePath);
                if (fileBuffer) {
                    content = fileBuffer.toString("utf-8");
                } else {
                    // Return sample content based on file type
                    const fileType = input.fileType as keyof typeof sampleContents;
                    content = sampleContents[fileType] || sampleContents.txt;
                }
            } else {
                throw new Error("No file path or source URL provided");
            }

            logActivity("extractTextActivity", input, content, true);
            return content;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            logActivity("extractTextActivity", input, null, false, errorMsg);
            throw error;
        }
    });

    // Chunk text into smaller pieces
    const chunkTextActivity = jest.fn(async (input: ChunkTextInput): Promise<ChunkData[]> => {
        try {
            const { content } = input;

            if (!content || content.trim().length === 0) {
                logActivity("chunkTextActivity", input, [], true);
                return [];
            }

            // Simple chunking algorithm
            const chunks: ChunkData[] = [];
            let position = 0;
            let index = 0;

            while (position < content.length) {
                const endPosition = Math.min(position + chunkSize, content.length);
                const chunkContent = content.slice(position, endPosition);

                chunks.push({
                    content: chunkContent,
                    index,
                    metadata: {
                        start_char: position,
                        end_char: endPosition
                    }
                });

                // Move position with overlap
                position = endPosition - chunkOverlap;
                if (position >= content.length - chunkOverlap) {
                    break;
                }
                index++;
            }

            logActivity("chunkTextActivity", input, chunks, true);
            return chunks;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            logActivity("chunkTextActivity", input, null, false, errorMsg);
            throw error;
        }
    });

    // Generate embeddings and store chunks
    const generateAndStoreEmbeddingsActivity = jest.fn(
        async (
            input: GenerateEmbeddingsInput
        ): Promise<{ chunkCount: number; totalTokens: number }> => {
            try {
                const { chunks } = input;

                if (chunks.length === 0) {
                    logActivity(
                        "generateAndStoreEmbeddingsActivity",
                        input,
                        { chunkCount: 0, totalTokens: 0 },
                        true
                    );
                    return { chunkCount: 0, totalTokens: 0 };
                }

                // Generate embeddings for all chunks
                const contents = chunks.map((c) => c.content);
                await embeddingMock.generateEmbeddings(contents);

                // Calculate total tokens (approximate)
                const totalTokens = contents.reduce(
                    (sum, content) => sum + Math.ceil(content.length / 4),
                    0
                );

                const result = { chunkCount: chunks.length, totalTokens };
                logActivity("generateAndStoreEmbeddingsActivity", input, result, true);
                return result;
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                logActivity("generateAndStoreEmbeddingsActivity", input, null, false, errorMsg);
                throw error;
            }
        }
    );

    // Complete document processing
    const completeDocumentProcessingActivity = jest.fn(
        async (input: ExtractTextInput): Promise<void> => {
            try {
                logActivity("completeDocumentProcessingActivity", input, undefined, true);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                logActivity("completeDocumentProcessingActivity", input, null, false, errorMsg);
                throw error;
            }
        }
    );

    return {
        extractTextActivity,
        chunkTextActivity,
        generateAndStoreEmbeddingsActivity,
        completeDocumentProcessingActivity
    };
}

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

/**
 * Create a knowledge base test environment with mocked activities.
 */
// Track if Runtime has been installed
let runtimeInstalled = false;

export async function createKBTestEnvironment(
    options: KBTestOptions = {}
): Promise<KBTestEnvironment> {
    const { embeddingDimensions = 1536, embeddingOptions = {}, seedFiles = {} } = options;

    // Suppress Temporal logs during tests (only install once)
    if (!runtimeInstalled) {
        Runtime.install({
            logger: {
                log: () => {},
                trace: () => {},
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {}
            }
        });
        runtimeInstalled = true;
    }

    const env = await TestWorkflowEnvironment.createLocal();

    // Create mocks
    const embeddingMock = createMockEmbeddingService({
        dimensions: embeddingDimensions,
        ...embeddingOptions
    });
    const gcsMock = createMockGCSService();
    const repositories = createMockRepositories();
    const activityLog: ActivityLogEntry[] = [];

    // Seed files
    for (const [path, content] of Object.entries(seedFiles)) {
        gcsMock.seedFile(path, content);
    }

    // Create mock activities
    const mockActivities = createMockActivities(options, gcsMock, embeddingMock, activityLog);

    // Merge with any overrides
    const activities = {
        ...mockActivities,
        ...options.activityOverrides,

        // Event activities (no-op for tests)
        emitExecutionStarted: jest.fn().mockResolvedValue(undefined),
        emitExecutionProgress: jest.fn().mockResolvedValue(undefined),
        emitExecutionCompleted: jest.fn().mockResolvedValue(undefined),
        emitExecutionFailed: jest.fn().mockResolvedValue(undefined),
        emitNodeStarted: jest.fn().mockResolvedValue(undefined),
        emitNodeCompleted: jest.fn().mockResolvedValue(undefined),
        emitNodeFailed: jest.fn().mockResolvedValue(undefined)
    };

    const taskQueue = `kb-test-queue-${nanoid()}`;

    const worker = await Worker.create({
        connection: env.nativeConnection,
        taskQueue,
        workflowsPath: require.resolve("../../../../src/temporal/workflows"),
        activities
    });

    const cleanup = async () => {
        try {
            await worker.shutdown();
        } catch {
            // Ignore shutdown errors
        }
        try {
            await env.teardown();
        } catch {
            // Ignore teardown errors
        }
        embeddingMock.reset();
        gcsMock.clear();
        activityLog.length = 0;
    };

    return {
        env,
        worker,
        client: env.client,
        cleanup,
        embeddingMock,
        gcsMock,
        repositories,
        activityLog,
        getActivityCalls: (activityName: string) =>
            activityLog.filter((entry) => entry.activityName === activityName)
    };
}

// ============================================================================
// SIMPLE TEST ENVIRONMENT (No Temporal)
// ============================================================================

export interface SimpleKBTestEnvironment {
    embeddingMock: MockEmbeddingService;
    gcsMock: MockGCSService;
    repositories: MockRepositories;
    cleanup: () => void;
}

/**
 * Create a simple test environment without Temporal.
 * Use this for tests that only need mocked repositories (e.g., search tests).
 */
export function createSimpleKBTestEnvironment(
    options: { embeddingDimensions?: number; embeddingOptions?: EmbeddingMockOptions } = {}
): SimpleKBTestEnvironment {
    const { embeddingDimensions = 1536, embeddingOptions = {} } = options;

    const embeddingMock = createMockEmbeddingService({
        dimensions: embeddingDimensions,
        ...embeddingOptions
    });
    const gcsMock = createMockGCSService();
    const repositories = createMockRepositories();

    const cleanup = () => {
        embeddingMock.reset();
        gcsMock.clear();
        jest.clearAllMocks();
    };

    return {
        embeddingMock,
        gcsMock,
        repositories,
        cleanup
    };
}

// ============================================================================
// WORKFLOW EXECUTION HELPERS
// ============================================================================

/**
 * Run the document processing workflow.
 */
export async function runDocumentProcessingWorkflow(
    testEnv: KBTestEnvironment,
    input: {
        documentId: string;
        knowledgeBaseId: string;
        filePath?: string;
        sourceUrl?: string;
        fileType: string;
        userId?: string;
    }
): Promise<ProcessingResult> {
    const workflowId = `test-doc-processing-${nanoid()}`;
    const taskQueue = `kb-test-queue-${nanoid()}`;

    // Create a new worker for this execution
    const worker = await Worker.create({
        connection: testEnv.env.nativeConnection,
        taskQueue,
        workflowsPath: require.resolve("../../../../src/temporal/workflows"),
        activities: {
            extractTextActivity: (testEnv as { worker: Worker }).worker
                ? jest.fn().mockImplementation(async (_actInput: ExtractTextInput) => {
                      const entry = testEnv.activityLog.find(
                          (e) => e.activityName === "extractTextActivity"
                      );
                      if (entry?.error) throw new Error(entry.error);
                      return entry?.output || sampleContents.pdf;
                  })
                : jest.fn().mockResolvedValue(sampleContents.pdf),
            chunkTextActivity: jest.fn().mockResolvedValue(createChunkData(3)),
            generateAndStoreEmbeddingsActivity: jest
                .fn()
                .mockResolvedValue({ chunkCount: 3, totalTokens: 150 }),
            completeDocumentProcessingActivity: jest.fn().mockResolvedValue(undefined)
        }
    });

    try {
        const result = await worker.runUntil(
            testEnv.client.workflow.execute("processDocumentWorkflow", {
                workflowId,
                taskQueue,
                args: [input],
                workflowExecutionTimeout: 30000
            })
        );

        return result as ProcessingResult;
    } finally {
        await worker.shutdown();
    }
}

/**
 * Run workflow with custom activity implementations.
 */
export async function runWorkflowWithActivities(
    testEnv: KBTestEnvironment,
    workflowName: string,
    input: unknown,
    activities: Record<string, jest.Mock>
): Promise<unknown> {
    const workflowId = `test-${workflowName}-${nanoid()}`;
    const taskQueue = `kb-test-queue-${nanoid()}`;

    const worker = await Worker.create({
        connection: testEnv.env.nativeConnection,
        taskQueue,
        workflowsPath: require.resolve("../../../../src/temporal/workflows"),
        activities
    });

    try {
        return await worker.runUntil(
            testEnv.client.workflow.execute(workflowName, {
                workflowId,
                taskQueue,
                args: [input],
                workflowExecutionTimeout: 30000
            })
        );
    } finally {
        await worker.shutdown();
    }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that an activity was called with specific arguments.
 */
export function assertActivityCalled(
    testEnv: KBTestEnvironment,
    activityName: string,
    expectedInput?: Record<string, unknown>
): void {
    const calls = testEnv.getActivityCalls(activityName);
    expect(calls.length).toBeGreaterThan(0);

    if (expectedInput) {
        const lastCall = calls[calls.length - 1];
        expect(lastCall.input).toMatchObject(expectedInput);
    }
}

/**
 * Assert that an activity was not called.
 */
export function assertActivityNotCalled(testEnv: KBTestEnvironment, activityName: string): void {
    const calls = testEnv.getActivityCalls(activityName);
    expect(calls.length).toBe(0);
}

/**
 * Assert the order of activity calls.
 */
export function assertActivityOrder(testEnv: KBTestEnvironment, expectedOrder: string[]): void {
    const actualOrder = testEnv.activityLog.map((entry) => entry.activityName);
    expect(actualOrder).toEqual(expectedOrder);
}
