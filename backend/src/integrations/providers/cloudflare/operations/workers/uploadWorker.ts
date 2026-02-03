import { z } from "zod";
import { WorkerNameSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Upload Worker operation schema
 */
export const uploadWorkerSchema = z.object({
    scriptName: WorkerNameSchema.describe("The name of the Worker script"),
    content: z.string().min(1).describe("The JavaScript/TypeScript content of the Worker script"),
    compatibilityDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format")
        .optional()
        .describe("The compatibility date for the Worker (e.g., '2024-01-01')"),
    compatibilityFlags: z
        .array(z.string())
        .optional()
        .describe("Compatibility flags for the Worker"),
    bindings: z
        .array(
            z.object({
                name: z.string().describe("Binding name"),
                type: z.string().describe("Binding type (e.g., 'kv_namespace', 'secret_text')"),
                namespace_id: z
                    .string()
                    .optional()
                    .describe("KV namespace ID for kv_namespace bindings"),
                text: z.string().optional().describe("Secret text value for secret_text bindings")
            })
        )
        .optional()
        .describe("Environment bindings for the Worker")
});

export type UploadWorkerParams = z.infer<typeof uploadWorkerSchema>;

/**
 * Upload Worker operation definition
 */
export const uploadWorkerOperation: OperationDefinition = {
    id: "workers_uploadScript",
    name: "Upload Worker",
    description: "Upload or update a Worker script",
    category: "workers",
    inputSchema: uploadWorkerSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute upload worker operation
 */
export async function executeUploadWorker(
    client: CloudflareClient,
    params: UploadWorkerParams
): Promise<OperationResult> {
    try {
        const metadata = {
            bindings: params.bindings,
            compatibility_date: params.compatibilityDate,
            compatibility_flags: params.compatibilityFlags
        };

        const worker = await client.uploadWorker(params.scriptName, params.content, metadata);

        return {
            success: true,
            data: {
                id: worker.id,
                scriptName: params.scriptName,
                etag: worker.etag,
                handlers: worker.handlers,
                usageModel: worker.usage_model,
                compatibilityDate: worker.compatibility_date,
                compatibilityFlags: worker.compatibility_flags,
                modifiedOn: worker.modified_on,
                message: "Worker script uploaded successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to upload Worker script",
                retryable: false
            }
        };
    }
}
