import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperPerson } from "../types";

/**
 * Create Person operation schema
 */
export const createPersonSchema = z.object({
    name: z.string().describe("Full name of the person"),
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

export type CreatePersonParams = z.infer<typeof createPersonSchema>;

/**
 * Create Person operation definition
 */
export const createPersonOperation: OperationDefinition = {
    id: "createPerson",
    name: "Create Person",
    description: "Create a new person (contact) in Copper CRM",
    category: "people",
    inputSchema: createPersonSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create person operation
 */
export async function executeCreatePerson(
    client: CopperClient,
    params: CreatePersonParams
): Promise<OperationResult> {
    try {
        const person = await client.post<CopperPerson>("/people", params);

        return {
            success: true,
            data: person
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create person",
                retryable: false
            }
        };
    }
}
