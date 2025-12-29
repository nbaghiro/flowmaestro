/**
 * Embeddings Node Execution
 *
 * Complete execution logic and handler for embedding generation nodes.
 * Supports OpenAI, Cohere, and Google embedding models.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";
import OpenAI from "openai";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import {
    ConfigurationError,
    ValidationError,
    withHeartbeat,
    type HeartbeatOperations
} from "../../../../core";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
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
    model: string;
    input: string | string[];
    inputTruncate?: "start" | "end" | "none";
    taskType?: "search_document" | "search_query" | "classification" | "clustering";
    batchSize?: number;
    outputVariable?: string;
}

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
// HELPER FUNCTIONS
// ============================================================================

function mapTaskTypeToInputType(
    taskType?: string
): "search_document" | "search_query" | "classification" | "clustering" {
    switch (taskType) {
        case "search_document":
            return "search_document";
        case "search_query":
            return "search_query";
        case "classification":
            return "classification";
        case "clustering":
            return "clustering";
        default:
            return "search_document";
    }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function executeOpenAI(
    config: EmbeddingsNodeConfig,
    context: JsonObject,
    heartbeat: HeartbeatOperations
): Promise<JsonObject> {
    const apiKey = appConfig.ai.openai.apiKey;
    if (!apiKey) {
        throw new ConfigurationError(
            "OPENAI_API_KEY environment variable is not set",
            "OPENAI_API_KEY"
        );
    }

    const openai = new OpenAI({ apiKey });

    const inputs = Array.isArray(config.input) ? config.input : [config.input];
    const interpolatedInputs = inputs.map((text) => interpolateVariables(text, context));

    logger.debug("OpenAI embeddings request", { inputCount: interpolatedInputs.length });

    const batchSize = config.batchSize || 2048;
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    for (let i = 0; i < interpolatedInputs.length; i += batchSize) {
        const batch = interpolatedInputs.slice(i, i + batchSize);

        heartbeat.update({
            step: "processing_batch",
            itemsProcessed: i,
            totalItems: interpolatedInputs.length,
            percentComplete: Math.round((i / interpolatedInputs.length) * 100)
        });

        const response = await openai.embeddings.create({
            model: config.model || "text-embedding-3-small",
            input: batch
        });

        const embeddings = response.data.map((item) => item.embedding);
        allEmbeddings.push(...embeddings);

        if (response.usage) {
            totalTokens += response.usage.total_tokens;
        }

        logger.debug("OpenAI batch processed", {
            batch: Math.floor(i / batchSize) + 1,
            embeddingsCount: embeddings.length
        });
    }

    const dimensions = allEmbeddings[0]?.length || 0;

    return {
        embeddings: allEmbeddings,
        model: config.model || "text-embedding-3-small",
        provider: "openai",
        metadata: {
            dimensions,
            inputCount: interpolatedInputs.length,
            tokensUsed: totalTokens,
            processingTime: 0
        }
    } as unknown as JsonObject;
}

async function executeCohere(
    config: EmbeddingsNodeConfig,
    context: JsonObject,
    _heartbeat: HeartbeatOperations
): Promise<JsonObject> {
    const apiKey = appConfig.ai.cohere.apiKey;
    if (!apiKey) {
        throw new ConfigurationError(
            "COHERE_API_KEY environment variable is not set",
            "COHERE_API_KEY"
        );
    }

    const cohere = new CohereClient({ token: apiKey });

    const inputs = Array.isArray(config.input) ? config.input : [config.input];
    const interpolatedInputs = inputs.map((text) => interpolateVariables(text, context));

    logger.debug("Cohere embeddings request", { inputCount: interpolatedInputs.length });

    const truncateValue =
        config.inputTruncate === "start"
            ? "START"
            : config.inputTruncate === "end"
              ? "END"
              : "NONE";

    const response = await cohere.embed({
        texts: interpolatedInputs,
        model: config.model || "embed-english-v3.0",
        inputType: mapTaskTypeToInputType(config.taskType),
        truncate: truncateValue
    });

    const embeddings = Array.isArray(response.embeddings) ? response.embeddings : [];
    const dimensions = (embeddings[0] as number[])?.length || 0;

    return {
        embeddings,
        model: config.model || "embed-english-v3.0",
        provider: "cohere",
        metadata: {
            dimensions,
            inputCount: interpolatedInputs.length,
            processingTime: 0
        }
    } as unknown as JsonObject;
}

async function executeGoogle(
    config: EmbeddingsNodeConfig,
    context: JsonObject,
    heartbeat: HeartbeatOperations
): Promise<JsonObject> {
    const apiKey = appConfig.ai.google.apiKey;
    if (!apiKey) {
        throw new ConfigurationError(
            "GOOGLE_API_KEY environment variable is not set",
            "GOOGLE_API_KEY"
        );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model || "embedding-001"
    });

    const inputs = Array.isArray(config.input) ? config.input : [config.input];
    const interpolatedInputs = inputs.map((text) => interpolateVariables(text, context));

    logger.debug("Google embeddings request", { inputCount: interpolatedInputs.length });

    const embeddings: number[][] = [];

    for (let i = 0; i < interpolatedInputs.length; i++) {
        heartbeat.update({
            step: "processing_input",
            itemsProcessed: i,
            totalItems: interpolatedInputs.length,
            percentComplete: Math.round((i / interpolatedInputs.length) * 100)
        });

        const result = await model.embedContent(interpolatedInputs[i]);
        embeddings.push(result.embedding.values);
    }

    const dimensions = embeddings[0]?.length || 0;

    return {
        embeddings,
        model: config.model || "embedding-001",
        provider: "google",
        metadata: {
            dimensions,
            inputCount: interpolatedInputs.length,
            processingTime: 0
        }
    } as unknown as JsonObject;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Embeddings node - generate vector embeddings for text
 */
export async function executeEmbeddingsNode(
    config: EmbeddingsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    return withHeartbeat("embeddings", async (heartbeat) => {
        const startTime = Date.now();

        heartbeat.update({ step: "initializing", provider: config.provider });
        logger.info("Generating embeddings", { provider: config.provider });

        let result: JsonObject;

        switch (config.provider) {
            case "openai":
                heartbeat.update({ step: "calling_openai" });
                result = await executeOpenAI(config, context, heartbeat);
                break;

            case "cohere":
                heartbeat.update({ step: "calling_cohere" });
                result = await executeCohere(config, context, heartbeat);
                break;

            case "google":
                heartbeat.update({ step: "calling_google" });
                result = await executeGoogle(config, context, heartbeat);
                break;

            default:
                throw new ValidationError(
                    `Unsupported embeddings provider: ${config.provider}`,
                    "provider"
                );
        }

        const processingTime = Date.now() - startTime;
        result.metadata = {
            ...(result.metadata as JsonObject),
            processingTime
        };

        heartbeat.update({ step: "completed", percentComplete: 100 });
        logger.info("Embeddings generated", {
            count: (result.embeddings as JsonValue[])?.length || 0,
            processingTime
        });

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        return result as unknown as JsonObject;
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
