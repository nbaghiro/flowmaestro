/**
 * Insightly CRM API types and interfaces
 */

// ============================================
// Base Types
// ============================================

export interface InsightlyAddress {
    ADDRESS_TYPE?: string;
    STREET?: string;
    CITY?: string;
    STATE?: string;
    POSTCODE?: string;
    COUNTRY?: string;
}

export interface InsightlyContactInfo {
    CONTACT_INFO_ID?: number;
    TYPE?: string;
    SUBTYPE?: string;
    LABEL?: string;
    DETAIL?: string;
}

export interface InsightlyLink {
    LINK_ID?: number;
    CONTACT_ID?: number;
    ORGANISATION_ID?: number;
    OPPORTUNITY_ID?: number;
    PROJECT_ID?: number;
    LEAD_ID?: number;
    ROLE?: string;
    DETAILS?: string;
}

export interface InsightlyTag {
    TAG_NAME: string;
}

export interface InsightlyCustomField {
    CUSTOM_FIELD_ID: string;
    FIELD_VALUE: string | number | boolean | null;
}

// ============================================
// Contact Types
// ============================================

export interface InsightlyContact {
    CONTACT_ID: number;
    SALUTATION?: string;
    FIRST_NAME?: string;
    LAST_NAME?: string;
    BACKGROUND?: string;
    IMAGE_URL?: string;
    DEFAULT_LINKED_ORGANISATION?: number;
    OWNER_USER_ID?: number;
    DATE_CREATED_UTC?: string;
    DATE_UPDATED_UTC?: string;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    CUSTOMFIELDS?: InsightlyCustomField[];
    ADDRESSES?: InsightlyAddress[];
    CONTACTINFOS?: InsightlyContactInfo[];
    DATES?: { DATE_TYPE?: string; DATE_VALUE?: string }[];
    TAGS?: InsightlyTag[];
    LINKS?: InsightlyLink[];
    SOCIAL_LINKEDIN?: string;
    SOCIAL_FACEBOOK?: string;
    SOCIAL_TWITTER?: string;
}

export interface InsightlyContactInput {
    SALUTATION?: string;
    FIRST_NAME?: string;
    LAST_NAME?: string;
    BACKGROUND?: string;
    DEFAULT_LINKED_ORGANISATION?: number;
    OWNER_USER_ID?: number;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    CUSTOMFIELDS?: InsightlyCustomField[];
    ADDRESSES?: InsightlyAddress[];
    CONTACTINFOS?: InsightlyContactInfo[];
    TAGS?: InsightlyTag[];
    LINKS?: InsightlyLink[];
    SOCIAL_LINKEDIN?: string;
    SOCIAL_FACEBOOK?: string;
    SOCIAL_TWITTER?: string;
}

// ============================================
// Organisation Types
// ============================================

export interface InsightlyOrganisation {
    ORGANISATION_ID: number;
    ORGANISATION_NAME: string;
    BACKGROUND?: string;
    IMAGE_URL?: string;
    OWNER_USER_ID?: number;
    DATE_CREATED_UTC?: string;
    DATE_UPDATED_UTC?: string;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    CUSTOMFIELDS?: InsightlyCustomField[];
    ADDRESSES?: InsightlyAddress[];
    CONTACTINFOS?: InsightlyContactInfo[];
    DATES?: { DATE_TYPE?: string; DATE_VALUE?: string }[];
    TAGS?: InsightlyTag[];
    LINKS?: InsightlyLink[];
    SOCIAL_LINKEDIN?: string;
    SOCIAL_FACEBOOK?: string;
    SOCIAL_TWITTER?: string;
}

export interface InsightlyOrganisationInput {
    ORGANISATION_NAME: string;
    BACKGROUND?: string;
    OWNER_USER_ID?: number;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    CUSTOMFIELDS?: InsightlyCustomField[];
    ADDRESSES?: InsightlyAddress[];
    CONTACTINFOS?: InsightlyContactInfo[];
    TAGS?: InsightlyTag[];
    LINKS?: InsightlyLink[];
    SOCIAL_LINKEDIN?: string;
    SOCIAL_FACEBOOK?: string;
    SOCIAL_TWITTER?: string;
}

// ============================================
// Lead Types
// ============================================

export interface InsightlyLead {
    LEAD_ID: number;
    SALUTATION?: string;
    FIRST_NAME?: string;
    LAST_NAME?: string;
    LEAD_SOURCE_ID?: number;
    LEAD_STATUS_ID?: number;
    TITLE?: string;
    EMAIL?: string;
    PHONE?: string;
    MOBILE?: string;
    FAX?: string;
    WEBSITE?: string;
    INDUSTRY?: string;
    LEAD_RATING?: number;
    LEAD_DESCRIPTION?: string;
    ORGANISATION_NAME?: string;
    EMPLOYEE_COUNT?: number;
    CONVERTED?: boolean;
    CONVERTED_CONTACT_ID?: number;
    CONVERTED_ORGANISATION_ID?: number;
    CONVERTED_OPPORTUNITY_ID?: number;
    CONVERTED_DATE_UTC?: string;
    OWNER_USER_ID?: number;
    DATE_CREATED_UTC?: string;
    DATE_UPDATED_UTC?: string;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    RESPONSIBLE_USER_ID?: number;
    CUSTOMFIELDS?: InsightlyCustomField[];
    ADDRESS_STREET?: string;
    ADDRESS_CITY?: string;
    ADDRESS_STATE?: string;
    ADDRESS_POSTCODE?: string;
    ADDRESS_COUNTRY?: string;
    TAGS?: InsightlyTag[];
}

export interface InsightlyLeadInput {
    SALUTATION?: string;
    FIRST_NAME?: string;
    LAST_NAME?: string;
    LEAD_SOURCE_ID?: number;
    LEAD_STATUS_ID?: number;
    TITLE?: string;
    EMAIL?: string;
    PHONE?: string;
    MOBILE?: string;
    FAX?: string;
    WEBSITE?: string;
    INDUSTRY?: string;
    LEAD_RATING?: number;
    LEAD_DESCRIPTION?: string;
    ORGANISATION_NAME?: string;
    EMPLOYEE_COUNT?: number;
    OWNER_USER_ID?: number;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    RESPONSIBLE_USER_ID?: number;
    CUSTOMFIELDS?: InsightlyCustomField[];
    ADDRESS_STREET?: string;
    ADDRESS_CITY?: string;
    ADDRESS_STATE?: string;
    ADDRESS_POSTCODE?: string;
    ADDRESS_COUNTRY?: string;
    TAGS?: InsightlyTag[];
}

// ============================================
// Opportunity Types
// ============================================

export interface InsightlyOpportunity {
    OPPORTUNITY_ID: number;
    OPPORTUNITY_NAME: string;
    OPPORTUNITY_DETAILS?: string;
    PROBABILITY?: number;
    BID_CURRENCY?: string;
    BID_AMOUNT?: number;
    BID_TYPE?: string;
    BID_DURATION?: number;
    FORECAST_CLOSE_DATE?: string;
    ACTUAL_CLOSE_DATE?: string;
    CATEGORY_ID?: number;
    PIPELINE_ID?: number;
    STAGE_ID?: number;
    OPPORTUNITY_STATE?: string;
    OPPORTUNITY_STATE_REASON_ID?: number;
    IMAGE_URL?: string;
    OWNER_USER_ID?: number;
    DATE_CREATED_UTC?: string;
    DATE_UPDATED_UTC?: string;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    RESPONSIBLE_USER_ID?: number;
    CUSTOMFIELDS?: InsightlyCustomField[];
    TAGS?: InsightlyTag[];
    LINKS?: InsightlyLink[];
}

export interface InsightlyOpportunityInput {
    OPPORTUNITY_NAME: string;
    OPPORTUNITY_DETAILS?: string;
    PROBABILITY?: number;
    BID_CURRENCY?: string;
    BID_AMOUNT?: number;
    BID_TYPE?: string;
    BID_DURATION?: number;
    FORECAST_CLOSE_DATE?: string;
    ACTUAL_CLOSE_DATE?: string;
    CATEGORY_ID?: number;
    PIPELINE_ID?: number;
    STAGE_ID?: number;
    OPPORTUNITY_STATE?: string;
    OPPORTUNITY_STATE_REASON_ID?: number;
    OWNER_USER_ID?: number;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    VISIBLE_USER_IDS?: string;
    RESPONSIBLE_USER_ID?: number;
    CUSTOMFIELDS?: InsightlyCustomField[];
    TAGS?: InsightlyTag[];
    LINKS?: InsightlyLink[];
}

// ============================================
// Task Types
// ============================================

export interface InsightlyTask {
    TASK_ID: number;
    TITLE: string;
    CATEGORY_ID?: number;
    DUE_DATE?: string;
    COMPLETED_DATE_UTC?: string;
    COMPLETED?: boolean;
    DETAILS?: string;
    STATUS?: string;
    PRIORITY?: number;
    PERCENT_COMPLETE?: number;
    START_DATE?: string;
    MILESTONE_ID?: number;
    RESPONSIBLE_USER_ID?: number;
    OWNER_USER_ID?: number;
    ASSIGNED_BY_USER_ID?: number;
    PARENT_TASK_ID?: number;
    ASSIGNED_TEAM_ID?: number;
    RECURRENCE?: string;
    REMINDER_DATE_UTC?: string;
    REMINDER_SENT?: boolean;
    DATE_CREATED_UTC?: string;
    DATE_UPDATED_UTC?: string;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    TASKLINKS?: {
        TASK_LINK_ID?: number;
        CONTACT_ID?: number;
        ORGANISATION_ID?: number;
        OPPORTUNITY_ID?: number;
        PROJECT_ID?: number;
        LEAD_ID?: number;
    }[];
}

export interface InsightlyTaskInput {
    TITLE: string;
    CATEGORY_ID?: number;
    DUE_DATE?: string;
    DETAILS?: string;
    STATUS?: string;
    PRIORITY?: number;
    PERCENT_COMPLETE?: number;
    START_DATE?: string;
    MILESTONE_ID?: number;
    RESPONSIBLE_USER_ID?: number;
    OWNER_USER_ID?: number;
    ASSIGNED_TEAM_ID?: number;
    RECURRENCE?: string;
    REMINDER_DATE_UTC?: string;
    VISIBLE_TO?: string;
    VISIBLE_TEAM_ID?: number;
    TASKLINKS?: {
        CONTACT_ID?: number;
        ORGANISATION_ID?: number;
        OPPORTUNITY_ID?: number;
        PROJECT_ID?: number;
        LEAD_ID?: number;
    }[];
}

// ============================================
// API Response Types
// ============================================

export interface InsightlyListResponse<T> {
    items: T[];
    total_count?: number;
}
