import { z } from "zod";
import type { ConvertKitSequenceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getSequencesSchema = z.object({});

export type GetSequencesParams = z.infer<typeof getSequencesSchema>;

export const getSequencesOperation: OperationDefinition = {
    id: "getSequences",
    name: "Get Sequences",
    description: "Retrieve all sequences (email courses) from ConvertKit",
    category: "sequences",
    inputSchema: getSequencesSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetSequences(
    client: ConvertKitClient,
    _params: GetSequencesParams
): Promise<OperationResult> {
    try {
        const response = await client.getSequences();

        const sequences: ConvertKitSequenceOutput[] = response.courses.map((seq) => ({
            id: String(seq.id),
            name: seq.name,
            createdAt: seq.created_at
        }));

        return {
            success: true,
            data: {
                sequences,
                total: sequences.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get sequences";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
