import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftContactResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createContactSchema = z.object({
    attributes: z.object({
        email: z.string().email().describe("Contact email address"),
        name: z.string().optional().describe("Contact name"),
        phone: z.string().optional().describe("Contact phone number"),
        company: z.string().optional().describe("Company name"),
        title: z.string().optional().describe("Job title"),
        tags: z.array(z.string()).optional().describe("Tags to assign")
    })
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Drift",
    category: "contacts",
    actionType: "write",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateContact(
    client: DriftClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.post<DriftContactResponse>("/contacts", params);

        const c = response.data;
        return {
            success: true,
            data: {
                id: c.id,
                email: c.attributes.email,
                name: c.attributes.name,
                createdAt: c.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
