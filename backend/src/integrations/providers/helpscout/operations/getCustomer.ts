import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getCustomerSchema = z.object({
    customer_id: z.number().describe("Customer ID")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

export const getCustomerOperation: OperationDefinition = {
    id: "getCustomer",
    name: "Get Customer",
    description: "Get a single customer by ID with full details",
    category: "customers",
    actionType: "read",
    inputSchema: getCustomerSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetCustomer(
    client: HelpScoutClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.get<HelpScoutCustomer>(`/customers/${params.customer_id}`);

        return {
            success: true,
            data: {
                id: response.id,
                firstName: response.firstName,
                lastName: response.lastName,
                jobTitle: response.jobTitle,
                organization: response.organization,
                location: response.location,
                background: response.background,
                emails: response._embedded?.emails,
                phones: response._embedded?.phones,
                socialProfiles: response._embedded?.social_profiles,
                websites: response._embedded?.websites,
                createdAt: response.createdAt,
                updatedAt: response.updatedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get customer",
                retryable: true
            }
        };
    }
}
