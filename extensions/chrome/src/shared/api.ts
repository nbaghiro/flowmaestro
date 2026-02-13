import type {
    ExtensionUserContext,
    ExtensionExecuteWorkflowRequest,
    ExtensionExecuteWorkflowResponse,
    ExtensionAgentChatRequest,
    ExtensionAgentChatResponse,
    PageContext
} from "@flowmaestro/shared";
import { getAuthState, getSettings } from "./storage";

/**
 * API client for FlowMaestro backend
 */
class ExtensionApiClient {
    private async getBaseUrl(): Promise<string> {
        const settings = await getSettings();
        return settings.apiBaseUrl;
    }

    private async getHeaders(): Promise<Record<string, string>> {
        const auth = await getAuthState();
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };

        if (auth?.accessToken) {
            headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }

        if (auth?.workspace?.id) {
            headers["X-Workspace-Id"] = auth.workspace.id;
        }

        return headers;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const baseUrl = await this.getBaseUrl();
        const headers = await this.getHeaders();

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        // Backend returns { success: true, data: {...} }, extract the data field
        return json.data !== undefined ? json.data : json;
    }

    /**
     * Verify authentication token and get user/workspace info
     * Returns user and workspace data if valid, null if invalid
     */
    async verifyAuth(): Promise<{
        user: { id: string; email: string; name: string; avatar_url?: string };
        workspace: { id: string; name: string } | null;
        workspaces: Array<{ id: string; name: string }>;
    } | null> {
        try {
            const baseUrl = await this.getBaseUrl();
            const auth = await getAuthState();

            if (!auth?.accessToken) {
                return null;
            }

            const response = await fetch(`${baseUrl}/extension/auth/verify`, {
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`
                }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.data;
        } catch {
            return null;
        }
    }

    /**
     * Check if user is authenticated (legacy method for compatibility)
     */
    async checkAuth(): Promise<boolean> {
        const result = await this.verifyAuth();
        return result !== null;
    }

    /**
     * Refresh access token using refresh token
     * Returns new tokens and user/workspace data, or null if refresh fails
     */
    async refreshToken(refreshToken: string): Promise<{
        user: { id: string; email: string; name: string; avatar_url?: string };
        workspace: { id: string; name: string } | null;
        workspaces: Array<{ id: string; name: string }>;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    } | null> {
        try {
            const baseUrl = await this.getBaseUrl();

            const response = await fetch(`${baseUrl}/extension/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.data;
        } catch {
            return null;
        }
    }

    /**
     * Get user context (workflows, agents, KBs)
     */
    async getUserContext(): Promise<ExtensionUserContext> {
        const baseUrl = await this.getBaseUrl();
        const auth = await getAuthState();

        const headers: Record<string, string> = {};

        if (auth?.accessToken) {
            headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }

        if (auth?.workspace?.id) {
            headers["X-Workspace-Id"] = auth.workspace.id;
        }

        // Use cache: "no-store" to avoid stale cached redirects
        const response = await fetch(`${baseUrl}/extension/user-context`, {
            headers,
            cache: "no-store"
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        return json.data !== undefined ? json.data : json;
    }

    /**
     * Execute a workflow with page context
     */
    async executeWorkflow(
        request: ExtensionExecuteWorkflowRequest
    ): Promise<ExtensionExecuteWorkflowResponse> {
        return this.request<ExtensionExecuteWorkflowResponse>("/extension/execute-workflow", {
            method: "POST",
            body: JSON.stringify(request)
        });
    }

    /**
     * Start agent chat with page context
     */
    async startAgentChat(request: ExtensionAgentChatRequest): Promise<ExtensionAgentChatResponse> {
        return this.request<ExtensionAgentChatResponse>("/extension/agent-chat", {
            method: "POST",
            body: JSON.stringify(request)
        });
    }

    /**
     * Get SSE stream URL for agent chat
     */
    async getAgentStreamUrl(agentId: string, executionId: string): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        const auth = await getAuthState();
        const token = auth?.accessToken || "";
        const workspaceId = auth?.workspace?.id || "";
        return `${baseUrl}/agents/${agentId}/executions/${executionId}/stream?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspaceId)}`;
    }

    /**
     * Send message to existing agent thread
     */
    async sendAgentMessage(
        agentId: string,
        threadId: string,
        message: string,
        pageContext?: PageContext
    ): Promise<ExtensionAgentChatResponse> {
        return this.request<ExtensionAgentChatResponse>(
            `/agents/${agentId}/threads/${threadId}/messages`,
            {
                method: "POST",
                body: JSON.stringify({
                    message,
                    pageContext
                })
            }
        );
    }

    /**
     * Get workflow execution status
     */
    async getExecutionStatus(
        executionId: string
    ): Promise<{ status: string; outputs?: Record<string, unknown> }> {
        return this.request(`/executions/${executionId}`);
    }

    /**
     * Add page content to knowledge base
     */
    async addToKnowledgeBase(
        knowledgeBaseId: string,
        pageContext: PageContext
    ): Promise<{ documentId: string }> {
        return this.request(`/knowledge-bases/${knowledgeBaseId}/documents`, {
            method: "POST",
            body: JSON.stringify({
                title: pageContext.title,
                content: pageContext.text,
                url: pageContext.url,
                metadata: pageContext.metadata
            })
        });
    }

    /**
     * Get OAuth URL for extension login
     */
    async getOAuthUrl(provider: "google" | "microsoft"): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        const redirectUrl = chrome.identity.getRedirectURL();

        const response = await fetch(
            `${baseUrl}/extension/auth/init?provider=${provider}&redirect_uri=${encodeURIComponent(redirectUrl)}`
        );

        if (!response.ok) {
            throw new Error("Failed to get OAuth URL");
        }

        const data = await response.json();
        return data.data.authUrl;
    }

    /**
     * Exchange OAuth code for tokens
     */
    async exchangeOAuthCode(
        provider: "google" | "microsoft",
        code: string
    ): Promise<{
        user: { id: string; email: string; name: string; avatar_url?: string };
        workspace: { id: string; name: string } | null;
        workspaces: Array<{ id: string; name: string }>;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }> {
        const baseUrl = await this.getBaseUrl();
        const redirectUrl = chrome.identity.getRedirectURL();

        const response = await fetch(`${baseUrl}/extension/auth/exchange`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                provider,
                code,
                redirect_uri: redirectUrl
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to exchange OAuth code");
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Login with email and password
     */
    async loginWithEmail(
        email: string,
        password: string,
        code?: string
    ): Promise<
        | {
              type: "success";
              user: { id: string; email: string; name: string; avatar_url?: string };
              token: string;
          }
        | {
              type: "two_factor_required";
              masked_phone: string;
          }
    > {
        const baseUrl = await this.getBaseUrl();

        const response = await fetch(`${baseUrl}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, code })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Invalid credentials");
        }

        const data = await response.json();

        // Check if 2FA is required
        if (data.data.two_factor_required) {
            return {
                type: "two_factor_required",
                masked_phone: data.data.masked_phone
            };
        }

        return {
            type: "success",
            user: data.data.user,
            token: data.data.token
        };
    }
}

export const api = new ExtensionApiClient();
