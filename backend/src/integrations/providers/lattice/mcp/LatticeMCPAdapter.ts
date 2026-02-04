import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { LatticeClient } from "../client/LatticeClient";
import { executeCreateGoal } from "../operations/createGoal";
import { executeGetGoal } from "../operations/getGoal";
import { executeGetUser } from "../operations/getUser";
import { executeListDepartments } from "../operations/listDepartments";
import { executeListGoals } from "../operations/listGoals";
import { executeListReviewCycles } from "../operations/listReviewCycles";
import { executeListUsers } from "../operations/listUsers";
import { executeUpdateGoal } from "../operations/updateGoal";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Lattice MCP Adapter - wraps operations as MCP tools
 */
export class LatticeMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `lattice_${op.id}`,
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
        client: LatticeClient
    ): Promise<unknown> {
        // Remove "lattice_" prefix to get operation ID
        const operationId = toolName.replace(/^lattice_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listUsers":
                return await executeListUsers(client, params as never);
            case "getUser":
                return await executeGetUser(client, params as never);
            case "listGoals":
                return await executeListGoals(client, params as never);
            case "getGoal":
                return await executeGetGoal(client, params as never);
            case "createGoal":
                return await executeCreateGoal(client, params as never);
            case "updateGoal":
                return await executeUpdateGoal(client, params as never);
            case "listReviewCycles":
                return await executeListReviewCycles(client, params as never);
            case "listDepartments":
                return await executeListDepartments(client, params as never);
            default:
                throw new Error(`Unknown Lattice operation: ${operationId}`);
        }
    }
}
