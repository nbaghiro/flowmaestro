import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { NetsuiteClient } from "../client/NetsuiteClient";
import { executeCreateCustomer } from "../operations/createCustomer";
import { executeCreateInvoice } from "../operations/createInvoice";
import { executeCreatePurchaseOrder } from "../operations/createPurchaseOrder";
import { executeCreateSalesOrder } from "../operations/createSalesOrder";
import { executeGetCustomer } from "../operations/getCustomer";
import { executeGetInvoice } from "../operations/getInvoice";
import { executeGetItem } from "../operations/getItem";
import { executeGetPurchaseOrder } from "../operations/getPurchaseOrder";
import { executeGetSalesOrder } from "../operations/getSalesOrder";
import { executeListCustomers } from "../operations/listCustomers";
import { executeListInvoices } from "../operations/listInvoices";
import { executeListItems } from "../operations/listItems";
import { executeListPurchaseOrders } from "../operations/listPurchaseOrders";
import { executeListSalesOrders } from "../operations/listSalesOrders";
import { executeUpdateCustomer } from "../operations/updateCustomer";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * NetSuite MCP Adapter - wraps operations as MCP tools
 */
export class NetsuiteMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `netsuite_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: NetsuiteClient
    ): Promise<unknown> {
        const operationId = toolName.replace(/^netsuite_/, "");

        switch (operationId) {
            case "listCustomers":
                return await executeListCustomers(client, params as never);
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "createCustomer":
                return await executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, params as never);
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
            case "listInvoices":
                return await executeListInvoices(client, params as never);
            case "getInvoice":
                return await executeGetInvoice(client, params as never);
            case "createInvoice":
                return await executeCreateInvoice(client, params as never);
            case "listItems":
                return await executeListItems(client, params as never);
            case "getItem":
                return await executeGetItem(client, params as never);
            default:
                throw new Error(`Unknown NetSuite operation: ${operationId}`);
        }
    }
}
