/**
 * PersonaInstanceRepository Tests
 *
 * Tests for persona instance CRUD operations including status management,
 * progress tracking, dashboard queries, and workspace-scoped filtering.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaInstanceRepository } from "../PersonaInstanceRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePersonaInstanceRow,
    generateId
} from "./setup";

describe("PersonaInstanceRepository", () => {
    let repository: PersonaInstanceRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaInstanceRepository();
    });

    describe("create", () => {
        it("should insert a new persona instance with all fields", async () => {
            const input = {
                persona_definition_id: generateId(),
                user_id: generateId(),
                workspace_id: generateId(),
                task_title: "Research market trends",
                task_description: "Analyze current market trends in tech sector",
                additional_context: { notes: "Focus on AI companies" },
                structured_inputs: { topic: "AI Market" },
                max_duration_hours: 4.0,
                max_cost_credits: 100,
                notification_config: {
                    on_approval_needed: true,
                    on_completion: true,
                    slack_channel_id: "C123456"
                }
            };

            const mockRow = generatePersonaInstanceRow({
                persona_definition_id: input.persona_definition_id,
                user_id: input.user_id,
                workspace_id: input.workspace_id,
                task_title: input.task_title,
                task_description: input.task_description,
                additional_context: JSON.stringify(input.additional_context),
                structured_inputs: JSON.stringify(input.structured_inputs),
                max_duration_hours: input.max_duration_hours,
                max_cost_credits: input.max_cost_credits
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_instances"),
                expect.arrayContaining([
                    input.persona_definition_id,
                    input.user_id,
                    input.workspace_id,
                    input.task_title,
                    input.task_description,
                    JSON.stringify(input.additional_context),
                    JSON.stringify(input.structured_inputs)
                ])
            );
            expect(result.persona_definition_id).toBe(input.persona_definition_id);
            expect(result.status).toBe("pending");
        });

        it("should use default values when optional fields not provided", async () => {
            const input = {
                persona_definition_id: generateId(),
                user_id: generateId(),
                workspace_id: generateId()
            };

            const mockRow = generatePersonaInstanceRow({
                persona_definition_id: input.persona_definition_id,
                user_id: input.user_id,
                workspace_id: input.workspace_id,
                task_title: null,
                task_description: null,
                additional_context: "{}",
                structured_inputs: "{}"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.task_title).toBeNull();
            expect(result.additional_context).toEqual({});
        });

        it("should include template fields when provided", async () => {
            const input = {
                persona_definition_id: generateId(),
                user_id: generateId(),
                workspace_id: generateId(),
                template_id: generateId(),
                template_variables: { topic: "AI", audience: "developers" }
            };

            const mockRow = generatePersonaInstanceRow({
                ...input,
                template_variables: JSON.stringify(input.template_variables)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    input.template_id,
                    JSON.stringify(input.template_variables)
                ])
            );
            expect(result.template_id).toBe(input.template_id);
        });
    });

    describe("findById", () => {
        it("should return instance when found", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({ id: instanceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [instanceId]
            );
            expect(result?.id).toBe(instanceId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should return instance when found with matching workspace", async () => {
            const instanceId = generateId();
            const workspaceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                workspace_id: workspaceId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(instanceId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL"
                ),
                [instanceId, workspaceId]
            );
            expect(result?.id).toBe(instanceId);
            expect(result?.workspace_id).toBe(workspaceId);
        });

        it("should return null when workspace does not match", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByIdAndWorkspaceId(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("findByUserId", () => {
        it("should return paginated instances with total count", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const mockInstances = [
                generatePersonaInstanceRow({
                    user_id: userId,
                    workspace_id: workspaceId,
                    persona_name: "Research Assistant",
                    persona_slug: "research-assistant",
                    persona_title: "Research Assistant",
                    persona_category: "research"
                }),
                generatePersonaInstanceRow({
                    user_id: userId,
                    workspace_id: workspaceId,
                    persona_name: "Content Writer",
                    persona_slug: "content-writer",
                    persona_title: "Content Writer",
                    persona_category: "content"
                })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockInstances));

            const result = await repository.findByUserId(userId, workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.instances).toHaveLength(2);
        });

        it("should filter by status array when provided", async () => {
            const userId = generateId();
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generatePersonaInstanceRow()]));

            await repository.findByUserId(userId, workspaceId, {
                status: ["running", "waiting_approval"]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("pi.status IN"),
                expect.arrayContaining([userId, workspaceId, "running", "waiting_approval"])
            );
        });

        it("should filter by single status when provided", async () => {
            const userId = generateId();
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generatePersonaInstanceRow()]));

            await repository.findByUserId(userId, workspaceId, { status: "completed" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("pi.status = $"),
                expect.arrayContaining([userId, workspaceId, "completed"])
            );
        });

        it("should filter by persona_definition_id when provided", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const personaId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows([generatePersonaInstanceRow()]));

            await repository.findByUserId(userId, workspaceId, {
                persona_definition_id: personaId
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("pi.persona_definition_id = $"),
                expect.arrayContaining([userId, workspaceId, personaId])
            );
        });

        it("should use default pagination values", async () => {
            const userId = generateId();
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByUserId(userId, workspaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining([userId, workspaceId, 50, 0])
            );
        });
    });

    describe("getDashboard", () => {
        it("should return dashboard data with categorized instances", async () => {
            const userId = generateId();
            const workspaceId = generateId();

            const needsAttention = [
                generatePersonaInstanceRow({
                    status: "waiting_approval",
                    persona_name: "Assistant"
                })
            ];
            const running = [
                generatePersonaInstanceRow({
                    status: "running",
                    persona_name: "Assistant"
                })
            ];
            const recentCompleted = [
                generatePersonaInstanceRow({
                    status: "completed",
                    persona_name: "Assistant"
                })
            ];

            mockQuery
                .mockResolvedValueOnce(mockRows(needsAttention))
                .mockResolvedValueOnce(mockRows(running))
                .mockResolvedValueOnce(mockRows(recentCompleted));

            const result = await repository.getDashboard(userId, workspaceId);

            expect(result.needs_attention).toHaveLength(1);
            expect(result.running).toHaveLength(1);
            expect(result.recent_completed).toHaveLength(1);
        });
    });

    describe("countNeedsAttention", () => {
        it("should return count of instances needing attention", async () => {
            const userId = generateId();
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(5));

            const result = await repository.countNeedsAttention(userId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status IN ('waiting_approval', 'completed')"),
                [userId, workspaceId]
            );
            expect(result).toBe(5);
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                task_title: "Updated title"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(instanceId, {
                task_title: "Updated title"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.persona_instances"),
                expect.arrayContaining(["Updated title", instanceId])
            );
            expect(result?.task_title).toBe("Updated title");
        });

        it("should return existing instance when no updates provided", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({ id: instanceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(instanceId, {});

            expect(result?.id).toBe(instanceId);
        });

        it("should stringify JSON fields when updating", async () => {
            const instanceId = generateId();
            const progress = {
                current_step: 2,
                total_steps: 5,
                current_step_name: "Step 2",
                percentage: 40,
                message: "Processing..."
            };
            const mockRow = generatePersonaInstanceRow({ id: instanceId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(instanceId, { progress });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(progress)])
            );
        });

        it("should update multiple fields at once", async () => {
            const instanceId = generateId();
            const threadId = generateId();
            const executionId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                thread_id: threadId,
                execution_id: executionId,
                status: "running"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(instanceId, {
                thread_id: threadId,
                execution_id: executionId,
                status: "running"
            });

            expect(result?.thread_id).toBe(threadId);
            expect(result?.execution_id).toBe(executionId);
            expect(result?.status).toBe("running");
        });
    });

    describe("updateStatus", () => {
        it("should update status to running and set started_at", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                status: "running"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateStatus(instanceId, "running");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("started_at = COALESCE(started_at, NOW())"),
                expect.anything()
            );
            expect(result?.status).toBe("running");
        });

        it("should set completed_at and duration when completing", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                status: "completed",
                completed_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateStatus(instanceId, "completed", "user_completed");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("completed_at = NOW()"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("duration_seconds"),
                expect.anything()
            );
            expect(result?.status).toBe("completed");
        });

        it("should include completion_reason when provided", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                status: "failed",
                completion_reason: "failed"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateStatus(instanceId, "failed", "failed");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("completion_reason = $"),
                expect.arrayContaining(["failed", "failed", instanceId])
            );
        });
    });

    describe("incrementProgress", () => {
        it("should increment cost and iteration count", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                accumulated_cost_credits: 10,
                iteration_count: 2
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.incrementProgress(instanceId, 5, 1);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("accumulated_cost_credits = accumulated_cost_credits + $1"),
                [5, 1, instanceId]
            );
            expect(result?.accumulated_cost_credits).toBe(10);
            expect(result?.iteration_count).toBe(2);
        });

        it("should use default iteration increment of 1", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({ id: instanceId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.incrementProgress(instanceId, 10);

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [10, 1, instanceId]);
        });
    });

    describe("delete", () => {
        it("should soft delete instance and return true", async () => {
            const instanceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = NOW()"),
                [instanceId]
            );
            expect(result).toBe(true);
        });

        it("should return false when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("hardDelete", () => {
        it("should hard delete instance and return true", async () => {
            const instanceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.hardDelete(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_instances"),
                [instanceId]
            );
            expect(result).toBe(true);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const instanceId = generateId();
            const now = new Date().toISOString();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                started_at: now,
                completed_at: now,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(instanceId);

            expect(result?.started_at).toBeInstanceOf(Date);
            expect(result?.completed_at).toBeInstanceOf(Date);
            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                started_at: null,
                completed_at: null,
                deleted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(instanceId);

            expect(result?.started_at).toBeNull();
            expect(result?.completed_at).toBeNull();
            expect(result?.deleted_at).toBeNull();
        });

        it("should parse JSON fields from string", async () => {
            const instanceId = generateId();
            const additionalContext = { notes: "Important notes" };
            const structuredInputs = { topic: "AI" };
            const progress = { current_step: 1, total_steps: 3 };
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                additional_context: JSON.stringify(additionalContext),
                structured_inputs: JSON.stringify(structuredInputs),
                progress: JSON.stringify(progress)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(instanceId);

            expect(result?.additional_context).toEqual(additionalContext);
            expect(result?.structured_inputs).toEqual(structuredInputs);
            expect(result?.progress).toEqual(progress);
        });

        it("should coerce numeric fields from string", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                max_duration_hours: "4.5",
                max_cost_credits: "100",
                duration_seconds: "3600",
                accumulated_cost_credits: "25.5",
                iteration_count: "10"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(instanceId);

            expect(result?.max_duration_hours).toBe(4.5);
            expect(typeof result?.max_duration_hours).toBe("number");
            expect(result?.max_cost_credits).toBe(100);
            expect(typeof result?.max_cost_credits).toBe("number");
            expect(result?.duration_seconds).toBe(3600);
            expect(result?.accumulated_cost_credits).toBe(25.5);
            expect(result?.iteration_count).toBe(10);
        });

        it("should handle null progress field", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaInstanceRow({
                id: instanceId,
                progress: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(instanceId);

            expect(result?.progress).toBeNull();
        });
    });
});
