/**
 * Shared Memory Node Execution
 *
 * Provides key-value storage with semantic search capabilities.
 *
 * Operations:
 * - store: Save a value with a key, optionally indexed for semantic search
 * - search: Find relevant values by meaning/query
 *
 * Values can also be accessed directly via {{shared.keyName}} interpolation.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    SharedMemoryNodeConfigSchema,
    validateOrThrow,
    interpolateVariables,
    getExecutionContext,
    setSharedMemoryValue,
    searchSharedMemory,
    type SharedMemoryNodeConfig,
    type ContextSnapshot
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "SharedMemory" });

// ============================================================================
// TYPES
// ============================================================================

export type { SharedMemoryNodeConfig };

export interface SharedMemoryNodeResult {
    [key: string]: JsonValue;
}

// ============================================================================
// SHARED MEMORY OPERATIONS
// ============================================================================

interface SharedMemoryOperationResult {
    result: JsonObject;
    updatedContext: ContextSnapshot;
}

/**
 * Execute a shared memory operation.
 * Returns both the result and the updated context.
 */
async function executeSharedMemoryOperation(
    config: SharedMemoryNodeConfig,
    contextSnapshot: ContextSnapshot,
    nodeId: string,
    generateEmbedding?: (text: string) => Promise<number[]>
): Promise<SharedMemoryOperationResult> {
    const executionContext = getExecutionContext(contextSnapshot);

    switch (config.operation) {
        case "store": {
            if (!config.key) {
                throw new Error("Store operation requires a key");
            }

            const value: JsonValue = interpolateVariables(config.value || "", executionContext);

            // Generate embedding for semantic search if enabled
            let embedding: number[] | undefined;
            if (
                config.enableSemanticSearch &&
                typeof value === "string" &&
                value.length > 50 &&
                generateEmbedding
            ) {
                try {
                    embedding = await generateEmbedding(value);
                    logger.debug("Generated embedding for shared memory", {
                        key: config.key,
                        embeddingDimensions: embedding.length
                    });
                } catch (error) {
                    logger.warn("Failed to generate embedding, storing without semantic search", {
                        key: config.key,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            const updatedContext = setSharedMemoryValue(
                contextSnapshot,
                config.key,
                value,
                nodeId,
                embedding
            );

            logger.info("Shared memory store", {
                key: config.key,
                hasEmbedding: !!embedding
            });

            return {
                result: {
                    key: config.key,
                    stored: true,
                    searchable: !!embedding
                },
                updatedContext
            };
        }

        case "search": {
            if (!config.searchQuery) {
                throw new Error("Search operation requires a searchQuery");
            }

            const query = interpolateVariables(config.searchQuery, executionContext);

            if (!generateEmbedding) {
                throw new Error("Embedding generation not available for semantic search");
            }

            const queryEmbedding = await generateEmbedding(query);

            const results = searchSharedMemory(
                contextSnapshot,
                queryEmbedding,
                config.topK,
                config.similarityThreshold
            );

            logger.info("Shared memory search", {
                query,
                resultCount: results.length,
                topK: config.topK
            });

            return {
                result: {
                    query,
                    results,
                    resultCount: results.length
                },
                updatedContext: contextSnapshot
            };
        }

        default:
            throw new Error(`Unsupported shared memory operation: ${config.operation}`);
    }
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Shared Memory node with full context support.
 */
export async function executeSharedMemoryWithContext(
    config: unknown,
    contextSnapshot: ContextSnapshot,
    nodeId: string,
    generateEmbedding?: (text: string) => Promise<number[]>
): Promise<{ result: JsonObject; updatedContext?: ContextSnapshot }> {
    const validatedConfig = validateOrThrow(SharedMemoryNodeConfigSchema, config, "SharedMemory");

    logger.info("Shared memory operation", {
        operation: validatedConfig.operation,
        key: validatedConfig.key
    });

    const { result, updatedContext } = await executeSharedMemoryOperation(
        validatedConfig,
        contextSnapshot,
        nodeId,
        generateEmbedding
    );

    return { result, updatedContext };
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/**
 * Serialize shared memory state from context for output.
 * Converts Map to array format for JSON serialization.
 */
function serializeSharedMemoryForOutput(context: ContextSnapshot): JsonObject {
    if (!context.sharedMemory) {
        return {};
    }

    const entries: Array<{
        key: string;
        value: JsonValue;
        embedding?: number[];
        metadata: {
            createdAt: number;
            updatedAt: number;
            nodeId: string;
            sizeBytes: number;
        };
    }> = [];

    for (const [key, entry] of context.sharedMemory.entries) {
        entries.push({
            key,
            value: entry.value,
            embedding: entry.embedding,
            metadata: entry.metadata
        });
    }

    return {
        entries,
        config: {
            maxEntries: context.sharedMemory.config.maxEntries,
            maxValueSizeBytes: context.sharedMemory.config.maxValueSizeBytes,
            maxTotalSizeBytes: context.sharedMemory.config.maxTotalSizeBytes
        },
        metadata: {
            totalSizeBytes: context.sharedMemory.metadata.totalSizeBytes,
            entryCount: context.sharedMemory.metadata.entryCount,
            createdAt: context.sharedMemory.metadata.createdAt
        }
    };
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Shared Memory node type.
 */
export class SharedMemoryNodeHandler extends BaseNodeHandler {
    readonly name = "SharedMemoryNodeHandler";
    readonly supportedNodeTypes = ["shared-memory"] as const;

    private generateEmbedding?: (text: string) => Promise<number[]>;

    /**
     * Set the embedding generator function.
     * Called by the orchestrator to inject the embedding service.
     */
    setEmbeddingGenerator(generator: (text: string) => Promise<number[]>): void {
        this.generateEmbedding = generator;
    }

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        const { result, updatedContext } = await executeSharedMemoryWithContext(
            input.nodeConfig,
            input.context,
            input.metadata.nodeId,
            this.generateEmbedding
        );

        // If context was updated, serialize the shared memory state for orchestrator to merge
        const outputResult = updatedContext
            ? {
                  ...result,
                  _sharedMemoryUpdates: serializeSharedMemoryForOutput(updatedContext)
              }
            : result;

        return this.success(
            outputResult,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Shared Memory handler.
 */
export function createSharedMemoryNodeHandler(): SharedMemoryNodeHandler {
    return new SharedMemoryNodeHandler();
}
