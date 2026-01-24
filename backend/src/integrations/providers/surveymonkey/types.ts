/**
 * SurveyMonkey API Types
 */

// User/Account types
export interface SurveyMonkeyUser {
    id: string;
    username: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    account_type?: string;
    language?: string;
    date_created?: string;
    date_last_login?: string;
}

// Survey types
export interface SurveyMonkeySurvey {
    id: string;
    title: string;
    nickname?: string;
    href?: string;
    custom_variables?: Record<string, string>;
    language?: string;
    question_count?: number;
    page_count?: number;
    date_created?: string;
    date_modified?: string;
    response_count?: number;
    folder_id?: string;
    analyze_url?: string;
    preview_url?: string;
    collect_url?: string;
    edit_url?: string;
    summary_url?: string;
}

export interface SurveyMonkeySurveyDetail extends SurveyMonkeySurvey {
    pages?: SurveyMonkeyPage[];
    footer?: boolean;
}

export interface SurveyMonkeyPage {
    id: string;
    title?: string;
    description?: string;
    position?: number;
    question_count?: number;
    questions?: SurveyMonkeyQuestion[];
}

export interface SurveyMonkeyQuestion {
    id: string;
    family?: SurveyMonkeyQuestionFamily;
    subtype?: string;
    headings?: Array<{
        heading?: string;
    }>;
    position?: number;
    required?: SurveyMonkeyValidation | null;
    validation?: SurveyMonkeyValidation | null;
    answers?: {
        choices?: SurveyMonkeyChoice[];
        rows?: SurveyMonkeyRow[];
        cols?: SurveyMonkeyColumn[];
        other?: {
            id?: string;
            text?: string;
            visible?: boolean;
            is_answer_choice?: boolean;
            position?: number;
        };
    };
}

export type SurveyMonkeyQuestionFamily =
    | "single_choice"
    | "multiple_choice"
    | "matrix"
    | "open_ended"
    | "demographic"
    | "datetime"
    | "presentation"
    | "file_upload";

export interface SurveyMonkeyValidation {
    text?: string;
    type?: string;
    min?: number;
    max?: number;
    sum?: number;
    sum_text?: string;
}

export interface SurveyMonkeyChoice {
    id: string;
    text?: string;
    position?: number;
    weight?: number;
    is_na?: boolean;
}

export interface SurveyMonkeyRow {
    id: string;
    text?: string;
    position?: number;
}

export interface SurveyMonkeyColumn {
    id: string;
    text?: string;
    position?: number;
    weight?: number;
}

// Response types
export interface SurveyMonkeyResponse {
    id: string;
    survey_id?: string;
    collector_id?: string;
    recipient_id?: string;
    total_time?: number;
    custom_value?: string;
    edit_url?: string;
    analyze_url?: string;
    ip_address?: string;
    custom_variables?: Record<string, string>;
    logic_path?: Record<string, string>;
    metadata?: {
        contact?: Record<string, string>;
    };
    response_status?: SurveyMonkeyResponseStatus;
    collection_mode?: "default" | "preview" | "data_entry" | "survey_preview" | "edit";
    date_created?: string;
    date_modified?: string;
    pages?: SurveyMonkeyResponsePage[];
}

export type SurveyMonkeyResponseStatus = "completed" | "partial" | "overquota" | "disqualified";

export interface SurveyMonkeyResponsePage {
    id: string;
    questions?: SurveyMonkeyResponseQuestion[];
}

export interface SurveyMonkeyResponseQuestion {
    id: string;
    variable_id?: string;
    answers?: SurveyMonkeyResponseAnswer[];
}

export interface SurveyMonkeyResponseAnswer {
    choice_id?: string;
    row_id?: string;
    col_id?: string;
    other_id?: string;
    text?: string;
    tag_data?: Array<{
        name?: string;
        description?: string;
    }>;
}

// Collector types
export interface SurveyMonkeyCollector {
    id: string;
    name?: string;
    href?: string;
    type?: SurveyMonkeyCollectorType;
    status?: "open" | "closed" | "new";
    date_created?: string;
    date_modified?: string;
    response_count?: number;
    url?: string;
    edit_url?: string;
    redirect_type?: "url" | "close" | "loop";
    redirect_url?: string;
    thank_you_message?: string;
    allow_multiple_responses?: boolean;
    anonymous_type?: "not_anonymous" | "partially_anonymous" | "fully_anonymous";
    password_enabled?: boolean;
    display_survey_results?: boolean;
    close_date?: string;
    response_limit?: number;
    sender_email?: string;
    edit_response_type?: "until_complete" | "open" | "disabled";
}

export type SurveyMonkeyCollectorType =
    | "weblink"
    | "email"
    | "embedded"
    | "facebook"
    | "popup"
    | "sms";

// API response wrappers
export interface SurveyMonkeyPaginatedResponse<T> {
    data: T[];
    per_page: number;
    page: number;
    total: number;
    links?: {
        self?: string;
        prev?: string;
        next?: string;
        first?: string;
        last?: string;
    };
}

export type SurveyMonkeySurveysResponse = SurveyMonkeyPaginatedResponse<SurveyMonkeySurvey>;

export type SurveyMonkeyResponsesResponse = SurveyMonkeyPaginatedResponse<SurveyMonkeyResponse>;

export type SurveyMonkeyCollectorsResponse = SurveyMonkeyPaginatedResponse<SurveyMonkeyCollector>;

// API error response
export interface SurveyMonkeyError {
    error: {
        id: string;
        name: string;
        docs?: string;
        message?: string;
        http_status_code?: number;
    };
}

// API parameter types
export interface ListSurveysParams {
    page?: number;
    perPage?: number;
}

export interface GetSurveyParams {
    surveyId: string;
}

export interface GetSurveyDetailsParams {
    surveyId: string;
}

export interface ListResponsesParams {
    surveyId: string;
    page?: number;
    perPage?: number;
    startCreatedAt?: string;
    endCreatedAt?: string;
    status?: SurveyMonkeyResponseStatus;
}

export interface GetResponseDetailsParams {
    surveyId: string;
    responseId: string;
}

export interface ListCollectorsParams {
    surveyId: string;
    page?: number;
    perPage?: number;
}
