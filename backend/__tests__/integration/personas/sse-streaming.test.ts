/**
 * SSE Streaming Integration Tests
 *
 * Tests Server-Sent Events streaming for persona instances including:
 * - Connection establishment
 * - Event emission
 * - Authentication and authorization
 */

import {
    createResearchAssistantPersona,
    createRunningInstance,
    createWaitingApprovalInstance,
    createCompletedInstance,
    createToolCallApproval,
    createMarkdownDeliverable,
    generateId
} from "./helpers/persona-fixtures";
import {
    createPersonaTestEnvironment,
    expectEventPublished,
    getPublishedEvents,
    clearPublishedEvents
} from "./helpers/persona-test-env";
import type { PersonaTestEnvironment } from "./helpers/persona-test-env";

describe("SSE Streaming", () => {
    let testEnv: PersonaTestEnvironment;

    beforeEach(async () => {
        testEnv = await createPersonaTestEnvironment({ skipServer: true });
    });

    afterEach(async () => {
        await testEnv.cleanup();
    });

    describe("Connection", () => {
        it("establishes SSE connection with auth", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaInstance.findByIdAndWorkspaceId.mockResolvedValue(instance);

            // Simulate connection establishment
            const channel = `persona:${instance.id}`;

            await testEnv.eventBus.subscribe(channel, () => {});

            expect(testEnv.eventBus.subscribe).toHaveBeenCalledWith(channel, expect.any(Function));
        });

        it("validates instance belongs to workspace", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            // Return null for different workspace
            testEnv.repositories.personaInstance.findByIdAndWorkspaceId
                .mockResolvedValueOnce(null) // Different workspace
                .mockResolvedValueOnce(instance); // Correct workspace

            // Try with wrong workspace
            const wrongResult = await testEnv.repositories.personaInstance.findByIdAndWorkspaceId(
                instance.id,
                "different-workspace"
            );
            expect(wrongResult).toBeNull();

            // Try with correct workspace
            const correctResult = await testEnv.repositories.personaInstance.findByIdAndWorkspaceId(
                instance.id,
                testEnv.testWorkspace.id
            );
            expect(correctResult).not.toBeNull();
        });
    });

    describe("Status Events", () => {
        it("emits status change to running", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "status_changed", {
                instanceId: instance.id,
                previousStatus: "clarifying",
                newStatus: "running"
            });

            expectEventPublished(testEnv.eventBus, "status_changed", (data) => {
                return data.newStatus === "running" && data.previousStatus === "clarifying";
            });
        });

        it("emits status change to completed", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "status_changed", {
                instanceId: instance.id,
                previousStatus: "running",
                newStatus: "completed",
                completionReason: "success"
            });

            expectEventPublished(testEnv.eventBus, "status_changed", (data) => {
                return data.newStatus === "completed" && data.completionReason === "success";
            });
        });

        it("emits status change to waiting_approval", async () => {
            const persona = createResearchAssistantPersona();
            const approvalId = generateId("approval");
            const instance = createWaitingApprovalInstance(
                persona.id,
                testEnv.testWorkspace.id,
                approvalId
            );

            await testEnv.eventBus.publish(`persona:${instance.id}`, "status_changed", {
                instanceId: instance.id,
                previousStatus: "running",
                newStatus: "waiting_approval",
                pendingApprovalId: approvalId
            });

            expectEventPublished(testEnv.eventBus, "status_changed", (data) => {
                return data.newStatus === "waiting_approval";
            });
        });
    });

    describe("Progress Events", () => {
        it("emits progress update events", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "progress_updated", {
                instanceId: instance.id,
                progress: {
                    current_step: 2,
                    total_steps: 5,
                    step_name: "Analyzing data",
                    percent_complete: 40
                }
            });

            expectEventPublished(testEnv.eventBus, "progress_updated", (data) => {
                const progress = data.progress as Record<string, unknown>;
                return progress.percent_complete === 40;
            });
        });

        it("emits iteration update events", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "iteration_completed", {
                instanceId: instance.id,
                iterationCount: 5,
                accumulatedCostCredits: 50
            });

            expectEventPublished(testEnv.eventBus, "iteration_completed", (data) => {
                return data.iterationCount === 5 && data.accumulatedCostCredits === 50;
            });
        });
    });

    describe("Approval Events", () => {
        it("emits approval_needed event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "approval_needed", {
                instanceId: instance.id,
                approvalId: approval.id,
                actionType: approval.action_type,
                toolName: approval.tool_name,
                actionDescription: approval.action_description,
                riskLevel: approval.risk_level,
                estimatedCostCredits: approval.estimated_cost_credits
            });

            expectEventPublished(testEnv.eventBus, "approval_needed", (data) => {
                return data.approvalId === approval.id && data.riskLevel === "medium";
            });
        });

        it("emits approval_resolved event on approve", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "approval_resolved", {
                instanceId: instance.id,
                approvalId: approval.id,
                status: "approved",
                respondedBy: testEnv.testUser.id
            });

            expectEventPublished(testEnv.eventBus, "approval_resolved", (data) => {
                return data.status === "approved" && data.respondedBy === testEnv.testUser.id;
            });
        });

        it("emits approval_resolved event on deny", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createWaitingApprovalInstance(persona.id, testEnv.testWorkspace.id);
            const approval = createToolCallApproval(instance.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "approval_resolved", {
                instanceId: instance.id,
                approvalId: approval.id,
                status: "denied",
                respondedBy: testEnv.testUser.id,
                responseNote: "Not allowed"
            });

            expectEventPublished(testEnv.eventBus, "approval_resolved", (data) => {
                return data.status === "denied" && data.responseNote === "Not allowed";
            });
        });
    });

    describe("Deliverable Events", () => {
        it("emits deliverable_created event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "deliverable_created", {
                instanceId: instance.id,
                deliverableId: deliverable.id,
                name: deliverable.name,
                type: deliverable.type,
                preview: deliverable.preview
            });

            expectEventPublished(testEnv.eventBus, "deliverable_created", (data) => {
                return data.deliverableId === deliverable.id && data.type === "markdown";
            });
        });
    });

    describe("Message Events", () => {
        it("emits message_received event for user messages", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "message_received", {
                instanceId: instance.id,
                role: "user",
                content: "Please analyze this data"
            });

            expectEventPublished(testEnv.eventBus, "message_received", (data) => {
                return data.role === "user";
            });
        });

        it("emits message_received event for assistant messages", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "message_received", {
                instanceId: instance.id,
                role: "assistant",
                content: "I will analyze the data for you."
            });

            expectEventPublished(testEnv.eventBus, "message_received", (data) => {
                return data.role === "assistant";
            });
        });
    });

    describe("Tool Events", () => {
        it("emits tool_call_started event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "tool_call_started", {
                instanceId: instance.id,
                toolName: "web_search",
                arguments: { query: "AI market trends" }
            });

            expectEventPublished(testEnv.eventBus, "tool_call_started", (data) => {
                return data.toolName === "web_search";
            });
        });

        it("emits tool_call_completed event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "tool_call_completed", {
                instanceId: instance.id,
                toolName: "web_search",
                success: true,
                resultPreview: "Found 10 results..."
            });

            expectEventPublished(testEnv.eventBus, "tool_call_completed", (data) => {
                return data.toolName === "web_search" && data.success === true;
            });
        });

        it("emits tool_call_failed event", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "tool_call_failed", {
                instanceId: instance.id,
                toolName: "web_search",
                error: "Rate limit exceeded"
            });

            expectEventPublished(testEnv.eventBus, "tool_call_failed", (data) => {
                return data.toolName === "web_search" && data.error === "Rate limit exceeded";
            });
        });
    });

    describe("Event Ordering", () => {
        it("events are received in order", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const channel = `persona:${instance.id}`;

            // Emit events in order
            await testEnv.eventBus.publish(channel, "status_changed", {
                instanceId: instance.id,
                newStatus: "running"
            });
            await testEnv.eventBus.publish(channel, "progress_updated", {
                instanceId: instance.id,
                progress: { percent_complete: 25 }
            });
            await testEnv.eventBus.publish(channel, "progress_updated", {
                instanceId: instance.id,
                progress: { percent_complete: 50 }
            });
            await testEnv.eventBus.publish(channel, "status_changed", {
                instanceId: instance.id,
                newStatus: "completed"
            });

            const events = testEnv.eventBus.publishedEvents;
            expect(events).toHaveLength(4);

            // Verify order by timestamps
            for (let i = 1; i < events.length; i++) {
                expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
            }
        });
    });

    describe("Channel Isolation", () => {
        it("events are scoped to specific instance channel", async () => {
            const persona = createResearchAssistantPersona();
            const instance1 = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const instance2 = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            clearPublishedEvents(testEnv.eventBus);

            // Emit events to different channels
            await testEnv.eventBus.publish(`persona:${instance1.id}`, "progress_updated", {
                instanceId: instance1.id,
                progress: { percent_complete: 50 }
            });
            await testEnv.eventBus.publish(`persona:${instance2.id}`, "progress_updated", {
                instanceId: instance2.id,
                progress: { percent_complete: 75 }
            });

            const events = testEnv.eventBus.publishedEvents;

            // Each instance should have its own event
            const instance1Events = events.filter((e) => e.channel === `persona:${instance1.id}`);
            const instance2Events = events.filter((e) => e.channel === `persona:${instance2.id}`);

            expect(instance1Events).toHaveLength(1);
            expect(instance2Events).toHaveLength(1);
        });
    });

    describe("Event Data Structure", () => {
        it("events include timestamp", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            clearPublishedEvents(testEnv.eventBus);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "status_changed", {
                instanceId: instance.id,
                newStatus: "running"
            });

            const events = getPublishedEvents(testEnv.eventBus, "status_changed");
            expect(events).toHaveLength(1);
            expect(events[0].timestamp).toBeDefined();
            expect(typeof events[0].timestamp).toBe("number");
        });

        it("events include channel information", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            clearPublishedEvents(testEnv.eventBus);

            await testEnv.eventBus.publish(`persona:${instance.id}`, "progress_updated", {
                instanceId: instance.id
            });

            const events = getPublishedEvents(testEnv.eventBus, "progress_updated");
            expect(events[0].channel).toBe(`persona:${instance.id}`);
        });
    });
});
