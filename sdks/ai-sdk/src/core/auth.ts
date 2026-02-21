/**
 * API key resolution for multi-tenant auth
 */

import { AuthenticationError } from "./errors";
import type { AIProvider, ProviderConfig, AuthResolver, AILogger } from "../types";

/**
 * Environment variable mapping for providers
 */
export const PROVIDER_ENV_VARS: Record<AIProvider, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
    cohere: "COHERE_API_KEY",
    huggingface: "HUGGINGFACE_API_KEY",
    replicate: "REPLICATE_API_KEY",
    stabilityai: "STABILITY_API_KEY",
    fal: "FAL_API_KEY",
    runway: "RUNWAY_API_KEY",
    luma: "LUMA_API_KEY",
    elevenlabs: "ELEVENLABS_API_KEY",
    deepgram: "DEEPGRAM_API_KEY",
    xai: "XAI_API_KEY"
};

/**
 * Resolve API key for a provider
 *
 * Priority:
 * 1. Custom auth resolver (for connection-based auth)
 * 2. Provider config apiKey
 * 3. Environment variable
 */
export async function resolveApiKey(
    provider: AIProvider,
    connectionId: string | undefined,
    customResolver: AuthResolver | undefined,
    providerConfigs: Partial<Record<AIProvider, ProviderConfig>>,
    logger?: AILogger
): Promise<string> {
    // 1. Try custom auth resolver (connection-based auth)
    if (customResolver && connectionId) {
        try {
            const apiKey = await customResolver(provider, connectionId);
            if (apiKey) {
                logger?.debug("Using connection-based API key", {
                    provider,
                    connectionId
                });
                return apiKey;
            }
        } catch (error) {
            logger?.warn("Custom auth resolver failed, falling back", {
                provider,
                connectionId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    // 2. Try provider config
    const providerConfig = providerConfigs[provider];
    if (providerConfig?.apiKey) {
        logger?.debug("Using configured API key", { provider });
        return providerConfig.apiKey;
    }

    // 3. Try environment variable
    const envVar = PROVIDER_ENV_VARS[provider];
    const envApiKey = process.env[envVar];
    if (envApiKey) {
        logger?.debug("Using environment variable API key", { provider, envVar });
        return envApiKey;
    }

    // No API key found
    throw new AuthenticationError(
        provider,
        `No API key available for ${provider}. ` +
            `Either provide a connectionId, configure providers.${provider}.apiKey, ` +
            `or set the ${envVar} environment variable.`
    );
}

/**
 * Check if a provider has an API key configured
 */
export function hasApiKey(
    provider: AIProvider,
    providerConfigs: Partial<Record<AIProvider, ProviderConfig>>
): boolean {
    // Check provider config
    const providerConfig = providerConfigs[provider];
    if (providerConfig?.apiKey) {
        return true;
    }

    // Check environment variable
    const envVar = PROVIDER_ENV_VARS[provider];
    return !!process.env[envVar];
}

/**
 * Get list of providers that have API keys configured
 */
export function getConfiguredProviders(
    providerConfigs: Partial<Record<AIProvider, ProviderConfig>>
): AIProvider[] {
    const allProviders: AIProvider[] = [
        "openai",
        "anthropic",
        "google",
        "cohere",
        "huggingface",
        "replicate",
        "stabilityai",
        "fal",
        "runway",
        "luma",
        "elevenlabs",
        "xai"
    ];

    return allProviders.filter((provider) => hasApiKey(provider, providerConfigs));
}
