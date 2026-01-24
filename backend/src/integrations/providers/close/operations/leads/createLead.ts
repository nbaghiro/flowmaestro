import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseLead } from "../types";

/**
 * Create Lead Parameters
 */
export const createLeadSchema = z.object({
    name: z.string().min(1).describe("Lead/company name (required)"),
    description: z.string().optional().describe("Lead description"),
    url: z.string().url().optional().describe("Company website URL"),
    status_id: z.string().optional().describe("Lead status ID"),
    addresses: z
        .array(
            z.object({
                label: z.string().optional(),
                address_1: z.string().optional(),
                address_2: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                zipcode: z.string().optional(),
                country: z.string().optional()
            })
        )
        .optional()
        .describe("Company addresses"),
    contacts: z
        .array(
            z.object({
                name: z.string().describe("Contact name"),
                title: z.string().optional().describe("Contact job title"),
                emails: z
                    .array(
                        z.object({
                            email: z.string().email(),
                            type: z
                                .enum(["office", "home", "direct", "mobile", "fax", "other"])
                                .optional()
                                .default("office")
                        })
                    )
                    .optional(),
                phones: z
                    .array(
                        z.object({
                            phone: z.string(),
                            type: z
                                .enum(["office", "home", "direct", "mobile", "fax", "other"])
                                .optional()
                                .default("office")
                        })
                    )
                    .optional()
            })
        )
        .optional()
        .describe("Contacts to create with the lead"),
    custom: z.record(z.unknown()).optional().describe("Custom field values")
});

export type CreateLeadParams = z.infer<typeof createLeadSchema>;

/**
 * Operation Definition
 */
export const createLeadOperation: OperationDefinition = {
    id: "createLead",
    name: "Create Lead",
    description: "Create a new lead (company) with optional contacts",
    category: "leads",
    inputSchema: createLeadSchema,
    inputSchemaJSON: toJSONSchema(createLeadSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Lead
 */
export async function executeCreateLead(
    client: CloseClient,
    params: CreateLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseLead>("/lead/", params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create lead",
                retryable: false
            }
        };
    }
}
