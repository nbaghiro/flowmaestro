import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Schedules operation schema
 */
export const listSchedulesSchema = z.object({}).describe("No parameters required");

export type ListSchedulesParams = z.infer<typeof listSchedulesSchema>;

/**
 * List Schedules operation definition
 */
export const listSchedulesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listSchedules",
            name: "List Schedules",
            description: "List the user's availability schedules",
            category: "data",
            actionType: "read",
            inputSchema: listSchedulesSchema,
            inputSchemaJSON: toJSONSchema(listSchedulesSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "CalCom", err: error },
            "Failed to create listSchedulesOperation"
        );
        throw new Error(
            `Failed to create listSchedules operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list schedules operation
 */
export async function executeListSchedules(
    client: CalComClient,
    _params: ListSchedulesParams
): Promise<OperationResult> {
    try {
        const response = await client.listSchedules();

        return {
            success: true,
            data: {
                schedules: response.data.map((schedule) => ({
                    id: schedule.id,
                    name: schedule.name,
                    isDefault: schedule.isDefault,
                    timeZone: schedule.timeZone,
                    availability: schedule.availability.map((a) => ({
                        id: a.id,
                        days: a.days,
                        startTime: a.startTime,
                        endTime: a.endTime,
                        date: a.date
                    }))
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list schedules",
                retryable: true
            }
        };
    }
}
