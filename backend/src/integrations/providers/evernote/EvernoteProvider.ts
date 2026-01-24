import type { OAuth1TokenData } from "@flowmaestro/shared";
import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { EvernoteClient } from "./client/EvernoteClient";
import {
    listNotebooksOperation,
    executeListNotebooks,
    createNotebookOperation,
    executeCreateNotebook,
    createNoteOperation,
    executeCreateNote,
    getNoteOperation,
    executeGetNote,
    searchNotesOperation,
    executeSearchNotes,
    listTagsOperation,
    executeListTags,
    createTagOperation,
    executeCreateTag
} from "./operations";
import type { CreateNoteParams } from "./operations/createNote";
import type { CreateNotebookParams } from "./operations/createNotebook";
import type { CreateTagParams } from "./operations/createTag";
import type { GetNoteParams } from "./operations/getNote";
import type { ListNotebooksParams } from "./operations/listNotebooks";
import type { ListTagsParams } from "./operations/listTags";
import type { SearchNotesParams } from "./operations/searchNotes";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

/**
 * OAuth 1.0a configuration for auth display purposes
 */
interface OAuth1AuthConfig {
    type: "oauth1";
    requestTokenUrl: string;
    authorizeUrl: string;
    accessTokenUrl: string;
    consumerKey: string;
    consumerSecret: string;
    callbackUrl: string;
}

/**
 * Evernote Provider - implements OAuth 1.0a authentication with note management operations
 *
 * Provides access to Evernote notes, notebooks, and tags.
 *
 * Documentation: https://dev.evernote.com/doc/
 *
 * Key features:
 * - OAuth 1.0a authentication
 * - Note CRUD operations
 * - Notebook management
 * - Tag management
 * - Search using Evernote grammar
 *
 * Rate Limits:
 * - 300 requests/hour for regular operations
 * - Token valid for 1 year
 */
export class EvernoteProvider extends BaseProvider {
    readonly name = "evernote";
    readonly displayName = "Evernote";
    readonly authMethod = "oauth1" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 5 // 300/hour = 5/minute
        }
    };

    private clientPool: Map<string, EvernoteClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listNotebooksOperation);
        this.registerOperation(createNotebookOperation);
        this.registerOperation(createNoteOperation);
        this.registerOperation(getNoteOperation);
        this.registerOperation(searchNotesOperation);
        this.registerOperation(listTagsOperation);
        this.registerOperation(createTagOperation);
    }

    /**
     * Get OAuth 1.0a configuration
     */
    getAuthConfig(): AuthConfig {
        const sandbox = appConfig.oauth.evernote?.sandbox ?? true;
        const baseUrl = sandbox ? "https://sandbox.evernote.com" : "https://www.evernote.com";

        const config: OAuth1AuthConfig = {
            type: "oauth1",
            requestTokenUrl: `${baseUrl}/oauth`,
            authorizeUrl: `${baseUrl}/OAuth.action`,
            accessTokenUrl: `${baseUrl}/oauth`,
            consumerKey: appConfig.oauth.evernote?.consumerKey || "",
            consumerSecret: appConfig.oauth.evernote?.consumerSecret || "",
            callbackUrl: getOAuthRedirectUri("evernote")
        };

        // Return as unknown then cast to satisfy the AuthConfig type
        // OAuth 1.0a config is different from OAuth 2.0 and API key configs
        return config as unknown as AuthConfig;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            case "listNotebooks":
                return await executeListNotebooks(client, validatedParams as ListNotebooksParams);
            case "createNotebook":
                return await executeCreateNotebook(client, validatedParams as CreateNotebookParams);
            case "createNote":
                return await executeCreateNote(client, validatedParams as CreateNoteParams);
            case "getNote":
                return await executeGetNote(client, validatedParams as GetNoteParams);
            case "searchNotes":
                return await executeSearchNotes(client, validatedParams as SearchNotesParams);
            case "listTags":
                return await executeListTags(client, validatedParams as ListTagsParams);
            case "createTag":
                return await executeCreateTag(client, validatedParams as CreateTagParams);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        // Convert operations to MCP tools with evernote_ prefix
        return this.getOperations().map((op) => ({
            name: `evernote_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        // Remove evernote_ prefix to get operation ID
        const operationId = toolName.replace("evernote_", "");

        const result = await this.executeOperation(operationId, params, connection, {
            mode: "agent",
            conversationId: "unknown",
            toolCallId: "unknown"
        });

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Evernote client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): EvernoteClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Extract OAuth 1.0a tokens
        const data = connection.data as OAuth1TokenData;

        if (!data.oauth_token) {
            throw new Error("Missing OAuth token in connection data");
        }

        // Get note store URL from token data or construct it
        // Evernote returns this in the OAuth response as edam_noteStoreUrl
        let noteStoreUrl = data.edam_noteStoreUrl;

        if (!noteStoreUrl && data.edam_shard) {
            // Construct note store URL from shard
            const sandbox = appConfig.oauth.evernote?.sandbox ?? true;
            const baseUrl = sandbox ? "https://sandbox.evernote.com" : "https://www.evernote.com";
            noteStoreUrl = `${baseUrl}/edam/note/${data.edam_shard}`;
        }

        if (!noteStoreUrl) {
            throw new Error("Missing note store URL. Please reconnect your Evernote account.");
        }

        // Create new client
        const client = new EvernoteClient({
            accessToken: data.oauth_token,
            noteStoreUrl,
            webApiUrlPrefix: data.edam_webApiUrlPrefix,
            sandbox: appConfig.oauth.evernote?.sandbox ?? true
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
