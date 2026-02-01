import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const createIncidentSchema = z.object({
    title: z.string().min(1).describe("The title/summary of the incident"),
    serviceId: z.string().min(1).describe("The ID of the service to create the incident on"),
    from: z.string().email().describe("The email address of the user creating the incident"),
    urgency: z
        .enum(["high", "low"])
        .optional()
        .default("high")
        .describe("The urgency level of the incident"),
    details: z.string().optional().describe("Additional details/description for the incident body"),
    incidentKey: z.string().optional().describe("A unique key for deduplication (optional)"),
    escalationPolicyId: z.string().optional().describe("Override the default escalation policy"),
    priorityId: z.string().optional().describe("The priority ID for the incident"),
    assigneeIds: z.array(z.string()).optional().describe("User IDs to assign the incident to"),
    conferenceNumber: z.string().optional().describe("Conference bridge phone number"),
    conferenceUrl: z.string().optional().describe("Conference bridge URL")
});

export type CreateIncidentParams = z.infer<typeof createIncidentSchema>;

export const createIncidentOperation: OperationDefinition = {
    id: "createIncident",
    name: "Create Incident",
    description: "Trigger a new incident on a service",
    category: "incidents",
    actionType: "write",
    inputSchema: createIncidentSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateIncident(
    client: PagerDutyClient,
    params: CreateIncidentParams
): Promise<OperationResult> {
    try {
        const incidentParams: {
            title: string;
            service: { id: string; type: "service_reference" };
            urgency?: "high" | "low";
            body?: { type: "incident_body"; details?: string };
            incident_key?: string;
            escalation_policy?: { id: string; type: "escalation_policy_reference" };
            priority?: { id: string; type: "priority_reference" };
            assignments?: Array<{ assignee: { id: string; type: "user_reference" } }>;
            conference_bridge?: { conference_number?: string; conference_url?: string };
        } = {
            title: params.title,
            service: {
                id: params.serviceId,
                type: "service_reference"
            },
            urgency: params.urgency
        };

        if (params.details) {
            incidentParams.body = {
                type: "incident_body",
                details: params.details
            };
        }

        if (params.incidentKey) {
            incidentParams.incident_key = params.incidentKey;
        }

        if (params.escalationPolicyId) {
            incidentParams.escalation_policy = {
                id: params.escalationPolicyId,
                type: "escalation_policy_reference"
            };
        }

        if (params.priorityId) {
            incidentParams.priority = {
                id: params.priorityId,
                type: "priority_reference"
            };
        }

        if (params.assigneeIds && params.assigneeIds.length > 0) {
            incidentParams.assignments = params.assigneeIds.map((id) => ({
                assignee: {
                    id,
                    type: "user_reference" as const
                }
            }));
        }

        if (params.conferenceNumber || params.conferenceUrl) {
            incidentParams.conference_bridge = {
                conference_number: params.conferenceNumber,
                conference_url: params.conferenceUrl
            };
        }

        const incident = await client.createIncidentWithFrom(incidentParams, params.from);

        return {
            success: true,
            data: {
                incident,
                incidentId: incident.id,
                incidentNumber: incident.incident_number,
                htmlUrl: incident.html_url
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
