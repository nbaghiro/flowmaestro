import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Set Alarm State operation schema
 */
export const setAlarmStateSchema = z.object({
    alarmName: z.string().describe("Alarm name"),
    stateValue: z.enum(["OK", "ALARM", "INSUFFICIENT_DATA"]).describe("New state value"),
    stateReason: z.string().describe("Reason for state change"),
    stateReasonData: z.string().optional().describe("JSON data for state reason")
});

export type SetAlarmStateParams = z.infer<typeof setAlarmStateSchema>;

/**
 * Set Alarm State operation definition
 */
export const setAlarmStateOperation: OperationDefinition = {
    id: "cloudwatch_setAlarmState",
    name: "Set CloudWatch Alarm State",
    description: "Update alarm state (for testing or manual intervention)",
    category: "cloudwatch",
    inputSchema: setAlarmStateSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute set alarm state operation
 */
export async function executeSetAlarmState(
    client: AWSClient,
    params: SetAlarmStateParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            Action: "SetAlarmState",
            AlarmName: params.alarmName,
            StateValue: params.stateValue,
            StateReason: params.stateReason,
            Version: "2010-08-01"
        };

        if (params.stateReasonData) {
            queryParams.StateReasonData = params.stateReasonData;
        }

        await client.monitoring.get("/", queryParams);

        return {
            success: true,
            data: {
                alarmName: params.alarmName,
                stateValue: params.stateValue,
                stateReason: params.stateReason,
                updatedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to set alarm state",
                retryable: false
            }
        };
    }
}
