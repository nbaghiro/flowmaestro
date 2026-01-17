// ============================================================================
// BROWSER EXTENSION TYPES
// ============================================================================

import type { JsonObject } from "./types";

/**
 * Screenshot data captured from a web page
 */
export interface ScreenshotData {
    /** Type of screenshot capture */
    type: "viewport" | "fullpage" | "element";
    /** Base64 encoded PNG image data */
    data: string;
    /** Image dimensions */
    dimensions: {
        width: number;
        height: number;
    };
    /** CSS selector if element capture */
    elementSelector?: string;
}

/**
 * Structured data extracted from a table
 */
export interface ExtractedTable {
    /** Table headers */
    headers: string[];
    /** Table rows (array of arrays) */
    rows: string[][];
    /** Caption or aria-label if present */
    caption?: string;
}

/**
 * Structured data extracted from a list
 */
export interface ExtractedList {
    /** List type */
    type: "ordered" | "unordered";
    /** List items */
    items: string[];
}

/**
 * Structured data extracted from a form
 */
export interface ExtractedForm {
    /** Form action URL */
    action?: string;
    /** Form method */
    method?: string;
    /** Form fields */
    fields: {
        name: string;
        type: string;
        label?: string;
        value?: string;
        options?: string[];
    }[];
}

/**
 * Heading structure extracted from page
 */
export interface ExtractedHeading {
    /** Heading level (1-6) */
    level: number;
    /** Heading text */
    text: string;
}

/**
 * Page metadata extracted from meta tags
 */
export interface PageMetadata {
    /** Meta description */
    description?: string;
    /** Meta keywords */
    keywords?: string[];
    /** Open Graph image URL */
    ogImage?: string;
    /** Open Graph title */
    ogTitle?: string;
    /** Open Graph description */
    ogDescription?: string;
    /** Author meta tag */
    author?: string;
    /** Publish date (from various meta tags) */
    publishDate?: string;
    /** Canonical URL */
    canonicalUrl?: string;
    /** Favicon URL */
    favicon?: string;
}

/**
 * Structured data extracted from page DOM
 */
export interface StructuredPageData {
    /** Tables found on the page */
    tables: ExtractedTable[];
    /** Lists found on the page */
    lists: ExtractedList[];
    /** Forms found on the page */
    forms: ExtractedForm[];
    /** Headings hierarchy */
    headings: ExtractedHeading[];
}

/**
 * Complete page context extracted by the extension
 */
export interface PageContext {
    /** Current page URL */
    url: string;
    /** Page title */
    title: string;
    /** Cleaned visible text content */
    text: string;
    /** Optional raw HTML (for debugging) */
    html?: string;
    /** Screenshot data */
    screenshot?: ScreenshotData;
    /** Page metadata */
    metadata: PageMetadata;
    /** Structured data (tables, lists, forms, headings) */
    structured?: StructuredPageData;
    /** User-selected text (if any) */
    selection?: string;
    /** Timestamp when content was extracted */
    extractedAt: string;
}

// ============================================================================
// PERMISSION TYPES
// ============================================================================

/**
 * Permission levels for page access
 */
export type PermissionLevel = "none" | "once" | "site" | "all";

/**
 * Permission decision for a specific action
 */
export interface PermissionDecision {
    /** The action being requested */
    action: "read_page" | "screenshot" | "execute_workflow" | "agent_chat";
    /** Domain this permission applies to */
    domain: string;
    /** Permission level granted */
    level: PermissionLevel;
    /** When permission was granted */
    grantedAt: string;
    /** When permission expires (if applicable) */
    expiresAt?: string;
}

/**
 * Stored permission settings
 */
export interface PermissionSettings {
    /** Site-level permissions (domain -> level) */
    sitePermissions: Record<string, PermissionLevel>;
    /** Blocked domains (never allow) */
    blockedDomains: string[];
    /** Recent permission decisions */
    recentDecisions: PermissionDecision[];
    /** Global default permission level */
    defaultLevel: PermissionLevel;
}

// ============================================================================
// INPUT MAPPING TYPES
// ============================================================================

/**
 * Source of data for workflow input mapping
 */
export type InputMappingSource =
    | "text"
    | "selection"
    | "screenshot"
    | "url"
    | "title"
    | "metadata"
    | "none";

/**
 * Mapping of page context to workflow input
 */
export interface InputMapping {
    /** Target node ID in the workflow */
    nodeId: string;
    /** Node name for display */
    nodeName: string;
    /** Node type */
    nodeType: string;
    /** Source of data */
    source: InputMappingSource;
    /** Confidence score (0-1) for auto-detected mappings */
    confidence: number;
    /** Whether this mapping was manually set */
    isManual: boolean;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to process page context
 */
export interface ProcessPageContextRequest {
    /** Page context from extension */
    pageContext: PageContext;
}

/**
 * Response from page context processing
 */
export interface ProcessPageContextResponse {
    /** Processed and cleaned page context */
    pageContext: PageContext;
    /** Summary of the page content */
    summary?: string;
    /** Detected content type */
    contentType?: string;
}

/**
 * Request to execute a workflow from extension
 */
export interface ExtensionExecuteWorkflowRequest {
    /** Workflow ID to execute */
    workflowId: string;
    /** Page context to use as input */
    pageContext: PageContext;
    /** Input mappings (auto-detected or manual) */
    inputMappings: InputMapping[];
}

/**
 * Response from workflow execution
 */
export interface ExtensionExecuteWorkflowResponse {
    /** Execution ID */
    executionId: string;
    /** Execution status */
    status: "pending" | "running" | "completed" | "failed";
    /** Workflow outputs */
    outputs?: JsonObject;
    /** Error message if failed */
    error?: string;
}

/**
 * Request to chat with an agent from extension
 */
export interface ExtensionAgentChatRequest {
    /** Agent ID */
    agentId: string;
    /** Thread ID (optional, creates new if not provided) */
    threadId?: string;
    /** User message */
    message: string;
    /** Page context to include */
    pageContext?: PageContext;
    /** Whether to include page context in this message */
    includePageContext: boolean;
}

/**
 * Response from agent chat
 */
export interface ExtensionAgentChatResponse {
    /** Execution ID for streaming */
    executionId: string;
    /** Thread ID */
    threadId: string;
    /** Initial status */
    status: "started" | "streaming" | "completed" | "failed";
}

/**
 * User context for extension (workflows, agents, KBs)
 */
export interface ExtensionUserContext {
    /** User's workflows (simplified) */
    workflows: ExtensionWorkflowSummary[];
    /** User's agents (simplified) */
    agents: ExtensionAgentSummary[];
    /** User's knowledge bases (simplified) */
    knowledgeBases: ExtensionKnowledgeBaseSummary[];
    /** Pinned workflow IDs */
    pinnedWorkflowIds: string[];
    /** Pinned agent IDs */
    pinnedAgentIds: string[];
    /** Recent workflow IDs */
    recentWorkflowIds: string[];
    /** Recent agent IDs */
    recentAgentIds: string[];
}

/**
 * Simplified workflow info for extension
 */
export interface ExtensionWorkflowSummary {
    id: string;
    name: string;
    description?: string;
    /** Input nodes that can receive page context */
    inputNodes: {
        id: string;
        name: string;
        type: string;
        inputType?: string;
    }[];
    /** Last used timestamp */
    lastUsedAt?: string;
}

/**
 * Simplified agent info for extension
 */
export interface ExtensionAgentSummary {
    id: string;
    name: string;
    description?: string;
    /** Last used timestamp */
    lastUsedAt?: string;
}

/**
 * Simplified KB info for extension
 */
export interface ExtensionKnowledgeBaseSummary {
    id: string;
    name: string;
    description?: string;
    /** Document count */
    documentCount: number;
}

// ============================================================================
// MESSAGE TYPES (Extension <-> Service Worker <-> Content Script)
// ============================================================================

/**
 * Message types for extension internal communication
 */
export type ExtensionMessageType =
    | "GET_PAGE_CONTEXT"
    | "PAGE_CONTEXT_RESULT"
    | "CAPTURE_SCREENSHOT"
    | "SCREENSHOT_RESULT"
    | "REQUEST_PERMISSION"
    | "PERMISSION_RESULT"
    | "OPEN_SIDEBAR"
    | "AUTH_STATUS"
    | "AUTH_TOKEN"
    | "EXECUTE_WORKFLOW"
    | "AGENT_CHAT"
    | "PING"
    | "PONG"
    | "ERROR";

/**
 * Base message structure
 */
export interface ExtensionMessage {
    type: ExtensionMessageType;
    payload?: unknown;
    error?: string;
    requestId?: string;
}

/**
 * Message to request page context from content script
 */
export interface GetPageContextMessage extends ExtensionMessage {
    type: "GET_PAGE_CONTEXT";
    payload: {
        includeScreenshot: boolean;
        screenshotType?: "viewport" | "fullpage" | "element";
        elementSelector?: string;
        includeStructured: boolean;
    };
}

/**
 * Message with page context result
 */
export interface PageContextResultMessage {
    type: "PAGE_CONTEXT_RESULT";
    payload: PageContext;
    error?: string;
    requestId?: string;
}

// ============================================================================
// EXTENSION STORAGE TYPES
// ============================================================================

/**
 * Authentication state stored in extension
 */
export interface ExtensionAuthState {
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** JWT access token */
    accessToken?: string;
    /** Refresh token */
    refreshToken?: string;
    /** Token expiration timestamp */
    expiresAt?: string;
    /** User info */
    user?: {
        id: string;
        email: string;
        name?: string;
    };
    /** Active workspace */
    workspace?: {
        id: string;
        name: string;
    };
}

/**
 * Extension settings stored locally
 */
export interface ExtensionSettings {
    /** FlowMaestro API base URL */
    apiBaseUrl: string;
    /** Permission settings */
    permissions: PermissionSettings;
    /** UI preferences */
    ui: {
        /** Default tab in sidebar */
        defaultTab: "agents" | "workflows" | "kb";
        /** Auto-include page text */
        autoIncludeText: boolean;
        /** Auto-include screenshot */
        autoIncludeScreenshot: boolean;
    };
    /** Last synced timestamp */
    lastSyncedAt?: string;
}

/**
 * Default extension settings
 */
export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
    apiBaseUrl: "https://api.flowmaestro.io",
    permissions: {
        sitePermissions: {},
        blockedDomains: [
            "accounts.google.com",
            "login.microsoftonline.com",
            "auth0.com",
            "*.bank.com",
            "*.bankofamerica.com",
            "*.chase.com",
            "*.wellsfargo.com"
        ],
        recentDecisions: [],
        defaultLevel: "none"
    },
    ui: {
        defaultTab: "agents",
        autoIncludeText: true,
        autoIncludeScreenshot: false
    }
};
