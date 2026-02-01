/**
 * Tableau Provider Test Fixtures
 *
 * Comprehensive test fixtures for Tableau BI/visualization platform operations
 * including workbooks, views, data sources, projects, and sites.
 */

import type { TestFixture } from "../../../sandbox";

export const tableauFixtures: TestFixture[] = [
    // ==================== SIGN IN ====================
    {
        operationId: "signIn",
        provider: "tableau",
        validCases: [
            {
                name: "successful_sign_in",
                description:
                    "Successfully authenticate with Tableau Server and get credentials token",
                input: {},
                expectedOutput: {
                    site_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    site_content_url: "marketing-analytics",
                    user_id: "u1a2b3c4-d5e6-7890-1234-567890abcdef",
                    user_name: "john.analyst@company.com",
                    authenticated: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_credentials",
                description: "Authentication failed due to invalid credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Sign-in failed. Invalid username or password.",
                    retryable: false
                }
            },
            {
                name: "site_not_found",
                description: "Specified site does not exist",
                input: {},
                expectedError: {
                    type: "not_found",
                    message: "Site not found or user does not have access",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for authentication",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST SITES ====================
    {
        operationId: "listSites",
        provider: "tableau",
        validCases: [
            {
                name: "list_all_sites",
                description: "Get all sites the user has access to",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedOutput: {
                    sites: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            name: "Marketing Analytics",
                            contentUrl: "marketing-analytics",
                            adminMode: "ContentAndUsers",
                            state: "Active",
                            disableSubscriptions: false
                        },
                        {
                            id: "b2c3d4e5-f678-90ab-cdef-123456789012",
                            name: "Sales Intelligence",
                            contentUrl: "sales-intelligence",
                            adminMode: "ContentOnly",
                            state: "Active",
                            disableSubscriptions: false
                        },
                        {
                            id: "c3d4e5f6-7890-abcd-ef12-345678901234",
                            name: "Executive Dashboards",
                            contentUrl: "executive-dashboards",
                            adminMode: "ContentAndUsers",
                            state: "Active",
                            disableSubscriptions: true
                        },
                        {
                            id: "d4e5f6a7-8901-bcde-f234-567890123456",
                            name: "Finance Reports",
                            contentUrl: "finance-reports",
                            adminMode: "ContentOnly",
                            state: "Active",
                            disableSubscriptions: false
                        }
                    ],
                    pagination: {
                        page_number: 1,
                        page_size: 100,
                        total_available: 4
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "User session expired or invalid",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid authentication credentials",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST PROJECTS ====================
    {
        operationId: "listProjects",
        provider: "tableau",
        validCases: [
            {
                name: "list_all_projects",
                description: "Get all projects on the site",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedOutput: {
                    projects: [
                        {
                            id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                            name: "Marketing Campaigns",
                            description:
                                "Dashboards and reports for marketing campaign performance tracking",
                            contentPermissions: "LockedToProject",
                            createdAt: "2023-06-15T10:30:00Z",
                            updatedAt: "2024-01-10T14:22:00Z",
                            owner: {
                                id: "user-marketing-lead-1234-5678-90abcdef",
                                name: "Sarah Marketing"
                            }
                        },
                        {
                            id: "proj-b2c3d4e5-6789-0abc-def1-234567890123",
                            name: "Sales Performance",
                            description:
                                "Sales team KPIs, pipeline analysis, and revenue forecasting",
                            contentPermissions: "ManagedByOwner",
                            createdAt: "2023-04-20T08:15:00Z",
                            updatedAt: "2024-01-12T09:45:00Z",
                            owner: {
                                id: "user-sales-director-5678-90ab-cdef1234",
                                name: "Mike Sales"
                            }
                        },
                        {
                            id: "proj-c3d4e5f6-7890-abcd-ef12-345678901234",
                            name: "Finance & Accounting",
                            description:
                                "Financial statements, budget tracking, and expense analysis",
                            contentPermissions: "LockedToProject",
                            parentProjectId: "proj-parent-finance-0000-1111-2222-3333",
                            createdAt: "2023-02-10T11:00:00Z",
                            updatedAt: "2024-01-08T16:30:00Z",
                            owner: {
                                id: "user-cfo-90ab-cdef-1234-567890abcdef",
                                name: "Jennifer Finance"
                            }
                        },
                        {
                            id: "proj-d4e5f6a7-8901-bcde-f234-567890123456",
                            name: "Product Analytics",
                            description: "User engagement, feature adoption, and product metrics",
                            contentPermissions: "ManagedByOwner",
                            createdAt: "2023-08-01T13:45:00Z",
                            updatedAt: "2024-01-15T10:15:00Z",
                            owner: {
                                id: "user-pm-lead-cdef-1234-5678-90abcdef12",
                                name: "Alex Product"
                            }
                        },
                        {
                            id: "proj-e5f6a7b8-9012-cdef-3456-789012345678",
                            name: "Customer Success",
                            description:
                                "Customer health scores, churn analysis, and support metrics",
                            contentPermissions: "LockedToProject",
                            createdAt: "2023-09-15T09:20:00Z",
                            updatedAt: "2024-01-14T11:50:00Z",
                            owner: {
                                id: "user-cs-manager-1234-5678-90ab-cdef1234",
                                name: "Chris Customer"
                            }
                        }
                    ],
                    pagination: {
                        page_number: 1,
                        page_size: 100,
                        total_available: 5
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid filter expression provided",
                input: {
                    page_size: 100,
                    page_number: 1,
                    filter: "invalid filter syntax"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter expression syntax",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST WORKBOOKS ====================
    {
        operationId: "listWorkbooks",
        provider: "tableau",
        validCases: [
            {
                name: "list_all_workbooks",
                description: "Get all workbooks on the site",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedOutput: {
                    workbooks: [
                        {
                            id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                            name: "Q4 Marketing Campaign Analysis",
                            description:
                                "Comprehensive analysis of Q4 2023 marketing campaigns across all channels",
                            contentUrl: "Q4MarketingCampaignAnalysis",
                            webpageUrl:
                                "https://tableau.company.com/#/site/marketing-analytics/workbooks/123456",
                            showTabs: true,
                            size: 4521984,
                            createdAt: "2023-10-01T09:00:00Z",
                            updatedAt: "2024-01-15T14:30:00Z",
                            project: {
                                id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                                name: "Marketing Campaigns"
                            },
                            owner: {
                                id: "user-marketing-analyst-1234-5678-90ab",
                                name: "Emily Analyst"
                            },
                            defaultViewId: "view-default-q4-marketing-1234-5678"
                        },
                        {
                            id: "wb-b2c3d4e5-6789-0abc-def1-234567890123",
                            name: "Sales Pipeline Dashboard",
                            description:
                                "Real-time sales pipeline tracking and forecasting dashboard",
                            contentUrl: "SalesPipelineDashboard",
                            webpageUrl:
                                "https://tableau.company.com/#/site/sales-intelligence/workbooks/234567",
                            showTabs: false,
                            size: 2156032,
                            createdAt: "2023-05-15T11:30:00Z",
                            updatedAt: "2024-01-16T08:45:00Z",
                            project: {
                                id: "proj-b2c3d4e5-6789-0abc-def1-234567890123",
                                name: "Sales Performance"
                            },
                            owner: {
                                id: "user-sales-ops-5678-90ab-cdef-123456",
                                name: "David Sales"
                            },
                            defaultViewId: "view-default-pipeline-5678-90ab"
                        },
                        {
                            id: "wb-c3d4e5f6-7890-abcd-ef12-345678901234",
                            name: "Executive Revenue Summary",
                            description:
                                "High-level revenue metrics and KPIs for executive leadership",
                            contentUrl: "ExecutiveRevenueSummary",
                            webpageUrl:
                                "https://tableau.company.com/#/site/executive-dashboards/workbooks/345678",
                            showTabs: true,
                            size: 1843200,
                            createdAt: "2023-01-10T14:00:00Z",
                            updatedAt: "2024-01-15T16:00:00Z",
                            project: {
                                id: "proj-c3d4e5f6-7890-abcd-ef12-345678901234",
                                name: "Finance & Accounting"
                            },
                            owner: {
                                id: "user-bi-lead-90ab-cdef-1234-567890",
                                name: "Rachel BI"
                            },
                            defaultViewId: "view-default-revenue-90ab-cdef"
                        },
                        {
                            id: "wb-d4e5f6a7-8901-bcde-f234-567890123456",
                            name: "Product Usage Metrics",
                            description: "Daily, weekly, and monthly product usage analytics",
                            contentUrl: "ProductUsageMetrics",
                            webpageUrl:
                                "https://tableau.company.com/#/site/marketing-analytics/workbooks/456789",
                            showTabs: true,
                            size: 3276800,
                            createdAt: "2023-07-20T10:15:00Z",
                            updatedAt: "2024-01-14T12:20:00Z",
                            project: {
                                id: "proj-d4e5f6a7-8901-bcde-f234-567890123456",
                                name: "Product Analytics"
                            },
                            owner: {
                                id: "user-product-analyst-cdef-1234-5678-90",
                                name: "Taylor Product"
                            },
                            defaultViewId: "view-default-usage-cdef-1234"
                        },
                        {
                            id: "wb-e5f6a7b8-9012-cdef-3456-789012345678",
                            name: "Customer Health Scorecard",
                            description:
                                "Customer health scores, engagement metrics, and churn risk indicators",
                            contentUrl: "CustomerHealthScorecard",
                            webpageUrl:
                                "https://tableau.company.com/#/site/marketing-analytics/workbooks/567890",
                            showTabs: false,
                            size: 2621440,
                            createdAt: "2023-09-01T08:30:00Z",
                            updatedAt: "2024-01-16T07:15:00Z",
                            project: {
                                id: "proj-e5f6a7b8-9012-cdef-3456-789012345678",
                                name: "Customer Success"
                            },
                            owner: {
                                id: "user-cs-analyst-1234-5678-90ab-cdef12",
                                name: "Jordan Customer"
                            },
                            defaultViewId: "view-default-health-1234-5678"
                        }
                    ],
                    pagination: {
                        page_number: 1,
                        page_size: 100,
                        total_available: 5
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid filter expression provided",
                input: {
                    page_size: 100,
                    page_number: 1,
                    filter: "invalidFieldName:eq:value"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter field name",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== GET WORKBOOK ====================
    {
        operationId: "getWorkbook",
        provider: "tableau",
        validCases: [
            {
                name: "get_workbook_with_views",
                description: "Get workbook details including views and connections",
                input: {
                    workbook_id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012"
                },
                expectedOutput: {
                    id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                    name: "Q4 Marketing Campaign Analysis",
                    description:
                        "Comprehensive analysis of Q4 2023 marketing campaigns across all channels",
                    contentUrl: "Q4MarketingCampaignAnalysis",
                    webpageUrl:
                        "https://tableau.company.com/#/site/marketing-analytics/workbooks/123456",
                    showTabs: true,
                    size: 4521984,
                    createdAt: "2023-10-01T09:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z",
                    project: {
                        id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                        name: "Marketing Campaigns"
                    },
                    owner: {
                        id: "user-marketing-analyst-1234-5678-90ab",
                        name: "Emily Analyst"
                    },
                    defaultViewId: "view-default-q4-marketing-1234-5678",
                    views: {
                        view: [
                            {
                                id: "view-campaign-overview-1234-5678-90ab",
                                name: "Campaign Overview",
                                contentUrl: "Q4MarketingCampaignAnalysis/CampaignOverview"
                            },
                            {
                                id: "view-channel-performance-5678-90ab-cdef",
                                name: "Channel Performance",
                                contentUrl: "Q4MarketingCampaignAnalysis/ChannelPerformance"
                            },
                            {
                                id: "view-conversion-funnel-90ab-cdef-1234",
                                name: "Conversion Funnel",
                                contentUrl: "Q4MarketingCampaignAnalysis/ConversionFunnel"
                            },
                            {
                                id: "view-roi-analysis-cdef-1234-5678",
                                name: "ROI Analysis",
                                contentUrl: "Q4MarketingCampaignAnalysis/ROIAnalysis"
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workbook with specified ID does not exist",
                input: {
                    workbook_id: "wb-nonexistent-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workbook not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have permission to view this workbook",
                input: {
                    workbook_id: "wb-restricted-1234-5678-90ab-cdef12345678"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this workbook",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workbook_id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== DOWNLOAD WORKBOOK ====================
    {
        operationId: "downloadWorkbook",
        provider: "tableau",
        validCases: [
            {
                name: "download_as_pdf_letter",
                description: "Download a workbook as PDF with letter page size",
                input: {
                    workbook_id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                    format: "pdf",
                    page_type: "letter",
                    orientation: "landscape"
                },
                expectedOutput: {
                    format: "pdf",
                    download_url:
                        "/sites/a1b2c3d4-e5f6-7890-abcd-ef1234567890/workbooks/wb-a1b2c3d4-5678-90ab-cdef-123456789012/pdf",
                    page_type: "letter",
                    orientation: "landscape",
                    note: "Use the download_url with the X-Tableau-Auth header to fetch the file"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workbook not found",
                input: {
                    workbook_id: "wb-nonexistent-0000-0000-0000-000000000000",
                    format: "pdf",
                    page_type: "letter",
                    orientation: "portrait"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workbook not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have download permission",
                input: {
                    workbook_id: "wb-restricted-1234-5678-90ab-cdef12345678",
                    format: "pdf",
                    page_type: "letter",
                    orientation: "portrait"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to download this workbook",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workbook_id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                    format: "pdf",
                    page_type: "letter",
                    orientation: "portrait"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST VIEWS ====================
    {
        operationId: "listViews",
        provider: "tableau",
        validCases: [
            {
                name: "list_all_views",
                description: "Get all views (visualizations) on the site",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedOutput: {
                    views: [
                        {
                            id: "view-campaign-overview-1234-5678-90ab",
                            name: "Campaign Overview",
                            contentUrl: "Q4MarketingCampaignAnalysis/CampaignOverview",
                            createdAt: "2023-10-01T09:15:00Z",
                            updatedAt: "2024-01-15T14:35:00Z",
                            workbook: {
                                id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                                name: "Q4 Marketing Campaign Analysis"
                            },
                            owner: {
                                id: "user-marketing-analyst-1234-5678-90ab",
                                name: "Emily Analyst"
                            },
                            project: {
                                id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                                name: "Marketing Campaigns"
                            },
                            sheetType: "dashboard"
                        },
                        {
                            id: "view-channel-performance-5678-90ab-cdef",
                            name: "Channel Performance",
                            contentUrl: "Q4MarketingCampaignAnalysis/ChannelPerformance",
                            createdAt: "2023-10-01T09:20:00Z",
                            updatedAt: "2024-01-14T11:45:00Z",
                            workbook: {
                                id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                                name: "Q4 Marketing Campaign Analysis"
                            },
                            owner: {
                                id: "user-marketing-analyst-1234-5678-90ab",
                                name: "Emily Analyst"
                            },
                            project: {
                                id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                                name: "Marketing Campaigns"
                            },
                            sheetType: "worksheet"
                        },
                        {
                            id: "view-default-pipeline-5678-90ab",
                            name: "Pipeline Dashboard",
                            contentUrl: "SalesPipelineDashboard/PipelineDashboard",
                            createdAt: "2023-05-15T11:35:00Z",
                            updatedAt: "2024-01-16T08:50:00Z",
                            workbook: {
                                id: "wb-b2c3d4e5-6789-0abc-def1-234567890123",
                                name: "Sales Pipeline Dashboard"
                            },
                            owner: {
                                id: "user-sales-ops-5678-90ab-cdef-123456",
                                name: "David Sales"
                            },
                            project: {
                                id: "proj-b2c3d4e5-6789-0abc-def1-234567890123",
                                name: "Sales Performance"
                            },
                            sheetType: "dashboard"
                        },
                        {
                            id: "view-revenue-trends-90ab-cdef-1234",
                            name: "Revenue Trends",
                            contentUrl: "ExecutiveRevenueSummary/RevenueTrends",
                            createdAt: "2023-01-10T14:10:00Z",
                            updatedAt: "2024-01-15T16:05:00Z",
                            workbook: {
                                id: "wb-c3d4e5f6-7890-abcd-ef12-345678901234",
                                name: "Executive Revenue Summary"
                            },
                            owner: {
                                id: "user-bi-lead-90ab-cdef-1234-567890",
                                name: "Rachel BI"
                            },
                            project: {
                                id: "proj-c3d4e5f6-7890-abcd-ef12-345678901234",
                                name: "Finance & Accounting"
                            },
                            sheetType: "worksheet"
                        },
                        {
                            id: "view-user-engagement-cdef-1234-5678",
                            name: "User Engagement",
                            contentUrl: "ProductUsageMetrics/UserEngagement",
                            createdAt: "2023-07-20T10:20:00Z",
                            updatedAt: "2024-01-14T12:25:00Z",
                            workbook: {
                                id: "wb-d4e5f6a7-8901-bcde-f234-567890123456",
                                name: "Product Usage Metrics"
                            },
                            owner: {
                                id: "user-product-analyst-cdef-1234-5678-90",
                                name: "Taylor Product"
                            },
                            project: {
                                id: "proj-d4e5f6a7-8901-bcde-f234-567890123456",
                                name: "Product Analytics"
                            },
                            sheetType: "dashboard"
                        }
                    ],
                    pagination: {
                        page_number: 1,
                        page_size: 100,
                        total_available: 5
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid filter expression",
                input: {
                    page_size: 100,
                    page_number: 1,
                    filter: "invalid:filter:expression"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter expression",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== GET VIEW ====================
    {
        operationId: "getView",
        provider: "tableau",
        validCases: [
            {
                name: "get_dashboard_view",
                description: "Get details of a dashboard view",
                input: {
                    view_id: "view-campaign-overview-1234-5678-90ab"
                },
                expectedOutput: {
                    id: "view-campaign-overview-1234-5678-90ab",
                    name: "Campaign Overview",
                    contentUrl: "Q4MarketingCampaignAnalysis/CampaignOverview",
                    createdAt: "2023-10-01T09:15:00Z",
                    updatedAt: "2024-01-15T14:35:00Z",
                    workbook: {
                        id: "wb-a1b2c3d4-5678-90ab-cdef-123456789012",
                        name: "Q4 Marketing Campaign Analysis"
                    },
                    owner: {
                        id: "user-marketing-analyst-1234-5678-90ab",
                        name: "Emily Analyst"
                    },
                    project: {
                        id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                        name: "Marketing Campaigns"
                    },
                    sheetType: "dashboard"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "View with specified ID does not exist",
                input: {
                    view_id: "view-nonexistent-0000-0000-0000-0000"
                },
                expectedError: {
                    type: "not_found",
                    message: "View not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have permission to view this visualization",
                input: {
                    view_id: "view-restricted-1234-5678-90ab-cdef"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this view",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    view_id: "view-campaign-overview-1234-5678-90ab"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== QUERY VIEW IMAGE ====================
    {
        operationId: "queryViewImage",
        provider: "tableau",
        validCases: [
            {
                name: "query_view_image_standard",
                description: "Get the view as a PNG image with standard resolution",
                input: {
                    view_id: "view-campaign-overview-1234-5678-90ab",
                    resolution: "standard"
                },
                expectedOutput: {
                    format: "png",
                    image_url:
                        "/sites/a1b2c3d4-e5f6-7890-abcd-ef1234567890/views/view-campaign-overview-1234-5678-90ab/image",
                    resolution: "standard",
                    width: undefined,
                    height: undefined,
                    note: "Use the image_url with the X-Tableau-Auth header to fetch the image"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "View not found",
                input: {
                    view_id: "view-nonexistent-0000-0000-0000-0000",
                    resolution: "standard"
                },
                expectedError: {
                    type: "not_found",
                    message: "View not found",
                    retryable: false
                }
            },
            {
                name: "invalid_dimensions",
                description: "Requested dimensions exceed maximum allowed",
                input: {
                    view_id: "view-campaign-overview-1234-5678-90ab",
                    resolution: "high",
                    width: 5000,
                    height: 5000
                },
                expectedError: {
                    type: "validation",
                    message: "Image dimensions exceed maximum allowed (4000x4000)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    view_id: "view-campaign-overview-1234-5678-90ab",
                    resolution: "standard"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== QUERY VIEW DATA ====================
    {
        operationId: "queryViewData",
        provider: "tableau",
        validCases: [
            {
                name: "query_view_data_default",
                description: "Get the underlying data from a view in CSV format",
                input: {
                    view_id: "view-channel-performance-5678-90ab-cdef"
                },
                expectedOutput: {
                    format: "csv",
                    content:
                        "Channel,Impressions,Clicks,CTR,Conversions,Cost,CPA\nGoogle Ads,1245678,45230,3.63%,2341,$45230.50,$19.32\nFacebook,987654,32156,3.26%,1523,$28450.00,$18.68\nLinkedIn,456789,12345,2.70%,567,$34560.00,$60.95\nTwitter,234567,8901,3.79%,312,$12340.00,$39.55\nInstagram,678901,23456,3.46%,890,$18900.00,$21.24\nEmail,156789,15678,10.00%,1234,$5670.00,$4.59"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "View not found",
                input: {
                    view_id: "view-nonexistent-0000-0000-0000-0000"
                },
                expectedError: {
                    type: "not_found",
                    message: "View not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have data export permission",
                input: {
                    view_id: "view-restricted-data-1234-5678-90ab"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to download data from this view",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    view_id: "view-channel-performance-5678-90ab-cdef"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST DATA SOURCES ====================
    {
        operationId: "listDataSources",
        provider: "tableau",
        validCases: [
            {
                name: "list_all_data_sources",
                description: "Get all data sources on the site",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedOutput: {
                    datasources: [
                        {
                            id: "ds-a1b2c3d4-5678-90ab-cdef-123456789012",
                            name: "Marketing Campaign Data",
                            description:
                                "Aggregated marketing data from all channels including Google Ads, Facebook, and LinkedIn",
                            contentUrl: "MarketingCampaignData",
                            type: "sqlserver",
                            createdAt: "2023-06-01T10:00:00Z",
                            updatedAt: "2024-01-16T06:00:00Z",
                            isCertified: true,
                            certificationNote:
                                "Certified by Data Engineering team. Updated daily at 6 AM EST.",
                            project: {
                                id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                                name: "Marketing Campaigns"
                            },
                            owner: {
                                id: "user-data-eng-1234-5678-90ab-cdef12",
                                name: "Data Engineering"
                            }
                        },
                        {
                            id: "ds-b2c3d4e5-6789-0abc-def1-234567890123",
                            name: "Salesforce CRM Extract",
                            description:
                                "Daily extract from Salesforce including opportunities, accounts, and contacts",
                            contentUrl: "SalesforceCRMExtract",
                            type: "salesforce",
                            createdAt: "2023-03-15T08:30:00Z",
                            updatedAt: "2024-01-16T07:00:00Z",
                            isCertified: true,
                            certificationNote:
                                "Official Salesforce data source. Refreshed every 4 hours.",
                            project: {
                                id: "proj-b2c3d4e5-6789-0abc-def1-234567890123",
                                name: "Sales Performance"
                            },
                            owner: {
                                id: "user-sales-ops-5678-90ab-cdef-123456",
                                name: "David Sales"
                            }
                        },
                        {
                            id: "ds-c3d4e5f6-7890-abcd-ef12-345678901234",
                            name: "Financial Data Warehouse",
                            description:
                                "Enterprise financial data including GL, AR, AP, and revenue recognition",
                            contentUrl: "FinancialDataWarehouse",
                            type: "snowflake",
                            createdAt: "2022-12-01T09:00:00Z",
                            updatedAt: "2024-01-16T05:30:00Z",
                            isCertified: true,
                            certificationNote: "Certified for executive reporting. SOX compliant.",
                            project: {
                                id: "proj-c3d4e5f6-7890-abcd-ef12-345678901234",
                                name: "Finance & Accounting"
                            },
                            owner: {
                                id: "user-finance-bi-90ab-cdef-1234-567890",
                                name: "Finance BI Team"
                            }
                        },
                        {
                            id: "ds-d4e5f6a7-8901-bcde-f234-567890123456",
                            name: "Product Analytics Events",
                            description:
                                "Clickstream and event data from product analytics platform",
                            contentUrl: "ProductAnalyticsEvents",
                            type: "bigquery",
                            createdAt: "2023-07-01T11:00:00Z",
                            updatedAt: "2024-01-16T00:15:00Z",
                            isCertified: false,
                            project: {
                                id: "proj-d4e5f6a7-8901-bcde-f234-567890123456",
                                name: "Product Analytics"
                            },
                            owner: {
                                id: "user-product-analyst-cdef-1234-5678-90",
                                name: "Taylor Product"
                            }
                        },
                        {
                            id: "ds-e5f6a7b8-9012-cdef-3456-789012345678",
                            name: "Customer Success Metrics",
                            description: "Customer health scores, support tickets, and NPS data",
                            contentUrl: "CustomerSuccessMetrics",
                            type: "postgresql",
                            createdAt: "2023-08-15T14:30:00Z",
                            updatedAt: "2024-01-16T08:00:00Z",
                            isCertified: true,
                            certificationNote: "Customer Success team certified data source",
                            project: {
                                id: "proj-e5f6a7b8-9012-cdef-3456-789012345678",
                                name: "Customer Success"
                            },
                            owner: {
                                id: "user-cs-analyst-1234-5678-90ab-cdef12",
                                name: "Jordan Customer"
                            }
                        }
                    ],
                    pagination: {
                        page_number: 1,
                        page_size: 100,
                        total_available: 5
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid filter expression",
                input: {
                    page_size: 100,
                    page_number: 1,
                    filter: "invalidField:eq:value"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter field",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    page_size: 100,
                    page_number: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== GET DATA SOURCE ====================
    {
        operationId: "getDataSource",
        provider: "tableau",
        validCases: [
            {
                name: "get_certified_data_source",
                description: "Get details of a certified data source",
                input: {
                    datasource_id: "ds-a1b2c3d4-5678-90ab-cdef-123456789012"
                },
                expectedOutput: {
                    id: "ds-a1b2c3d4-5678-90ab-cdef-123456789012",
                    name: "Marketing Campaign Data",
                    description:
                        "Aggregated marketing data from all channels including Google Ads, Facebook, and LinkedIn",
                    contentUrl: "MarketingCampaignData",
                    type: "sqlserver",
                    createdAt: "2023-06-01T10:00:00Z",
                    updatedAt: "2024-01-16T06:00:00Z",
                    isCertified: true,
                    certificationNote:
                        "Certified by Data Engineering team. Updated daily at 6 AM EST.",
                    project: {
                        id: "proj-a1b2c3d4-5678-90ab-cdef-123456789012",
                        name: "Marketing Campaigns"
                    },
                    owner: {
                        id: "user-data-eng-1234-5678-90ab-cdef12",
                        name: "Data Engineering"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Data source not found",
                input: {
                    datasource_id: "ds-nonexistent-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Data source not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have permission to view this data source",
                input: {
                    datasource_id: "ds-restricted-1234-5678-90ab-cdef12345678"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this data source",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    datasource_id: "ds-a1b2c3d4-5678-90ab-cdef-123456789012"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== REFRESH DATA SOURCE ====================
    {
        operationId: "refreshDataSource",
        provider: "tableau",
        validCases: [
            {
                name: "trigger_refresh_success",
                description: "Trigger a refresh for a data source extract",
                input: {
                    datasource_id: "ds-a1b2c3d4-5678-90ab-cdef-123456789012"
                },
                expectedOutput: {
                    job_id: "job-refresh-a1b2c3d4-5678-90ab-cdef-1234",
                    mode: "Asynchronous",
                    type: "RefreshExtract",
                    progress: 0,
                    created_at: "2024-01-16T10:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Data source not found",
                input: {
                    datasource_id: "ds-nonexistent-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Data source not found",
                    retryable: false
                }
            },
            {
                name: "refresh_already_running",
                description: "A refresh is already in progress for this data source",
                input: {
                    datasource_id: "ds-d4e5f6a7-8901-bcde-f234-567890123456"
                },
                expectedError: {
                    type: "validation",
                    message: "A refresh job is already running for this data source",
                    retryable: false
                }
            },
            {
                name: "not_an_extract",
                description: "Data source is not an extract and cannot be refreshed",
                input: {
                    datasource_id: "ds-live-connection-1234-5678-90ab-cdef"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot refresh a live connection data source",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have refresh permission",
                input: {
                    datasource_id: "ds-restricted-1234-5678-90ab-cdef12345678"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to refresh this data source",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    datasource_id: "ds-a1b2c3d4-5678-90ab-cdef-123456789012"
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
