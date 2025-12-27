/**
 * Trigger.dev Scheduler Service
 *
 * Provides schedule management for workflow triggers using Trigger.dev's schedules API.
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("TriggerScheduler");

export interface ScheduleConfig {
    id: string;
    workflowId: string;
    userId: string;
    cronExpression?: string;
    interval?: number;
    enabled: boolean;
}

export interface ScheduleInfo {
    id: string;
    workflowId: string;
    cronExpression?: string;
    interval?: number;
    enabled: boolean;
    nextRunTime?: Date;
    lastRunTime?: Date;
}

export interface ScheduleTriggerConfig {
    cronExpression?: string;
    interval?: number;
    timezone?: string;
}

/**
 * SchedulerService - Manages scheduled workflow triggers via Trigger.dev
 *
 * Uses Trigger.dev's imperative schedules API to create/update/delete
 * scheduled workflow executions.
 */
export class SchedulerService {
    /**
     * Create a scheduled trigger for a workflow
     */
    async createScheduledTrigger(
        triggerId: string,
        workflowId: string,
        config: ScheduleTriggerConfig
    ): Promise<void> {
        const scheduleId = `trigger-${triggerId}`;

        try {
            // Build the cron expression or calculate from interval
            let cron: string;
            if (config.cronExpression) {
                cron = config.cronExpression;
            } else if (config.interval) {
                // Convert interval (seconds) to cron expression
                // For simplicity, we support intervals that map to cron patterns
                cron = this.intervalToCron(config.interval);
            } else {
                throw new Error("Either cronExpression or interval is required");
            }

            // Create the schedule via Trigger.dev
            await schedules.create({
                task: "scheduled-workflow-executor",
                cron,
                externalId: scheduleId,
                deduplicationKey: scheduleId,
                timezone: config.timezone || "UTC"
            });

            logger.info(
                { triggerId, workflowId, cron },
                "Created scheduled trigger"
            );
        } catch (error) {
            logger.error(
                { triggerId, workflowId, error },
                "Failed to create scheduled trigger"
            );
            throw error;
        }
    }

    /**
     * Update a scheduled trigger
     */
    async updateScheduledTrigger(
        triggerId: string,
        config: Partial<ScheduleTriggerConfig>
    ): Promise<void> {
        const scheduleId = `trigger-${triggerId}`;

        try {
            // Build the new cron expression if provided
            let cron: string | undefined;
            if (config.cronExpression) {
                cron = config.cronExpression;
            } else if (config.interval) {
                cron = this.intervalToCron(config.interval);
            }

            // Delete and recreate the schedule with new settings
            // Trigger.dev update API requires all fields
            try {
                await schedules.del(scheduleId);
            } catch {
                // May not exist
            }

            if (cron) {
                await schedules.create({
                    task: "scheduled-workflow-executor",
                    cron,
                    externalId: scheduleId,
                    deduplicationKey: scheduleId,
                    timezone: config.timezone || "UTC"
                });
            }

            logger.info({ triggerId, cron }, "Updated scheduled trigger");
        } catch (error) {
            logger.error({ triggerId, error }, "Failed to update scheduled trigger");
            throw error;
        }
    }

    /**
     * Delete a scheduled trigger
     */
    async deleteScheduledTrigger(triggerId: string): Promise<void> {
        const scheduleId = `trigger-${triggerId}`;

        try {
            await schedules.del(scheduleId);
            logger.info({ triggerId }, "Deleted scheduled trigger");
        } catch (error) {
            // Ignore not found errors
            if (error instanceof Error && error.message.includes("not found")) {
                logger.warn({ triggerId }, "Schedule not found, may already be deleted");
                return;
            }
            logger.error({ triggerId, error }, "Failed to delete scheduled trigger");
            throw error;
        }
    }

    /**
     * Pause a scheduled trigger
     */
    async pauseScheduledTrigger(triggerId: string): Promise<void> {
        const scheduleId = `trigger-${triggerId}`;

        try {
            await schedules.deactivate(scheduleId);
            logger.info({ triggerId }, "Paused scheduled trigger");
        } catch (error) {
            logger.error({ triggerId, error }, "Failed to pause scheduled trigger");
            throw error;
        }
    }

    /**
     * Resume a scheduled trigger
     */
    async resumeScheduledTrigger(triggerId: string): Promise<void> {
        const scheduleId = `trigger-${triggerId}`;

        try {
            await schedules.activate(scheduleId);
            logger.info({ triggerId }, "Resumed scheduled trigger");
        } catch (error) {
            logger.error({ triggerId, error }, "Failed to resume scheduled trigger");
            throw error;
        }
    }

    /**
     * Get info about a scheduled trigger
     */
    async getScheduleInfo(triggerId: string): Promise<ScheduleInfo | null> {
        const scheduleId = `trigger-${triggerId}`;

        try {
            const schedule = await schedules.retrieve(scheduleId);

            if (!schedule) {
                return null;
            }

            // Extract cron expression from generator
            const cronExpression = schedule.generator?.type === "CRON"
                ? schedule.generator.expression
                : undefined;

            return {
                id: triggerId,
                workflowId: "", // Would need to be looked up from trigger table
                cronExpression,
                enabled: schedule.active,
                nextRunTime: schedule.nextRun ? new Date(schedule.nextRun) : undefined,
                lastRunTime: undefined // Not directly available in the API response
            };
        } catch (error) {
            // Return null if not found
            if (error instanceof Error && error.message.includes("not found")) {
                return null;
            }
            logger.error({ triggerId, error }, "Failed to get schedule info");
            throw error;
        }
    }

    /**
     * Convert interval in seconds to cron expression
     */
    private intervalToCron(intervalSeconds: number): string {
        // Common intervals to cron mappings
        if (intervalSeconds <= 60) {
            // Every minute
            return "* * * * *";
        } else if (intervalSeconds <= 300) {
            // Every 5 minutes
            return "*/5 * * * *";
        } else if (intervalSeconds <= 600) {
            // Every 10 minutes
            return "*/10 * * * *";
        } else if (intervalSeconds <= 900) {
            // Every 15 minutes
            return "*/15 * * * *";
        } else if (intervalSeconds <= 1800) {
            // Every 30 minutes
            return "*/30 * * * *";
        } else if (intervalSeconds <= 3600) {
            // Every hour
            return "0 * * * *";
        } else if (intervalSeconds <= 21600) {
            // Every 6 hours
            return "0 */6 * * *";
        } else if (intervalSeconds <= 43200) {
            // Every 12 hours
            return "0 */12 * * *";
        } else if (intervalSeconds <= 86400) {
            // Daily
            return "0 0 * * *";
        } else if (intervalSeconds <= 604800) {
            // Weekly
            return "0 0 * * 0";
        } else {
            // Monthly
            return "0 0 1 * *";
        }
    }
}
