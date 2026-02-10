/**
 * PandaDoc Provider Test Fixtures
 *
 * Comprehensive fixtures for testing PandaDoc document workflow operations
 * including documents, templates, and document management.
 */

import type { TestFixture } from "../../../sandbox";

export const pandadocFixtures: TestFixture[] = [
    {
        operationId: "createDocument",
        provider: "pandadoc",
        validCases: [
            {
                name: "create_from_nda_template",
                description: "Create a document from an NDA template",
                input: {
                    name: "Mutual NDA - Acme Corp",
                    templateUuid: "ustHNnVaPCD6MzuoNBbZ8L",
                    recipients: [
                        {
                            email: "john.doe@acmecorp.com",
                            firstName: "John",
                            lastName: "Doe",
                            role: "Client"
                        }
                    ],
                    fields: {
                        name: { value: "John Doe" },
                        company: { value: "Acme Corp" }
                    },
                    metadata: {
                        deal_id: "deal-12345",
                        source: "flowmaestro"
                    }
                },
                expectedOutput: {
                    id: "D3okRfgHRX7NEhavcACReB",
                    name: "Mutual NDA - Acme Corp",
                    status: "document.uploaded",
                    dateCreated: "2024-07-04T19:27:14.927317Z",
                    uuid: "D3okRfgHRX7NEhavcACReB"
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template UUID does not exist",
                input: {
                    name: "Test Document",
                    templateUuid: "nonexistent-template-uuid",
                    recipients: [
                        {
                            email: "test@example.com",
                            firstName: "Test",
                            lastName: "User",
                            role: "Signer"
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
                description: "API rate limit exceeded",
                input: {
                    name: "Bulk Document",
                    templateUuid: "ustHNnVaPCD6MzuoNBbZ8L",
                    recipients: [
                        {
                            email: "signer@example.com",
                            firstName: "Test",
                            lastName: "Signer",
                            role: "Signer"
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
                    name: "Test Document",
                    templateUuid: "ustHNnVaPCD6MzuoNBbZ8L",
                    recipients: [
                        {
                            email: "not-a-valid-email",
                            firstName: "Test",
                            lastName: "User",
                            role: "Signer"
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
        operationId: "getDocument",
        provider: "pandadoc",
        validCases: [
            {
                name: "get_sent_document",
                description: "Get details of a sent document",
                input: {
                    documentId: "D3okRfgHRX7NEhavcACReB"
                },
                expectedOutput: {
                    id: "D3okRfgHRX7NEhavcACReB",
                    name: "Mutual NDA - Acme Corp",
                    status: "document.sent",
                    dateCreated: "2024-07-04T19:27:14.927317Z",
                    dateModified: "2024-07-04T19:30:00.000000Z",
                    expirationDate: null,
                    recipients: [
                        {
                            id: "rec-a1b2c3",
                            email: "john.doe@acmecorp.com",
                            first_name: "John",
                            last_name: "Doe",
                            role: "Client",
                            recipient_type: "signer",
                            has_completed: false
                        }
                    ],
                    fields: [
                        {
                            uuid: "field-uuid-1",
                            name: "name",
                            value: "John Doe"
                        }
                    ],
                    tokens: [],
                    metadata: {
                        deal_id: "deal-12345",
                        source: "flowmaestro"
                    },
                    tags: [],
                    createdBy: {
                        id: "user-12345",
                        email: "admin@company.com",
                        first_name: "Admin",
                        last_name: "User"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document ID does not exist",
                input: {
                    documentId: "nonexistent-document-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: "D3okRfgHRX7NEhavcACReB"
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
        operationId: "getDocumentStatus",
        provider: "pandadoc",
        validCases: [
            {
                name: "get_completed_document_status",
                description: "Get status of a completed document",
                input: {
                    documentId: "eHCjisfzWydzJnbqnBbvAj"
                },
                expectedOutput: {
                    id: "eHCjisfzWydzJnbqnBbvAj",
                    name: "Sales Contract - Q2 2024",
                    status: "document.completed",
                    dateCreated: "2024-03-18T15:55:03.090372Z",
                    dateModified: "2024-03-18T16:26:46.286951Z"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document ID does not exist",
                input: {
                    documentId: "nonexistent-id-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: "eHCjisfzWydzJnbqnBbvAj"
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
        operationId: "sendDocument",
        provider: "pandadoc",
        validCases: [
            {
                name: "send_document_with_message",
                description: "Send a document with a custom message",
                input: {
                    documentId: "D3okRfgHRX7NEhavcACReB",
                    message: "Please review and sign this document at your earliest convenience.",
                    subject: "Document for your review"
                },
                expectedOutput: {
                    id: "D3okRfgHRX7NEhavcACReB",
                    status: "document.sent",
                    uuid: "D3okRfgHRX7NEhavcACReB"
                }
            },
            {
                name: "send_document_silently",
                description: "Send a document without email notification",
                input: {
                    documentId: "D3okRfgHRX7NEhavcACReB",
                    silent: true
                },
                expectedOutput: {
                    id: "D3okRfgHRX7NEhavcACReB",
                    status: "document.sent",
                    uuid: "D3okRfgHRX7NEhavcACReB"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document ID does not exist",
                input: {
                    documentId: "nonexistent-document-id",
                    message: "Please sign"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            },
            {
                name: "document_not_ready",
                description: "Document is still being processed and not ready to send",
                input: {
                    documentId: "processing-document-id",
                    message: "Please sign"
                },
                expectedError: {
                    type: "validation",
                    message: "Document is not ready to send",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: "D3okRfgHRX7NEhavcACReB"
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
        operationId: "downloadDocument",
        provider: "pandadoc",
        validCases: [
            {
                name: "download_completed_document",
                description: "Download a completed document as PDF",
                input: {
                    documentId: "eHCjisfzWydzJnbqnBbvAj"
                },
                expectedOutput: {
                    documentId: "eHCjisfzWydzJnbqnBbvAj",
                    download: {
                        contentType: "application/pdf",
                        fileName: "Sales_Contract_Q2_2024.pdf"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document ID does not exist",
                input: {
                    documentId: "nonexistent-document-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: "eHCjisfzWydzJnbqnBbvAj"
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
        operationId: "listDocuments",
        provider: "pandadoc",
        validCases: [
            {
                name: "list_recent_documents",
                description: "List recent documents with default parameters",
                input: {
                    count: 50
                },
                expectedOutput: {
                    documents: [
                        {
                            id: "D3okRfgHRX7NEhavcACReB",
                            name: "Mutual NDA - Acme Corp",
                            status: "document.completed",
                            dateCreated: "2024-07-04T19:27:14.927317Z",
                            dateModified: "2024-07-05T10:00:00.000000Z",
                            expirationDate: null
                        },
                        {
                            id: "eHCjisfzWydzJnbqnBbvAj",
                            name: "Sales Contract - Q2 2024",
                            status: "document.sent",
                            dateCreated: "2024-03-18T15:55:03.090372Z",
                            dateModified: "2024-03-18T16:26:46.286951Z",
                            expirationDate: "2024-05-17T16:26:45.583270Z"
                        },
                        {
                            id: "kRt5pQmNvXwY3jL8bC2dFg",
                            name: "Employment Agreement - Jane Smith",
                            status: "document.draft",
                            dateCreated: "2024-06-15T09:00:00.000000Z",
                            dateModified: "2024-06-15T09:00:00.000000Z",
                            expirationDate: null
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    count: 100
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
        provider: "pandadoc",
        validCases: [
            {
                name: "list_templates_default",
                description: "List templates with default parameters",
                input: {},
                expectedOutput: {
                    templates: [
                        {
                            id: "ustHNnVaPCD6MzuoNBbZ8L",
                            name: "Mutual NDA",
                            dateCreated: "2024-01-15T10:00:00.000000Z",
                            dateModified: "2024-03-01T14:30:00.000000Z"
                        },
                        {
                            id: "tpl-b2c3d4e5f6a78901bcde",
                            name: "Sales Contract",
                            dateCreated: "2024-02-01T09:00:00.000000Z",
                            dateModified: "2024-02-15T11:00:00.000000Z"
                        },
                        {
                            id: "tpl-c3d4e5f6a7b89012cdef",
                            name: "Employment Offer Letter",
                            dateCreated: "2024-01-20T14:00:00.000000Z",
                            dateModified: "2024-03-10T16:00:00.000000Z"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    count: 100
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
        operationId: "deleteDocument",
        provider: "pandadoc",
        validCases: [
            {
                name: "delete_draft_document",
                description: "Delete a draft document",
                input: {
                    documentId: "kRt5pQmNvXwY3jL8bC2dFg"
                },
                expectedOutput: {
                    documentId: "kRt5pQmNvXwY3jL8bC2dFg",
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document ID does not exist",
                input: {
                    documentId: "nonexistent-document-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: "kRt5pQmNvXwY3jL8bC2dFg"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
