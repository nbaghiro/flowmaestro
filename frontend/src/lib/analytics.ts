import posthogClient from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

// Detect environment from URL or env var
function getEnvironment(): "development" | "staging" | "production" {
    if (import.meta.env.DEV) {
        return "development";
    }
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "development";
    }
    if (hostname.includes("staging") || hostname.includes("dev.")) {
        return "staging";
    }
    return "production";
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize PostHog analytics. Call once at app startup.
 * Skips initialization in development to avoid polluting production data.
 */
export function initAnalytics(): void {
    const environment = getEnvironment();

    // Skip analytics in development
    if (environment === "development") {
        return;
    }

    if (initialized || !POSTHOG_KEY) {
        return;
    }

    posthogClient.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage"
    });

    // Register super properties - these are sent with EVERY event
    posthogClient.register({
        environment,
        app_version: import.meta.env.VITE_APP_VERSION || "unknown",
        app_name: "frontend"
    });

    initialized = true;
}

/**
 * Identify a user after login
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
    if (!initialized) return;
    posthogClient.identify(userId, traits);
}

/**
 * Reset user identity on logout (creates new anonymous session)
 */
export function resetUser(): void {
    if (!initialized) return;
    posthogClient.reset();
}

/**
 * Generic event tracking - prefer using typed functions below
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (!initialized) return;
    posthogClient.capture(eventName, properties);
}

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

export const AuthEvents = {
    // Signup
    signupStarted: () => trackEvent("signup_started"),
    signupCompleted: (props: {
        authMethod: "email" | "google" | "microsoft";
        emailDomain?: string;
    }) =>
        trackEvent("signup_completed", {
            auth_method: props.authMethod,
            email_domain: props.emailDomain
        }),
    signupGoogleInitiated: () => trackEvent("signup_google_initiated"),
    signupMicrosoftInitiated: () => trackEvent("signup_microsoft_initiated"),
    emailVerificationSent: () => trackEvent("email_verification_sent"),
    emailVerified: () => trackEvent("email_verified"),
    emailVerificationFailed: () => trackEvent("email_verification_failed"),

    // Login
    loginStarted: () => trackEvent("login_started"),
    loginCompleted: (props: {
        authMethod: "email" | "google" | "microsoft";
        has2faEnabled: boolean;
    }) =>
        trackEvent("login_completed", {
            auth_method: props.authMethod,
            has_2fa_enabled: props.has2faEnabled
        }),
    loginFailed: (props: { reason: string }) =>
        trackEvent("login_failed", { reason: props.reason }),
    twoFactorCodeSent: () => trackEvent("two_factor_code_sent"),
    twoFactorVerified: () => trackEvent("two_factor_verified"),

    // Account Management
    passwordResetRequested: () => trackEvent("password_reset_requested"),
    passwordResetCompleted: () => trackEvent("password_reset_completed"),
    passwordChanged: () => trackEvent("password_changed"),
    profileUpdated: (props: { fieldsUpdated: string[] }) =>
        trackEvent("profile_updated", { fields_updated: props.fieldsUpdated }),
    twoFactorEnabled: () => trackEvent("two_factor_enabled"),
    twoFactorDisabled: () => trackEvent("two_factor_disabled"),
    googleAccountConnected: () => trackEvent("google_account_connected"),
    googleAccountUnlinked: () => trackEvent("google_account_unlinked"),
    microsoftAccountConnected: () => trackEvent("microsoft_account_connected"),
    microsoftAccountUnlinked: () => trackEvent("microsoft_account_unlinked"),
    logout: () => trackEvent("logout")
};

// ============================================================================
// WORKFLOW EVENTS
// ============================================================================

export const WorkflowEvents = {
    // List & Management
    listViewed: () => trackEvent("workflow_list_viewed"),
    created: (props: {
        templateUsed?: string;
        method: "blank" | "from_template" | "from_ai";
        nodeCount?: number;
    }) =>
        trackEvent("workflow_created", {
            template_used: props.templateUsed,
            method: props.method,
            node_count: props.nodeCount
        }),
    nameUpdated: (props: { workflowId: string }) =>
        trackEvent("workflow_name_updated", { workflow_id: props.workflowId }),
    descriptionUpdated: (props: { workflowId: string }) =>
        trackEvent("workflow_description_updated", { workflow_id: props.workflowId }),
    deleted: (props: { workflowId: string }) =>
        trackEvent("workflow_deleted", { workflow_id: props.workflowId }),
    duplicated: (props: { workflowId: string }) =>
        trackEvent("workflow_duplicated", { workflow_id: props.workflowId }),
    published: (props: { workflowId: string }) =>
        trackEvent("workflow_published", { workflow_id: props.workflowId }),
    unpublished: (props: { workflowId: string }) =>
        trackEvent("workflow_unpublished", { workflow_id: props.workflowId }),
    searched: (props: { query: string; resultsCount: number }) =>
        trackEvent("workflow_searched", { query: props.query, results_count: props.resultsCount }),
    batchDeleted: (props: { workflowIds: string[]; count: number }) =>
        trackEvent("workflows_batch_deleted", {
            workflow_ids: props.workflowIds,
            count: props.count
        }),
    batchMoved: (props: { workflowIds: string[]; targetFolderId?: string; count: number }) =>
        trackEvent("workflows_batch_moved", {
            workflow_ids: props.workflowIds,
            target_folder_id: props.targetFolderId,
            count: props.count
        }),

    // Flow Builder
    builderOpened: (props: { workflowId: string }) =>
        trackEvent("flow_builder_opened", { workflow_id: props.workflowId }),
    builderClosed: (props: {
        workflowId: string;
        unsavedChanges: boolean;
        sessionDurationMs: number;
    }) =>
        trackEvent("flow_builder_closed", {
            workflow_id: props.workflowId,
            unsaved_changes: props.unsavedChanges,
            session_duration_ms: props.sessionDurationMs
        }),
    nodeAdded: (props: { nodeType: string; provider?: string }) =>
        trackEvent("node_added", { node_type: props.nodeType, provider: props.provider }),
    nodeConfigured: (props: { nodeType: string }) =>
        trackEvent("node_configured", { node_type: props.nodeType }),
    nodeDeleted: (props: { nodeType: string }) =>
        trackEvent("node_deleted", { node_type: props.nodeType }),
    nodeDuplicated: (props: { nodeType: string }) =>
        trackEvent("node_duplicated", { node_type: props.nodeType }),
    edgeCreated: () => trackEvent("edge_created"),
    edgeDeleted: () => trackEvent("edge_deleted"),
    validated: (props: { isValid: boolean; errorCount: number }) =>
        trackEvent("workflow_validated", {
            is_valid: props.isValid,
            error_count: props.errorCount
        }),
    saved: (props: { workflowId: string; nodeCount: number; edgeCount: number }) =>
        trackEvent("workflow_saved", {
            workflow_id: props.workflowId,
            node_count: props.nodeCount,
            edge_count: props.edgeCount
        }),
    executed: (props: { workflowId: string; nodeCount: number; executionId: string }) =>
        trackEvent("workflow_executed", {
            workflow_id: props.workflowId,
            node_count: props.nodeCount,
            execution_id: props.executionId
        }),

    // AI Features
    aiChatOpened: (props: { workflowId: string }) =>
        trackEvent("ai_chat_opened", { workflow_id: props.workflowId }),
    aiSuggestionApplied: (props: { workflowId: string }) =>
        trackEvent("ai_suggestion_applied", { workflow_id: props.workflowId }),
    aiGenerationStarted: (props: { prompt: string }) =>
        trackEvent("workflow_ai_generation_started", { prompt: props.prompt }),
    aiGenerationCompleted: (props: { nodeCount: number; generationTimeMs: number }) =>
        trackEvent("workflow_ai_generation_completed", {
            node_count: props.nodeCount,
            generation_time_ms: props.generationTimeMs
        }),

    // Checkpoints
    checkpointCreated: (props: { workflowId: string; checkpointName: string }) =>
        trackEvent("checkpoint_created", {
            workflow_id: props.workflowId,
            checkpoint_name: props.checkpointName
        }),
    checkpointRestored: (props: { workflowId: string; checkpointId: string }) =>
        trackEvent("checkpoint_restored", {
            workflow_id: props.workflowId,
            checkpoint_id: props.checkpointId
        }),
    checkpointDeleted: (props: { workflowId: string; checkpointId: string }) =>
        trackEvent("checkpoint_deleted", {
            workflow_id: props.workflowId,
            checkpoint_id: props.checkpointId
        }),

    // Canvas
    autoLayoutTriggered: (props: { workflowId: string }) =>
        trackEvent("auto_layout_triggered", { workflow_id: props.workflowId }),
    keyboardShortcutUsed: (props: { shortcutKey: string }) =>
        trackEvent("keyboard_shortcut_used", { shortcut_key: props.shortcutKey }),

    // Flow Builder Additional
    sidebarTabChanged: (props: { workflowId: string; tabName: string }) =>
        trackEvent("flow_builder_sidebar_tab_changed", {
            workflow_id: props.workflowId,
            tab_name: props.tabName
        }),
    nodePaletteSearched: (props: { query: string }) =>
        trackEvent("node_palette_searched", { query: props.query }),
    nodePaletteCategoryExpanded: (props: { categoryName: string }) =>
        trackEvent("node_palette_category_expanded", { category_name: props.categoryName }),
    unsavedChangesDialogShown: (props: { workflowId: string }) =>
        trackEvent("unsaved_changes_dialog_shown", { workflow_id: props.workflowId }),
    unsavedChangesDiscarded: (props: { workflowId: string }) =>
        trackEvent("unsaved_changes_discarded", { workflow_id: props.workflowId }),
    unsavedChangesSaved: (props: { workflowId: string }) =>
        trackEvent("unsaved_changes_saved", { workflow_id: props.workflowId }),
    zoomChanged: (props: { workflowId: string; zoomLevel: number }) =>
        trackEvent("canvas_zoom_changed", {
            workflow_id: props.workflowId,
            zoom_level: props.zoomLevel
        }),
    fitToViewTriggered: (props: { workflowId: string }) =>
        trackEvent("canvas_fit_to_view", { workflow_id: props.workflowId })
};

// ============================================================================
// EXECUTION EVENTS
// ============================================================================

export const ExecutionEvents = {
    listViewed: () => trackEvent("execution_list_viewed"),
    started: (props: { workflowId: string; triggerType: string }) =>
        trackEvent("execution_started", {
            workflow_id: props.workflowId,
            trigger_type: props.triggerType
        }),
    completed: (props: {
        workflowId: string;
        executionId: string;
        status: "success" | "failed";
        durationMs: number;
        nodeCount: number;
    }) =>
        trackEvent("execution_completed", {
            workflow_id: props.workflowId,
            execution_id: props.executionId,
            status: props.status,
            duration_ms: props.durationMs,
            node_count: props.nodeCount
        }),
    failed: (props: {
        workflowId: string;
        executionId: string;
        errorNode?: string;
        errorMessage: string;
    }) =>
        trackEvent("execution_failed", {
            workflow_id: props.workflowId,
            execution_id: props.executionId,
            error_node: props.errorNode,
            error_message: props.errorMessage
        }),
    detailsViewed: (props: { executionId: string }) =>
        trackEvent("execution_details_viewed", { execution_id: props.executionId }),
    logViewed: (props: { executionId: string }) =>
        trackEvent("execution_log_viewed", { execution_id: props.executionId }),
    nodeExpanded: (props: { executionId: string; nodeId: string }) =>
        trackEvent("execution_node_expanded", {
            execution_id: props.executionId,
            node_id: props.nodeId
        }),
    outputCopied: (props: { executionId: string }) =>
        trackEvent("execution_output_copied", { execution_id: props.executionId }),
    cancelled: (props: { executionId: string }) =>
        trackEvent("execution_cancelled", { execution_id: props.executionId }),
    panelOpened: () => trackEvent("execution_panel_opened"),
    panelClosed: () => trackEvent("execution_panel_closed")
};

// ============================================================================
// INTEGRATION/CONNECTION EVENTS
// ============================================================================

export const IntegrationEvents = {
    pageViewed: () => trackEvent("connections_page_viewed"),
    providerBrowsed: (props: { providerName: string }) =>
        trackEvent("connection_provider_browsed", { provider_name: props.providerName }),
    connectionInitiated: (props: { provider: string }) =>
        trackEvent("connection_initiated", { provider: props.provider }),
    oauthAuthorized: (props: { provider: string }) =>
        trackEvent("connection_oauth_authorized", { provider: props.provider }),
    connectionCreated: (props: { provider: string; connectionId: string }) =>
        trackEvent("connection_created", {
            provider: props.provider,
            connection_id: props.connectionId
        }),
    connectionTested: (props: { provider: string; success: boolean }) =>
        trackEvent("connection_tested", { provider: props.provider, success: props.success }),
    connectionDetailsViewed: (props: { provider: string; connectionId: string }) =>
        trackEvent("connection_details_viewed", {
            provider: props.provider,
            connection_id: props.connectionId
        }),
    connectionUpdated: (props: { provider: string; connectionId: string }) =>
        trackEvent("connection_updated", {
            provider: props.provider,
            connection_id: props.connectionId
        }),
    connectionDeleted: (props: { provider: string; connectionId: string }) =>
        trackEvent("connection_deleted", {
            provider: props.provider,
            connection_id: props.connectionId
        }),
    comingSoonViewed: (props: { providerName: string }) =>
        trackEvent("provider_coming_soon_viewed", { provider_name: props.providerName }),
    nodeAddedToWorkflow: (props: { provider: string; workflowId: string }) =>
        trackEvent("integration_node_added_to_workflow", {
            provider: props.provider,
            workflow_id: props.workflowId
        }),
    configOpened: (props: { provider: string }) =>
        trackEvent("integration_config_opened", { provider: props.provider }),
    operationSelected: (props: { provider: string; operationName: string }) =>
        trackEvent("integration_operation_selected", {
            provider: props.provider,
            operation_name: props.operationName
        }),
    searched: (props: { query: string; resultsCount: number }) =>
        trackEvent("connections_searched", {
            query: props.query,
            results_count: props.resultsCount
        }),
    filtered: (props: { filterType: string; filterValue: string }) =>
        trackEvent("connections_filtered", {
            filter_type: props.filterType,
            filter_value: props.filterValue
        }),
    categoryBrowsed: (props: { categoryName: string }) =>
        trackEvent("connection_category_browsed", { category_name: props.categoryName })
};

// ============================================================================
// AGENT EVENTS
// ============================================================================

export const AgentEvents = {
    // List & Management
    listViewed: () => trackEvent("agents_list_viewed"),
    created: (props: {
        agentId: string;
        model: string;
        provider: string;
        toolsCount: number;
        templateUsed?: string;
    }) =>
        trackEvent("agent_created", {
            agent_id: props.agentId,
            model: props.model,
            provider: props.provider,
            tools_count: props.toolsCount,
            template_used: props.templateUsed
        }),
    nameUpdated: (props: { agentId: string }) =>
        trackEvent("agent_name_updated", { agent_id: props.agentId }),
    descriptionUpdated: (props: { agentId: string }) =>
        trackEvent("agent_description_updated", { agent_id: props.agentId }),
    systemPromptUpdated: (props: { agentId: string; promptLength: number }) =>
        trackEvent("agent_system_prompt_updated", {
            agent_id: props.agentId,
            prompt_length: props.promptLength
        }),
    temperatureAdjusted: (props: { agentId: string; temperatureValue: number }) =>
        trackEvent("agent_temperature_adjusted", {
            agent_id: props.agentId,
            temperature_value: props.temperatureValue
        }),
    toolAdded: (props: { agentId: string; toolId: string; toolType: "builtin" | "mcp" }) =>
        trackEvent("agent_tool_added", {
            agent_id: props.agentId,
            tool_id: props.toolId,
            tool_type: props.toolType
        }),
    toolsAddedBatch: (props: { agentId: string; toolCount: number }) =>
        trackEvent("agent_tools_added_batch", {
            agent_id: props.agentId,
            tool_count: props.toolCount
        }),
    toolRemoved: (props: { agentId: string; toolId: string }) =>
        trackEvent("agent_tool_removed", { agent_id: props.agentId, tool_id: props.toolId }),
    deleted: (props: { agentId: string }) =>
        trackEvent("agent_deleted", { agent_id: props.agentId }),
    duplicated: (props: { agentId: string }) =>
        trackEvent("agent_duplicated", { agent_id: props.agentId }),
    published: (props: { agentId: string }) =>
        trackEvent("agent_published", { agent_id: props.agentId }),
    unpublished: (props: { agentId: string }) =>
        trackEvent("agent_unpublished", { agent_id: props.agentId }),
    searched: (props: { query: string }) => trackEvent("agent_searched", { query: props.query }),
    batchDeleted: (props: { agentIds: string[]; count: number }) =>
        trackEvent("agents_batch_deleted", { agent_ids: props.agentIds, count: props.count }),
    batchMoved: (props: { agentIds: string[]; targetFolderId?: string; count: number }) =>
        trackEvent("agents_batch_moved", {
            agent_ids: props.agentIds,
            target_folder_id: props.targetFolderId,
            count: props.count
        }),

    // Builder
    builderOpened: (props: { agentId: string }) =>
        trackEvent("agent_builder_opened", { agent_id: props.agentId }),
    builderClosed: (props: { agentId: string }) =>
        trackEvent("agent_builder_closed", { agent_id: props.agentId }),
    modelChanged: (props: { agentId: string; newModel: string; previousModel: string }) =>
        trackEvent("agent_builder_model_changed", {
            agent_id: props.agentId,
            new_model: props.newModel,
            previous_model: props.previousModel
        }),
    providerChanged: (props: { agentId: string; newProvider: string; previousProvider: string }) =>
        trackEvent("agent_builder_provider_changed", {
            agent_id: props.agentId,
            new_provider: props.newProvider,
            previous_provider: props.previousProvider
        }),

    // Execution
    conversationStarted: (props: { agentId: string }) =>
        trackEvent("agent_conversation_started", { agent_id: props.agentId }),
    messageSent: (props: { agentId: string; messageLength: number }) =>
        trackEvent("agent_message_sent", {
            agent_id: props.agentId,
            message_length: props.messageLength
        }),
    responseReceived: (props: { agentId: string; responseTimeMs: number; tokensUsed?: number }) =>
        trackEvent("agent_response_received", {
            agent_id: props.agentId,
            response_time_ms: props.responseTimeMs,
            tokens_used: props.tokensUsed
        }),
    toolCalled: (props: { agentId: string; toolId: string; toolType: string }) =>
        trackEvent("agent_tool_called", {
            agent_id: props.agentId,
            tool_id: props.toolId,
            tool_type: props.toolType
        }),
    threadCreated: (props: { agentId: string; threadId: string }) =>
        trackEvent("agent_thread_created", { agent_id: props.agentId, thread_id: props.threadId }),
    threadViewed: (props: { threadId: string }) =>
        trackEvent("agent_thread_viewed", { thread_id: props.threadId }),
    threadArchived: (props: { threadId: string }) =>
        trackEvent("agent_thread_archived", { thread_id: props.threadId }),
    threadDeleted: (props: { threadId: string }) =>
        trackEvent("agent_thread_deleted", { thread_id: props.threadId })
};

// ============================================================================
// KNOWLEDGE BASE EVENTS
// ============================================================================

export const KnowledgeBaseEvents = {
    // Management
    listViewed: () => trackEvent("knowledge_bases_list_viewed"),
    created: (props: { kbId: string; embeddingModel: string }) =>
        trackEvent("knowledge_base_created", {
            kb_id: props.kbId,
            embedding_model: props.embeddingModel
        }),
    nameUpdated: (props: { kbId: string }) =>
        trackEvent("knowledge_base_name_updated", { kb_id: props.kbId }),
    descriptionUpdated: (props: { kbId: string }) =>
        trackEvent("knowledge_base_description_updated", { kb_id: props.kbId }),
    categorySet: (props: { kbId: string; category: string }) =>
        trackEvent("knowledge_base_category_set", { kb_id: props.kbId, category: props.category }),
    deleted: (props: { kbId: string }) =>
        trackEvent("knowledge_base_deleted", { kb_id: props.kbId }),
    duplicated: (props: { kbId: string }) =>
        trackEvent("knowledge_base_duplicated", { kb_id: props.kbId }),
    searched: (props: { query: string }) =>
        trackEvent("knowledge_base_searched", { query: props.query }),
    batchDeleted: (props: { kbIds: string[]; count: number }) =>
        trackEvent("knowledge_bases_batch_deleted", { kb_ids: props.kbIds, count: props.count }),
    batchMoved: (props: { kbIds: string[]; targetFolderId?: string; count: number }) =>
        trackEvent("knowledge_bases_batch_moved", {
            kb_ids: props.kbIds,
            target_folder_id: props.targetFolderId,
            count: props.count
        }),
    statsViewed: (props: { kbId: string; documentCount: number; chunkCount: number }) =>
        trackEvent("knowledge_base_stats_viewed", {
            kb_id: props.kbId,
            document_count: props.documentCount,
            chunk_count: props.chunkCount
        }),

    // Documents
    documentUploaded: (props: { kbId: string; fileType: string; fileSizeMb: number }) =>
        trackEvent("document_uploaded", {
            kb_id: props.kbId,
            file_type: props.fileType,
            file_size_mb: props.fileSizeMb
        }),
    documentUrlAdded: (props: { kbId: string; domain: string }) =>
        trackEvent("document_url_added", { kb_id: props.kbId, domain: props.domain }),
    documentProcessingStarted: (props: { kbId: string; documentId: string }) =>
        trackEvent("document_processing_started", {
            kb_id: props.kbId,
            document_id: props.documentId
        }),
    documentProcessingCompleted: (props: {
        kbId: string;
        documentId: string;
        chunkCount: number;
        processingTimeMs: number;
    }) =>
        trackEvent("document_processing_completed", {
            kb_id: props.kbId,
            document_id: props.documentId,
            chunk_count: props.chunkCount,
            processing_time_ms: props.processingTimeMs
        }),
    documentReprocessed: (props: { kbId: string; documentId: string }) =>
        trackEvent("document_reprocessed", { kb_id: props.kbId, document_id: props.documentId }),
    documentDownloaded: (props: { kbId: string; documentId: string }) =>
        trackEvent("document_downloaded", { kb_id: props.kbId, document_id: props.documentId }),
    documentDeleted: (props: { kbId: string; documentId: string }) =>
        trackEvent("document_deleted", { kb_id: props.kbId, document_id: props.documentId }),
    documentListViewed: (props: { kbId: string }) =>
        trackEvent("document_list_viewed", { kb_id: props.kbId }),

    // Queries
    queried: (props: {
        kbId: string;
        queryTextLength: number;
        resultsCount: number;
        queryTimeMs: number;
    }) =>
        trackEvent("kb_queried", {
            kb_id: props.kbId,
            query_text_length: props.queryTextLength,
            results_count: props.resultsCount,
            query_time_ms: props.queryTimeMs
        })
};

// ============================================================================
// CHAT INTERFACE EVENTS
// ============================================================================

export const ChatInterfaceEvents = {
    // Management
    listViewed: () => trackEvent("chat_interfaces_list_viewed"),
    created: (props: { interfaceId: string; workflowId?: string }) =>
        trackEvent("chat_interface_created", {
            interface_id: props.interfaceId,
            workflow_id: props.workflowId
        }),
    edited: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_edited", { interface_id: props.interfaceId }),
    published: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_published", { interface_id: props.interfaceId }),
    unpublished: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_unpublished", { interface_id: props.interfaceId }),
    duplicated: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_duplicated", { interface_id: props.interfaceId }),
    deleted: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_deleted", { interface_id: props.interfaceId }),
    batchDeleted: (props: { interfaceIds: string[]; count: number }) =>
        trackEvent("chat_interfaces_batch_deleted", {
            interface_ids: props.interfaceIds,
            count: props.count
        }),
    batchMoved: (props: { interfaceIds: string[]; targetFolderId?: string; count: number }) =>
        trackEvent("chat_interfaces_batch_moved", {
            interface_ids: props.interfaceIds,
            target_folder_id: props.targetFolderId,
            count: props.count
        }),
    searched: (props: { query: string; resultsCount: number }) =>
        trackEvent("chat_interfaces_searched", {
            query: props.query,
            results_count: props.resultsCount
        }),

    // Editor
    editorOpened: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_editor_opened", { interface_id: props.interfaceId }),
    editorClosed: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_editor_closed", { interface_id: props.interfaceId }),
    welcomeTextUpdated: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_welcome_text_updated", { interface_id: props.interfaceId }),
    coverImageSet: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_cover_image_set", { interface_id: props.interfaceId }),
    themeCustomized: (props: { interfaceId: string }) =>
        trackEvent("chat_interface_theme_customized", { interface_id: props.interfaceId }),

    // Sessions
    sessionStarted: (props: { interfaceId: string }) =>
        trackEvent("chat_session_started", { interface_id: props.interfaceId }),
    messageSent: (props: { interfaceId: string; sessionId: string; messageLength: number }) =>
        trackEvent("chat_message_sent", {
            interface_id: props.interfaceId,
            session_id: props.sessionId,
            message_length: props.messageLength
        }),
    responseReceived: (props: { interfaceId: string; responseTimeMs: number }) =>
        trackEvent("chat_response_received", {
            interface_id: props.interfaceId,
            response_time_ms: props.responseTimeMs
        }),
    sessionsViewed: (props: { interfaceId: string }) =>
        trackEvent("chat_sessions_viewed", { interface_id: props.interfaceId }),
    sessionDetailsViewed: (props: { sessionId: string }) =>
        trackEvent("chat_session_details_viewed", { session_id: props.sessionId }),
    statsViewed: (props: { interfaceId: string; sessionCount: number; messageCount: number }) =>
        trackEvent("chat_interface_stats_viewed", {
            interface_id: props.interfaceId,
            session_count: props.sessionCount,
            message_count: props.messageCount
        }),
    fileUploaded: (props: { interfaceId: string; fileType: string; fileSizeMb: number }) =>
        trackEvent("chat_file_uploaded", {
            interface_id: props.interfaceId,
            file_type: props.fileType,
            file_size_mb: props.fileSizeMb
        })
};

// ============================================================================
// FORM INTERFACE EVENTS
// ============================================================================

export const FormInterfaceEvents = {
    // Management
    listViewed: () => trackEvent("form_interfaces_list_viewed"),
    created: (props: { interfaceId: string; workflowId?: string }) =>
        trackEvent("form_interface_created", {
            interface_id: props.interfaceId,
            workflow_id: props.workflowId
        }),
    edited: (props: { interfaceId: string }) =>
        trackEvent("form_interface_edited", { interface_id: props.interfaceId }),
    published: (props: { interfaceId: string }) =>
        trackEvent("form_interface_published", { interface_id: props.interfaceId }),
    unpublished: (props: { interfaceId: string }) =>
        trackEvent("form_interface_unpublished", { interface_id: props.interfaceId }),
    duplicated: (props: { interfaceId: string }) =>
        trackEvent("form_interface_duplicated", { interface_id: props.interfaceId }),
    deleted: (props: { interfaceId: string }) =>
        trackEvent("form_interface_deleted", { interface_id: props.interfaceId }),
    batchDeleted: (props: { interfaceIds: string[]; count: number }) =>
        trackEvent("form_interfaces_batch_deleted", {
            interface_ids: props.interfaceIds,
            count: props.count
        }),
    batchMoved: (props: { interfaceIds: string[]; targetFolderId?: string; count: number }) =>
        trackEvent("form_interfaces_batch_moved", {
            interface_ids: props.interfaceIds,
            target_folder_id: props.targetFolderId,
            count: props.count
        }),
    searched: (props: { query: string; resultsCount: number }) =>
        trackEvent("form_interfaces_searched", {
            query: props.query,
            results_count: props.resultsCount
        }),
    submissionsViewed: (props: { interfaceId: string; submissionCount: number }) =>
        trackEvent("form_interface_submissions_viewed", {
            interface_id: props.interfaceId,
            submission_count: props.submissionCount
        }),
    submissionDetailsViewed: (props: { submissionId: string }) =>
        trackEvent("form_submission_details_viewed", { submission_id: props.submissionId }),

    // Builder
    editorOpened: (props: { interfaceId: string }) =>
        trackEvent("form_interface_editor_opened", { interface_id: props.interfaceId }),
    fieldAdded: (props: { interfaceId: string; fieldType: string }) =>
        trackEvent("form_field_added", {
            interface_id: props.interfaceId,
            field_type: props.fieldType
        }),
    fieldConfigured: (props: { interfaceId: string; fieldType: string }) =>
        trackEvent("form_field_configured", {
            interface_id: props.interfaceId,
            field_type: props.fieldType
        }),
    fieldDeleted: (props: { interfaceId: string }) =>
        trackEvent("form_field_deleted", { interface_id: props.interfaceId }),
    fieldReordered: (props: { interfaceId: string }) =>
        trackEvent("form_field_reordered", { interface_id: props.interfaceId }),

    // Public Submissions
    formViewed: (props: { interfaceId: string }) =>
        trackEvent("form_interface_viewed", { interface_id: props.interfaceId }),
    submissionStarted: (props: { interfaceId: string }) =>
        trackEvent("form_submission_started", { interface_id: props.interfaceId }),
    submitted: (props: { interfaceId: string; fieldCount: number; submissionTimeMs: number }) =>
        trackEvent("form_submitted", {
            interface_id: props.interfaceId,
            field_count: props.fieldCount,
            submission_time_ms: props.submissionTimeMs
        }),
    submissionError: (props: { interfaceId: string; errorMessage: string }) =>
        trackEvent("form_submission_error", {
            interface_id: props.interfaceId,
            error_message: props.errorMessage
        })
};

// ============================================================================
// PERSONA EVENTS
// ============================================================================

export const PersonaEvents = {
    // Browsing
    listViewed: () => trackEvent("personas_list_viewed"),
    categoryFiltered: (props: { category: string }) =>
        trackEvent("persona_category_filtered", { category: props.category }),
    searched: (props: { query: string }) => trackEvent("persona_searched", { query: props.query }),
    cardClicked: (props: { personaSlug: string }) =>
        trackEvent("persona_card_clicked", { persona_slug: props.personaSlug }),
    detailsViewed: (props: { personaSlug: string }) =>
        trackEvent("persona_details_viewed", { persona_slug: props.personaSlug }),

    // Instance Management
    instanceLaunchInitiated: (props: { personaSlug: string }) =>
        trackEvent("persona_instance_launch_initiated", { persona_slug: props.personaSlug }),
    instanceCreated: (props: { personaSlug: string; instanceId: string }) =>
        trackEvent("persona_instance_created", {
            persona_slug: props.personaSlug,
            instance_id: props.instanceId
        }),
    instanceViewed: (props: { instanceId: string }) =>
        trackEvent("persona_instance_viewed", { instance_id: props.instanceId }),
    clarificationSent: (props: { instanceId: string; questionCount: number }) =>
        trackEvent("persona_clarification_sent", {
            instance_id: props.instanceId,
            question_count: props.questionCount
        }),
    clarificationSkipped: (props: { instanceId: string }) =>
        trackEvent("persona_clarification_skipped", { instance_id: props.instanceId }),
    instanceMessageSent: (props: { instanceId: string }) =>
        trackEvent("persona_instance_message_sent", { instance_id: props.instanceId }),
    instanceResponseReceived: (props: { instanceId: string; responseTimeMs: number }) =>
        trackEvent("persona_instance_response_received", {
            instance_id: props.instanceId,
            response_time_ms: props.responseTimeMs
        }),
    instanceCompleted: (props: { instanceId: string; durationDays: number }) =>
        trackEvent("persona_instance_completed", {
            instance_id: props.instanceId,
            duration_days: props.durationDays
        }),
    instanceCancelled: (props: { instanceId: string }) =>
        trackEvent("persona_instance_cancelled", { instance_id: props.instanceId }),
    dashboardViewed: (props: { instanceCountTotal: number; instanceCountActive: number }) =>
        trackEvent("persona_instances_dashboard_viewed", {
            instance_count_total: props.instanceCountTotal,
            instance_count_active: props.instanceCountActive
        }),
    deliverableViewed: (props: { instanceId: string; deliverableType: string }) =>
        trackEvent("persona_deliverable_viewed", {
            instance_id: props.instanceId,
            deliverable_type: props.deliverableType
        }),
    connectionGranted: (props: { instanceId: string; provider: string }) =>
        trackEvent("persona_connection_granted", {
            instance_id: props.instanceId,
            provider: props.provider
        }),
    connectionRevoked: (props: { instanceId: string; provider: string }) =>
        trackEvent("persona_connection_revoked", {
            instance_id: props.instanceId,
            provider: props.provider
        })
};

// ============================================================================
// TEMPLATE EVENTS
// ============================================================================

export const TemplateEvents = {
    pageViewed: () => trackEvent("templates_page_viewed"),
    categoryBrowsed: (props: { category: string }) =>
        trackEvent("template_category_browsed", { category: props.category }),
    searched: (props: { query: string; templateType: "workflow" | "agent" }) =>
        trackEvent("template_searched", { query: props.query, template_type: props.templateType }),
    cardViewed: (props: { templateId: string; category: string }) =>
        trackEvent("template_card_viewed", {
            template_id: props.templateId,
            category: props.category
        }),
    detailsOpened: (props: { templateId: string }) =>
        trackEvent("template_details_opened", { template_id: props.templateId }),
    copied: (props: { templateId: string; templateType: "workflow" | "agent" }) =>
        trackEvent("template_copied", {
            template_id: props.templateId,
            template_type: props.templateType
        }),
    copyCompleted: (props: { templateId: string; newResourceId: string }) =>
        trackEvent("template_copy_completed", {
            template_id: props.templateId,
            new_resource_id: props.newResourceId
        })
};

// ============================================================================
// FOLDER EVENTS
// ============================================================================

export const FolderEvents = {
    created: (props: { parentFolderId?: string; resourceType: string }) =>
        trackEvent("folder_created", {
            parent_folder_id: props.parentFolderId,
            resource_type: props.resourceType
        }),
    opened: (props: { folderId: string }) =>
        trackEvent("folder_opened", { folder_id: props.folderId }),
    renamed: (props: { folderId: string }) =>
        trackEvent("folder_renamed", { folder_id: props.folderId }),
    moved: (props: { folderId: string; newParentId?: string }) =>
        trackEvent("folder_moved", { folder_id: props.folderId, new_parent_id: props.newParentId }),
    deleted: (props: { folderId: string; itemCountDeleted: number }) =>
        trackEvent("folder_deleted", {
            folder_id: props.folderId,
            item_count_deleted: props.itemCountDeleted
        }),
    itemMovedToFolder: (props: { folderId: string; resourceType: string; itemCount: number }) =>
        trackEvent("item_moved_to_folder", {
            folder_id: props.folderId,
            resource_type: props.resourceType,
            item_count: props.itemCount
        }),
    itemsRemovedFromFolder: (props: { folderId: string; itemCount: number }) =>
        trackEvent("items_removed_from_folder", {
            folder_id: props.folderId,
            item_count: props.itemCount
        }),
    breadcrumbNavigated: (props: { targetFolderId?: string; depth: number }) =>
        trackEvent("folder_breadcrumb_navigated", {
            target_folder_id: props.targetFolderId,
            depth: props.depth
        })
};

// ============================================================================
// WORKSPACE EVENTS
// ============================================================================

export const WorkspaceEvents = {
    // Management
    switcherOpened: () => trackEvent("workspace_switcher_opened"),
    switched: (props: { workspaceId: string; workspaceName: string }) =>
        trackEvent("workspace_switched", {
            workspace_id: props.workspaceId,
            workspace_name: props.workspaceName
        }),
    created: (props: { workspaceId: string; workspaceName: string }) =>
        trackEvent("workspace_created", {
            workspace_id: props.workspaceId,
            workspace_name: props.workspaceName
        }),
    settingsOpened: (props: { workspaceId: string }) =>
        trackEvent("workspace_settings_opened", { workspace_id: props.workspaceId }),
    infoUpdated: (props: { workspaceId: string; fieldsUpdated: string[] }) =>
        trackEvent("workspace_info_updated", {
            workspace_id: props.workspaceId,
            fields_updated: props.fieldsUpdated
        }),
    deleted: (props: { workspaceId: string }) =>
        trackEvent("workspace_deleted", { workspace_id: props.workspaceId }),
    limitsViewed: (props: { workspaceId: string; currentItemsCount: number; limit: number }) =>
        trackEvent("workspace_limits_viewed", {
            workspace_id: props.workspaceId,
            current_items_count: props.currentItemsCount,
            limit: props.limit
        }),

    // Team
    inviteDialogOpened: (props: { workspaceId: string }) =>
        trackEvent("invite_dialog_opened", { workspace_id: props.workspaceId }),
    memberInvited: (props: { workspaceId: string }) =>
        trackEvent("team_member_invited", { workspace_id: props.workspaceId }),
    memberJoined: (props: { workspaceId: string }) =>
        trackEvent("team_member_joined", { workspace_id: props.workspaceId }),
    memberRoleUpdated: (props: { workspaceId: string; newRole: string }) =>
        trackEvent("team_member_role_updated", {
            workspace_id: props.workspaceId,
            new_role: props.newRole
        }),
    memberRemoved: (props: { workspaceId: string }) =>
        trackEvent("team_member_removed", { workspace_id: props.workspaceId }),
    membersListViewed: (props: { workspaceId: string; memberCount: number }) =>
        trackEvent("members_list_viewed", {
            workspace_id: props.workspaceId,
            member_count: props.memberCount
        }),

    // Invitations
    invitationAccepted: (props: { workspaceId: string }) =>
        trackEvent("invitation_accepted", { workspace_id: props.workspaceId }),
    invitationDeclined: (props: { workspaceId: string }) =>
        trackEvent("invitation_declined", { workspace_id: props.workspaceId }),

    // Usage & Credits
    usageTabViewed: (props: { workspaceId: string }) =>
        trackEvent("workspace_usage_tab_viewed", { workspace_id: props.workspaceId }),
    creditsTabViewed: (props: { workspaceId: string; creditsRemaining: number }) =>
        trackEvent("workspace_credits_tab_viewed", {
            workspace_id: props.workspaceId,
            credits_remaining: props.creditsRemaining
        }),
    usageDetailsExpanded: (props: { workspaceId: string; resourceType: string }) =>
        trackEvent("workspace_usage_details_expanded", {
            workspace_id: props.workspaceId,
            resource_type: props.resourceType
        }),
    upgradePromptViewed: (props: { workspaceId: string; promptLocation: string }) =>
        trackEvent("workspace_upgrade_prompt_viewed", {
            workspace_id: props.workspaceId,
            prompt_location: props.promptLocation
        }),
    upgradePromptClicked: (props: { workspaceId: string; promptLocation: string }) =>
        trackEvent("workspace_upgrade_prompt_clicked", {
            workspace_id: props.workspaceId,
            prompt_location: props.promptLocation
        })
};

// ============================================================================
// BILLING EVENTS
// ============================================================================

export const BillingEvents = {
    pageViewed: (props: { workspaceId: string }) =>
        trackEvent("billing_page_viewed", { workspace_id: props.workspaceId }),
    subscriptionViewed: (props: { planType: string; billingCycle: string }) =>
        trackEvent("subscription_viewed", {
            plan_type: props.planType,
            billing_cycle: props.billingCycle
        }),
    upgradeDialogOpened: (props: { currentPlan: string; targetPlan: string }) =>
        trackEvent("upgrade_dialog_opened", {
            current_plan: props.currentPlan,
            target_plan: props.targetPlan
        }),
    planSelected: (props: { selectedPlan: string; creditAmount: number }) =>
        trackEvent("plan_selected", {
            selected_plan: props.selectedPlan,
            credit_amount: props.creditAmount
        }),
    creditSliderAdjusted: (props: { newCreditAmount: number; estimatedPrice: number }) =>
        trackEvent("credit_slider_adjusted", {
            new_credit_amount: props.newCreditAmount,
            estimated_price: props.estimatedPrice
        }),
    checkoutInitiated: (props: { planType: string; creditAmount: number; totalPrice: number }) =>
        trackEvent("subscription_checkout_initiated", {
            plan_type: props.planType,
            credit_amount: props.creditAmount,
            total_price: props.totalPrice
        }),
    subscriptionCreated: (props: {
        planType: string;
        billingAmount: number;
        billingCycle: string;
    }) =>
        trackEvent("subscription_created", {
            plan_type: props.planType,
            billing_amount: props.billingAmount,
            billing_cycle: props.billingCycle
        }),
    embeddedCheckoutOpened: (props: { planType: string }) =>
        trackEvent("embedded_checkout_opened", { plan_type: props.planType }),
    embeddedCheckoutCompleted: (props: { subscriptionId: string; amount: number }) =>
        trackEvent("embedded_checkout_completed", {
            subscription_id: props.subscriptionId,
            amount: props.amount
        }),
    creditPackageSelected: (props: { creditAmount: number; packagePrice: number }) =>
        trackEvent("credit_package_selected", {
            credit_amount: props.creditAmount,
            package_price: props.packagePrice
        }),
    creditPurchaseInitiated: (props: { creditAmount: number }) =>
        trackEvent("credit_purchase_initiated", { credit_amount: props.creditAmount }),
    creditPurchaseCompleted: (props: { creditAmount: number; pricePaid: number }) =>
        trackEvent("credit_purchase_completed", {
            credit_amount: props.creditAmount,
            price_paid: props.pricePaid
        }),
    paymentHistoryViewed: (props: { workspaceId: string }) =>
        trackEvent("payment_history_viewed", { workspace_id: props.workspaceId }),
    billingPortalOpened: (props: { workspaceId: string }) =>
        trackEvent("billing_portal_opened", { workspace_id: props.workspaceId }),
    subscriptionCancelled: (props: { planType: string; cancellationReason?: string }) =>
        trackEvent("subscription_cancelled", {
            plan_type: props.planType,
            cancellation_reason: props.cancellationReason
        }),
    subscriptionReactivated: (props: { planType: string }) =>
        trackEvent("subscription_reactivated", { plan_type: props.planType }),
    creditsBalanceChecked: (props: { workspaceId: string; balance: number }) =>
        trackEvent("credits_balance_checked", {
            workspace_id: props.workspaceId,
            balance: props.balance
        })
};

// ============================================================================
// SETTINGS EVENTS
// ============================================================================

export const SettingsEvents = {
    // Account
    accountPageViewed: () => trackEvent("account_page_viewed"),
    profileSectionExpanded: () => trackEvent("profile_section_expanded"),
    securitySectionExpanded: () => trackEvent("security_section_expanded"),
    profileEditModalOpened: () => trackEvent("profile_edit_modal_opened"),
    profileChangesSaved: (props: { fieldsUpdated: string[] }) =>
        trackEvent("profile_changes_saved", { fields_updated: props.fieldsUpdated }),
    passwordChangeModalOpened: () => trackEvent("password_change_modal_opened"),

    // API Keys
    apiKeysViewed: (props: { apiKeyCount: number }) =>
        trackEvent("api_keys_viewed", { api_key_count: props.apiKeyCount }),
    apiKeyCreated: (props: { keyId: string; scopes?: string[] }) =>
        trackEvent("api_key_created", { key_id: props.keyId, scopes: props.scopes }),
    apiKeyDetailsViewed: (props: { keyId: string }) =>
        trackEvent("api_key_details_viewed", { key_id: props.keyId }),
    apiKeyCopied: (props: { keyId: string }) =>
        trackEvent("api_key_copied", { key_id: props.keyId }),
    apiKeyRotated: (props: { oldKeyId: string; newKeyId: string }) =>
        trackEvent("api_key_rotated", { old_key_id: props.oldKeyId, new_key_id: props.newKeyId }),
    apiKeyRevoked: (props: { keyId: string }) =>
        trackEvent("api_key_revoked", { key_id: props.keyId }),
    apiKeyBundleSelected: (props: { bundleName: string; scopeCount: number }) =>
        trackEvent("api_key_bundle_selected", {
            bundle_name: props.bundleName,
            scope_count: props.scopeCount
        }),
    apiKeyScopeToggled: (props: { scope: string; enabled: boolean }) =>
        trackEvent("api_key_scope_toggled", { scope: props.scope, enabled: props.enabled }),

    // OAuth Connections (Account-level)
    oauthConnectionsViewed: () => trackEvent("oauth_connections_viewed"),
    oauthConnectionLinked: (props: { provider: string }) =>
        trackEvent("oauth_connection_linked", { provider: props.provider }),
    oauthConnectionUnlinked: (props: { provider: string }) =>
        trackEvent("oauth_connection_unlinked", { provider: props.provider }),

    // Preferences
    themeChanged: (props: { newTheme: "light" | "dark" | "system" }) =>
        trackEvent("theme_changed", { new_theme: props.newTheme }),
    notificationPreferenceChanged: (props: { notificationType: string; enabled: boolean }) =>
        trackEvent("notification_preference_changed", {
            notification_type: props.notificationType,
            enabled: props.enabled
        })
};

// ============================================================================
// NAVIGATION EVENTS
// ============================================================================

export const NavigationEvents = {
    searchInitiated: (props: { query: string; contextPage: string }) =>
        trackEvent("search_initiated", { query: props.query, context_page: props.contextPage }),
    searchResultsViewed: (props: { query: string; resultCount: number; resultType: string }) =>
        trackEvent("search_results_viewed", {
            query: props.query,
            result_count: props.resultCount,
            result_type: props.resultType
        }),
    searchResultClicked: (props: { resultType: string; resultId: string }) =>
        trackEvent("search_result_clicked", {
            result_type: props.resultType,
            result_id: props.resultId
        }),
    sidebarCollapsed: (props: { collapsed: boolean }) =>
        trackEvent("sidebar_collapsed", { collapsed: props.collapsed }),
    pageNavigation: (props: { pageName: string; fromPage?: string }) =>
        trackEvent("page_navigation", { page_name: props.pageName, from_page: props.fromPage }),
    breadcrumbClicked: (props: { breadcrumbLevel: number }) =>
        trackEvent("breadcrumb_clicked", { breadcrumb_level: props.breadcrumbLevel })
};

// ============================================================================
// ERROR EVENTS
// ============================================================================

export const ErrorEvents = {
    errorOccurred: (props: {
        errorType: string;
        errorMessage: string;
        pageName: string;
        componentName?: string;
    }) =>
        trackEvent("error_occurred", {
            error_type: props.errorType,
            error_message: props.errorMessage,
            page_name: props.pageName,
            component_name: props.componentName
        }),
    apiError: (props: { endpoint: string; statusCode: number; errorMessage: string }) =>
        trackEvent("api_error", {
            endpoint: props.endpoint,
            status_code: props.statusCode,
            error_message: props.errorMessage
        }),
    validationError: (props: { formName: string; fieldErrors: Record<string, string> }) =>
        trackEvent("validation_error", {
            form_name: props.formName,
            field_errors: props.fieldErrors
        }),
    networkError: (props: { errorType: string }) =>
        trackEvent("network_error", { error_type: props.errorType }),
    timeoutError: (props: { endpoint: string; timeoutMs: number }) =>
        trackEvent("timeout_error", { endpoint: props.endpoint, timeout_ms: props.timeoutMs })
};

// ============================================================================
// ONBOARDING EVENTS
// ============================================================================

export const OnboardingEvents = {
    started: () => trackEvent("onboarding_started"),
    stepViewed: (props: { stepNumber: number; stepName: string }) =>
        trackEvent("onboarding_step_viewed", {
            step_number: props.stepNumber,
            step_name: props.stepName
        }),
    stepCompleted: (props: { stepNumber: number; stepName: string; stepDurationMs: number }) =>
        trackEvent("onboarding_step_completed", {
            step_number: props.stepNumber,
            step_name: props.stepName,
            step_duration_ms: props.stepDurationMs
        }),
    skipped: (props: { stepNumber: number }) =>
        trackEvent("onboarding_skipped", { step_number: props.stepNumber }),
    completed: (props: { totalDurationMs: number; stepsCompleted: number }) =>
        trackEvent("onboarding_completed", {
            total_duration_ms: props.totalDurationMs,
            steps_completed: props.stepsCompleted
        }),
    firstWorkflowCreationStarted: () => trackEvent("first_workflow_creation_started"),
    firstWorkflowCreated: (props: { workflowId: string; creationTimeMs: number }) =>
        trackEvent("first_workflow_created", {
            workflow_id: props.workflowId,
            creation_time_ms: props.creationTimeMs
        }),
    firstWorkflowExecuted: (props: { workflowId: string; executionResult: "success" | "failed" }) =>
        trackEvent("first_workflow_executed", {
            workflow_id: props.workflowId,
            execution_result: props.executionResult
        })
};

// ============================================================================
// TRIGGER EVENTS
// ============================================================================

export const TriggerEvents = {
    // Management
    listViewed: (props: { workflowId: string }) =>
        trackEvent("triggers_list_viewed", { workflow_id: props.workflowId }),
    created: (props: {
        workflowId: string;
        triggerId: string;
        triggerType: "webhook" | "schedule" | "manual" | "form" | "api";
    }) =>
        trackEvent("trigger_created", {
            workflow_id: props.workflowId,
            trigger_id: props.triggerId,
            trigger_type: props.triggerType
        }),
    configured: (props: { triggerId: string; triggerType: string; configFields: string[] }) =>
        trackEvent("trigger_configured", {
            trigger_id: props.triggerId,
            trigger_type: props.triggerType,
            config_fields: props.configFields
        }),
    enabled: (props: { triggerId: string; triggerType: string }) =>
        trackEvent("trigger_enabled", {
            trigger_id: props.triggerId,
            trigger_type: props.triggerType
        }),
    disabled: (props: { triggerId: string; triggerType: string }) =>
        trackEvent("trigger_disabled", {
            trigger_id: props.triggerId,
            trigger_type: props.triggerType
        }),
    tested: (props: { triggerId: string; triggerType: string; success: boolean }) =>
        trackEvent("trigger_tested", {
            trigger_id: props.triggerId,
            trigger_type: props.triggerType,
            success: props.success
        }),
    deleted: (props: { triggerId: string; triggerType: string }) =>
        trackEvent("trigger_deleted", {
            trigger_id: props.triggerId,
            trigger_type: props.triggerType
        }),

    // Webhook-specific
    webhookUrlCopied: (props: { triggerId: string }) =>
        trackEvent("trigger_webhook_url_copied", { trigger_id: props.triggerId }),
    webhookSecretRegenerated: (props: { triggerId: string }) =>
        trackEvent("trigger_webhook_secret_regenerated", { trigger_id: props.triggerId }),

    // Schedule-specific
    scheduleExpressionUpdated: (props: { triggerId: string; cronExpression: string }) =>
        trackEvent("trigger_schedule_updated", {
            trigger_id: props.triggerId,
            cron_expression: props.cronExpression
        }),
    scheduleTimezoneChanged: (props: { triggerId: string; timezone: string }) =>
        trackEvent("trigger_timezone_changed", {
            trigger_id: props.triggerId,
            timezone: props.timezone
        })
};

// ============================================================================
// MCP SERVER EVENTS
// ============================================================================

export const MCPServerEvents = {
    // Source Selection
    addServerDialogOpened: () => trackEvent("mcp_add_server_dialog_opened"),
    sourceChosen: (props: { source: "connection" | "custom" }) =>
        trackEvent("mcp_source_chosen", { source: props.source }),

    // From Connection
    providerSelected: (props: { provider: string }) =>
        trackEvent("mcp_provider_selected", { provider: props.provider }),
    connectionSelected: (props: { connectionId: string; provider: string }) =>
        trackEvent("mcp_connection_selected", {
            connection_id: props.connectionId,
            provider: props.provider
        }),
    toolsLoaded: (props: { connectionId: string; toolCount: number }) =>
        trackEvent("mcp_tools_loaded", {
            connection_id: props.connectionId,
            tool_count: props.toolCount
        }),
    toolsAdded: (props: { connectionId: string; toolIds: string[]; count: number }) =>
        trackEvent("mcp_tools_added", {
            connection_id: props.connectionId,
            tool_ids: props.toolIds,
            count: props.count
        }),

    // Custom Server
    customServerAdded: (props: { serverName: string; serverUrl: string }) =>
        trackEvent("mcp_custom_server_added", {
            server_name: props.serverName,
            server_url: props.serverUrl
        }),
    customServerConfigured: (props: { serverId: string }) =>
        trackEvent("mcp_custom_server_configured", { server_id: props.serverId }),
    customServerTested: (props: { serverId: string; success: boolean }) =>
        trackEvent("mcp_custom_server_tested", {
            server_id: props.serverId,
            success: props.success
        }),

    // Management
    serverRemoved: (props: { serverId: string; serverType: "connection" | "custom" }) =>
        trackEvent("mcp_server_removed", {
            server_id: props.serverId,
            server_type: props.serverType
        }),
    toolEnabled: (props: { serverId: string; toolId: string }) =>
        trackEvent("mcp_tool_enabled", { server_id: props.serverId, tool_id: props.toolId }),
    toolDisabled: (props: { serverId: string; toolId: string }) =>
        trackEvent("mcp_tool_disabled", { server_id: props.serverId, tool_id: props.toolId }),
    serverRefreshed: (props: { serverId: string; newToolCount: number }) =>
        trackEvent("mcp_server_refreshed", {
            server_id: props.serverId,
            new_tool_count: props.newToolCount
        })
};

// ============================================================================
// ANALYTICS PAGE EVENTS
// ============================================================================

export const AnalyticsPageEvents = {
    pageViewed: (props: { workspaceId: string }) =>
        trackEvent("analytics_page_viewed", { workspace_id: props.workspaceId }),
    periodChanged: (props: { period: string; startDate?: string; endDate?: string }) =>
        trackEvent("analytics_period_changed", {
            period: props.period,
            start_date: props.startDate,
            end_date: props.endDate
        }),
    modelUsageViewed: (props: { modelName: string; usageAmount: number }) =>
        trackEvent("analytics_model_usage_viewed", {
            model_name: props.modelName,
            usage_amount: props.usageAmount
        }),
    executionStatsViewed: (props: { totalExecutions: number; successRate: number }) =>
        trackEvent("analytics_execution_stats_viewed", {
            total_executions: props.totalExecutions,
            success_rate: props.successRate
        }),
    resourceBreakdownViewed: (props: { resourceType: string }) =>
        trackEvent("analytics_resource_breakdown_viewed", { resource_type: props.resourceType }),
    chartInteracted: (props: { chartType: string; interactionType: string }) =>
        trackEvent("analytics_chart_interacted", {
            chart_type: props.chartType,
            interaction_type: props.interactionType
        }),
    dataExported: (props: { exportFormat: string; dateRange: string }) =>
        trackEvent("analytics_data_exported", {
            export_format: props.exportFormat,
            date_range: props.dateRange
        })
};

// ============================================================================
// DIALOG EVENTS
// ============================================================================

export const DialogEvents = {
    createDialogOpened: (props: {
        dialogType: "workflow" | "agent" | "form" | "chat" | "kb" | "folder";
    }) => trackEvent("create_dialog_opened", { dialog_type: props.dialogType }),
    createItemSubmitted: (props: { dialogType: string; itemName: string }) =>
        trackEvent("create_item_submitted", {
            dialog_type: props.dialogType,
            item_name: props.itemName
        }),
    createItemCancelled: (props: { dialogType: string }) =>
        trackEvent("create_item_cancelled", { dialog_type: props.dialogType }),
    confirmDialogShown: (props: { actionType: string }) =>
        trackEvent("confirm_dialog_shown", { action_type: props.actionType }),
    confirmActionAccepted: (props: { actionType: string }) =>
        trackEvent("confirm_action_accepted", { action_type: props.actionType }),
    confirmActionDeclined: (props: { actionType: string }) =>
        trackEvent("confirm_action_declined", { action_type: props.actionType }),
    publishDialogOpened: (props: { resourceType: string }) =>
        trackEvent("publish_dialog_opened", { resource_type: props.resourceType }),
    publishCompleted: (props: { resourceType: string; resourceId: string }) =>
        trackEvent("publish_completed", {
            resource_type: props.resourceType,
            resource_id: props.resourceId
        })
};
