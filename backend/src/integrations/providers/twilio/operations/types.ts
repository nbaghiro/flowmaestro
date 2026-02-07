/**
 * Twilio Operation Types
 *
 * Shared types for Twilio operations
 */

// ============================================
// Message Types
// ============================================

export interface TwilioMessageOutput {
    sid: string;
    accountSid: string;
    from: string;
    to: string;
    body: string;
    status: string;
    direction: string;
    numSegments: number;
    price: string | null;
    priceUnit: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    dateCreated: string;
    dateSent: string | null;
}

export interface TwilioMessageListOutput {
    messages: TwilioMessageOutput[];
    hasMore: boolean;
    nextPageToken: string | null;
    page: number;
    pageSize: number;
}

// ============================================
// Phone Number Types
// ============================================

export interface TwilioPhoneNumberOutput {
    sid: string;
    accountSid: string;
    friendlyName: string;
    phoneNumber: string;
    capabilities: {
        voice: boolean;
        sms: boolean;
        mms: boolean;
        fax: boolean;
    };
    status: string;
    voiceUrl: string | null;
    smsUrl: string | null;
    addressRequirements: string;
    beta: boolean;
    dateCreated: string;
}

export interface TwilioPhoneNumberListOutput {
    phoneNumbers: TwilioPhoneNumberOutput[];
    hasMore: boolean;
    nextPageToken: string | null;
    page: number;
    pageSize: number;
}

// ============================================
// Lookup Types
// ============================================

export interface TwilioLookupOutput {
    phoneNumber: string;
    nationalFormat: string;
    countryCode: string;
    callingCountryCode: string;
    valid: boolean;
    validationErrors: string[] | null;
    carrier: {
        name: string | null;
        type: string | null;
        mobileCountryCode: string | null;
        mobileNetworkCode: string | null;
    } | null;
    callerName: {
        name: string | null;
        type: string | null;
    } | null;
    lineType: {
        carrierName: string | null;
        type: string | null;
    } | null;
}
