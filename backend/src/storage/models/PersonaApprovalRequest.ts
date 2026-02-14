/**
 * Persona Approval Request Model
 *
 * Represents a request for user approval during persona execution.
 */

import type {
    PersonaApprovalRequestStatus,
    PersonaApprovalRequestRiskLevel,
    PersonaApprovalActionType
} from "@flowmaestro/shared";

/**
 * Database row type for persona_approval_requests
 */
export interface PersonaApprovalRequestRow {
    id: string;
    instance_id: string;
    action_type: PersonaApprovalActionType;
    tool_name: string | null;
    action_description: string;
    action_arguments: Record<string, unknown>;
    risk_level: PersonaApprovalRequestRiskLevel;
    estimated_cost_credits: string | null; // DECIMAL comes as string from pg
    agent_context: string | null;
    alternatives: string | null;
    status: PersonaApprovalRequestStatus;
    responded_by: string | null;
    responded_at: Date | null;
    response_note: string | null;
    created_at: Date;
    expires_at: Date | null;
}

/**
 * Model type for persona approval requests
 */
export interface PersonaApprovalRequestModel {
    id: string;
    instance_id: string;
    action_type: PersonaApprovalActionType;
    tool_name: string | null;
    action_description: string;
    action_arguments: Record<string, unknown>;
    risk_level: PersonaApprovalRequestRiskLevel;
    estimated_cost_credits: number | null;
    agent_context: string | null;
    alternatives: string | null;
    status: PersonaApprovalRequestStatus;
    responded_by: string | null;
    responded_at: Date | null;
    response_note: string | null;
    created_at: Date;
    expires_at: Date | null;
}

/**
 * Summary for list views
 */
export interface PersonaApprovalRequestSummary {
    id: string;
    instance_id: string;
    action_type: PersonaApprovalActionType;
    tool_name: string | null;
    action_description: string;
    risk_level: PersonaApprovalRequestRiskLevel;
    estimated_cost_credits: number | null;
    status: PersonaApprovalRequestStatus;
    created_at: Date;
    waiting_seconds: number;
}

/**
 * Input for creating an approval request
 */
export interface CreateApprovalRequestInput {
    instance_id: string;
    action_type: PersonaApprovalActionType;
    tool_name?: string;
    action_description: string;
    action_arguments: Record<string, unknown>;
    risk_level: PersonaApprovalRequestRiskLevel;
    estimated_cost_credits?: number;
    agent_context?: string;
    alternatives?: string;
    expires_at?: Date;
}

/**
 * Input for updating an approval request (approve/deny)
 */
export interface UpdateApprovalRequestInput {
    status: PersonaApprovalRequestStatus;
    responded_by?: string;
    responded_at?: Date;
    response_note?: string;
}
