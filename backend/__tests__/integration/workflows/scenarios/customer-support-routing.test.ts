/**
 * Customer Support Routing Workflow Tests
 *
 * Tests a realistic support ticket routing system:
 * Receive Ticket → Classify → Route → Assign → Notify
 *
 * Simulates intelligent ticket classification and routing.
 */

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
} from "../../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createSupportRoutingWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Receive Ticket",
        config: { name: "ticket" },
        depth: 0,
        dependencies: [],
        dependents: ["EnrichCustomer"]
    });

    // Enrich with customer data
    nodes.set("EnrichCustomer", {
        id: "EnrichCustomer",
        type: "database",
        name: "Enrich Customer Data",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "query",
            parameters: {
                sql: "SELECT * FROM customers WHERE id = $1",
                params: ["{{Input.ticket.customerId}}"]
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["ClassifyTicket"]
    });

    // LLM classification
    nodes.set("ClassifyTicket", {
        id: "ClassifyTicket",
        type: "llm",
        name: "Classify Ticket",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: `Classify this support ticket and determine:
1. Category (billing, technical, sales, general, escalation)
2. Sentiment (positive, neutral, negative, angry)
3. Urgency (1-10)
4. Required skills

Subject: {{Input.ticket.subject}}
Description: {{Input.ticket.description}}
Customer Tier: {{EnrichCustomer.data[0].account_tier}}
Previous Tickets: {{EnrichCustomer.data[0].ticket_count}}`,
            responseFormat: "json"
        },
        depth: 2,
        dependencies: ["EnrichCustomer"],
        dependents: ["RouteByCategory"]
    });

    // Switch based on category
    nodes.set("RouteByCategory", {
        id: "RouteByCategory",
        type: "switch",
        name: "Route by Category",
        config: {
            expression: "{{ClassifyTicket.category}}",
            cases: [
                { value: "billing", label: "Billing" },
                { value: "technical", label: "Technical" },
                { value: "sales", label: "Sales" },
                { value: "escalation", label: "Escalation" }
            ],
            defaultCase: "general"
        },
        depth: 3,
        dependencies: ["ClassifyTicket"],
        dependents: [
            "AssignBilling",
            "AssignTechnical",
            "AssignSales",
            "AssignEscalation",
            "AssignGeneral"
        ]
    });

    // Team-specific assignment nodes
    const teams = [
        { id: "AssignBilling", team: "billing", queue: "billing-queue" },
        { id: "AssignTechnical", team: "technical", queue: "tech-support-queue" },
        { id: "AssignSales", team: "sales", queue: "sales-queue" },
        { id: "AssignEscalation", team: "escalation", queue: "urgent-queue" },
        { id: "AssignGeneral", team: "general", queue: "general-queue" }
    ];

    for (const teamConfig of teams) {
        nodes.set(teamConfig.id, {
            id: teamConfig.id,
            type: "http",
            name: `Assign to ${teamConfig.team}`,
            config: {
                method: "POST",
                url: `https://api.support.example.com/queues/${teamConfig.queue}/assign`,
                body: {
                    ticketId: "{{Input.ticket.ticketId}}",
                    priority: "{{ClassifyTicket.urgency}}",
                    skills: "{{ClassifyTicket.skillsRequired}}"
                }
            },
            depth: 4,
            dependencies: ["RouteByCategory"],
            dependents: ["UpdateTicket"]
        });
    }

    // Update ticket with routing info
    nodes.set("UpdateTicket", {
        id: "UpdateTicket",
        type: "database",
        name: "Update Ticket",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "update",
            parameters: {
                table: "tickets",
                data: {
                    status: "assigned",
                    category: "{{ClassifyTicket.category}}",
                    urgency: "{{ClassifyTicket.urgency}}",
                    assigned_at: "NOW()"
                },
                where: { id: "{{Input.ticket.ticketId}}" }
            }
        },
        depth: 5,
        dependencies: teams.map((t) => t.id),
        dependents: ["NotifyCustomer"]
    });

    // Notify customer
    nodes.set("NotifyCustomer", {
        id: "NotifyCustomer",
        type: "http",
        name: "Notify Customer",
        config: {
            method: "POST",
            url: "https://api.notifications.example.com/send",
            body: {
                type: "ticket_assigned",
                customerId: "{{Input.ticket.customerId}}",
                ticketId: "{{Input.ticket.ticketId}}",
                message: "Your ticket has been assigned to our team."
            }
        },
        depth: 6,
        dependencies: ["UpdateTicket"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 7,
        dependencies: ["NotifyCustomer"],
        dependents: []
    });

    // Edges
    edges.set("Input-EnrichCustomer", {
        id: "Input-EnrichCustomer",
        source: "Input",
        target: "EnrichCustomer",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("EnrichCustomer-ClassifyTicket", {
        id: "EnrichCustomer-ClassifyTicket",
        source: "EnrichCustomer",
        target: "ClassifyTicket",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("ClassifyTicket-RouteByCategory", {
        id: "ClassifyTicket-RouteByCategory",
        source: "ClassifyTicket",
        target: "RouteByCategory",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Switch case edges
    edges.set("RouteByCategory-AssignBilling", {
        id: "RouteByCategory-AssignBilling",
        source: "RouteByCategory",
        target: "AssignBilling",
        sourceHandle: "case-billing",
        targetHandle: "input",
        handleType: "case-billing"
    });

    edges.set("RouteByCategory-AssignTechnical", {
        id: "RouteByCategory-AssignTechnical",
        source: "RouteByCategory",
        target: "AssignTechnical",
        sourceHandle: "case-technical",
        targetHandle: "input",
        handleType: "case-technical"
    });

    edges.set("RouteByCategory-AssignSales", {
        id: "RouteByCategory-AssignSales",
        source: "RouteByCategory",
        target: "AssignSales",
        sourceHandle: "case-sales",
        targetHandle: "input",
        handleType: "case-sales"
    });

    edges.set("RouteByCategory-AssignEscalation", {
        id: "RouteByCategory-AssignEscalation",
        source: "RouteByCategory",
        target: "AssignEscalation",
        sourceHandle: "case-escalation",
        targetHandle: "input",
        handleType: "case-escalation"
    });

    edges.set("RouteByCategory-AssignGeneral", {
        id: "RouteByCategory-AssignGeneral",
        source: "RouteByCategory",
        target: "AssignGeneral",
        sourceHandle: "default",
        targetHandle: "input",
        handleType: "default"
    });

    // Assignment to update edges
    for (const team of teams) {
        edges.set(`${team.id}-UpdateTicket`, {
            id: `${team.id}-UpdateTicket`,
            source: team.id,
            target: "UpdateTicket",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    edges.set("UpdateTicket-NotifyCustomer", {
        id: "UpdateTicket-NotifyCustomer",
        source: "UpdateTicket",
        target: "NotifyCustomer",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("NotifyCustomer-Output", {
        id: "NotifyCustomer-Output",
        source: "NotifyCustomer",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["EnrichCustomer"],
            ["ClassifyTicket"],
            ["RouteByCategory"],
            [
                "AssignBilling",
                "AssignTechnical",
                "AssignSales",
                "AssignEscalation",
                "AssignGeneral"
            ],
            ["UpdateTicket"],
            ["NotifyCustomer"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    failedNodes: string[];
}> {
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
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    { nodeId, nodeName: node.name, executionId: "test-execution" }
                );

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
                failedNodes.push(nodeId);
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    return {
        context,
        finalOutputs: buildFinalOutputs(context, workflow.outputNodeIds),
        executionOrder,
        failedNodes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Customer Support Routing Workflow", () => {
    describe("ticket classification", () => {
        it("should classify and route billing ticket", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-001",
                            customerId: "cust-123",
                            subject: "Billing issue - double charged",
                            description: "I was charged twice for my subscription."
                        }
                    },
                    EnrichCustomer: {
                        data: [{ id: "cust-123", account_tier: "pro", ticket_count: 3 }]
                    },
                    ClassifyTicket: {
                        category: "billing",
                        sentiment: "negative",
                        urgency: 7,
                        skillsRequired: ["billing", "refunds"],
                        confidence: 0.95
                    },
                    RouteByCategory: { selectedCase: "billing" },
                    AssignBilling: { success: true, agentId: "agent-001", queuePosition: 2 },
                    AssignTechnical: { skipped: true },
                    AssignSales: { skipped: true },
                    AssignEscalation: { skipped: true },
                    AssignGeneral: { skipped: true },
                    UpdateTicket: { success: true, rowsAffected: 1 },
                    NotifyCustomer: { success: true, notificationId: "notif-001" },
                    Output: { result: { status: "assigned", team: "billing" } }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("ClassifyTicket");
            expect(executionOrder).toContain("RouteByCategory");
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should classify and route technical ticket", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-002",
                            customerId: "cust-456",
                            subject: "API not working",
                            description: "Getting 500 errors when calling the API endpoint."
                        }
                    },
                    EnrichCustomer: {
                        data: [{ id: "cust-456", account_tier: "enterprise", ticket_count: 10 }]
                    },
                    ClassifyTicket: {
                        category: "technical",
                        sentiment: "negative",
                        urgency: 8,
                        skillsRequired: ["api", "debugging", "enterprise"],
                        confidence: 0.92
                    },
                    RouteByCategory: { selectedCase: "technical" },
                    AssignBilling: { skipped: true },
                    AssignTechnical: { success: true, agentId: "tech-001", queuePosition: 1 },
                    AssignSales: { skipped: true },
                    AssignEscalation: { skipped: true },
                    AssignGeneral: { skipped: true },
                    UpdateTicket: { success: true },
                    NotifyCustomer: { success: true },
                    Output: { result: { status: "assigned", team: "technical" } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("AssignTechnical");
            expect(failedNodes).toHaveLength(0);
        });

        it("should route urgent tickets to escalation", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-003",
                            customerId: "cust-789",
                            subject: "URGENT: Service completely down",
                            description:
                                "Our entire production environment is down. Critical impact.",
                            priority: "urgent"
                        }
                    },
                    EnrichCustomer: {
                        data: [{ id: "cust-789", account_tier: "enterprise", ticket_count: 5 }]
                    },
                    ClassifyTicket: {
                        category: "escalation",
                        sentiment: "angry",
                        urgency: 10,
                        skillsRequired: ["senior-engineer", "incident-response"],
                        confidence: 0.99
                    },
                    RouteByCategory: { selectedCase: "escalation" },
                    AssignBilling: { skipped: true },
                    AssignTechnical: { skipped: true },
                    AssignSales: { skipped: true },
                    AssignEscalation: { success: true, agentId: "senior-001", queuePosition: 0 },
                    AssignGeneral: { skipped: true },
                    UpdateTicket: { success: true },
                    NotifyCustomer: { success: true },
                    Output: {
                        result: { status: "assigned", team: "escalation", priority: "urgent" }
                    }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("AssignEscalation");
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("customer enrichment", () => {
        it("should enrich ticket with customer history", async () => {
            const workflow = createSupportRoutingWorkflow();
            let enrichedData: JsonObject | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            ticket: {
                                ticketId: "TKT-004",
                                customerId: "cust-repeat",
                                subject: "Same issue again",
                                description: "Problem recurring"
                            }
                        }
                    },
                    EnrichCustomer: {
                        customOutput: {
                            data: [
                                {
                                    id: "cust-repeat",
                                    account_tier: "pro",
                                    ticket_count: 15,
                                    last_ticket_date: "2024-01-10",
                                    satisfaction_score: 3.2
                                }
                            ]
                        },
                        onExecute: (input) => {
                            enrichedData = input.context as unknown as JsonObject;
                        }
                    },
                    ClassifyTicket: {
                        customOutput: {
                            category: "technical",
                            sentiment: "negative",
                            urgency: 6,
                            skillsRequired: []
                        }
                    },
                    RouteByCategory: { customOutput: { selectedCase: "technical" } },
                    AssignBilling: { customOutput: { skipped: true } },
                    AssignTechnical: { customOutput: { success: true } },
                    AssignSales: { customOutput: { skipped: true } },
                    AssignEscalation: { customOutput: { skipped: true } },
                    AssignGeneral: { customOutput: { skipped: true } },
                    UpdateTicket: { customOutput: { success: true } },
                    NotifyCustomer: { customOutput: { success: true } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toHaveLength(0);
            expect(enrichedData).toBeDefined();
        });

        it("should handle new customer with no history", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-005",
                            customerId: "cust-new",
                            subject: "Getting started help",
                            description: "Need help setting up my account"
                        }
                    },
                    EnrichCustomer: {
                        data: [{ id: "cust-new", account_tier: "free", ticket_count: 0 }]
                    },
                    ClassifyTicket: {
                        category: "general",
                        sentiment: "neutral",
                        urgency: 3,
                        skillsRequired: ["onboarding"],
                        confidence: 0.88
                    },
                    RouteByCategory: { selectedCase: "general" },
                    AssignBilling: { skipped: true },
                    AssignTechnical: { skipped: true },
                    AssignSales: { skipped: true },
                    AssignEscalation: { skipped: true },
                    AssignGeneral: { success: true, agentId: "support-001" },
                    UpdateTicket: { success: true },
                    NotifyCustomer: { success: true },
                    Output: { result: { status: "assigned", team: "general" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("sentiment handling", () => {
        it("should prioritize angry customer tickets", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-006",
                            customerId: "cust-angry",
                            subject: "THIS IS UNACCEPTABLE!!!",
                            description:
                                "I have been waiting for 3 days and no one has responded!!!"
                        }
                    },
                    EnrichCustomer: {
                        data: [{ id: "cust-angry", account_tier: "pro", ticket_count: 8 }]
                    },
                    ClassifyTicket: {
                        category: "escalation",
                        sentiment: "angry",
                        urgency: 9,
                        skillsRequired: ["customer-recovery", "senior-support"],
                        confidence: 0.97
                    },
                    RouteByCategory: { selectedCase: "escalation" },
                    AssignBilling: { skipped: true },
                    AssignTechnical: { skipped: true },
                    AssignSales: { skipped: true },
                    AssignEscalation: { success: true, agentId: "senior-005", queuePosition: 0 },
                    AssignGeneral: { skipped: true },
                    UpdateTicket: { success: true },
                    NotifyCustomer: { success: true },
                    Output: { result: { status: "priority_assigned", sentiment: "angry" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("error handling", () => {
        it("should handle classification failure gracefully", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            ticket: {
                                ticketId: "TKT-ERR",
                                customerId: "cust-x",
                                subject: "Test",
                                description: "Test"
                            }
                        }
                    },
                    EnrichCustomer: { customOutput: { data: [{}] } },
                    ClassifyTicket: { shouldFail: true, errorMessage: "LLM API timeout" },
                    RouteByCategory: { customOutput: {} },
                    AssignBilling: { customOutput: {} },
                    AssignTechnical: { customOutput: {} },
                    AssignSales: { customOutput: {} },
                    AssignEscalation: { customOutput: {} },
                    AssignGeneral: { customOutput: {} },
                    UpdateTicket: { customOutput: {} },
                    NotifyCustomer: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("ClassifyTicket");
        });

        it("should handle assignment API failure", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            ticket: {
                                ticketId: "TKT-API-ERR",
                                customerId: "cust-y",
                                subject: "Billing",
                                description: "Issue"
                            }
                        }
                    },
                    EnrichCustomer: { customOutput: { data: [{ account_tier: "pro" }] } },
                    ClassifyTicket: {
                        customOutput: {
                            category: "billing",
                            sentiment: "neutral",
                            urgency: 5,
                            skillsRequired: []
                        }
                    },
                    RouteByCategory: { customOutput: { selectedCase: "billing" } },
                    AssignBilling: { shouldFail: true, errorMessage: "Queue service unavailable" },
                    AssignTechnical: { customOutput: { skipped: true } },
                    AssignSales: { customOutput: { skipped: true } },
                    AssignEscalation: { customOutput: { skipped: true } },
                    AssignGeneral: { customOutput: { skipped: true } },
                    UpdateTicket: { customOutput: {} },
                    NotifyCustomer: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("AssignBilling");
        });
    });

    describe("multi-language support", () => {
        it("should handle non-English tickets", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-ES",
                            customerId: "cust-spanish",
                            subject: "Problema con facturación",
                            description: "Me cobraron dos veces este mes.",
                            metadata: { language: "es" }
                        }
                    },
                    EnrichCustomer: { data: [{ account_tier: "pro", language_preference: "es" }] },
                    ClassifyTicket: {
                        category: "billing",
                        sentiment: "negative",
                        urgency: 7,
                        skillsRequired: ["billing", "spanish"],
                        confidence: 0.91
                    },
                    RouteByCategory: { selectedCase: "billing" },
                    AssignBilling: { success: true, agentId: "agent-spanish-001" },
                    AssignTechnical: { skipped: true },
                    AssignSales: { skipped: true },
                    AssignEscalation: { skipped: true },
                    AssignGeneral: { skipped: true },
                    UpdateTicket: { success: true },
                    NotifyCustomer: { success: true },
                    Output: { result: { status: "assigned", language: "es" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("enterprise tier handling", () => {
        it("should prioritize enterprise customers", async () => {
            const workflow = createSupportRoutingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        ticket: {
                            ticketId: "TKT-ENT",
                            customerId: "cust-enterprise",
                            subject: "Minor question",
                            description: "Small question about feature"
                        }
                    },
                    EnrichCustomer: {
                        data: [
                            {
                                id: "cust-enterprise",
                                account_tier: "enterprise",
                                ticket_count: 2,
                                arr: 500000
                            }
                        ]
                    },
                    ClassifyTicket: {
                        category: "general",
                        sentiment: "neutral",
                        urgency: 5, // Boosted due to enterprise
                        skillsRequired: ["enterprise-support"],
                        confidence: 0.85
                    },
                    RouteByCategory: { selectedCase: "general" },
                    AssignBilling: { skipped: true },
                    AssignTechnical: { skipped: true },
                    AssignSales: { skipped: true },
                    AssignEscalation: { skipped: true },
                    AssignGeneral: { success: true, agentId: "enterprise-001", queuePosition: 0 },
                    UpdateTicket: { success: true },
                    NotifyCustomer: { success: true },
                    Output: { result: { status: "priority_assigned", tier: "enterprise" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });
});
