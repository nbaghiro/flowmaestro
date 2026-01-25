import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SentryOrganizationOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const listOrganizationsSchema = z.object({});

export type ListOrganizationsParams = z.infer<typeof listOrganizationsSchema>;

export const listOrganizationsOperation: OperationDefinition = {
    id: "listOrganizations",
    name: "List Organizations",
    description: "List all organizations accessible to the token",
    category: "organizations",
    inputSchema: listOrganizationsSchema,
    inputSchemaJSON: toJSONSchema(listOrganizationsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListOrganizations(
    client: SentryClient,
    _params: ListOrganizationsParams
): Promise<OperationResult> {
    try {
        const organizations = await client.listOrganizations();

        const formattedOrgs: SentryOrganizationOutput[] = organizations.map((org) => ({
            id: org.id,
            slug: org.slug,
            name: org.name,
            dateCreated: org.dateCreated,
            status: org.status?.name
        }));

        return {
            success: true,
            data: {
                organizations: formattedOrgs,
                count: formattedOrgs.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list organizations",
                retryable: true
            }
        };
    }
}
