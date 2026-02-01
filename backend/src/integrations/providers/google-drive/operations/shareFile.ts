import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Share file input schema
 */
export const shareFileSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID to share"),
    type: z
        .enum(["user", "group", "domain", "anyone"])
        .describe(
            "Type of permission: 'user' (specific user), 'group' (Google Group), 'domain' (everyone in domain), 'anyone' (public)"
        ),
    role: z
        .enum(["owner", "organizer", "fileOrganizer", "writer", "commenter", "reader"])
        .describe(
            "Role: 'owner' (full control), 'writer' (edit), 'commenter' (comment only), 'reader' (view only)"
        ),
    emailAddress: z
        .string()
        .email()
        .optional()
        .describe("Email address (required for 'user' and 'group' types)"),
    domain: z.string().optional().describe("Domain name (required for 'domain' type)")
});

export type ShareFileParams = z.infer<typeof shareFileSchema>;

/**
 * Share file operation definition
 */
export const shareFileOperation: OperationDefinition = {
    id: "shareFile",
    name: "Share File or Folder",
    description:
        "Share a file or folder with a user, group, domain, or make it public with specific permissions",
    category: "sharing",
    retryable: true,
    inputSchema: shareFileSchema
};

/**
 * Execute share file operation
 */
export async function executeShareFile(
    client: GoogleDriveClient,
    params: ShareFileParams
): Promise<OperationResult> {
    try {
        // Validate required fields based on type
        if ((params.type === "user" || params.type === "group") && !params.emailAddress) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `emailAddress is required for type '${params.type}'`,
                    retryable: false
                }
            };
        }

        if (params.type === "domain" && !params.domain) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "domain is required for type 'domain'",
                    retryable: false
                }
            };
        }

        const permission: {
            type: "user" | "group" | "domain" | "anyone";
            role: "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
            emailAddress?: string;
            domain?: string;
        } = {
            type: params.type,
            role: params.role
        };

        if (params.emailAddress) {
            permission.emailAddress = params.emailAddress;
        }

        if (params.domain) {
            permission.domain = params.domain;
        }

        const response = await client.createPermission(params.fileId, permission);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to share file",
                retryable: true
            }
        };
    }
}
