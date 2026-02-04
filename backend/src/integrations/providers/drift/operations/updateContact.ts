import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftContactResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateContactSchema = z.object({
    contact_id: z.number().describe("Contact ID"),
    attributes: z.object({
        email: z.string().email().optional().describe("Updated email"),
        name: z.string().optional().describe("Updated name"),
        phone: z.string().optional().describe("Updated phone"),
        company: z.string().optional().describe("Updated company"),
        title: z.string().optional().describe("Updated job title"),
        tags: z.array(z.string()).optional().describe("Updated tags")
    })
});

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update contact attributes",
    category: "contacts",
    actionType: "write",
    inputSchema: updateContactSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateContact(
    client: DriftClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<DriftContactResponse>(
            `/contacts/${params.contact_id}`,
            { attributes: params.attributes }
        );

        const c = response.data;
        return {
            success: true,
            data: {
                id: c.id,
                email: c.attributes.email,
                name: c.attributes.name,
                updated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: true
            }
        };
    }
}
