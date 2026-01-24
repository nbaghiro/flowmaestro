/**
 * HelloSign API response types
 */

export interface HelloSignSigner {
    signer_email_address: string;
    signer_name: string;
    signer_role?: string;
    order?: number;
    status_code: string;
    signed_at?: number;
    last_viewed_at?: number;
    last_reminded_at?: number;
    has_pin?: boolean;
    decline_reason?: string;
}

export interface HelloSignSignatureRequest {
    signature_request_id: string;
    test_mode: boolean;
    title: string;
    original_title: string;
    subject?: string;
    message?: string;
    metadata?: Record<string, unknown>;
    created_at: number;
    is_complete: boolean;
    is_declined: boolean;
    has_error: boolean;
    final_copy_uri?: string;
    files_url?: string;
    signing_url?: string;
    details_url?: string;
    cc_email_addresses?: string[];
    signing_redirect_url?: string;
    signatures: HelloSignSigner[];
    requester_email_address: string;
}

export interface HelloSignTemplate {
    template_id: string;
    title: string;
    message?: string;
    signer_roles: Array<{
        name: string;
        order?: number;
    }>;
    cc_roles: Array<{
        name: string;
    }>;
    documents: Array<{
        name: string;
        index: number;
    }>;
    custom_fields: Array<{
        name: string;
        type: string;
    }>;
    accounts: Array<{
        account_id: string;
        email_address: string;
    }>;
    is_creator: boolean;
    is_embedded: boolean;
    can_edit: boolean;
}

export interface HelloSignListResponse<T> {
    list_info: {
        num_pages: number;
        num_results: number;
        page: number;
        page_size: number;
    };
    signature_requests?: T[];
    templates?: T[];
}

export interface HelloSignCreateResponse {
    signature_request: HelloSignSignatureRequest;
}

export interface HelloSignAccountResponse {
    account: {
        account_id: string;
        email_address: string;
        role_code: string;
        is_paid_hs: boolean;
        is_paid_hf: boolean;
        quotas?: {
            templates_left: number;
            api_signature_requests_left: number;
            documents_left: number;
        };
    };
}
