/**
 * Hotjar API types and interfaces
 */

/**
 * Survey object from Hotjar API
 */
export interface HotjarSurvey {
    id: string;
    name: string;
    site_id: string;
    type: string;
    status: string;
    created_at: string;
    updated_at: string;
    questions?: HotjarSurveyQuestion[];
}

/**
 * Survey question
 */
export interface HotjarSurveyQuestion {
    id: string;
    type: string;
    text: string;
    position: number;
}

/**
 * Survey response object
 */
export interface HotjarSurveyResponse {
    id: string;
    survey_id: string;
    created_at: string;
    answers: HotjarSurveyAnswer[];
    browser: string;
    device: string;
    country: string;
    os: string;
}

/**
 * Individual answer within a survey response
 */
export interface HotjarSurveyAnswer {
    question_id: string;
    value: string | number | boolean | string[];
}

/**
 * Paginated list response from Hotjar API
 */
export interface HotjarPaginatedResponse<T> {
    results: T[];
    next_cursor: string | null;
}

/**
 * User lookup request body
 */
export interface HotjarUserLookupRequest {
    data_subject_email?: string;
    data_subject_site_id_to_user_id_map?: Record<string, string>;
    delete_all_hits?: boolean;
}

/**
 * User lookup response
 */
export interface HotjarUserLookupResponse {
    status: string;
    message: string;
    request_id: string;
}

/**
 * Error response from Hotjar API
 */
export interface HotjarErrorResponse {
    error?: string;
    message?: string;
    status_code?: number;
}
