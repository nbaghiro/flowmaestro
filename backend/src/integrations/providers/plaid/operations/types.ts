/**
 * Plaid Operation Types
 *
 * Type definitions used across Plaid operations
 */

export interface PlaidAccountOutput {
    accountId: string;
    name: string;
    officialName?: string;
    type: string;
    subtype?: string;
    mask?: string;
    balances?: {
        available?: number;
        current?: number;
        limit?: number;
        isoCurrencyCode?: string;
    };
}

export interface PlaidBalanceOutput {
    accountId: string;
    name: string;
    balances: {
        available?: number;
        current?: number;
        limit?: number;
        isoCurrencyCode?: string;
        lastUpdatedDatetime?: string;
    };
}

export interface PlaidTransactionOutput {
    transactionId: string;
    accountId: string;
    amount: number;
    isoCurrencyCode?: string;
    date: string;
    name: string;
    merchantName?: string;
    category?: string[];
    pending: boolean;
    paymentChannel?: string;
    location?: {
        address?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
    };
}

export interface PlaidInstitutionOutput {
    institutionId: string;
    name: string;
    products?: string[];
    countryCodes?: string[];
    url?: string;
    logo?: string;
    primaryColor?: string;
}

export interface PlaidIdentityOutput {
    accountId: string;
    owners: Array<{
        names: string[];
        emails: Array<{
            data: string;
            primary: boolean;
            type: string;
        }>;
        phoneNumbers: Array<{
            data: string;
            primary: boolean;
            type: string;
        }>;
        addresses: Array<{
            data: {
                street?: string;
                city?: string;
                region?: string;
                postalCode?: string;
                country?: string;
            };
            primary: boolean;
        }>;
    }>;
}

export interface PlaidLinkTokenOutput {
    linkToken: string;
    expiration: string;
    requestId: string;
}
