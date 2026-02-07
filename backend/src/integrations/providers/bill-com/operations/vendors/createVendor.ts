import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComVendor, BillComApiResponse } from "../types";

/**
 * Create Vendor operation schema
 */
export const createVendorSchema = z.object({
    name: z.string().min(1).describe("Vendor name"),
    shortName: z.string().optional(),
    companyName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    addressZip: z.string().optional(),
    addressCountry: z.string().optional(),
    payBy: z.enum(["Check", "ACH"]).optional(),
    is1099: z.enum(["1", "2"]).optional(), // 1=Yes, 2=No
    taxId: z.string().optional(),
    description: z.string().optional()
});

export type CreateVendorParams = z.infer<typeof createVendorSchema>;

/**
 * Create Vendor operation definition
 */
export const createVendorOperation: OperationDefinition = {
    id: "createVendor",
    name: "Create Vendor",
    description: "Create a new vendor",
    category: "vendors",
    inputSchema: createVendorSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create vendor operation
 */
export async function executeCreateVendor(
    client: BillComClient,
    params: CreateVendorParams
): Promise<OperationResult> {
    try {
        const response = await client.post<BillComApiResponse<BillComVendor>>(
            "/Crud/Create/Vendor.json",
            {
                obj: {
                    entity: "Vendor",
                    isActive: "1",
                    ...params
                }
            }
        );

        if (!response.response_data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create vendor",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.response_data
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create vendor";

        if (message.includes("validation") || message.includes("duplicate")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
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
