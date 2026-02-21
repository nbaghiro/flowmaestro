/**
 * Embeddings Node Execution
 *
 * Complete execution logic and handler for embedding generation nodes.
 * Supports OpenAI, Cohere, and Google embedding models.
 *
 * Uses the unified @flowmaestro/ai SDK for all provider integrations.
 */

import type { AIProvider } from "@flowmaestro/ai-sdk";
import type { JsonObject } from "@flowmaestro/shared";
import { getAIClient } from "../../../../../core/ai";
import {
    ValidationError,
    withHeartbeat,
    createActivityLogger,
    interpolateVariables,
    getExecutionContext
} from "../../../../core";
import {
    BaseNodeHandler,
    type NodeHandlerInput,
    type NodeHandlerOutput,
    type TokenUsage
} from "../../types";

const logger = createActivityLogger({ nodeType: "Embeddings" });

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingsNodeConfig {
    provider: "openai" | "cohere" | "google";
    model?: string;
    input: string | string[];
    inputTruncate?: "start" | "end" | "none";
    taskType?: "search_document" | "search_query" | "classification" | "clustering";
    batchSize?: number;
    outputVariable?: string;
    connectionId?: string;
}

/**
 * Default models by provider
 */
const DEFAULT_MODELS: Record<string, string> = {
    openai: "text-embedding-3-small",
    cohere: "embed-english-v3.0",
    google: "text-embedding-004"
};

export interface EmbeddingsNodeResult {
    embeddings: number[][];
    model: string;
    provider: string;
    metadata?: {
        dimensions?: number;
        inputCount?: number;
        tokensUsed?: number;
        processingTime: number;
    };
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Embeddings node - generate vector embeddings for text via unified AI SDK
 */
export async function executeEmbeddingsNode(
    config: EmbeddingsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    return withHeartbeat("embeddings", async (heartbeat) => {
        const startTime = Date.now();

        heartbeat.update({ step: "initializing", provider: config.provider });
        logger.info("Generating embeddings via unified AI SDK", { provider: config.provider });

        const ai = getAIClient();
        const provider = config.provider as AIProvider;

        // Use default model if not specified
        const model = config.model ?? DEFAULT_MODELS[config.provider];

        // Prepare inputs
        const inputs = Array.isArray(config.input) ? config.input : [config.input];
        const interpolatedInputs = inputs.map((text) => interpolateVariables(text, context));

        logger.debug("Embeddings request", {
            provider: config.provider,
            model,
            inputCount: interpolatedInputs.length
        });

        heartbeat.update({
            step: "generating_embeddings",
            provider: config.provider,
            inputCount: interpolatedInputs.length
        });

        // Validate provider is supported
        if (!["openai", "cohere", "google"].includes(config.provider)) {
            throw new ValidationError(
                `Unsupported embeddings provider: ${config.provider}`,
                "provider"
            );
        }

        // Generate embeddings using unified SDK
        const response = await ai.embedding.generate({
            provider,
            model,
            input: interpolatedInputs,
            taskType: config.taskType,
            truncate: config.inputTruncate,
            batchSize: config.batchSize,
            connectionId: config.connectionId
        });

        const processingTime = Date.now() - startTime;

        const result: JsonObject = {
            embeddings: response.embeddings,
            model,
            provider: config.provider,
            metadata: {
                dimensions: response.dimensions,
                inputCount: response.metadata.inputCount,
                tokensUsed: response.metadata.usage?.totalTokens,
                processingTime
            }
        } as unknown as JsonObject;

        heartbeat.update({ step: "completed", percentComplete: 100 });
        logger.info("Embeddings generated via unified SDK", {
            count: response.embeddings.length,
            dimensions: response.dimensions,
            processingTime
        });

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        return result;
    });
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Embeddings node type.
 */
export class EmbeddingsNodeHandler extends BaseNodeHandler {
    readonly name = "EmbeddingsNodeHandler";
    readonly supportedNodeTypes = ["embeddings"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const embeddingsResult = await executeEmbeddingsNode(
            input.nodeConfig as unknown as EmbeddingsNodeConfig,
            context
        );

        let tokenUsage: TokenUsage | undefined;

        if ("metadata" in embeddingsResult) {
            const metadata = embeddingsResult.metadata as { tokensUsed?: number };
            if (metadata?.tokensUsed) {
                tokenUsage = {
                    totalTokens: metadata.tokensUsed
                };
            }
        }

        return this.success(
            embeddingsResult as unknown as JsonObject,
            {},
            {
                durationMs: Date.now() - startTime,
                tokenUsage
            }
        );
    }
}

/**
 * Factory function for creating Embeddings handler.
 */
export function createEmbeddingsNodeHandler(): EmbeddingsNodeHandler {
    return new EmbeddingsNodeHandler();
}
