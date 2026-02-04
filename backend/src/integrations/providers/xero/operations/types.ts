/**
 * Xero Operation Types
 *
 * Type definitions used across Xero operations
 */

export interface XeroOrganisationOutput {
    organisationId: string;
    name: string;
    legalName?: string;
    shortCode?: string;
    version?: string;
    organisationType?: string;
    baseCurrency?: string;
    countryCode?: string;
    isDemoCompany?: boolean;
    taxNumber?: string;
    financialYearEndDay?: number;
    financialYearEndMonth?: number;
    lineOfBusiness?: string;
    registrationNumber?: string;
    createdDateUTC?: string;
}

export interface XeroContactOutput {
    contactId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    contactStatus?: string;
    phones?: Array<{
        phoneType: string;
        phoneNumber?: string;
        phoneAreaCode?: string;
        phoneCountryCode?: string;
    }>;
    addresses?: Array<{
        addressType: string;
        addressLine1?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
    }>;
    isSupplier?: boolean;
    isCustomer?: boolean;
    updatedDateUTC?: string;
}

export interface XeroInvoiceOutput {
    invoiceId: string;
    invoiceNumber?: string;
    type: string;
    status: string;
    contact: {
        contactId: string;
        name?: string;
    };
    date?: string;
    dueDate?: string;
    lineItems: Array<{
        lineItemId?: string;
        description?: string;
        quantity?: number;
        unitAmount?: number;
        lineAmount?: number;
        accountCode?: string;
        taxType?: string;
    }>;
    subTotal?: number;
    totalTax?: number;
    total?: number;
    amountDue?: number;
    amountPaid?: number;
    currencyCode?: string;
    reference?: string;
    updatedDateUTC?: string;
}
