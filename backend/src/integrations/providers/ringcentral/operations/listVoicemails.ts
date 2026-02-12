import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const listVoicemailsSchema = z.object({
    dateFrom: z.string().optional().describe("Start date (ISO 8601 format)"),
    dateTo: z.string().optional().describe("End date (ISO 8601 format)"),
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
    perPage: z.number().min(1).max(1000).optional().describe("Results per page (default: 100)")
});

export type ListVoicemailsParams = z.infer<typeof listVoicemailsSchema>;

export const listVoicemailsOperation: OperationDefinition = {
    id: "listVoicemails",
    name: "List Voicemails",
    description: "List voicemail messages",
    category: "data",
    inputSchema: listVoicemailsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListVoicemails(
    client: RingCentralClient,
    params: ListVoicemailsParams
): Promise<OperationResult> {
    try {
        const response = await client.listVoicemails({
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            page: params.page,
            perPage: params.perPage
        });

        return {
            success: true,
            data: {
                voicemails: response.records.map((vm) => ({
                    id: vm.id,
                    direction: vm.direction,
                    readStatus: vm.readStatus,
                    from: vm.from.phoneNumber,
                    fromName: vm.from.name,
                    createdAt: vm.creationTime,
                    subject: vm.subject,
                    hasAttachments: (vm.attachments?.length || 0) > 0
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
                message: error instanceof Error ? error.message : "Failed to list voicemails",
                retryable: true
            }
        };
    }
}
