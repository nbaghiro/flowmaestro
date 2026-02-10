/**
 * Sage Operation Types
 *
 * Type definitions used across Sage operations
 */

export interface SageBusinessInfoOutput {
    name: string;
    countryCode?: string;
    defaultCurrency?: string;
    industryType?: string;
    telephone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SageContactOutput {
    id: string;
    name: string;
    contactTypeName?: string;
    reference?: string;
    email?: string;
    telephone?: string;
    mobile?: string;
    mainAddress?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
    };
    creditLimit?: number;
    creditDays?: number;
    currency?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SageInvoiceOutput {
    id: string;
    displayedAs?: string;
    invoiceNumber?: string;
    status?: string;
    contact: {
        id: string;
        displayedAs?: string;
    };
    date?: string;
    dueDate?: string;
    lineItems: Array<{
        id?: string;
        description?: string;
        quantity?: number;
        unitPrice?: number;
        totalAmount?: number;
        ledgerAccount?: string;
        taxRateId?: string;
    }>;
    netAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    outstandingAmount?: number;
    currency?: string;
    reference?: string;
    createdAt?: string;
    updatedAt?: string;
}
