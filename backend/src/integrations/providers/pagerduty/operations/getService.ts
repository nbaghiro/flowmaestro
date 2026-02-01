import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const getServiceSchema = z.object({
    serviceId: z.string().min(1).describe("The ID of the service to retrieve"),
    include: z
        .array(z.enum(["escalation_policies", "teams", "integrations"]))
        .optional()
        .describe("Additional data to include in the response")
});

export type GetServiceParams = z.infer<typeof getServiceSchema>;

export const getServiceOperation: OperationDefinition = {
    id: "getService",
    name: "Get Service",
    description: "Get a single service by ID with full details",
    category: "services",
    inputSchema: getServiceSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetService(
    client: PagerDutyClient,
    params: GetServiceParams
): Promise<OperationResult> {
    try {
        const service = await client.getService(params.serviceId, params.include);

        return {
            success: true,
            data: { service }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get service";

        if (errorMessage.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Service ${params.serviceId} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
