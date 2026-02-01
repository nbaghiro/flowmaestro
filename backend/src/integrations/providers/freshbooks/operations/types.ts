/**
 * FreshBooks Operation Types
 *
 * Type definitions used across FreshBooks operations
 */

export interface FreshBooksUserOutput {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    confirmedAt?: string;
    createdAt?: string;
    setupComplete: boolean;
    businesses?: Array<{
        id: number;
        accountId: string;
        name: string;
        role: string;
    }>;
}

export interface FreshBooksClientOutput {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    organization: string;
    phone?: string;
    mobilePhone?: string;
    address?: {
        street?: string;
        city?: string;
        province?: string;
        postalCode?: string;
        country?: string;
    };
    currencyCode: string;
    updatedAt: string;
}

export interface FreshBooksInvoiceOutput {
    id: number;
    invoiceNumber: string;
    customerId: number;
    createDate: string;
    dueDate: string;
    status: string;
    displayStatus: string;
    currencyCode: string;
    amount: number;
    outstanding: number;
    paid: number;
    notes?: string;
    terms?: string;
    lineItems?: Array<{
        id: number;
        name: string;
        description: string;
        quantity: number;
        unitCost: number;
        amount: number;
    }>;
    updatedAt: string;
}

export interface FreshBooksExpenseOutput {
    id: number;
    staffId: number;
    categoryId: number;
    clientId?: number;
    projectId?: number;
    vendor: string;
    date: string;
    notes: string;
    amount: number;
    currencyCode: string;
    status: number;
    updatedAt: string;
}
