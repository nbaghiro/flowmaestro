import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { CopperClient } from "../client/CopperClient";
// Company operations
import { executeCreateCompany } from "../operations/companies/createCompany";
import { executeDeleteCompany } from "../operations/companies/deleteCompany";
import { executeGetCompany } from "../operations/companies/getCompany";
import { executeListCompanies } from "../operations/companies/listCompanies";
import { executeUpdateCompany } from "../operations/companies/updateCompany";
// Lead operations
import { executeCreateLead } from "../operations/leads/createLead";
import { executeDeleteLead } from "../operations/leads/deleteLead";
import { executeGetLead } from "../operations/leads/getLead";
import { executeListLeads } from "../operations/leads/listLeads";
import { executeSearchLeads } from "../operations/leads/searchLeads";
import { executeUpdateLead } from "../operations/leads/updateLead";
// Opportunity operations
import { executeCreateOpportunity } from "../operations/opportunities/createOpportunity";
import { executeDeleteOpportunity } from "../operations/opportunities/deleteOpportunity";
import { executeGetOpportunity } from "../operations/opportunities/getOpportunity";
import { executeListOpportunities } from "../operations/opportunities/listOpportunities";
import { executeUpdateOpportunity } from "../operations/opportunities/updateOpportunity";
// People operations
import { executeCreatePerson } from "../operations/people/createPerson";
import { executeDeletePerson } from "../operations/people/deletePerson";
import { executeGetPerson } from "../operations/people/getPerson";
import { executeListPeople } from "../operations/people/listPeople";
import { executeUpdatePerson } from "../operations/people/updatePerson";
// Task operations
import { executeCreateTask } from "../operations/tasks/createTask";
import { executeGetTask } from "../operations/tasks/getTask";
import { executeListTasks } from "../operations/tasks/listTasks";
import { executeUpdateTask } from "../operations/tasks/updateTask";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Copper MCP Adapter - wraps operations as MCP tools
 */
export class CopperMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `copper_${op.id}`,
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
        client: CopperClient
    ): Promise<unknown> {
        // Remove "copper_" prefix to get operation ID
        const operationId = toolName.replace(/^copper_/, "");

        // Route to operation executor
        switch (operationId) {
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
            case "searchLeads":
                return await executeSearchLeads(client, params as never);
            // People operations
            case "listPeople":
                return await executeListPeople(client, params as never);
            case "getPerson":
                return await executeGetPerson(client, params as never);
            case "createPerson":
                return await executeCreatePerson(client, params as never);
            case "updatePerson":
                return await executeUpdatePerson(client, params as never);
            case "deletePerson":
                return await executeDeletePerson(client, params as never);
            // Company operations
            case "listCompanies":
                return await executeListCompanies(client, params as never);
            case "getCompany":
                return await executeGetCompany(client, params as never);
            case "createCompany":
                return await executeCreateCompany(client, params as never);
            case "updateCompany":
                return await executeUpdateCompany(client, params as never);
            case "deleteCompany":
                return await executeDeleteCompany(client, params as never);
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
            default:
                throw new Error(`Unknown Copper operation: ${operationId}`);
        }
    }
}
