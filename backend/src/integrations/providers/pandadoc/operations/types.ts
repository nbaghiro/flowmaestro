/**
 * PandaDoc API response types
 */

export interface PandaDocRecipient {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    recipient_type: string;
    has_completed: boolean;
    shared_link?: string;
}

export interface PandaDocField {
    uuid: string;
    name: string;
    title?: string;
    value?: unknown;
    assigned_to?: {
        id: string;
        type: string;
    };
}

export interface PandaDocDocument {
    id: string;
    name: string;
    status: string;
    date_created: string;
    date_modified: string;
    expiration_date: string | null;
    version: string | null;
    uuid: string;
}

export interface PandaDocDocumentDetails extends PandaDocDocument {
    recipients: PandaDocRecipient[];
    fields: PandaDocField[];
    tokens: Array<{
        name: string;
        value: string;
    }>;
    metadata: Record<string, string>;
    tags: string[];
    created_by: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    pricing?: {
        tables: unknown[];
        quotes: unknown[];
    };
}

export interface PandaDocTemplate {
    id: string;
    name: string;
    date_created: string;
    date_modified: string;
    version: string | null;
}

export interface PandaDocListDocumentsResponse {
    results: PandaDocDocument[];
}

export interface PandaDocListTemplatesResponse {
    results: PandaDocTemplate[];
}

export interface PandaDocCreateDocumentResponse {
    id: string;
    name: string;
    status: string;
    date_created: string;
    date_modified: string;
    expiration_date: string | null;
    version: string | null;
    uuid: string;
}

export interface PandaDocSendDocumentResponse {
    id: string;
    status: string;
    uuid: string;
}

export interface PandaDocMemberResponse {
    user_id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    membership_id?: string;
    workspace_name?: string;
}
