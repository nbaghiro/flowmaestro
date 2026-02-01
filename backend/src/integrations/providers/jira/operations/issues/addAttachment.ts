import { addAttachmentInputSchema, type AddAttachmentInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const addAttachmentOperation: OperationDefinition = {
    id: "addAttachment",
    name: "Add Attachment",
    description: "Upload a file attachment to an issue. File content should be base64 encoded.",
    category: "issues",
    inputSchema: addAttachmentInputSchema,
    retryable: true,
    timeout: 30000 // Longer timeout for file uploads
};

export async function executeAddAttachment(
    client: JiraClient,
    params: AddAttachmentInput
): Promise<OperationResult> {
    try {
        // Use the uploadAttachment helper method from JiraClient
        const attachment = await client.uploadAttachment(
            params.issueIdOrKey,
            params.fileContent,
            params.filename,
            params.mimeType
        );

        return {
            success: true,
            data: attachment
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add attachment",
                retryable: true
            }
        };
    }
}
