import { z } from "zod";
import { MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * List Alarms operation schema
 */
export const listAlarmsSchema = z.object({
    alarmNames: z.array(z.string()).optional().describe("Specific alarm names to retrieve"),
    alarmNamePrefix: z.string().optional().describe("Alarm name prefix filter"),
    stateValue: z
        .enum(["OK", "ALARM", "INSUFFICIENT_DATA"])
        .optional()
        .describe("Filter by alarm state"),
    actionPrefix: z.string().optional().describe("Action name prefix filter"),
    maxRecords: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type ListAlarmsParams = z.infer<typeof listAlarmsSchema>;

/**
 * List Alarms operation definition
 */
export const listAlarmsOperation: OperationDefinition = {
    id: "cloudwatch_listAlarms",
    name: "List CloudWatch Alarms",
    description: "List CloudWatch alarms with optional filters",
    category: "cloudwatch",
    inputSchema: listAlarmsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list alarms operation
 */
export async function executeListAlarms(
    client: AWSClient,
    params: ListAlarmsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            Action: "DescribeAlarms",
            Version: "2010-08-01"
        };

        if (params.alarmNames && params.alarmNames.length > 0) {
            params.alarmNames.forEach((name, index) => {
                queryParams[`AlarmNames.member.${index + 1}`] = name;
            });
        }

        if (params.alarmNamePrefix) {
            queryParams.AlarmNamePrefix = params.alarmNamePrefix;
        }

        if (params.stateValue) {
            queryParams.StateValue = params.stateValue;
        }

        if (params.actionPrefix) {
            queryParams.ActionPrefix = params.actionPrefix;
        }

        if (params.maxRecords) {
            queryParams.MaxRecords = params.maxRecords.toString();
        }

        if (params.nextToken) {
            queryParams.NextToken = params.nextToken;
        }

        const response = await client.monitoring.get<{
            DescribeAlarmsResponse: {
                DescribeAlarmsResult: {
                    MetricAlarms: {
                        member: Array<{
                            AlarmName: string;
                            AlarmArn: string;
                            AlarmDescription?: string;
                            StateValue: string;
                            StateReason: string;
                            StateUpdatedTimestamp: string;
                            MetricName: string;
                            Namespace: string;
                            ComparisonOperator: string;
                            Threshold: number;
                            EvaluationPeriods: number;
                            Period: number;
                            Statistic?: string;
                            ActionsEnabled: boolean;
                        }>;
                    };
                    NextToken?: string;
                };
            };
        }>("/", queryParams);

        const result = response.DescribeAlarmsResponse.DescribeAlarmsResult;
        const alarms = result.MetricAlarms.member || [];

        return {
            success: true,
            data: {
                alarms: alarms.map((alarm) => ({
                    alarmName: alarm.AlarmName,
                    alarmArn: alarm.AlarmArn,
                    description: alarm.AlarmDescription,
                    stateValue: alarm.StateValue,
                    stateReason: alarm.StateReason,
                    stateUpdatedTimestamp: alarm.StateUpdatedTimestamp,
                    metricName: alarm.MetricName,
                    namespace: alarm.Namespace,
                    comparisonOperator: alarm.ComparisonOperator,
                    threshold: alarm.Threshold,
                    evaluationPeriods: alarm.EvaluationPeriods,
                    period: alarm.Period,
                    statistic: alarm.Statistic,
                    actionsEnabled: alarm.ActionsEnabled
                })),
                nextToken: result.NextToken,
                alarmCount: alarms.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list alarms",
                retryable: true
            }
        };
    }
}
