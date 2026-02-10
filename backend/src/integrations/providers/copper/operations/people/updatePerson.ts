import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperPerson } from "../types";

/**
 * Update Person operation schema
 */
export const updatePersonSchema = z.object({
    person_id: z.number().describe("The ID of the person to update"),
    name: z.string().optional().describe("Full name of the person"),
    prefix: z.string().optional().describe("Name prefix (Mr., Mrs., etc.)"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    emails: z
        .array(
            z.object({
                email: z.string().email(),
                category: z.enum(["work", "personal", "other"]).default("work")
            })
        )
        .optional()
        .describe("Email addresses"),
    company_id: z.number().optional().describe("Company ID to associate the person with"),
    title: z.string().optional().describe("Job title"),
    phone_numbers: z
        .array(
            z.object({
                number: z.string(),
                category: z.enum(["work", "mobile", "home", "other"]).default("work")
            })
        )
        .optional()
        .describe("Phone numbers"),
    address: z
        .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postal_code: z.string().optional(),
            country: z.string().optional()
        })
        .optional()
        .describe("Address"),
    details: z.string().optional().describe("Additional details/notes"),
    assignee_id: z.number().optional().describe("User ID to assign the person to"),
    contact_type_id: z.number().optional().describe("Contact type ID"),
    tags: z.array(z.string()).optional().describe("Tags to add to the person")
});

export type UpdatePersonParams = z.infer<typeof updatePersonSchema>;

/**
 * Update Person operation definition
 */
export const updatePersonOperation: OperationDefinition = {
    id: "updatePerson",
    name: "Update Person",
    description: "Update an existing person (contact) in Copper CRM",
    category: "people",
    inputSchema: updatePersonSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update person operation
 */
export async function executeUpdatePerson(
    client: CopperClient,
    params: UpdatePersonParams
): Promise<OperationResult> {
    try {
        const { person_id, ...updateData } = params;
        const person = await client.put<CopperPerson>(`/people/${person_id}`, updateData);

        return {
            success: true,
            data: person
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update person",
                retryable: false
            }
        };
    }
}
