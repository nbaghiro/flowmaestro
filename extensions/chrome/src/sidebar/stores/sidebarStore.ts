import { create } from "zustand";
import type {
    ExtensionAuthState,
    ExtensionUserContext,
    ExtensionWorkspace,
    PageContext,
    ExtensionAgentSummary,
    ExtensionWorkflowSummary
} from "@flowmaestro/shared";
import { api } from "../../shared/api";
import {
    getAuthState,
    getUserContext,
    setAuthState,
    consumeInitialTab
} from "../../shared/storage";

export type TabType = "agents" | "workflows" | "kb";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    toolCalls?: {
        name: string;
        args: string;
        result?: string;
    }[];
}

interface SidebarState {
    // Auth state
    isAuthenticated: boolean;
    isLoading: boolean;
    user: ExtensionAuthState["user"] | null;
    workspace: ExtensionWorkspace | null;
    workspaces: ExtensionWorkspace[];
    switchWorkspace: (workspace: ExtensionWorkspace) => Promise<void>;

    // UI state
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;

    // User context
    userContext: ExtensionUserContext | null;
    loadUserContext: () => Promise<void>;

    // Page context
    pageContext: PageContext | null;
    isExtractingPage: boolean;
    includePageText: boolean;
    includeScreenshot: boolean;
    setIncludePageText: (include: boolean) => void;
    setIncludeScreenshot: (include: boolean) => void;
    extractPageContext: () => Promise<void>;
    captureScreenshot: () => Promise<void>;

    // Agent chat
    selectedAgent: ExtensionAgentSummary | null;
    setSelectedAgent: (agent: ExtensionAgentSummary | null) => void;
    messages: Message[];
    isStreaming: boolean;
    threadId: string | null;
    sendMessage: (content: string) => Promise<void>;
    clearChat: () => void;

    // Workflow execution
    selectedWorkflow: ExtensionWorkflowSummary | null;
    setSelectedWorkflow: (workflow: ExtensionWorkflowSummary | null) => void;
    isExecuting: boolean;
    executionResult: { status: string; outputs?: Record<string, unknown> } | null;
    executeWorkflow: () => Promise<void>;

    // Initialize
    initialize: () => Promise<void>;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
    // Auth state
    isAuthenticated: false,
    isLoading: true,
    user: null,
    workspace: null,
    workspaces: [],

    switchWorkspace: async (workspace) => {
        console.log("[SidebarStore] Switching to workspace:", workspace.name);

        // Update the selected workspace in state
        set({ workspace, userContext: null });

        // Update stored auth state with new workspace
        const authState = await getAuthState();
        if (authState) {
            await setAuthState({
                ...authState,
                workspace
            });
        }

        // Reload user context for the new workspace
        await get().loadUserContext();

        // Clear any active chat/workflow state
        set({
            selectedAgent: null,
            selectedWorkflow: null,
            messages: [],
            threadId: null,
            executionResult: null
        });
    },

    // UI state
    activeTab: "agents",
    setActiveTab: (tab) => set({ activeTab: tab }),

    // User context
    userContext: null,
    loadUserContext: async () => {
        try {
            // First try cached context
            const cached = await getUserContext();
            if (cached) {
                set({ userContext: cached });
            }

            // Then fetch fresh
            const fresh = await api.getUserContext();
            set({ userContext: fresh });
        } catch (error) {
            console.error("Failed to load user context:", error);
        }
    },

    // Page context
    pageContext: null,
    isExtractingPage: false,
    includePageText: true,
    includeScreenshot: false,
    setIncludePageText: (include) => set({ includePageText: include }),
    setIncludeScreenshot: (include) => set({ includeScreenshot: include }),

    extractPageContext: async () => {
        set({ isExtractingPage: true });
        try {
            const response = await chrome.runtime.sendMessage({
                type: "GET_PAGE_CONTEXT"
            });

            if (response.type === "PAGE_CONTEXT_RESULT") {
                set({ pageContext: response.payload });
            } else if (response.type === "ERROR") {
                console.error("Failed to extract page context:", response.error);
            }
        } catch (error) {
            console.error("Failed to extract page context:", error);
        } finally {
            set({ isExtractingPage: false });
        }
    },

    captureScreenshot: async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "CAPTURE_SCREENSHOT"
            });

            if (response.type === "SCREENSHOT_RESULT") {
                const current = get().pageContext;
                set({
                    pageContext: current ? { ...current, screenshot: response.payload } : null
                });
            }
        } catch (error) {
            console.error("Failed to capture screenshot:", error);
        }
    },

    // Agent chat
    selectedAgent: null,
    setSelectedAgent: (agent) => set({ selectedAgent: agent, messages: [], threadId: null }),
    messages: [],
    isStreaming: false,
    threadId: null,

    sendMessage: async (content) => {
        const {
            selectedAgent,
            pageContext,
            includePageText,
            includeScreenshot,
            threadId,
            messages
        } = get();
        if (!selectedAgent) return;

        // Add user message
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content,
            timestamp: new Date().toISOString()
        };
        set({ messages: [...messages, userMessage], isStreaming: true });

        try {
            // Prepare page context if needed
            let contextToSend: PageContext | undefined;
            if (includePageText || includeScreenshot) {
                if (!pageContext) {
                    await get().extractPageContext();
                }
                contextToSend = get().pageContext || undefined;

                // Remove screenshot if not requested
                if (contextToSend && !includeScreenshot) {
                    contextToSend = { ...contextToSend, screenshot: undefined };
                }

                // Remove text if not requested
                if (contextToSend && !includePageText) {
                    contextToSend = { ...contextToSend, text: "" };
                }
            }

            // Start chat
            const response = await api.startAgentChat({
                agentId: selectedAgent.id,
                threadId: threadId || undefined,
                message: content,
                pageContext: contextToSend,
                includePageContext: !!contextToSend
            });

            // Update thread ID
            set({ threadId: response.threadId });

            // Stream response via SSE
            const streamUrl = await api.getAgentStreamUrl(selectedAgent.id, response.executionId);

            const eventSource = new EventSource(streamUrl);
            let assistantContent = "";

            // Handle token events (streaming content)
            eventSource.addEventListener("token", (event) => {
                const data = JSON.parse(event.data);
                assistantContent += data.token || "";
                const currentMessages = get().messages;
                const lastMessage = currentMessages[currentMessages.length - 1];

                if (lastMessage?.role === "assistant") {
                    // Update existing assistant message
                    set({
                        messages: [
                            ...currentMessages.slice(0, -1),
                            { ...lastMessage, content: assistantContent }
                        ]
                    });
                } else {
                    // Add new assistant message
                    set({
                        messages: [
                            ...currentMessages,
                            {
                                id: crypto.randomUUID(),
                                role: "assistant",
                                content: assistantContent,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    });
                }
            });

            // Handle completion event
            eventSource.addEventListener("completed", () => {
                eventSource.close();
                set({ isStreaming: false });
            });

            // Handle error event from server
            eventSource.addEventListener("error", (event) => {
                // Check if it's a MessageEvent with data (server-sent error)
                const messageEvent = event as MessageEvent;
                if (messageEvent.data) {
                    try {
                        console.error("Agent chat error:", JSON.parse(messageEvent.data));
                    } catch {
                        console.error("Agent chat error:", messageEvent.data);
                    }
                }
                eventSource.close();
                set({ isStreaming: false });
            });

            // Handle connection errors
            eventSource.onerror = () => {
                eventSource.close();
                set({ isStreaming: false });
            };
        } catch (error) {
            console.error("Failed to send message:", error);
            set({ isStreaming: false });
        }
    },

    clearChat: () => set({ messages: [], threadId: null }),

    // Workflow execution
    selectedWorkflow: null,
    setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow, executionResult: null }),
    isExecuting: false,
    executionResult: null,

    executeWorkflow: async () => {
        const { selectedWorkflow, pageContext, includePageText, includeScreenshot } = get();
        if (!selectedWorkflow) return;

        set({ isExecuting: true, executionResult: null });

        try {
            // Extract page context if needed and not already extracted
            if ((includePageText || includeScreenshot) && !pageContext) {
                await get().extractPageContext();
            }

            let contextToSend = get().pageContext;

            // Filter based on preferences
            if (contextToSend) {
                if (!includeScreenshot) {
                    contextToSend = { ...contextToSend, screenshot: undefined };
                }
                if (!includePageText) {
                    contextToSend = { ...contextToSend, text: "" };
                }
            }

            if (!contextToSend) {
                throw new Error("No page context available");
            }

            // Auto-generate input mappings
            const inputMappings = selectedWorkflow.inputNodes.map((node) => ({
                nodeId: node.id,
                nodeName: node.name,
                nodeType: node.type,
                source:
                    node.type === "url"
                        ? ("url" as const)
                        : node.type === "files" || node.type === "vision"
                          ? ("screenshot" as const)
                          : ("text" as const),
                confidence: 0.8,
                isManual: false
            }));

            const result = await api.executeWorkflow({
                workflowId: selectedWorkflow.id,
                pageContext: contextToSend,
                inputMappings
            });

            // Poll for completion
            type ExecutionStatus = "pending" | "running" | "completed" | "failed";
            let status: ExecutionStatus = result.status as ExecutionStatus;
            while (status === "pending" || status === "running") {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                const statusResult = await api.getExecutionStatus(result.executionId);
                status = statusResult.status as ExecutionStatus;

                if (status === "completed" || status === "failed") {
                    set({ executionResult: statusResult });
                    break;
                }
            }
        } catch (error) {
            console.error("Failed to execute workflow:", error);
            set({
                executionResult: {
                    status: "failed",
                    outputs: { error: error instanceof Error ? error.message : "Unknown error" }
                }
            });
        } finally {
            set({ isExecuting: false });
        }
    },

    // Initialize
    initialize: async () => {
        set({ isLoading: true });

        try {
            // Check if a specific tab was requested (from popup menu)
            const initialTab = await consumeInitialTab();
            if (initialTab) {
                set({ activeTab: initialTab });
            }

            const authState = await getAuthState();
            console.log("[SidebarStore] Auth state from storage:", authState);

            if (authState?.isAuthenticated && authState.accessToken) {
                // Check if token is expired or about to expire (within 5 minutes)
                const expiryBuffer = 5 * 60 * 1000;
                const isExpiredOrExpiring =
                    authState.expiresAt &&
                    new Date(authState.expiresAt).getTime() - Date.now() < expiryBuffer;

                if (isExpiredOrExpiring && authState.refreshToken) {
                    console.log("[SidebarStore] Token expired/expiring, attempting refresh...");
                    const refreshResult = await api.refreshToken(authState.refreshToken);

                    if (refreshResult) {
                        console.log("[SidebarStore] Token refreshed successfully");
                        const newExpiresAt = new Date(
                            Date.now() + refreshResult.expiresIn * 1000
                        ).toISOString();

                        await setAuthState({
                            isAuthenticated: true,
                            accessToken: refreshResult.accessToken,
                            refreshToken: refreshResult.refreshToken,
                            expiresAt: newExpiresAt,
                            user: refreshResult.user,
                            workspace: refreshResult.workspace || authState.workspace,
                            workspaces: refreshResult.workspaces || []
                        });

                        set({
                            isAuthenticated: true,
                            user: refreshResult.user,
                            workspace: refreshResult.workspace || authState.workspace,
                            workspaces: refreshResult.workspaces || []
                        });

                        await get().loadUserContext();
                        return;
                    } else {
                        console.log("[SidebarStore] Token refresh failed");
                        set({ isAuthenticated: false, workspaces: [] });
                        return;
                    }
                }

                // Verify auth is still valid and get fresh user/workspace data
                console.log("[SidebarStore] Verifying auth...");
                const verifyResult = await api.verifyAuth();
                console.log("[SidebarStore] Verify result:", verifyResult);

                if (verifyResult) {
                    // Update auth state with workspace and workspaces if missing
                    if (!authState.workspace && verifyResult.workspace) {
                        console.log("[SidebarStore] Updating auth state with workspace");
                        await setAuthState({
                            ...authState,
                            workspace: verifyResult.workspace,
                            workspaces: verifyResult.workspaces || []
                        });
                    }

                    set({
                        isAuthenticated: true,
                        user: verifyResult.user,
                        workspace: verifyResult.workspace || authState.workspace,
                        workspaces: verifyResult.workspaces || []
                    });

                    // Load user context
                    await get().loadUserContext();
                } else {
                    // Verification failed - try refresh as last resort
                    console.log("[SidebarStore] Verify failed, attempting refresh...");
                    if (authState.refreshToken) {
                        const refreshResult = await api.refreshToken(authState.refreshToken);

                        if (refreshResult) {
                            console.log("[SidebarStore] Token refreshed after verify failure");
                            const newExpiresAt = new Date(
                                Date.now() + refreshResult.expiresIn * 1000
                            ).toISOString();

                            await setAuthState({
                                isAuthenticated: true,
                                accessToken: refreshResult.accessToken,
                                refreshToken: refreshResult.refreshToken,
                                expiresAt: newExpiresAt,
                                user: refreshResult.user,
                                workspace: refreshResult.workspace || authState.workspace,
                                workspaces: refreshResult.workspaces || []
                            });

                            set({
                                isAuthenticated: true,
                                user: refreshResult.user,
                                workspace: refreshResult.workspace || authState.workspace,
                                workspaces: refreshResult.workspaces || []
                            });

                            await get().loadUserContext();
                            return;
                        }
                    }
                    console.log("[SidebarStore] All auth attempts failed");
                    set({ isAuthenticated: false, workspaces: [] });
                }
            } else {
                console.log("[SidebarStore] No auth state or token, setting isAuthenticated=false");
                set({ isAuthenticated: false, workspaces: [] });
            }
        } catch (error) {
            console.error("[SidebarStore] Failed to initialize:", error);
            set({ isAuthenticated: false, workspaces: [] });
        } finally {
            set({ isLoading: false });
        }
    }
}));
