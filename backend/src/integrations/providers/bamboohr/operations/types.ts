/**
 * BambooHR API Response Types
 */

/**
 * BambooHR Employee resource
 */
export interface BambooHREmployee {
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    workEmail: string | null;
    jobTitle: string | null;
    department: string | null;
    division: string | null;
    supervisorId: string | null;
    supervisorName: string | null;
    location: string | null;
    status: "Active" | "Inactive";
    hireDate: string | null;
    terminationDate: string | null;
    workPhone: string | null;
    mobilePhone: string | null;
    photoUrl: string | null;
}

/**
 * BambooHR Employee Directory Entry
 */
export interface BambooHRDirectoryEntry {
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    jobTitle: string | null;
    workPhone: string | null;
    workEmail: string | null;
    department: string | null;
    location: string | null;
    division: string | null;
    photoUrl: string | null;
}

/**
 * BambooHR Company Info
 */
export interface BambooHRCompanyInfo {
    name: string;
    employees: number;
    paidTimeOffAllowed: boolean;
    timezone: string;
}

/**
 * BambooHR Time Off Request
 */
export interface BambooHRTimeOffRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    start: string;
    end: string;
    type: BambooHRTimeOffType;
    amount: BambooHRTimeOffAmount;
    status: BambooHRTimeOffStatus;
    notes: string | null;
    created: string;
}

/**
 * BambooHR Time Off Type
 */
export interface BambooHRTimeOffType {
    id: string;
    name: string;
}

/**
 * BambooHR Time Off Amount
 */
export interface BambooHRTimeOffAmount {
    unit: "hours" | "days";
    amount: number;
}

/**
 * BambooHR Time Off Status
 */
export type BambooHRTimeOffStatus = "approved" | "denied" | "superceded" | "requested" | "canceled";

/**
 * BambooHR Who's Out Entry
 */
export interface BambooHRWhosOutEntry {
    id: string;
    type: "timeOff" | "holiday";
    employeeId: string | null;
    employeeName: string | null;
    name: string;
    start: string;
    end: string;
}

/**
 * BambooHR Time Off Policy
 */
export interface BambooHRTimeOffPolicy {
    id: string;
    name: string;
    type: string;
    accrualType: string;
    effectiveDate: string | null;
}

/**
 * BambooHR Create Time Off Request
 */
export interface BambooHRCreateTimeOffRequest {
    employeeId: string;
    start: string;
    end: string;
    timeOffTypeId: string;
    amount: number;
    notes?: string;
    status?: "requested" | "approved";
}

/**
 * BambooHR API Pagination
 */
export interface BambooHRPagination {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * BambooHR API Response wrapper for single resource
 */
export interface BambooHRResourceResponse<T> {
    data: T;
}

/**
 * BambooHR API Response wrapper for collections
 */
export interface BambooHRCollectionResponse<T> {
    data: T[];
    pagination: BambooHRPagination;
}
