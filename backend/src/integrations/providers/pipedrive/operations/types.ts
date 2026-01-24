/**
 * Shared types for Pipedrive operations
 */

/**
 * Pipedrive API response wrapper
 */
export interface PipedriveResponse<T> {
    success: boolean;
    data: T;
    additional_data?: {
        pagination?: {
            start: number;
            limit: number;
            more_items_in_collection: boolean;
            next_start?: number;
        };
    };
}

/**
 * Pipedrive list response
 */
export interface PipedriveListResponse<T> {
    success: boolean;
    data: T[] | null;
    additional_data?: {
        pagination?: {
            start: number;
            limit: number;
            more_items_in_collection: boolean;
            next_start?: number;
        };
    };
}

/**
 * Pipedrive Deal
 */
export interface PipedriveDeal {
    id: number;
    title: string;
    value: number | null;
    currency: string | null;
    status: "open" | "won" | "lost" | "deleted";
    stage_id: number | null;
    pipeline_id: number | null;
    person_id: number | null;
    org_id: number | null;
    user_id: number | null;
    expected_close_date: string | null;
    won_time: string | null;
    lost_time: string | null;
    lost_reason: string | null;
    visible_to: string | null;
    add_time: string;
    update_time: string | null;
    close_time: string | null;
}

/**
 * Pipedrive Person (Contact)
 */
export interface PipedrivePerson {
    id: number;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: PipedriveEmail[];
    phone: PipedrivePhone[];
    org_id: number | null;
    owner_id: number | null;
    visible_to: string | null;
    add_time: string;
    update_time: string | null;
    active_flag: boolean;
}

/**
 * Pipedrive Email field
 */
export interface PipedriveEmail {
    label: string;
    value: string;
    primary: boolean;
}

/**
 * Pipedrive Phone field
 */
export interface PipedrivePhone {
    label: string;
    value: string;
    primary: boolean;
}

/**
 * Pipedrive Organization
 */
export interface PipedriveOrganization {
    id: number;
    name: string;
    owner_id: number | null;
    address: string | null;
    address_country: string | null;
    cc_email: string | null;
    visible_to: string | null;
    add_time: string;
    update_time: string | null;
    active_flag: boolean;
}

/**
 * Pipedrive Lead
 */
export interface PipedriveLead {
    id: string; // UUID
    title: string;
    owner_id: number | null;
    person_id: number | null;
    organization_id: number | null;
    expected_close_date: string | null;
    value: {
        amount: number;
        currency: string;
    } | null;
    label_ids: string[];
    is_archived: boolean;
    add_time: string;
    update_time: string | null;
}

/**
 * Pipedrive Activity
 */
export interface PipedriveActivity {
    id: number;
    type: string;
    subject: string;
    done: boolean;
    due_date: string | null;
    due_time: string | null;
    duration: string | null;
    user_id: number | null;
    person_id: number | null;
    org_id: number | null;
    deal_id: number | null;
    lead_id: string | null;
    note: string | null;
    location: string | null;
    public_description: string | null;
    busy_flag: boolean;
    add_time: string;
    update_time: string | null;
    marked_as_done_time: string | null;
}

/**
 * Pipedrive search result
 */
export interface PipedriveSearchResult<T> {
    success: boolean;
    data: {
        items: Array<{
            item: T;
            result_score: number;
        }>;
    } | null;
    additional_data?: {
        pagination?: {
            start: number;
            limit: number;
            more_items_in_collection: boolean;
            next_start?: number;
        };
    };
}
