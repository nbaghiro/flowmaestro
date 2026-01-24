/**
 * Shared types for Close CRM operations
 */

/**
 * Close API list response
 */
export interface CloseListResponse<T> {
    has_more: boolean;
    total_results?: number;
    data: T[];
}

/**
 * Close Lead (Company)
 */
export interface CloseLead {
    id: string;
    display_name: string;
    name?: string;
    description?: string;
    url?: string;
    status_id: string;
    status_label?: string;
    created_by: string;
    created_by_name?: string;
    updated_by: string;
    updated_by_name?: string;
    date_created: string;
    date_updated: string;
    addresses?: CloseAddress[];
    contacts?: CloseContact[];
    opportunities?: CloseOpportunity[];
    custom?: Record<string, unknown>;
}

/**
 * Close Contact
 */
export interface CloseContact {
    id: string;
    lead_id: string;
    name: string;
    title?: string;
    emails?: CloseEmail[];
    phones?: ClosePhone[];
    urls?: CloseUrl[];
    date_created: string;
    date_updated: string;
    created_by: string;
    updated_by: string;
}

/**
 * Close Opportunity
 */
export interface CloseOpportunity {
    id: string;
    lead_id: string;
    lead_name?: string;
    contact_id?: string;
    contact_name?: string;
    user_id: string;
    user_name?: string;
    status_id: string;
    status_label?: string;
    status_type?: "active" | "won" | "lost";
    value?: number;
    value_currency?: string;
    value_formatted?: string;
    value_period?: "one_time" | "monthly" | "annual";
    confidence?: number;
    expected_value?: number;
    date_won?: string;
    date_lost?: string;
    note?: string;
    date_created: string;
    date_updated: string;
}

/**
 * Close Activity (base type)
 */
export interface CloseActivity {
    id: string;
    lead_id: string;
    user_id: string;
    user_name?: string;
    date_created: string;
    date_updated: string;
    _type: string;
}

/**
 * Close Note Activity
 */
export interface CloseNote extends CloseActivity {
    _type: "Note";
    note: string;
    note_html?: string;
}

/**
 * Close Task
 */
export interface CloseTask {
    id: string;
    lead_id: string;
    assigned_to: string;
    assigned_to_name?: string;
    text: string;
    due_date?: string;
    is_complete: boolean;
    is_dateless?: boolean;
    date_created: string;
    date_updated: string;
    completed_date?: string;
    _type: "Task";
}

/**
 * Close Email
 */
export interface CloseEmail {
    email: string;
    type: "office" | "home" | "direct" | "mobile" | "fax" | "other";
}

/**
 * Close Phone
 */
export interface ClosePhone {
    phone: string;
    phone_formatted?: string;
    type: "office" | "home" | "direct" | "mobile" | "fax" | "other";
    country?: string;
}

/**
 * Close URL
 */
export interface CloseUrl {
    url: string;
    type: "url" | "website" | "linkedin" | "facebook" | "twitter" | "other";
}

/**
 * Close Address
 */
export interface CloseAddress {
    label?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
}

/**
 * Close Call Activity
 */
export interface CloseCall extends CloseActivity {
    _type: "Call";
    direction: "inbound" | "outbound";
    duration?: number;
    phone?: string;
    contact_id?: string;
    note?: string;
    disposition?: string;
    status?: string;
}

/**
 * Close Email Activity
 */
export interface CloseEmailActivity extends CloseActivity {
    _type: "Email";
    direction: "incoming" | "outgoing";
    subject?: string;
    body_text?: string;
    body_html?: string;
    sender?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    status?: string;
    template_id?: string;
}
