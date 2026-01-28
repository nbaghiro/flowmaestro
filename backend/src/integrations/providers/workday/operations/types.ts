/**
 * Workday API Response Types
 */

/**
 * Workday Worker resource
 */
export interface WorkdayWorker {
    id: string;
    workerId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    businessTitle: string;
    department: string;
    supervisorId: string | null;
    supervisorName: string | null;
    hireDate: string;
    terminationDate: string | null;
    workerType: string;
    location: string;
    employeeStatus: string;
    managementLevel: string | null;
    timeType: string;
    payType: string;
}

/**
 * Workday Worker Detail with extended information
 */
export interface WorkdayWorkerDetail extends WorkdayWorker {
    jobProfile: WorkdayJobProfile;
    compensation: WorkdayCompensation | null;
    organization: WorkdayOrganization;
    customFields: Record<string, unknown>;
}

/**
 * Workday Job Profile
 */
export interface WorkdayJobProfile {
    id: string;
    name: string;
    jobFamily: string;
    jobFamilyGroup: string;
    jobCategory: string;
    managementLevel: string | null;
}

/**
 * Workday Compensation
 */
export interface WorkdayCompensation {
    basePay: number;
    currency: string;
    frequency: string;
    effectiveDate: string;
}

/**
 * Workday Organization
 */
export interface WorkdayOrganization {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
}

/**
 * Workday Absence Balance
 */
export interface WorkdayAbsenceBalance {
    workerId: string;
    workerName: string;
    timeOffPlanId: string;
    timeOffPlanName: string;
    balance: number;
    unit: string;
    asOfDate: string;
}

/**
 * Workday Absence Type
 */
export interface WorkdayAbsenceType {
    id: string;
    name: string;
    description: string | null;
    category: string;
    unit: string;
    minDuration: number | null;
    maxDuration: number | null;
    requiresApproval: boolean;
}

/**
 * Workday Time Off Request
 */
export interface WorkdayTimeOffRequest {
    id: string;
    workerId: string;
    workerName: string;
    absenceTypeId: string;
    absenceTypeName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    status: WorkdayTimeOffStatus;
    comment: string | null;
    approverName: string | null;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Workday Time Off Request Status
 */
export type WorkdayTimeOffStatus = "pending" | "approved" | "denied" | "cancelled" | "in_progress";

/**
 * Workday Pay Group
 */
export interface WorkdayPayGroup {
    id: string;
    name: string;
    description: string | null;
    frequency: string;
    country: string;
    currency: string;
    nextPayDate: string | null;
    workerCount: number;
}

/**
 * Workday Company Info
 */
export interface WorkdayCompanyInfo {
    id: string;
    name: string;
    legalName: string;
    industry: string;
    country: string;
    headquarters: string;
    employeeCount: number;
    foundedYear: number | null;
    website: string | null;
    fiscalYearStartMonth: number;
}

/**
 * Workday API Pagination
 */
export interface WorkdayPagination {
    total: number;
    offset: number;
    limit: number;
}

/**
 * Workday API Response wrapper for single resource
 */
export interface WorkdayResourceResponse<T> {
    data: T;
}

/**
 * Workday API Response wrapper for collections
 */
export interface WorkdayCollectionResponse<T> {
    data: T[];
    total: number;
    offset: number;
    limit: number;
}

/**
 * Workday Create Time Off Request
 */
export interface WorkdayCreateTimeOffRequest {
    workerId: string;
    absenceTypeId: string;
    startDate: string;
    endDate: string;
    comment?: string;
}
