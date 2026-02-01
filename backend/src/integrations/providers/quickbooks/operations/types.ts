/**
 * QuickBooks Operation Types
 *
 * Type definitions used across QuickBooks operations
 */

export interface QuickBooksCustomerOutput {
    id: string;
    displayName: string;
    givenName?: string;
    familyName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    billingAddress?: {
        line1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
    };
    balance?: number;
    active?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface QuickBooksInvoiceOutput {
    id: string;
    docNumber?: string;
    txnDate?: string;
    dueDate?: string;
    customer: {
        id: string;
        name?: string;
    };
    lineItems: Array<{
        id?: string;
        lineNum?: number;
        description?: string;
        amount: number;
        quantity?: number;
        unitPrice?: number;
    }>;
    totalAmount: number;
    balance?: number;
    billEmail?: string;
    emailStatus?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface QuickBooksCompanyInfoOutput {
    id: string;
    companyName: string;
    legalName?: string;
    address?: {
        line1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    phone?: string;
    email?: string;
    website?: string;
    fiscalYearStartMonth?: string;
    country?: string;
}
