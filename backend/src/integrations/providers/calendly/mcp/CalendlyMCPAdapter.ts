import { CalendlyClient } from "../client/CalendlyClient";
import { executeCancelEvent } from "../operations/cancelEvent";
import { executeGetAvailability } from "../operations/getAvailability";
import { executeGetCurrentUser } from "../operations/getCurrentUser";
import { executeGetEventType } from "../operations/getEventType";
import { executeGetScheduledEvent } from "../operations/getScheduledEvent";
import { executeListEventInvitees } from "../operations/listEventInvitees";
import { executeListEventTypes } from "../operations/listEventTypes";
import { executeListScheduledEvents } from "../operations/listScheduledEvents";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Calendly MCP Adapter - wraps operations as MCP tools
 */
export class CalendlyMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `calendly_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON,
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: CalendlyClient
    ): Promise<unknown> {
        // Remove "calendly_" prefix to get operation ID
        const operationId = toolName.replace(/^calendly_/, "");

        // Route to operation executor
        switch (operationId) {
            case "getCurrentUser":
                return await executeGetCurrentUser(client, params as never);
            case "listEventTypes":
                return await executeListEventTypes(client, params as never);
            case "getEventType":
                return await executeGetEventType(client, params as never);
            case "listScheduledEvents":
                return await executeListScheduledEvents(client, params as never);
            case "getScheduledEvent":
                return await executeGetScheduledEvent(client, params as never);
            case "listEventInvitees":
                return await executeListEventInvitees(client, params as never);
            case "cancelEvent":
                return await executeCancelEvent(client, params as never);
            case "getAvailability":
                return await executeGetAvailability(client, params as never);
            default:
                throw new Error(`Unknown Calendly operation: ${operationId}`);
        }
    }
}
