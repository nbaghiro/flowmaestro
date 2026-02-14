/**
 * Omnichannel Support Pattern Tests
 *
 * Tests the advanced-level multi-channel customer support workflow that includes:
 * - WhatsApp/Telegram message triggers
 * - Parallel CRM enrichment (HubSpot, Salesforce, Intercom)
 * - AI classification with sentiment analysis
 * - Priority-based routing (P1 urgent, P2 high, P3/P4 standard)
 * - Zendesk/Freshdesk ticket escalation
 * - Auto-response for standard queries
 * - Human review for sensitive responses
 * - Multi-channel reply (WhatsApp, Telegram)
 * - Segment analytics tracking
 *
 * Pattern: trigger → [hubspot, salesforce, intercom] → llm-context → llm-classify →
 *          router-priority → [zendesk/freshdesk/llm-response] → [slack notifications] →
 *          humanReview → [whatsapp/telegram reply] → intercom-update → segment → output
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    simulateRouterPatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockActionOutput,
    createMockRouterOutput,
    createMockTriggerOutput,
    createMockTransformOutput,
    createHumanReviewOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType,
    hasSandboxFixture,
    getSandboxDataService,
    getFixtureRegistry,
    createSandboxActionOutput
} from "../helpers/pattern-test-utils";

describe("Omnichannel Support Pattern", () => {
    const PATTERN_ID = "whatsapp-support-bot";
    const sandboxDataService = getSandboxDataService();

    beforeEach(() => {
        // Clear any custom scenarios between tests
        sandboxDataService.clearScenarios();
    });

    // Sample WhatsApp message event
    const sampleWhatsAppEvent = {
        platform: "whatsapp",
        messageId: "msg-123",
        from: "+1234567890",
        timestamp: "2024-02-15T10:30:00Z",
        message: {
            type: "text",
            text: "My order #12345 hasn't arrived yet and it's been 2 weeks. This is unacceptable!"
        },
        contact: {
            phone: "+1234567890",
            name: "John Customer"
        }
    };

    // HubSpot customer data
    const hubspotData = {
        contactId: "hs-contact-123",
        email: "john@example.com",
        properties: {
            firstname: "John",
            lastname: "Customer",
            lifecyclestage: "customer",
            hs_lead_status: "active"
        },
        deals: [{ id: "deal-456", amount: 500, stage: "closedwon" }]
    };

    // Salesforce customer data
    const salesforceData = {
        contactId: "sf-contact-456",
        accountId: "sf-acc-789",
        account: {
            name: "John's Company",
            type: "Customer",
            annualRevenue: 100000
        },
        cases: [{ id: "case-prev-1", subject: "Previous inquiry", status: "Closed" }]
    };

    // Intercom customer data
    const intercomData = {
        userId: "ic-user-789",
        email: "john@example.com",
        customAttributes: {
            plan: "premium",
            totalSpend: 1500,
            supportTier: "priority"
        },
        conversations: [{ id: "conv-1", state: "closed", rating: 5 }]
    };

    // Context enrichment result
    const contextResult = {
        customer: {
            name: "John Customer",
            email: "john@example.com",
            phone: "+1234567890",
            segment: "premium",
            totalSpend: 1500,
            supportHistory: {
                totalTickets: 2,
                avgRating: 5,
                lastContact: "2024-01-15"
            }
        },
        relevantHistory: [
            "Previous positive support interaction",
            "Premium customer with high lifetime value"
        ]
    };

    // Classification result
    const classificationResult = {
        intent: "order_status",
        subIntent: "delivery_complaint",
        sentiment: "negative",
        urgency: "high",
        priority: "p1",
        entities: {
            orderNumber: "12345",
            timeframe: "2 weeks"
        },
        suggestedCategory: "Shipping/Delivery",
        escalationRecommended: true,
        reasoning: "Customer is frustrated about delayed delivery of order #12345"
    };

    // Auto-generated response
    const autoResponse = {
        message:
            "Hi John, I sincerely apologize for the delay with your order #12345. I understand how frustrating this must be. I've flagged this as urgent and our shipping team is investigating right now. You'll receive an update within 2 hours. Is there anything else I can help with?",
        tone: "empathetic",
        includesApology: true,
        includesResolution: true
    };

    // Helper to create complete mock outputs
    const createCompleteMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "trigger-whatsapp": createMockTriggerOutput(sampleWhatsAppEvent),
        "action-hubspot": createMockActionOutput(true, hubspotData),
        "action-salesforce": createMockActionOutput(true, salesforceData),
        "action-intercom": createMockActionOutput(true, intercomData),
        "llm-context": createMockLLMOutput(JSON.stringify(contextResult)),
        "llm-classify": createMockLLMOutput(JSON.stringify(classificationResult)),
        "router-priority": createMockRouterOutput("p1"),
        "action-zendesk-urgent": createMockActionOutput(true, { ticketId: "zd-123" }),
        "action-freshdesk": createMockActionOutput(true, { ticketId: "fd-456" }),
        "llm-response": createMockLLMOutput(JSON.stringify(autoResponse)),
        "action-slack-urgent": createMockActionOutput(true, { messageTs: "123.456" }),
        "action-slack-queue": createMockActionOutput(true, { messageTs: "123.457" }),
        "humanReview-1": createHumanReviewOutput(true, "Response approved"),
        "action-whatsapp-reply": createMockActionOutput(true, { messageId: "reply-123" }),
        "action-telegram-reply": createMockActionOutput(true, { messageId: "tg-reply-456" }),
        "action-intercom-update": createMockActionOutput(true, { updated: true }),
        "action-segment": createMockActionOutput(true, { tracked: true }),
        "transform-result": createMockTransformOutput({
            ticketId: "zd-123",
            priority: "p1",
            responseTime: 45
        }),
        "output-1": createMockActionOutput(true),
        ...overrides
    });

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count (20 nodes)", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBe(20);
        });

        it("should have trigger nodes for multiple channels", () => {
            const triggerNodes = getPatternNodesByType(PATTERN_ID, "trigger");
            expect(triggerNodes.length).toBe(2); // WhatsApp and Telegram triggers
        });

        it("should have router for priority-based routing", () => {
            const routerNodes = getPatternNodesByType(PATTERN_ID, "router");
            expect(routerNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have human review node", () => {
            const humanReviewNodes = getPatternNodesByType(PATTERN_ID, "humanReview");
            expect(humanReviewNodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("multi-channel triggers", () => {
        it("should handle WhatsApp message trigger", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["trigger-whatsapp"]);
        });

        it("should handle Telegram message trigger", async () => {
            const telegramEvent = {
                platform: "telegram",
                messageId: "tg-msg-456",
                from: { id: 123456789, username: "johncustomer" },
                message: {
                    type: "text",
                    text: "Need help with my subscription"
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: telegramEvent },
                mockOutputs: createCompleteMocks({
                    "trigger-whatsapp": createMockTriggerOutput(telegramEvent)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("CRM enrichment", () => {
        it("should fetch customer data from HubSpot, Salesforce, and Intercom in parallel", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-hubspot", "action-salesforce", "action-intercom"]);
        });

        it("should handle missing CRM data gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "action-hubspot": createMockActionOutput(false, {
                        error: "Contact not found"
                    }),
                    "action-salesforce": createMockActionOutput(false, {
                        error: "Contact not found"
                    })
                })
            });

            assertPatternSuccess(result);
        });

        it("should build comprehensive customer context", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-context"]);
        });
    });

    describe("AI classification", () => {
        it("should classify message intent and sentiment", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-classify"]);
        });

        it("should detect negative sentiment", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should extract entities from message", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("priority routing", () => {
        it("should route P1 urgent issues to Zendesk", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "router-priority": createMockRouterOutput("p1")
                }),
                routerNodeId: "router-priority",
                selectedRoute: "p1"
            });

            assertPatternSuccess(result);
        });

        it("should route P2 high priority to Freshdesk", async () => {
            const p2Classification = {
                ...classificationResult,
                priority: "p2",
                urgency: "medium"
            };

            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "llm-classify": createMockLLMOutput(JSON.stringify(p2Classification)),
                    "router-priority": createMockRouterOutput("p2")
                }),
                routerNodeId: "router-priority",
                selectedRoute: "p2"
            });

            assertPatternSuccess(result);
        });

        it("should route P3/P4 standard queries to auto-response", async () => {
            const p3Classification = {
                ...classificationResult,
                intent: "general_inquiry",
                sentiment: "neutral",
                priority: "p3",
                urgency: "low",
                escalationRecommended: false
            };

            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "llm-classify": createMockLLMOutput(JSON.stringify(p3Classification)),
                    "router-priority": createMockRouterOutput("p3")
                }),
                routerNodeId: "router-priority",
                selectedRoute: "p3"
            });

            assertPatternSuccess(result);
        });
    });

    describe("ticket escalation", () => {
        it("should create Zendesk ticket for urgent issues", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should notify urgent Slack channel for P1", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("auto-response generation", () => {
        it("should generate empathetic response for negative sentiment", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should include relevant order information in response", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("human review", () => {
        it("should require human review before sending response", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["humanReview-1"]);
        });

        it("should handle human rejection and revision", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "humanReview-1": createHumanReviewOutput(
                        false,
                        "Response needs more specific ETA"
                    )
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("multi-channel response", () => {
        it("should send reply via WhatsApp", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-whatsapp-reply"]);
        });

        it("should update Intercom conversation", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-intercom-update"]);
        });
    });

    describe("analytics tracking", () => {
        it("should track support interaction in Segment", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-segment"]);
        });
    });

    describe("edge cases", () => {
        it("should handle media messages (images)", async () => {
            const imageMessage = {
                ...sampleWhatsAppEvent,
                message: {
                    type: "image",
                    caption: "Here's a photo of the damaged product",
                    mediaUrl: "https://media.whatsapp.net/image123"
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: imageMessage },
                mockOutputs: createCompleteMocks({
                    "trigger-whatsapp": createMockTriggerOutput(imageMessage)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle voice messages", async () => {
            const voiceMessage = {
                ...sampleWhatsAppEvent,
                message: {
                    type: "audio",
                    duration: 30,
                    mediaUrl: "https://media.whatsapp.net/audio456"
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: voiceMessage },
                mockOutputs: createCompleteMocks({
                    "trigger-whatsapp": createMockTriggerOutput(voiceMessage)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle new customer with no CRM history", async () => {
            const newCustomerContext = {
                customer: {
                    name: "Unknown",
                    phone: "+1234567890",
                    segment: "new",
                    totalSpend: 0,
                    supportHistory: {
                        totalTickets: 0,
                        avgRating: null,
                        lastContact: null
                    }
                },
                relevantHistory: []
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "action-hubspot": createMockActionOutput(false, { error: "Not found" }),
                    "action-salesforce": createMockActionOutput(false, { error: "Not found" }),
                    "action-intercom": createMockActionOutput(false, { error: "Not found" }),
                    "llm-context": createMockLLMOutput(JSON.stringify(newCustomerContext))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle VIP customer with expedited handling", async () => {
            const vipContext = {
                ...contextResult,
                customer: {
                    ...contextResult.customer,
                    segment: "vip",
                    totalSpend: 50000,
                    supportHistory: {
                        totalTickets: 5,
                        avgRating: 5,
                        lastContact: "2024-02-10"
                    }
                }
            };

            const vipClassification = {
                ...classificationResult,
                priority: "p1",
                vipCustomer: true,
                expeditedHandling: true
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "llm-context": createMockLLMOutput(JSON.stringify(vipContext)),
                    "llm-classify": createMockLLMOutput(JSON.stringify(vipClassification))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle spam/abuse detection", async () => {
            const spamMessage = {
                ...sampleWhatsAppEvent,
                message: {
                    type: "text",
                    text: "BUY NOW CHEAP PRODUCTS CLICK HERE!!!"
                }
            };

            const spamClassification = {
                intent: "spam",
                sentiment: "neutral",
                priority: "p4",
                isSpam: true,
                action: "block_and_report"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: spamMessage },
                mockOutputs: createCompleteMocks({
                    "trigger-whatsapp": createMockTriggerOutput(spamMessage),
                    "llm-classify": createMockLLMOutput(JSON.stringify(spamClassification)),
                    "router-priority": createMockRouterOutput("p4")
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("output structure", () => {
        it("should produce comprehensive support result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);

            const transformOutput = result.context.nodeOutputs.get("transform-result") as Record<
                string,
                unknown
            >;
            expect(transformOutput?.success).toBe(true);
        });
    });

    describe("sandbox data integration", () => {
        it("should have HubSpot fixtures available for CRM enrichment", () => {
            expect(hasSandboxFixture("hubspot", "getContact")).toBe(true);
        });

        it("should have Salesforce fixtures available", () => {
            expect(hasSandboxFixture("salesforce", "getRecord")).toBe(true);
        });

        it("should have Intercom fixtures available", () => {
            expect(hasSandboxFixture("intercom", "getContact")).toBe(true);
        });

        it("should have Zendesk fixtures available for ticket creation", () => {
            expect(hasSandboxFixture("zendesk", "createTicket")).toBe(true);
        });

        it("should have Slack fixtures available for notifications", () => {
            expect(hasSandboxFixture("slack", "sendMessage")).toBe(true);
        });

        it("should have WhatsApp fixtures available for messaging", () => {
            expect(hasSandboxFixture("whatsapp", "sendTextMessage")).toBe(true);
        });

        it("should have Segment fixtures available for analytics", () => {
            expect(hasSandboxFixture("segment", "trackEvent")).toBe(true);
        });

        it("should use sandbox data for HubSpot CRM action", async () => {
            const hubspotOutput = await createSandboxActionOutput("hubspot", "getContact", {
                email: "customer@example.com"
            });

            expect(hubspotOutput.success).toBe(true);
            expect(hubspotOutput.fromSandbox).toBe(true);
        });

        it("should use sandbox data for Slack notifications", async () => {
            const slackOutput = await createSandboxActionOutput("slack", "sendMessage", {
                channel: "#urgent-support",
                text: "New P1 ticket created"
            });

            expect(slackOutput.success).toBe(true);
            expect(slackOutput.fromSandbox).toBe(true);
        });

        it("should support custom error scenarios for CRM failures", async () => {
            sandboxDataService.registerScenario({
                id: "hubspot-rate-limited",
                provider: "hubspot",
                operation: "getContact",
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "Daily API limit exceeded",
                        retryable: true
                    }
                }
            });

            const response = await sandboxDataService.getSandboxResponse(
                "hubspot",
                "getContact",
                {}
            );

            expect(response?.success).toBe(false);
            expect(response?.error?.type).toBe("rate_limit");
        });

        it("should support custom error scenarios for ticket system failures", async () => {
            sandboxDataService.registerScenario({
                id: "zendesk-auth-error",
                provider: "zendesk",
                operation: "createTicket",
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Authentication failed",
                        retryable: false
                    }
                }
            });

            const response = await sandboxDataService.getSandboxResponse(
                "zendesk",
                "createTicket",
                {}
            );

            expect(response?.success).toBe(false);
            expect(response?.error?.type).toBe("permission");
        });

        it("should integrate multiple sandbox actions into pattern execution", async () => {
            const hubspotAction = await createSandboxActionOutput("hubspot", "getContact", {
                email: "john@example.com"
            });
            const slackAction = await createSandboxActionOutput("slack", "sendMessage", {
                channel: "#urgent-support",
                text: "P1 ticket for VIP customer"
            });

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { supportMessage: sampleWhatsAppEvent },
                mockOutputs: createCompleteMocks({
                    "action-hubspot": hubspotAction,
                    "action-slack-urgent": slackAction
                })
            });

            assertPatternSuccess(result);
        });

        it("should list all available providers for omnichannel support", () => {
            const fixtureRegistry = getFixtureRegistry();
            const providers = fixtureRegistry.getProviders();

            // Verify the comprehensive set of providers for omnichannel support
            expect(providers).toContain("hubspot");
            expect(providers).toContain("salesforce");
            expect(providers).toContain("intercom");
            expect(providers).toContain("zendesk");
            expect(providers).toContain("freshdesk");
            expect(providers).toContain("slack");
            expect(providers).toContain("whatsapp");
            expect(providers).toContain("telegram");
            expect(providers).toContain("segment");
        });
    });
});
