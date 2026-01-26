/**
 * Webhook Delivery Orchestration Tests
 *
 * Tests workflows that deliver webhooks and send notifications:
 * - Action node webhook delivery
 * - Multi-endpoint notification fanout
 * - Retry with exponential backoff
 * - Error handling and fallback
 * - Event-driven workflows with webhook triggers
 */

import nock from "nock";
import type { JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs
} from "../../../src/temporal/core";
import {
    createMockActivities,
    withOutputsAndSignals,
    mergeConfigs,
    failNode
} from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
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
    handleType?: "default" | "true" | "false" | "error";
}

/**
 * Create a workflow from node and edge definitions
 */
function createWorkflow(nodeDefs: NodeDef[], edgeDefs: EdgeDef[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Build adjacency maps
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const { source, target } of edgeDefs) {
        if (!outgoing.has(source)) outgoing.set(source, []);
        if (!incoming.has(target)) incoming.set(target, []);
        outgoing.get(source)!.push(target);
        incoming.get(target)!.push(source);
    }

    // Create nodes
    for (const { id, type, name, config } of nodeDefs) {
        nodes.set(id, {
            id,
            type: type as ExecutableNode["type"],
            name,
            config: config || {},
            depth: 0,
            dependencies: incoming.get(id) || [],
            dependents: outgoing.get(id) || []
        });
    }

    // Create edges
    for (const { source, target, handleType } of edgeDefs) {
        const edgeId = `${source}-${target}`;
        edges.set(edgeId, {
            id: edgeId,
            source,
            target,
            sourceHandle: handleType || "default",
            targetHandle: "input",
            handleType: handleType || "default"
        });
    }

    // Find input and output nodes
    const inputNodes = nodeDefs.filter((n) => n.type === "input").map((n) => n.id);
    const outputNodes = nodeDefs.filter((n) => n.type === "output").map((n) => n.id);

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [],
        triggerNodeId: inputNodes[0] || nodeDefs[0].id,
        outputNodeIds: outputNodes,
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

interface SimulationResult {
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    failedNodes: string[];
    completed: boolean;
}

/**
 * Simulate workflow execution
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<SimulationResult> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const failedNodes: string[] = [];

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);
        if (readyNodes.length === 0) break;

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(node.type, node.config, context, {
                    executionId: "test",
                    nodeId,
                    nodeName: node.name
                });

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    failedNodes.push(nodeId);
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                failedNodes.push(nodeId);
                queueState = markFailed(queueState, nodeId, message, workflow);
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);
    return {
        context,
        finalOutputs,
        executionOrder,
        failedNodes,
        completed: isExecutionComplete(queueState)
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Webhook Delivery Orchestration", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("action node webhook delivery", () => {
        it("should execute action node to send webhook", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "Process", type: "transform", name: "Process Data" },
                    {
                        id: "SendWebhook",
                        type: "action",
                        name: "Send Webhook",
                        config: {
                            provider: "webhook",
                            operation: "send",
                            url: "https://api.example.com/webhook",
                            method: "POST"
                        }
                    },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "Process" },
                    { source: "Process", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { orderId: "12345", amount: 99.99 },
                        Process: {
                            payload: { orderId: "12345", amount: 99.99, status: "completed" }
                        },
                        SendWebhook: {
                            success: true,
                            statusCode: 200,
                            response: { received: true }
                        },
                        Output: { result: "Webhook sent successfully" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            expect(result.executionOrder).toContain("SendWebhook");
            expect(result.failedNodes).toHaveLength(0);
        });

        it("should include signature header in webhook delivery", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    {
                        id: "SendWebhook",
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
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        SendWebhook: {
                            success: true,
                            statusCode: 200,
                            signature: "v1=abc123...",
                            headers: {
                                "X-FlowMaestro-Signature": "v1=abc123...",
                                "X-FlowMaestro-Event": "workflow.completed"
                            }
                        },
                        Output: { result: "Webhook sent with signature" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            const webhookOutput = result.context.nodeOutputs.get("SendWebhook") as {
                headers?: { "X-FlowMaestro-Signature"?: string };
            };
            expect(webhookOutput?.headers?.["X-FlowMaestro-Signature"]).toBeDefined();
        });
    });

    describe("multi-endpoint notification fanout", () => {
        it("should send to multiple webhook endpoints in parallel", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "SlackWebhook", type: "action", name: "Slack Webhook" },
                    { id: "DiscordWebhook", type: "action", name: "Discord Webhook" },
                    { id: "EmailAction", type: "action", name: "Send Email" },
                    { id: "Merge", type: "transform", name: "Merge Results" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SlackWebhook" },
                    { source: "Input", target: "DiscordWebhook" },
                    { source: "Input", target: "EmailAction" },
                    { source: "SlackWebhook", target: "Merge" },
                    { source: "DiscordWebhook", target: "Merge" },
                    { source: "EmailAction", target: "Merge" },
                    { source: "Merge", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { message: "New order received", orderId: "12345" },
                        SlackWebhook: {
                            success: true,
                            channel: "#orders",
                            timestamp: "1234567890.123"
                        },
                        DiscordWebhook: { success: true, messageId: "discord-msg-123" },
                        EmailAction: { success: true, messageId: "email-msg-abc" },
                        Merge: {
                            notifications: {
                                slack: "sent",
                                discord: "sent",
                                email: "sent"
                            },
                            allSuccessful: true
                        },
                        Output: { result: "All notifications sent successfully" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            expect(result.executionOrder).toContain("SlackWebhook");
            expect(result.executionOrder).toContain("DiscordWebhook");
            expect(result.executionOrder).toContain("EmailAction");
            expect(result.failedNodes).toHaveLength(0);
        });

        it("should continue with partial success when one endpoint fails", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "SlackWebhook", type: "action", name: "Slack Webhook" },
                    { id: "DiscordWebhook", type: "action", name: "Discord Webhook" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SlackWebhook" },
                    { source: "Input", target: "DiscordWebhook" },
                    { source: "SlackWebhook", target: "Output" },
                    { source: "DiscordWebhook", target: "Output" }
                ]
            );

            // Slack succeeds, Discord fails
            const mockActivities = createMockActivities(
                mergeConfigs(
                    withOutputsAndSignals(
                        {
                            Input: { message: "test" },
                            SlackWebhook: { success: true, channel: "#test" },
                            Output: { result: "Partial success" }
                        },
                        {}
                    ),
                    failNode("DiscordWebhook", "Discord webhook returned 500")
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            // Workflow should still complete (output has both as dependencies but one succeeded)
            expect(result.executionOrder).toContain("SlackWebhook");
            expect(result.executionOrder).toContain("DiscordWebhook");
            expect(result.failedNodes).toContain("DiscordWebhook");
        });
    });

    describe("retry with exponential backoff", () => {
        it("should track retry attempts in webhook response", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    {
                        id: "SendWebhook",
                        type: "action",
                        name: "Send Webhook",
                        config: {
                            retryConfig: {
                                maxRetries: 3,
                                retryableStatuses: [500, 502, 503, 504]
                            }
                        }
                    },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        SendWebhook: {
                            success: true,
                            attempts: 2,
                            retryHistory: [
                                { attempt: 1, status: 503, error: "Service Unavailable" },
                                { attempt: 2, status: 200, success: true }
                            ]
                        },
                        Output: { result: "Webhook sent after retry" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            const webhookOutput = result.context.nodeOutputs.get("SendWebhook") as {
                attempts?: number;
                retryHistory?: Array<{ attempt: number; status: number }>;
            };
            expect(webhookOutput?.attempts).toBe(2);
            expect(webhookOutput?.retryHistory).toHaveLength(2);
        });

        it("should fail after max retries exceeded", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                mergeConfigs(
                    withOutputsAndSignals(
                        {
                            Input: { data: "test" }
                        },
                        {}
                    ),
                    failNode(
                        "SendWebhook",
                        "Max retries (5) exceeded. Last error: 503 Service Unavailable"
                    )
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.failedNodes).toContain("SendWebhook");
        });
    });

    describe("error handling and fallback", () => {
        it("should route to error handler on webhook failure", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "Success", type: "transform", name: "Success Handler" },
                    { id: "ErrorHandler", type: "transform", name: "Error Handler" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Success" },
                    { source: "SendWebhook", target: "ErrorHandler", handleType: "error" },
                    { source: "Success", target: "Output" },
                    { source: "ErrorHandler", target: "Output" }
                ]
            );

            // Note: In this test we simulate error handling at the workflow level
            // The mock indicates webhook failure
            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        SendWebhook: { success: false, error: "Webhook endpoint returned 500" },
                        ErrorHandler: {
                            handled: true,
                            originalError: "Webhook endpoint returned 500"
                        },
                        Output: { result: "Error handled gracefully" }
                    },
                    {
                        SendWebhook: { activateErrorPort: "error" }
                    }
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.executionOrder).toContain("ErrorHandler");
        });

        it("should use fallback webhook endpoint on primary failure", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "PrimaryWebhook", type: "action", name: "Primary Webhook" },
                    { id: "FallbackWebhook", type: "action", name: "Fallback Webhook" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "PrimaryWebhook" },
                    { source: "PrimaryWebhook", target: "FallbackWebhook", handleType: "error" },
                    { source: "PrimaryWebhook", target: "Output" },
                    { source: "FallbackWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "important-notification" },
                        PrimaryWebhook: { success: false, error: "Primary endpoint unavailable" },
                        FallbackWebhook: { success: true, endpoint: "fallback", delivered: true },
                        Output: { result: "Delivered via fallback" }
                    },
                    {
                        PrimaryWebhook: { activateErrorPort: "error" }
                    }
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.executionOrder).toContain("FallbackWebhook");
            const fallbackOutput = result.context.nodeOutputs.get("FallbackWebhook") as {
                success?: boolean;
                endpoint?: string;
            };
            expect(fallbackOutput?.success).toBe(true);
            expect(fallbackOutput?.endpoint).toBe("fallback");
        });
    });

    describe("event-driven workflows", () => {
        it("should process incoming webhook and trigger outgoing notifications", async () => {
            const workflow = createWorkflow(
                [
                    { id: "WebhookTrigger", type: "input", name: "Webhook Trigger" },
                    { id: "ValidatePayload", type: "transform", name: "Validate Payload" },
                    { id: "ProcessEvent", type: "transform", name: "Process Event" },
                    { id: "NotifySlack", type: "action", name: "Notify Slack" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "WebhookTrigger", target: "ValidatePayload" },
                    { source: "ValidatePayload", target: "ProcessEvent" },
                    { source: "ProcessEvent", target: "NotifySlack" },
                    { source: "NotifySlack", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        WebhookTrigger: {
                            event: "order.created",
                            payload: { orderId: "123", amount: 199.99 }
                        },
                        ValidatePayload: { valid: true, orderId: "123", amount: 199.99 },
                        ProcessEvent: {
                            message: "New order #123 for $199.99",
                            priority: "high"
                        },
                        NotifySlack: {
                            success: true,
                            channel: "#orders",
                            message: "New order #123 for $199.99"
                        },
                        Output: { result: "Event processed and notification sent" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {
                event: "order.created",
                payload: { orderId: "123", amount: 199.99 }
            });

            expect(result.completed).toBe(true);
            expect(result.executionOrder).toEqual([
                "WebhookTrigger",
                "ValidatePayload",
                "ProcessEvent",
                "NotifySlack",
                "Output"
            ]);
        });

        it("should handle webhook payload transformation", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "Transform", type: "transform", name: "Transform Payload" },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "Transform" },
                    { source: "Transform", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: {
                            user: { id: "u123", email: "user@example.com" },
                            action: "signup"
                        },
                        Transform: {
                            webhookPayload: {
                                eventType: "user.signup",
                                userId: "u123",
                                email: "user@example.com",
                                timestamp: "2024-01-01T00:00:00Z"
                            }
                        },
                        SendWebhook: {
                            success: true,
                            delivered: true,
                            payloadSize: 156
                        },
                        Output: { result: "Transformed payload sent" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            const transformOutput = result.context.nodeOutputs.get("Transform") as {
                webhookPayload?: { eventType?: string };
            };
            expect(transformOutput?.webhookPayload?.eventType).toBe("user.signup");
        });
    });

    describe("batch webhook delivery", () => {
        it("should send webhooks for batch of events", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    {
                        id: "Loop",
                        type: "loop",
                        name: "Loop Through Events",
                        config: { arrayPath: "events", iterationVariable: "event" }
                    },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "Aggregate", type: "transform", name: "Aggregate Results" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "Loop" },
                    { source: "Loop", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Aggregate" },
                    { source: "Aggregate", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: {
                            events: [
                                { id: "e1", type: "order.created" },
                                { id: "e2", type: "order.paid" },
                                { id: "e3", type: "order.shipped" }
                            ]
                        },
                        Loop: { iterating: true, totalItems: 3 },
                        SendWebhook: { success: true, delivered: true },
                        Aggregate: {
                            totalSent: 3,
                            successful: 3,
                            failed: 0
                        },
                        Output: { result: "Batch delivery complete: 3/3 successful" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            const aggregateOutput = result.context.nodeOutputs.get("Aggregate") as {
                totalSent?: number;
                successful?: number;
            };
            expect(aggregateOutput?.totalSent).toBe(3);
            expect(aggregateOutput?.successful).toBe(3);
        });
    });

    describe("webhook response handling", () => {
        it("should capture and use webhook response data", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "ProcessResponse", type: "transform", name: "Process Response" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SendWebhook" },
                    { source: "SendWebhook", target: "ProcessResponse" },
                    { source: "ProcessResponse", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { requestId: "req-123" },
                        SendWebhook: {
                            success: true,
                            statusCode: 200,
                            responseBody: {
                                acknowledged: true,
                                trackingId: "track-456",
                                estimatedDelivery: "2024-01-02T10:00:00Z"
                            }
                        },
                        ProcessResponse: {
                            trackingId: "track-456",
                            deliveryExpected: "2024-01-02T10:00:00Z"
                        },
                        Output: { result: "Tracking ID: track-456" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            const processOutput = result.context.nodeOutputs.get("ProcessResponse") as {
                trackingId?: string;
            };
            expect(processOutput?.trackingId).toBe("track-456");
        });

        it("should handle timeout errors gracefully", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "HandleTimeout", type: "transform", name: "Handle Timeout" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "SendWebhook" },
                    { source: "SendWebhook", target: "HandleTimeout", handleType: "error" },
                    { source: "SendWebhook", target: "Output" },
                    { source: "HandleTimeout", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        SendWebhook: {
                            success: false,
                            error: "Request timeout after 10000ms",
                            errorType: "timeout"
                        },
                        HandleTimeout: {
                            handled: true,
                            action: "queued_for_retry",
                            queuedAt: "2024-01-01T00:00:00Z"
                        },
                        Output: { result: "Timeout handled, queued for retry" }
                    },
                    {
                        SendWebhook: { activateErrorPort: "error" }
                    }
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.executionOrder).toContain("HandleTimeout");
            const handleOutput = result.context.nodeOutputs.get("HandleTimeout") as {
                action?: string;
            };
            expect(handleOutput?.action).toBe("queued_for_retry");
        });
    });

    describe("conditional webhook delivery", () => {
        it("should conditionally send webhook based on event type", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "CheckEventType", type: "conditional", name: "Check Event Type" },
                    { id: "SendCriticalWebhook", type: "action", name: "Send Critical Alert" },
                    { id: "LogOnly", type: "transform", name: "Log Only" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "CheckEventType" },
                    { source: "CheckEventType", target: "SendCriticalWebhook", handleType: "true" },
                    { source: "CheckEventType", target: "LogOnly", handleType: "false" },
                    { source: "SendCriticalWebhook", target: "Output" },
                    { source: "LogOnly", target: "Output" }
                ]
            );

            // Test critical event path
            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { eventType: "error", severity: "critical" },
                        CheckEventType: { condition: true, route: "true" },
                        SendCriticalWebhook: {
                            success: true,
                            channel: "#alerts",
                            priority: "urgent"
                        },
                        Output: { result: "Critical alert sent" }
                    },
                    {
                        CheckEventType: { selectedRoute: "true", branchesToSkip: ["LogOnly"] }
                    }
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.executionOrder).toContain("SendCriticalWebhook");
        });
    });

    describe("webhook delivery with LLM-generated content", () => {
        it("should generate message with LLM and send via webhook", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "GenerateMessage", type: "llm", name: "Generate Message" },
                    { id: "SendWebhook", type: "action", name: "Send Webhook" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "GenerateMessage" },
                    { source: "GenerateMessage", target: "SendWebhook" },
                    { source: "SendWebhook", target: "Output" }
                ]
            );

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: {
                            customerName: "John Doe",
                            orderTotal: 150.0,
                            orderItems: ["Widget A", "Widget B"]
                        },
                        GenerateMessage: {
                            content:
                                "Thank you John Doe for your order of $150.00! Your items (Widget A, Widget B) will be shipped soon.",
                            tokens: 45
                        },
                        SendWebhook: {
                            success: true,
                            delivered: true,
                            messageLength: 105
                        },
                        Output: { result: "Personalized message sent via webhook" }
                    },
                    {}
                )
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(result.completed).toBe(true);
            const llmOutput = result.context.nodeOutputs.get("GenerateMessage") as {
                content?: string;
            };
            expect(llmOutput?.content).toContain("John Doe");
            expect(llmOutput?.content).toContain("$150.00");
        });
    });
});
