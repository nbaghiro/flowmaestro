import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { InsightlyClient } from "../client/InsightlyClient";
// Contact operations
import { executeCreateContact } from "../operations/contacts/createContact";
import { executeDeleteContact } from "../operations/contacts/deleteContact";
import { executeGetContact } from "../operations/contacts/getContact";
import { executeListContacts } from "../operations/contacts/listContacts";
import { executeUpdateContact } from "../operations/contacts/updateContact";
// Organisation operations
// Lead operations
import { executeCreateLead } from "../operations/leads/createLead";
import { executeDeleteLead } from "../operations/leads/deleteLead";
import { executeGetLead } from "../operations/leads/getLead";
import { executeListLeads } from "../operations/leads/listLeads";
import { executeUpdateLead } from "../operations/leads/updateLead";
// Opportunity operations
import { executeCreateOpportunity } from "../operations/opportunities/createOpportunity";
import { executeDeleteOpportunity } from "../operations/opportunities/deleteOpportunity";
import { executeGetOpportunity } from "../operations/opportunities/getOpportunity";
import { executeListOpportunities } from "../operations/opportunities/listOpportunities";
import { executeUpdateOpportunity } from "../operations/opportunities/updateOpportunity";
import { executeCreateOrganisation } from "../operations/organisations/createOrganisation";
import { executeDeleteOrganisation } from "../operations/organisations/deleteOrganisation";
import { executeGetOrganisation } from "../operations/organisations/getOrganisation";
import { executeListOrganisations } from "../operations/organisations/listOrganisations";
import { executeUpdateOrganisation } from "../operations/organisations/updateOrganisation";
// Task operations
import { executeCreateTask } from "../operations/tasks/createTask";
import { executeDeleteTask } from "../operations/tasks/deleteTask";
import { executeGetTask } from "../operations/tasks/getTask";
import { executeListTasks } from "../operations/tasks/listTasks";
import { executeUpdateTask } from "../operations/tasks/updateTask";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Insightly MCP Adapter - wraps operations as MCP tools
 */
export class InsightlyMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `insightly_${op.id}`,
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
        client: InsightlyClient
    ): Promise<unknown> {
        // Remove "insightly_" prefix to get operation ID
        const operationId = toolName.replace(/^insightly_/, "");

        // Route to operation executor
        switch (operationId) {
            // Contact operations
            case "listContacts":
                return await executeListContacts(client, params as never);
            case "getContact":
                return await executeGetContact(client, params as never);
            case "createContact":
                return await executeCreateContact(client, params as never);
            case "updateContact":
                return await executeUpdateContact(client, params as never);
            case "deleteContact":
                return await executeDeleteContact(client, params as never);
            // Organisation operations
            case "listOrganisations":
                return await executeListOrganisations(client, params as never);
            case "getOrganisation":
                return await executeGetOrganisation(client, params as never);
            case "createOrganisation":
                return await executeCreateOrganisation(client, params as never);
            case "updateOrganisation":
                return await executeUpdateOrganisation(client, params as never);
            case "deleteOrganisation":
                return await executeDeleteOrganisation(client, params as never);
            // Lead operations
            case "listLeads":
                return await executeListLeads(client, params as never);
            case "getLead":
                return await executeGetLead(client, params as never);
            case "createLead":
                return await executeCreateLead(client, params as never);
            case "updateLead":
                return await executeUpdateLead(client, params as never);
            case "deleteLead":
                return await executeDeleteLead(client, params as never);
            // Opportunity operations
            case "listOpportunities":
                return await executeListOpportunities(client, params as never);
            case "getOpportunity":
                return await executeGetOpportunity(client, params as never);
            case "createOpportunity":
                return await executeCreateOpportunity(client, params as never);
            case "updateOpportunity":
                return await executeUpdateOpportunity(client, params as never);
            case "deleteOpportunity":
                return await executeDeleteOpportunity(client, params as never);
            // Task operations
            case "listTasks":
                return await executeListTasks(client, params as never);
            case "getTask":
                return await executeGetTask(client, params as never);
            case "createTask":
                return await executeCreateTask(client, params as never);
            case "updateTask":
                return await executeUpdateTask(client, params as never);
            case "deleteTask":
                return await executeDeleteTask(client, params as never);
            default:
                throw new Error(`Unknown Insightly operation: ${operationId}`);
        }
    }
}
