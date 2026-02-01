/**
 * HelloSign Provider Test Fixtures
 *
 * Comprehensive test fixtures for HelloSign e-signature operations including
 * signature requests, templates, and document downloads.
 */

import type { TestFixture } from "../../../sandbox";

export const hellosignFixtures: TestFixture[] = [
    {
        operationId: "cancelSignatureRequest",
        provider: "hellosign",
        validCases: [
            {
                name: "cancel_pending_signature_request",
                description: "Cancel a pending signature request before any signers have signed",
                input: {
                    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967"
                },
                expectedOutput: {
                    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967",
                    cancelled: true,
                    message: "Signature request has been cancelled"
                }
            }
        ],
        errorCases: [
            {
                name: "cancel_nonexistent_request",
                description: "Attempt to cancel a signature request that does not exist",
                input: {
                    signature_request_id: "nonexistent_request_id_12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Signature request not found",
                    retryable: false
                }
            },
            {
                name: "cancel_already_completed",
                description:
                    "Attempt to cancel a signature request that has already been completed",
                input: {
                    signature_request_id: "completed_request_abc123def456"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot cancel a completed signature request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when cancelling signature request",
                input: {
                    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967"
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
        operationId: "createFromTemplate",
        provider: "hellosign",
        validCases: [
            {
                name: "create_nda_from_template",
                description: "Create a signature request for an NDA using a pre-defined template",
                input: {
                    template_ids: ["c26b8a16784a872da37ea946b9ddec7c1e11dff6"],
                    title: "Non-Disclosure Agreement - Acme Corp Project",
                    subject: "Please sign this NDA for the Acme Corp project",
                    message:
                        "Hi there, please review and sign this Non-Disclosure Agreement at your earliest convenience. This NDA is required before we can proceed with the project discussion.",
                    signers: [
                        {
                            email_address: "john.smith@acmecorp.com",
                            name: "John Smith",
                            role: "Client"
                        },
                        {
                            email_address: "sarah.johnson@techpartners.io",
                            name: "Sarah Johnson",
                            role: "Vendor"
                        }
                    ],
                    test_mode: false
                },
                expectedOutput: {
                    signature_request_id: "f57db65d3f933b57e8a631c2b6e8c5e2fe1d4ec0",
                    title: "Non-Disclosure Agreement - Acme Corp Project",
                    is_complete: false,
                    is_declined: false,
                    created_at: 1706745600,
                    signing_url:
                        "https://app.hellosign.com/sign/f57db65d3f933b57e8a631c2b6e8c5e2fe1d4ec0",
                    details_url:
                        "https://app.hellosign.com/details/f57db65d3f933b57e8a631c2b6e8c5e2fe1d4ec0",
                    signatures: [
                        {
                            signer_email_address: "john.smith@acmecorp.com",
                            signer_name: "John Smith",
                            signer_role: "Client",
                            status_code: "awaiting_signature",
                            order: 0
                        },
                        {
                            signer_email_address: "sarah.johnson@techpartners.io",
                            signer_name: "Sarah Johnson",
                            signer_role: "Vendor",
                            status_code: "awaiting_signature",
                            order: 1
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Attempt to create from a template that does not exist",
                input: {
                    template_ids: ["nonexistent_template_id_12345"],
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer",
                            role: "Signer"
                        }
                    ],
                    test_mode: false
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            },
            {
                name: "missing_required_role",
                description: "Signer roles do not match template requirements",
                input: {
                    template_ids: ["c26b8a16784a872da37ea946b9ddec7c1e11dff6"],
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer",
                            role: "NonexistentRole"
                        }
                    ],
                    test_mode: false
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Signer role 'NonexistentRole' does not match any role defined in the template",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating from template",
                input: {
                    template_ids: ["c26b8a16784a872da37ea946b9ddec7c1e11dff6"],
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer",
                            role: "Signer"
                        }
                    ],
                    test_mode: false
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_email_format",
                description: "Signer email address has invalid format",
                input: {
                    template_ids: ["c26b8a16784a872da37ea946b9ddec7c1e11dff6"],
                    signers: [
                        {
                            email_address: "not-a-valid-email",
                            name: "Test Signer",
                            role: "Signer"
                        }
                    ],
                    test_mode: false
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
        operationId: "createSignatureRequest",
        provider: "hellosign",
        validCases: [
            {
                name: "create_simple_signature_request",
                description: "Create a basic signature request with one document and one signer",
                input: {
                    title: "Service Agreement",
                    subject: "Please sign the service agreement",
                    message:
                        "Hi, please review and sign the attached service agreement for our upcoming engagement.",
                    signers: [
                        {
                            email_address: "client@businesscorp.com",
                            name: "Robert Martinez"
                        }
                    ],
                    file_urls: ["https://storage.example.com/documents/service-agreement-2024.pdf"],
                    test_mode: false
                },
                expectedOutput: {
                    signature_request_id: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
                    title: "Service Agreement",
                    is_complete: false,
                    is_declined: false,
                    created_at: 1706659200,
                    signing_url:
                        "https://app.hellosign.com/sign/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
                    details_url:
                        "https://app.hellosign.com/details/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
                    signatures: [
                        {
                            signer_email_address: "client@businesscorp.com",
                            signer_name: "Robert Martinez",
                            status_code: "awaiting_signature"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Attempt to create a request without a title",
                input: {
                    title: "",
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer"
                        }
                    ],
                    file_urls: ["https://storage.example.com/documents/test.pdf"],
                    test_mode: false
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            },
            {
                name: "invalid_file_url",
                description: "File URL is not accessible or invalid",
                input: {
                    title: "Test Document",
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer"
                        }
                    ],
                    file_urls: ["https://invalid-url.example.com/nonexistent.pdf"],
                    test_mode: false
                },
                expectedError: {
                    type: "validation",
                    message: "Could not retrieve file from URL",
                    retryable: false
                }
            },
            {
                name: "no_signers_provided",
                description: "Attempt to create a request without any signers",
                input: {
                    title: "Test Document",
                    signers: [],
                    file_urls: ["https://storage.example.com/documents/test.pdf"],
                    test_mode: false
                },
                expectedError: {
                    type: "validation",
                    message: "At least one signer is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating signature request",
                input: {
                    title: "Test Document",
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer"
                        }
                    ],
                    file_urls: ["https://storage.example.com/documents/test.pdf"],
                    test_mode: false
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "rate_limit",
                description: "Account signature request quota has been exceeded",
                input: {
                    title: "Test Document",
                    signers: [
                        {
                            email_address: "signer@example.com",
                            name: "Test Signer"
                        }
                    ],
                    file_urls: ["https://storage.example.com/documents/test.pdf"],
                    test_mode: false
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Your account has reached its signature request limit",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "downloadDocument",
        provider: "hellosign",
        validCases: [
            {
                name: "download_single_pdf",
                description: "Download a completed signature request as a single PDF",
                input: {
                    signature_request_id: "completed_request_abc123",
                    file_type: "pdf"
                },
                expectedOutput: {
                    signature_request_id: "completed_request_abc123",
                    file_type: "pdf",
                    download_url: "https://files.hellosign.com/download/abc123def456.pdf",
                    expires_at: 1706832000
                }
            }
        ],
        errorCases: [
            {
                name: "request_not_found",
                description: "Signature request does not exist",
                input: {
                    signature_request_id: "nonexistent_request_12345",
                    file_type: "pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "Signature request not found",
                    retryable: false
                }
            },
            {
                name: "document_not_ready",
                description: "Document is not yet available for download (still being signed)",
                input: {
                    signature_request_id: "pending_request_awaiting_signature",
                    file_type: "pdf"
                },
                expectedError: {
                    type: "validation",
                    message: "Documents are not available until all parties have signed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when downloading document",
                input: {
                    signature_request_id: "completed_request_abc123",
                    file_type: "pdf"
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
        operationId: "getSignatureRequest",
        provider: "hellosign",
        validCases: [
            {
                name: "get_pending_request",
                description: "Get details of a pending signature request awaiting signatures",
                input: {
                    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967"
                },
                expectedOutput: {
                    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967",
                    title: "Consulting Agreement",
                    subject: "Please sign the consulting agreement",
                    message:
                        "Please review and sign this consulting agreement at your earliest convenience.",
                    is_complete: false,
                    is_declined: false,
                    has_error: false,
                    test_mode: false,
                    created_at: 1706313600,
                    signing_url:
                        "https://app.hellosign.com/sign/fa5c8a0b0f492d768749333ad6fcc214c111e967",
                    details_url:
                        "https://app.hellosign.com/details/fa5c8a0b0f492d768749333ad6fcc214c111e967",
                    files_url:
                        "https://api.hellosign.com/v3/signature_request/files/fa5c8a0b0f492d768749333ad6fcc214c111e967",
                    signatures: [
                        {
                            email: "consultant@email.com",
                            name: "Jennifer Park",
                            status: "awaiting_signature",
                            signed_at: null,
                            decline_reason: null
                        },
                        {
                            email: "ceo@company.com",
                            name: "Thomas Anderson",
                            status: "awaiting_signature",
                            signed_at: null,
                            decline_reason: null
                        }
                    ],
                    requester_email: "admin@company.com"
                }
            }
        ],
        errorCases: [
            {
                name: "request_not_found",
                description: "Signature request does not exist",
                input: {
                    signature_request_id: "nonexistent_request_12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Signature request not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized_access",
                description: "User does not have access to this signature request",
                input: {
                    signature_request_id: "other_account_request_abc123"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this signature request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when getting signature request",
                input: {
                    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967"
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
        operationId: "listSignatureRequests",
        provider: "hellosign",
        validCases: [
            {
                name: "list_first_page",
                description: "List signature requests with default pagination",
                input: {},
                expectedOutput: {
                    signature_requests: [
                        {
                            signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967",
                            title: "Consulting Agreement",
                            subject: "Please sign the consulting agreement",
                            is_complete: false,
                            is_declined: false,
                            has_error: false,
                            test_mode: false,
                            created_at: 1706745600,
                            signers_count: 2,
                            signed_count: 0
                        },
                        {
                            signature_request_id: "completed_nda_abc123",
                            title: "Non-Disclosure Agreement",
                            subject: "NDA for Project Alpha",
                            is_complete: true,
                            is_declined: false,
                            has_error: false,
                            test_mode: false,
                            created_at: 1706659200,
                            signers_count: 2,
                            signed_count: 2
                        },
                        {
                            signature_request_id: "employment_contract_def456",
                            title: "Employment Contract - Marketing Manager",
                            subject: "Your Employment Contract",
                            is_complete: true,
                            is_declined: false,
                            has_error: false,
                            test_mode: false,
                            created_at: 1706572800,
                            signers_count: 2,
                            signed_count: 2
                        },
                        {
                            signature_request_id: "vendor_agreement_ghi789",
                            title: "Vendor Services Agreement",
                            subject: "Vendor Agreement - Q1 2024",
                            is_complete: false,
                            is_declined: true,
                            has_error: false,
                            test_mode: false,
                            created_at: 1706486400,
                            signers_count: 1,
                            signed_count: 0
                        },
                        {
                            signature_request_id: "partnership_jkl012",
                            title: "Strategic Partnership Agreement",
                            subject: "Partnership with Global Tech Inc",
                            is_complete: false,
                            is_declined: false,
                            has_error: false,
                            test_mode: false,
                            created_at: 1706400000,
                            signers_count: 4,
                            signed_count: 2
                        }
                    ],
                    pagination: {
                        page: 1,
                        page_size: 20,
                        total_pages: 5,
                        total_results: 87
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_number",
                description: "Request with invalid page number (less than 1)",
                input: {
                    page: 0,
                    page_size: 20
                },
                expectedError: {
                    type: "validation",
                    message: "Page number must be at least 1",
                    retryable: false
                }
            },
            {
                name: "page_size_too_large",
                description: "Request with page size exceeding maximum limit",
                input: {
                    page: 1,
                    page_size: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing signature requests",
                input: {
                    page: 1,
                    page_size: 20
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "account_not_found",
                description: "Filtered account ID does not exist",
                input: {
                    page: 1,
                    page_size: 20,
                    account_id: "nonexistent_account_xyz"
                },
                expectedError: {
                    type: "not_found",
                    message: "Account not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTemplates",
        provider: "hellosign",
        validCases: [
            {
                name: "list_all_templates",
                description: "List all available templates with default pagination",
                input: {},
                expectedOutput: {
                    templates: [
                        {
                            template_id: "c26b8a16784a872da37ea946b9ddec7c1e11dff6",
                            title: "Non-Disclosure Agreement",
                            message:
                                "Please review and sign this NDA to protect confidential information.",
                            signer_roles: [
                                { name: "Disclosing Party", order: 0 },
                                { name: "Receiving Party", order: 1 }
                            ],
                            cc_roles: [{ name: "Legal" }, { name: "Compliance" }],
                            documents: [{ name: "NDA_Template.pdf", index: 0 }],
                            custom_fields: [
                                { name: "disclosing_party_name", type: "text" },
                                { name: "receiving_party_name", type: "text" },
                                { name: "effective_date", type: "date" },
                                { name: "confidential_information_description", type: "text" }
                            ],
                            is_creator: true,
                            can_edit: true
                        },
                        {
                            template_id: "e8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
                            title: "Employment Agreement",
                            message: "Welcome to the team! Please sign your employment agreement.",
                            signer_roles: [
                                { name: "Employee", order: 0 },
                                { name: "HR Manager", order: 1 },
                                { name: "Department Head", order: 2 }
                            ],
                            cc_roles: [{ name: "Payroll" }, { name: "IT" }],
                            documents: [
                                { name: "Employment_Agreement.pdf", index: 0 },
                                { name: "Employee_Handbook_Acknowledgment.pdf", index: 1 }
                            ],
                            custom_fields: [
                                { name: "employee_name", type: "text" },
                                { name: "job_title", type: "text" },
                                { name: "department", type: "text" },
                                { name: "start_date", type: "date" },
                                { name: "annual_salary", type: "text" },
                                { name: "supervisor_name", type: "text" }
                            ],
                            is_creator: true,
                            can_edit: true
                        },
                        {
                            template_id: "template_contractor_def456",
                            title: "Independent Contractor Agreement",
                            message: "Please review and sign the contractor agreement.",
                            signer_roles: [
                                { name: "Contractor", order: 0 },
                                { name: "Company Representative", order: 1 }
                            ],
                            cc_roles: [{ name: "Accounts Payable" }],
                            documents: [
                                { name: "Contractor_Agreement.pdf", index: 0 },
                                { name: "W9_Form.pdf", index: 1 }
                            ],
                            custom_fields: [
                                { name: "contractor_name", type: "text" },
                                { name: "contractor_company", type: "text" },
                                { name: "project_description", type: "text" },
                                { name: "hourly_rate", type: "text" },
                                { name: "project_start_date", type: "date" },
                                { name: "project_end_date", type: "date" }
                            ],
                            is_creator: true,
                            can_edit: true
                        },
                        {
                            template_id: "template_lease_ghi789",
                            title: "Commercial Lease Agreement",
                            message: "Please sign the commercial lease agreement for the property.",
                            signer_roles: [
                                { name: "Tenant", order: 0 },
                                { name: "Landlord", order: 1 }
                            ],
                            cc_roles: [{ name: "Property Manager" }, { name: "Broker" }],
                            documents: [
                                { name: "Lease_Agreement.pdf", index: 0 },
                                { name: "Property_Addendum.pdf", index: 1 },
                                { name: "Rules_and_Regulations.pdf", index: 2 }
                            ],
                            custom_fields: [
                                { name: "property_address", type: "text" },
                                { name: "monthly_rent", type: "text" },
                                { name: "security_deposit", type: "text" },
                                { name: "lease_start_date", type: "date" },
                                { name: "lease_end_date", type: "date" },
                                { name: "tenant_company_name", type: "text" }
                            ],
                            is_creator: true,
                            can_edit: true
                        },
                        {
                            template_id: "template_sales_jkl012",
                            title: "Sales Agreement",
                            message: "Please sign to confirm your purchase agreement.",
                            signer_roles: [
                                { name: "Buyer", order: 0 },
                                { name: "Seller", order: 1 }
                            ],
                            cc_roles: [{ name: "Sales Manager" }],
                            documents: [{ name: "Sales_Agreement.pdf", index: 0 }],
                            custom_fields: [
                                { name: "buyer_name", type: "text" },
                                { name: "product_description", type: "text" },
                                { name: "total_amount", type: "text" },
                                { name: "payment_terms", type: "text" }
                            ],
                            is_creator: true,
                            can_edit: true
                        }
                    ],
                    pagination: {
                        page: 1,
                        page_size: 20,
                        total_pages: 2,
                        total_results: 23
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_number",
                description: "Request with invalid page number",
                input: {
                    page: -1,
                    page_size: 20
                },
                expectedError: {
                    type: "validation",
                    message: "Page number must be at least 1",
                    retryable: false
                }
            },
            {
                name: "page_size_exceeds_limit",
                description: "Request with page size exceeding maximum",
                input: {
                    page: 1,
                    page_size: 200
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing templates",
                input: {
                    page: 1,
                    page_size: 20
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_account_access",
                description: "Attempting to list templates from an account without access",
                input: {
                    page: 1,
                    page_size: 20,
                    account_id: "unauthorized_account_xyz"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access templates for this account",
                    retryable: false
                }
            }
        ]
    }
];
