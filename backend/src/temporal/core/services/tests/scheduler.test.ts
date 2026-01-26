/**
 * Scheduler Service Tests
 *
 * Tests for Temporal schedule management for workflow triggers.
 */

import { TriggerRepository } from "../../../../storage/repositories/TriggerRepository";
import { getTemporalClient } from "../../../client";
import { SchedulerService } from "../scheduler";
import type { ScheduleTriggerConfig, WorkflowTrigger } from "../../../../storage/models/Trigger";

// Mock dependencies
jest.mock("../../../../storage/repositories/TriggerRepository");
jest.mock("../../../client");
jest.mock("../../../../core/logging", () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
}));

describe("SchedulerService", () => {
    let service: SchedulerService;
    let mockTriggerRepo: jest.Mocked<TriggerRepository>;
    let mockScheduleHandle: {
        update: jest.Mock;
        pause: jest.Mock;
        unpause: jest.Mock;
        delete: jest.Mock;
        describe: jest.Mock;
        trigger: jest.Mock;
    };
    let mockTemporalClient: {
        schedule: {
            create: jest.Mock;
            getHandle: jest.Mock;
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTriggerRepo = {
            findById: jest.fn(),
            update: jest.fn(),
            findByType: jest.fn()
        } as unknown as jest.Mocked<TriggerRepository>;

        (TriggerRepository as jest.Mock).mockImplementation(() => mockTriggerRepo);

        mockScheduleHandle = {
            update: jest.fn(),
            pause: jest.fn(),
            unpause: jest.fn(),
            delete: jest.fn(),
            describe: jest.fn().mockResolvedValue({
                state: { paused: false },
                spec: { cronExpressions: ["0 9 * * *"] },
                info: { nextActionTimes: [new Date()] }
            }),
            trigger: jest.fn()
        };

        mockTemporalClient = {
            schedule: {
                create: jest.fn(),
                getHandle: jest.fn().mockReturnValue(mockScheduleHandle)
            }
        };

        (getTemporalClient as jest.Mock).mockResolvedValue(mockTemporalClient);

        service = new SchedulerService();
    });

    function createMockTrigger(overrides = {}): WorkflowTrigger {
        return {
            id: "trigger-123",
            workflow_id: "workflow-456",
            name: "Test Scheduled Trigger",
            trigger_type: "schedule",
            enabled: true,
            temporal_schedule_id: "trigger-trigger-123",
            config: {
                cronExpression: "0 9 * * *",
                timezone: "UTC",
                enabled: true
            } as ScheduleTriggerConfig,
            webhook_secret: null,
            last_triggered_at: null,
            next_scheduled_at: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            ...overrides
        };
    }

    describe("createScheduledTrigger", () => {
        it("should create a Temporal schedule", async () => {
            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                timezone: "America/New_York",
                enabled: true
            };

            const scheduleId = await service.createScheduledTrigger(
                "trigger-123",
                "workflow-456",
                config
            );

            expect(scheduleId).toBe("trigger-trigger-123");
            expect(mockTemporalClient.schedule.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    scheduleId: "trigger-trigger-123",
                    spec: {
                        cronExpressions: ["0 9 * * *"],
                        timezone: "America/New_York"
                    }
                })
            );
        });

        it("should use UTC timezone by default", async () => {
            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await service.createScheduledTrigger("trigger-123", "workflow-456", config);

            expect(mockTemporalClient.schedule.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    spec: expect.objectContaining({
                        timezone: "UTC"
                    })
                })
            );
        });

        it("should configure workflow action", async () => {
            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await service.createScheduledTrigger("trigger-123", "workflow-456", config);

            expect(mockTemporalClient.schedule.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: expect.objectContaining({
                        type: "startWorkflow",
                        workflowType: "triggeredWorkflow",
                        taskQueue: "flowmaestro-orchestrator",
                        args: [
                            expect.objectContaining({
                                triggerId: "trigger-123",
                                workflowId: "workflow-456"
                            })
                        ]
                    })
                })
            );
        });

        it("should set paused state based on enabled config", async () => {
            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: false
            };

            await service.createScheduledTrigger("trigger-123", "workflow-456", config);

            expect(mockTemporalClient.schedule.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: expect.objectContaining({
                        paused: true
                    })
                })
            );
        });

        it("should update trigger with schedule ID", async () => {
            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await service.createScheduledTrigger("trigger-123", "workflow-456", config);

            expect(mockTriggerRepo.update).toHaveBeenCalledWith("trigger-123", {
                temporal_schedule_id: "trigger-trigger-123"
            });
        });

        it("should throw error on Temporal failure", async () => {
            mockTemporalClient.schedule.create.mockRejectedValue(new Error("Temporal unavailable"));

            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await expect(
                service.createScheduledTrigger("trigger-123", "workflow-456", config)
            ).rejects.toThrow("Failed to create schedule");
        });
    });

    describe("updateScheduledTrigger", () => {
        it("should update existing schedule", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            const config: ScheduleTriggerConfig = {
                cronExpression: "0 10 * * *",
                timezone: "Europe/London",
                enabled: true
            };

            await service.updateScheduledTrigger("trigger-123", config);

            expect(mockScheduleHandle.update).toHaveBeenCalled();
        });

        it("should throw if trigger not found", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await expect(service.updateScheduledTrigger("trigger-123", config)).rejects.toThrow(
                "Trigger not found"
            );
        });

        it("should throw if trigger has no schedule ID", async () => {
            mockTriggerRepo.findById.mockResolvedValue(
                createMockTrigger({ temporal_schedule_id: null })
            );

            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await expect(service.updateScheduledTrigger("trigger-123", config)).rejects.toThrow(
                "has no schedule ID"
            );
        });

        it("should handle Temporal update failure", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.update.mockRejectedValue(new Error("Update failed"));

            const config: ScheduleTriggerConfig = {
                cronExpression: "0 9 * * *",
                enabled: true
            };

            await expect(service.updateScheduledTrigger("trigger-123", config)).rejects.toThrow(
                "Failed to update schedule"
            );
        });
    });

    describe("pauseScheduledTrigger", () => {
        it("should pause the schedule", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            await service.pauseScheduledTrigger("trigger-123");

            expect(mockScheduleHandle.pause).toHaveBeenCalledWith("Paused by user");
        });

        it("should update trigger enabled status", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            await service.pauseScheduledTrigger("trigger-123");

            expect(mockTriggerRepo.update).toHaveBeenCalledWith("trigger-123", {
                enabled: false
            });
        });

        it("should throw if trigger not found", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            await expect(service.pauseScheduledTrigger("trigger-123")).rejects.toThrow(
                "Trigger not found or has no schedule"
            );
        });

        it("should throw if trigger has no schedule", async () => {
            mockTriggerRepo.findById.mockResolvedValue(
                createMockTrigger({ temporal_schedule_id: null })
            );

            await expect(service.pauseScheduledTrigger("trigger-123")).rejects.toThrow(
                "Trigger not found or has no schedule"
            );
        });

        it("should handle Temporal pause failure", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.pause.mockRejectedValue(new Error("Pause failed"));

            await expect(service.pauseScheduledTrigger("trigger-123")).rejects.toThrow(
                "Failed to pause schedule"
            );
        });
    });

    describe("resumeScheduledTrigger", () => {
        it("should resume the schedule", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            await service.resumeScheduledTrigger("trigger-123");

            expect(mockScheduleHandle.unpause).toHaveBeenCalledWith("Resumed by user");
        });

        it("should update trigger enabled status", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            await service.resumeScheduledTrigger("trigger-123");

            expect(mockTriggerRepo.update).toHaveBeenCalledWith("trigger-123", {
                enabled: true
            });
        });

        it("should throw if trigger not found", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            await expect(service.resumeScheduledTrigger("trigger-123")).rejects.toThrow(
                "Trigger not found or has no schedule"
            );
        });

        it("should handle Temporal unpause failure", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.unpause.mockRejectedValue(new Error("Unpause failed"));

            await expect(service.resumeScheduledTrigger("trigger-123")).rejects.toThrow(
                "Failed to resume schedule"
            );
        });
    });

    describe("deleteScheduledTrigger", () => {
        it("should delete the schedule from Temporal", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            await service.deleteScheduledTrigger("trigger-123");

            expect(mockScheduleHandle.delete).toHaveBeenCalled();
        });

        it("should not throw if trigger not found", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            await expect(service.deleteScheduledTrigger("trigger-123")).resolves.not.toThrow();
        });

        it("should not throw if trigger has no schedule ID", async () => {
            mockTriggerRepo.findById.mockResolvedValue(
                createMockTrigger({ temporal_schedule_id: null })
            );

            await expect(service.deleteScheduledTrigger("trigger-123")).resolves.not.toThrow();
        });

        it("should not throw on Temporal delete failure", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.delete.mockRejectedValue(new Error("Delete failed"));

            // Should not throw - delete failures are logged but not propagated
            await expect(service.deleteScheduledTrigger("trigger-123")).resolves.not.toThrow();
        });
    });

    describe("getScheduleInfo", () => {
        it("should return schedule information", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            const info = await service.getScheduleInfo("trigger-123");

            expect(info).toEqual(
                expect.objectContaining({
                    scheduleId: "trigger-trigger-123",
                    state: expect.any(Object),
                    spec: expect.any(Object)
                })
            );
        });

        it("should include next run time", async () => {
            const nextRun = new Date("2024-01-15T09:00:00Z");
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.describe.mockResolvedValue({
                state: { paused: false },
                spec: { cronExpressions: ["0 9 * * *"] },
                info: { nextActionTimes: [nextRun] }
            });

            const info = await service.getScheduleInfo("trigger-123");

            expect(info).toEqual(
                expect.objectContaining({
                    nextRunTime: nextRun
                })
            );
        });

        it("should throw if trigger not found", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            await expect(service.getScheduleInfo("trigger-123")).rejects.toThrow(
                "Trigger not found or has no schedule"
            );
        });

        it("should handle Temporal describe failure", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.describe.mockRejectedValue(new Error("Describe failed"));

            await expect(service.getScheduleInfo("trigger-123")).rejects.toThrow(
                "Failed to get schedule info"
            );
        });
    });

    describe("triggerNow", () => {
        it("should manually trigger the schedule", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());

            const result = await service.triggerNow("trigger-123");

            expect(result).toBe("trigger-trigger-123");
            expect(mockScheduleHandle.trigger).toHaveBeenCalled();
        });

        it("should throw if trigger not found", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            await expect(service.triggerNow("trigger-123")).rejects.toThrow(
                "Trigger not found or has no schedule"
            );
        });

        it("should handle Temporal trigger failure", async () => {
            mockTriggerRepo.findById.mockResolvedValue(createMockTrigger());
            mockScheduleHandle.trigger.mockRejectedValue(new Error("Trigger failed"));

            await expect(service.triggerNow("trigger-123")).rejects.toThrow(
                "Failed to trigger schedule"
            );
        });
    });

    describe("initializeScheduledTriggers", () => {
        it("should initialize all scheduled triggers on startup", async () => {
            const triggers = [
                createMockTrigger({ id: "trigger-1", temporal_schedule_id: null }),
                createMockTrigger({ id: "trigger-2", temporal_schedule_id: null })
            ];
            mockTriggerRepo.findByType.mockResolvedValue(triggers);

            await service.initializeScheduledTriggers();

            expect(mockTemporalClient.schedule.create).toHaveBeenCalledTimes(2);
        });

        it("should skip triggers with existing schedules", async () => {
            const triggers = [
                createMockTrigger({
                    id: "trigger-1",
                    temporal_schedule_id: "trigger-trigger-1"
                })
            ];
            mockTriggerRepo.findByType.mockResolvedValue(triggers);
            // Schedule exists
            mockScheduleHandle.describe.mockResolvedValue({
                state: { paused: false }
            });

            await service.initializeScheduledTriggers();

            // Should check if exists but not create new
            expect(mockTemporalClient.schedule.getHandle).toHaveBeenCalled();
            expect(mockTemporalClient.schedule.create).not.toHaveBeenCalled();
        });

        it("should recreate schedule if not found in Temporal", async () => {
            const triggers = [
                createMockTrigger({
                    id: "trigger-1",
                    temporal_schedule_id: "trigger-trigger-1"
                })
            ];
            mockTriggerRepo.findByType.mockResolvedValue(triggers);
            // Schedule doesn't exist
            mockScheduleHandle.describe.mockRejectedValue(new Error("Schedule not found"));

            await service.initializeScheduledTriggers();

            // Should create the schedule
            expect(mockTemporalClient.schedule.create).toHaveBeenCalled();
        });

        it("should continue on individual trigger failures", async () => {
            const triggers = [
                createMockTrigger({ id: "trigger-1", temporal_schedule_id: null }),
                createMockTrigger({ id: "trigger-2", temporal_schedule_id: null })
            ];
            mockTriggerRepo.findByType.mockResolvedValue(triggers);
            // First fails, second succeeds
            mockTemporalClient.schedule.create
                .mockRejectedValueOnce(new Error("Failed"))
                .mockResolvedValueOnce({});

            await expect(service.initializeScheduledTriggers()).resolves.not.toThrow();

            // Should attempt both
            expect(mockTemporalClient.schedule.create).toHaveBeenCalledTimes(2);
        });

        it("should handle empty trigger list", async () => {
            mockTriggerRepo.findByType.mockResolvedValue([]);

            await expect(service.initializeScheduledTriggers()).resolves.not.toThrow();
        });
    });
});
