/**
 * Expensify API types and interfaces
 *
 * Based on official Expensify Integrations documentation:
 * https://integrations.expensify.com/
 */

// ============================================
// Report Types
// ============================================

export interface ExpensifyReport {
    reportID: string;
    reportName: string;
    status: "Open" | "Processing" | "Approved" | "Reimbursed" | "Archived";
    total: number;
    currency: string;
    created: string;
    submitted?: string;
    approved?: string;
    reimbursed?: string;
    ownerEmail: string;
    policyID?: string;
    policyName?: string;
    expenses?: ExpensifyExpense[];
}

export interface ExpensifyExpense {
    transactionID: string;
    merchant: string;
    amount: number;
    currency: string;
    category?: string;
    tag?: string;
    comment?: string;
    created: string;
    billable: boolean;
    reimbursable: boolean;
    receiptID?: string;
    receiptFilename?: string;
}

export interface ExpensifyReportInput {
    type?: "csv" | "json";
    startDate?: string;
    endDate?: string;
    status?: "Open" | "Processing" | "Approved" | "Reimbursed" | "Archived";
    email?: string;
    policyID?: string;
    limit?: number;
}

// ============================================
// Expense Types
// ============================================

export interface ExpensifyExpenseInput {
    transactionList: Array<{
        merchant: string;
        amount: number;
        currency?: string;
        created: string;
        category?: string;
        tag?: string;
        comment?: string;
        billable?: boolean;
        reimbursable?: boolean;
        policyID?: string;
    }>;
    employeeEmail: string;
}

// ============================================
// Policy Types
// ============================================

export interface ExpensifyPolicy {
    policyID: string;
    name: string;
    type: "team" | "corporate";
    owner: string;
    outputCurrency: string;
    employees?: ExpensifyEmployee[];
}

export interface ExpensifyEmployee {
    email: string;
    role: "admin" | "user" | "auditor";
    approvalLimit?: number;
    isExpensifyCard?: boolean;
}

export interface ExpensifyPolicyInput {
    policyID: string;
    name?: string;
    outputCurrency?: string;
    maxExpenseAge?: number;
    maxExpenseAmount?: number;
    autoApprove?: {
        maxAmount: number;
    };
}

// ============================================
// Employee Management Types
// ============================================

export interface ExpensifyEmployeeInput {
    policyID: string;
    employees: Array<{
        email: string;
        role?: "admin" | "user" | "auditor";
        action: "add" | "update" | "delete";
        approvalLimit?: number;
    }>;
}

// ============================================
// API Request/Response Types
// ============================================

export interface ExpensifyJobRequest {
    type: "file" | "get" | "create" | "update";
    credentials: {
        partnerUserID: string;
        partnerUserSecret: string;
    };
    inputSettings?: Record<string, unknown>;
    onReceive?: {
        immediateResponse: string[];
    };
}

export interface ExpensifyJobResponse {
    responseCode: number;
    responseMessage?: string;
    [key: string]: unknown;
}
