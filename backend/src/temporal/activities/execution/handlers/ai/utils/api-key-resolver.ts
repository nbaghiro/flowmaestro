/**
 * API Key Resolver Utility
 *
 * Shared utility for resolving API keys from connections or environment variables.
 * Used by LLM, Embeddings, and other AI node handlers.
 */

import { ConnectionRepository } from "../../../../../../storage/repositories/ConnectionRepository";
import {
    ConfigurationError,
    NotFoundError,
    ValidationError,
    activityLogger
} from "../../../../../core";
import type { ApiKeyData } from "../../../../../../storage/models/Connection";

const connectionRepository = new ConnectionRepository();

/**
 * Resolve API key from connection or environment variable.
 *
 * Priority:
 * 1. If connectionId is provided, look up the connection and extract the API key
 * 2. Fall back to environment variable
 *
 * @param connectionId - Optional connection ID to look up
 * @param provider - Provider name (e.g., "openai", "anthropic", "cohere")
 * @param envVarName - Environment variable name to fall back to
 * @returns The API key string
 * @throws NotFoundError if connection not found
 * @throws ValidationError if connection provider doesn't match or connection is not active
 * @throws ConfigurationError if no API key found in connection or environment
 */
export async function getApiKey(
    connectionId: string | undefined,
    provider: string,
    envVarName: string
): Promise<string> {
    if (connectionId) {
        const connection = await connectionRepository.findByIdWithData(connectionId);
        if (!connection) {
            throw new NotFoundError("Connection", connectionId);
        }
        if (connection.provider !== provider) {
            throw new ValidationError(
                `expected ${provider}, got ${connection.provider}`,
                "provider"
            );
        }
        if (connection.status !== "active") {
            throw new ValidationError(
                `Connection is not active (status: ${connection.status})`,
                "status"
            );
        }
        const data = connection.data as ApiKeyData;
        if (!data.api_key) {
            throw new ConfigurationError("API key not found in connection data", "api_key");
        }
        activityLogger.info("Using connection for API key", {
            connectionName: connection.name,
            connectionId: connection.id
        });
        return data.api_key;
    }

    const apiKey = process.env[envVarName];
    if (!apiKey) {
        throw new ConfigurationError(
            `No connection provided and ${envVarName} environment variable is not set. ` +
                `Please add a connection in the Connections page or set the ${envVarName} environment variable.`,
            envVarName
        );
    }
    activityLogger.info("Using environment variable for API key", { envVarName });
    return apiKey;
}
