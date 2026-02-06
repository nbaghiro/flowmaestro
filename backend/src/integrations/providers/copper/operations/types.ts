/**
 * Copper CRM API types and interfaces
 */

// ============================================
// Base Types
// ============================================

export interface CopperAddress {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
}

export interface CopperPhoneNumber {
    number: string;
    category: "work" | "mobile" | "home" | "other";
}

export interface CopperEmail {
    email: string;
    category: "work" | "personal" | "other";
}

export interface CopperSocialUrl {
    url: string;
    category: "linkedin" | "twitter" | "facebook" | "youtube" | "other";
}

export interface CopperCustomField {
    custom_field_definition_id: number;
    value: string | number | boolean | string[] | null;
}

// ============================================
// Lead Types
// ============================================

export interface CopperLead {
    id: number;
    name: string;
    prefix?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    address?: CopperAddress;
    assignee_id?: number;
    company_name?: string;
    customer_source_id?: number;
    details?: string;
    email?: CopperEmail;
    interaction_count?: number;
    monetary_unit?: string;
    monetary_value?: number;
    converted_unit?: string;
    converted_value?: number;
    socials?: CopperSocialUrl[];
    status?: string;
    status_id?: number;
    tags?: string[];
    title?: string;
    websites?: { url: string; category: string }[];
    phone_numbers?: CopperPhoneNumber[];
    custom_fields?: CopperCustomField[];
    date_created?: number;
    date_modified?: number;
    date_last_contacted?: number;
}

export interface CopperLeadInput {
    name: string;
    prefix?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    address?: CopperAddress;
    assignee_id?: number;
    company_name?: string;
    customer_source_id?: number;
    details?: string;
    email?: CopperEmail;
    monetary_unit?: string;
    monetary_value?: number;
    socials?: CopperSocialUrl[];
    status_id?: number;
    tags?: string[];
    title?: string;
    websites?: { url: string; category: string }[];
    phone_numbers?: CopperPhoneNumber[];
    custom_fields?: CopperCustomField[];
}

// ============================================
// Person Types
// ============================================

export interface CopperPerson {
    id: number;
    name: string;
    prefix?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    address?: CopperAddress;
    assignee_id?: number;
    company_id?: number;
    company_name?: string;
    contact_type_id?: number;
    details?: string;
    emails?: CopperEmail[];
    phone_numbers?: CopperPhoneNumber[];
    socials?: CopperSocialUrl[];
    tags?: string[];
    title?: string;
    websites?: { url: string; category: string }[];
    custom_fields?: CopperCustomField[];
    date_created?: number;
    date_modified?: number;
    date_last_contacted?: number;
    interaction_count?: number;
}

export interface CopperPersonInput {
    name: string;
    prefix?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    address?: CopperAddress;
    assignee_id?: number;
    company_id?: number;
    contact_type_id?: number;
    details?: string;
    emails?: CopperEmail[];
    phone_numbers?: CopperPhoneNumber[];
    socials?: CopperSocialUrl[];
    tags?: string[];
    title?: string;
    websites?: { url: string; category: string }[];
    custom_fields?: CopperCustomField[];
}

// ============================================
// Company Types
// ============================================

export interface CopperCompany {
    id: number;
    name: string;
    address?: CopperAddress;
    assignee_id?: number;
    contact_type_id?: number;
    details?: string;
    email_domain?: string;
    phone_numbers?: CopperPhoneNumber[];
    socials?: CopperSocialUrl[];
    tags?: string[];
    websites?: { url: string; category: string }[];
    custom_fields?: CopperCustomField[];
    date_created?: number;
    date_modified?: number;
    date_last_contacted?: number;
    interaction_count?: number;
}

export interface CopperCompanyInput {
    name: string;
    address?: CopperAddress;
    assignee_id?: number;
    contact_type_id?: number;
    details?: string;
    email_domain?: string;
    phone_numbers?: CopperPhoneNumber[];
    socials?: CopperSocialUrl[];
    tags?: string[];
    websites?: { url: string; category: string }[];
    custom_fields?: CopperCustomField[];
}

// ============================================
// Opportunity Types
// ============================================

export interface CopperOpportunity {
    id: number;
    name: string;
    assignee_id?: number;
    close_date?: string;
    company_id?: number;
    company_name?: string;
    customer_source_id?: number;
    details?: string;
    loss_reason_id?: number;
    monetary_unit?: string;
    monetary_value?: number;
    pipeline_id?: number;
    pipeline_stage_id?: number;
    primary_contact_id?: number;
    priority?: "None" | "Low" | "Medium" | "High";
    status?: "Open" | "Won" | "Lost" | "Abandoned";
    tags?: string[];
    win_probability?: number;
    custom_fields?: CopperCustomField[];
    date_created?: number;
    date_modified?: number;
    date_stage_changed?: number;
    date_last_contacted?: number;
    interaction_count?: number;
}

export interface CopperOpportunityInput {
    name: string;
    assignee_id?: number;
    close_date?: string;
    company_id?: number;
    customer_source_id?: number;
    details?: string;
    loss_reason_id?: number;
    monetary_unit?: string;
    monetary_value?: number;
    pipeline_id?: number;
    pipeline_stage_id?: number;
    primary_contact_id?: number;
    priority?: "None" | "Low" | "Medium" | "High";
    status?: "Open" | "Won" | "Lost" | "Abandoned";
    tags?: string[];
    win_probability?: number;
    custom_fields?: CopperCustomField[];
}

// ============================================
// Task Types
// ============================================

export interface CopperTask {
    id: number;
    name: string;
    related_resource?: {
        id: number;
        type: "lead" | "person" | "company" | "opportunity" | "project";
    };
    assignee_id?: number;
    due_date?: number;
    reminder_date?: number;
    completed_date?: number;
    priority?: "None" | "High";
    status?: "Open" | "Completed";
    details?: string;
    tags?: string[];
    custom_fields?: CopperCustomField[];
    date_created?: number;
    date_modified?: number;
}

export interface CopperTaskInput {
    name: string;
    related_resource?: {
        id: number;
        type: "lead" | "person" | "company" | "opportunity" | "project";
    };
    assignee_id?: number;
    due_date?: number;
    reminder_date?: number;
    priority?: "None" | "High";
    status?: "Open" | "Completed";
    details?: string;
    tags?: string[];
    custom_fields?: CopperCustomField[];
}

// ============================================
// API Response Types
// ============================================

export interface CopperListResponse<T> {
    items: T[];
}

export interface CopperSearchResponse<T> {
    items: T[];
}
