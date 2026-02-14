/**
 * Deel API Response Types
 *
 * Based on Deel REST API v2
 * API Base URL: https://api.letsdeel.com/rest/v2
 */

/**
 * Deel Person (Worker) - represents employees, contractors, and EOR workers
 */
export interface DeelPerson {
    id: string;
    display_name: string;
    first_name: string;
    last_name: string;
    email: string;
    worker_type: DeelWorkerType;
    status: DeelWorkerStatus;
    hire_date: string;
    termination_date: string | null;
    department: string | null;
    job_title: string | null;
    country: string;
    currency: string;
    manager_id: string | null;
    created_at: string;
    updated_at: string | null;
}

/**
 * Worker types in Deel
 */
export type DeelWorkerType = "employee" | "contractor" | "eor";

/**
 * Worker statuses in Deel
 */
export type DeelWorkerStatus = "active" | "inactive" | "pending" | "offboarding";

/**
 * Deel Contract
 */
export interface DeelContract {
    id: string;
    person_id: string;
    person_name: string;
    type: DeelContractType;
    status: DeelContractStatus;
    start_date: string;
    end_date: string | null;
    compensation: DeelCompensation;
    job_title: string;
    scope_of_work: string | null;
    country: string;
    created_at: string;
    updated_at: string | null;
}

/**
 * Contract types in Deel
 */
export type DeelContractType = "employee" | "contractor" | "eor";

/**
 * Contract statuses in Deel
 */
export type DeelContractStatus = "active" | "terminated" | "pending" | "draft";

/**
 * Deel Compensation
 */
export interface DeelCompensation {
    amount: number;
    currency: string;
    frequency: DeelPayFrequency;
}

/**
 * Pay frequency options
 */
export type DeelPayFrequency =
    | "hourly"
    | "daily"
    | "weekly"
    | "bi_weekly"
    | "semi_monthly"
    | "monthly"
    | "annually";

/**
 * Deel Time Off Request
 */
export interface DeelTimeOffRequest {
    id: string;
    person_id: string;
    person_name: string;
    type: string;
    type_name: string;
    start_date: string;
    end_date: string;
    total_days: number;
    status: DeelTimeOffStatus;
    reason: string | null;
    reviewer_id: string | null;
    reviewer_name: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string | null;
}

/**
 * Time off statuses
 */
export type DeelTimeOffStatus = "pending" | "approved" | "declined" | "cancelled";

/**
 * Deel Time Off Entitlement/Balance
 */
export interface DeelTimeOffEntitlement {
    person_id: string;
    person_name: string;
    policy_id: string;
    policy_name: string;
    balance: number;
    unit: string;
    accrued: number;
    used: number;
    pending: number;
    as_of_date: string;
}

/**
 * Deel Timesheet (for contractors)
 */
export interface DeelTimesheet {
    id: string;
    person_id: string;
    person_name: string;
    contract_id: string;
    period_start: string;
    period_end: string;
    status: DeelTimesheetStatus;
    total_hours: number;
    total_amount: number;
    currency: string;
    submitted_at: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string | null;
}

/**
 * Timesheet statuses
 */
export type DeelTimesheetStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";

/**
 * Deel API Pagination
 */
export interface DeelPagination {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
}

/**
 * Deel API Response wrapper for single resource
 */
export interface DeelResourceResponse<T> {
    data: T;
}

/**
 * Deel API Response wrapper for collections
 */
export interface DeelCollectionResponse<T> {
    data: T[];
    pagination: DeelPagination;
}

/**
 * Create Time Off Request payload
 */
export interface CreateTimeOffRequestPayload {
    person_id: string;
    type: string;
    start_date: string;
    end_date: string;
    reason?: string;
}
