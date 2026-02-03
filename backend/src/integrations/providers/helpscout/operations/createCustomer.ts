import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createCustomerSchema = z.object({
    firstName: z.string().optional().describe("Customer first name"),
    lastName: z.string().optional().describe("Customer last name"),
    emails: z
        .array(
            z.object({
                type: z.enum(["home", "work", "other"]).default("work"),
                value: z.string().email().describe("Email address")
            })
        )
        .min(1)
        .describe("Customer email addresses"),
    phones: z
        .array(
            z.object({
                type: z.enum(["home", "work", "mobile", "fax", "pager", "other"]).default("work"),
                value: z.string().describe("Phone number")
            })
        )
        .optional()
        .describe("Customer phone numbers"),
    organization: z.string().optional().describe("Organization name"),
    jobTitle: z.string().optional().describe("Job title")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer in Help Scout",
    category: "customers",
    actionType: "write",
    inputSchema: createCustomerSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateCustomer(
    client: HelpScoutClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.post<null>("/customers", params);

        return {
            success: true,
            data: {
                created: true,
                customer: response
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create customer",
                retryable: false
            }
        };
    }
}
