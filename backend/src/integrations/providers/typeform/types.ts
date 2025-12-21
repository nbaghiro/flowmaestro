/**
 * Typeform API Types
 */

// User/Account types
export interface TypeformUser {
    user_id: string;
    email: string;
    alias?: string;
    language?: string;
}

// Form types
export interface TypeformForm {
    id: string;
    title: string;
    last_updated_at?: string;
    created_at?: string;
    workspace?: {
        href: string;
    };
    theme?: {
        href: string;
    };
    settings?: TypeformFormSettings;
    _links?: {
        display: string;
    };
}

export interface TypeformFormSettings {
    language?: string;
    progress_bar?: "percentage" | "proportion";
    meta?: {
        allow_indexing?: boolean;
        description?: string;
        image?: {
            href?: string;
        };
    };
    hide_navigation?: boolean;
    is_public?: boolean;
    is_trial?: boolean;
    show_progress_bar?: boolean;
    show_typeform_branding?: boolean;
    are_uploads_public?: boolean;
    show_time_to_complete?: boolean;
    show_number_of_submissions?: boolean;
    show_cookie_consent?: boolean;
    show_question_number?: boolean;
    show_key_hint_on_choices?: boolean;
    autosave_progress?: boolean;
    free_form_navigation?: boolean;
    pro_subdomain_enabled?: boolean;
    capabilities?: {
        e2e_encryption?: {
            enabled?: boolean;
            modifiable?: boolean;
        };
    };
}

export interface TypeformFormDetail extends TypeformForm {
    type?: "form" | "quiz";
    welcome_screens?: TypeformWelcomeScreen[];
    thankyou_screens?: TypeformThankYouScreen[];
    fields?: TypeformField[];
    logic?: TypeformLogic[];
    variables?: TypeformVariable[];
}

export interface TypeformWelcomeScreen {
    ref?: string;
    title?: string;
    properties?: {
        show_button?: boolean;
        button_text?: string;
        description?: string;
    };
    attachment?: TypeformAttachment;
}

export interface TypeformThankYouScreen {
    ref?: string;
    title?: string;
    properties?: {
        show_button?: boolean;
        button_text?: string;
        button_mode?: "reload" | "redirect" | "default_redirect";
        share_icons?: boolean;
        redirect_url?: string;
    };
    attachment?: TypeformAttachment;
}

export interface TypeformField {
    id: string;
    ref?: string;
    title: string;
    type: TypeformFieldType;
    properties?: Record<string, unknown>;
    validations?: {
        required?: boolean;
        max_length?: number;
        min_value?: number;
        max_value?: number;
    };
    attachment?: TypeformAttachment;
}

export type TypeformFieldType =
    | "short_text"
    | "long_text"
    | "multiple_choice"
    | "picture_choice"
    | "dropdown"
    | "ranking"
    | "opinion_scale"
    | "rating"
    | "yes_no"
    | "email"
    | "phone_number"
    | "date"
    | "number"
    | "website"
    | "file_upload"
    | "legal"
    | "statement"
    | "payment"
    | "calendly"
    | "nps"
    | "matrix"
    | "contact_info"
    | "group";

export interface TypeformAttachment {
    type?: "image" | "video";
    href?: string;
    scale?: number;
    properties?: {
        description?: string;
    };
}

export interface TypeformLogic {
    type?: "field" | "hidden";
    ref?: string;
    actions?: TypeformLogicAction[];
}

export interface TypeformLogicAction {
    action?: "jump" | "add" | "subtract" | "multiply" | "divide";
    details?: {
        to?: {
            type?: "field" | "thankyou" | "hidden";
            value?: string;
        };
        value?: {
            type?: "constant" | "variable" | "field";
            value?: string | number;
        };
    };
    condition?: {
        op?: string;
        vars?: Array<{ type?: string; value?: unknown }>;
    };
}

export interface TypeformVariable {
    type?: "number" | "text";
    name?: string;
    value?: string | number;
}

// Response types
export interface TypeformResponsesResponse {
    total_items: number;
    page_count: number;
    items: TypeformResponse[];
}

export interface TypeformResponse {
    landing_id: string;
    token: string;
    response_id?: string;
    landed_at: string;
    submitted_at?: string;
    metadata?: {
        user_agent?: string;
        platform?: string;
        referer?: string;
        network_id?: string;
        browser?: string;
    };
    hidden?: Record<string, string>;
    calculated?: {
        score?: number;
    };
    answers?: TypeformAnswer[];
    variables?: Array<{
        key?: string;
        type?: string;
        text?: string;
        number?: number;
    }>;
}

export interface TypeformAnswer {
    field: {
        id: string;
        type: TypeformFieldType;
        ref?: string;
    };
    type: TypeformAnswerType;
    text?: string;
    email?: string;
    phone_number?: string;
    number?: number;
    boolean?: boolean;
    date?: string;
    url?: string;
    file_url?: string;
    choice?: {
        id?: string;
        label?: string;
        ref?: string;
    };
    choices?: {
        ids?: string[];
        labels?: string[];
        refs?: string[];
    };
    payment?: {
        amount?: string;
        last4?: string;
        name?: string;
        success?: boolean;
    };
}

export type TypeformAnswerType =
    | "text"
    | "email"
    | "phone_number"
    | "number"
    | "boolean"
    | "date"
    | "url"
    | "file_url"
    | "choice"
    | "choices"
    | "payment";

// Workspace types
export interface TypeformWorkspace {
    id: string;
    name: string;
    default?: boolean;
    shared?: boolean;
    forms?: {
        count: number;
        href: string;
    };
    self?: {
        href: string;
    };
    members?: Array<{
        email?: string;
        name?: string;
        role?: "owner" | "admin" | "member";
    }>;
}

export interface TypeformWorkspacesResponse {
    total_items: number;
    page_count: number;
    items: TypeformWorkspace[];
}

// Forms list response
export interface TypeformFormsResponse {
    total_items: number;
    page_count: number;
    items: TypeformForm[];
}

// API parameter types
export interface ListFormsParams {
    page?: number;
    pageSize?: number;
    search?: string;
    workspaceId?: string;
}

export interface ListResponsesParams {
    formId: string;
    pageSize?: number;
    since?: string;
    until?: string;
    after?: string;
    before?: string;
    includedResponseIds?: string;
    completed?: boolean;
    sort?: "submitted_at,asc" | "submitted_at,desc";
    query?: string;
    fields?: string[];
}

export interface ListWorkspacesParams {
    page?: number;
    pageSize?: number;
    search?: string;
}
