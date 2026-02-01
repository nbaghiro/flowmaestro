/**
 * DocuSign Provider Test Fixtures
 *
 * Comprehensive fixtures for testing DocuSign e-signature operations including
 * envelopes, templates, recipients, and document management.
 */

import type { TestFixture } from "../../../sandbox";

export const docusignFixtures: TestFixture[] = [
    {
        operationId: "createEnvelope",
        provider: "docusign",
        validCases: [
            {
                name: "create_envelope_single_signer",
                description: "Create and send an envelope with a single signer",
                input: {
                    emailSubject: "Please sign: Employment Agreement - John Smith",
                    emailBlurb:
                        "Please review and sign the attached employment agreement at your earliest convenience.",
                    status: "sent",
                    documents: [
                        {
                            documentId: "1",
                            name: "Employment_Agreement_2024.pdf",
                            fileExtension: "pdf",
                            documentBase64: "JVBERi0xLjQKJeLjz9MKMSAwIG9..."
                        }
                    ],
                    signers: [
                        {
                            email: "john.smith@acmecorp.com",
                            name: "John Smith",
                            recipientId: "1",
                            routingOrder: "1"
                        }
                    ]
                },
                expectedOutput: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    status: "sent",
                    statusDateTime: "2024-03-15T14:30:00.000Z",
                    uri: "/envelopes/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                }
            }
        ],
        errorCases: [
            {
                name: "envelope_not_found",
                description: "Referenced envelope does not exist",
                input: {
                    emailSubject: "Test Document",
                    status: "sent",
                    documents: [
                        {
                            documentId: "1",
                            name: "test.pdf",
                            documentBase64: "invalid_base64"
                        }
                    ],
                    signers: [
                        {
                            email: "signer@example.com",
                            name: "Test Signer",
                            recipientId: "1"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    emailSubject: "Bulk Document",
                    status: "sent",
                    documents: [
                        {
                            documentId: "1",
                            name: "document.pdf",
                            documentBase64: "JVBERi0xLjQK..."
                        }
                    ],
                    signers: [
                        {
                            email: "signer@example.com",
                            name: "Test Signer",
                            recipientId: "1"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_recipient_email",
                description: "Invalid email format for recipient",
                input: {
                    emailSubject: "Test Document",
                    status: "sent",
                    documents: [
                        {
                            documentId: "1",
                            name: "document.pdf",
                            documentBase64: "JVBERi0xLjQK..."
                        }
                    ],
                    signers: [
                        {
                            email: "not-a-valid-email",
                            name: "Test Signer",
                            recipientId: "1"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createFromTemplate",
        provider: "docusign",
        validCases: [
            {
                name: "create_from_employment_template",
                description: "Create envelope from employment offer template",
                input: {
                    templateId: "tmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    emailSubject: "Your Employment Offer - Software Engineer Position",
                    emailBlurb:
                        "Congratulations! Please review and sign your employment offer letter.",
                    status: "sent",
                    templateRoles: [
                        {
                            roleName: "Employee",
                            email: "jane.doe@gmail.com",
                            name: "Jane Doe",
                            tabs: {
                                textTabs: [
                                    {
                                        tabLabel: "StartDate",
                                        value: "April 1, 2024"
                                    },
                                    {
                                        tabLabel: "Salary",
                                        value: "$125,000"
                                    }
                                ]
                            }
                        },
                        {
                            roleName: "HR Manager",
                            email: "hr.manager@company.com",
                            name: "David Wilson"
                        }
                    ]
                },
                expectedOutput: {
                    envelopeId: "f6a7b8c9-d0e1-2345-f012-456789012345",
                    status: "sent",
                    statusDateTime: "2024-03-15T10:00:00.000Z",
                    uri: "/envelopes/f6a7b8c9-d0e1-2345-f012-456789012345"
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template ID does not exist",
                input: {
                    templateId: "tmpl-nonexistent-template-id",
                    status: "sent",
                    templateRoles: [
                        {
                            roleName: "Signer",
                            email: "signer@example.com",
                            name: "Test Signer"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    templateId: "tmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    status: "sent",
                    templateRoles: [
                        {
                            roleName: "Signer",
                            email: "signer@example.com",
                            name: "Test Signer"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "missing_required_role",
                description: "Required template role not provided",
                input: {
                    templateId: "tmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    status: "sent",
                    templateRoles: []
                },
                expectedError: {
                    type: "validation",
                    message: "Missing required template roles",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "downloadDocuments",
        provider: "docusign",
        validCases: [
            {
                name: "download_combined_documents",
                description: "Download all documents combined into single PDF",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    documentId: "combined"
                },
                expectedOutput: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    documentId: "combined",
                    documentInfo: {
                        contentType: "application/pdf",
                        contentLength: 1048576,
                        fileName: "combined_documents.pdf"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "envelope_not_found",
                description: "Envelope ID does not exist",
                input: {
                    envelopeId: "nonexistent-envelope-id-12345",
                    documentId: "combined"
                },
                expectedError: {
                    type: "not_found",
                    message: "Envelope not found",
                    retryable: false
                }
            },
            {
                name: "document_not_found",
                description: "Document ID does not exist in envelope",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    documentId: "999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found in envelope",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    documentId: "combined"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEnvelope",
        provider: "docusign",
        validCases: [
            {
                name: "get_sent_envelope",
                description: "Get details of a sent envelope awaiting signatures",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    status: "sent",
                    emailSubject: "Please sign: Employment Agreement - John Smith",
                    emailBlurb:
                        "Please review and sign the attached employment agreement at your earliest convenience.",
                    createdDateTime: "2024-03-15T14:30:00.000Z",
                    sentDateTime: "2024-03-15T14:30:05.000Z",
                    completedDateTime: null,
                    voidedDateTime: null,
                    voidedReason: null,
                    documents: undefined,
                    recipients: undefined
                }
            }
        ],
        errorCases: [
            {
                name: "envelope_not_found",
                description: "Envelope ID does not exist",
                input: {
                    envelopeId: "nonexistent-envelope-id-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Envelope not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_access",
                description: "User does not have access to this envelope",
                input: {
                    envelopeId: "private-envelope-other-account"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this envelope",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getRecipients",
        provider: "docusign",
        validCases: [
            {
                name: "get_recipients_single_signer",
                description: "Get recipients for envelope with single signer",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    includeTabs: false
                },
                expectedOutput: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    recipientCount: "1",
                    signers: [
                        {
                            recipientId: "1",
                            email: "john.smith@acmecorp.com",
                            name: "John Smith",
                            status: "sent",
                            signedDateTime: null,
                            deliveredDateTime: null,
                            declinedDateTime: null,
                            declinedReason: null,
                            routingOrder: "1"
                        }
                    ],
                    carbonCopies: []
                }
            }
        ],
        errorCases: [
            {
                name: "envelope_not_found",
                description: "Envelope ID does not exist",
                input: {
                    envelopeId: "nonexistent-envelope-id",
                    includeTabs: false
                },
                expectedError: {
                    type: "not_found",
                    message: "Envelope not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    includeTabs: false
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listEnvelopes",
        provider: "docusign",
        validCases: [
            {
                name: "list_recent_envelopes",
                description: "List recent envelopes with default parameters",
                input: {
                    count: "25"
                },
                expectedOutput: {
                    envelopes: [
                        {
                            envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            status: "completed",
                            emailSubject: "Employment Agreement - John Smith",
                            createdDateTime: "2024-03-15T14:30:00.000Z",
                            sentDateTime: "2024-03-15T14:30:05.000Z",
                            completedDateTime: "2024-03-16T10:00:00.000Z"
                        },
                        {
                            envelopeId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                            status: "sent",
                            emailSubject: "Vendor Agreement - Q2 2024",
                            createdDateTime: "2024-03-15T12:00:00.000Z",
                            sentDateTime: "2024-03-15T12:00:10.000Z",
                            completedDateTime: null
                        },
                        {
                            envelopeId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                            status: "delivered",
                            emailSubject: "Consulting Services Agreement",
                            createdDateTime: "2024-03-15T10:00:00.000Z",
                            sentDateTime: "2024-03-15T10:00:15.000Z",
                            completedDateTime: null
                        }
                    ],
                    pagination: {
                        resultSetSize: 3,
                        totalSetSize: 150,
                        startPosition: 0,
                        endPosition: 2
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_format",
                description: "Invalid date format provided",
                input: {
                    fromDate: "invalid-date",
                    count: "25"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    count: "100"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listTemplates",
        provider: "docusign",
        validCases: [
            {
                name: "list_templates_default",
                description: "List templates with default parameters",
                input: {
                    count: "25"
                },
                expectedOutput: {
                    templates: [
                        {
                            templateId: "tmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            name: "Employment Offer Letter",
                            description:
                                "Standard employment offer letter with salary and start date fields",
                            shared: "true",
                            created: "2024-01-15T10:00:00.000Z",
                            lastModified: "2024-03-01T14:30:00.000Z",
                            folderName: "HR Templates",
                            owner: {
                                userName: "HR Admin",
                                email: "hr.admin@company.com",
                                userId: "user-12345"
                            },
                            recipients: {
                                signers: [
                                    {
                                        roleName: "Employee",
                                        recipientId: "1",
                                        routingOrder: "1"
                                    },
                                    {
                                        roleName: "HR Manager",
                                        recipientId: "2",
                                        routingOrder: "2"
                                    }
                                ],
                                carbonCopies: [
                                    {
                                        roleName: "HR Records",
                                        recipientId: "3",
                                        routingOrder: "3"
                                    }
                                ]
                            }
                        },
                        {
                            templateId: "tmpl-b2c3d4e5-f6a7-8901-bcde-f12345678901",
                            name: "Standard NDA",
                            description:
                                "Mutual non-disclosure agreement for business partnerships",
                            shared: "true",
                            created: "2024-02-01T09:00:00.000Z",
                            lastModified: "2024-02-15T11:00:00.000Z",
                            folderName: "Legal Templates",
                            owner: {
                                userName: "Legal Team",
                                email: "legal@company.com",
                                userId: "user-67890"
                            },
                            recipients: {
                                signers: [
                                    {
                                        roleName: "Disclosing Party",
                                        recipientId: "1",
                                        routingOrder: "1"
                                    },
                                    {
                                        roleName: "Receiving Party",
                                        recipientId: "2",
                                        routingOrder: "1"
                                    }
                                ],
                                carbonCopies: []
                            }
                        },
                        {
                            templateId: "tmpl-c3d4e5f6-a7b8-9012-cdef-123456789012",
                            name: "Sales Contract",
                            description: "Standard B2B sales contract with payment terms",
                            shared: "true",
                            created: "2024-01-20T14:00:00.000Z",
                            lastModified: "2024-03-10T16:00:00.000Z",
                            folderName: "Sales Templates",
                            owner: {
                                userName: "Sales Ops",
                                email: "sales.ops@company.com",
                                userId: "user-11111"
                            },
                            recipients: {
                                signers: [
                                    {
                                        roleName: "Buyer",
                                        recipientId: "1",
                                        routingOrder: "1"
                                    },
                                    {
                                        roleName: "Seller",
                                        recipientId: "2",
                                        routingOrder: "2"
                                    }
                                ],
                                carbonCopies: [
                                    {
                                        roleName: "Finance",
                                        recipientId: "3",
                                        routingOrder: "3"
                                    }
                                ]
                            }
                        }
                    ],
                    pagination: {
                        resultSetSize: 3,
                        totalSetSize: 25,
                        startPosition: 0
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Specified folder does not exist",
                input: {
                    folder: "nonexistent-folder-id",
                    count: "25"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    count: "100"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "voidEnvelope",
        provider: "docusign",
        validCases: [
            {
                name: "void_sent_envelope",
                description: "Void an envelope that was sent but not yet signed",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    voidedReason: "Contract terms have changed. A new envelope will be sent."
                },
                expectedOutput: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    voided: true,
                    voidedReason: "Contract terms have changed. A new envelope will be sent.",
                    message: "Envelope has been voided"
                }
            }
        ],
        errorCases: [
            {
                name: "envelope_not_found",
                description: "Envelope ID does not exist",
                input: {
                    envelopeId: "nonexistent-envelope-id",
                    voidedReason: "Test reason"
                },
                expectedError: {
                    type: "not_found",
                    message: "Envelope not found",
                    retryable: false
                }
            },
            {
                name: "envelope_already_completed",
                description: "Cannot void an envelope that has already been completed",
                input: {
                    envelopeId: "completed-envelope-id",
                    voidedReason: "Attempting to void completed envelope"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot void a completed envelope",
                    retryable: false
                }
            },
            {
                name: "envelope_already_voided",
                description: "Envelope has already been voided",
                input: {
                    envelopeId: "already-voided-envelope",
                    voidedReason: "Second void attempt"
                },
                expectedError: {
                    type: "validation",
                    message: "Envelope is already voided",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    voidedReason: "Rate limit test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "missing_void_reason",
                description: "Void reason is required but not provided",
                input: {
                    envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    voidedReason: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Void reason is required",
                    retryable: false
                }
            }
        ]
    }
];
