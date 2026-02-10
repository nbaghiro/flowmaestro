import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperPerson } from "../types";

/**
 * List People operation schema
 */
export const listPeopleSchema = z.object({
    page_number: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(200).optional().default(50),
    sort_by: z.string().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional()
});

export type ListPeopleParams = z.infer<typeof listPeopleSchema>;

/**
 * List People operation definition
 */
export const listPeopleOperation: OperationDefinition = {
    id: "listPeople",
    name: "List People",
    description: "List all people (contacts) in Copper CRM with pagination",
    category: "people",
    inputSchema: listPeopleSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list people operation
 */
export async function executeListPeople(
    client: CopperClient,
    params: ListPeopleParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            page_number: params.page_number,
            page_size: params.page_size
        };

        if (params.sort_by) {
            requestBody.sort_by = params.sort_by;
            requestBody.sort_direction = params.sort_direction || "asc";
        }

        const people = await client.post<CopperPerson[]>("/people/search", requestBody);

        return {
            success: true,
            data: {
                people,
                count: people.length,
                page: params.page_number,
                page_size: params.page_size
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list people",
                retryable: true
            }
        };
    }
}
