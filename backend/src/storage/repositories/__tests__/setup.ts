/**
 * Shared test utilities for repository tests
 *
 * This file provides mock helpers and common test data generators
 * for testing repository classes without a real database connection.
 */

import type { QueryResult, QueryResultRow } from "pg";

// ============================================================================
// MOCK QUERY RESULT HELPERS
// ============================================================================

/**
 * Create a mock query result with rows
 */
export function mockRows<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
    return {
        rows,
        rowCount: rows.length,
        command: "SELECT",
        oid: 0,
        fields: []
    };
}

/**
 * Create a mock result for INSERT/UPDATE/DELETE without RETURNING
 */
export function mockAffectedRows(count: number): QueryResult<never> {
    return {
        rows: [],
        rowCount: count,
        command: "UPDATE",
        oid: 0,
        fields: []
    };
}

/**
 * Create a mock result for INSERT ... RETURNING
 */
export function mockInsertReturning<T extends QueryResultRow>(inserted: T[]): QueryResult<T> {
    return {
        rows: inserted,
        rowCount: inserted.length,
        command: "INSERT",
        oid: 0,
        fields: []
    };
}

/**
 * Create an empty result (no rows found)
 */
export function mockEmptyResult(): QueryResult<never> {
    return {
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: []
    };
}

/**
 * Create a mock count result
 */
export function mockCountResult(count: number): QueryResult<{ count: string }> {
    return {
        rows: [{ count: count.toString() }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: []
    };
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate a random UUID-like string for testing
 */
export function generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Generate a mock timestamp
 */
export function generateTimestamp(daysAgo: number = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
}

/**
 * Generate a mock user row
 */
export function generateUserRow(overrides: Partial<MockUserRow> = {}): MockUserRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        email: `user-${Math.random().toString(36).slice(2)}@example.com`,
        password_hash: "$2b$10$mockhashedpassword",
        name: "Test User",
        google_id: null,
        microsoft_id: null,
        auth_provider: "local",
        avatar_url: null,
        email_verified: false,
        email_verified_at: null,
        created_at: now,
        updated_at: now,
        last_login_at: null,
        two_factor_enabled: false,
        two_factor_phone: null,
        two_factor_phone_verified: false,
        two_factor_secret: null,
        ...overrides
    };
}

/**
 * Generate a mock workspace row
 */
export function generateWorkspaceRow(overrides: Partial<MockWorkspaceRow> = {}): MockWorkspaceRow {
    const now = generateTimestamp();
    const name = overrides.name || "Test Workspace";
    return {
        id: generateId(),
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        description: null,
        owner_id: generateId(),
        settings: "{}",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock workflow row
 */
export function generateWorkflowRow(overrides: Partial<MockWorkflowRow> = {}): MockWorkflowRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        name: "Test Workflow",
        description: null,
        definition: JSON.stringify({ nodes: {}, edges: [] }),
        user_id: generateId(),
        workspace_id: generateId(),
        version: 1,
        ai_generated: false,
        ai_prompt: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock agent row
 */
export function generateAgentRow(overrides: Partial<MockAgentRow> = {}): MockAgentRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Agent",
        description: null,
        model: "gpt-4",
        provider: "openai",
        connection_id: null,
        system_prompt: "You are a helpful assistant.",
        temperature: 0.7,
        max_tokens: 4000,
        max_iterations: 100,
        available_tools: "[]",
        memory_config: JSON.stringify({ type: "buffer", max_messages: 20 }),
        safety_config: "{}",
        metadata: "{}",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock connection row
 */
export function generateConnectionRow(
    overrides: Partial<MockConnectionRow> = {}
): MockConnectionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Connection",
        connection_method: "api_key",
        provider: "openai",
        encrypted_data: "encrypted_mock_data",
        metadata: "{}",
        status: "active",
        capabilities: "{}",
        last_used_at: null,
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock folder row
 */
export function generateFolderRow(overrides: Partial<MockFolderRow> = {}): MockFolderRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Folder",
        color: "#6366f1",
        position: 0,
        parent_id: null,
        depth: 0,
        path: "",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock thread row
 */
export function generateThreadRow(overrides: Partial<MockThreadRow> = {}): MockThreadRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        agent_id: generateId(),
        execution_id: null,
        user_id: generateId(),
        workspace_id: generateId(),
        title: "Test Thread",
        messages: "[]",
        metadata: "{}",
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        last_message_at: now,
        archived_at: null,
        ...overrides
    };
}

/**
 * Generate a mock API key row
 */
export function generateApiKeyRow(overrides: Partial<MockApiKeyRow> = {}): MockApiKeyRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test API Key",
        key_prefix: "fm_live_xxxx",
        key_hash: "mockkeyhash",
        scopes: ["workflows:read", "workflows:execute"],
        rate_limit_per_minute: 60,
        rate_limit_per_day: 10000,
        expires_at: null,
        last_used_at: null,
        last_used_ip: null,
        is_active: true,
        created_at: now,
        updated_at: now,
        revoked_at: null,
        ...overrides
    };
}

/**
 * Generate a mock knowledge base row
 */
export function generateKnowledgeBaseRow(
    overrides: Partial<MockKnowledgeBaseRow> = {}
): MockKnowledgeBaseRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Knowledge Base",
        description: null,
        config: "{}",
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock execution row
 */
export function generateExecutionRow(overrides: Partial<MockExecutionRow> = {}): MockExecutionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        workflow_id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        status: "pending",
        context: "{}",
        started_at: null,
        completed_at: null,
        error: null,
        trigger_type: "manual",
        trigger_data: "{}",
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock trigger row
 */
export function generateTriggerRow(overrides: Partial<MockTriggerRow> = {}): MockTriggerRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        workflow_id: generateId(),
        name: "Test Trigger",
        trigger_type: "webhook",
        config: JSON.stringify({ path: "/api/webhook" }),
        enabled: true,
        last_triggered_at: null,
        next_scheduled_at: null,
        trigger_count: 0,
        temporal_schedule_id: null,
        webhook_secret: "test-webhook-secret",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock trigger execution row
 */
export function generateTriggerExecutionRow(
    overrides: Partial<MockTriggerExecutionRow> = {}
): MockTriggerExecutionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        trigger_id: generateId(),
        execution_id: generateId(),
        trigger_payload: null,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock webhook log row
 */
export function generateWebhookLogRow(
    overrides: Partial<MockWebhookLogRow> = {}
): MockWebhookLogRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        trigger_id: generateId(),
        workflow_id: generateId(),
        request_method: "POST",
        request_path: "/api/webhook",
        request_headers: JSON.stringify({ "content-type": "application/json" }),
        request_body: JSON.stringify({ data: "test" }),
        request_query: null,
        response_status: 200,
        response_body: JSON.stringify({ success: true }),
        error: null,
        execution_id: null,
        ip_address: "127.0.0.1",
        user_agent: "test-agent",
        processing_time_ms: 100,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock template row
 */
export function generateTemplateRow(overrides: Partial<MockTemplateRow> = {}): MockTemplateRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        name: "Test Template",
        description: "A test template",
        definition: JSON.stringify({
            name: "Test Template",
            nodes: {},
            edges: [],
            entryPoint: "start"
        }),
        category: "marketing",
        tags: ["test", "example"],
        icon: null,
        color: "#6366f1",
        preview_image_url: null,
        author_name: "Test Author",
        author_avatar_url: null,
        view_count: 0,
        use_count: 0,
        featured: false,
        sort_order: 0,
        required_integrations: [],
        version: "1.0.0",
        status: "active",
        created_at: now,
        updated_at: now,
        published_at: now,
        ...overrides
    };
}

/**
 * Generate a mock workspace member row
 */
export function generateWorkspaceMemberRow(
    overrides: Partial<MockWorkspaceMemberRow> = {}
): MockWorkspaceMemberRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        workspace_id: generateId(),
        user_id: generateId(),
        role: "member",
        invited_by: null,
        invited_at: null,
        accepted_at: now,
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock workspace invitation row
 */
export function generateWorkspaceInvitationRow(
    overrides: Partial<MockWorkspaceInvitationRow> = {}
): MockWorkspaceInvitationRow {
    const now = generateTimestamp();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return {
        id: generateId(),
        workspace_id: generateId(),
        email: `invite-${Math.random().toString(36).slice(2)}@example.com`,
        role: "member",
        token: `inv_${Math.random().toString(36).slice(2)}`,
        invited_by: generateId(),
        message: null,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        accepted_at: null,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock workspace credits row
 */
export function generateWorkspaceCreditsRow(
    overrides: Partial<MockWorkspaceCreditsRow> = {}
): MockWorkspaceCreditsRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        workspace_id: generateId(),
        subscription_balance: 1000,
        purchased_balance: 0,
        bonus_balance: 0,
        reserved: 0,
        subscription_expires_at: null,
        lifetime_allocated: 1000,
        lifetime_purchased: 0,
        lifetime_used: 0,
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock credit transaction row
 */
export function generateCreditTransactionRow(
    overrides: Partial<MockCreditTransactionRow> = {}
): MockCreditTransactionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        workspace_id: generateId(),
        user_id: null,
        amount: -10,
        balance_before: 100,
        balance_after: 90,
        transaction_type: "usage",
        operation_type: "workflow_execution",
        operation_id: generateId(),
        description: "Workflow execution",
        metadata: "{}",
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock agent execution row
 */
export function generateAgentExecutionRow(
    overrides: Partial<MockAgentExecutionRow> = {}
): MockAgentExecutionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        agent_id: generateId(),
        user_id: generateId(),
        thread_id: generateId(),
        status: "running",
        thread_history: "[]",
        iterations: 0,
        tool_calls_count: 0,
        metadata: "{}",
        started_at: now,
        completed_at: null,
        error: null,
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock agent message row
 */
export function generateAgentMessageRow(
    overrides: Partial<MockAgentMessageRow> = {}
): MockAgentMessageRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        execution_id: generateId(),
        thread_id: generateId(),
        role: "user",
        content: "Test message",
        tool_calls: null,
        tool_name: null,
        tool_call_id: null,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock agent template row
 */
export function generateAgentTemplateRow(
    overrides: Partial<MockAgentTemplateRow> = {}
): MockAgentTemplateRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        name: "Test Agent Template",
        description: "A test agent template",
        system_prompt: "You are a helpful assistant.",
        model: "gpt-4",
        provider: "openai",
        temperature: 0.7,
        max_tokens: 4000,
        available_tools: "[]",
        category: "engineering",
        tags: ["test"],
        icon: null,
        color: "#6366f1",
        author_name: "Test Author",
        author_avatar_url: null,
        view_count: 0,
        use_count: 0,
        featured: false,
        sort_order: 0,
        required_integrations: [],
        version: "1.0.0",
        status: "active",
        created_at: now,
        updated_at: now,
        published_at: now,
        ...overrides
    };
}

/**
 * Generate a mock chat interface row
 */
export function generateChatInterfaceRow(
    overrides: Partial<MockChatInterfaceRow> = {}
): MockChatInterfaceRow {
    const now = generateTimestamp();
    const slug = `chat-${Math.random().toString(36).slice(2, 8)}`;
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Chat Interface",
        slug,
        agent_id: generateId(),
        cover_type: "color",
        cover_value: "#6366f1",
        icon_url: null,
        title: "Test Chat",
        description: null,
        primary_color: "#6366f1",
        font_family: "Inter",
        border_radius: 8,
        welcome_message: "Hello! How can I help you today?",
        placeholder_text: "Type a message...",
        suggested_prompts: [],
        allow_file_upload: false,
        max_files: 5,
        max_file_size_mb: 10,
        allowed_file_types: [],
        persistence_type: "session",
        session_timeout_minutes: 30,
        widget_position: "bottom-right",
        widget_button_icon: "chat",
        widget_button_text: null,
        widget_initial_state: "collapsed",
        rate_limit_messages: 60,
        rate_limit_window_seconds: 60,
        status: "draft",
        published_at: null,
        session_count: 0,
        message_count: 0,
        last_activity_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock form interface row
 */
export function generateFormInterfaceRow(
    overrides: Partial<MockFormInterfaceRow> = {}
): MockFormInterfaceRow {
    const now = generateTimestamp();
    const slug = `form-${Math.random().toString(36).slice(2, 8)}`;
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Form Interface",
        slug,
        target_type: "workflow",
        workflow_id: generateId(),
        agent_id: null,
        cover_type: "color",
        cover_value: "#6366f1",
        icon_url: null,
        title: "Test Form",
        description: null,
        input_placeholder: "Enter your input...",
        input_label: "Input",
        file_upload_label: "Upload files",
        url_input_label: "URL",
        allow_file_upload: false,
        allow_url_input: false,
        max_files: 5,
        max_file_size_mb: 10,
        allowed_file_types: [],
        output_label: "Output",
        show_copy_button: true,
        show_download_button: false,
        allow_output_edit: false,
        submit_button_text: "Submit",
        submit_loading_text: "Processing...",
        status: "draft",
        published_at: null,
        submission_count: 0,
        last_submission_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock knowledge document row
 */
export function generateKnowledgeDocumentRow(
    overrides: Partial<MockKnowledgeDocumentRow> = {}
): MockKnowledgeDocumentRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        knowledge_base_id: generateId(),
        name: "Test Document",
        source_type: "file",
        source_url: null,
        file_path: "/uploads/test.pdf",
        file_type: "pdf",
        file_size: 1024,
        content: null,
        metadata: "{}",
        status: "pending",
        error_message: null,
        processing_started_at: null,
        processing_completed_at: null,
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock safety log row
 */
export function generateSafetyLogRow(overrides: Partial<MockSafetyLogRow> = {}): MockSafetyLogRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        agent_id: generateId(),
        execution_id: null,
        thread_id: null,
        check_type: "content_moderation",
        action: "allow",
        direction: "input",
        original_content: "Test content",
        redacted_content: null,
        metadata: "{}",
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock chat interface session row
 */
export function generateChatInterfaceSessionRow(
    overrides: Partial<MockChatInterfaceSessionRow> = {}
): MockChatInterfaceSessionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        interface_id: generateId(),
        session_token: `sess_${Math.random().toString(36).slice(2)}`,
        browser_fingerprint: null,
        thread_id: null,
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        referrer: null,
        country_code: null,
        status: "active",
        message_count: 0,
        persistence_token: null,
        first_seen_at: now,
        last_activity_at: now,
        ended_at: null,
        ...overrides
    };
}

/**
 * Generate a mock form interface submission row
 */
export function generateFormInterfaceSubmissionRow(
    overrides: Partial<MockFormInterfaceSubmissionRow> = {}
): MockFormInterfaceSubmissionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        interface_id: generateId(),
        message: "Test submission message",
        files: "[]",
        urls: "[]",
        output: null,
        output_edited_at: null,
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        submitted_at: now,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock outgoing webhook row
 */
export function generateOutgoingWebhookRow(
    overrides: Partial<MockOutgoingWebhookRow> = {}
): MockOutgoingWebhookRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        name: "Test Webhook",
        url: "https://example.com/webhook",
        secret: `whsec_${Math.random().toString(36).slice(2)}`,
        events: ["execution.completed"],
        headers: null,
        is_active: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock webhook delivery row
 */
export function generateWebhookDeliveryRow(
    overrides: Partial<MockWebhookDeliveryRow> = {}
): MockWebhookDeliveryRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        webhook_id: generateId(),
        event_type: "execution.completed",
        payload: JSON.stringify({ workflowId: "123", status: "completed" }),
        status: "pending",
        attempts: 0,
        max_attempts: 3,
        last_attempt_at: null,
        next_retry_at: null,
        response_status: null,
        response_body: null,
        error_message: null,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock persona definition row
 */
export function generatePersonaDefinitionRow(
    overrides: Partial<MockPersonaDefinitionRow> = {}
): MockPersonaDefinitionRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        name: "Research Assistant",
        slug: "research-assistant",
        title: "Research Assistant",
        description: "A helpful research assistant",
        avatar_url: null,
        category: "research",
        tags: ["research", "analysis"],
        specialty: "General research and analysis",
        expertise_areas: JSON.stringify(["Market research", "Data analysis"]),
        example_tasks: JSON.stringify(["Research competitors", "Analyze data"]),
        typical_deliverables: JSON.stringify(["Research report", "Analysis summary"]),
        input_fields: JSON.stringify([{ id: "topic", label: "Topic", type: "text" }]),
        deliverables: JSON.stringify([{ id: "report", label: "Report", type: "markdown" }]),
        sop_steps: JSON.stringify(["Gather data", "Analyze", "Report"]),
        estimated_duration: JSON.stringify({ min_minutes: 15, max_minutes: 30 }),
        estimated_cost_credits: 25,
        system_prompt: "You are a helpful research assistant.",
        model: "claude-sonnet-4-20250514",
        provider: "anthropic",
        temperature: 0.7,
        max_tokens: 4096,
        default_tools: "[]",
        default_max_duration_hours: 4.0,
        default_max_cost_credits: 100,
        autonomy_level: "approve_high_risk",
        tool_risk_overrides: "{}",
        featured: false,
        sort_order: 0,
        status: "active",
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

/**
 * Generate a mock persona instance row
 */
export function generatePersonaInstanceRow(
    overrides: Partial<MockPersonaInstanceRow> = {}
): MockPersonaInstanceRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        persona_definition_id: generateId(),
        user_id: generateId(),
        workspace_id: generateId(),
        task_title: "Research task",
        task_description: "Research the market trends",
        additional_context: "{}",
        structured_inputs: "{}",
        thread_id: null,
        execution_id: null,
        status: "pending",
        max_duration_hours: 4.0,
        max_cost_credits: 100,
        progress: null,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        accumulated_cost_credits: 0,
        iteration_count: 0,
        completion_reason: null,
        notification_config: JSON.stringify({
            on_approval_needed: true,
            on_completion: true,
            slack_channel_id: null
        }),
        sandbox_id: null,
        sandbox_state: null,
        template_id: null,
        template_variables: "{}",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock email verification token row
 */
export function generateEmailVerificationTokenRow(
    overrides: Partial<MockEmailVerificationTokenRow> = {}
): MockEmailVerificationTokenRow {
    const now = generateTimestamp();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    return {
        id: generateId(),
        user_id: generateId(),
        email: `user-${Math.random().toString(36).slice(2)}@example.com`,
        token_hash: `evthash_${Math.random().toString(36).slice(2)}`,
        expires_at: expiresAt.toISOString(),
        verified_at: null,
        created_at: now,
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        ...overrides
    };
}

/**
 * Generate a mock password reset token row
 */
export function generatePasswordResetTokenRow(
    overrides: Partial<MockPasswordResetTokenRow> = {}
): MockPasswordResetTokenRow {
    const now = generateTimestamp();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    return {
        id: generateId(),
        user_id: generateId(),
        token_hash: `prthash_${Math.random().toString(36).slice(2)}`,
        expires_at: expiresAt.toISOString(),
        used_at: null,
        created_at: now,
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        ...overrides
    };
}

/**
 * Generate a mock two factor token row
 */
export function generateTwoFactorTokenRow(
    overrides: Partial<MockTwoFactorTokenRow> = {}
): MockTwoFactorTokenRow {
    const now = generateTimestamp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    return {
        id: generateId(),
        user_id: generateId(),
        code_hash: `2fahash_${Math.random().toString(36).slice(2)}`,
        expires_at: expiresAt.toISOString(),
        verified_at: null,
        created_at: now,
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        ...overrides
    };
}

/**
 * Generate a mock two factor backup code row
 */
export function generateTwoFactorBackupCodeRow(
    overrides: Partial<MockTwoFactorBackupCodeRow> = {}
): MockTwoFactorBackupCodeRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        user_id: generateId(),
        code_hash: `backup_${Math.random().toString(36).slice(2)}`,
        used_at: null,
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock checkpoint row
 */
export function generateCheckpointRow(
    overrides: Partial<MockCheckpointRow> = {}
): MockCheckpointRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        workflow_id: generateId(),
        created_by: generateId(),
        name: "Checkpoint 1",
        description: null,
        snapshot: JSON.stringify({ __compressed: false, nodes: {}, edges: [] }),
        created_at: now,
        deleted_at: null,
        ...overrides
    };
}

/**
 * Generate a mock knowledge chunk row
 */
export function generateKnowledgeChunkRow(
    overrides: Partial<MockKnowledgeChunkRow> = {}
): MockKnowledgeChunkRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        document_id: generateId(),
        knowledge_base_id: generateId(),
        chunk_index: 0,
        content: "This is a test chunk of content.",
        embedding: null,
        token_count: 10,
        metadata: "{}",
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock thread embedding row
 */
export function generateThreadEmbeddingRow(
    overrides: Partial<MockThreadEmbeddingRow> = {}
): MockThreadEmbeddingRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        agent_id: generateId(),
        user_id: generateId(),
        execution_id: generateId(),
        message_id: generateId(),
        message_role: "user",
        message_index: 0,
        content: "Test message content",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        embedding_model: "text-embedding-3-small",
        embedding_provider: "openai",
        created_at: now,
        ...overrides
    };
}

/**
 * Generate a mock working memory row
 */
export function generateWorkingMemoryRow(
    overrides: Partial<MockWorkingMemoryRow> = {}
): MockWorkingMemoryRow {
    const now = generateTimestamp();
    return {
        agent_id: generateId(),
        user_id: generateId(),
        working_memory: "User prefers formal communication. Last discussed: AI market trends.",
        updated_at: now,
        created_at: now,
        metadata: "{}",
        ...overrides
    };
}

/**
 * Generate a mock persona task template row
 */
export function generatePersonaTaskTemplateRow(
    overrides: Partial<MockPersonaTaskTemplateRow> = {}
): MockPersonaTaskTemplateRow {
    const now = generateTimestamp();
    return {
        id: generateId(),
        persona_definition_id: generateId(),
        name: "Quick Research",
        description: "A quick research task template",
        icon: null,
        task_template: "Research {{topic}} and provide a summary.",
        variables: JSON.stringify([{ id: "topic", label: "Topic", type: "text" }]),
        suggested_duration_hours: 2.0,
        suggested_max_cost: 50,
        sort_order: 0,
        usage_count: 0,
        status: "active",
        created_at: now,
        updated_at: now,
        ...overrides
    };
}

// ============================================================================
// TYPE DEFINITIONS FOR MOCK ROWS
// ============================================================================

export interface MockUserRow {
    id: string;
    email: string;
    password_hash: string | null;
    name: string | null;
    google_id: string | null;
    microsoft_id: string | null;
    auth_provider: "local" | "google" | "microsoft";
    avatar_url: string | null;
    email_verified: boolean;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
    two_factor_enabled: boolean;
    two_factor_phone: string | null;
    two_factor_phone_verified: boolean;
    two_factor_secret: string | null;
}

export interface MockWorkspaceRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner_id: string;
    settings: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface MockWorkflowRow {
    id: string;
    name: string;
    description: string | null;
    definition: string;
    user_id: string;
    workspace_id: string;
    version: number;
    ai_generated: boolean;
    ai_prompt: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface MockAgentRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    model: string;
    provider: string;
    connection_id: string | null;
    system_prompt: string;
    temperature: number | string;
    max_tokens: number | string;
    max_iterations: number | string;
    available_tools: string;
    memory_config: string;
    safety_config: string;
    metadata: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface MockConnectionRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    connection_method: string;
    provider: string;
    encrypted_data: string;
    metadata: string;
    status: string;
    capabilities: string;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockFolderRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    color: string;
    position: number;
    parent_id: string | null;
    depth: number;
    path: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface MockThreadRow {
    id: string;
    agent_id: string;
    execution_id: string | null;
    user_id: string;
    workspace_id: string;
    title: string;
    messages: string;
    metadata: string;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    last_message_at: string | null;
    archived_at: string | null;
}

export interface MockApiKeyRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    scopes: string[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: string | null;
    last_used_at: string | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    revoked_at: string | null;
}

export interface MockKnowledgeBaseRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    config: string;
    created_at: string;
    updated_at: string;
}

export interface MockExecutionRow {
    id: string;
    workflow_id: string;
    user_id: string;
    workspace_id: string;
    status: string;
    context: string;
    started_at: string | null;
    completed_at: string | null;
    error: string | null;
    trigger_type: string;
    trigger_data: string;
    created_at: string;
    updated_at: string;
}

export interface MockTriggerRow {
    id: string;
    workflow_id: string;
    name: string;
    trigger_type: string;
    config: string;
    enabled: boolean;
    last_triggered_at: string | null;
    next_scheduled_at: string | null;
    trigger_count: number | string;
    temporal_schedule_id: string | null;
    webhook_secret: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface MockTriggerExecutionRow {
    id: string;
    trigger_id: string;
    execution_id: string;
    trigger_payload: string | null;
    created_at: string;
}

export interface MockWebhookLogRow {
    id: string;
    trigger_id: string | null;
    workflow_id: string | null;
    request_method: string;
    request_path: string | null;
    request_headers: string | null;
    request_body: string | null;
    request_query: string | null;
    response_status: number | null;
    response_body: string | null;
    error: string | null;
    execution_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    processing_time_ms: number | null;
    created_at: string;
}

export interface MockTemplateRow {
    id: string;
    name: string;
    description: string | null;
    definition: string;
    category: string;
    tags: string[];
    icon: string | null;
    color: string | null;
    preview_image_url: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    view_count: number;
    use_count: number;
    featured: boolean;
    sort_order: number;
    required_integrations: string[];
    version: string;
    status: string;
    created_at: string;
    updated_at: string;
    published_at: string | null;
}

export interface MockWorkspaceMemberRow {
    id: string;
    workspace_id: string;
    user_id: string;
    role: string;
    invited_by: string | null;
    invited_at: string | null;
    accepted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockWorkspaceInvitationRow {
    id: string;
    workspace_id: string;
    email: string;
    role: string;
    token: string;
    invited_by: string;
    message: string | null;
    status: string;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
}

export interface MockWorkspaceCreditsRow {
    id: string;
    workspace_id: string;
    subscription_balance: number;
    purchased_balance: number;
    bonus_balance: number;
    reserved: number;
    subscription_expires_at: string | null;
    lifetime_allocated: number;
    lifetime_purchased: number;
    lifetime_used: number;
    created_at: string;
    updated_at: string;
}

export interface MockCreditTransactionRow {
    id: string;
    workspace_id: string;
    user_id: string | null;
    amount: number;
    balance_before: number;
    balance_after: number;
    transaction_type: string;
    operation_type: string | null;
    operation_id: string | null;
    description: string | null;
    metadata: string;
    created_at: string;
}

export interface MockAgentExecutionRow {
    id: string;
    agent_id: string;
    user_id: string;
    thread_id: string;
    status: string;
    thread_history: string;
    iterations: number;
    tool_calls_count: number;
    metadata: string;
    started_at: string;
    completed_at: string | null;
    error: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockAgentMessageRow {
    id: string;
    execution_id: string;
    thread_id: string;
    role: string;
    content: string;
    tool_calls: string | null;
    tool_name: string | null;
    tool_call_id: string | null;
    created_at: string;
}

export interface MockAgentTemplateRow {
    id: string;
    name: string;
    description: string | null;
    system_prompt: string;
    model: string;
    provider: string;
    temperature: number | string;
    max_tokens: number;
    available_tools: string;
    category: string;
    tags: string[];
    icon: string | null;
    color: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    view_count: number;
    use_count: number;
    featured: boolean;
    sort_order: number;
    required_integrations: string[];
    version: string;
    status: string;
    created_at: string;
    updated_at: string;
    published_at: string | null;
}

export interface MockChatInterfaceRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    slug: string;
    agent_id: string;
    cover_type: string;
    cover_value: string;
    icon_url: string | null;
    title: string;
    description: string | null;
    primary_color: string;
    font_family: string;
    border_radius: number;
    welcome_message: string;
    placeholder_text: string;
    suggested_prompts: unknown[];
    allow_file_upload: boolean;
    max_files: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    persistence_type: string;
    session_timeout_minutes: number;
    widget_position: string;
    widget_button_icon: string;
    widget_button_text: string | null;
    widget_initial_state: string;
    rate_limit_messages: number;
    rate_limit_window_seconds: number;
    status: string;
    published_at: string | null;
    session_count: number | string;
    message_count: number | string;
    last_activity_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    agent_name?: string;
}

export interface MockFormInterfaceRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    slug: string;
    target_type: string;
    workflow_id: string | null;
    agent_id: string | null;
    cover_type: string;
    cover_value: string;
    icon_url: string | null;
    title: string;
    description: string | null;
    input_placeholder: string;
    input_label: string;
    file_upload_label: string;
    url_input_label: string;
    allow_file_upload: boolean;
    allow_url_input: boolean;
    max_files: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    output_label: string;
    show_copy_button: boolean;
    show_download_button: boolean;
    allow_output_edit: boolean;
    submit_button_text: string;
    submit_loading_text: string;
    status: string;
    published_at: string | null;
    submission_count: number | string;
    last_submission_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    workflow_name?: string;
    agent_name?: string;
}

export interface MockKnowledgeDocumentRow {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: string;
    source_url: string | null;
    file_path: string | null;
    file_type: string;
    file_size: number | null;
    content: string | null;
    metadata: string;
    status: string;
    error_message: string | null;
    processing_started_at: string | null;
    processing_completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockSafetyLogRow {
    id: string;
    user_id: string;
    agent_id: string;
    execution_id: string | null;
    thread_id: string | null;
    check_type: string;
    action: string;
    direction: string;
    original_content: string | null;
    redacted_content: string | null;
    metadata: string;
    created_at: string;
}

export interface MockChatInterfaceSessionRow {
    id: string;
    interface_id: string;
    session_token: string;
    browser_fingerprint: string | null;
    thread_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    referrer: string | null;
    country_code: string | null;
    status: string;
    message_count: number;
    persistence_token: string | null;
    first_seen_at: string;
    last_activity_at: string;
    ended_at: string | null;
}

export interface MockFormInterfaceSubmissionRow {
    id: string;
    interface_id: string;
    message: string | null;
    files: string;
    urls: string;
    output: string | null;
    output_edited_at: string | null;
    ip_address: string | null;
    user_agent: string | null;
    submitted_at: string;
    created_at: string;
}

export interface MockOutgoingWebhookRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    headers: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface MockWebhookDeliveryRow {
    id: string;
    webhook_id: string;
    event_type: string;
    payload: string;
    status: string;
    attempts: number;
    max_attempts: number;
    last_attempt_at: string | null;
    next_retry_at: string | null;
    response_status: number | null;
    response_body: string | null;
    error_message: string | null;
    created_at: string;
}

export interface MockPersonaDefinitionRow {
    id: string;
    name: string;
    slug: string;
    title: string;
    description: string;
    avatar_url: string | null;
    category: string;
    tags: string[];
    specialty: string;
    expertise_areas: string;
    example_tasks: string;
    typical_deliverables: string;
    input_fields: string;
    deliverables: string;
    sop_steps: string;
    estimated_duration: string;
    estimated_cost_credits: number;
    system_prompt: string;
    model: string;
    provider: string;
    temperature: number | string;
    max_tokens: number;
    default_tools: string;
    default_max_duration_hours: number | string;
    default_max_cost_credits: number;
    autonomy_level: string;
    tool_risk_overrides: string;
    featured: boolean;
    sort_order: number;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface MockPersonaInstanceRow {
    id: string;
    persona_definition_id: string;
    user_id: string;
    workspace_id: string;
    task_title: string | null;
    task_description: string | null;
    additional_context: string;
    structured_inputs: string;
    thread_id: string | null;
    execution_id: string | null;
    status: string;
    max_duration_hours: number | string | null;
    max_cost_credits: number | string | null;
    progress: string | null;
    started_at: string | null;
    completed_at: string | null;
    duration_seconds: number | string | null;
    accumulated_cost_credits: number | string;
    iteration_count: number | string;
    completion_reason: string | null;
    notification_config: string;
    sandbox_id: string | null;
    sandbox_state: string | null;
    template_id: string | null;
    template_variables: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Join fields for summary queries
    persona_name?: string;
    persona_slug?: string;
    persona_title?: string;
    persona_avatar_url?: string | null;
    persona_category?: string;
}

export interface MockEmailVerificationTokenRow {
    id: string;
    user_id: string;
    email: string;
    token_hash: string;
    expires_at: string;
    verified_at: string | null;
    created_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

export interface MockPasswordResetTokenRow {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

export interface MockTwoFactorTokenRow {
    id: string;
    user_id: string;
    code_hash: string;
    expires_at: string;
    verified_at: string | null;
    created_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

export interface MockTwoFactorBackupCodeRow {
    id: string;
    user_id: string;
    code_hash: string;
    used_at: string | null;
    created_at: string;
}

export interface MockCheckpointRow {
    id: string;
    workflow_id: string;
    created_by: string;
    name: string | null;
    description: string | null;
    snapshot: string;
    created_at: string;
    deleted_at: string | null;
}

export interface MockKnowledgeChunkRow {
    id: string;
    document_id: string;
    knowledge_base_id: string;
    chunk_index: number;
    content: string;
    embedding: string | number[] | null;
    token_count: number | null;
    metadata: string;
    created_at: string;
}

export interface MockThreadEmbeddingRow {
    id: string;
    agent_id: string;
    user_id: string;
    execution_id: string;
    message_id: string;
    message_role: string;
    message_index: number;
    content: string;
    embedding: string;
    embedding_model: string;
    embedding_provider: string;
    created_at: string;
}

export interface MockWorkingMemoryRow {
    agent_id: string;
    user_id: string;
    working_memory: string;
    updated_at: string;
    created_at: string;
    metadata: string;
}

export interface MockPersonaTaskTemplateRow {
    id: string;
    persona_definition_id: string;
    name: string;
    description: string;
    icon: string | null;
    task_template: string;
    variables: string;
    suggested_duration_hours: number | string;
    suggested_max_cost: number | string;
    sort_order: number | string;
    usage_count: number | string;
    status: string;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// DATABASE MOCK SETUP
// ============================================================================

/**
 * Create a mock db object with a query function
 * Use this in jest.mock() for the database module
 */
export function createMockDb() {
    return {
        query: jest.fn()
    };
}

/**
 * Standard beforeEach/afterEach setup for repository tests
 */
export function setupRepositoryTests(mockDb: { query: jest.Mock }) {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        mockDb.query.mockReset();
    });
}
