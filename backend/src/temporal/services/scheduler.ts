/**
 * Temporal Scheduler Service
 * Manages scheduled workflow executions using Temporal Schedules
 */

import { ScheduleOverlapPolicy } from "@temporalio/client";
import { ScheduleTriggerConfig } from "../../storage/models/Trigger";
import { TriggerRepository } from "../../storage/repositories/TriggerRepository";
import { getTemporalClient } from "../client";

export class SchedulerService {
    private triggerRepo: TriggerRepository;

    constructor() {
        this.triggerRepo = new TriggerRepository();
    }

    /**
     * Create a new scheduled workflow trigger
     * Registers the schedule with Temporal
     */
    async createScheduledTrigger(
        triggerId: string,
        workflowId: string,
        config: ScheduleTriggerConfig
    ): Promise<string> {
        const client = await getTemporalClient();

        // Generate unique schedule ID
        const scheduleId = `trigger-${triggerId}`;

        try {
            // Create schedule in Temporal
            await client.schedule.create({
                scheduleId,
                spec: {
                    cronExpressions: [config.cronExpression],
                    timezone: config.timezone || "UTC"
                },
                action: {
                    type: "startWorkflow",
                    workflowType: "triggeredWorkflow",
                    args: [
                        {
                            triggerId,
                            workflowId,
                            payload: {}
                        }
                    ],
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId: `${scheduleId}-${Date.now()}`
                },
                policies: {
                    overlap: ScheduleOverlapPolicy.BUFFER_ONE,
                    catchupWindow: "1 minute"
                },
                state: {
                    paused: !config.enabled,
                    note: `Scheduled trigger for workflow ${workflowId}`
                }
            });

            console.log(`Created Temporal schedule: ${scheduleId}`);

            // Update trigger with schedule ID
            await this.triggerRepo.update(triggerId, {
                temporal_schedule_id: scheduleId
            });

            return scheduleId;
        } catch (error) {
            console.error(`Failed to create schedule ${scheduleId}:`, error);
            throw new Error(`Failed to create schedule: ${error}`);
        }
    }

    /**
     * Update an existing scheduled trigger
     */
    async updateScheduledTrigger(triggerId: string, config: ScheduleTriggerConfig): Promise<void> {
        const trigger = await this.triggerRepo.findById(triggerId);
        if (!trigger) {
            throw new Error(`Trigger not found: ${triggerId}`);
        }

        if (!trigger.temporal_schedule_id) {
            throw new Error(`Trigger ${triggerId} has no schedule ID`);
        }

        const client = await getTemporalClient();

        try {
            const handle = client.schedule.getHandle(trigger.temporal_schedule_id);

            // Update the schedule
            await handle.update((schedule) => {
                return {
                    ...schedule,
                    spec: {
                        cronExpressions: [config.cronExpression],
                        timezone: config.timezone || "UTC"
                    },
                    state: {
                        ...schedule.state,
                        paused: !config.enabled
                    }
                };
            });

            console.log(`Updated Temporal schedule: ${trigger.temporal_schedule_id}`);
        } catch (error) {
            console.error(`Failed to update schedule ${trigger.temporal_schedule_id}:`, error);
            throw new Error(`Failed to update schedule: ${error}`);
        }
    }

    /**
     * Pause a scheduled trigger
     */
    async pauseScheduledTrigger(triggerId: string): Promise<void> {
        const trigger = await this.triggerRepo.findById(triggerId);
        if (!trigger || !trigger.temporal_schedule_id) {
            throw new Error(`Trigger not found or has no schedule: ${triggerId}`);
        }

        const client = await getTemporalClient();

        try {
            const handle = client.schedule.getHandle(trigger.temporal_schedule_id);
            await handle.pause("Paused by user");

            await this.triggerRepo.update(triggerId, { enabled: false });
            console.log(`Paused schedule: ${trigger.temporal_schedule_id}`);
        } catch (error) {
            console.error(`Failed to pause schedule ${trigger.temporal_schedule_id}:`, error);
            throw new Error(`Failed to pause schedule: ${error}`);
        }
    }

    /**
     * Resume a paused scheduled trigger
     */
    async resumeScheduledTrigger(triggerId: string): Promise<void> {
        const trigger = await this.triggerRepo.findById(triggerId);
        if (!trigger || !trigger.temporal_schedule_id) {
            throw new Error(`Trigger not found or has no schedule: ${triggerId}`);
        }

        const client = await getTemporalClient();

        try {
            const handle = client.schedule.getHandle(trigger.temporal_schedule_id);
            await handle.unpause("Resumed by user");

            await this.triggerRepo.update(triggerId, { enabled: true });
            console.log(`Resumed schedule: ${trigger.temporal_schedule_id}`);
        } catch (error) {
            console.error(`Failed to resume schedule ${trigger.temporal_schedule_id}:`, error);
            throw new Error(`Failed to resume schedule: ${error}`);
        }
    }

    /**
     * Delete a scheduled trigger
     */
    async deleteScheduledTrigger(triggerId: string): Promise<void> {
        const trigger = await this.triggerRepo.findById(triggerId);
        if (!trigger) {
            console.warn(`Trigger not found: ${triggerId}`);
            return;
        }

        if (!trigger.temporal_schedule_id) {
            console.warn(`Trigger ${triggerId} has no schedule ID, skipping Temporal deletion`);
            return;
        }

        const client = await getTemporalClient();

        try {
            const handle = client.schedule.getHandle(trigger.temporal_schedule_id);
            await handle.delete();
            console.log(`Deleted Temporal schedule: ${trigger.temporal_schedule_id}`);
        } catch (error) {
            // Log but don't fail if schedule doesn't exist
            console.error(`Failed to delete schedule ${trigger.temporal_schedule_id}:`, error);
        }
    }

    /**
     * Get schedule information from Temporal
     */
    async getScheduleInfo(triggerId: string): Promise<unknown> {
        const trigger = await this.triggerRepo.findById(triggerId);
        if (!trigger || !trigger.temporal_schedule_id) {
            throw new Error(`Trigger not found or has no schedule: ${triggerId}`);
        }

        const client = await getTemporalClient();

        try {
            const handle = client.schedule.getHandle(trigger.temporal_schedule_id);
            const description = await handle.describe();

            return {
                scheduleId: trigger.temporal_schedule_id,
                state: description.state,
                spec: description.spec,
                info: description.info,
                nextRunTime: description.info.nextActionTimes?.[0]
            };
        } catch (error) {
            console.error(
                `Failed to get schedule info for ${trigger.temporal_schedule_id}:`,
                error
            );
            throw new Error(`Failed to get schedule info: ${error}`);
        }
    }

    /**
     * Trigger a scheduled workflow immediately (manual run)
     */
    async triggerNow(triggerId: string): Promise<string> {
        const trigger = await this.triggerRepo.findById(triggerId);
        if (!trigger || !trigger.temporal_schedule_id) {
            throw new Error(`Trigger not found or has no schedule: ${triggerId}`);
        }

        const client = await getTemporalClient();

        try {
            const handle = client.schedule.getHandle(trigger.temporal_schedule_id);
            await handle.trigger(ScheduleOverlapPolicy.ALLOW_ALL);

            console.log(`Manually triggered schedule: ${trigger.temporal_schedule_id}`);
            return trigger.temporal_schedule_id;
        } catch (error) {
            console.error(`Failed to trigger schedule ${trigger.temporal_schedule_id}:`, error);
            throw new Error(`Failed to trigger schedule: ${error}`);
        }
    }

    /**
     * Initialize all existing scheduled triggers on system startup
     * This ensures schedules are synced with Temporal after a restart
     */
    async initializeScheduledTriggers(): Promise<void> {
        console.log("Initializing scheduled triggers...");

        const scheduledTriggers = await this.triggerRepo.findByType("schedule");

        for (const trigger of scheduledTriggers) {
            try {
                const config = trigger.config as ScheduleTriggerConfig;

                // Check if schedule already exists in Temporal
                if (trigger.temporal_schedule_id) {
                    const client = await getTemporalClient();
                    try {
                        const handle = client.schedule.getHandle(trigger.temporal_schedule_id);
                        await handle.describe();
                        console.log(`Schedule already exists: ${trigger.temporal_schedule_id}`);
                        continue;
                    } catch (_error) {
                        // Schedule doesn't exist, will recreate
                        console.log(
                            `Schedule not found in Temporal, recreating: ${trigger.temporal_schedule_id}`
                        );
                    }
                }

                // Create the schedule
                await this.createScheduledTrigger(trigger.id, trigger.workflow_id, config);

                console.log(`Initialized schedule for trigger: ${trigger.id}`);
            } catch (error) {
                console.error(`Failed to initialize trigger ${trigger.id}:`, error);
            }
        }

        console.log(`Initialized ${scheduledTriggers.length} scheduled triggers`);
    }
}
