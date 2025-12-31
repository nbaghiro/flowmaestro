/**
 * Multi-Step Approval Workflow Tests
 *
 * Tests a realistic multi-step approval pipeline:
 * Trigger → Loop[Wait (approval) → Conditional (approved?)] → Final action
 *
 * Simulates a common enterprise approval workflow with multiple approvers.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

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

// Types for approval workflow
interface ApprovalRequest {
    requestId: string;
    requestType: "expense" | "leave" | "purchase" | "access" | "document";
    requesterId: string;
    requesterName: string;
    amount?: number;
    description: string;
    priority: "low" | "normal" | "high" | "urgent";
    approvers: Approver[];
    metadata?: Record<string, unknown>;
    createdAt: number;
}

interface Approver {
    id: string;
    name: string;
    email: string;
    role: "manager" | "director" | "vp" | "cfo" | "ceo";
    level: number;
}

interface ApprovalDecision {
    approverId: string;
    approverName: string;
    decision: "approved" | "rejected" | "delegated";
    comments?: string;
    timestamp: number;
    delegatedTo?: string;
}

interface ApprovalResult {
    requestId: string;
    finalStatus: "approved" | "rejected" | "pending" | "timeout" | "cancelled";
    decisions: ApprovalDecision[];
    completedSteps: number;
    totalSteps: number;
    completedAt?: number;
    duration: number;
}

// Build approval workflow
function buildApprovalWorkflow(approverCount: number): {
    nodes: Map<string, TestNode>;
    edges: TestEdge[];
    executionLevels: string[][];
} {
    const nodes = new Map<string, TestNode>();

    nodes.set("Trigger", {
        id: "Trigger",
        type: "trigger",
        config: { triggerType: "form" },
        dependencies: []
    });

    nodes.set("InitializeApproval", {
        id: "InitializeApproval",
        type: "transform",
        config: {
            operation: "initialize",
            setVariables: ["currentStep", "decisions"]
        },
        dependencies: ["Trigger"]
    });

    nodes.set("ApprovalLoop", {
        id: "ApprovalLoop",
        type: "loop",
        config: {
            iterateOver: "{{Trigger.approvers}}",
            maxIterations: approverCount
        },
        dependencies: ["InitializeApproval"]
    });

    nodes.set("WaitForApproval", {
        id: "WaitForApproval",
        type: "wait",
        config: {
            waitType: "human-input",
            timeout: 86400000, // 24 hours
            notifyApprover: true
        },
        dependencies: ["ApprovalLoop"]
    });

    nodes.set("CheckDecision", {
        id: "CheckDecision",
        type: "conditional",
        config: {
            condition: "{{WaitForApproval.decision}} == 'approved'"
        },
        dependencies: ["WaitForApproval"]
    });

    nodes.set("RecordApproval", {
        id: "RecordApproval",
        type: "transform",
        config: {
            operation: "append",
            target: "decisions"
        },
        dependencies: ["CheckDecision"]
    });

    nodes.set("HandleRejection", {
        id: "HandleRejection",
        type: "transform",
        config: {
            operation: "setStatus",
            status: "rejected"
        },
        dependencies: ["CheckDecision"]
    });

    nodes.set("FinalAction", {
        id: "FinalAction",
        type: "conditional",
        config: {
            branches: ["approved", "rejected"]
        },
        dependencies: ["ApprovalLoop"]
    });

    nodes.set("ExecuteApproved", {
        id: "ExecuteApproved",
        type: "integration",
        config: {
            operation: "execute-request"
        },
        dependencies: ["FinalAction"]
    });

    nodes.set("NotifyRejection", {
        id: "NotifyRejection",
        type: "integration",
        config: {
            operation: "notify-rejection"
        },
        dependencies: ["FinalAction"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        config: {},
        dependencies: ["ExecuteApproved", "NotifyRejection"]
    });

    const edges: TestEdge[] = [
        { id: "e1", source: "Trigger", target: "InitializeApproval", type: "default" },
        { id: "e2", source: "InitializeApproval", target: "ApprovalLoop", type: "default" },
        { id: "e3", source: "ApprovalLoop", target: "WaitForApproval", type: "loop-body" },
        { id: "e4", source: "WaitForApproval", target: "CheckDecision", type: "default" },
        {
            id: "e5",
            source: "CheckDecision",
            target: "RecordApproval",
            type: "conditional",
            handleType: "true"
        },
        {
            id: "e6",
            source: "CheckDecision",
            target: "HandleRejection",
            type: "conditional",
            handleType: "false"
        },
        { id: "e7", source: "RecordApproval", target: "ApprovalLoop", type: "loop-back" },
        { id: "e8", source: "HandleRejection", target: "FinalAction", type: "break" },
        { id: "e9", source: "ApprovalLoop", target: "FinalAction", type: "loop-complete" },
        {
            id: "e10",
            source: "FinalAction",
            target: "ExecuteApproved",
            type: "conditional",
            handleType: "approved"
        },
        {
            id: "e11",
            source: "FinalAction",
            target: "NotifyRejection",
            type: "conditional",
            handleType: "rejected"
        },
        { id: "e12", source: "ExecuteApproved", target: "Output", type: "default" },
        { id: "e13", source: "NotifyRejection", target: "Output", type: "default" }
    ];

    const executionLevels = [
        ["Trigger"],
        ["InitializeApproval"],
        ["ApprovalLoop"],
        ["FinalAction"],
        ["ExecuteApproved", "NotifyRejection"],
        ["Output"]
    ];

    return { nodes, edges, executionLevels };
}

// Create mock approvers
function createApprovers(count: number, roles?: Approver["role"][]): Approver[] {
    const defaultRoles: Approver["role"][] = ["manager", "director", "vp", "cfo", "ceo"];
    const rolesToUse = roles || defaultRoles.slice(0, count);

    return rolesToUse.map((role, i) => ({
        id: `approver_${i + 1}`,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${i + 1}`,
        email: `${role}${i + 1}@company.com`,
        role,
        level: i + 1
    }));
}

// Helper to convert interface to JsonObject
function toJsonObject<T extends object>(obj: T): JsonObject {
    return JSON.parse(JSON.stringify(obj)) as JsonObject;
}

// Simulate approval workflow
async function simulateApprovalWorkflow(
    request: ApprovalRequest,
    decisions: Map<string, ApprovalDecision>,
    options: {
        timeoutOnApprover?: string;
        cancelAfterStep?: number;
    } = {}
): Promise<{
    context: ContextSnapshot;
    result: ApprovalResult;
    stepsCompleted: number;
    path: "approved" | "rejected" | "timeout" | "cancelled";
}> {
    // Build workflow for reference (not directly used in mock simulation)
    void buildApprovalWorkflow(request.approvers.length);
    let context = createContext(toJsonObject(request));
    const startTime = Date.now();
    const recordedDecisions: ApprovalDecision[] = [];
    let stepsCompleted = 0;
    let path: "approved" | "rejected" | "timeout" | "cancelled" = "approved";

    // Execute Trigger
    context = storeNodeOutput(context, "Trigger", toJsonObject(request));

    // Execute InitializeApproval
    context = storeNodeOutput(context, "InitializeApproval", {
        currentStep: 0,
        decisions: [],
        status: "pending"
    });

    // Execute ApprovalLoop
    for (let i = 0; i < request.approvers.length; i++) {
        const approver = request.approvers[i];

        // Check for cancellation
        if (options.cancelAfterStep !== undefined && i >= options.cancelAfterStep) {
            path = "cancelled";
            break;
        }

        // Check for timeout
        if (options.timeoutOnApprover === approver.id) {
            path = "timeout";
            context = storeNodeOutput(context, `WaitForApproval_${i}`, {
                timedOut: true,
                approverId: approver.id
            });
            break;
        }

        // Get decision for this approver
        const decision = decisions.get(approver.id);

        if (!decision) {
            // No decision provided, simulate pending
            path = "timeout";
            break;
        }

        // Execute WaitForApproval
        context = storeNodeOutput(context, `WaitForApproval_${i}`, {
            approverId: approver.id,
            decision: decision.decision,
            comments: decision.comments ?? null,
            timestamp: decision.timestamp
        });

        // Execute CheckDecision
        const isApproved = decision.decision === "approved";
        context = storeNodeOutput(context, `CheckDecision_${i}`, {
            condition: "decision == 'approved'",
            result: isApproved
        });

        if (isApproved) {
            // Execute RecordApproval
            recordedDecisions.push(decision);
            context = storeNodeOutput(context, `RecordApproval_${i}`, {
                decision: toJsonObject(decision),
                totalApprovals: recordedDecisions.length
            });
            stepsCompleted++;
        } else {
            // Execute HandleRejection
            context = storeNodeOutput(context, `HandleRejection_${i}`, {
                rejectedBy: approver.id,
                reason: decision.comments ?? null
            });
            path = "rejected";
            stepsCompleted++;
            break;
        }
    }

    // Store loop results
    context = storeNodeOutput(context, "ApprovalLoop", {
        iterations: stepsCompleted,
        completed: path === "approved",
        decisions: recordedDecisions.map((d) => toJsonObject(d))
    });

    // Execute FinalAction
    const finalStatus =
        path === "approved"
            ? "approved"
            : path === "rejected"
              ? "rejected"
              : path === "timeout"
                ? "timeout"
                : "cancelled";

    context = storeNodeOutput(context, "FinalAction", {
        status: finalStatus,
        path
    });

    // Execute appropriate final node
    if (path === "approved") {
        context = storeNodeOutput(context, "ExecuteApproved", {
            executed: true,
            requestId: request.requestId,
            executedAt: Date.now()
        });
    } else {
        context = storeNodeOutput(context, "NotifyRejection", {
            notified: true,
            requestId: request.requestId,
            status: finalStatus,
            notifiedAt: Date.now()
        });
    }

    // Execute Output
    const duration = Date.now() - startTime;
    const result: ApprovalResult = {
        requestId: request.requestId,
        finalStatus,
        decisions: recordedDecisions,
        completedSteps: stepsCompleted,
        totalSteps: request.approvers.length,
        completedAt: Date.now(),
        duration
    };

    context = storeNodeOutput(context, "Output", toJsonObject(result));

    return { context, result, stepsCompleted, path };
}

describe("Multi-Step Approval Workflow", () => {
    describe("approval granted path", () => {
        it("should complete when all approvers approve", async () => {
            const approvers = createApprovers(3, ["manager", "director", "vp"]);
            const request: ApprovalRequest = {
                requestId: "req_001",
                requestType: "expense",
                requesterId: "user_123",
                requesterName: "John Doe",
                amount: 5000,
                description: "Conference travel",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            approvers.forEach((approver) => {
                decisions.set(approver.id, {
                    approverId: approver.id,
                    approverName: approver.name,
                    decision: "approved",
                    timestamp: Date.now()
                });
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.path).toBe("approved");
            expect(result.result.finalStatus).toBe("approved");
            expect(result.stepsCompleted).toBe(3);
        });

        it("should record all approval decisions", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_002",
                requestType: "leave",
                requesterId: "user_456",
                requesterName: "Jane Smith",
                description: "Vacation request",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                comments: "Looks good",
                timestamp: Date.now()
            });
            decisions.set("approver_2", {
                approverId: "approver_2",
                approverName: "Director 2",
                decision: "approved",
                comments: "Approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.result.decisions.length).toBe(2);
            expect(result.result.decisions[0].comments).toBe("Looks good");
        });

        it("should execute approved action at end", async () => {
            const approvers = createApprovers(1);
            const request: ApprovalRequest = {
                requestId: "req_003",
                requestType: "purchase",
                requesterId: "user_789",
                requesterName: "Bob Wilson",
                amount: 1000,
                description: "Office supplies",
                priority: "low",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            const executeOutput = result.context.nodeOutputs.get("ExecuteApproved");
            expect(executeOutput).toBeDefined();
            expect((executeOutput as { executed: boolean }).executed).toBe(true);
        });
    });

    describe("approval denied path", () => {
        it("should stop workflow when approver rejects", async () => {
            const approvers = createApprovers(3);
            const request: ApprovalRequest = {
                requestId: "req_004",
                requestType: "expense",
                requesterId: "user_111",
                requesterName: "Alice Brown",
                amount: 50000,
                description: "Team offsite",
                priority: "high",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });
            decisions.set("approver_2", {
                approverId: "approver_2",
                approverName: "Director 2",
                decision: "rejected",
                comments: "Budget exceeded",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.path).toBe("rejected");
            expect(result.stepsCompleted).toBe(2);
            expect(result.result.finalStatus).toBe("rejected");
        });

        it("should reject immediately on first rejection", async () => {
            const approvers = createApprovers(5);
            const request: ApprovalRequest = {
                requestId: "req_005",
                requestType: "access",
                requesterId: "user_222",
                requesterName: "Charlie Davis",
                description: "Production access",
                priority: "urgent",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "rejected",
                comments: "Not authorized",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.stepsCompleted).toBe(1);
            expect(result.result.totalSteps).toBe(5);
        });

        it("should preserve rejection reason", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_006",
                requestType: "document",
                requesterId: "user_333",
                requesterName: "Diana Evans",
                description: "Contract approval",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "rejected",
                comments: "Missing signatures on page 5",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            const rejectionNode = result.context.nodeOutputs.get("HandleRejection_0") as {
                reason: string;
            };
            expect(rejectionNode.reason).toBe("Missing signatures on page 5");
        });

        it("should send rejection notification", async () => {
            const approvers = createApprovers(1);
            const request: ApprovalRequest = {
                requestId: "req_007",
                requestType: "expense",
                requesterId: "user_444",
                requesterName: "Eve Foster",
                amount: 100,
                description: "Lunch meeting",
                priority: "low",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "rejected",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            const notifyOutput = result.context.nodeOutputs.get("NotifyRejection");
            expect(notifyOutput).toBeDefined();
            expect((notifyOutput as { notified: boolean }).notified).toBe(true);
        });
    });

    describe("multiple approvers", () => {
        it("should handle single approver", async () => {
            const approvers = createApprovers(1);
            const request: ApprovalRequest = {
                requestId: "req_008",
                requestType: "leave",
                requesterId: "user_555",
                requesterName: "Frank Green",
                description: "Sick leave",
                priority: "high",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.stepsCompleted).toBe(1);
            expect(result.result.totalSteps).toBe(1);
        });

        it("should handle five approvers", async () => {
            const approvers = createApprovers(5);
            const request: ApprovalRequest = {
                requestId: "req_009",
                requestType: "purchase",
                requesterId: "user_666",
                requesterName: "Grace Hill",
                amount: 1000000,
                description: "Enterprise software license",
                priority: "urgent",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            approvers.forEach((approver) => {
                decisions.set(approver.id, {
                    approverId: approver.id,
                    approverName: approver.name,
                    decision: "approved",
                    timestamp: Date.now()
                });
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.stepsCompleted).toBe(5);
            expect(result.result.decisions.length).toBe(5);
        });

        it("should respect approver order", async () => {
            const approvers = createApprovers(3, ["manager", "director", "ceo"]);
            const request: ApprovalRequest = {
                requestId: "req_010",
                requestType: "expense",
                requesterId: "user_777",
                requesterName: "Henry Irving",
                amount: 10000,
                description: "Training program",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            const timestamps: number[] = [];
            approvers.forEach((approver, i) => {
                const timestamp = Date.now() + i * 1000;
                timestamps.push(timestamp);
                decisions.set(approver.id, {
                    approverId: approver.id,
                    approverName: approver.name,
                    decision: "approved",
                    timestamp
                });
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            // Verify order matches
            expect(result.result.decisions[0].approverId).toBe("approver_1");
            expect(result.result.decisions[1].approverId).toBe("approver_2");
            expect(result.result.decisions[2].approverId).toBe("approver_3");
        });
    });

    describe("timeout waiting for approval", () => {
        it("should timeout when approver doesn't respond", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_011",
                requestType: "access",
                requesterId: "user_888",
                requesterName: "Ivy Johnson",
                description: "Database access",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });
            // No decision for approver_2

            const result = await simulateApprovalWorkflow(request, decisions, {
                timeoutOnApprover: "approver_2"
            });

            expect(result.path).toBe("timeout");
            expect(result.result.finalStatus).toBe("timeout");
        });

        it("should timeout on first approver if no response", async () => {
            const approvers = createApprovers(3);
            const request: ApprovalRequest = {
                requestId: "req_012",
                requestType: "document",
                requesterId: "user_999",
                requesterName: "Jack King",
                description: "Legal review",
                priority: "high",
                approvers,
                createdAt: Date.now()
            };

            const result = await simulateApprovalWorkflow(request, new Map(), {
                timeoutOnApprover: "approver_1"
            });

            expect(result.path).toBe("timeout");
            expect(result.stepsCompleted).toBe(0);
        });

        it("should preserve completed approvals before timeout", async () => {
            const approvers = createApprovers(3);
            const request: ApprovalRequest = {
                requestId: "req_013",
                requestType: "expense",
                requesterId: "user_101",
                requesterName: "Kelly Lane",
                amount: 2000,
                description: "Equipment",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });
            decisions.set("approver_2", {
                approverId: "approver_2",
                approverName: "Director 2",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions, {
                timeoutOnApprover: "approver_3"
            });

            expect(result.result.decisions.length).toBe(2);
            expect(result.result.completedSteps).toBe(2);
        });
    });

    describe("cancellation handling", () => {
        it("should cancel workflow mid-approval", async () => {
            const approvers = createApprovers(3);
            const request: ApprovalRequest = {
                requestId: "req_014",
                requestType: "leave",
                requesterId: "user_102",
                requesterName: "Larry Moore",
                description: "Vacation",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions, {
                cancelAfterStep: 1
            });

            expect(result.path).toBe("cancelled");
            expect(result.stepsCompleted).toBe(1);
        });

        it("should cancel before any approval", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_015",
                requestType: "purchase",
                requesterId: "user_103",
                requesterName: "Mary Nelson",
                amount: 500,
                description: "Cancelled purchase",
                priority: "low",
                approvers,
                createdAt: Date.now()
            };

            const result = await simulateApprovalWorkflow(request, new Map(), {
                cancelAfterStep: 0
            });

            expect(result.path).toBe("cancelled");
            expect(result.stepsCompleted).toBe(0);
        });
    });

    describe("approval request types", () => {
        it("should handle expense requests", async () => {
            const request: ApprovalRequest = {
                requestId: "req_exp_001",
                requestType: "expense",
                requesterId: "user_exp",
                requesterName: "Expense User",
                amount: 1500,
                description: "Client dinner",
                priority: "normal",
                approvers: createApprovers(1),
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.result.requestId).toBe("req_exp_001");
            expect(result.path).toBe("approved");
        });

        it("should handle leave requests", async () => {
            const request: ApprovalRequest = {
                requestId: "req_leave_001",
                requestType: "leave",
                requesterId: "user_leave",
                requesterName: "Leave User",
                description: "Annual leave - 5 days",
                priority: "normal",
                approvers: createApprovers(1),
                metadata: { days: 5, startDate: "2024-06-01" },
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.path).toBe("approved");
        });

        it("should handle access requests", async () => {
            const request: ApprovalRequest = {
                requestId: "req_access_001",
                requestType: "access",
                requesterId: "user_access",
                requesterName: "Access User",
                description: "Admin panel access",
                priority: "high",
                approvers: createApprovers(2, ["manager", "director"]),
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });
            decisions.set("approver_2", {
                approverId: "approver_2",
                approverName: "Director 2",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.path).toBe("approved");
            expect(result.stepsCompleted).toBe(2);
        });
    });

    describe("approval with comments", () => {
        it("should preserve approver comments", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_016",
                requestType: "expense",
                requesterId: "user_104",
                requesterName: "Nancy Owens",
                amount: 3000,
                description: "Conference registration",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                comments: "Great opportunity for learning",
                timestamp: Date.now()
            });
            decisions.set("approver_2", {
                approverId: "approver_2",
                approverName: "Director 2",
                decision: "approved",
                comments: "Approved within budget",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.result.decisions[0].comments).toBe("Great opportunity for learning");
            expect(result.result.decisions[1].comments).toBe("Approved within budget");
        });

        it("should handle approval without comments", async () => {
            const approvers = createApprovers(1);
            const request: ApprovalRequest = {
                requestId: "req_017",
                requestType: "leave",
                requesterId: "user_105",
                requesterName: "Oscar Parker",
                description: "Personal day",
                priority: "low",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.result.decisions[0].comments).toBeUndefined();
        });
    });

    describe("workflow timing", () => {
        it("should track total duration", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_018",
                requestType: "purchase",
                requesterId: "user_106",
                requesterName: "Paula Quinn",
                amount: 800,
                description: "Software license",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            approvers.forEach((approver) => {
                decisions.set(approver.id, {
                    approverId: approver.id,
                    approverName: approver.name,
                    decision: "approved",
                    timestamp: Date.now()
                });
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.result.duration).toBeGreaterThanOrEqual(0);
            expect(result.result.completedAt).toBeDefined();
        });

        it("should complete quickly with mock approvals", async () => {
            const approvers = createApprovers(5);
            const request: ApprovalRequest = {
                requestId: "req_019",
                requestType: "expense",
                requesterId: "user_107",
                requesterName: "Quinn Roberts",
                amount: 25000,
                description: "Team building event",
                priority: "high",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            approvers.forEach((approver) => {
                decisions.set(approver.id, {
                    approverId: approver.id,
                    approverName: approver.name,
                    decision: "approved",
                    timestamp: Date.now()
                });
            });

            const startTime = Date.now();
            await simulateApprovalWorkflow(request, decisions);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100);
        });
    });

    describe("output summary", () => {
        it("should generate complete approval summary", async () => {
            const approvers = createApprovers(2);
            const request: ApprovalRequest = {
                requestId: "req_020",
                requestType: "document",
                requesterId: "user_108",
                requesterName: "Rachel Stevens",
                description: "Contract review",
                priority: "urgent",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            approvers.forEach((approver) => {
                decisions.set(approver.id, {
                    approverId: approver.id,
                    approverName: approver.name,
                    decision: "approved",
                    timestamp: Date.now()
                });
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            expect(result.result).toMatchObject({
                requestId: "req_020",
                finalStatus: "approved",
                completedSteps: 2,
                totalSteps: 2
            });
            expect(result.result.decisions.length).toBe(2);
            expect(result.result.duration).toBeGreaterThanOrEqual(0);
        });

        it("should output to Output node", async () => {
            const approvers = createApprovers(1);
            const request: ApprovalRequest = {
                requestId: "req_021",
                requestType: "leave",
                requesterId: "user_109",
                requesterName: "Steve Thomas",
                description: "Remote work",
                priority: "normal",
                approvers,
                createdAt: Date.now()
            };

            const decisions = new Map<string, ApprovalDecision>();
            decisions.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const result = await simulateApprovalWorkflow(request, decisions);

            const outputNode = result.context.nodeOutputs.get(
                "Output"
            ) as unknown as ApprovalResult;
            expect(outputNode.requestId).toBe("req_021");
            expect(outputNode.finalStatus).toBe("approved");
        });
    });

    describe("concurrent approval workflows", () => {
        it("should handle multiple concurrent approval requests", async () => {
            const requests = Array.from({ length: 5 }, (_, i) => ({
                requestId: `concurrent_${i}`,
                requestType: "expense" as const,
                requesterId: `user_c${i}`,
                requesterName: `User ${i}`,
                amount: 1000 * (i + 1),
                description: `Request ${i}`,
                priority: "normal" as const,
                approvers: createApprovers(1),
                createdAt: Date.now()
            }));

            const results = await Promise.all(
                requests.map((request) => {
                    const decisions = new Map<string, ApprovalDecision>();
                    decisions.set("approver_1", {
                        approverId: "approver_1",
                        approverName: "Manager 1",
                        decision: "approved",
                        timestamp: Date.now()
                    });
                    return simulateApprovalWorkflow(request, decisions);
                })
            );

            expect(results.length).toBe(5);
            results.forEach((result, i) => {
                expect(result.result.requestId).toBe(`concurrent_${i}`);
                expect(result.path).toBe("approved");
            });
        });

        it("should maintain isolation between concurrent workflows", async () => {
            const request1: ApprovalRequest = {
                requestId: "isolated_1",
                requestType: "expense",
                requesterId: "user_iso1",
                requesterName: "Isolated 1",
                amount: 100,
                description: "Request 1",
                priority: "normal",
                approvers: createApprovers(1),
                createdAt: Date.now()
            };

            const request2: ApprovalRequest = {
                requestId: "isolated_2",
                requestType: "leave",
                requesterId: "user_iso2",
                requesterName: "Isolated 2",
                description: "Request 2",
                priority: "high",
                approvers: createApprovers(2),
                createdAt: Date.now()
            };

            const decisions1 = new Map<string, ApprovalDecision>();
            decisions1.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "approved",
                timestamp: Date.now()
            });

            const decisions2 = new Map<string, ApprovalDecision>();
            decisions2.set("approver_1", {
                approverId: "approver_1",
                approverName: "Manager 1",
                decision: "rejected",
                comments: "Denied",
                timestamp: Date.now()
            });

            const [result1, result2] = await Promise.all([
                simulateApprovalWorkflow(request1, decisions1),
                simulateApprovalWorkflow(request2, decisions2)
            ]);

            expect(result1.path).toBe("approved");
            expect(result2.path).toBe("rejected");
            expect(result1.result.requestId).toBe("isolated_1");
            expect(result2.result.requestId).toBe("isolated_2");
        });
    });
});
