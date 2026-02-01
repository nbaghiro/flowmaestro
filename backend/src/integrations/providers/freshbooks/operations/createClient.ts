import { z } from "zod";
import type { FreshBooksClientOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const createClientSchema = z.object({
    email: z.string().email().describe("Client email address (required)"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    organization: z.string().optional().describe("Organization/company name"),
    phone: z.string().optional().describe("Phone number")
});

export type CreateClientParams = z.infer<typeof createClientSchema>;

export const createClientOperation: OperationDefinition = {
    id: "createClient",
    name: "Create Client",
    description: "Create a new client in FreshBooks",
    category: "clients",
    inputSchema: createClientSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateClient(
    client: FreshBooksHttpClient,
    params: CreateClientParams
): Promise<OperationResult> {
    try {
        const clientData: {
            email: string;
            fname?: string;
            lname?: string;
            organization?: string;
            bus_phone?: string;
        } = {
            email: params.email
        };

        if (params.firstName) {
            clientData.fname = params.firstName;
        }
        if (params.lastName) {
            clientData.lname = params.lastName;
        }
        if (params.organization) {
            clientData.organization = params.organization;
        }
        if (params.phone) {
            clientData.bus_phone = params.phone;
        }

        const response = await client.createClient(clientData);
        const c = response.response.result.client;

        const formattedClient: FreshBooksClientOutput = {
            id: c.id,
            email: c.email,
            firstName: c.fname,
            lastName: c.lname,
            organization: c.organization,
            phone: c.bus_phone || undefined,
            mobilePhone: c.mob_phone || undefined,
            currencyCode: c.currency_code,
            updatedAt: c.updated
        };

        return {
            success: true,
            data: formattedClient
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create client",
                retryable: false
            }
        };
    }
}
