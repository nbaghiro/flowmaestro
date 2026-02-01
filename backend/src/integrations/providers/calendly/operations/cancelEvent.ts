import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Cancel Event operation schema
 */
export const cancelEventSchema = z.object({
    uuid: z.string().describe("Scheduled event UUID to cancel"),
    reason: z.string().optional().describe("Cancellation reason")
});

export type CancelEventParams = z.infer<typeof cancelEventSchema>;

/**
 * Cancel Event operation definition
 */
export const cancelEventOperation: OperationDefinition = (() => {
    try {
        return {
            id: "cancelEvent",
            name: "Cancel Event",
            description: "Cancel a scheduled event",
            category: "scheduling",
            actionType: "write",
            inputSchema: cancelEventSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create cancelEventOperation"
        );
        throw new Error(
            `Failed to create cancelEvent operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute cancel event operation
 */
export async function executeCancelEvent(
    client: CalendlyClient,
    params: CancelEventParams
): Promise<OperationResult> {
    try {
        await client.cancelEvent(params.uuid, params.reason);

        return {
            success: true,
            data: {
                canceled: true,
                eventUuid: params.uuid,
                reason: params.reason || null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel event",
                retryable: false
            }
        };
    }
}
