/**
 * Klaviyo API Types
 */

export interface KlaviyoProfileAttributes {
    email?: string;
    phone_number?: string;
    external_id?: string;
    first_name?: string;
    last_name?: string;
    organization?: string;
    title?: string;
    image?: string;
    created?: string;
    updated?: string;
    location?: KlaviyoLocation;
    properties?: Record<string, unknown>;
}

export interface KlaviyoLocation {
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    region?: string;
    zip?: string;
    timezone?: string;
}

export interface KlaviyoListAttributes {
    name: string;
    created?: string;
    updated?: string;
}

export interface KlaviyoCampaignAttributes {
    name: string;
    status: string;
    archived: boolean;
    channel: string;
    send_time?: string;
    created_at?: string;
    updated_at?: string;
}

export interface KlaviyoEventAttributes {
    metric: {
        name: string;
    };
    profile: {
        email?: string;
        phone_number?: string;
        id?: string;
    };
    properties?: Record<string, unknown>;
    time?: string;
    value?: number;
    unique_id?: string;
}
