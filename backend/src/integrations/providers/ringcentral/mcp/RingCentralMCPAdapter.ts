import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // SMS/MMS Operations
    executeSendSms,
    executeSendMms,
    executeListMessages,
    // Voice Operations
    executeMakeCall,
    executeCancelCall,
    executeGetCallLogs,
    executeListVoicemails,
    // Team Messaging Operations
    executeSendTeamMessage,
    executeListChats,
    // Meeting Operations
    executeScheduleMeeting
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

/**
 * RingCentral MCP Adapter
 *
 * Converts RingCentral operations into MCP tools for AI agents
 */
export class RingCentralMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `ringcentral_${id}`,
                description: operation.description,
                inputSchema: toJSONSchema(operation.inputSchema)
            });
        }

        return tools;
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: RingCentralClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("ringcentral_", "");

        const operation = this.operations.get(operationId);
        if (!operation) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Unknown MCP tool: ${toolName}`,
                    retryable: false
                }
            };
        }

        // Validate parameters using the operation's schema
        try {
            operation.inputSchema.parse(params);
        } catch (error) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: error instanceof Error ? error.message : "Invalid parameters",
                    retryable: false
                }
            };
        }

        // Route to appropriate operation executor
        switch (operationId) {
            // SMS/MMS Operations
            case "sendSms":
                return executeSendSms(client, params as never);
            case "sendMms":
                return executeSendMms(client, params as never);
            case "listMessages":
                return executeListMessages(client, params as never);

            // Voice Operations
            case "makeCall":
                return executeMakeCall(client, params as never);
            case "cancelCall":
                return executeCancelCall(client, params as never);
            case "getCallLogs":
                return executeGetCallLogs(client, params as never);
            case "listVoicemails":
                return executeListVoicemails(client, params as never);

            // Team Messaging Operations
            case "sendTeamMessage":
                return executeSendTeamMessage(client, params as never);
            case "listChats":
                return executeListChats(client, params as never);

            // Meeting Operations
            case "scheduleMeeting":
                return executeScheduleMeeting(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
