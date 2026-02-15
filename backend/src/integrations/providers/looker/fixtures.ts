/**
 * Looker Provider Test Fixtures
 *
 * Based on official Looker API documentation:
 * - Dashboards: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Dashboard
 * - Looks: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Look
 * - Queries: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Query
 * - Explores: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/LookmlModel
 */

import type { TestFixture } from "../../sandbox";

export const lookerFixtures: TestFixture[] = [
    {
        operationId: "createQuery",
        provider: "looker",
        validCases: [
            {
                name: "basic_sales_query",
                description: "Create a basic sales query with dimensions and measures",
                input: {
                    model: "ecommerce",
                    view: "orders",
                    fields: ["orders.created_date", "orders.total_revenue", "orders.order_count"],
                    filters: {
                        "orders.created_date": "last 30 days"
                    },
                    sorts: ["orders.created_date desc"],
                    limit: 100
                },
                expectedOutput: {
                    success: true,
                    data: {
                        id: 98765,
                        model: "ecommerce",
                        view: "orders",
                        fields: [
                            "orders.created_date",
                            "orders.total_revenue",
                            "orders.order_count"
                        ],
                        filters: {
                            "orders.created_date": "last 30 days"
                        },
                        sorts: ["orders.created_date desc"],
                        limit: "100"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "model_not_found",
                description: "LookML model does not exist",
                input: {
                    model: "nonexistent_model",
                    view: "orders",
                    fields: ["orders.id"],
                    limit: 100
                },
                expectedError: {
                    type: "not_found",
                    message: "Model 'nonexistent_model' not found",
                    retryable: false
                }
            },
            {
                name: "invalid_field",
                description: "Field does not exist in the explore",
                input: {
                    model: "ecommerce",
                    view: "orders",
                    fields: ["orders.nonexistent_field"],
                    limit: 100
                },
                expectedError: {
                    type: "validation",
                    message: "Unknown field 'orders.nonexistent_field'",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    model: "ecommerce",
                    view: "orders",
                    fields: ["orders.id"],
                    limit: 100
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
        operationId: "getDashboard",
        provider: "looker",
        validCases: [
            {
                name: "executive_dashboard",
                description: "Get a comprehensive executive dashboard with multiple elements",
                input: {
                    dashboard_id: "executive_overview"
                },
                expectedOutput: {
                    success: true,
                    data: {
                        id: "executive_overview",
                        title: "Executive Overview",
                        description: "High-level KPIs and metrics for executive leadership team",
                        folder: {
                            id: "123",
                            name: "Executive Dashboards",
                            parent_id: "1"
                        },
                        user_id: "45",
                        readonly: false,
                        created_at: "2023-06-15T10:30:00.000Z",
                        updated_at: "2024-01-20T14:45:00.000Z",
                        deleted_at: null,
                        dashboard_elements: [
                            {
                                id: "elem_001",
                                type: "vis",
                                title: "Monthly Revenue Trend",
                                subtitle_text: "Last 12 months",
                                query_id: 12345,
                                result_maker_id: 67890
                            },
                            {
                                id: "elem_002",
                                type: "vis",
                                title: "Customer Acquisition",
                                subtitle_text: "New customers by channel",
                                query_id: 12346,
                                result_maker_id: 67891
                            },
                            {
                                id: "elem_003",
                                type: "vis",
                                title: "Churn Rate",
                                subtitle_text: "Monthly churn percentage",
                                look_id: "789",
                                result_maker_id: 67892
                            },
                            {
                                id: "elem_004",
                                type: "single_value",
                                title: "Total ARR",
                                query_id: 12347,
                                result_maker_id: 67893
                            }
                        ],
                        dashboard_filters: [
                            {
                                id: "filter_001",
                                name: "date_filter",
                                title: "Date Range",
                                type: "date_filter",
                                default_value: "last 90 days",
                                required: false
                            },
                            {
                                id: "filter_002",
                                name: "region_filter",
                                title: "Region",
                                type: "string_filter",
                                default_value: "",
                                required: false
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "dashboard_not_found",
                description: "Dashboard does not exist",
                input: {
                    dashboard_id: "nonexistent_dashboard_999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Dashboard 'nonexistent_dashboard_999' not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No access to dashboard",
                input: {
                    dashboard_id: "restricted_dashboard"
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied to dashboard",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    dashboard_id: "executive_overview"
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
        operationId: "getLook",
        provider: "looker",
        validCases: [
            {
                name: "revenue_look",
                description: "Get a revenue analysis Look",
                input: {
                    look_id: 12345
                },
                expectedOutput: {
                    success: true,
                    data: {
                        id: 12345,
                        title: "Monthly Revenue by Product Category",
                        description: "Breakdown of revenue across all product categories over time",
                        folder: {
                            id: "200",
                            name: "Revenue Reports",
                            parent_id: "10"
                        },
                        user_id: "56",
                        query_id: 98765,
                        public: false,
                        created_at: "2023-03-10T11:00:00.000Z",
                        updated_at: "2024-01-15T09:30:00.000Z",
                        deleted_at: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "look_not_found",
                description: "Look does not exist",
                input: {
                    look_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Look not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No access to Look",
                input: {
                    look_id: 11111
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied to Look",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    look_id: 12345
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
        operationId: "listDashboards",
        provider: "looker",
        validCases: [
            {
                name: "all_dashboards",
                description: "Get all dashboards without filters",
                input: {},
                expectedOutput: {
                    success: true,
                    data: {
                        dashboards: [
                            {
                                id: "executive_overview",
                                title: "Executive Overview",
                                description: "High-level KPIs and metrics for executive leadership",
                                folder: {
                                    id: "123",
                                    name: "Executive Dashboards"
                                },
                                user_id: "45",
                                created_at: "2023-06-15T10:30:00.000Z",
                                updated_at: "2024-01-20T14:45:00.000Z"
                            },
                            {
                                id: "456",
                                title: "Sales Performance Q4 2024",
                                description: "Detailed sales metrics and pipeline analysis",
                                folder: {
                                    id: "124",
                                    name: "Sales"
                                },
                                user_id: "78",
                                created_at: "2024-10-01T09:00:00.000Z",
                                updated_at: "2024-12-15T16:30:00.000Z"
                            },
                            {
                                id: "789",
                                title: "Marketing Campaign Analysis",
                                description: "Campaign performance across all channels",
                                folder: {
                                    id: "125",
                                    name: "Marketing"
                                },
                                user_id: "90",
                                created_at: "2024-01-05T08:00:00.000Z",
                                updated_at: "2024-01-19T11:20:00.000Z"
                            }
                        ],
                        count: 3
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Folder does not exist",
                input: {
                    folder_id: "nonexistent_folder"
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
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listExplores",
        provider: "looker",
        validCases: [
            {
                name: "all_explores",
                description: "Get all available explores across all models",
                input: {},
                expectedOutput: {
                    success: true,
                    data: {
                        explores: [
                            {
                                id: "ecommerce::orders",
                                name: "orders",
                                label: "Orders",
                                description:
                                    "E-commerce order data including products, customers, and transactions",
                                model_name: "ecommerce",
                                hidden: false
                            },
                            {
                                id: "ecommerce::customers",
                                name: "customers",
                                label: "Customers",
                                description: "Customer demographics and account information",
                                model_name: "ecommerce",
                                hidden: false
                            },
                            {
                                id: "ecommerce::products",
                                name: "products",
                                label: "Products",
                                description: "Product catalog with categories and inventory",
                                model_name: "ecommerce",
                                hidden: false
                            },
                            {
                                id: "marketing::campaigns",
                                name: "campaigns",
                                label: "Marketing Campaigns",
                                description: "Marketing campaign performance and attribution data",
                                model_name: "marketing",
                                hidden: false
                            },
                            {
                                id: "marketing::web_analytics",
                                name: "web_analytics",
                                label: "Web Analytics",
                                description: "Website traffic and user behavior metrics",
                                model_name: "marketing",
                                hidden: false
                            },
                            {
                                id: "finance::transactions",
                                name: "transactions",
                                label: "Financial Transactions",
                                description: "All financial transactions and accounting data",
                                model_name: "finance",
                                hidden: false
                            },
                            {
                                id: "hr::employees",
                                name: "employees",
                                label: "Employee Data",
                                description: "Employee records and HR metrics",
                                model_name: "hr",
                                hidden: true
                            }
                        ],
                        count: 7
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "no_models_access",
                description: "No access to any LookML models",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "No access to any LookML models",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listFolders",
        provider: "looker",
        validCases: [
            {
                name: "all_folders",
                description: "Get all folders in the Looker instance",
                input: {},
                expectedOutput: {
                    success: true,
                    data: {
                        folders: [
                            {
                                id: "1",
                                name: "Shared",
                                parent_id: null,
                                content_metadata_id: 1001,
                                created_at: "2022-01-01T00:00:00.000Z",
                                creator_id: "1"
                            },
                            {
                                id: "123",
                                name: "Executive Dashboards",
                                parent_id: "1",
                                content_metadata_id: 1002,
                                created_at: "2023-03-15T10:00:00.000Z",
                                creator_id: "45"
                            },
                            {
                                id: "124",
                                name: "Sales",
                                parent_id: "1",
                                content_metadata_id: 1003,
                                created_at: "2023-04-01T09:00:00.000Z",
                                creator_id: "78"
                            },
                            {
                                id: "125",
                                name: "Marketing",
                                parent_id: "1",
                                content_metadata_id: 1004,
                                created_at: "2023-04-15T11:00:00.000Z",
                                creator_id: "90"
                            },
                            {
                                id: "200",
                                name: "Revenue Reports",
                                parent_id: "124",
                                content_metadata_id: 1005,
                                created_at: "2023-06-01T08:00:00.000Z",
                                creator_id: "78"
                            },
                            {
                                id: "201",
                                name: "Customer Analytics",
                                parent_id: "1",
                                content_metadata_id: 1006,
                                created_at: "2023-07-01T09:30:00.000Z",
                                creator_id: "89"
                            }
                        ],
                        count: 6
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "parent_not_found",
                description: "Parent folder does not exist",
                input: {
                    parent_id: "nonexistent_folder_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent folder not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listLooks",
        provider: "looker",
        validCases: [
            {
                name: "all_looks",
                description: "Get all Looks in the Looker instance",
                input: {},
                expectedOutput: {
                    success: true,
                    data: {
                        looks: [
                            {
                                id: 12345,
                                title: "Monthly Revenue by Product Category",
                                description:
                                    "Breakdown of revenue across all product categories over time",
                                folder: {
                                    id: "200",
                                    name: "Revenue Reports"
                                },
                                user_id: "56",
                                query_id: 98765,
                                public: false,
                                created_at: "2023-03-10T11:00:00.000Z",
                                updated_at: "2024-01-15T09:30:00.000Z"
                            },
                            {
                                id: 67890,
                                title: "Customer Cohort Retention Analysis",
                                description: "Weekly cohort retention rates for the past 12 months",
                                folder: {
                                    id: "201",
                                    name: "Customer Analytics"
                                },
                                user_id: "89",
                                query_id: 54321,
                                public: true,
                                created_at: "2023-08-20T14:00:00.000Z",
                                updated_at: "2024-01-18T10:15:00.000Z"
                            },
                            {
                                id: 11111,
                                title: "Daily Active Users Trend",
                                description: "DAU metrics over the past 90 days",
                                folder: {
                                    id: "201",
                                    name: "Customer Analytics"
                                },
                                user_id: "89",
                                query_id: 33333,
                                public: false,
                                created_at: "2023-11-01T08:00:00.000Z",
                                updated_at: "2024-01-20T07:00:00.000Z"
                            }
                        ],
                        count: 3
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Folder does not exist",
                input: {
                    folder_id: "nonexistent_folder"
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
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "runExplore",
        provider: "looker",
        validCases: [
            {
                name: "basic_orders_query",
                description: "Run a simple query on the orders explore",
                input: {
                    model: "ecommerce",
                    explore: "orders",
                    fields: ["orders.created_date", "orders.total_revenue", "orders.order_count"],
                    filters: {
                        "orders.created_date": "last 7 days"
                    },
                    sorts: ["orders.created_date desc"],
                    limit: 10
                },
                expectedOutput: {
                    success: true,
                    data: {
                        data: [
                            {
                                "orders.created_date": "2024-01-20",
                                "orders.total_revenue": 45678.9,
                                "orders.order_count": 234
                            },
                            {
                                "orders.created_date": "2024-01-19",
                                "orders.total_revenue": 52341.23,
                                "orders.order_count": 287
                            },
                            {
                                "orders.created_date": "2024-01-18",
                                "orders.total_revenue": 38920.45,
                                "orders.order_count": 198
                            },
                            {
                                "orders.created_date": "2024-01-17",
                                "orders.total_revenue": 61234.67,
                                "orders.order_count": 312
                            },
                            {
                                "orders.created_date": "2024-01-16",
                                "orders.total_revenue": 43567.89,
                                "orders.order_count": 245
                            },
                            {
                                "orders.created_date": "2024-01-15",
                                "orders.total_revenue": 55890.12,
                                "orders.order_count": 276
                            },
                            {
                                "orders.created_date": "2024-01-14",
                                "orders.total_revenue": 32145.78,
                                "orders.order_count": 167
                            }
                        ],
                        fields: {
                            "orders.created_date": {
                                label: "Orders Created Date",
                                type: "date"
                            },
                            "orders.total_revenue": {
                                label: "Orders Total Revenue",
                                type: "number",
                                value_format: "$#,##0.00"
                            },
                            "orders.order_count": {
                                label: "Orders Order Count",
                                type: "number"
                            }
                        },
                        sql: "SELECT DATE(orders.created_at) AS `orders.created_date`, SUM(orders.total) AS `orders.total_revenue`, COUNT(DISTINCT orders.id) AS `orders.order_count` FROM orders WHERE orders.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) GROUP BY 1 ORDER BY 1 DESC LIMIT 10"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "model_not_found",
                description: "LookML model does not exist",
                input: {
                    model: "nonexistent_model",
                    explore: "orders",
                    fields: ["orders.id"],
                    limit: 10
                },
                expectedError: {
                    type: "not_found",
                    message: "Model 'nonexistent_model' not found",
                    retryable: false
                }
            },
            {
                name: "explore_not_found",
                description: "Explore does not exist in the model",
                input: {
                    model: "ecommerce",
                    explore: "nonexistent_explore",
                    fields: ["orders.id"],
                    limit: 10
                },
                expectedError: {
                    type: "not_found",
                    message: "Explore 'nonexistent_explore' not found in model 'ecommerce'",
                    retryable: false
                }
            },
            {
                name: "query_timeout",
                description: "Query execution timed out",
                input: {
                    model: "ecommerce",
                    explore: "orders",
                    fields: ["orders.id", "orders.total"],
                    limit: 5000
                },
                expectedError: {
                    type: "server_error",
                    message: "Query execution timed out",
                    retryable: true
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    model: "ecommerce",
                    explore: "orders",
                    fields: ["orders.id"],
                    limit: 10
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
        operationId: "runLook",
        provider: "looker",
        validCases: [
            {
                name: "run_revenue_look_json",
                description: "Execute a revenue Look and return JSON results",
                input: {
                    look_id: 12345,
                    result_format: "json",
                    limit: 100
                },
                expectedOutput: {
                    success: true,
                    data: {
                        format: "json",
                        result: [
                            {
                                "products.category": "Electronics",
                                "orders.total_revenue": 1250000.0,
                                "orders.order_count": 4500
                            },
                            {
                                "products.category": "Clothing",
                                "orders.total_revenue": 890000.0,
                                "orders.order_count": 12300
                            },
                            {
                                "products.category": "Home & Garden",
                                "orders.total_revenue": 675000.0,
                                "orders.order_count": 5600
                            },
                            {
                                "products.category": "Sports & Outdoors",
                                "orders.total_revenue": 450000.0,
                                "orders.order_count": 3200
                            },
                            {
                                "products.category": "Books",
                                "orders.total_revenue": 125000.0,
                                "orders.order_count": 8900
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "look_not_found",
                description: "Look does not exist",
                input: {
                    look_id: 99999999,
                    result_format: "json",
                    limit: 100
                },
                expectedError: {
                    type: "not_found",
                    message: "Look not found",
                    retryable: false
                }
            },
            {
                name: "query_execution_error",
                description: "Error executing the underlying query",
                input: {
                    look_id: 12345,
                    result_format: "json",
                    limit: 100
                },
                expectedError: {
                    type: "server_error",
                    message: "Query execution failed: database connection error",
                    retryable: true
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    look_id: 12345,
                    result_format: "json",
                    limit: 100
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
        operationId: "runQuery",
        provider: "looker",
        validCases: [
            {
                name: "run_saved_query_json",
                description: "Execute a saved query and return JSON results",
                input: {
                    query_id: 98765,
                    result_format: "json",
                    limit: 100
                },
                expectedOutput: {
                    success: true,
                    data: {
                        format: "json",
                        result: [
                            {
                                "orders.created_month": "2024-01",
                                "orders.total_revenue": 2850000.0,
                                "orders.order_count": 12500,
                                "orders.average_order_value": 228.0
                            },
                            {
                                "orders.created_month": "2023-12",
                                "orders.total_revenue": 3150000.0,
                                "orders.order_count": 14200,
                                "orders.average_order_value": 221.83
                            },
                            {
                                "orders.created_month": "2023-11",
                                "orders.total_revenue": 2680000.0,
                                "orders.order_count": 11800,
                                "orders.average_order_value": 227.12
                            },
                            {
                                "orders.created_month": "2023-10",
                                "orders.total_revenue": 2450000.0,
                                "orders.order_count": 10900,
                                "orders.average_order_value": 224.77
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "query_not_found",
                description: "Query ID does not exist",
                input: {
                    query_id: 99999999,
                    result_format: "json",
                    limit: 100
                },
                expectedError: {
                    type: "not_found",
                    message: "Query not found",
                    retryable: false
                }
            },
            {
                name: "invalid_format",
                description: "Invalid result format requested",
                input: {
                    query_id: 98765,
                    result_format: "json",
                    limit: 100
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid result format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query_id: 98765,
                    result_format: "json",
                    limit: 100
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
        operationId: "searchContent",
        provider: "looker",
        validCases: [
            {
                name: "search_revenue",
                description: "Search for content related to revenue",
                input: {
                    term: "revenue",
                    include_dashboards: true,
                    include_looks: true,
                    limit: 50
                },
                expectedOutput: {
                    success: true,
                    data: {
                        term: "revenue",
                        dashboards: [
                            {
                                id: "executive_overview",
                                title: "Executive Overview",
                                description:
                                    "High-level KPIs including revenue metrics for executive leadership",
                                folder: {
                                    id: "123",
                                    name: "Executive Dashboards"
                                }
                            },
                            {
                                id: "revenue_breakdown",
                                title: "Revenue Breakdown Dashboard",
                                description:
                                    "Detailed revenue analysis by product, region, and channel",
                                folder: {
                                    id: "200",
                                    name: "Revenue Reports"
                                }
                            }
                        ],
                        looks: [
                            {
                                id: 12345,
                                title: "Monthly Revenue by Product Category",
                                description:
                                    "Breakdown of revenue across all product categories over time",
                                folder: {
                                    id: "200",
                                    name: "Revenue Reports"
                                }
                            },
                            {
                                id: 12346,
                                title: "Revenue by Region",
                                description: "Geographic breakdown of revenue performance",
                                folder: {
                                    id: "200",
                                    name: "Revenue Reports"
                                }
                            },
                            {
                                id: 12347,
                                title: "Revenue Growth Trends",
                                description: "Year-over-year and month-over-month revenue growth",
                                folder: {
                                    id: "200",
                                    name: "Revenue Reports"
                                }
                            }
                        ],
                        dashboard_count: 2,
                        look_count: 3
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "empty_search_term",
                description: "Search term is empty",
                input: {
                    term: "",
                    include_dashboards: true,
                    include_looks: true,
                    limit: 50
                },
                expectedError: {
                    type: "validation",
                    message: "Search term cannot be empty",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    term: "revenue",
                    include_dashboards: true,
                    include_looks: true,
                    limit: 50
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
