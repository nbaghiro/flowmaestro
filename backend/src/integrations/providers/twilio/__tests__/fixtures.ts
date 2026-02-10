/**
 * Twilio Provider Test Fixtures
 *
 * Based on Twilio API documentation for SMS and phone number operations
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample messages for filterableData
 */
const sampleMessages = [
    {
        sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        from: "+15551234567",
        to: "+15559876543",
        body: "Hello! This is a test message.",
        status: "delivered",
        direction: "outbound-api",
        numSegments: 1,
        price: "-0.00750",
        priceUnit: "USD",
        errorCode: null,
        errorMessage: null,
        dateCreated: "2024-01-15T10:30:00Z",
        dateSent: "2024-01-15T10:30:01Z"
    },
    {
        sid: "SM3cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        from: "+15559876543",
        to: "+15551234567",
        body: "Thanks for reaching out!",
        status: "received",
        direction: "inbound",
        numSegments: 1,
        price: "-0.00750",
        priceUnit: "USD",
        errorCode: null,
        errorMessage: null,
        dateCreated: "2024-01-15T11:00:00Z",
        dateSent: null
    },
    {
        sid: "SM4cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        from: "+15551234567",
        to: "+15555555555",
        body: "Your verification code is 123456",
        status: "failed",
        direction: "outbound-api",
        numSegments: 1,
        price: null,
        priceUnit: "USD",
        errorCode: "30003",
        errorMessage: "Unreachable destination handset",
        dateCreated: "2024-01-15T12:00:00Z",
        dateSent: null
    }
];

/**
 * Sample phone numbers for filterableData
 */
const samplePhoneNumbers = [
    {
        sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        friendlyName: "Main Business Line",
        phoneNumber: "+15551234567",
        capabilities: {
            voice: true,
            sms: true,
            mms: true,
            fax: false
        },
        status: "in-use",
        voiceUrl: "https://example.com/voice",
        smsUrl: "https://example.com/sms",
        addressRequirements: "none",
        beta: false,
        dateCreated: "2023-06-15T08:00:00Z"
    },
    {
        sid: "PN2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        friendlyName: "Support Line",
        phoneNumber: "+15559876543",
        capabilities: {
            voice: true,
            sms: true,
            mms: false,
            fax: false
        },
        status: "in-use",
        voiceUrl: "https://example.com/support-voice",
        smsUrl: "https://example.com/support-sms",
        addressRequirements: "none",
        beta: false,
        dateCreated: "2023-08-20T10:00:00Z"
    }
];

export const twilioFixtures: TestFixture[] = [
    {
        operationId: "sendSms",
        provider: "twilio",
        validCases: [
            {
                name: "send_simple_sms",
                description: "Send a simple SMS message",
                input: {
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Hello! This is a test message."
                },
                expectedOutput: {
                    sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15551234567",
                    to: "+15559876543",
                    body: "Hello! This is a test message.",
                    status: "queued",
                    direction: "outbound-api",
                    numSegments: 1,
                    price: null,
                    priceUnit: "USD",
                    errorCode: null,
                    errorMessage: null,
                    dateCreated: "2024-01-15T10:30:00Z",
                    dateSent: null
                }
            },
            {
                name: "send_sms_with_callback",
                description: "Send SMS with status callback URL",
                input: {
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Your order has been shipped!",
                    statusCallback: "https://example.com/status-callback"
                },
                expectedOutput: {
                    sid: "SM3cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15551234567",
                    to: "+15559876543",
                    body: "Your order has been shipped!",
                    status: "queued",
                    direction: "outbound-api",
                    numSegments: 1,
                    price: null,
                    priceUnit: "USD",
                    errorCode: null,
                    errorMessage: null,
                    dateCreated: "2024-01-15T10:30:00Z",
                    dateSent: null
                }
            },
            {
                name: "send_long_sms",
                description: "Send a long SMS that spans multiple segments",
                input: {
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "This is a longer message that will be split into multiple segments. The SMS standard allows for 160 characters per segment using GSM-7 encoding. If we exceed this limit, the message will be concatenated."
                },
                expectedOutput: {
                    sid: "SM4cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15551234567",
                    to: "+15559876543",
                    body: "This is a longer message that will be split into multiple segments. The SMS standard allows for 160 characters per segment using GSM-7 encoding. If we exceed this limit, the message will be concatenated.",
                    status: "queued",
                    direction: "outbound-api",
                    numSegments: 2,
                    price: null,
                    priceUnit: "USD",
                    errorCode: null,
                    errorMessage: null,
                    dateCreated: "2024-01-15T10:30:00Z",
                    dateSent: null
                }
            },
            {
                name: "send_sms_with_messaging_service",
                description: "Send SMS using a Messaging Service SID",
                input: {
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Message sent via Messaging Service",
                    messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "SM5cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15551234567",
                    to: "+15559876543",
                    body: "Message sent via Messaging Service",
                    status: "queued",
                    direction: "outbound-api",
                    numSegments: 1,
                    price: null,
                    priceUnit: "USD",
                    errorCode: null,
                    errorMessage: null,
                    dateCreated: "2024-01-15T10:30:00Z",
                    dateSent: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_to_number",
                description: "Invalid destination phone number",
                input: {
                    to: "not-a-phone-number",
                    from: "+15551234567",
                    body: "Test message"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid 'To' phone number",
                    retryable: false
                }
            },
            {
                name: "invalid_from_number",
                description: "From number not owned by account",
                input: {
                    to: "+15559876543",
                    from: "+15550000000",
                    body: "Test message"
                },
                expectedError: {
                    type: "validation",
                    message: "The 'From' number is not a valid phone number owned by your account",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Test message"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "authentication_failed",
                description: "Invalid Account SID or Auth Token",
                input: {
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Test message"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "Twilio authentication failed. Please check your Account SID and Auth Token.",
                    retryable: false
                }
            },
            {
                name: "unverified_recipient",
                description: "Recipient not verified in trial account",
                input: {
                    to: "+15550001111",
                    from: "+15551234567",
                    body: "Test message"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "The number is unverified. Trial accounts cannot send messages to unverified numbers.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getMessage",
        provider: "twilio",
        validCases: [
            {
                name: "get_delivered_message",
                description: "Get a delivered message",
                input: {
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15551234567",
                    to: "+15559876543",
                    body: "Hello! This is a test message.",
                    status: "delivered",
                    direction: "outbound-api",
                    numSegments: 1,
                    price: "-0.00750",
                    priceUnit: "USD",
                    errorCode: null,
                    errorMessage: null,
                    dateCreated: "2024-01-15T10:30:00Z",
                    dateSent: "2024-01-15T10:30:01Z"
                }
            },
            {
                name: "get_failed_message",
                description: "Get a failed message with error details",
                input: {
                    messageSid: "SM4cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "SM4cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15551234567",
                    to: "+15555555555",
                    body: "Your verification code is 123456",
                    status: "failed",
                    direction: "outbound-api",
                    numSegments: 1,
                    price: null,
                    priceUnit: "USD",
                    errorCode: "30003",
                    errorMessage: "Unreachable destination handset",
                    dateCreated: "2024-01-15T12:00:00Z",
                    dateSent: null
                }
            },
            {
                name: "get_inbound_message",
                description: "Get an inbound (received) message",
                input: {
                    messageSid: "SM3cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "SM3cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    from: "+15559876543",
                    to: "+15551234567",
                    body: "Thanks for reaching out!",
                    status: "received",
                    direction: "inbound",
                    numSegments: 1,
                    price: "-0.00750",
                    priceUnit: "USD",
                    errorCode: null,
                    errorMessage: null,
                    dateCreated: "2024-01-15T11:00:00Z",
                    dateSent: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Message does not exist",
                input: {
                    messageSid: "SM_nonexistent_xxxxxxxxxxxxxxxxxxxxx"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listMessages",
        provider: "twilio",
        filterableData: {
            records: sampleMessages,
            recordsField: "messages",
            offsetField: "nextPageToken",
            defaultPageSize: 50,
            maxPageSize: 1000,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["from", "to", "status", "direction"]
            }
        },
        validCases: [
            {
                name: "list_all_messages",
                description: "List all messages",
                input: {}
            },
            {
                name: "list_messages_paginated",
                description: "List messages with pagination",
                input: {
                    pageSize: 2
                }
            },
            {
                name: "list_messages_by_from",
                description: "Filter messages by sender",
                input: {
                    from: "+15551234567"
                }
            },
            {
                name: "list_messages_by_to",
                description: "Filter messages by recipient",
                input: {
                    to: "+15559876543"
                }
            },
            {
                name: "list_messages_by_date",
                description: "Filter messages by date range",
                input: {
                    dateSentAfter: "2024-01-15",
                    dateSentBefore: "2024-01-16"
                }
            },
            {
                name: "list_messages_combined_filters",
                description: "Filter messages with multiple criteria",
                input: {
                    from: "+15551234567",
                    dateSentAfter: "2024-01-01",
                    pageSize: 10
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum",
                input: {
                    pageSize: 2000
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 1000",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteMessage",
        provider: "twilio",
        validCases: [
            {
                name: "delete_message",
                description: "Delete a message",
                input: {
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    deleted: true,
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Message does not exist",
                input: {
                    messageSid: "SM_nonexistent_xxxxxxxxxxxxxxxxxxxxx"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "lookupPhoneNumber",
        provider: "twilio",
        validCases: [
            {
                name: "lookup_valid_number",
                description: "Look up a valid phone number",
                input: {
                    phoneNumber: "+15551234567"
                },
                expectedOutput: {
                    phoneNumber: "+15551234567",
                    nationalFormat: "(555) 123-4567",
                    countryCode: "US",
                    callingCountryCode: "1",
                    valid: true,
                    validationErrors: null,
                    carrier: null,
                    callerName: null,
                    lineType: null
                }
            },
            {
                name: "lookup_with_carrier",
                description: "Look up with carrier information",
                input: {
                    phoneNumber: "+15551234567",
                    fields: ["carrier"]
                },
                expectedOutput: {
                    phoneNumber: "+15551234567",
                    nationalFormat: "(555) 123-4567",
                    countryCode: "US",
                    callingCountryCode: "1",
                    valid: true,
                    validationErrors: null,
                    carrier: {
                        name: "Verizon Wireless",
                        type: "mobile",
                        mobileCountryCode: "311",
                        mobileNetworkCode: "480"
                    },
                    callerName: null,
                    lineType: null
                }
            },
            {
                name: "lookup_with_caller_name",
                description: "Look up with caller name (CNAM)",
                input: {
                    phoneNumber: "+15551234567",
                    fields: ["caller_name"]
                },
                expectedOutput: {
                    phoneNumber: "+15551234567",
                    nationalFormat: "(555) 123-4567",
                    countryCode: "US",
                    callingCountryCode: "1",
                    valid: true,
                    validationErrors: null,
                    carrier: null,
                    callerName: {
                        name: "ACME CORP",
                        type: "BUSINESS"
                    },
                    lineType: null
                }
            },
            {
                name: "lookup_with_all_fields",
                description: "Look up with all available fields",
                input: {
                    phoneNumber: "+15551234567",
                    fields: ["carrier", "caller_name", "line_type_intelligence"]
                },
                expectedOutput: {
                    phoneNumber: "+15551234567",
                    nationalFormat: "(555) 123-4567",
                    countryCode: "US",
                    callingCountryCode: "1",
                    valid: true,
                    validationErrors: null,
                    carrier: {
                        name: "Verizon Wireless",
                        type: "mobile",
                        mobileCountryCode: "311",
                        mobileNetworkCode: "480"
                    },
                    callerName: {
                        name: "ACME CORP",
                        type: "BUSINESS"
                    },
                    lineType: {
                        carrierName: "Verizon Wireless",
                        type: "mobile"
                    }
                }
            },
            {
                name: "lookup_landline_number",
                description: "Look up a landline phone number",
                input: {
                    phoneNumber: "+12125551234",
                    fields: ["carrier", "line_type_intelligence"]
                },
                expectedOutput: {
                    phoneNumber: "+12125551234",
                    nationalFormat: "(212) 555-1234",
                    countryCode: "US",
                    callingCountryCode: "1",
                    valid: true,
                    validationErrors: null,
                    carrier: {
                        name: "AT&T",
                        type: "landline",
                        mobileCountryCode: null,
                        mobileNetworkCode: null
                    },
                    callerName: null,
                    lineType: {
                        carrierName: "AT&T",
                        type: "landline"
                    }
                }
            },
            {
                name: "lookup_international_number",
                description: "Look up an international phone number",
                input: {
                    phoneNumber: "+447911123456",
                    fields: ["carrier"]
                },
                expectedOutput: {
                    phoneNumber: "+447911123456",
                    nationalFormat: "07911 123456",
                    countryCode: "GB",
                    callingCountryCode: "44",
                    valid: true,
                    validationErrors: null,
                    carrier: {
                        name: "Vodafone UK",
                        type: "mobile",
                        mobileCountryCode: "234",
                        mobileNetworkCode: "15"
                    },
                    callerName: null,
                    lineType: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_phone_number",
                description: "Invalid phone number format",
                input: {
                    phoneNumber: "not-a-phone-number"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid phone number format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    phoneNumber: "+15551234567"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listPhoneNumbers",
        provider: "twilio",
        filterableData: {
            records: samplePhoneNumbers,
            recordsField: "phoneNumbers",
            offsetField: "nextPageToken",
            defaultPageSize: 50,
            maxPageSize: 1000,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["friendlyName", "phoneNumber"]
            }
        },
        validCases: [
            {
                name: "list_all_phone_numbers",
                description: "List all phone numbers in account",
                input: {}
            },
            {
                name: "list_phone_numbers_paginated",
                description: "List phone numbers with pagination",
                input: {
                    pageSize: 1
                }
            },
            {
                name: "list_by_friendly_name",
                description: "Filter by friendly name",
                input: {
                    friendlyName: "Main Business Line"
                }
            },
            {
                name: "list_by_phone_number",
                description: "Filter by phone number",
                input: {
                    phoneNumber: "+15551234567"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum",
                input: {
                    pageSize: 2000
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 1000",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "authentication_failed",
                description: "Invalid Account SID or Auth Token",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "Twilio authentication failed. Please check your Account SID and Auth Token.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPhoneNumber",
        provider: "twilio",
        validCases: [
            {
                name: "get_phone_number",
                description: "Get phone number details",
                input: {
                    phoneNumberSid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    friendlyName: "Main Business Line",
                    phoneNumber: "+15551234567",
                    capabilities: {
                        voice: true,
                        sms: true,
                        mms: true,
                        fax: false
                    },
                    status: "in-use",
                    voiceUrl: "https://example.com/voice",
                    smsUrl: "https://example.com/sms",
                    addressRequirements: "none",
                    beta: false,
                    dateCreated: "2023-06-15T08:00:00Z"
                }
            },
            {
                name: "get_toll_free_number",
                description: "Get toll-free phone number details",
                input: {
                    phoneNumberSid: "PN3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "PN3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    friendlyName: "Customer Support Toll-Free",
                    phoneNumber: "+18005551234",
                    capabilities: {
                        voice: true,
                        sms: true,
                        mms: false,
                        fax: false
                    },
                    status: "in-use",
                    voiceUrl: "https://example.com/toll-free-voice",
                    smsUrl: "https://example.com/toll-free-sms",
                    addressRequirements: "none",
                    beta: false,
                    dateCreated: "2023-09-01T12:00:00Z"
                }
            },
            {
                name: "get_sms_only_number",
                description: "Get SMS-only phone number (no voice)",
                input: {
                    phoneNumberSid: "PN4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedOutput: {
                    sid: "PN4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    friendlyName: "SMS Notifications",
                    phoneNumber: "+15557778888",
                    capabilities: {
                        voice: false,
                        sms: true,
                        mms: true,
                        fax: false
                    },
                    status: "in-use",
                    voiceUrl: null,
                    smsUrl: "https://example.com/notifications-sms",
                    addressRequirements: "none",
                    beta: false,
                    dateCreated: "2024-01-10T09:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Phone number does not exist",
                input: {
                    phoneNumberSid: "PN_nonexistent_xxxxxxxxxxxxxxxxxxxxx"
                },
                expectedError: {
                    type: "not_found",
                    message: "Phone number not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    phoneNumberSid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Twilio rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
