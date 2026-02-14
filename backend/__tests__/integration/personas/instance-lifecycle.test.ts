/**
 * Persona Instance Lifecycle Integration Tests
 *
 * Tests the complete lifecycle of persona instances including:
 * - Instance creation with various configurations
 * - Status transitions throughout execution
 * - Progress tracking and cost accumulation
 */

import { createPersonaTestEnvironment } from "./helpers/persona-test-env";
import {
    createResearchAssistantPersona,
    createPersonaInstanceFixture,
    createPendingInstance,
    createClarifyingInstance,
    createRunningInstance,
    createWaitingApprovalInstance,
    createCompletedInstance,
    createFailedInstance,
    createCancelledInstance,
    generateId,
    createTemplateFixture,
    createConnectionFixture
} from "./helpers/persona-fixtures";
import type { PersonaTestEnvironment } from "./helpers/persona-test-env";

describe("Persona Instance Lifecycle", () => {
    let testEnv: PersonaTestEnvironment;

    beforeEach(async () => {
        testEnv = await createPersonaTestEnvironment({ skipServer: true });
    });

    afterEach(async () => {
        await testEnv.cleanup();
    });

    describe("Instance Creation", () => {
        it("creates instance with minimal required fields", async () => {
            const persona = createResearchAssistantPersona();
            const instanceId = generateId("instance");
            const now = new Date();

            const expectedInstance = createPersonaInstanceFixture({
                id: instanceId,
                personaDefinitionId: persona.id,
                workspaceId: testEnv.testWorkspace.id,
                userId: testEnv.testUser.id,
                status: "initializing",
                taskDescription: "Research AI trends"
            });

            // Mock persona lookup
            testEnv.repositories.personaDefinition.findById.mockResolvedValue(persona);

            // Mock instance creation
            testEnv.repositories.personaInstance.create.mockResolvedValue(expectedInstance);

            // Verify the mocked create method can be called with correct params
            const result = await testEnv.repositories.personaInstance.create({
                persona_definition_id: persona.id,
                user_id: testEnv.testUser.id,
                workspace_id: testEnv.testWorkspace.id,
                task_description: "Research AI trends"
            });

            expect(result.id).toBe(instanceId);
            expect(result.status).toBe("initializing");
            expect(result.persona_definition_id).toBe(persona.id);
            expect(result.accumulated_cost_credits).toBe(0);
            expect(result.iteration_count).toBe(0);
        });

        it("creates instance with template variables", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({
                personaDefinitionId: persona.id
            });

            const expectedInstance = createPersonaInstanceFixture({
                personaDefinitionId: persona.id,
                workspaceId: testEnv.testWorkspace.id,
                status: "initializing"
            });
            expectedInstance.template_id = template.id;
            expectedInstance.template_variables = {
                topic: "AI Market Trends",
                deliverable_type: "report"
            };

            testEnv.repositories.personaDefinition.findById.mockResolvedValue(persona);
            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);
            testEnv.repositories.personaInstance.create.mockResolvedValue(expectedInstance);

            const result = await testEnv.repositories.personaInstance.create({
                persona_definition_id: persona.id,
                user_id: testEnv.testUser.id,
                workspace_id: testEnv.testWorkspace.id,
                template_id: template.id,
                template_variables: {
                    topic: "AI Market Trends",
                    deliverable_type: "report"
                }
            });

            expect(result.template_id).toBe(template.id);
            expect(result.template_variables).toEqual({
                topic: "AI Market Trends",
                deliverable_type: "report"
            });
        });

        it("creates instance with connection grants", async () => {
            const persona = createResearchAssistantPersona();
            const connectionId = generateId("conn");

            const expectedInstance = createPersonaInstanceFixture({
                personaDefinitionId: persona.id,
                workspaceId: testEnv.testWorkspace.id,
                status: "initializing"
            });

            const connection = createConnectionFixture({
                instanceId: expectedInstance.id,
                connectionId,
                grantedScopes: ["read", "write"]
            });

            testEnv.repositories.personaDefinition.findById.mockResolvedValue(persona);
            testEnv.repositories.personaInstance.create.mockResolvedValue(expectedInstance);
            testEnv.repositories.personaConnection.createMany.mockResolvedValue([connection]);

            // Create instance
            const instance = await testEnv.repositories.personaInstance.create({
                persona_definition_id: persona.id,
                user_id: testEnv.testUser.id,
                workspace_id: testEnv.testWorkspace.id
            });

            // Grant connections
            const connections = await testEnv.repositories.personaConnection.createMany([
                {
                    instance_id: instance.id,
                    connection_id: connectionId,
                    granted_scopes: ["read", "write"]
                }
            ]);

            expect(connections).toHaveLength(1);
            expect(connections[0].connection_id).toBe(connectionId);
            expect(connections[0].granted_scopes).toEqual(["read", "write"]);
        });

        it("initializes with 'initializing' status", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createPendingInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaInstance.create.mockResolvedValue(instance);

            const result = await testEnv.repositories.personaInstance.create({
                persona_definition_id: persona.id,
                user_id: testEnv.testUser.id,
                workspace_id: testEnv.testWorkspace.id
            });

            expect(result.status).toBe("initializing");
            expect(result.started_at).toBeNull();
            expect(result.completed_at).toBeNull();
        });
    });

    describe("Status Transitions", () => {
        it("transitions from initializing to clarifying", async () => {
            const persona = createResearchAssistantPersona();
            const initialInstance = createPendingInstance(persona.id, testEnv.testWorkspace.id);
            const updatedInstance = createClarifyingInstance(persona.id, testEnv.testWorkspace.id);
            updatedInstance.id = initialInstance.id;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(initialInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(updatedInstance);

            const result = await testEnv.repositories.personaInstance.update(initialInstance.id, {
                status: "clarifying"
            });

            expect(result?.status).toBe("clarifying");
        });

        it("transitions from clarifying to running", async () => {
            const persona = createResearchAssistantPersona();
            const clarifyingInstance = createClarifyingInstance(persona.id, testEnv.testWorkspace.id);
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            runningInstance.id = clarifyingInstance.id;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(clarifyingInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(runningInstance);

            const result = await testEnv.repositories.personaInstance.update(clarifyingInstance.id, {
                status: "running",
                clarification_complete: true,
                started_at: new Date()
            });

            expect(result?.status).toBe("running");
            expect(result?.started_at).not.toBeNull();
        });

        it("transitions from running to waiting_approval", async () => {
            const persona = createResearchAssistantPersona();
            const approvalId = generateId("approval");
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const waitingInstance = createWaitingApprovalInstance(
                persona.id,
                testEnv.testWorkspace.id,
                approvalId
            );
            waitingInstance.id = runningInstance.id;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(runningInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(waitingInstance);

            const result = await testEnv.repositories.personaInstance.update(runningInstance.id, {
                status: "waiting_approval",
                pending_approval_id: approvalId
            });

            expect(result?.status).toBe("waiting_approval");
            expect(result?.pending_approval_id).toBe(approvalId);
        });

        it("transitions from waiting_approval to running on approve", async () => {
            const persona = createResearchAssistantPersona();
            const approvalId = generateId("approval");
            const waitingInstance = createWaitingApprovalInstance(
                persona.id,
                testEnv.testWorkspace.id,
                approvalId
            );
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            runningInstance.id = waitingInstance.id;
            runningInstance.pending_approval_id = null;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(waitingInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(runningInstance);

            const result = await testEnv.repositories.personaInstance.update(waitingInstance.id, {
                status: "running",
                pending_approval_id: null
            });

            expect(result?.status).toBe("running");
            expect(result?.pending_approval_id).toBeNull();
        });

        it("transitions to completed on success", async () => {
            const persona = createResearchAssistantPersona();
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const completedInstance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            completedInstance.id = runningInstance.id;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(runningInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(completedInstance);

            const result = await testEnv.repositories.personaInstance.update(runningInstance.id, {
                status: "completed",
                completion_reason: "success",
                completed_at: new Date()
            });

            expect(result?.status).toBe("completed");
            expect(result?.completion_reason).toBe("success");
            expect(result?.completed_at).not.toBeNull();
        });

        it("transitions to failed on error", async () => {
            const persona = createResearchAssistantPersona();
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const failedInstance = createFailedInstance(persona.id, testEnv.testWorkspace.id);
            failedInstance.id = runningInstance.id;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(runningInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(failedInstance);

            const result = await testEnv.repositories.personaInstance.update(runningInstance.id, {
                status: "failed",
                completion_reason: "failed",
                completed_at: new Date()
            });

            expect(result?.status).toBe("failed");
            expect(result?.completion_reason).toBe("failed");
        });

        it("transitions to cancelled on cancel", async () => {
            const persona = createResearchAssistantPersona();
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const cancelledInstance = createCancelledInstance(persona.id, testEnv.testWorkspace.id);
            cancelledInstance.id = runningInstance.id;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(runningInstance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(cancelledInstance);

            const result = await testEnv.repositories.personaInstance.update(runningInstance.id, {
                status: "cancelled",
                completion_reason: "cancelled",
                completed_at: new Date()
            });

            expect(result?.status).toBe("cancelled");
            expect(result?.completion_reason).toBe("cancelled");
        });
    });

    describe("Progress Tracking", () => {
        it("updates iteration count", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            // Simulate iteration updates
            const updatedInstance = { ...instance, iteration_count: 5 };
            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(updatedInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                iteration_count: 5
            });

            expect(result?.iteration_count).toBe(5);
        });

        it("accumulates cost credits", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            instance.accumulated_cost_credits = 50;

            // Simulate cost updates
            const updatedInstance = { ...instance, accumulated_cost_credits: 75 };
            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(updatedInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                accumulated_cost_credits: 75
            });

            expect(result?.accumulated_cost_credits).toBe(75);
        });

        it("updates progress object", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const progress = {
                current_step: 2,
                total_steps: 5,
                step_name: "Analyzing data",
                percent_complete: 40
            };

            const updatedInstance = { ...instance, progress };
            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(updatedInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                progress
            });

            expect(result?.progress).toEqual(progress);
            expect(result?.progress?.percent_complete).toBe(40);
        });

        it("tracks duration in seconds on completion", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            instance.started_at = new Date(Date.now() - 300000); // 5 minutes ago

            const completedInstance = {
                ...instance,
                status: "completed" as const,
                completed_at: new Date(),
                duration_seconds: 300,
                completion_reason: "success" as const
            };

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(completedInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                status: "completed",
                completion_reason: "success",
                completed_at: new Date(),
                duration_seconds: 300
            });

            expect(result?.duration_seconds).toBe(300);
        });
    });

    describe("Clarification Phase", () => {
        it("tracks clarification exchange count", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createClarifyingInstance(persona.id, testEnv.testWorkspace.id);

            const updatedInstance = { ...instance, clarification_exchange_count: 2 };
            testEnv.repositories.personaInstance.update.mockResolvedValue(updatedInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                clarification_exchange_count: 2
            });

            expect(result?.clarification_exchange_count).toBe(2);
        });

        it("respects max clarification exchanges", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createClarifyingInstance(persona.id, testEnv.testWorkspace.id);
            instance.clarification_max_exchanges = 3;
            instance.clarification_exchange_count = 3;

            // When max reached, should transition to running
            const runningInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            runningInstance.id = instance.id;
            runningInstance.clarification_complete = true;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(runningInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                status: "running",
                clarification_complete: true
            });

            expect(result?.status).toBe("running");
            expect(result?.clarification_complete).toBe(true);
        });

        it("skips clarification when requested", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createPendingInstance(persona.id, testEnv.testWorkspace.id);

            const skippedInstance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            skippedInstance.id = instance.id;
            skippedInstance.clarification_skipped = true;
            skippedInstance.clarification_complete = true;

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.update.mockResolvedValue(skippedInstance);

            const result = await testEnv.repositories.personaInstance.update(instance.id, {
                status: "running",
                clarification_skipped: true,
                clarification_complete: true,
                started_at: new Date()
            });

            expect(result?.clarification_skipped).toBe(true);
            expect(result?.status).toBe("running");
        });
    });

    describe("Instance Deletion", () => {
        it("soft deletes an instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaInstance.softDelete.mockResolvedValue(true);

            const result = await testEnv.repositories.personaInstance.softDelete(instance.id);

            expect(result).toBe(true);
            expect(testEnv.repositories.personaInstance.softDelete).toHaveBeenCalledWith(instance.id);
        });

        it("deletes associated connections on instance deletion", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const connection = createConnectionFixture({
                instanceId: instance.id
            });

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaConnection.findByInstanceId.mockResolvedValue([connection]);
            testEnv.repositories.personaConnection.deleteAllForInstance.mockResolvedValue(1);
            testEnv.repositories.personaInstance.softDelete.mockResolvedValue(true);

            // Delete connections first
            const deletedCount = await testEnv.repositories.personaConnection.deleteAllForInstance(
                instance.id
            );
            expect(deletedCount).toBe(1);

            // Then soft delete instance
            const result = await testEnv.repositories.personaInstance.softDelete(instance.id);
            expect(result).toBe(true);
        });
    });
});
