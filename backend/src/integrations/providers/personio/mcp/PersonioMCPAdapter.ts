import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { PersonioClient } from "../client/PersonioClient";
import { executeCreateAbsence } from "../operations/createAbsence";
import { executeCreateAttendance } from "../operations/createAttendance";
import { executeCreateEmployee } from "../operations/createEmployee";
import { executeGetAbsenceBalance } from "../operations/getAbsenceBalance";
import { executeGetEmployee } from "../operations/getEmployee";
import { executeListAbsences } from "../operations/listAbsences";
import { executeListAttendances } from "../operations/listAttendances";
import { executeListEmployees } from "../operations/listEmployees";
import { executeUpdateEmployee } from "../operations/updateEmployee";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Personio MCP Adapter - wraps operations as MCP tools
 */
export class PersonioMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `personio_${op.id}`,
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
        client: PersonioClient
    ): Promise<unknown> {
        // Remove "personio_" prefix to get operation ID
        const operationId = toolName.replace(/^personio_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listEmployees":
                return await executeListEmployees(client, params as never);
            case "getEmployee":
                return await executeGetEmployee(client, params as never);
            case "createEmployee":
                return await executeCreateEmployee(client, params as never);
            case "updateEmployee":
                return await executeUpdateEmployee(client, params as never);
            case "listAbsences":
                return await executeListAbsences(client, params as never);
            case "createAbsence":
                return await executeCreateAbsence(client, params as never);
            case "getAbsenceBalance":
                return await executeGetAbsenceBalance(client, params as never);
            case "listAttendances":
                return await executeListAttendances(client, params as never);
            case "createAttendance":
                return await executeCreateAttendance(client, params as never);
            default:
                throw new Error(`Unknown Personio operation: ${operationId}`);
        }
    }
}
