import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const getIncidentSchema = z.object({
    incidentId: z.string().min(1).describe("The ID of the incident to retrieve")
});

export type GetIncidentParams = z.infer<typeof getIncidentSchema>;

export const getIncidentOperation: OperationDefinition = {
    id: "getIncident",
    name: "Get Incident",
    description: "Get a single incident by ID with full details",
    category: "incidents",
    inputSchema: getIncidentSchema,
    inputSchemaJSON: toJSONSchema(getIncidentSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetIncident(
    client: PagerDutyClient,
    params: GetIncidentParams
): Promise<OperationResult> {
    try {
        const incident = await client.getIncident(params.incidentId);

        return {
            success: true,
            data: { incident }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get incident";

        if (errorMessage.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Incident ${params.incidentId} not found`,
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
