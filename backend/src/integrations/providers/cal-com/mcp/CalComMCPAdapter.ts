import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { CalComClient } from "../client/CalComClient";
import { executeCancelBooking } from "../operations/cancelBooking";
import { executeCreateBooking } from "../operations/createBooking";
import { executeGetAvailableSlots } from "../operations/getAvailableSlots";
import { executeGetBooking } from "../operations/getBooking";
import { executeGetCurrentUser } from "../operations/getCurrentUser";
import { executeGetEventType } from "../operations/getEventType";
import { executeListBookings } from "../operations/listBookings";
import { executeListEventTypes } from "../operations/listEventTypes";
import { executeListSchedules } from "../operations/listSchedules";
import { executeRescheduleBooking } from "../operations/rescheduleBooking";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Cal.com MCP Adapter - wraps operations as MCP tools
 */
export class CalComMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `calcom_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: CalComClient
    ): Promise<unknown> {
        // Remove "calcom_" prefix to get operation ID
        const operationId = toolName.replace(/^calcom_/, "");

        // Route to operation executor
        switch (operationId) {
            case "getCurrentUser":
                return await executeGetCurrentUser(client, params as never);
            case "listEventTypes":
                return await executeListEventTypes(client, params as never);
            case "getEventType":
                return await executeGetEventType(client, params as never);
            case "listBookings":
                return await executeListBookings(client, params as never);
            case "getBooking":
                return await executeGetBooking(client, params as never);
            case "createBooking":
                return await executeCreateBooking(client, params as never);
            case "cancelBooking":
                return await executeCancelBooking(client, params as never);
            case "rescheduleBooking":
                return await executeRescheduleBooking(client, params as never);
            case "getAvailableSlots":
                return await executeGetAvailableSlots(client, params as never);
            case "listSchedules":
                return await executeListSchedules(client, params as never);
            default:
                throw new Error(`Unknown Cal.com operation: ${operationId}`);
        }
    }
}
