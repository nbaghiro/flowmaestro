import { OAuth2TokenData } from "../../storage/models/Connection";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { oauthService } from "./OAuthService";
import { createServiceLogger } from "../../core/logging";

const connectionRepo = new ConnectionRepository();
const logger = createServiceLogger("TokenRefreshService");

/**
 * Get OAuth access token, automatically refreshing if needed
 *
 * This is the PRIMARY function that node executors should use
 * to get OAuth tokens. It handles:
 * - Token expiry checking
 * - Automatic refresh before expiry
 * - Database updates
 * - Usage tracking
 *
 * @param connectionId - The connection ID to get token for
 * @returns Valid access token
 * @throws Error if connection not found or refresh fails
 */
export async function getAccessToken(connectionId: string): Promise<string> {
    const connection = await connectionRepo.findByIdWithData(connectionId);

    if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
    }

    if (connection.connection_method !== "oauth2") {
        throw new Error(
            `Connection ${connectionId} is not an OAuth token (method: ${connection.connection_method})`
        );
    }

    const tokenData = connection.data as OAuth2TokenData;

    if (!tokenData.access_token) {
        throw new Error(`Connection ${connectionId} is missing access_token`);
    }

    // Check if token is expiring soon (within 5 minutes)
    const needsRefresh = connectionRepo.isExpired(connection);

    if (needsRefresh && tokenData.refresh_token) {
        logger.info({ connectionId }, "Token expiring soon, refreshing...");

        try {
            // Refresh the token
            const newTokens = await oauthService.refreshAccessToken(
                connection.provider,
                tokenData.refresh_token
            );

            logger.info({ connectionId }, "Successfully refreshed token");

            // Update in database
            await connectionRepo.updateTokens(connectionId, newTokens);

            // Mark as used
            await connectionRepo.markAsUsed(connectionId);

            return newTokens.access_token;
        } catch (error) {
            logger.error({ connectionId, err: error }, "Failed to refresh token");

            // Mark connection as expired
            await connectionRepo.updateStatus(connectionId, "expired");

            throw new Error(
                `Failed to refresh OAuth token: ${error instanceof Error ? error.message : "Unknown error"}. ` +
                    `Please reconnect your ${connection.provider} account.`
            );
        }
    }

    // Token is still valid, just mark as used
    await connectionRepo.markAsUsed(connectionId);

    return tokenData.access_token;
}

/**
 * Get OAuth token data with provider info
 * Useful when you need more than just the access token
 */
export async function getTokenData(connectionId: string) {
    const accessToken = await getAccessToken(connectionId);
    const connection = await connectionRepo.findById(connectionId);

    return {
        accessToken,
        provider: connection!.provider,
        accountInfo: connection!.metadata.account_info
    };
}

/**
 * Check if a connection needs refreshing
 * Can be used for background jobs or monitoring
 */
export async function checkIfNeedsRefresh(connectionId: string): Promise<boolean> {
    const connection = await connectionRepo.findById(connectionId);

    if (!connection || connection.connection_method !== "oauth2") {
        return false;
    }

    return connectionRepo.isExpired(connection);
}

/**
 * Background job: Refresh all expiring OAuth tokens
 *
 * This can be run as a cron job to proactively refresh tokens
 * before they expire, preventing execution failures.
 *
 * Recommended: Run every hour
 */
export async function refreshExpiringTokens(userId?: string): Promise<{
    refreshed: number;
    failed: number;
    errors: Array<{ connectionId: string; error: string }>;
}> {
    logger.info("Starting background token refresh job...");

    const results = {
        refreshed: 0,
        failed: 0,
        errors: [] as Array<{ connectionId: string; error: string }>
    };

    try {
        // If userId provided, only refresh that user's tokens
        // Otherwise would need to iterate all users (not implemented here)
        if (!userId) {
            logger.info("No userId provided, skipping");
            return results;
        }

        // Get expiring connections for user
        const expiringConnections = await connectionRepo.findExpiringSoon(userId);

        logger.info({ count: expiringConnections.length, userId }, "Found expiring connections");

        for (const connection of expiringConnections) {
            try {
                // Trigger refresh by calling getAccessToken
                await getAccessToken(connection.id);
                results.refreshed++;
                logger.info({ connectionId: connection.id }, "Successfully refreshed connection");
            } catch (error) {
                results.failed++;
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                results.errors.push({
                    connectionId: connection.id,
                    error: errorMessage
                });
                logger.error({ connectionId: connection.id, err: error }, "Failed to refresh connection");
            }
        }

        logger.info({ refreshed: results.refreshed, failed: results.failed }, "Job complete");

        return results;
    } catch (error) {
        logger.error({ err: error }, "Background job failed");
        throw error;
    }
}

/**
 * Force refresh a token regardless of expiry status
 * Useful for testing or manual refresh
 */
export async function forceRefreshToken(connectionId: string): Promise<void> {
    const connection = await connectionRepo.findByIdWithData(connectionId);

    if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
    }

    if (connection.connection_method !== "oauth2") {
        throw new Error(`Connection ${connectionId} is not an OAuth token`);
    }

    const tokenData = connection.data as OAuth2TokenData;

    if (!tokenData.refresh_token) {
        throw new Error(`Connection ${connectionId} does not have a refresh token`);
    }

    logger.info({ connectionId }, "Force refreshing token");

    const newTokens = await oauthService.refreshAccessToken(
        connection.provider,
        tokenData.refresh_token
    );

    await connectionRepo.updateTokens(connectionId, newTokens);
    logger.info({ connectionId }, "Force refresh successful");
}
