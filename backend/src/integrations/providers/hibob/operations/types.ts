/**
 * HiBob API Types
 *
 * Based on HiBob API documentation: https://apidocs.hibob.com/
 */

// Employee types
export interface HiBobEmployee {
    id: string;
    firstName: string;
    surname: string;
    email: string;
    displayName: string;
    personal?: {
        shortBirthDate?: string;
        nationality?: string;
        gender?: string;
    };
    work?: {
        title?: string;
        department?: string;
        site?: string;
        startDate?: string;
        manager?: string;
        reportsTo?: {
            id?: string;
            firstName?: string;
            surname?: string;
            email?: string;
            displayName?: string;
        };
        employmentType?: string;
        customColumns?: Record<string, unknown>;
    };
    internal?: {
        status?: string;
        terminationDate?: string;
        terminationReason?: string;
    };
    avatarUrl?: string;
    creationDateTime?: string;
}

export interface HiBobEmployeesResponse {
    employees: HiBobEmployee[];
}

export interface HiBobSearchResponse {
    employees: HiBobEmployee[];
    totalCount: number;
}

// Time-off types
export interface HiBobTimeOffRequest {
    id: number;
    requestId: number;
    employeeId: string;
    employeeDisplayName: string;
    policyType: string;
    policyTypeDisplayName: string;
    type: string;
    status: "approved" | "pending" | "declined" | "canceled";
    startDate: string;
    startDatePortion: "all_day" | "morning" | "afternoon";
    endDate: string;
    endDatePortion: "all_day" | "morning" | "afternoon";
    requestedDays?: number;
    description?: string;
    approver?: {
        id: string;
        firstName: string;
        surname: string;
        email: string;
    };
    creationDateTime: string;
}

export interface HiBobTimeOffRequestsResponse {
    requests: HiBobTimeOffRequest[];
}

export interface HiBobTimeOffBalance {
    employeeId: string;
    policyType: string;
    policyTypeDisplayName: string;
    balance: number;
    used: number;
    pending: number;
    available: number;
    startingBalance: number;
    accrued: number;
    adjustments: number;
}

export interface HiBobTimeOffBalanceResponse {
    balances: HiBobTimeOffBalance[];
}

export interface HiBobTimeOffPolicy {
    name: string;
    policyType: string;
    allowance?: number;
    unit: "days" | "hours";
    isUnlimited: boolean;
    accrualPeriod?: string;
}

export interface HiBobTimeOffPoliciesResponse {
    policies: HiBobTimeOffPolicy[];
}

export interface HiBobWhosOutEntry {
    employeeId: string;
    employeeDisplayName: string;
    policyType: string;
    policyTypeDisplayName: string;
    startDate: string;
    endDate: string;
}

export interface HiBobWhosOutResponse {
    outs: HiBobWhosOutEntry[];
}

// Create time-off request
export interface HiBobCreateTimeOffRequest {
    policyType: string;
    startDate: string;
    startDatePortion?: "all_day" | "morning" | "afternoon";
    endDate: string;
    endDatePortion?: "all_day" | "morning" | "afternoon";
    description?: string;
    approver?: string;
    skipManagerApproval?: boolean;
}

export interface HiBobCreateTimeOffResponse {
    id: number;
    requestId: number;
    status: string;
}
