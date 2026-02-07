import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComVendor, BillComApiResponse } from "../types";

/**
 * Get Vendor operation schema
 */
export const getVendorSchema = z.object({
    id: z.string().describe("Vendor ID")
});

export type GetVendorParams = z.infer<typeof getVendorSchema>;

/**
 * Get Vendor operation definition
 */
export const getVendorOperation: OperationDefinition = {
    id: "getVendor",
    name: "Get Vendor",
    description: "Get a specific vendor by ID",
    category: "vendors",
    inputSchema: getVendorSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get vendor operation
 */
export async function executeGetVendor(
    client: BillComClient,
    params: GetVendorParams
): Promise<OperationResult> {
    try {
        const response = await client.post<BillComApiResponse<BillComVendor>>(
            "/Crud/Read/Vendor.json",
            {
                id: params.id
            }
        );

        if (!response.response_data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Vendor not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.response_data
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get vendor";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Vendor not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
