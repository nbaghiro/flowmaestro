export interface StripeEventModel {
    id: string;
    stripe_event_id: string;
    event_type: string;
    workspace_id: string | null;
    user_id: string | null;
    processed_at: Date;
    raw_payload: Record<string, unknown>;
}

export interface CreateStripeEventInput {
    stripe_event_id: string;
    event_type: string;
    workspace_id?: string;
    user_id?: string;
    raw_payload?: Record<string, unknown>;
}
