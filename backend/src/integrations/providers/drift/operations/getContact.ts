import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftContactResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getContactSchema = z.object({
    contact_id: z.number().describe("Contact ID")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a single contact by ID",
    category: "contacts",
    actionType: "read",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetContact(
    client: DriftClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const response = await client.get<DriftContactResponse>(`/contacts/${params.contact_id}`);

        const c = response.data;
        return {
            success: true,
            data: {
                id: c.id,
                email: c.attributes.email,
                name: c.attributes.name,
                phone: c.attributes.phone,
                company: c.attributes.company,
                title: c.attributes.title,
                tags: c.attributes.tags,
                socialProfiles: c.attributes.socialProfiles,
                createdAt: c.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: true
            }
        };
    }
}
