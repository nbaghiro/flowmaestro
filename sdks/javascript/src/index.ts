/**
 * @flowmaestro/sdk
 *
 * Official JavaScript/TypeScript SDK for FlowMaestro
 *
 * @example
 * ```typescript
 * import { FlowMaestroClient } from "@flowmaestro/sdk";
 *
 * const client = new FlowMaestroClient({
 *     apiKey: process.env.FLOWMAESTRO_API_KEY!
 * });
 *
 * // Execute a workflow
 * const { data } = await client.workflows.execute("wf_123", {
 *     inputs: { name: "John" }
 * });
 *
 * // Wait for completion
 * const result = await client.executions.waitForCompletion(data.execution_id);
 * console.log("Result:", result.outputs);
 *
 * // Stream agent conversation
 * const { data: thread } = await client.agents.createThread("agent_123");
 * client.threads.sendMessageStream(thread.id, "Hello!", {
 *     onToken: (token) => process.stdout.write(token),
 *     onComplete: (message) => console.log("\nDone!")
 * });
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { FlowMaestroClient } from "./client";

// Types
export type {
    // Client
    FlowMaestroClientOptions,

    // Common
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    ResponseMeta,

    // Workflows
    Workflow,
    WorkflowInput,
    ExecuteWorkflowOptions,
    ExecuteWorkflowResponse,

    // Executions
    Execution,
    ExecutionStatus,
    ListExecutionsOptions,
    WaitForCompletionOptions,
    ExecutionEvent,
    ExecutionEventType,

    // Agents
    Agent,
    CreateThreadOptions,

    // Threads
    Thread,
    ThreadStatus,
    ThreadMessage,
    SendMessageOptions,
    SendMessageResponse,
    ThreadEvent,
    ThreadEventType,

    // Streaming
    StreamCallbacks,
    MessageStreamCallbacks,

    // Triggers
    Trigger,
    ExecuteTriggerOptions,
    ExecuteTriggerResponse,

    // Knowledge Bases
    KnowledgeBase,
    QueryKnowledgeBaseOptions,
    QueryKnowledgeBaseResponse,
    KnowledgeBaseResult,

    // Webhooks
    Webhook,
    WebhookEventType,
    CreateWebhookOptions,
    TestWebhookResponse,

    // Errors
    ApiErrorResponse
} from "./types";

// Errors
export {
    FlowMaestroError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ServerError,
    TimeoutError,
    ConnectionError,
    StreamError
} from "./errors";

// Re-export resources for advanced usage
export { Workflows } from "./resources/workflows";
export { Executions } from "./resources/executions";
export { Agents } from "./resources/agents";
export { Threads } from "./resources/threads";
export { Triggers } from "./resources/triggers";
export { KnowledgeBases } from "./resources/knowledge-bases";
export { Webhooks } from "./resources/webhooks";

// HTTP utilities for advanced usage
export { HttpClient } from "./http/base-client";
export { SSEClient, type StreamHandle, type SSECallbacks } from "./http/sse-client";
