/**
 * Unified Embedding Providers
 *
 * Shared embedding generation logic used by both:
 * - Knowledge Base document processing
 * - Workflow embedding nodes
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";
import OpenAI from "openai";
import { getLogger } from "../../../core/logging";

const logger = getLogger();

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingProviderConfig {
    model: string;
    apiKey: string;
    dimensions?: number;
    batchSize?: number;
}

export interface EmbeddingProviderResult {
    embeddings: number[][];
    model: string;
    provider: string;
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
    metadata: {
        dimensions: number;
        inputCount: number;
        processingTimeMs: number;
    };
}

export interface CohereOptions {
    taskType?: "search_document" | "search_query" | "classification" | "clustering";
    inputTruncate?: "start" | "end" | "none";
}

export type EmbeddingProvider = "openai" | "cohere" | "google";

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Generate embeddings using OpenAI
 */
export async function generateOpenAIEmbeddings(
    texts: string[],
    config: EmbeddingProviderConfig
): Promise<EmbeddingProviderResult> {
    const startTime = Date.now();
    const client = new OpenAI({ apiKey: config.apiKey });

    const batchSize = config.batchSize || 2048;
    const allEmbeddings: number[][] = [];
    let totalPromptTokens = 0;
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        try {
            const response = await client.embeddings.create({
                model: config.model || "text-embedding-3-small",
                input: batch,
                dimensions: config.dimensions
            });

            for (const embedding of response.data) {
                allEmbeddings.push(embedding.embedding);
            }

            totalPromptTokens += response.usage.prompt_tokens;
            totalTokens += response.usage.total_tokens;
        } catch (error: unknown) {
            const apiError = error as { status?: number };
            if (apiError.status === 429) {
                // Rate limit - wait and retry
                await sleep(1000);
                const retryResponse = await client.embeddings.create({
                    model: config.model || "text-embedding-3-small",
                    input: batch,
                    dimensions: config.dimensions
                });

                for (const embedding of retryResponse.data) {
                    allEmbeddings.push(embedding.embedding);
                }

                totalPromptTokens += retryResponse.usage.prompt_tokens;
                totalTokens += retryResponse.usage.total_tokens;
            } else {
                throw error;
            }
        }
    }

    const dimensions = allEmbeddings[0]?.length || config.dimensions || 1536;

    return {
        embeddings: allEmbeddings,
        model: config.model || "text-embedding-3-small",
        provider: "openai",
        usage: {
            promptTokens: totalPromptTokens,
            totalTokens: totalTokens
        },
        metadata: {
            dimensions,
            inputCount: texts.length,
            processingTimeMs: Date.now() - startTime
        }
    };
}

/**
 * Generate embeddings using Cohere
 */
export async function generateCohereEmbeddings(
    texts: string[],
    config: EmbeddingProviderConfig,
    options?: CohereOptions
): Promise<EmbeddingProviderResult> {
    const startTime = Date.now();
    const client = new CohereClient({ token: config.apiKey });

    const truncateValue =
        options?.inputTruncate === "start"
            ? "START"
            : options?.inputTruncate === "end"
              ? "END"
              : "NONE";

    const response = await client.embed({
        texts: texts,
        model: config.model || "embed-english-v3.0",
        inputType: options?.taskType || "search_document",
        truncate: truncateValue
    });

    const embeddings = Array.isArray(response.embeddings)
        ? (response.embeddings as number[][])
        : [];
    const dimensions = embeddings[0]?.length || 1024;

    return {
        embeddings,
        model: config.model || "embed-english-v3.0",
        provider: "cohere",
        usage: {
            promptTokens: 0, // Cohere doesn't provide token usage
            totalTokens: 0
        },
        metadata: {
            dimensions,
            inputCount: texts.length,
            processingTimeMs: Date.now() - startTime
        }
    };
}

/**
 * Generate embeddings using Google
 */
export async function generateGoogleEmbeddings(
    texts: string[],
    config: EmbeddingProviderConfig
): Promise<EmbeddingProviderResult> {
    const startTime = Date.now();
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model || "text-embedding-004"
    });

    const embeddings: number[][] = [];

    // Google processes one at a time
    for (const text of texts) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
    }

    const dimensions = embeddings[0]?.length || 768;

    return {
        embeddings,
        model: config.model || "text-embedding-004",
        provider: "google",
        usage: {
            promptTokens: 0, // Google doesn't provide token usage
            totalTokens: 0
        },
        metadata: {
            dimensions,
            inputCount: texts.length,
            processingTimeMs: Date.now() - startTime
        }
    };
}

// ============================================================================
// UNIFIED INTERFACE
// ============================================================================

/**
 * Generate embeddings using any supported provider
 */
export async function generateEmbeddings(
    texts: string[],
    provider: EmbeddingProvider,
    config: EmbeddingProviderConfig,
    options?: CohereOptions
): Promise<EmbeddingProviderResult> {
    if (texts.length === 0) {
        return {
            embeddings: [],
            model: config.model,
            provider,
            usage: { promptTokens: 0, totalTokens: 0 },
            metadata: {
                dimensions: config.dimensions || 1536,
                inputCount: 0,
                processingTimeMs: 0
            }
        };
    }

    logger.debug(
        { provider, model: config.model, inputCount: texts.length },
        "Generating embeddings"
    );

    switch (provider) {
        case "openai":
            return generateOpenAIEmbeddings(texts, config);
        case "cohere":
            return generateCohereEmbeddings(texts, config, options);
        case "google":
            return generateGoogleEmbeddings(texts, config);
        default:
            throw new Error(`Unsupported embedding provider: ${provider}`);
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get dimensions for a known model
 */
export function getModelDimensions(model: string): number {
    const dimensionsByModel: Record<string, number> = {
        // OpenAI
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
        // Cohere
        "embed-english-v3.0": 1024,
        "embed-multilingual-v3.0": 1024,
        "embed-english-light-v3.0": 384,
        // Google
        "text-embedding-004": 768,
        "embedding-001": 768
    };

    return dimensionsByModel[model] || 1536;
}

/**
 * Estimate embedding cost (OpenAI only)
 */
export function estimateCost(totalTokens: number, model: string): number {
    const pricePerMillion: Record<string, number> = {
        "text-embedding-3-small": 0.02,
        "text-embedding-3-large": 0.13,
        "text-embedding-ada-002": 0.1
    };

    const price = pricePerMillion[model] || 0.02;
    return (totalTokens / 1_000_000) * price;
}
