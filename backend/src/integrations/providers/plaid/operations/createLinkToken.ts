import { z } from "zod";
import type { PlaidLinkTokenOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

export const createLinkTokenSchema = z.object({
    userId: z.string().min(1).describe("A unique identifier for the user"),
    products: z
        .array(z.string())
        .optional()
        .default(["transactions"])
        .describe("Plaid products to enable (e.g., transactions, auth, identity)"),
    countryCodes: z
        .array(z.string())
        .optional()
        .default(["US"])
        .describe("Country codes for supported institutions"),
    language: z.string().optional().default("en").describe("Language for Plaid Link UI"),
    clientName: z
        .string()
        .optional()
        .default("FlowMaestro")
        .describe("Name displayed in Plaid Link")
});

export type CreateLinkTokenParams = z.infer<typeof createLinkTokenSchema>;

export const createLinkTokenOperation: OperationDefinition = {
    id: "createLinkToken",
    name: "Create Link Token",
    description: "Create a link token to initialize Plaid Link for connecting bank accounts",
    category: "link",
    inputSchema: createLinkTokenSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateLinkToken(
    client: PlaidClient,
    params: CreateLinkTokenParams
): Promise<OperationResult> {
    try {
        const response = await client.createLinkToken(
            params.userId,
            params.products,
            params.countryCodes,
            params.language,
            params.clientName
        );

        const formatted: PlaidLinkTokenOutput = {
            linkToken: response.link_token,
            expiration: response.expiration,
            requestId: response.request_id
        };

        return {
            success: true,
            data: formatted
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create link token",
                retryable: false
            }
        };
    }
}
