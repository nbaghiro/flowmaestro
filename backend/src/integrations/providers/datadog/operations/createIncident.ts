import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const createIncidentSchema = z.object({
    title: z.string().min(1).describe("Incident title"),
    customerImpactScope: z.string().optional().describe("Description of customer impact"),
    fields: z.record(z.unknown()).optional().describe("Custom fields for the incident")
});

export type CreateIncidentParams = z.infer<typeof createIncidentSchema>;

export const createIncidentOperation: OperationDefinition = {
    id: "createIncident",
    name: "Create Incident",
    description: "Create a new incident in Datadog",
    category: "incidents",
    inputSchema: createIncidentSchema,
    inputSchemaJSON: toJSONSchema(createIncidentSchema),
    retryable: false,
    timeout: 30000
};

export async function executeCreateIncident(
    client: DatadogClient,
    params: CreateIncidentParams
): Promise<OperationResult> {
    try {
        const result = await client.createIncident({
            title: params.title,
            customer_impact_scope: params.customerImpactScope,
            fields: params.fields
        });

        const incident = result.data;

        return {
            success: true,
            data: {
                id: incident.id,
                title: incident.attributes?.title,
                customerImpactScope: incident.attributes?.customer_impact_scope,
                state: incident.attributes?.state,
                created: incident.attributes?.created
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create incident",
                retryable: false
            }
        };
    }
}
