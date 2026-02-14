/**
 * SAP SuccessFactors OData Entity Types
 *
 * Based on SAP SuccessFactors OData v2 API
 * API Base URL: https://{apiServer}/odata/v2
 */

/**
 * SuccessFactors User entity (employee)
 */
export interface SFUser {
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    status: string;
    hireDate: string | null;
    lastModifiedDateTime: string;
    department: string | null;
    division: string | null;
    title: string | null;
    managerId: string | null;
    location: string | null;
    country: string | null;
    timeZone: string | null;
    defaultLocale: string | null;
}

/**
 * SuccessFactors FODepartment entity
 */
export interface SFDepartment {
    externalCode: string;
    name: string;
    description: string | null;
    parentDepartment: string | null;
    headOfDepartment: string | null;
    costCenter: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
}

/**
 * SuccessFactors EmpJob entity (job assignment)
 */
export interface SFEmpJob {
    seqNumber: number;
    userId: string;
    startDate: string;
    endDate: string | null;
    jobCode: string;
    jobTitle: string;
    department: string | null;
    division: string | null;
    businessUnit: string | null;
    location: string | null;
    costCenter: string | null;
    managerId: string | null;
    employmentType: string | null;
    employeeClass: string | null;
    payGrade: string | null;
    standardHours: number | null;
    fte: number | null;
    eventReason: string | null;
    lastModifiedDateTime: string;
}

/**
 * SuccessFactors EmployeeTime entity (time off request)
 */
export interface SFEmployeeTime {
    externalCode: string;
    userId: string;
    timeType: string;
    timeTypeName: string | null;
    startDate: string;
    endDate: string;
    quantityInDays: number;
    quantityInHours: number | null;
    approvalStatus: SFApprovalStatus;
    comment: string | null;
    workflowRequestId: string | null;
    lastModifiedDateTime: string;
    createdDateTime: string;
}

/**
 * Approval status values
 */
export type SFApprovalStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "PENDING_CANCELLATION";

/**
 * SuccessFactors TimeAccountDetail entity (time off balance)
 */
export interface SFTimeAccountDetail {
    externalCode: string;
    userId: string;
    timeAccount: string;
    timeAccountName: string | null;
    balance: number;
    unit: string;
    asOfDate: string;
    bookingStartDate: string | null;
    bookingEndDate: string | null;
    approved: number;
    pending: number;
}

/**
 * OData v2 response wrapper for collections
 */
export interface ODataCollectionResponse<T> {
    d: {
        results: T[];
        __count?: string;
        __next?: string;
    };
}

/**
 * OData v2 response wrapper for single entity
 */
export interface ODataEntityResponse<T> {
    d: T;
}

/**
 * Normalized User response
 */
export interface NormalizedEmployee {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    status: string;
    hireDate: string | null;
    department: string | null;
    division: string | null;
    title: string | null;
    managerId: string | null;
    location: string | null;
    country: string | null;
    lastModified: string;
}

/**
 * Normalized Department response
 */
export interface NormalizedDepartment {
    id: string;
    name: string;
    description: string | null;
    parentDepartmentId: string | null;
    headOfDepartmentId: string | null;
    costCenter: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
}

/**
 * Normalized Time Off Request response
 */
export interface NormalizedTimeOffRequest {
    id: string;
    userId: string;
    timeType: string;
    timeTypeName: string | null;
    startDate: string;
    endDate: string;
    daysRequested: number;
    hoursRequested: number | null;
    status: string;
    comment: string | null;
    createdAt: string;
    lastModified: string;
}

/**
 * Normalized Time Off Balance response
 */
export interface NormalizedTimeOffBalance {
    id: string;
    userId: string;
    accountId: string;
    accountName: string | null;
    balance: number;
    unit: string;
    asOfDate: string;
    approved: number;
    pending: number;
}

/**
 * Normalized Job Assignment response
 */
export interface NormalizedJobAssignment {
    sequenceNumber: number;
    userId: string;
    startDate: string;
    endDate: string | null;
    jobCode: string;
    jobTitle: string;
    department: string | null;
    division: string | null;
    businessUnit: string | null;
    location: string | null;
    costCenter: string | null;
    managerId: string | null;
    employmentType: string | null;
    employeeClass: string | null;
    payGrade: string | null;
    standardHours: number | null;
    fte: number | null;
    lastModified: string;
}

/**
 * Pagination info for normalized responses
 */
export interface NormalizedPagination {
    total: number | null;
    top: number;
    skip: number;
    hasMore: boolean;
    nextLink: string | null;
}
