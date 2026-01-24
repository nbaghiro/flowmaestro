import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HelloSignClient } from "../client/HelloSignClient";
import type { HelloSignListResponse, HelloSignSignatureRequest } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List signature requests operation schema
 */
export const listSignatureRequestsSchema = z.object({
    page: z.number().int().min(1).default(1).describe("Page number (starting at 1)"),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of results per page (max 100)"),
    account_id: z.string().optional().describe("Filter by specific account ID")
});

export type ListSignatureRequestsParams = z.infer<typeof listSignatureRequestsSchema>;

/**
 * List signature requests operation definition
 */
export const listSignatureRequestsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listSignatureRequests",
            name: "List Signature Requests",
            description: "List all signature requests in your HelloSign account",
            category: "signature_requests",
            inputSchema: listSignatureRequestsSchema,
            inputSchemaJSON: toJSONSchema(listSignatureRequestsSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
            "Failed to create listSignatureRequestsOperation"
        );
        throw new Error(
            `Failed to create listSignatureRequests operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list signature requests operation
 */
export async function executeListSignatureRequests(
    client: HelloSignClient,
    params: ListSignatureRequestsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listSignatureRequests({
            page: params.page,
            page_size: params.page_size,
            account_id: params.account_id
        })) as HelloSignListResponse<HelloSignSignatureRequest>;

        const requests = response.signature_requests || [];

        return {
            success: true,
            data: {
                signature_requests: requests.map((req) => ({
                    signature_request_id: req.signature_request_id,
                    title: req.title,
                    subject: req.subject,
                    is_complete: req.is_complete,
                    is_declined: req.is_declined,
                    has_error: req.has_error,
                    test_mode: req.test_mode,
                    created_at: req.created_at,
                    signers_count: req.signatures.length,
                    signed_count: req.signatures.filter((s) => s.status_code === "signed").length
                })),
                pagination: {
                    page: response.list_info.page,
                    page_size: response.list_info.page_size,
                    total_pages: response.list_info.num_pages,
                    total_results: response.list_info.num_results
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list signature requests",
                retryable: true
            }
        };
    }
}
