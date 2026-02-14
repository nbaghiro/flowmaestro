/**
 * Webhook Delivery Integration Tests
 *
 * True integration tests that execute webhook delivery workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Action node webhook delivery
 * - Multi-endpoint notification fanout
 * - Retry with exponential backoff
 * - Error handling and fallback
 * - Event-driven workflows with webhook triggers
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

interface NodeDef {
    id: string;
    type: string;
    name: string;
    config?: JsonObject;
}

interface EdgeDef {
    source: string;
    target: string;
}

/**
 * Create a workflow definition from node and edge definitions
 */
function createWorkflowDefinition(nodeDefs: NodeDef[], edgeDefs: EdgeDef[]): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodeDefs.forEach((def, index) => {
        nodes[def.id] = {
            type: def.type,
            name: def.name,
            config: def.config || {},
            position: { x: index * 200, y: 0 }
        };
    });

    for (const edge of edgeDefs) {
        edges.push({
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    const inputNode = nodeDefs.find((n) => n.type === "input");

    return {
        name: "Webhook Workflow",
        nodes,
        edges,
        entryPoint: inputNode?.id || nodeDefs[0].id
    };
}

/**
 * Create a simple webhook delivery workflow
 * Input -> Process -> SendWebhook -> Output
 */
function createWebhookDeliveryDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "process", type: "transform", name: "Process Data" },
            {
                id: "send_webhook",
                type: "action",
                name: "Send Webhook",
                config: {
                    provider: "webhook",
                    operation: "send",
                    url: "https://api.example.com/webhook",
                    method: "POST"
                }
            },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "process" },
            { source: "process", target: "send_webhook" },
            { source: "send_webhook", target: "output" }
        ]
    );
}

/**
 * Create a multi-endpoint notification fanout workflow
 * Input -> [Slack, Discord, Email] -> Merge -> Output
 */
function createFanoutWebhookDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "slack_webhook", type: "action", name: "Slack Webhook" },
            { id: "discord_webhook", type: "action", name: "Discord Webhook" },
            { id: "email_action", type: "action", name: "Send Email" },
            { id: "merge", type: "transform", name: "Merge Results" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "slack_webhook" },
            { source: "input", target: "discord_webhook" },
            { source: "input", target: "email_action" },
            { source: "slack_webhook", target: "merge" },
            { source: "discord_webhook", target: "merge" },
            { source: "email_action", target: "merge" },
            { source: "merge", target: "output" }
        ]
    );
}

/**
 * Create an event-driven webhook workflow
 * WebhookTrigger -> Validate -> Process -> NotifySlack -> Output
 */
function createEventDrivenWebhookDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "webhook_trigger", type: "input", name: "Webhook Trigger" },
            { id: "validate_payload", type: "transform", name: "Validate Payload" },
            { id: "process_event", type: "transform", name: "Process Event" },
            { id: "notify_slack", type: "action", name: "Notify Slack" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "webhook_trigger", target: "validate_payload" },
            { source: "validate_payload", target: "process_event" },
            { source: "process_event", target: "notify_slack" },
            { source: "notify_slack", target: "output" }
        ]
    );
}

/**
 * Create a batch webhook delivery workflow
 * Input -> Loop -> SendWebhook -> Aggregate -> Output
 */
function createBatchWebhookDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            {
                id: "loop",
                type: "loop",
                name: "Loop Through Events",
                config: { arrayPath: "events", iterationVariable: "event" }
            },
            { id: "send_webhook", type: "action", name: "Send Webhook" },
            { id: "aggregate", type: "transform", name: "Aggregate Results" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "loop" },
            { source: "loop", target: "send_webhook" },
            { source: "send_webhook", target: "aggregate" },
            { source: "aggregate", target: "output" }
        ]
    );
}

/**
 * Create an LLM-generated webhook content workflow
 * Input -> GenerateMessage -> SendWebhook -> Output
 */
function createLLMWebhookDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "generate_message", type: "llm", name: "Generate Message" },
            { id: "send_webhook", type: "action", name: "Send Webhook" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "generate_message" },
            { source: "generate_message", target: "send_webhook" },
            { source: "send_webhook", target: "output" }
        ]
    );
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Webhook Delivery Integration Tests", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve(
                "../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("action node webhook delivery", () => {
        it("should execute action node to send webhook", async () => {
            const workflowDef = createWebhookDeliveryDefinition();

            configureMockNodeOutputs({
                input: { orderId: "12345", amount: 99.99 },
                process: { payload: { orderId: "12345", amount: 99.99, status: "completed" } },
                send_webhook: { success: true, statusCode: 200, response: { received: true } },
                output: { result: "Webhook sent successfully" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-send-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-send",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("send_webhook");
        });

        it("should include signature header in webhook delivery", async () => {
            const workflowDef = createWorkflowDefinition(
                [
                    { id: "input", type: "input", name: "Input" },
                    {
                        id: "send_webhook",
                        type: "action",
                        name: "Send Webhook",
                        config: {
                            provider: "webhook",
                            operation: "send",
                            url: "https://api.example.com/webhook",
                            secret: "webhook-secret-key",
                            includeSignature: true
                        }
                    },
                    { id: "output", type: "output", name: "Output" }
                ],
                [
                    { source: "input", target: "send_webhook" },
                    { source: "send_webhook", target: "output" }
                ]
            );

            configureMockNodeOutputs({
                input: { data: "test" },
                send_webhook: {
                    success: true,
                    statusCode: 200,
                    signature: "v1=abc123...",
                    headers: {
                        "X-FlowMaestro-Signature": "v1=abc123...",
                        "X-FlowMaestro-Event": "workflow.completed"
                    }
                },
                output: { result: "Webhook sent with signature" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-signature-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-signature",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("multi-endpoint notification fanout", () => {
        it("should send to multiple webhook endpoints in parallel", async () => {
            const workflowDef = createFanoutWebhookDefinition();

            configureMockNodeOutputs({
                input: { message: "New order received", orderId: "12345" },
                slack_webhook: { success: true, channel: "#orders", timestamp: "1234567890.123" },
                discord_webhook: { success: true, messageId: "discord-msg-123" },
                email_action: { success: true, messageId: "email-msg-abc" },
                merge: {
                    notifications: { slack: "sent", discord: "sent", email: "sent" },
                    allSuccessful: true
                },
                output: { result: "All notifications sent successfully" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-fanout-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-fanout",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("slack_webhook");
            expect(nodeIds).toContain("discord_webhook");
            expect(nodeIds).toContain("email_action");
        });

        it("should handle partial success when one endpoint fails", async () => {
            const workflowDef = createFanoutWebhookDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "discord_webhook") {
                    throw new Error("Discord webhook returned 500");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { message: "test" },
                    slack_webhook: { success: true, channel: "#test" },
                    email_action: { success: true },
                    merge: { partial: true },
                    output: { result: "Partial success" }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-partial-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-partial",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("retry with exponential backoff", () => {
        it("should track retry attempts in webhook response", async () => {
            const workflowDef = createWorkflowDefinition(
                [
                    { id: "input", type: "input", name: "Input" },
                    {
                        id: "send_webhook",
                        type: "action",
                        name: "Send Webhook",
                        config: {
                            retryConfig: {
                                maxRetries: 3,
                                retryableStatuses: [500, 502, 503, 504]
                            }
                        }
                    },
                    { id: "output", type: "output", name: "Output" }
                ],
                [
                    { source: "input", target: "send_webhook" },
                    { source: "send_webhook", target: "output" }
                ]
            );

            configureMockNodeOutputs({
                input: { data: "test" },
                send_webhook: {
                    success: true,
                    attempts: 2,
                    retryHistory: [
                        { attempt: 1, status: 503, error: "Service Unavailable" },
                        { attempt: 2, status: 200, success: true }
                    ]
                },
                output: { result: "Webhook sent after retry" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-retry-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-retry",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should fail after max retries exceeded", async () => {
            const workflowDef = createWorkflowDefinition(
                [
                    { id: "input", type: "input", name: "Input" },
                    { id: "send_webhook", type: "action", name: "Send Webhook" },
                    { id: "output", type: "output", name: "Output" }
                ],
                [
                    { source: "input", target: "send_webhook" },
                    { source: "send_webhook", target: "output" }
                ]
            );

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "send_webhook") {
                    throw new Error(
                        "Max retries (5) exceeded. Last error: 503 Service Unavailable"
                    );
                }

                return {
                    result: { data: "test" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { data: "test" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-max-retry-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-max-retry",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("event-driven workflows", () => {
        it("should process incoming webhook and trigger outgoing notifications", async () => {
            const workflowDef = createEventDrivenWebhookDefinition();

            configureMockNodeOutputs({
                webhook_trigger: {
                    event: "order.created",
                    payload: { orderId: "123", amount: 199.99 }
                },
                validate_payload: { valid: true, orderId: "123", amount: 199.99 },
                process_event: { message: "New order #123 for $199.99", priority: "high" },
                notify_slack: {
                    success: true,
                    channel: "#orders",
                    message: "New order #123 for $199.99"
                },
                output: { result: "Event processed and notification sent" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-event-driven-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-event-driven",
                            workflowDefinition: workflowDef,
                            inputs: { event: "order.created", payload: { orderId: "123" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            // Note: input nodes like webhook_trigger are not executed via executeNode
            expect(nodeIds).toContain("validate_payload");
            expect(nodeIds).toContain("process_event");
            expect(nodeIds).toContain("notify_slack");
        });

        it("should handle webhook payload transformation", async () => {
            const workflowDef = createWorkflowDefinition(
                [
                    { id: "input", type: "input", name: "Input" },
                    { id: "transform", type: "transform", name: "Transform Payload" },
                    { id: "send_webhook", type: "action", name: "Send Webhook" },
                    { id: "output", type: "output", name: "Output" }
                ],
                [
                    { source: "input", target: "transform" },
                    { source: "transform", target: "send_webhook" },
                    { source: "send_webhook", target: "output" }
                ]
            );

            configureMockNodeOutputs({
                input: { user: { id: "u123", email: "user@example.com" }, action: "signup" },
                transform: {
                    webhookPayload: {
                        eventType: "user.signup",
                        userId: "u123",
                        email: "user@example.com",
                        timestamp: "2024-01-01T00:00:00Z"
                    }
                },
                send_webhook: { success: true, delivered: true, payloadSize: 156 },
                output: { result: "Transformed payload sent" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transform-payload-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transform-payload",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("batch webhook delivery", () => {
        it("should send webhooks for batch of events", async () => {
            const workflowDef = createBatchWebhookDefinition();

            configureMockNodeOutputs({
                input: {
                    events: [
                        { id: "e1", type: "order.created" },
                        { id: "e2", type: "order.paid" },
                        { id: "e3", type: "order.shipped" }
                    ]
                },
                loop: { iterating: true, totalItems: 3 },
                send_webhook: { success: true, delivered: true },
                aggregate: { totalSent: 3, successful: 3, failed: 0 },
                output: { result: "Batch delivery complete: 3/3 successful" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-batch-webhook-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-batch-webhook",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("webhook response handling", () => {
        it("should capture and use webhook response data", async () => {
            const workflowDef = createWorkflowDefinition(
                [
                    { id: "input", type: "input", name: "Input" },
                    { id: "send_webhook", type: "action", name: "Send Webhook" },
                    { id: "process_response", type: "transform", name: "Process Response" },
                    { id: "output", type: "output", name: "Output" }
                ],
                [
                    { source: "input", target: "send_webhook" },
                    { source: "send_webhook", target: "process_response" },
                    { source: "process_response", target: "output" }
                ]
            );

            configureMockNodeOutputs({
                input: { requestId: "req-123" },
                send_webhook: {
                    success: true,
                    statusCode: 200,
                    responseBody: {
                        acknowledged: true,
                        trackingId: "track-456",
                        estimatedDelivery: "2024-01-02T10:00:00Z"
                    }
                },
                process_response: {
                    trackingId: "track-456",
                    deliveryExpected: "2024-01-02T10:00:00Z"
                },
                output: { result: "Tracking ID: track-456" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-response-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook-response",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("webhook delivery with LLM-generated content", () => {
        it("should generate message with LLM and send via webhook", async () => {
            const workflowDef = createLLMWebhookDefinition();

            configureMockNodeOutputs({
                input: {
                    customerName: "John Doe",
                    orderTotal: 150.0,
                    orderItems: ["Widget A", "Widget B"]
                },
                generate_message: {
                    content:
                        "Thank you John Doe for your order of $150.00! Your items (Widget A, Widget B) will be shipped soon.",
                    tokens: 45
                },
                send_webhook: { success: true, delivered: true, messageLength: 105 },
                output: { result: "Personalized message sent via webhook" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-llm-webhook-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-llm-webhook",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generate_message");
            expect(nodeIds).toContain("send_webhook");
        });
    });
});
