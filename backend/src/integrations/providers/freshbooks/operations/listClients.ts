import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { FreshBooksClientOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const listClientsSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number (default 1)"),
    perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Results per page (max 100, default 25)"),
    search: z.string().optional().describe("Search filter (searches email)")
});

export type ListClientsParams = z.infer<typeof listClientsSchema>;

export const listClientsOperation: OperationDefinition = {
    id: "listClients",
    name: "List Clients",
    description: "Get a list of clients from FreshBooks",
    category: "clients",
    inputSchema: listClientsSchema,
    inputSchemaJSON: toJSONSchema(listClientsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListClients(
    client: FreshBooksHttpClient,
    params: ListClientsParams
): Promise<OperationResult> {
    try {
        const response = await client.listClients(params.page, params.perPage, params.search);
        const clients = response.response.result.clients || [];

        const formattedClients: FreshBooksClientOutput[] = clients.map((c) => ({
            id: c.id,
            email: c.email,
            firstName: c.fname,
            lastName: c.lname,
            organization: c.organization,
            phone: c.bus_phone || undefined,
            mobilePhone: c.mob_phone || undefined,
            address:
                c.p_street || c.p_city
                    ? {
                          street: c.p_street || undefined,
                          city: c.p_city || undefined,
                          province: c.p_province || undefined,
                          postalCode: c.p_code || undefined,
                          country: c.p_country || undefined
                      }
                    : undefined,
            currencyCode: c.currency_code,
            updatedAt: c.updated
        }));

        return {
            success: true,
            data: {
                clients: formattedClients,
                count: formattedClients.length,
                page: response.response.result.page,
                pages: response.response.result.pages,
                perPage: response.response.result.per_page,
                total: response.response.result.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list clients",
                retryable: true
            }
        };
    }
}
