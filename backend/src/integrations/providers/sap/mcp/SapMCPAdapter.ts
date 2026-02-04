import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { SapClient } from "../client/SapClient";
import { executeCreateBusinessPartner } from "../operations/createBusinessPartner";
import { executeCreatePurchaseOrder } from "../operations/createPurchaseOrder";
import { executeCreateSalesOrder } from "../operations/createSalesOrder";
import { executeGetBusinessPartner } from "../operations/getBusinessPartner";
import { executeGetInvoice } from "../operations/getInvoice";
import { executeGetMaterial } from "../operations/getMaterial";
import { executeGetPurchaseOrder } from "../operations/getPurchaseOrder";
import { executeGetSalesOrder } from "../operations/getSalesOrder";
import { executeListBusinessPartners } from "../operations/listBusinessPartners";
import { executeListInvoices } from "../operations/listInvoices";
import { executeListMaterials } from "../operations/listMaterials";
import { executeListPurchaseOrders } from "../operations/listPurchaseOrders";
import { executeListSalesOrders } from "../operations/listSalesOrders";
import { executeUpdateBusinessPartner } from "../operations/updateBusinessPartner";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * SAP MCP Adapter - wraps operations as MCP tools
 */
export class SapMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `sap_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: SapClient
    ): Promise<unknown> {
        const operationId = toolName.replace(/^sap_/, "");

        switch (operationId) {
            case "listBusinessPartners":
                return await executeListBusinessPartners(client, params as never);
            case "getBusinessPartner":
                return await executeGetBusinessPartner(client, params as never);
            case "createBusinessPartner":
                return await executeCreateBusinessPartner(client, params as never);
            case "updateBusinessPartner":
                return await executeUpdateBusinessPartner(client, params as never);
            case "listSalesOrders":
                return await executeListSalesOrders(client, params as never);
            case "getSalesOrder":
                return await executeGetSalesOrder(client, params as never);
            case "createSalesOrder":
                return await executeCreateSalesOrder(client, params as never);
            case "listPurchaseOrders":
                return await executeListPurchaseOrders(client, params as never);
            case "getPurchaseOrder":
                return await executeGetPurchaseOrder(client, params as never);
            case "createPurchaseOrder":
                return await executeCreatePurchaseOrder(client, params as never);
            case "listMaterials":
                return await executeListMaterials(client, params as never);
            case "getMaterial":
                return await executeGetMaterial(client, params as never);
            case "listInvoices":
                return await executeListInvoices(client, params as never);
            case "getInvoice":
                return await executeGetInvoice(client, params as never);
            default:
                throw new Error(`Unknown SAP operation: ${operationId}`);
        }
    }
}
