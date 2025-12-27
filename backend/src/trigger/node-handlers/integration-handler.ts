import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { providerRegistry } from "../../integrations/registry";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import type { ExecutionContext } from "../../integrations/core/types";

/**
 * IntegrationHandler - Handles third-party integration nodes.
 *
 * This handler bridges to the provider registry system which supports 30+ integrations.
 *
 * Supported node type patterns:
 * - integration: Generic integration node
 * - {provider}: Provider-specific nodes (slack, gmail, notion, etc.)
 * - {provider}-{operation}: Specific operations (slack-sendMessage, gmail-send, etc.)
 *
 * Providers:
 * - Communication: slack, gmail, microsoft-teams, whatsapp, discord, telegram
 * - Productivity: notion, airtable, coda, google-sheets, google-docs, google-drive
 * - Project Management: linear, jira, asana, trello
 * - CRM: salesforce, hubspot, apollo, zendesk
 * - Social: twitter, linkedin, instagram, facebook
 * - Storage: dropbox, box, google-drive, microsoft-onedrive
 * - Developer: github
 * - Database: postgresql, mongodb
 * - E-commerce: shopify
 * - Forms: typeform
 */
export class IntegrationHandler extends BaseNodeHandler {
    protected nodeTypes = [
        "integration",
        // Communication
        "slack",
        "gmail",
        "microsoft-teams",
        "whatsapp",
        "discord",
        "telegram",
        // Productivity
        "notion",
        "airtable",
        "coda",
        "google-sheets",
        "google-docs",
        "google-drive",
        "google-calendar",
        // Microsoft
        "microsoft-excel",
        "microsoft-word",
        "microsoft-onedrive",
        // Project Management
        "linear",
        "jira",
        "asana",
        "trello",
        // CRM
        "salesforce",
        "hubspot",
        "apollo",
        "zendesk",
        // Social
        "twitter",
        "linkedin",
        "instagram",
        "facebook",
        // Storage
        "dropbox",
        "box",
        // Developer
        "github",
        // Database
        "postgresql",
        "mongodb",
        // E-commerce
        "shopify",
        // Forms
        "typeform",
        // Design
        "figma"
    ];

    private connectionRepo = new ConnectionRepository();

    /**
     * Check if this handler can handle a node type.
     * Supports both exact matches and provider-operation patterns.
     */
    canHandle(nodeType: string): boolean {
        // Exact match
        if (this.nodeTypes.includes(nodeType)) {
            return true;
        }

        // Check for provider-operation pattern (e.g., "slack-sendMessage")
        const parts = nodeType.split("-");
        if (parts.length >= 2) {
            const provider = parts[0];
            return this.nodeTypes.includes(provider);
        }

        return false;
    }

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        try {
            const { config, context, userId, nodeId, executionId, nodeType } = input;

            // Determine provider and operation
            let provider: string;
            let operation: string;

            if (nodeType === "integration") {
                // Generic integration node - provider and operation from config
                provider = config.provider as string;
                operation = config.operation as string;
            } else if (nodeType.includes("-") && !this.nodeTypes.includes(nodeType)) {
                // Provider-operation pattern (e.g., "slack-sendMessage")
                const parts = nodeType.split("-");
                provider = parts[0];
                operation = parts.slice(1).join("-");
            } else {
                // Provider node - operation from config
                provider = nodeType;
                operation = config.operation as string;
            }

            if (!provider) {
                return this.failure("Provider is required", {
                    code: "MISSING_PROVIDER",
                    activateErrorPort: true
                });
            }

            if (!operation) {
                return this.failure("Operation is required", {
                    code: "MISSING_OPERATION",
                    activateErrorPort: true
                });
            }

            // Get connection
            const connectionId = config.connectionId as string | undefined;
            let connection;

            if (connectionId) {
                connection = await this.connectionRepo.findByIdWithData(connectionId);
            } else {
                // Try to find a connection for this provider
                const connections = await this.connectionRepo.findByProvider(userId, provider);
                if (connections.length > 0) {
                    // Get full connection data for the first matching connection
                    connection = await this.connectionRepo.findByIdWithData(connections[0].id);
                }
            }

            if (!connection) {
                return this.failure(`No connection found for provider ${provider}`, {
                    code: "NO_CONNECTION",
                    activateErrorPort: true
                });
            }

            // Build operation parameters
            const params = this.buildParams(config, context);

            // Create execution context
            const executionContext: ExecutionContext = {
                mode: "workflow",
                workflowId: executionId,
                nodeId
            };

            // Load provider and execute operation
            const providerInstance = await providerRegistry.loadProvider(provider);
            const result = await providerInstance.executeOperation(
                operation,
                params,
                connection,
                executionContext
            );

            const durationMs = Date.now() - startTime;

            if (!result.success) {
                return this.failure(result.error?.message || "Operation failed", {
                    code: result.error?.code || "OPERATION_FAILED",
                    activateErrorPort: true,
                    retryable: result.error?.retryable
                });
            }

            return {
                success: true,
                data: {
                    result: result.data as JsonValue,
                    provider,
                    operation
                },
                metadata: {
                    durationMs,
                    provider,
                    operation,
                    connectionId: connection.id
                }
            };
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                {
                    code: "INTEGRATION_ERROR",
                    activateErrorPort: true
                }
            );
        }
    }

    /**
     * Build operation parameters from config with variable resolution.
     */
    private buildParams(
        config: JsonObject,
        context: NodeHandlerInput["context"]
    ): Record<string, unknown> {
        const params: Record<string, unknown> = {};

        // Exclude meta-fields
        const excludeFields = new Set([
            "provider",
            "operation",
            "connectionId",
            "nodeId",
            "nodeName"
        ]);

        for (const [key, value] of Object.entries(config)) {
            if (excludeFields.has(key)) {
                continue;
            }

            params[key] = this.resolveValue(value, context);
        }

        return params;
    }

    /**
     * Resolve a value, handling variable references.
     */
    private resolveValue(
        value: unknown,
        context: NodeHandlerInput["context"]
    ): unknown {
        if (typeof value === "string") {
            // Check for variable reference pattern
            if (value.startsWith("{{") && value.endsWith("}}")) {
                const path = value.slice(2, -2).trim();
                return this.resolvePath(path, context);
            }

            // Check for template interpolation
            if (value.includes("{{")) {
                return this.resolveVariables(value, context);
            }

            // Check for special syntax like <nodeId.field>
            if (value.startsWith("<") && value.endsWith(">")) {
                const path = value.slice(1, -1).trim();
                return this.resolvePath(path, context);
            }

            return value;
        }

        if (Array.isArray(value)) {
            return value.map((item) => this.resolveValue(item, context));
        }

        if (typeof value === "object" && value !== null) {
            const resolved: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                resolved[k] = this.resolveValue(v, context);
            }
            return resolved;
        }

        return value;
    }

    /**
     * Resolve variables in a string.
     */
    private resolveVariables(
        text: string,
        context: NodeHandlerInput["context"]
    ): string {
        return text.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
            const value = this.resolvePath(path.trim(), context);
            if (value === undefined || value === null) {
                return "";
            }
            if (typeof value === "object") {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }

    /**
     * Resolve a dot-notation path to a value.
     */
    private resolvePath(
        path: string,
        context: NodeHandlerInput["context"]
    ): unknown {
        const parts = path.split(".");
        const root = parts[0];

        let value: unknown;

        if (root === "inputs") {
            value = context.inputs;
        } else if (root === "variables" || root === "var") {
            value = context.workflowVariables;
        } else if (root === "loop" && context.loopContext) {
            value = context.loopContext;
        } else if (root === "parallel" && context.parallelContext) {
            value = context.parallelContext;
        } else if (context.nodeOutputs[root]) {
            value = context.nodeOutputs[root];
        } else {
            return undefined;
        }

        // Navigate remaining path
        for (let i = 1; i < parts.length && value != null; i++) {
            value = (value as Record<string, unknown>)[parts[i]];
        }

        return value;
    }
}
