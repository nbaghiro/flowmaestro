/**
 * Calendly API Response Types
 */

/**
 * Calendly User resource
 */
export interface CalendlyUser {
    uri: string;
    name: string;
    slug: string;
    email: string;
    scheduling_url: string;
    timezone: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
    current_organization: string;
}

/**
 * Calendly Event Type resource
 */
export interface CalendlyEventType {
    uri: string;
    name: string;
    active: boolean;
    slug: string;
    scheduling_url: string;
    duration: number;
    kind: string;
    pooling_type: string | null;
    type: string;
    color: string;
    created_at: string;
    updated_at: string;
    internal_note: string | null;
    description_plain: string | null;
    description_html: string | null;
    profile: {
        type: string;
        name: string;
        owner: string;
    };
    secret: boolean;
    deleted_at: string | null;
    admin_managed: boolean;
    custom_questions: Array<{
        name: string;
        type: string;
        position: number;
        enabled: boolean;
        required: boolean;
        answer_choices: string[];
        include_other: boolean;
    }>;
}

/**
 * Calendly Scheduled Event resource
 */
export interface CalendlyScheduledEvent {
    uri: string;
    name: string;
    status: "active" | "canceled";
    start_time: string;
    end_time: string;
    event_type: string;
    location: {
        type: string;
        location?: string;
        join_url?: string;
        status?: string;
        additional_info?: string;
    } | null;
    invitees_counter: {
        total: number;
        active: number;
        limit: number;
    };
    created_at: string;
    updated_at: string;
    event_memberships: Array<{
        user: string;
    }>;
    event_guests: Array<{
        email: string;
        created_at: string;
        updated_at: string;
    }>;
    cancellation?: {
        canceled_by: string;
        reason: string | null;
        canceler_type: string;
        created_at: string;
    };
}

/**
 * Calendly Invitee resource
 */
export interface CalendlyInvitee {
    uri: string;
    email: string;
    name: string;
    status: "active" | "canceled";
    questions_and_answers: Array<{
        question: string;
        answer: string;
        position: number;
    }>;
    timezone: string;
    created_at: string;
    updated_at: string;
    tracking: {
        utm_campaign: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_content: string | null;
        utm_term: string | null;
        salesforce_uuid: string | null;
    };
    text_reminder_number: string | null;
    rescheduled: boolean;
    old_invitee: string | null;
    new_invitee: string | null;
    cancel_url: string;
    reschedule_url: string;
    cancellation?: {
        canceled_by: string;
        reason: string | null;
        canceler_type: string;
        created_at: string;
    };
}

/**
 * Calendly Available Time Slot
 */
export interface CalendlyAvailableTime {
    status: "available" | "unavailable";
    invitees_remaining: number;
    start_time: string;
    scheduling_url: string;
}

/**
 * Calendly Pagination
 */
export interface CalendlyPagination {
    count: number;
    next_page: string | null;
    previous_page: string | null;
    next_page_token: string | null;
}

/**
 * Calendly API Collection Response
 */
export interface CalendlyCollectionResponse<T> {
    collection: T[];
    pagination: CalendlyPagination;
}

/**
 * Calendly API Resource Response
 */
export interface CalendlyResourceResponse<T> {
    resource: T;
}
