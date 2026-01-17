import type { ExtensionMessage, PageContext } from "@flowmaestro/shared";
import { api } from "../shared/api";
import { getAuthState, setAuthState, clearAuthState, setUserContext } from "../shared/storage";

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        console.log("FlowMaestro extension installed");
        // Set default side panel behavior
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
});

/**
 * Handle extension icon click - open side panel
 */
chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
    }
});

/**
 * Handle messages from content scripts and sidebar
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => {
            console.error("Message handler error:", error);
            sendResponse({ type: "ERROR", error: error.message });
        });
    return true; // Keep channel open for async response
});

/**
 * Get the active tab ID - either from sender (if from content script) or from active tab query
 */
async function getActiveTabId(senderTabId?: number): Promise<number | undefined> {
    // If message came from a content script, use that tab
    if (senderTabId) {
        return senderTabId;
    }

    // Otherwise, query for the active tab in the current window
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return activeTab?.id;
}

/**
 * Process incoming messages
 */
async function handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender
): Promise<ExtensionMessage> {
    switch (message.type) {
        case "GET_PAGE_CONTEXT": {
            const tabId = await getActiveTabId(sender.tab?.id);
            return handleGetPageContext(tabId);
        }

        case "CAPTURE_SCREENSHOT": {
            const tabId = await getActiveTabId(sender.tab?.id);
            return handleCaptureScreenshot(tabId);
        }

        case "AUTH_STATUS":
            return handleAuthStatus();

        case "EXECUTE_WORKFLOW": {
            const payload = message.payload as unknown as {
                workflowId: string;
                pageContext: PageContext;
                inputMappings: unknown[];
            };
            return handleExecuteWorkflow(payload);
        }

        case "AGENT_CHAT": {
            const payload = message.payload as unknown as {
                agentId: string;
                threadId?: string;
                message: string;
                pageContext?: PageContext;
            };
            return handleAgentChat(payload);
        }

        default:
            return { type: "ERROR", error: `Unknown message type: ${message.type}` };
    }
}

/**
 * Ensure content script is injected into the tab
 */
async function ensureContentScriptInjected(tabId: number): Promise<void> {
    try {
        // Try to ping the content script
        await chrome.tabs.sendMessage(tabId, { type: "PING" });
    } catch {
        // Content script not loaded, inject it
        // Get content script path from manifest
        const manifest = chrome.runtime.getManifest();
        const contentScriptPath = manifest.content_scripts?.[0]?.js?.[0];

        if (contentScriptPath) {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: [contentScriptPath]
            });
            // Wait a bit for the script to initialize
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}

/**
 * Request page context from content script
 */
async function handleGetPageContext(tabId?: number): Promise<ExtensionMessage> {
    if (!tabId) {
        return { type: "ERROR", error: "No tab ID provided" };
    }

    try {
        // Check if we can access this tab (not a chrome:// URL, etc.)
        const tab = await chrome.tabs.get(tabId);
        if (
            !tab.url ||
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("chrome-extension://")
        ) {
            return { type: "ERROR", error: "Cannot extract content from this page" };
        }

        // Ensure content script is injected
        await ensureContentScriptInjected(tabId);

        const response = await chrome.tabs.sendMessage(tabId, {
            type: "GET_PAGE_CONTEXT",
            payload: {
                includeScreenshot: false,
                includeStructured: true
            }
        });
        return response;
    } catch (error) {
        return {
            type: "ERROR",
            error: error instanceof Error ? error.message : "Failed to get page context"
        };
    }
}

/**
 * Capture screenshot of current tab
 */
async function handleCaptureScreenshot(tabId?: number): Promise<ExtensionMessage> {
    if (!tabId) {
        return { type: "ERROR", error: "No tab ID provided" };
    }

    try {
        // Capture the visible tab - use default window
        const dataUrl = await chrome.tabs.captureVisibleTab({
            format: "png",
            quality: 90
        });

        // Get dimensions from the image
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const img = await createImageBitmap(blob);

        return {
            type: "SCREENSHOT_RESULT",
            payload: {
                type: "viewport" as const,
                data: dataUrl.split(",")[1], // Remove data URL prefix
                dimensions: {
                    width: img.width,
                    height: img.height
                }
            }
        };
    } catch (error) {
        return {
            type: "ERROR",
            error: error instanceof Error ? error.message : "Failed to capture screenshot"
        };
    }
}

/**
 * Check authentication status
 */
async function handleAuthStatus(): Promise<ExtensionMessage> {
    const authState = await getAuthState();

    if (!authState?.accessToken) {
        return {
            type: "AUTH_STATUS",
            payload: { isAuthenticated: false }
        };
    }

    // Check if token is expired
    if (authState.expiresAt && new Date(authState.expiresAt) < new Date()) {
        // TODO: Implement token refresh
        await clearAuthState();
        return {
            type: "AUTH_STATUS",
            payload: { isAuthenticated: false }
        };
    }

    // Verify token is still valid
    const isValid = await api.checkAuth();
    if (!isValid) {
        await clearAuthState();
        return {
            type: "AUTH_STATUS",
            payload: { isAuthenticated: false }
        };
    }

    return {
        type: "AUTH_STATUS",
        payload: {
            isAuthenticated: true,
            user: authState.user,
            workspace: authState.workspace
        }
    };
}

/**
 * Execute workflow
 */
async function handleExecuteWorkflow(payload: {
    workflowId: string;
    pageContext: PageContext;
    inputMappings: unknown[];
}): Promise<ExtensionMessage> {
    try {
        const result = await api.executeWorkflow({
            workflowId: payload.workflowId,
            pageContext: payload.pageContext,
            inputMappings: payload.inputMappings as ExtensionMessage["payload"] extends {
                inputMappings: infer T;
            }
                ? T
                : never
        });

        return {
            type: "EXECUTE_WORKFLOW",
            payload: result
        };
    } catch (error) {
        return {
            type: "ERROR",
            error: error instanceof Error ? error.message : "Failed to execute workflow"
        };
    }
}

/**
 * Start or continue agent chat
 */
async function handleAgentChat(payload: {
    agentId: string;
    threadId?: string;
    message: string;
    pageContext?: PageContext;
}): Promise<ExtensionMessage> {
    try {
        const result = await api.startAgentChat({
            agentId: payload.agentId,
            threadId: payload.threadId,
            message: payload.message,
            pageContext: payload.pageContext,
            includePageContext: !!payload.pageContext
        });

        return {
            type: "AGENT_CHAT",
            payload: result
        };
    } catch (error) {
        return {
            type: "ERROR",
            error: error instanceof Error ? error.message : "Failed to start agent chat"
        };
    }
}

/**
 * Handle OAuth callback
 */
chrome.identity.onSignInChanged?.addListener(async (_account, signedIn) => {
    if (signedIn) {
        // Refresh user context
        try {
            const userContext = await api.getUserContext();
            await setUserContext(userContext);
        } catch (error) {
            console.error("Failed to fetch user context:", error);
        }
    } else {
        await clearAuthState();
    }
});

/**
 * Handle web navigation to capture OAuth callbacks
 */
chrome.webNavigation?.onCompleted.addListener(async (details) => {
    const url = new URL(details.url);

    // Check if this is an OAuth callback
    if (url.pathname.includes("/auth/callback")) {
        const token = url.searchParams.get("token");
        const refreshToken = url.searchParams.get("refreshToken");
        const expiresIn = url.searchParams.get("expiresIn");

        if (token) {
            const expiresAt = expiresIn
                ? new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString()
                : undefined;

            await setAuthState({
                isAuthenticated: true,
                accessToken: token,
                refreshToken: refreshToken || undefined,
                expiresAt
            });

            // Fetch user info and context
            try {
                const userContext = await api.getUserContext();
                await setUserContext(userContext);
            } catch (error) {
                console.error("Failed to fetch user context:", error);
            }

            // Close the auth tab
            if (details.tabId) {
                chrome.tabs.remove(details.tabId);
            }
        }
    }
});

// Export for testing
export { handleMessage, handleGetPageContext, handleCaptureScreenshot };
