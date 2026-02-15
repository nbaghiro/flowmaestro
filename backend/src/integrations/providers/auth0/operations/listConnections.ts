import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { Auth0Client } from "../client/Auth0Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Connections operation schema
 */
export const listConnectionsSchema = z.object({
    page: z.number().min(0).optional().describe("Page number (zero-indexed)"),
    perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of connections per page (max 100, default 50)"),
    strategy: z.string().optional().describe("Filter by connection strategy (e.g., auth0, google-oauth2)"),
    includeTotals: z.boolean().optional().describe("Include total count in response (default true)")
});

export type ListConnectionsParams = z.infer<typeof listConnectionsSchema>;

/**
 * List Connections operation definition
 */
export const listConnectionsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listConnections",
            name: "List Connections",
            description: "List all connections in the Auth0 tenant",
            category: "connections",
            inputSchema: listConnectionsSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Auth0", err: error }, "Failed to create listConnectionsOperation");
        throw new Error(
            `Failed to create listConnections operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list connections operation
 */
export async function executeListConnections(
    client: Auth0Client,
    params: ListConnectionsParams
): Promise<OperationResult> {
    try {
        const response = await client.listConnections({
            page: params.page,
            per_page: params.perPage,
            include_totals: params.includeTotals,
            strategy: params.strategy
        });

        const connections = response.connections.map((conn) => ({
            id: conn.id,
            name: conn.name,
            strategy: conn.strategy,
            enabledClients: conn.enabled_clients
        }));

        return {
            success: true,
            data: {
                connections,
                total: response.total,
                page: params.page || 0,
                perPage: params.perPage || 50
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list connections",
                retryable: true
            }
        };
    }
}
