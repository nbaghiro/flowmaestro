import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { DropboxClient } from "../client/DropboxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const shareFileSchema = z.object({
    path: z
        .string()
        .describe('Full path to the file or folder to share (e.g., "/Documents/shared-file.pdf")'),
    visibility: z
        .enum(["public", "team_only", "password"])
        .optional()
        .default("public")
        .describe(
            "Link visibility: 'public' (anyone with link), 'team_only' (team members only), 'password' (password protected)"
        ),
    password: z
        .string()
        .optional()
        .describe("Password for the shared link (required when visibility is 'password')"),
    expires: z
        .string()
        .optional()
        .describe("Expiration date for the link in ISO 8601 format (e.g., '2025-12-31T23:59:59Z')")
});

export type ShareFileParams = z.infer<typeof shareFileSchema>;

export const shareFileOperation: OperationDefinition = {
    id: "shareFile",
    name: "Create Shared Link",
    description:
        "Create a shared link for a file or folder in Dropbox. Returns the shareable URL that can be accessed by others based on visibility settings.",
    category: "sharing",
    inputSchema: shareFileSchema,
    inputSchemaJSON: toJSONSchema(shareFileSchema),
    retryable: true,
    timeout: 10000
};

interface DropboxSharedLinkMetadata {
    ".tag": "file" | "folder";
    url: string;
    name: string;
    path_lower: string;
    id: string;
    link_permissions: {
        resolved_visibility: {
            ".tag": string;
        };
        can_revoke: boolean;
    };
    expires?: string;
}

export async function executeShareFile(
    client: DropboxClient,
    params: ShareFileParams
): Promise<OperationResult> {
    try {
        // Build settings object
        const settings: {
            requested_visibility?: "public" | "team_only" | "password";
            link_password?: string;
            expires?: string;
        } = {};

        if (params.visibility) {
            settings.requested_visibility = params.visibility;
        }

        if (params.password && params.visibility === "password") {
            settings.link_password = params.password;
        }

        if (params.expires) {
            settings.expires = params.expires;
        }

        const response = (await client.createSharedLink(
            params.path,
            Object.keys(settings).length > 0 ? settings : undefined
        )) as DropboxSharedLinkMetadata;

        return {
            success: true,
            data: {
                url: response.url,
                name: response.name,
                id: response.id,
                type: response[".tag"],
                visibility: response.link_permissions?.resolved_visibility?.[".tag"] || "public",
                canRevoke: response.link_permissions?.can_revoke,
                expires: response.expires
            }
        };
    } catch (error) {
        // Check if error is because link already exists
        const errorMessage = error instanceof Error ? error.message : "";
        if (errorMessage.includes("shared_link_already_exists")) {
            // Try to get existing shared links
            try {
                const existingLinks = (await client.listSharedLinks(params.path)) as {
                    links: DropboxSharedLinkMetadata[];
                };

                if (existingLinks.links && existingLinks.links.length > 0) {
                    const link = existingLinks.links[0];
                    return {
                        success: true,
                        data: {
                            url: link.url,
                            name: link.name,
                            id: link.id,
                            type: link[".tag"],
                            visibility:
                                link.link_permissions?.resolved_visibility?.[".tag"] || "public",
                            canRevoke: link.link_permissions?.can_revoke,
                            expires: link.expires,
                            existingLink: true
                        }
                    };
                }
            } catch {
                // Fall through to error response
            }
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create shared link",
                retryable: false
            }
        };
    }
}
