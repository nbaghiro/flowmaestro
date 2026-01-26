import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

const assigneeSchema = z.object({
    id: z.string().describe("User or escalation policy ID"),
    type: z.enum(["user_reference", "escalation_policy_reference"]).describe("Reference type")
});

export const updateIncidentSchema = z.object({
    incidentId: z.string().min(1).describe("The ID of the incident to update"),
    from: z.string().email().describe("The email address of the user making the update"),
    status: z.enum(["acknowledged", "resolved"]).optional().describe("New status for the incident"),
    resolution: z.string().optional().describe("Resolution note (when resolving)"),
    title: z.string().optional().describe("New title for the incident"),
    urgency: z.enum(["high", "low"]).optional().describe("New urgency level"),
    escalationLevel: z.number().min(1).optional().describe("Escalate to a specific level"),
    assignees: z
        .array(assigneeSchema)
        .optional()
        .describe("Reassign the incident to users or escalation policies"),
    escalationPolicyId: z.string().optional().describe("Change the escalation policy"),
    priorityId: z.string().optional().describe("Change the priority"),
    conferenceNumber: z.string().optional().describe("Conference bridge phone number"),
    conferenceUrl: z.string().optional().describe("Conference bridge URL")
});

export type UpdateIncidentParams = z.infer<typeof updateIncidentSchema>;

export const updateIncidentOperation: OperationDefinition = {
    id: "updateIncident",
    name: "Update Incident",
    description: "Acknowledge, resolve, or reassign an incident",
    category: "incidents",
    actionType: "write",
    inputSchema: updateIncidentSchema,
    inputSchemaJSON: toJSONSchema(updateIncidentSchema),
    retryable: false,
    timeout: 30000
};

export async function executeUpdateIncident(
    client: PagerDutyClient,
    params: UpdateIncidentParams
): Promise<OperationResult> {
    try {
        const updateParams: {
            status?: "acknowledged" | "resolved";
            resolution?: string;
            title?: string;
            urgency?: "high" | "low";
            escalation_level?: number;
            assignments?: Array<{
                assignee: { id: string; type: "user_reference" | "escalation_policy_reference" };
            }>;
            escalation_policy?: { id: string; type: "escalation_policy_reference" };
            priority?: { id: string; type: "priority_reference" };
            conference_bridge?: { conference_number?: string; conference_url?: string };
        } = {};

        if (params.status) {
            updateParams.status = params.status;
        }

        if (params.resolution) {
            updateParams.resolution = params.resolution;
        }

        if (params.title) {
            updateParams.title = params.title;
        }

        if (params.urgency) {
            updateParams.urgency = params.urgency;
        }

        if (params.escalationLevel) {
            updateParams.escalation_level = params.escalationLevel;
        }

        if (params.assignees && params.assignees.length > 0) {
            updateParams.assignments = params.assignees.map((a) => ({
                assignee: {
                    id: a.id,
                    type: a.type
                }
            }));
        }

        if (params.escalationPolicyId) {
            updateParams.escalation_policy = {
                id: params.escalationPolicyId,
                type: "escalation_policy_reference"
            };
        }

        if (params.priorityId) {
            updateParams.priority = {
                id: params.priorityId,
                type: "priority_reference"
            };
        }

        if (params.conferenceNumber || params.conferenceUrl) {
            updateParams.conference_bridge = {
                conference_number: params.conferenceNumber,
                conference_url: params.conferenceUrl
            };
        }

        const incident = await client.updateIncident(params.incidentId, updateParams, params.from);

        return {
            success: true,
            data: {
                incident,
                incidentId: incident.id,
                status: incident.status,
                htmlUrl: incident.html_url
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update incident";

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
                retryable: false
            }
        };
    }
}
