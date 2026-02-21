/**
 * FlowMaestro Integration Layer for AI SDK
 *
 * Provides FlowMaestro-specific factory functions with built-in
 * connection-based authentication and logging.
 */

import { AIClient } from "@flowmaestro/ai-sdk";
import type { AIProvider, AuthResolver, ProviderConfig } from "@flowmaestro/ai-sdk";
import { isApiKeyData, isOAuth2TokenData } from "../storage/models/Connection";
import { ConnectionRepository } from "../storage/repositories/ConnectionRepository";
import { config } from "./config";
import { createServiceLogger } from "./logging";

const logger = createServiceLogger("AIService");

/**
 * Map of provider names to config key names
 */
const PROVIDER_CONFIG_MAP: Record<string, keyof typeof config.ai> = {
    openai: "openai",
    anthropic: "anthropic",
    google: "google",
    cohere: "cohere",
    huggingface: "huggingface",
    elevenlabs: "elevenlabs",
    deepgram: "deepgram",
    stabilityai: "stabilityai",
    replicate: "replicate",
    runway: "runway",
    luma: "luma",
    fal: "fal"
};

/**
 * FlowMaestro auth resolver - resolves connection IDs to API keys
 */
const flowMaestroAuthResolver: AuthResolver = async (
    provider: AIProvider,
    connectionId?: string
): Promise<string | null> => {
    if (!connectionId) {
        return null;
    }

    try {
        const connectionRepo = new ConnectionRepository();
        const connection = await connectionRepo.findByIdWithData(connectionId);

        if (!connection) {
            logger.warn({ connectionId }, "Connection not found for API key resolution");
            return null;
        }

        if (connection.status !== "active") {
            logger.warn({ connectionId, status: connection.status }, "Connection is not active");
            return null;
        }

        // Extract API key from connection data
        if (isApiKeyData(connection.data)) {
            await connectionRepo.markAsUsed(connectionId);
            logger.debug({ provider, connectionId }, "Using API key from connection");
            return connection.data.api_key;
        }

        // For OAuth connections, return the access token
        if (isOAuth2TokenData(connection.data)) {
            await connectionRepo.markAsUsed(connectionId);
            logger.debug({ provider, connectionId }, "Using access token from OAuth connection");
            return connection.data.access_token;
        }

        logger.warn(
            { connectionId, connectionMethod: connection.connection_method },
            "Connection data does not contain API key or access token"
        );
        return null;
    } catch (error) {
        logger.error(
            {
                connectionId,
                err: error instanceof Error ? error : new Error(String(error))
            },
            "Failed to retrieve connection for API key resolution"
        );
        return null;
    }
};

/**
 * Build provider configuration from environment variables
 */
function buildProvidersConfig(): Partial<Record<AIProvider, ProviderConfig>> {
    const providers: Partial<Record<AIProvider, ProviderConfig>> = {};

    for (const [providerName, configKey] of Object.entries(PROVIDER_CONFIG_MAP)) {
        const apiKey = config.ai[configKey]?.apiKey;
        if (apiKey) {
            providers[providerName as AIProvider] = { apiKey };
        }
    }

    return providers;
}

/**
 * Singleton AIClient instance
 */
let aiClientInstance: AIClient | null = null;

/**
 * Get the AIClient singleton
 *
 * This is the primary way to access AI capabilities in FlowMaestro.
 * The client is pre-configured with:
 * - All configured provider API keys from environment variables
 * - Connection-based auth resolver for multi-tenant support
 *
 * @example
 * ```typescript
 * import { getAIClient } from "../core/ai";
 *
 * const ai = getAIClient();
 *
 * const response = await ai.text.complete({
 *   provider: "openai",
 *   model: "gpt-4.1",
 *   prompt: "Hello, world!",
 *   connectionId: userConnectionId // Optional - uses env var if not provided
 * });
 * ```
 */
export function getAIClient(): AIClient {
    if (!aiClientInstance) {
        logger.info("Initializing AIClient");

        aiClientInstance = new AIClient({
            providers: buildProvidersConfig(),
            authResolver: flowMaestroAuthResolver,
            debug: config.env === "development",
            logger: {
                debug: (message: string, context?: Record<string, unknown>) =>
                    logger.debug(context ?? {}, message),
                info: (message: string, context?: Record<string, unknown>) =>
                    logger.info(context ?? {}, message),
                warn: (message: string, context?: Record<string, unknown>) =>
                    logger.warn(context ?? {}, message),
                error: (message: string, _error?: Error, context?: Record<string, unknown>) =>
                    logger.error(context ?? {}, message)
            }
        });

        logger.info(
            { availableProviders: aiClientInstance.getAvailableProviders() },
            "AIClient initialized"
        );
    }

    return aiClientInstance;
}

/**
 * Reset the AI client singleton (useful for testing)
 */
export function resetAIClient(): void {
    aiClientInstance = null;
}

/**
 * Create a new AIClient with custom configuration
 *
 * @param customProviders - Additional or override provider configurations
 */
export function createAIClient(
    customProviders?: Partial<Record<AIProvider, ProviderConfig>>
): AIClient {
    return new AIClient({
        providers: {
            ...buildProvidersConfig(),
            ...customProviders
        },
        authResolver: flowMaestroAuthResolver,
        debug: config.env === "development",
        logger: {
            debug: (message: string, context?: Record<string, unknown>) =>
                logger.debug(context ?? {}, message),
            info: (message: string, context?: Record<string, unknown>) =>
                logger.info(context ?? {}, message),
            warn: (message: string, context?: Record<string, unknown>) =>
                logger.warn(context ?? {}, message),
            error: (message: string, _error?: Error, context?: Record<string, unknown>) =>
                logger.error(context ?? {}, message)
        }
    });
}
