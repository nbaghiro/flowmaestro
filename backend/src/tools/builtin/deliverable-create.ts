/**
 * Deliverable Create Tool
 *
 * Allows personas to create deliverables during execution.
 * Deliverables are saved to the persona instance and can be downloaded by users.
 */

import type { DeliverableType } from "@flowmaestro/shared";
import { PersonaInstanceDeliverableRepository } from "../../storage/repositories/PersonaInstanceDeliverableRepository";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const VALID_TYPES: DeliverableType[] = ["markdown", "csv", "json", "pdf", "code", "image", "html"];

const FILE_EXTENSIONS: Record<DeliverableType, string> = {
    markdown: "md",
    csv: "csv",
    json: "json",
    pdf: "pdf",
    code: "txt", // Will be overridden by input
    image: "png", // Will be overridden by input
    html: "html"
};

export const deliverableCreateTool: BuiltInTool = {
    name: "deliverable_create",
    displayName: "Create Deliverable",
    description: `Create a deliverable file that will be saved and made available to the user. Use this to produce your final outputs such as reports, data exports, code files, etc.

Supported types:
- markdown: Reports, documentation (extension: .md)
- csv: Data tables, spreadsheets (extension: .csv)
- json: Structured data (extension: .json)
- code: Source code files (specify extension)
- html: Web pages, formatted content (extension: .html)

Always create deliverables for your final outputs. The user expects to receive tangible results from your work.`,

    category: "file",
    riskLevel: "low",
    enabledByDefault: true,
    creditCost: 0,
    tags: ["deliverable", "output", "file", "report"],

    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description:
                    "Name for the deliverable (e.g., 'competitive-analysis', 'quarterly-report'). Use kebab-case without extension."
            },
            type: {
                type: "string",
                enum: VALID_TYPES,
                description: "Type of deliverable: markdown, csv, json, code, or html"
            },
            content: {
                type: "string",
                description: "The full content of the deliverable"
            },
            description: {
                type: "string",
                description: "Brief description of what this deliverable contains"
            },
            file_extension: {
                type: "string",
                description: "File extension (required for 'code' type, e.g., 'py', 'ts', 'sql')"
            }
        },
        required: ["name", "type", "content"]
    },

    execute: async (
        params: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolExecutionResult> => {
        const input = {
            name: params.name as string | undefined,
            type: params.type as DeliverableType | undefined,
            content: params.content as string | undefined,
            description: params.description as string | undefined,
            file_extension: params.file_extension as string | undefined
        };

        // Validate type
        if (!input.type || !VALID_TYPES.includes(input.type)) {
            return {
                success: false,
                error: {
                    message: `Invalid deliverable type: ${input.type}. Must be one of: ${VALID_TYPES.join(", ")}`,
                    retryable: false
                }
            };
        }

        // Validate name
        if (!input.name || input.name.trim().length === 0) {
            return {
                success: false,
                error: {
                    message: "Deliverable name is required",
                    retryable: false
                }
            };
        }

        // Validate content
        if (!input.content || input.content.trim().length === 0) {
            return {
                success: false,
                error: {
                    message: "Deliverable content is required",
                    retryable: false
                }
            };
        }

        // Get persona instance ID from context
        const personaInstanceId = context.metadata?.personaInstanceId as string | undefined;
        if (!personaInstanceId) {
            return {
                success: false,
                error: {
                    message: "This tool can only be used within a persona instance execution",
                    retryable: false
                }
            };
        }

        // Determine file extension
        let fileExtension = input.file_extension;
        if (!fileExtension) {
            fileExtension = FILE_EXTENSIONS[input.type];
        }
        // Remove leading dot if present
        if (fileExtension.startsWith(".")) {
            fileExtension = fileExtension.substring(1);
        }

        try {
            const repo = new PersonaInstanceDeliverableRepository();
            const deliverable = await repo.create({
                instance_id: personaInstanceId,
                name: input.name.trim(),
                description: input.description?.trim(),
                type: input.type,
                content: input.content,
                file_extension: fileExtension
            });

            return {
                success: true,
                data: {
                    id: deliverable.id,
                    name: deliverable.name,
                    type: deliverable.type,
                    file_extension: deliverable.file_extension,
                    file_size_bytes: deliverable.file_size_bytes,
                    message: `Deliverable "${deliverable.name}.${fileExtension}" created successfully. The user can now download this file.`
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: `Failed to create deliverable: ${error instanceof Error ? error.message : "Unknown error"}`,
                    retryable: true
                }
            };
        }
    }
};
