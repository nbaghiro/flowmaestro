import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedrivePerson } from "../types";

/**
 * Create Person Parameters
 */
export const createPersonSchema = z.object({
    name: z.string().min(1).describe("Person name (required)"),
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

export type CreatePersonParams = z.infer<typeof createPersonSchema>;

/**
 * Operation Definition
 */
export const createPersonOperation: OperationDefinition = {
    id: "createPerson",
    name: "Create Contact",
    description: "Create a new contact (person)",
    category: "persons",
    inputSchema: createPersonSchema,
    inputSchemaJSON: toJSONSchema(createPersonSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Person
 */
export async function executeCreatePerson(
    client: PipedriveClient,
    params: CreatePersonParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PipedriveResponse<PipedrivePerson>>("/persons", params);

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create contact",
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
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
