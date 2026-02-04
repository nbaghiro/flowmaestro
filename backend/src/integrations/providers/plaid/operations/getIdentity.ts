import { z } from "zod";
import type { PlaidIdentityOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

export const getIdentitySchema = z.object({
    accessToken: z.string().min(1).describe("The Plaid access token for the linked account")
});

export type GetIdentityParams = z.infer<typeof getIdentitySchema>;

export const getIdentityOperation: OperationDefinition = {
    id: "getIdentity",
    name: "Get Identity",
    description: "Get identity information (name, email, phone, address) for account holders",
    category: "identity",
    inputSchema: getIdentitySchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetIdentity(
    client: PlaidClient,
    params: GetIdentityParams
): Promise<OperationResult> {
    try {
        const response = await client.getIdentity(params.accessToken);

        const formattedIdentities: PlaidIdentityOutput[] = response.accounts.map((account) => ({
            accountId: account.account_id,
            owners: account.owners.map((owner) => ({
                names: owner.names,
                emails: owner.emails.map((e) => ({
                    data: e.data,
                    primary: e.primary,
                    type: e.type
                })),
                phoneNumbers: owner.phone_numbers.map((p) => ({
                    data: p.data,
                    primary: p.primary,
                    type: p.type
                })),
                addresses: owner.addresses.map((a) => ({
                    data: {
                        street: a.data.street,
                        city: a.data.city,
                        region: a.data.region,
                        postalCode: a.data.postal_code,
                        country: a.data.country
                    },
                    primary: a.primary
                }))
            }))
        }));

        return {
            success: true,
            data: {
                identities: formattedIdentities,
                count: formattedIdentities.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get identity",
                retryable: true
            }
        };
    }
}
