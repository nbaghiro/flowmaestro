import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Add Attachment operation schema
 */
export const addAttachmentSchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID"),
    fileName: z.string().describe("Attachment file name"),
    content: z.string().describe("Base64-encoded file content or URL")
});

export type AddAttachmentParams = z.infer<typeof addAttachmentSchema>;

/**
 * Add Attachment operation definition
 */
export const addAttachmentOperation: OperationDefinition = {
    id: "work_items_addAttachment",
    name: "Add Attachment",
    description: "Attach a file to a work item",
    category: "work-items",
    inputSchema: addAttachmentSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute add attachment operation
 */
export async function executeAddAttachment(
    client: AzureDevOpsClient,
    params: AddAttachmentParams
): Promise<OperationResult> {
    try {
        // Upload attachment
        const uploadResponse = await client.post<{
            id: string;
            url: string;
        }>(
            `/${params.project}/_apis/wit/attachments?fileName=${encodeURIComponent(params.fileName)}`,
            params.content
        );

        // Link attachment to work item
        const patchDocument = [
            {
                op: "add",
                path: "/relations/-",
                value: {
                    rel: "AttachedFile",
                    url: uploadResponse.url,
                    attributes: {
                        name: params.fileName
                    }
                }
            }
        ];

        await client.request({
            method: "PATCH",
            url: `/${params.project}/_apis/wit/workitems/${params.workItemId}`,
            data: patchDocument,
            headers: {
                "Content-Type": "application/json-patch+json"
            }
        });

        return {
            success: true,
            data: {
                attachmentId: uploadResponse.id,
                fileName: params.fileName,
                url: uploadResponse.url,
                workItemId: params.workItemId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add attachment",
                retryable: false
            }
        };
    }
}
