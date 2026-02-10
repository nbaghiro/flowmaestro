import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComVendor, BillComListResponse } from "../types";

/**
 * List Vendors operation schema
 */
export const listVendorsSchema = z.object({
    start: z.number().min(0).optional().default(0),
    max: z.number().min(1).max(999).optional().default(100),
    isActive: z.enum(["1", "2", "3"]).optional() // 1=Active, 2=Inactive, 3=All
});

export type ListVendorsParams = z.infer<typeof listVendorsSchema>;

/**
 * List Vendors operation definition
 */
export const listVendorsOperation: OperationDefinition = {
    id: "listVendors",
    name: "List Vendors",
    description: "List all vendors with pagination",
    category: "vendors",
    inputSchema: listVendorsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list vendors operation
 */
export async function executeListVendors(
    client: BillComClient,
    params: ListVendorsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<BillComListResponse<BillComVendor>>(
            "/List/Vendor.json",
            {
                start: params.start,
                max: params.max,
                filters: params.isActive
                    ? [{ field: "isActive", op: "=", value: params.isActive }]
                    : []
            }
        );

        const vendors = response.response_data || [];

        return {
            success: true,
            data: {
                vendors,
                count: vendors.length,
                start: params.start,
                max: params.max
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list vendors",
                retryable: true
            }
        };
    }
}
