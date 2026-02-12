import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const getCallLogsSchema = z.object({
    type: z.enum(["Voice", "Fax"]).optional().describe("Filter by call type"),
    direction: z.enum(["Inbound", "Outbound"]).optional().describe("Filter by direction"),
    dateFrom: z.string().optional().describe("Start date (ISO 8601 format)"),
    dateTo: z.string().optional().describe("End date (ISO 8601 format)"),
    view: z.enum(["Simple", "Detailed"]).optional().describe("Response detail level"),
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
    perPage: z.number().min(1).max(1000).optional().describe("Results per page (default: 100)")
});

export type GetCallLogsParams = z.infer<typeof getCallLogsSchema>;

export const getCallLogsOperation: OperationDefinition = {
    id: "getCallLogs",
    name: "Get Call Logs",
    description: "Retrieve call history",
    category: "data",
    inputSchema: getCallLogsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetCallLogs(
    client: RingCentralClient,
    params: GetCallLogsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCallLogs({
            type: params.type,
            direction: params.direction,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            view: params.view,
            page: params.page,
            perPage: params.perPage
        });

        return {
            success: true,
            data: {
                callLogs: response.records.map((log) => ({
                    id: log.id,
                    sessionId: log.sessionId,
                    startTime: log.startTime,
                    duration: log.duration,
                    type: log.type,
                    direction: log.direction,
                    action: log.action,
                    result: log.result,
                    from: log.from
                        ? {
                              phoneNumber: log.from.phoneNumber,
                              name: log.from.name,
                              location: log.from.location
                          }
                        : null,
                    to: log.to
                        ? {
                              phoneNumber: log.to.phoneNumber,
                              name: log.to.name,
                              location: log.to.location
                          }
                        : null,
                    hasRecording: !!log.recording
                })),
                pagination: {
                    page: response.paging.page,
                    perPage: response.paging.perPage,
                    totalPages: response.paging.totalPages,
                    totalElements: response.paging.totalElements,
                    hasNext: !!response.navigation.nextPage
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get call logs",
                retryable: true
            }
        };
    }
}
