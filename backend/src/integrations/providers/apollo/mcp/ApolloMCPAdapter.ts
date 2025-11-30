import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

/**
 * Apollo MCP Adapter
 * Wraps Apollo operations as MCP tools for use in workflows
 */
export class ApolloMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `apollo_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: ApolloClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace(/^apollo_/, "");
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

        // Import and execute the appropriate operation
        const { executeSearchPeople } = await import("../operations/searchPeople");
        const { executeSearchOrganizations } = await import("../operations/searchOrganizations");
        const { executeEnrichPerson } = await import("../operations/enrichPerson");
        const { executeEnrichOrganization } = await import("../operations/enrichOrganization");
        const { executeCreateContact } = await import("../operations/createContact");
        const { executeGetContact } = await import("../operations/getContact");
        const { executeUpdateContact } = await import("../operations/updateContact");
        const { executeDeleteContact } = await import("../operations/deleteContact");
        const { executeCreateAccount } = await import("../operations/createAccount");
        const { executeGetAccount } = await import("../operations/getAccount");
        const { executeUpdateAccount } = await import("../operations/updateAccount");
        const { executeDeleteAccount } = await import("../operations/deleteAccount");

        switch (operationId) {
            case "searchPeople":
                return await executeSearchPeople(client, params as never);
            case "searchOrganizations":
                return await executeSearchOrganizations(client, params as never);
            case "enrichPerson":
                return await executeEnrichPerson(client, params as never);
            case "enrichOrganization":
                return await executeEnrichOrganization(client, params as never);
            case "createContact":
                return await executeCreateContact(client, params as never);
            case "getContact":
                return await executeGetContact(client, params as never);
            case "updateContact":
                return await executeUpdateContact(client, params as never);
            case "deleteContact":
                return await executeDeleteContact(client, params as never);
            case "createAccount":
                return await executeCreateAccount(client, params as never);
            case "getAccount":
                return await executeGetAccount(client, params as never);
            case "updateAccount":
                return await executeUpdateAccount(client, params as never);
            case "deleteAccount":
                return await executeDeleteAccount(client, params as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unimplemented operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
