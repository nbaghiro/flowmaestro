import { z } from "zod";
import type { ActiveCampaignContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getContactSchema = z.object({
    contactId: z.string().describe("The ID of the contact to retrieve")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a single contact from ActiveCampaign by ID",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetContact(
    client: ActiveCampaignClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const response = await client.getContact(params.contactId);

        const output: ActiveCampaignContactOutput = {
            id: response.contact.id,
            email: response.contact.email,
            firstName: response.contact.firstName,
            lastName: response.contact.lastName,
            phone: response.contact.phone,
            createdAt: response.contact.cdate,
            updatedAt: response.contact.udate
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get contact";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: !message.includes("not found")
            }
        };
    }
}
