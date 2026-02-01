/**
 * Rippling API Response Types
 */

/**
 * Rippling Employee resource
 */
export interface RipplingEmployee {
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    personalEmail: string | null;
    phone: string | null;
    title: string | null;
    department: RipplingDepartmentRef | null;
    managerId: string | null;
    managerName: string | null;
    startDate: string;
    endDate: string | null;
    employmentType: string;
    employmentStatus: "ACTIVE" | "TERMINATED" | "ON_LEAVE";
    workLocation: RipplingWorkLocationRef | null;
    team: RipplingTeamRef | null;
    flsaStatus: string | null;
    isManager: boolean;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Rippling Department Reference
 */
export interface RipplingDepartmentRef {
    id: string;
    name: string;
}

/**
 * Rippling Work Location Reference
 */
export interface RipplingWorkLocationRef {
    id: string;
    name: string;
}

/**
 * Rippling Team Reference
 */
export interface RipplingTeamRef {
    id: string;
    name: string;
}

/**
 * Rippling Department resource
 */
export interface RipplingDepartment {
    id: string;
    name: string;
    code: string | null;
    parentId: string | null;
    parentName: string | null;
    headId: string | null;
    headName: string | null;
    memberCount: number;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Rippling Team resource
 */
export interface RipplingTeam {
    id: string;
    name: string;
    description: string | null;
    leaderId: string | null;
    leaderName: string | null;
    memberCount: number;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Rippling Work Location resource
 */
export interface RipplingWorkLocation {
    id: string;
    name: string;
    address: RipplingAddress;
    timezone: string;
    isPrimary: boolean;
    employeeCount: number;
}

/**
 * Rippling Address
 */
export interface RipplingAddress {
    street1: string;
    street2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
}

/**
 * Rippling Company resource
 */
export interface RipplingCompany {
    id: string;
    name: string;
    legalName: string;
    ein: string | null;
    address: RipplingAddress;
    phone: string | null;
    website: string | null;
    industry: string | null;
    employeeCount: number;
    foundedYear: number | null;
}

/**
 * Rippling Leave Request resource
 */
export interface RipplingLeaveRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    leaveType: string;
    leaveTypeName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    status: RipplingLeaveStatus;
    reason: string | null;
    reviewerId: string | null;
    reviewerName: string | null;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Rippling Leave Status
 */
export type RipplingLeaveStatus = "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";

/**
 * Rippling Leave Balance
 */
export interface RipplingLeaveBalance {
    employeeId: string;
    employeeName: string;
    policyId: string;
    policyName: string;
    balance: number;
    unit: string;
    accrued: number;
    used: number;
    pending: number;
    asOfDate: string;
}

/**
 * Rippling API Pagination
 */
export interface RipplingPagination {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Rippling API Response wrapper for single resource
 */
export interface RipplingResourceResponse<T> {
    data: T;
}

/**
 * Rippling API Response wrapper for collections
 */
export interface RipplingCollectionResponse<T> {
    data: T[];
    pagination: RipplingPagination;
}
