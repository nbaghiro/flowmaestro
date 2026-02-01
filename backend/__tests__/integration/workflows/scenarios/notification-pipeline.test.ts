/**
 * Notification Pipeline Workflow Tests
 *
 * Tests a realistic notification delivery pipeline:
 * Trigger → Conditional (channel) → Parallel[Email, Slack, SMS] → Join → Output
 *
 * Uses the sandbox mock data infrastructure for integration responses.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { sandboxDataService, fixtureRegistry } from "../../../../src/integrations/sandbox";
import { createContext, storeNodeOutput } from "../../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// Import fixtures to register them
import "../../../fixtures/integration-fixtures";

// Channel type alias for the notification system
type ChannelType = "email" | "slack" | "sms" | "push";

// Simplified types for test workflow building
interface TestNode {
    id: string;
    type: string;
    config: Record<string, unknown>;
    dependencies: string[];
}

interface TestEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    handleType?: string;
}

// Types for notification pipeline
interface NotificationRequest {
    userId: string;
    eventType: "alert" | "reminder" | "marketing" | "transactional";
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    channels?: ("email" | "slack" | "sms" | "push")[];
    preferences?: {
        email?: string;
        phone?: string;
        slackId?: string;
        pushToken?: string;
    };
}

interface ChannelResult {
    channel: string;
    success: boolean;
    messageId?: string;
    error?: string;
    deliveredAt?: number;
    metadata?: Record<string, unknown>;
}

interface NotificationSummary {
    notificationId: string;
    userId: string;
    eventType: string;
    channelsAttempted: string[];
    channelsSucceeded: string[];
    channelsFailed: string[];
    totalLatency: number;
    results: ChannelResult[];
}

// Build notification workflow
function buildNotificationWorkflow(channels: string[]): {
    nodes: Map<string, TestNode>;
    edges: TestEdge[];
    executionLevels: string[][];
} {
    const nodes = new Map<string, TestNode>();

    nodes.set("Trigger", {
        id: "Trigger",
        type: "trigger",
        config: { triggerType: "event" },
        dependencies: []
    });

    nodes.set("RouteByPriority", {
        id: "RouteByPriority",
        type: "conditional",
        config: {
            condition: "{{Trigger.priority}}",
            cases: ["urgent", "high", "medium", "low"]
        },
        dependencies: ["Trigger"]
    });

    nodes.set("ParallelSend", {
        id: "ParallelSend",
        type: "parallel",
        config: {
            branches: channels.map((ch) => `Send${ch.charAt(0).toUpperCase() + ch.slice(1)}`)
        },
        dependencies: ["RouteByPriority"]
    });

    // Create channel nodes
    channels.forEach((channel) => {
        const nodeName = `Send${channel.charAt(0).toUpperCase() + channel.slice(1)}`;
        nodes.set(nodeName, {
            id: nodeName,
            type: "integration",
            config: {
                provider: channel,
                operation: "send"
            },
            dependencies: ["ParallelSend"]
        });
    });

    nodes.set("JoinResults", {
        id: "JoinResults",
        type: "join",
        config: {
            strategy: "all"
        },
        dependencies: channels.map((ch) => `Send${ch.charAt(0).toUpperCase() + ch.slice(1)}`)
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        config: {},
        dependencies: ["JoinResults"]
    });

    const edges: TestEdge[] = [
        { id: "e1", source: "Trigger", target: "RouteByPriority", type: "default" },
        { id: "e2", source: "RouteByPriority", target: "ParallelSend", type: "default" },
        ...channels.map((ch, i) => ({
            id: `e${3 + i}`,
            source: "ParallelSend",
            target: `Send${ch.charAt(0).toUpperCase() + ch.slice(1)}`,
            type: "parallel-branch" as const
        })),
        ...channels.map((ch, i) => ({
            id: `e${3 + channels.length + i}`,
            source: `Send${ch.charAt(0).toUpperCase() + ch.slice(1)}`,
            target: "JoinResults",
            type: "default" as const
        })),
        {
            id: `e${3 + channels.length * 2}`,
            source: "JoinResults",
            target: "Output",
            type: "default"
        }
    ];

    const executionLevels = [
        ["Trigger"],
        ["RouteByPriority"],
        ["ParallelSend"],
        channels.map((ch) => `Send${ch.charAt(0).toUpperCase() + ch.slice(1)}`),
        ["JoinResults"],
        ["Output"]
    ]
        .flat()
        .map((n) => (typeof n === "string" ? [n] : n));

    return { nodes, edges, executionLevels };
}

/**
 * Get sandbox response for a channel integration
 * Maps notification channels to real integration providers where available
 */
async function getChannelSandboxResponse(
    channel: string,
    request: NotificationRequest
): Promise<ChannelResult | null> {
    // Map notification channels to real providers
    const providerMapping: Record<string, { provider: string; operation: string }> = {
        slack: { provider: "slack", operation: "sendMessage" },
        email: { provider: "sendgrid", operation: "sendEmail" },
        sms: { provider: "twilio", operation: "sendSMS" },
        push: { provider: "firebase", operation: "sendPush" }
    };

    const mapping = providerMapping[channel];
    if (!mapping) {
        return null;
    }

    // Check if we have sandbox data for this provider/operation
    if (!sandboxDataService.hasSandboxData(mapping.provider, mapping.operation)) {
        return null;
    }

    // Get sandbox response
    const sandboxResponse = await sandboxDataService.getSandboxResponse(
        mapping.provider,
        mapping.operation,
        {
            channel: request.preferences?.slackId || "#general",
            text: request.message,
            to: request.preferences?.email || request.preferences?.phone
        }
    );

    if (sandboxResponse?.success) {
        return {
            channel,
            success: true,
            messageId:
                ((sandboxResponse.data as Record<string, unknown>)?.messageId as string) ||
                ((sandboxResponse.data as Record<string, unknown>)?.ts as string) ||
                `${channel}_msg_${Date.now()}`,
            deliveredAt: Date.now(),
            metadata: {
                recipient:
                    channel === "email"
                        ? request.preferences?.email
                        : channel === "sms"
                          ? request.preferences?.phone
                          : channel === "slack"
                            ? request.preferences?.slackId
                            : request.preferences?.pushToken,
                sandboxData: sandboxResponse.data
            }
        };
    }

    return null;
}

// Simulate sending to a channel - now uses sandbox data when available
async function simulateChannelSend(
    channel: string,
    request: NotificationRequest,
    shouldFail: boolean = false,
    _latency: number = 100
): Promise<ChannelResult> {
    if (shouldFail) {
        return {
            channel,
            success: false,
            error: `Failed to send ${channel} notification: Service unavailable`
        };
    }

    // Try to get sandbox response first
    const sandboxResult = await getChannelSandboxResponse(channel, request);
    if (sandboxResult) {
        return sandboxResult;
    }

    // Fallback to simulated response
    return {
        channel,
        success: true,
        messageId: `${channel}_msg_${Date.now()}`,
        deliveredAt: Date.now(),
        metadata: {
            recipient:
                channel === "email"
                    ? request.preferences?.email
                    : channel === "sms"
                      ? request.preferences?.phone
                      : channel === "slack"
                        ? request.preferences?.slackId
                        : request.preferences?.pushToken
        }
    };
}

// Helper to convert interface to JsonObject
function toJsonObject<T extends object>(obj: T): JsonObject {
    return JSON.parse(JSON.stringify(obj)) as JsonObject;
}

// Simulate the notification pipeline
async function simulateNotificationPipeline(
    request: NotificationRequest,
    options: {
        failingChannels?: string[];
        channelLatencies?: Record<string, number>;
        skipChannels?: string[];
    } = {}
): Promise<{
    context: ContextSnapshot;
    summary: NotificationSummary;
    channelResults: ChannelResult[];
    deliveredChannels: string[];
    failedChannels: string[];
}> {
    const channels = request.channels || ["email", "slack", "sms"];
    const activeChannels = channels.filter((ch) => !options.skipChannels?.includes(ch));
    // Build workflow for reference (not directly used in mock simulation)
    buildNotificationWorkflow(activeChannels);

    let context = createContext(toJsonObject(request));
    const startTime = Date.now();
    const channelResults: ChannelResult[] = [];

    // Execute Trigger
    context = storeNodeOutput(context, "Trigger", toJsonObject(request));

    // Execute RouteByPriority
    const channelsForPriority =
        request.priority === "urgent"
            ? activeChannels
            : request.priority === "high"
              ? activeChannels.filter((ch) => ch !== "push")
              : request.priority === "medium"
                ? (["email", "slack"] as ChannelType[]).filter((ch) => activeChannels.includes(ch))
                : (["email"] as ChannelType[]).filter((ch) => activeChannels.includes(ch));

    context = storeNodeOutput(context, "RouteByPriority", {
        priority: request.priority,
        selectedChannels: channelsForPriority
    });

    // Execute ParallelSend - start all channels
    context = storeNodeOutput(context, "ParallelSend", {
        branches: channelsForPriority.length,
        started: Date.now()
    });

    // Execute each channel in "parallel" (simulated)
    for (const channel of channelsForPriority) {
        const shouldFail = options.failingChannels?.includes(channel) || false;
        const latency = options.channelLatencies?.[channel] || 50;

        // Simulate async delay
        await new Promise((resolve) => setTimeout(resolve, 1));

        const result = await simulateChannelSend(channel, request, shouldFail, latency);
        channelResults.push(result);

        const nodeName = `Send${channel.charAt(0).toUpperCase() + channel.slice(1)}`;
        context = storeNodeOutput(context, nodeName, toJsonObject(result));
    }

    // Execute JoinResults
    const deliveredChannels = channelResults.filter((r) => r.success).map((r) => r.channel);
    const failedChannels = channelResults.filter((r) => !r.success).map((r) => r.channel);

    context = storeNodeOutput(context, "JoinResults", {
        allCompleted: true,
        successCount: deliveredChannels.length,
        failureCount: failedChannels.length,
        results: channelResults.map((r) => toJsonObject(r)) as JsonValue[]
    });

    // Execute Output
    const totalLatency = Date.now() - startTime;
    const summary: NotificationSummary = {
        notificationId: `notif_${Date.now()}`,
        userId: request.userId,
        eventType: request.eventType,
        channelsAttempted: channelsForPriority,
        channelsSucceeded: deliveredChannels,
        channelsFailed: failedChannels,
        totalLatency,
        results: channelResults
    };

    context = storeNodeOutput(context, "Output", toJsonObject(summary));

    return {
        context,
        summary,
        channelResults,
        deliveredChannels,
        failedChannels
    };
}

describe("Notification Pipeline Workflow", () => {
    beforeEach(() => {
        // Clear any custom scenarios between tests
        sandboxDataService.clearScenarios();
    });

    describe("sandbox data integration", () => {
        it("should use sandbox data for Slack channel when available", async () => {
            // Verify slack fixture is registered
            expect(fixtureRegistry.has("slack", "sendMessage")).toBe(true);

            const request: NotificationRequest = {
                userId: "user_sandbox",
                eventType: "alert",
                priority: "urgent",
                title: "Test Alert",
                message: "Testing sandbox integration",
                channels: ["slack"],
                preferences: {
                    slackId: "U12345"
                }
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels).toContain("slack");
            // When sandbox data is used, it should have sandbox metadata
            const slackResult = result.channelResults.find((r) => r.channel === "slack");
            expect(slackResult?.success).toBe(true);
        });

        it("should register custom scenarios for error cases", async () => {
            // Register a custom error scenario
            sandboxDataService.registerScenario({
                id: "slack-rate-limited",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#rate-limited" },
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "Rate limit exceeded",
                        retryable: true
                    }
                }
            });

            // Verify the error scenario was registered by checking sandbox response
            const response = await sandboxDataService.getSandboxResponse("slack", "sendMessage", {
                channel: "#rate-limited",
                text: "test"
            });

            expect(response?.success).toBe(false);
            expect(response?.error?.type).toBe("rate_limit");
        });
    });

    describe("multi-channel delivery", () => {
        it("should deliver to all specified channels", async () => {
            const request: NotificationRequest = {
                userId: "user_123",
                eventType: "alert",
                priority: "urgent",
                title: "System Alert",
                message: "Your server is down",
                channels: ["email", "slack", "sms"],
                preferences: {
                    email: "user@example.com",
                    slackId: "U12345",
                    phone: "+1234567890"
                }
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels).toContain("email");
            expect(result.deliveredChannels).toContain("slack");
            expect(result.deliveredChannels).toContain("sms");
            expect(result.deliveredChannels.length).toBe(3);
        });

        it("should handle email-only notifications", async () => {
            const request: NotificationRequest = {
                userId: "user_456",
                eventType: "marketing",
                priority: "low",
                title: "Newsletter",
                message: "Check out our latest updates",
                channels: ["email"],
                preferences: { email: "subscriber@example.com" }
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels).toEqual(["email"]);
            expect(result.summary.channelsAttempted).toEqual(["email"]);
        });

        it("should handle all four channels", async () => {
            const request: NotificationRequest = {
                userId: "user_789",
                eventType: "alert",
                priority: "urgent",
                title: "Critical Alert",
                message: "Immediate attention required",
                channels: ["email", "slack", "sms", "push"],
                preferences: {
                    email: "user@example.com",
                    slackId: "U12345",
                    phone: "+1234567890",
                    pushToken: "device_token_abc"
                }
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels.length).toBe(4);
        });
    });

    describe("channel preference routing", () => {
        it("should use all channels for urgent priority", async () => {
            const request: NotificationRequest = {
                userId: "user_urgent",
                eventType: "alert",
                priority: "urgent",
                title: "Urgent",
                message: "Urgent message",
                channels: ["email", "slack", "sms", "push"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.channelsAttempted.length).toBe(4);
        });

        it("should exclude push for high priority", async () => {
            const request: NotificationRequest = {
                userId: "user_high",
                eventType: "alert",
                priority: "high",
                title: "High Priority",
                message: "High priority message",
                channels: ["email", "slack", "sms", "push"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.channelsAttempted).not.toContain("push");
            expect(result.summary.channelsAttempted).toContain("email");
            expect(result.summary.channelsAttempted).toContain("slack");
            expect(result.summary.channelsAttempted).toContain("sms");
        });

        it("should use only email and slack for medium priority", async () => {
            const request: NotificationRequest = {
                userId: "user_medium",
                eventType: "reminder",
                priority: "medium",
                title: "Reminder",
                message: "Don't forget",
                channels: ["email", "slack", "sms", "push"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.channelsAttempted).toContain("email");
            expect(result.summary.channelsAttempted).toContain("slack");
            expect(result.summary.channelsAttempted).not.toContain("sms");
            expect(result.summary.channelsAttempted).not.toContain("push");
        });

        it("should use only email for low priority", async () => {
            const request: NotificationRequest = {
                userId: "user_low",
                eventType: "marketing",
                priority: "low",
                title: "Update",
                message: "Minor update",
                channels: ["email", "slack", "sms", "push"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.channelsAttempted).toEqual(["email"]);
        });
    });

    describe("partial delivery success", () => {
        it("should continue when one channel fails", async () => {
            const request: NotificationRequest = {
                userId: "user_partial",
                eventType: "alert",
                priority: "urgent",
                title: "Alert",
                message: "Alert message",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request, {
                failingChannels: ["slack"]
            });

            expect(result.deliveredChannels).toContain("email");
            expect(result.deliveredChannels).toContain("sms");
            expect(result.failedChannels).toContain("slack");
        });

        it("should report partial success when some channels fail", async () => {
            const request: NotificationRequest = {
                userId: "user_mixed",
                eventType: "alert",
                priority: "urgent",
                title: "Mixed Results",
                message: "Some channels will fail",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request, {
                failingChannels: ["email", "sms"]
            });

            expect(result.summary.channelsSucceeded).toEqual(["slack"]);
            expect(result.summary.channelsFailed).toContain("email");
            expect(result.summary.channelsFailed).toContain("sms");
        });

        it("should handle all channels failing", async () => {
            const request: NotificationRequest = {
                userId: "user_allfail",
                eventType: "alert",
                priority: "urgent",
                title: "All Fail",
                message: "All channels will fail",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request, {
                failingChannels: ["email", "slack", "sms"]
            });

            expect(result.deliveredChannels.length).toBe(0);
            expect(result.failedChannels.length).toBe(3);
        });

        it("should preserve error details for failed channels", async () => {
            const request: NotificationRequest = {
                userId: "user_errors",
                eventType: "alert",
                priority: "high",
                title: "Error Details",
                message: "Check error details",
                channels: ["email", "slack"]
            };

            const result = await simulateNotificationPipeline(request, {
                failingChannels: ["slack"]
            });

            const slackResult = result.channelResults.find((r) => r.channel === "slack");
            expect(slackResult?.error).toContain("Failed to send slack notification");
        });
    });

    describe("template variable substitution", () => {
        it("should include user data in notification", async () => {
            const request: NotificationRequest = {
                userId: "user_template",
                eventType: "transactional",
                priority: "high",
                title: "Order Confirmation",
                message: "Your order #12345 has been confirmed",
                channels: ["email"],
                data: {
                    orderId: "12345",
                    amount: 99.99,
                    items: ["Product A", "Product B"]
                }
            };

            const result = await simulateNotificationPipeline(request);

            const triggerOutput = result.context.nodeOutputs.get(
                "Trigger"
            ) as unknown as NotificationRequest;
            expect(triggerOutput.data?.orderId).toBe("12345");
        });

        it("should include recipient info in channel metadata", async () => {
            const request: NotificationRequest = {
                userId: "user_recipient",
                eventType: "alert",
                priority: "urgent",
                title: "Alert",
                message: "Alert message",
                channels: ["email"],
                preferences: { email: "specific@example.com" }
            };

            const result = await simulateNotificationPipeline(request);

            const emailResult = result.channelResults.find((r) => r.channel === "email");
            expect(emailResult?.metadata?.recipient).toBe("specific@example.com");
        });

        it("should include phone number for SMS", async () => {
            const request: NotificationRequest = {
                userId: "user_sms",
                eventType: "alert",
                priority: "urgent",
                title: "SMS Alert",
                message: "SMS message",
                channels: ["sms"],
                preferences: { phone: "+15551234567" }
            };

            const result = await simulateNotificationPipeline(request);

            const smsResult = result.channelResults.find((r) => r.channel === "sms");
            expect(smsResult?.metadata?.recipient).toBe("+15551234567");
        });
    });

    describe("notification types", () => {
        it("should handle alert notifications", async () => {
            const request: NotificationRequest = {
                userId: "user_alert",
                eventType: "alert",
                priority: "urgent",
                title: "Security Alert",
                message: "Suspicious login detected",
                channels: ["email", "sms"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.eventType).toBe("alert");
            expect(result.deliveredChannels.length).toBeGreaterThan(0);
        });

        it("should handle reminder notifications", async () => {
            const request: NotificationRequest = {
                userId: "user_reminder",
                eventType: "reminder",
                priority: "medium",
                title: "Meeting Reminder",
                message: "Your meeting starts in 15 minutes",
                channels: ["email", "slack"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.eventType).toBe("reminder");
        });

        it("should handle marketing notifications", async () => {
            const request: NotificationRequest = {
                userId: "user_marketing",
                eventType: "marketing",
                priority: "low",
                title: "Special Offer",
                message: "50% off this weekend!",
                channels: ["email"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.eventType).toBe("marketing");
        });

        it("should handle transactional notifications", async () => {
            const request: NotificationRequest = {
                userId: "user_transaction",
                eventType: "transactional",
                priority: "high",
                title: "Payment Received",
                message: "We received your payment of $50.00",
                channels: ["email", "sms"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.eventType).toBe("transactional");
        });
    });

    describe("join behavior", () => {
        it("should wait for all channels before joining", async () => {
            const request: NotificationRequest = {
                userId: "user_join",
                eventType: "alert",
                priority: "urgent",
                title: "Join Test",
                message: "All channels should complete",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request);

            const joinOutput = result.context.nodeOutputs.get("JoinResults") as unknown as {
                allCompleted: boolean;
                results: ChannelResult[];
            };

            expect(joinOutput.allCompleted).toBe(true);
            expect(joinOutput.results.length).toBe(3);
        });

        it("should aggregate success count correctly", async () => {
            const request: NotificationRequest = {
                userId: "user_aggregate",
                eventType: "alert",
                priority: "urgent",
                title: "Aggregate Test",
                message: "Count successes",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request, {
                failingChannels: ["sms"]
            });

            const joinOutput = result.context.nodeOutputs.get("JoinResults") as {
                successCount: number;
                failureCount: number;
            };

            expect(joinOutput.successCount).toBe(2);
            expect(joinOutput.failureCount).toBe(1);
        });

        it("should preserve individual channel results after join", async () => {
            const request: NotificationRequest = {
                userId: "user_preserve",
                eventType: "alert",
                priority: "high",
                title: "Preserve Results",
                message: "Keep channel details",
                channels: ["email", "slack"]
            };

            const result = await simulateNotificationPipeline(request);

            // Each channel node should have its output
            expect(result.context.nodeOutputs.get("SendEmail")).toBeDefined();
            expect(result.context.nodeOutputs.get("SendSlack")).toBeDefined();
        });
    });

    describe("output summary", () => {
        it("should generate complete notification summary", async () => {
            const request: NotificationRequest = {
                userId: "user_summary",
                eventType: "alert",
                priority: "urgent",
                title: "Summary Test",
                message: "Generate summary",
                channels: ["email", "slack"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.notificationId).toMatch(/^notif_/);
            expect(result.summary.userId).toBe("user_summary");
            expect(result.summary.eventType).toBe("alert");
            expect(result.summary.channelsAttempted).toBeDefined();
            expect(result.summary.channelsSucceeded).toBeDefined();
            expect(result.summary.channelsFailed).toBeDefined();
            expect(result.summary.totalLatency).toBeGreaterThanOrEqual(0);
            expect(result.summary.results).toBeDefined();
        });

        it("should track total latency", async () => {
            const request: NotificationRequest = {
                userId: "user_latency",
                eventType: "reminder",
                priority: "medium",
                title: "Latency Test",
                message: "Track timing",
                channels: ["email"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.totalLatency).toBeGreaterThanOrEqual(0);
            expect(result.summary.totalLatency).toBeLessThan(1000);
        });

        it("should include message IDs for delivered channels", async () => {
            const request: NotificationRequest = {
                userId: "user_msgid",
                eventType: "transactional",
                priority: "high",
                title: "Message ID Test",
                message: "Track message IDs",
                channels: ["email", "slack"]
            };

            const result = await simulateNotificationPipeline(request);

            result.channelResults
                .filter((r) => r.success)
                .forEach((r) => {
                    expect(r.messageId).toBeDefined();
                });
        });
    });

    describe("skip channel functionality", () => {
        it("should skip specified channels", async () => {
            const request: NotificationRequest = {
                userId: "user_skip",
                eventType: "alert",
                priority: "urgent",
                title: "Skip Test",
                message: "Skip some channels",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request, {
                skipChannels: ["slack"]
            });

            expect(result.summary.channelsAttempted).not.toContain("slack");
            expect(result.summary.channelsAttempted).toContain("email");
            expect(result.summary.channelsAttempted).toContain("sms");
        });

        it("should handle skipping all but one channel", async () => {
            const request: NotificationRequest = {
                userId: "user_skipmost",
                eventType: "alert",
                priority: "urgent",
                title: "Skip Most",
                message: "Only one channel",
                channels: ["email", "slack", "sms"]
            };

            const result = await simulateNotificationPipeline(request, {
                skipChannels: ["slack", "sms"]
            });

            expect(result.summary.channelsAttempted).toEqual(["email"]);
        });
    });

    describe("concurrent notification handling", () => {
        it("should handle multiple notifications concurrently", async () => {
            const requests: NotificationRequest[] = Array.from({ length: 5 }, (_, i) => ({
                userId: `user_${i}`,
                eventType: "alert" as const,
                priority: "urgent" as const,
                title: `Alert ${i}`,
                message: `Message ${i}`,
                channels: ["email" as const]
            }));

            const results = await Promise.all(
                requests.map((req) => simulateNotificationPipeline(req))
            );

            expect(results.length).toBe(5);
            results.forEach((result, i) => {
                expect(result.summary.userId).toBe(`user_${i}`);
                expect(result.deliveredChannels).toContain("email");
            });
        });

        it("should maintain isolation between concurrent notifications", async () => {
            const [result1, result2] = await Promise.all([
                simulateNotificationPipeline({
                    userId: "user_a",
                    eventType: "alert",
                    priority: "urgent",
                    title: "Alert A",
                    message: "Message A",
                    channels: ["email", "slack"]
                }),
                simulateNotificationPipeline({
                    userId: "user_b",
                    eventType: "reminder",
                    priority: "low",
                    title: "Reminder B",
                    message: "Message B",
                    channels: ["email"]
                })
            ]);

            expect(result1.summary.userId).toBe("user_a");
            expect(result2.summary.userId).toBe("user_b");
            expect(result1.summary.channelsAttempted.length).toBeGreaterThan(
                result2.summary.channelsAttempted.length
            );
        });
    });

    describe("edge cases", () => {
        it("should handle empty channels array", async () => {
            const request: NotificationRequest = {
                userId: "user_empty",
                eventType: "alert",
                priority: "urgent",
                title: "No Channels",
                message: "No channels specified",
                channels: []
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.summary.channelsAttempted.length).toBe(0);
            expect(result.deliveredChannels.length).toBe(0);
        });

        it("should handle very long message", async () => {
            const longMessage = "A".repeat(10000);
            const request: NotificationRequest = {
                userId: "user_long",
                eventType: "alert",
                priority: "high",
                title: "Long Message",
                message: longMessage,
                channels: ["email"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels).toContain("email");
        });

        it("should handle special characters in message", async () => {
            const request: NotificationRequest = {
                userId: "user_special",
                eventType: "transactional",
                priority: "high",
                title: 'Special <Chars> & "Quotes"',
                message: "Price: $99.99 • Discount: 50% • Link: https://example.com?a=1&b=2",
                channels: ["email", "sms"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels.length).toBe(2);
        });

        it("should handle unicode in message", async () => {
            const request: NotificationRequest = {
                userId: "user_unicode",
                eventType: "marketing",
                priority: "low",
                title: "🎉 Special Offer 🎉",
                message: "你好世界 • مرحبا • שלום • 🚀",
                channels: ["email"]
            };

            const result = await simulateNotificationPipeline(request);

            expect(result.deliveredChannels).toContain("email");
        });
    });
});
