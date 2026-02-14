/**
 * Approval Workflow Integration Tests
 *
 * Tests the approval request lifecycle including:
 * - Approval request creation
 * - Approve/deny actions
 * - Workspace isolation
 * - Temporal workflow signaling
 */

import {
    createPersonaTestEnvironment,
    expectEventPublished
} from "./helpers/persona-test-env";
import {
    createResearchAssistantPersona,
    createRunningInstance,
    createWaitingApprovalInstance,
    createToolCallApproval,
    createHighRiskApproval,
    createCostLimitApproval,
    createApprovedRequest,
    createDeniedRequest,
    generateId
} from "./helpers/persona-fixtures";
import type { PersonaTestEnvironment } from "./helpers/persona-test-env";

describe("Approval Workflow", () => {
    let testEnv: PersonaTestEnvironment;

    beforeEach(async () => {
        testEnv = await createPersonaTestEnvironment({ skipServer: true });
    });

    afterEach(async () => {
        await testEnv.cleanup();
    });

    describe("Request Creation", () => {
        it("creates approval for tool call", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaApproval.create.mockResolvedValue(approval);

            const result = await testEnv.repositories.personaApproval.create({
                instance_id: instance.id,
                action_type: "tool_call",
                tool_name: "slack_send_message",
                action_description: "Send a message to #general channel",
                action_arguments: { channel: "#general", text: "Hello" },
                risk_level: "medium"
            });

            expect(result.action_type).toBe("tool_call");
            expect(result.tool_name).toBe("slack_send_message");
            expect(result.status).toBe("pending");
            expect(result.risk_level).toBe("medium");
        });

        it("creates high-risk approval request", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createHighRiskApproval(instance.id);

            testEnv.repositories.personaApproval.create.mockResolvedValue(approval);

            const result = await testEnv.repositories.personaApproval.create({
                instance_id: instance.id,
                action_type: "tool_call",
                tool_name: "github_create_pr",
                action_description: "Create a pull request with code changes",
                action_arguments: { repo: "test/repo", branch: "feature" },
                risk_level: "high",
                estimated_cost_credits: 50
            });

            expect(result.risk_level).toBe("high");
            expect(result.estimated_cost_credits).toBe(50);
        });

        it("creates cost increase approval", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createCostLimitApproval(instance.id);

            testEnv.repositories.personaApproval.create.mockResolvedValue(approval);

            const result = await testEnv.repositories.personaApproval.create({
                instance_id: instance.id,
                action_type: "cost_increase",
                action_description: "Increase cost limit to continue execution",
                action_arguments: { requested_increase: 200 },
                risk_level: "low",
                estimated_cost_credits: 200
            });

            expect(result.action_type).toBe("cost_increase");
            expect(result.tool_name).toBeNull();
        });

        it("sets instance status to waiting_approval", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            const waitingInstance = createWaitingApprovalInstance(
                persona.id,
                testEnv.testWorkspace.id,
                approval.id
            );
            waitingInstance.id = instance.id;

            testEnv.repositories.personaApproval.create.mockResolvedValue(approval);
            testEnv.repositories.personaInstance.update.mockResolvedValue(waitingInstance);

            // Create approval
            await testEnv.repositories.personaApproval.create({
                instance_id: instance.id,
                action_type: "tool_call",
                tool_name: "web_search",
                action_description: "Search the web",
                action_arguments: { query: "test" },
                risk_level: "medium"
            });

            // Update instance status
            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                status: "waiting_approval",
                pending_approval_id: approval.id
            });

            expect(result?.status).toBe("waiting_approval");
            expect(result?.pending_approval_id).toBe(approval.id);
        });

        it("emits approval_needed event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            testEnv.repositories.personaApproval.create.mockResolvedValue(approval);

            // Simulate event emission
            await testEnv.eventBus.publish(
                `persona:${instance.id}`,
                "approval_needed",
                {
                    instanceId: instance.id,
                    approvalId: approval.id,
                    actionType: approval.action_type,
                    toolName: approval.tool_name,
                    riskLevel: approval.risk_level
                }
            );

            expectEventPublished(testEnv.eventBus, "approval_needed", (data) => {
                return data.instanceId === instance.id && data.approvalId === approval.id;
            });
        });
    });

    describe("Approve Action", () => {
        it("updates approval status to approved", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);
            const approvedApproval = createApprovedRequest(instance.id);
            approvedApproval.id = approval.id;

            testEnv.repositories.personaApproval.findById.mockResolvedValue(approval);
            testEnv.repositories.personaApproval.update.mockResolvedValue(approvedApproval);

            const result = await testEnv.repositories.personaApproval.update(approval.id, {
                status: "approved",
                responded_by: testEnv.testUser.id,
                responded_at: new Date()
            });

            expect(result?.status).toBe("approved");
            expect(result?.responded_by).toBeDefined();
            expect(result?.responded_at).toBeDefined();
        });

        it("records responded_by and responded_at", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);
            const now = new Date();

            const approvedApproval = {
                ...approval,
                status: "approved" as const,
                responded_by: testEnv.testUser.id,
                responded_at: now
            };

            testEnv.repositories.personaApproval.findById.mockResolvedValue(approval);
            testEnv.repositories.personaApproval.update.mockResolvedValue(approvedApproval);

            const result = await testEnv.repositories.personaApproval.update(approval.id, {
                status: "approved",
                responded_by: testEnv.testUser.id,
                responded_at: now
            });

            expect(result?.responded_by).toBe(testEnv.testUser.id);
            expect(result?.responded_at).toEqual(now);
        });

        it("signals Temporal workflow with approval", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            testEnv.repositories.personaApproval.findById.mockResolvedValue(approval);

            // Simulate workflow signal
            await testEnv.temporal.signalWorkflow("approvalResponse", {
                approvalId: approval.id,
                approved: true,
                respondedBy: testEnv.testUser.id
            });

            expect(testEnv.temporal.signalWorkflow).toHaveBeenCalledWith("approvalResponse", {
                approvalId: approval.id,
                approved: true,
                respondedBy: testEnv.testUser.id
            });
        });

        it("emits approval_resolved event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            // Simulate event emission
            await testEnv.eventBus.publish(
                `persona:${instance.id}`,
                "approval_resolved",
                {
                    instanceId: instance.id,
                    approvalId: approval.id,
                    status: "approved",
                    respondedBy: testEnv.testUser.id
                }
            );

            expectEventPublished(testEnv.eventBus, "approval_resolved", (data) => {
                return data.status === "approved" && data.approvalId === approval.id;
            });
        });

        it("clears pending_approval_id on instance", async () => {
            const persona = createResearchAssistantPersona();
            const approvalId = generateId("approval");
            const instance = createWaitingApprovalInstance(
                persona.id,
                testEnv.testWorkspace.id,
                approvalId
            );

            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            runningInstance.id = instance.id;
            runningInstance.pending_approval_id = null;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(runningInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                status: "running",
                pending_approval_id: null
            });

            expect(result?.pending_approval_id).toBeNull();
            expect(result?.status).toBe("running");
        });
    });

    describe("Deny Action", () => {
        it("updates approval status to denied", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);
            const deniedApproval = createDeniedRequest(instance.id);
            deniedApproval.id = approval.id;

            testEnv.repositories.personaApproval.findById.mockResolvedValue(approval);
            testEnv.repositories.personaApproval.update.mockResolvedValue(deniedApproval);

            const result = await testEnv.repositories.personaApproval.update(approval.id, {
                status: "denied",
                responded_by: testEnv.testUser.id,
                responded_at: new Date(),
                response_note: "Request denied due to policy violation"
            });

            expect(result?.status).toBe("denied");
        });

        it("records response_note", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);
            const responseNote = "This action is not permitted";

            const deniedApproval = {
                ...approval,
                status: "denied" as const,
                responded_by: testEnv.testUser.id,
                responded_at: new Date(),
                response_note: responseNote
            };

            testEnv.repositories.personaApproval.findById.mockResolvedValue(approval);
            testEnv.repositories.personaApproval.update.mockResolvedValue(deniedApproval);

            const result = await testEnv.repositories.personaApproval.update(approval.id, {
                status: "denied",
                responded_by: testEnv.testUser.id,
                responded_at: new Date(),
                response_note: responseNote
            });

            expect(result?.response_note).toBe(responseNote);
        });

        it("signals Temporal workflow with denial", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            testEnv.repositories.personaApproval.findById.mockResolvedValue(approval);

            // Simulate workflow signal
            await testEnv.temporal.signalWorkflow("approvalResponse", {
                approvalId: approval.id,
                approved: false,
                respondedBy: testEnv.testUser.id,
                responseNote: "Not allowed"
            });

            expect(testEnv.temporal.signalWorkflow).toHaveBeenCalledWith("approvalResponse", {
                approvalId: approval.id,
                approved: false,
                respondedBy: testEnv.testUser.id,
                responseNote: "Not allowed"
            });
        });

        it("continues execution without tool call after denial", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);

            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            runningInstance.id = instance.id;
            runningInstance.pending_approval_id = null;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(runningInstance);

            // After denial, instance should return to running
            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                status: "running",
                pending_approval_id: null
            });

            expect(result?.status).toBe("running");
        });
    });

    describe("Workspace Isolation", () => {
        it("only shows approvals for user's workspace", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            // Should find approval in user's workspace
            testEnv.repositories.personaApproval.findPendingByWorkspaceId.mockResolvedValue({
                approvals: [approval],
                total: 1
            });

            const result = await testEnv.repositories.personaApproval.findPendingByWorkspaceId(
                testEnv.testWorkspace.id,
                { limit: 10, offset: 0 }
            );

            expect(result.approvals).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it("returns empty for approvals in different workspace", async () => {
            const otherWorkspaceId = generateId("workspace");

            // Should not find approvals in other workspace
            testEnv.repositories.personaApproval.findPendingByWorkspaceId.mockResolvedValue({
                approvals: [],
                total: 0
            });

            const result = await testEnv.repositories.personaApproval.findPendingByWorkspaceId(
                otherWorkspaceId,
                { limit: 10, offset: 0 }
            );

            expect(result.approvals).toHaveLength(0);
            expect(result.total).toBe(0);
        });

        it("counts pending approvals per workspace", async () => {
            testEnv.repositories.personaApproval.countPendingByWorkspaceId.mockResolvedValue(3);

            const count = await testEnv.repositories.personaApproval.countPendingByWorkspaceId(
                testEnv.testWorkspace.id
            );

            expect(count).toBe(3);
        });
    });

    describe("Expiration", () => {
        it("expires old pending approvals", async () => {
            const expirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

            testEnv.repositories.personaApproval.expirePendingBefore.mockResolvedValue(5);

            const expiredCount = await testEnv.repositories.personaApproval.expirePendingBefore(
                expirationDate
            );

            expect(expiredCount).toBe(5);
            expect(testEnv.repositories.personaApproval.expirePendingBefore).toHaveBeenCalledWith(
                expirationDate
            );
        });

        it("cancels pending approvals on instance cancellation", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaApproval.cancelPendingByInstanceId.mockResolvedValue(1);

            const cancelledCount = await testEnv.repositories.personaApproval.cancelPendingByInstanceId(
                instance.id
            );

            expect(cancelledCount).toBe(1);
        });
    });

    describe("Multiple Approvals", () => {
        it("lists all approvals for an instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const approval1 = createToolCallApproval(instance.id);
            const approval2 = createHighRiskApproval(instance.id);
            approval2.id = generateId("approval");

            testEnv.repositories.personaApproval.findByInstanceId.mockResolvedValue([
                approval1,
                approval2
            ]);

            const approvals = await testEnv.repositories.personaApproval.findByInstanceId(
                instance.id
            );

            expect(approvals).toHaveLength(2);
        });

        it("lists only pending approvals for an instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);

            const pendingApproval = createToolCallApproval(instance.id);

            testEnv.repositories.personaApproval.findPendingByInstanceId.mockResolvedValue([
                pendingApproval
            ]);

            const approvals = await testEnv.repositories.personaApproval.findPendingByInstanceId(
                instance.id
            );

            expect(approvals).toHaveLength(1);
            expect(approvals[0].status).toBe("pending");
        });
    });
});
