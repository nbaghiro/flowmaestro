import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseCall } from "../types";

/**
 * Log Call Parameters
 */
export const logCallSchema = z.object({
    lead_id: z.string().describe("Lead ID for the call (required)"),
    contact_id: z.string().optional().describe("Contact ID for the call"),
    direction: z.enum(["inbound", "outbound"]).describe("Call direction (required)"),
    phone: z.string().optional().describe("Phone number called"),
    duration: z.number().int().min(0).optional().describe("Call duration in seconds"),
    note: z.string().optional().describe("Call notes"),
    disposition: z.string().optional().describe("Call disposition/outcome"),
    status: z.enum(["completed", "no-answer", "busy", "failed"]).optional().describe("Call status")
});

export type LogCallParams = z.infer<typeof logCallSchema>;

/**
 * Operation Definition
 */
export const logCallOperation: OperationDefinition = {
    id: "logCall",
    name: "Log Call",
    description: "Log a call activity",
    category: "communication",
    inputSchema: logCallSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Log Call
 */
export async function executeLogCall(
    client: CloseClient,
    params: LogCallParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseCall>("/activity/call/", params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to log call",
                retryable: false
            }
        };
    }
}
