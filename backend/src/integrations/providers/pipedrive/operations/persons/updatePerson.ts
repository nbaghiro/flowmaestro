import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedrivePerson } from "../types";

/**
 * Update Person Parameters
 */
export const updatePersonSchema = z.object({
    id: z.number().int().describe("The person (contact) ID to update"),
    name: z.string().min(1).optional().describe("Person name"),
    email: z
        .array(
            z.object({
                value: z.string().email(),
                label: z.string().optional().default("work"),
                primary: z.boolean().optional().default(false)
            })
        )
        .optional()
        .describe("Email addresses"),
    phone: z
        .array(
            z.object({
                value: z.string(),
                label: z.string().optional().default("work"),
                primary: z.boolean().optional().default(false)
            })
        )
        .optional()
        .describe("Phone numbers"),
    org_id: z.number().int().optional().describe("Organization ID to link"),
    owner_id: z.number().int().optional().describe("Owner user ID"),
    visible_to: z
        .enum(["1", "3", "5", "7"])
        .optional()
        .describe("Visibility: 1=owner, 3=owner+followers, 5=company, 7=owner+followers+company")
});

export type UpdatePersonParams = z.infer<typeof updatePersonSchema>;

/**
 * Operation Definition
 */
export const updatePersonOperation: OperationDefinition = {
    id: "updatePerson",
    name: "Update Contact",
    description: "Update an existing contact (person)",
    category: "persons",
    inputSchema: updatePersonSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Person
 */
export async function executeUpdatePerson(
    client: PipedriveClient,
    params: UpdatePersonParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<PipedriveResponse<PipedrivePerson>>(
            `/persons/${id}`,
            updateData
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to update contact",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: false
            }
        };
    }
}
