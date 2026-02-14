/**
 * Persona Test Fixtures
 *
 * Provides reusable test data for persona-related integration tests.
 * Includes fixtures for persona definitions, instances, approvals,
 * deliverables, messages, connections, and templates.
 */

import { v4 as uuidv4 } from "uuid";
import type {
    PersonaDefinitionModel,
    PersonaCategory,
    PersonaAutonomyLevel,
    LLMProvider
} from "../../../../src/storage/models/PersonaDefinition";
import type {
    PersonaInstanceModel,
    PersonaInstanceStatus,
    PersonaInstanceCompletionReason,
    PersonaInstanceSummary
} from "../../../../src/storage/models/PersonaInstance";
import type { PersonaApprovalRequestModel } from "../../../../src/storage/models/PersonaApprovalRequest";
import type { PersonaInstanceMessageModel } from "../../../../src/storage/repositories/PersonaInstanceMessageRepository";
import type { PersonaInstanceDeliverableModel } from "../../../../src/storage/models/PersonaInstanceDeliverable";
import type {
    PersonaInstanceConnectionModel,
    PersonaInstanceConnectionWithDetails
} from "../../../../src/storage/models/PersonaInstanceConnection";
import type { PersonaTaskTemplateModel } from "../../../../src/storage/models/PersonaTaskTemplate";
import type {
    PersonaApprovalActionType,
    PersonaApprovalRequestRiskLevel,
    PersonaApprovalRequestStatus,
    DeliverableType
} from "@flowmaestro/shared";

// ============================================================================
// ID GENERATORS
// ============================================================================

export function generateId(prefix: string = ""): string {
    return prefix ? `${prefix}-${uuidv4()}` : uuidv4();
}

export function generatePersonaId(): string {
    return generateId("persona");
}

export function generateInstanceId(): string {
    return generateId("instance");
}

export function generateApprovalId(): string {
    return generateId("approval");
}

export function generateDeliverableId(): string {
    return generateId("deliverable");
}

export function generateMessageId(): string {
    return generateId("msg");
}

export function generateTemplateId(): string {
    return generateId("template");
}

// ============================================================================
// PERSONA DEFINITION FIXTURES
// ============================================================================

export interface CreatePersonaDefinitionFixtureOptions {
    id?: string;
    name?: string;
    slug?: string;
    title?: string;
    description?: string;
    category?: PersonaCategory;
    autonomyLevel?: PersonaAutonomyLevel;
    provider?: LLMProvider;
    model?: string;
    featured?: boolean;
    status?: "active" | "beta" | "deprecated";
}

export function createPersonaDefinitionFixture(
    options: CreatePersonaDefinitionFixtureOptions = {}
): PersonaDefinitionModel {
    const id = options.id || generatePersonaId();
    const slug = options.slug || `test-persona-${Date.now()}`;
    const now = new Date();

    return {
        id,
        name: options.name || "Test Persona",
        slug,
        title: options.title || "Test Assistant",
        description: options.description || "A test persona for integration testing",
        avatar_url: null,
        category: options.category || "research",
        tags: ["test", "integration"],
        specialty: "Testing and validation",
        expertise_areas: ["Testing", "Quality Assurance"],
        example_tasks: ["Run test scenarios", "Validate outputs"],
        typical_deliverables: ["Test report", "Validation summary"],
        input_fields: [
            {
                name: "task_description",
                label: "Task Description",
                type: "textarea" as const,
                required: true,
                placeholder: "Describe your task..."
            }
        ],
        deliverables: [
            {
                name: "Final Report",
                description: "Comprehensive analysis report",
                type: "markdown" as const,
                guaranteed: true
            }
        ],
        sop_steps: [
            "Analyze the request",
            "Gather information",
            "Generate deliverables",
            "Present findings"
        ],
        estimated_duration: {
            min_minutes: 5,
            max_minutes: 30,
            typical_minutes: 15
        },
        estimated_cost_credits: 100,
        system_prompt: "You are a helpful test assistant.",
        model: options.model || "gpt-4",
        provider: options.provider || "openai",
        temperature: 0.7,
        max_tokens: 4000,
        default_tools: [],
        default_max_duration_hours: 2,
        default_max_cost_credits: 500,
        autonomy_level: options.autonomyLevel || "approve_high_risk",
        tool_risk_overrides: {},
        connection_requirements: [],
        featured: options.featured ?? false,
        sort_order: 0,
        status: options.status || "active",
        created_at: now,
        updated_at: now
    };
}

/**
 * Research Assistant persona
 */
export function createResearchAssistantPersona(): PersonaDefinitionModel {
    return createPersonaDefinitionFixture({
        name: "Research Assistant",
        slug: "research-assistant",
        title: "Research Analyst",
        description: "Conducts comprehensive research and analysis on any topic",
        category: "research"
    });
}

/**
 * Content Writer persona
 */
export function createContentWriterPersona(): PersonaDefinitionModel {
    return createPersonaDefinitionFixture({
        name: "Content Writer",
        slug: "content-writer",
        title: "Content Specialist",
        description: "Creates engaging content for various purposes",
        category: "content"
    });
}

/**
 * Data Analyst persona
 */
export function createDataAnalystPersona(): PersonaDefinitionModel {
    return createPersonaDefinitionFixture({
        name: "Data Analyst",
        slug: "data-analyst",
        title: "Data Analysis Expert",
        description: "Analyzes data and generates insights",
        category: "data"
    });
}

/**
 * Code Developer persona
 */
export function createCodeDeveloperPersona(): PersonaDefinitionModel {
    return createPersonaDefinitionFixture({
        name: "Code Developer",
        slug: "code-developer",
        title: "Software Developer",
        description: "Writes and reviews code",
        category: "development"
    });
}

// ============================================================================
// PERSONA INSTANCE FIXTURES
// ============================================================================

export interface CreatePersonaInstanceFixtureOptions {
    id?: string;
    personaDefinitionId?: string;
    userId?: string;
    workspaceId?: string;
    status?: PersonaInstanceStatus;
    taskTitle?: string;
    taskDescription?: string;
    completionReason?: PersonaInstanceCompletionReason;
    threadId?: string;
    executionId?: string;
    pendingApprovalId?: string;
    iterationCount?: number;
    accumulatedCostCredits?: number;
}

export function createPersonaInstanceFixture(
    options: CreatePersonaInstanceFixtureOptions = {}
): PersonaInstanceModel {
    const id = options.id || generateInstanceId();
    const now = new Date();

    return {
        id,
        persona_definition_id: options.personaDefinitionId || generatePersonaId(),
        user_id: options.userId || generateId("user"),
        workspace_id: options.workspaceId || generateId("workspace"),
        task_title: options.taskTitle || "Test Task",
        task_description: options.taskDescription || "A test task for integration testing",
        additional_context: {},
        structured_inputs: {},
        thread_id: options.threadId || generateId("thread"),
        execution_id: options.executionId || generateId("exec"),
        status: options.status || "initializing",
        max_duration_hours: 2,
        max_cost_credits: 500,
        progress: null,
        started_at: options.status !== "initializing" ? now : null,
        completed_at: ["completed", "failed", "cancelled", "timeout"].includes(options.status || "")
            ? now
            : null,
        duration_seconds: null,
        accumulated_cost_credits: options.accumulatedCostCredits ?? 0,
        iteration_count: options.iterationCount ?? 0,
        completion_reason: options.completionReason || null,
        notification_config: {
            on_approval_needed: true,
            on_completion: true,
            slack_channel_id: null
        },
        sandbox_id: null,
        sandbox_state: null,
        template_id: null,
        template_variables: {},
        parent_instance_id: null,
        continuation_count: 0,
        clarification_complete: false,
        clarification_exchange_count: 0,
        clarification_max_exchanges: 3,
        clarification_skipped: false,
        pending_approval_id: options.pendingApprovalId || null,
        created_at: now,
        updated_at: now,
        deleted_at: null
    };
}

/**
 * Create a pending (initializing) instance
 */
export function createPendingInstance(
    personaDefinitionId: string,
    workspaceId: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "initializing"
    });
}

/**
 * Create an instance in clarifying phase
 */
export function createClarifyingInstance(
    personaDefinitionId: string,
    workspaceId: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "clarifying"
    });
}

/**
 * Create a running instance
 */
export function createRunningInstance(
    personaDefinitionId: string,
    workspaceId: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "running",
        iterationCount: 3,
        accumulatedCostCredits: 25
    });
}

/**
 * Create an instance waiting for approval
 */
export function createWaitingApprovalInstance(
    personaDefinitionId: string,
    workspaceId: string,
    pendingApprovalId?: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "waiting_approval",
        pendingApprovalId: pendingApprovalId || generateApprovalId(),
        iterationCount: 5,
        accumulatedCostCredits: 50
    });
}

/**
 * Create a completed instance
 */
export function createCompletedInstance(
    personaDefinitionId: string,
    workspaceId: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "completed",
        completionReason: "success",
        iterationCount: 10,
        accumulatedCostCredits: 100
    });
}

/**
 * Create a failed instance
 */
export function createFailedInstance(
    personaDefinitionId: string,
    workspaceId: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "failed",
        completionReason: "failed",
        iterationCount: 3,
        accumulatedCostCredits: 30
    });
}

/**
 * Create a cancelled instance
 */
export function createCancelledInstance(
    personaDefinitionId: string,
    workspaceId: string
): PersonaInstanceModel {
    return createPersonaInstanceFixture({
        personaDefinitionId,
        workspaceId,
        status: "cancelled",
        completionReason: "cancelled"
    });
}

/**
 * Create an instance summary for list views
 */
export function createInstanceSummary(
    instance: PersonaInstanceModel,
    persona?: PersonaDefinitionModel
): PersonaInstanceSummary {
    return {
        id: instance.id,
        persona_definition_id: instance.persona_definition_id,
        task_title: instance.task_title,
        task_description: instance.task_description,
        status: instance.status,
        progress: instance.progress,
        started_at: instance.started_at,
        completed_at: instance.completed_at,
        duration_seconds: instance.duration_seconds,
        accumulated_cost_credits: instance.accumulated_cost_credits,
        iteration_count: instance.iteration_count,
        updated_at: instance.updated_at,
        persona: persona
            ? {
                  name: persona.name,
                  slug: persona.slug,
                  title: persona.title,
                  avatar_url: persona.avatar_url,
                  category: persona.category
              }
            : null
    };
}

// ============================================================================
// APPROVAL REQUEST FIXTURES
// ============================================================================

export interface CreateApprovalRequestFixtureOptions {
    id?: string;
    instanceId?: string;
    actionType?: PersonaApprovalActionType;
    toolName?: string;
    actionDescription?: string;
    riskLevel?: PersonaApprovalRequestRiskLevel;
    status?: PersonaApprovalRequestStatus;
    estimatedCostCredits?: number;
}

export function createApprovalRequestFixture(
    options: CreateApprovalRequestFixtureOptions = {}
): PersonaApprovalRequestModel {
    const id = options.id || generateApprovalId();
    const now = new Date();

    return {
        id,
        instance_id: options.instanceId || generateInstanceId(),
        action_type: options.actionType || "tool_call",
        tool_name: options.toolName !== undefined ? options.toolName : "web_search",
        action_description: options.actionDescription || "Search the web for information",
        action_arguments: { query: "test search query" },
        risk_level: options.riskLevel || "medium",
        estimated_cost_credits: options.estimatedCostCredits ?? 5,
        agent_context: "The agent needs to search for information to complete the task.",
        alternatives: "You can provide the information directly instead.",
        status: options.status || "pending",
        responded_by: null,
        responded_at: null,
        response_note: null,
        created_at: now,
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    };
}

/**
 * Create a pending tool call approval
 */
export function createToolCallApproval(instanceId: string): PersonaApprovalRequestModel {
    return createApprovalRequestFixture({
        instanceId,
        actionType: "tool_call",
        toolName: "slack_send_message",
        actionDescription: "Send a message to #general channel",
        riskLevel: "medium"
    });
}

/**
 * Create a high-risk approval request
 */
export function createHighRiskApproval(instanceId: string): PersonaApprovalRequestModel {
    return createApprovalRequestFixture({
        instanceId,
        actionType: "tool_call",
        toolName: "github_create_pr",
        actionDescription: "Create a pull request with code changes",
        riskLevel: "high",
        estimatedCostCredits: 50
    });
}

/**
 * Create a cost limit approval
 */
export function createCostLimitApproval(instanceId: string): PersonaApprovalRequestModel {
    return createApprovalRequestFixture({
        instanceId,
        actionType: "cost_increase",
        toolName: null,
        actionDescription: "Increase cost limit to continue execution",
        riskLevel: "low",
        estimatedCostCredits: 200
    });
}

/**
 * Create an approved request
 */
export function createApprovedRequest(instanceId: string): PersonaApprovalRequestModel {
    const approval = createApprovalRequestFixture({
        instanceId,
        status: "approved"
    });
    approval.responded_by = generateId("user");
    approval.responded_at = new Date();
    return approval;
}

/**
 * Create a denied request
 */
export function createDeniedRequest(instanceId: string): PersonaApprovalRequestModel {
    const approval = createApprovalRequestFixture({
        instanceId,
        status: "denied"
    });
    approval.responded_by = generateId("user");
    approval.responded_at = new Date();
    approval.response_note = "Request denied due to policy violation";
    return approval;
}

// ============================================================================
// MESSAGE FIXTURES
// ============================================================================

export interface CreateMessageFixtureOptions {
    id?: string;
    instanceId?: string;
    role?: "user" | "assistant" | "tool" | "system";
    content?: string;
    toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
    toolName?: string;
    toolCallId?: string;
}

export function createMessageFixture(
    options: CreateMessageFixtureOptions = {}
): PersonaInstanceMessageModel {
    const id = options.id || generateMessageId();
    const now = new Date();

    const metadata: Record<string, unknown> = {};
    if (options.toolCalls) {
        metadata.tool_calls = options.toolCalls;
    }
    if (options.toolName) {
        metadata.tool_name = options.toolName;
        metadata.tool_call_id = options.toolCallId;
    }

    return {
        id,
        instance_id: options.instanceId || generateInstanceId(),
        role: options.role || "user",
        content: options.content || "Test message content",
        metadata,
        created_at: now,
        tool_calls: options.toolCalls,
        tool_name: options.toolName,
        tool_call_id: options.toolCallId
    };
}

/**
 * Create a user message
 */
export function createUserMessage(instanceId: string, content?: string): PersonaInstanceMessageModel {
    return createMessageFixture({
        instanceId,
        role: "user",
        content: content || "Please help me with this task"
    });
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(
    instanceId: string,
    content?: string
): PersonaInstanceMessageModel {
    return createMessageFixture({
        instanceId,
        role: "assistant",
        content: content || "I'll help you with that task. Let me analyze the requirements."
    });
}

/**
 * Create an assistant message with tool calls
 */
export function createAssistantMessageWithToolCall(
    instanceId: string
): PersonaInstanceMessageModel {
    return createMessageFixture({
        instanceId,
        role: "assistant",
        content: "Let me search for that information.",
        toolCalls: [
            {
                id: "call_123",
                name: "web_search",
                arguments: { query: "latest AI trends" }
            }
        ]
    });
}

/**
 * Create a tool result message
 */
export function createToolResultMessage(
    instanceId: string,
    toolName: string,
    result: string
): PersonaInstanceMessageModel {
    return createMessageFixture({
        instanceId,
        role: "tool",
        content: result,
        toolName,
        toolCallId: "call_123"
    });
}

// ============================================================================
// DELIVERABLE FIXTURES
// ============================================================================

export interface CreateDeliverableFixtureOptions {
    id?: string;
    instanceId?: string;
    name?: string;
    description?: string;
    type?: DeliverableType;
    content?: string;
    fileUrl?: string;
    fileSizeBytes?: number;
    fileExtension?: string;
}

export function createDeliverableFixture(
    options: CreateDeliverableFixtureOptions = {}
): PersonaInstanceDeliverableModel {
    const id = options.id || generateDeliverableId();
    const now = new Date();
    const content = options.content || "# Test Deliverable\n\nThis is test content.";

    return {
        id,
        instance_id: options.instanceId || generateInstanceId(),
        name: options.name || "Test Deliverable",
        description: options.description || "A test deliverable",
        type: options.type || "markdown",
        content: options.type === "pdf" ? null : content,
        file_url: options.fileUrl || null,
        file_size_bytes: options.fileSizeBytes || Buffer.byteLength(content, "utf8"),
        file_extension: options.fileExtension || null,
        preview: content.substring(0, 200),
        created_at: now
    };
}

/**
 * Create a markdown deliverable
 */
export function createMarkdownDeliverable(instanceId: string): PersonaInstanceDeliverableModel {
    return createDeliverableFixture({
        instanceId,
        name: "Research Report",
        description: "Comprehensive research findings",
        type: "markdown",
        content: `# Research Report

## Executive Summary

This report presents the findings from our comprehensive analysis.

## Key Findings

1. Finding one with detailed analysis
2. Finding two with supporting data
3. Finding three with recommendations

## Conclusion

Based on our analysis, we recommend the following actions...`
    });
}

/**
 * Create a code deliverable
 */
export function createCodeDeliverable(instanceId: string): PersonaInstanceDeliverableModel {
    return createDeliverableFixture({
        instanceId,
        name: "Implementation Code",
        description: "Generated code implementation",
        type: "code",
        content: `function processData(data: DataItem[]): ProcessedResult {
    return data.map(item => ({
        id: item.id,
        processed: true,
        timestamp: new Date().toISOString()
    }));
}`,
        fileExtension: "ts"
    });
}

/**
 * Create a JSON deliverable
 */
export function createJsonDeliverable(instanceId: string): PersonaInstanceDeliverableModel {
    const content = JSON.stringify(
        {
            analysis: {
                score: 85,
                categories: ["research", "data"],
                recommendations: ["Optimize workflow", "Add validation"]
            }
        },
        null,
        2
    );

    return createDeliverableFixture({
        instanceId,
        name: "Analysis Results",
        description: "Structured analysis data",
        type: "json",
        content
    });
}

/**
 * Create a CSV deliverable
 */
export function createCsvDeliverable(instanceId: string): PersonaInstanceDeliverableModel {
    const content = `name,value,category
Item A,100,Category 1
Item B,200,Category 2
Item C,150,Category 1
Item D,300,Category 3`;

    return createDeliverableFixture({
        instanceId,
        name: "Data Export",
        description: "Exported data in CSV format",
        type: "csv",
        content
    });
}

/**
 * Create a PDF deliverable (file-based)
 */
export function createPdfDeliverable(instanceId: string): PersonaInstanceDeliverableModel {
    return createDeliverableFixture({
        instanceId,
        name: "Final Report PDF",
        description: "Formatted PDF report",
        type: "pdf",
        content: undefined,
        fileUrl: "gs://bucket/reports/final-report.pdf",
        fileSizeBytes: 102400,
        fileExtension: "pdf"
    });
}

// ============================================================================
// CONNECTION FIXTURES
// ============================================================================

export interface CreateConnectionFixtureOptions {
    id?: string;
    instanceId?: string;
    connectionId?: string;
    grantedScopes?: string[];
}

export function createConnectionFixture(
    options: CreateConnectionFixtureOptions = {}
): PersonaInstanceConnectionModel {
    const id = options.id || generateId("pic");
    const now = new Date();

    return {
        id,
        instance_id: options.instanceId || generateInstanceId(),
        connection_id: options.connectionId || generateId("conn"),
        granted_scopes: options.grantedScopes || ["read", "write"],
        created_at: now
    };
}

/**
 * Create a connection with details
 */
export function createConnectionWithDetails(
    instanceId: string,
    provider: string,
    connectionName: string
): PersonaInstanceConnectionWithDetails {
    const conn = createConnectionFixture({ instanceId });
    return {
        ...conn,
        connection: {
            id: conn.connection_id,
            name: connectionName,
            provider,
            connection_method: "oauth2"
        }
    };
}

/**
 * Create a Slack connection
 */
export function createSlackConnection(instanceId: string): PersonaInstanceConnectionWithDetails {
    return createConnectionWithDetails(instanceId, "slack", "My Slack Workspace");
}

/**
 * Create a GitHub connection
 */
export function createGitHubConnection(instanceId: string): PersonaInstanceConnectionWithDetails {
    return createConnectionWithDetails(instanceId, "github", "My GitHub Account");
}

// ============================================================================
// TEMPLATE FIXTURES
// ============================================================================

export interface CreateTemplateFixtureOptions {
    id?: string;
    personaDefinitionId?: string;
    name?: string;
    description?: string;
    taskTemplate?: string;
    variables?: Array<{
        name: string;
        label: string;
        type: "text" | "select" | "number" | "textarea" | "checkbox";
        required: boolean;
        options?: Array<{ value: string; label: string }>;
    }>;
}

export function createTemplateFixture(
    options: CreateTemplateFixtureOptions = {}
): PersonaTaskTemplateModel {
    const id = options.id || generateTemplateId();
    const now = new Date();

    return {
        id,
        persona_definition_id: options.personaDefinitionId || generatePersonaId(),
        name: options.name || "Test Template",
        description: options.description || "A test task template",
        icon: null,
        task_template:
            options.taskTemplate ||
            "Research {{topic}} and provide a {{deliverable_type}} about {{focus_area}}.",
        variables: options.variables || [
            {
                name: "topic",
                label: "Research Topic",
                type: "text" as const,
                required: true
            },
            {
                name: "deliverable_type",
                label: "Deliverable Type",
                type: "select" as const,
                required: true,
                options: [
                    { value: "report", label: "Report" },
                    { value: "summary", label: "Summary" },
                    { value: "analysis", label: "Analysis" }
                ]
            },
            {
                name: "focus_area",
                label: "Focus Area",
                type: "text" as const,
                required: false
            }
        ],
        suggested_duration_hours: 2,
        suggested_max_cost: 500,
        usage_count: 0,
        sort_order: 0,
        status: "active",
        created_at: now,
        updated_at: now
    };
}

/**
 * Create a market research template
 */
export function createMarketResearchTemplate(
    personaDefinitionId: string
): PersonaTaskTemplateModel {
    return createTemplateFixture({
        personaDefinitionId,
        name: "Market Research Analysis",
        description: "Comprehensive market research for a specific industry",
        taskTemplate: `Conduct comprehensive market research on {{industry}} industry.

Focus on:
- Market size and growth trends
- Key players and competitive landscape
- Consumer trends and preferences
{{#if include_financial}}
- Financial analysis and projections
{{/if}}

Deliverable: {{report_format}} report with actionable insights.`,
        variables: [
            {
                name: "industry",
                label: "Industry",
                type: "text",
                required: true
            },
            {
                name: "report_format",
                label: "Report Format",
                type: "select",
                required: true,
                options: [
                    { value: "executive_summary", label: "Executive Summary" },
                    { value: "detailed_analysis", label: "Detailed Analysis" },
                    { value: "presentation_deck", label: "Presentation Deck" }
                ]
            },
            {
                name: "include_financial",
                label: "Include Financial Analysis",
                type: "checkbox",
                required: false
            }
        ]
    });
}

/**
 * Create a content brief template
 */
export function createContentBriefTemplate(
    personaDefinitionId: string
): PersonaTaskTemplateModel {
    return createTemplateFixture({
        personaDefinitionId,
        name: "Content Brief Generator",
        description: "Generate a detailed content brief for writers",
        taskTemplate: `Create a content brief for a {{content_type}} about "{{topic}}".

Target audience: {{audience}}
Tone: {{tone}}
Word count: {{word_count}}

Include:
- Key messages
- SEO keywords
- Outline structure
- Reference sources`,
        variables: [
            {
                name: "content_type",
                label: "Content Type",
                type: "select",
                required: true,
                options: [
                    { value: "blog_post", label: "Blog Post" },
                    { value: "whitepaper", label: "Whitepaper" },
                    { value: "case_study", label: "Case Study" },
                    { value: "landing_page", label: "Landing Page" }
                ]
            },
            {
                name: "topic",
                label: "Topic",
                type: "text",
                required: true
            },
            {
                name: "audience",
                label: "Target Audience",
                type: "text",
                required: true
            },
            {
                name: "tone",
                label: "Tone",
                type: "select",
                required: true,
                options: [
                    { value: "professional", label: "Professional" },
                    { value: "casual", label: "Casual" },
                    { value: "technical", label: "Technical" },
                    { value: "conversational", label: "Conversational" }
                ]
            },
            {
                name: "word_count",
                label: "Word Count",
                type: "number",
                required: true
            }
        ]
    });
}

// ============================================================================
// TEST SCENARIO FIXTURES
// ============================================================================

/**
 * Pre-built test scenarios for common testing patterns
 */
export const testScenarios = {
    /**
     * Simple instance creation and completion
     */
    simpleCompletion: {
        persona: createResearchAssistantPersona(),
        instance: (personaId: string, workspaceId: string) =>
            createCompletedInstance(personaId, workspaceId),
        deliverables: (instanceId: string) => [createMarkdownDeliverable(instanceId)]
    },

    /**
     * Instance requiring approval
     */
    pendingApproval: {
        persona: createResearchAssistantPersona(),
        instance: (personaId: string, workspaceId: string) =>
            createWaitingApprovalInstance(personaId, workspaceId),
        approval: (instanceId: string) => createToolCallApproval(instanceId)
    },

    /**
     * Instance with multiple deliverables
     */
    multipleDeliverables: {
        persona: createDataAnalystPersona(),
        instance: (personaId: string, workspaceId: string) =>
            createCompletedInstance(personaId, workspaceId),
        deliverables: (instanceId: string) => [
            createMarkdownDeliverable(instanceId),
            createCsvDeliverable(instanceId),
            createJsonDeliverable(instanceId)
        ]
    },

    /**
     * Instance with external connections
     */
    withConnections: {
        persona: createResearchAssistantPersona(),
        instance: (personaId: string, workspaceId: string) =>
            createRunningInstance(personaId, workspaceId),
        connections: (instanceId: string) => [
            createSlackConnection(instanceId),
            createGitHubConnection(instanceId)
        ]
    },

    /**
     * Instance in clarification phase
     */
    clarificationPhase: {
        persona: createContentWriterPersona(),
        instance: (personaId: string, workspaceId: string) =>
            createClarifyingInstance(personaId, workspaceId),
        messages: (instanceId: string) => [
            createUserMessage(instanceId, "I need help writing content"),
            createAssistantMessage(
                instanceId,
                "Could you tell me more about your target audience?"
            ),
            createUserMessage(instanceId, "Technical professionals in SaaS companies")
        ]
    }
};
