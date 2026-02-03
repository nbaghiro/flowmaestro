import { z } from "zod";
import { ISO8601TimestampSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Get Alarm History operation schema
 */
export const getAlarmHistorySchema = z.object({
    alarmName: z.string().describe("Alarm name"),
    historyItemType: z
        .enum(["ConfigurationUpdate", "StateUpdate", "Action"])
        .optional()
        .describe("Type of history items to retrieve"),
    startDate: ISO8601TimestampSchema.optional().describe("Start of time range"),
    endDate: ISO8601TimestampSchema.optional().describe("End of time range"),
    maxRecords: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type GetAlarmHistoryParams = z.infer<typeof getAlarmHistorySchema>;

/**
 * Get Alarm History operation definition
 */
export const getAlarmHistoryOperation: OperationDefinition = {
    id: "cloudwatch_getAlarmHistory",
    name: "Get CloudWatch Alarm History",
    description: "Get alarm state changes and configuration updates",
    category: "cloudwatch",
    inputSchema: getAlarmHistorySchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get alarm history operation
 */
export async function executeGetAlarmHistory(
    client: AWSClient,
    params: GetAlarmHistoryParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            Action: "DescribeAlarmHistory",
            AlarmName: params.alarmName,
            Version: "2010-08-01"
        };

        if (params.historyItemType) {
            queryParams.HistoryItemType = params.historyItemType;
        }

        if (params.startDate) {
            queryParams.StartDate = new Date(params.startDate).toISOString();
        }

        if (params.endDate) {
            queryParams.EndDate = new Date(params.endDate).toISOString();
        }

        if (params.maxRecords) {
            queryParams.MaxRecords = params.maxRecords.toString();
        }

        if (params.nextToken) {
            queryParams.NextToken = params.nextToken;
        }

        const response = await client.monitoring.get<{
            DescribeAlarmHistoryResponse: {
                DescribeAlarmHistoryResult: {
                    AlarmHistoryItems: {
                        member: Array<{
                            AlarmName: string;
                            Timestamp: string;
                            HistoryItemType: string;
                            HistorySummary: string;
                            HistoryData: string;
                        }>;
                    };
                    NextToken?: string;
                };
            };
        }>("/", queryParams);

        const result = response.DescribeAlarmHistoryResponse.DescribeAlarmHistoryResult;
        const historyItems = result.AlarmHistoryItems.member || [];

        return {
            success: true,
            data: {
                alarmName: params.alarmName,
                historyItems: historyItems.map((item) => ({
                    alarmName: item.AlarmName,
                    timestamp: item.Timestamp,
                    historyItemType: item.HistoryItemType,
                    historySummary: item.HistorySummary,
                    historyData: JSON.parse(item.HistoryData)
                })),
                nextToken: result.NextToken,
                itemCount: historyItems.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get alarm history",
                retryable: true
            }
        };
    }
}
