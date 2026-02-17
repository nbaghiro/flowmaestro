import { z } from "zod";
import type { ActiveCampaignAutomationOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getAutomationsSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of automations to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of automations to skip")
});

export type GetAutomationsParams = z.infer<typeof getAutomationsSchema>;

export const getAutomationsOperation: OperationDefinition = {
    id: "getAutomations",
    name: "Get Automations",
    description: "Get all automations from ActiveCampaign",
    category: "automations",
    inputSchema: getAutomationsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetAutomations(
    client: ActiveCampaignClient,
    params: GetAutomationsParams
): Promise<OperationResult> {
    try {
        const response = await client.getAutomations({
            limit: params.limit,
            offset: params.offset
        });

        const automations: ActiveCampaignAutomationOutput[] = response.automations.map(
            (automation) => ({
                id: automation.id,
                name: automation.name,
                status: automation.status === "1" ? "active" : "inactive",
                enteredCount: automation.entered,
                exitedCount: automation.exited,
                createdAt: automation.cdate,
                updatedAt: automation.mdate
            })
        );

        return {
            success: true,
            data: {
                automations,
                total: parseInt(response.meta.total, 10),
                hasMore: automations.length === (params.limit || 20)
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get automations",
                retryable: true
            }
        };
    }
}
