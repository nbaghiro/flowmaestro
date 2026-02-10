/**
 * Wise API types and interfaces
 *
 * Based on official Wise API documentation:
 * https://docs.wise.com/api-reference
 */

// ============================================
// Profile Types
// ============================================

export interface WiseProfile {
    id: number;
    type: "personal" | "business";
    details: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        phoneNumber?: string;
        avatar?: string;
        occupation?: string;
        occupations?: string[];
        primaryAddress?: number;
        name?: string;
        registrationNumber?: string;
        companyType?: string;
        companyRole?: string;
        descriptionOfBusiness?: string;
        webpage?: string;
        businessCategory?: string;
        businessSubCategory?: string;
    };
}

// ============================================
// Balance Types
// ============================================

export interface WiseBalance {
    id: number;
    currency: string;
    amount: {
        value: number;
        currency: string;
    };
    reservedAmount: {
        value: number;
        currency: string;
    };
    bankDetails?: WiseBankDetails;
    type: "STANDARD" | "SAVINGS";
    name?: string;
    icon?: {
        name: string;
        backgroundColor: string;
    };
    creationTime: string;
    modificationTime: string;
}

export interface WiseBankDetails {
    id: number;
    currency: string;
    bankCode?: string;
    accountNumber?: string;
    swift?: string;
    iban?: string;
    bankName?: string;
    accountHolderName?: string;
    bankAddress?: {
        addressFirstLine?: string;
        city?: string;
        country?: string;
        postCode?: string;
    };
}

// ============================================
// Quote Types
// ============================================

export interface WiseQuote {
    id: string;
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount?: number;
    targetAmount?: number;
    payOut: "BALANCE" | "BANK_TRANSFER" | "SWIFT" | "SWIFT_OUR" | "INTERAC";
    rate: number;
    createdTime: string;
    user: number;
    profile: number;
    rateType: "FIXED" | "FLOATING";
    rateExpirationTime?: string;
    paymentOptions: WisePaymentOption[];
    status: "PENDING" | "ACCEPTED" | "FUNDED" | "EXPIRED";
    expirationTime: string;
    notices?: WiseNotice[];
}

export interface WisePaymentOption {
    disabled: boolean;
    estimatedDelivery: string;
    formattedEstimatedDelivery: string;
    estimatedDeliveryDelays: string[];
    fee: {
        transferWise: number;
        payIn: number;
        discount: number;
        total: number;
        priceSetId: number;
        partner: number;
    };
    sourceAmount: number;
    targetAmount: number;
    sourceCurrency: string;
    targetCurrency: string;
    payIn: string;
    payOut: string;
    allowedProfileTypes: string[];
    payInProduct: string;
    feePercentage: number;
}

export interface WiseNotice {
    text: string;
    link?: string;
    type: string;
}

export interface WiseQuoteInput {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount?: number;
    targetAmount?: number;
    payOut?: "BALANCE" | "BANK_TRANSFER" | "SWIFT" | "SWIFT_OUR" | "INTERAC";
}

// ============================================
// Recipient Types
// ============================================

export interface WiseRecipient {
    id: number;
    profile: number;
    accountHolderName: string;
    type: string;
    country: string;
    currency: string;
    details: Record<string, unknown>;
    user?: number;
    active: boolean;
    ownedByCustomer: boolean;
}

export interface WiseRecipientInput {
    currency: string;
    type: string;
    profile: number;
    accountHolderName: string;
    details: Record<string, unknown>;
    ownedByCustomer?: boolean;
}

// ============================================
// Transfer Types
// ============================================

export interface WiseTransfer {
    id: number;
    user: number;
    targetAccount: number;
    sourceAccount?: number;
    quote: string;
    quoteUuid: string;
    status:
        | "incoming_payment_waiting"
        | "incoming_payment_initiated"
        | "processing"
        | "funds_converted"
        | "outgoing_payment_sent"
        | "cancelled"
        | "funds_refunded"
        | "bounced_back";
    reference?: string;
    rate: number;
    created: string;
    business?: number;
    transferRequest?: number;
    details: {
        reference?: string;
    };
    hasActiveIssues: boolean;
    sourceCurrency: string;
    sourceValue: number;
    targetCurrency: string;
    targetValue: number;
    customerTransactionId?: string;
}

export interface WiseTransferInput {
    targetAccount: number;
    quoteUuid: string;
    customerTransactionId?: string;
    details?: {
        reference?: string;
        transferPurpose?: string;
        sourceOfFunds?: string;
    };
}

// ============================================
// API Response Types
// ============================================

export interface WiseListResponse<T> {
    content: T[];
    size: number;
}
