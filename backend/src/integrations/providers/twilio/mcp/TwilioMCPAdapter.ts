import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Messaging Operations
    executeSendSms,
    executeListMessages,
    executeGetMessage,
    executeDeleteMessage,
    // Lookup Operations
    executeLookupPhoneNumber,
    // Phone Number Operations
    executeListPhoneNumbers,
    executeGetPhoneNumber
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

/**
 * Twilio MCP Adapter
 *
 * Converts Twilio operations into MCP tools for AI agents
 */
export class TwilioMCPAdapter {
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
                name: `twilio_${id}`,
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
        client: TwilioClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("twilio_", "");

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
            // Messaging Operations
            case "sendSms":
                return executeSendSms(client, params as never);
            case "listMessages":
                return executeListMessages(client, params as never);
            case "getMessage":
                return executeGetMessage(client, params as never);
            case "deleteMessage":
                return executeDeleteMessage(client, params as never);

            // Lookup Operations
            case "lookupPhoneNumber":
                return executeLookupPhoneNumber(client, params as never);

            // Phone Number Operations
            case "listPhoneNumbers":
                return executeListPhoneNumbers(client, params as never);
            case "getPhoneNumber":
                return executeGetPhoneNumber(client, params as never);

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
