import { z } from "zod";
import { BoxClient } from "../client/BoxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const shareFileSchema = z.object({
    fileId: z.string().min(1).describe("The Box file ID to share"),
    access: z
        .enum(["open", "company", "collaborators"])
        .default("open")
        .describe(
            'Access level: "open" (anyone with link), "company" (company users only), "collaborators" (invited users only)'
        ),
    password: z.string().optional().describe("Optional password to protect the shared link")
});

export type ShareFileParams = z.infer<typeof shareFileSchema>;

export const shareFileOperation: OperationDefinition = {
    id: "shareFile",
    name: "Share File",
    description:
        "Create a shared link for a Box file. Returns a URL that can be used to access the file.",
    category: "sharing",
    inputSchema: shareFileSchema,
    retryable: true,
    timeout: 30000
};

interface BoxShareResponse {
    type: string;
    id: string;
    name: string;
    shared_link: {
        url: string;
        download_url?: string;
        vanity_url?: string;
        vanity_name?: string;
        effective_access: string;
        effective_permission: string;
        is_password_enabled: boolean;
        access: string;
        permissions?: {
            can_download: boolean;
            can_preview: boolean;
            can_edit: boolean;
        };
    } | null;
}

export async function executeShareFile(
    client: BoxClient,
    params: ShareFileParams
): Promise<OperationResult> {
    try {
        const response = (await client.createSharedLink(
            params.fileId,
            params.access,
            params.password
        )) as BoxShareResponse;

        if (!response.shared_link) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create shared link. The file may not support sharing.",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                url: response.shared_link.url,
                downloadUrl: response.shared_link.download_url,
                access: response.shared_link.access,
                effectiveAccess: response.shared_link.effective_access,
                isPasswordEnabled: response.shared_link.is_password_enabled,
                permissions: response.shared_link.permissions
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to share file";

        // Check for not found error
        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "File not found.",
                    retryable: false
                }
            };
        }

        // Check for permission error
        if (message.includes("permission") || message.includes("403")) {
            return {
                success: false,
                error: {
                    type: "permission",
                    message: "You don't have permission to share this file.",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
