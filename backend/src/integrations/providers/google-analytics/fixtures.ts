/**
 * Google Analytics Provider Test Fixtures
 *
 * Based on Google Analytics Data API v1beta response structures.
 * https://developers.google.com/analytics/devguides/reporting/data/v1/rest
 */

import type { TestFixture } from "../../sandbox";

// Sample property ID
const SAMPLE_PROPERTY_ID = "123456789";

export const googleAnalyticsFixtures: TestFixture[] = [
    // ========== PROPERTY OPERATIONS ==========
    {
        operationId: "listProperties",
        provider: "google-analytics",
        validCases: [
            {
                name: "list_all_properties",
                description: "List all accessible GA4 properties",
                input: {
                    pageSize: 50
                },
                expectedOutput: {
                    properties: [
                        {
                            name: "properties/123456789",
                            displayName: "My Website",
                            propertyType: "PROPERTY_TYPE_ORDINARY",
                            timeZone: "America/New_York",
                            currencyCode: "USD",
                            createTime: "2023-01-15T10:30:00Z",
                            updateTime: "2024-01-10T15:45:00Z",
                            industryCategory: "TECHNOLOGY"
                        },
                        {
                            name: "properties/987654321",
                            displayName: "Mobile App",
                            propertyType: "PROPERTY_TYPE_ORDINARY",
                            timeZone: "America/Los_Angeles",
                            currencyCode: "USD",
                            createTime: "2023-06-20T08:00:00Z",
                            updateTime: "2024-01-08T12:00:00Z",
                            industryCategory: "TECHNOLOGY"
                        }
                    ],
                    nextPageToken: null
                }
            },
            {
                name: "list_properties_paginated",
                description: "List properties with pagination",
                input: {
                    pageSize: 1,
                    pageToken: "token123"
                },
                expectedOutput: {
                    properties: [
                        {
                            name: "properties/555666777",
                            displayName: "E-commerce Store",
                            propertyType: "PROPERTY_TYPE_ORDINARY",
                            timeZone: "Europe/London",
                            currencyCode: "GBP"
                        }
                    ],
                    nextPageToken: "nextToken456"
                }
            }
        ],
        errorCases: [
            {
                name: "no_properties_access",
                description: "User has no access to any properties",
                input: {
                    pageSize: 50
                },
                expectedError: {
                    type: "permission",
                    message: "User does not have access to any Google Analytics properties",
                    retryable: false
                }
            }
        ]
    },

    // ========== REPORT OPERATIONS ==========
    {
        operationId: "runReport",
        provider: "google-analytics",
        validCases: [
            {
                name: "basic_traffic_report",
                description: "Run a basic traffic report with sessions and users",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    dateRanges: [{ startDate: "30daysAgo", endDate: "yesterday" }],
                    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
                    dimensions: [{ name: "date" }]
                },
                expectedOutput: {
                    dimensionHeaders: [{ name: "date" }],
                    metricHeaders: [
                        { name: "sessions", type: "TYPE_INTEGER" },
                        { name: "activeUsers", type: "TYPE_INTEGER" }
                    ],
                    rows: [
                        {
                            dimensionValues: [{ value: "20240101" }],
                            metricValues: [{ value: "1523" }, { value: "1245" }]
                        },
                        {
                            dimensionValues: [{ value: "20240102" }],
                            metricValues: [{ value: "1687" }, { value: "1398" }]
                        },
                        {
                            dimensionValues: [{ value: "20240103" }],
                            metricValues: [{ value: "1456" }, { value: "1189" }]
                        }
                    ],
                    totals: [
                        {
                            dimensionValues: [],
                            metricValues: [{ value: "4666" }, { value: "3832" }]
                        }
                    ],
                    rowCount: 30,
                    metadata: {
                        currencyCode: "USD",
                        timeZone: "America/New_York"
                    }
                }
            },
            {
                name: "geographic_report",
                description: "Run a geographic breakdown report",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                    metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
                    dimensions: [{ name: "country" }, { name: "city" }],
                    limit: 10
                },
                expectedOutput: {
                    dimensionHeaders: [{ name: "country" }, { name: "city" }],
                    metricHeaders: [
                        { name: "sessions", type: "TYPE_INTEGER" },
                        { name: "screenPageViews", type: "TYPE_INTEGER" }
                    ],
                    rows: [
                        {
                            dimensionValues: [{ value: "United States" }, { value: "New York" }],
                            metricValues: [{ value: "523" }, { value: "1876" }]
                        },
                        {
                            dimensionValues: [{ value: "United States" }, { value: "Los Angeles" }],
                            metricValues: [{ value: "412" }, { value: "1523" }]
                        },
                        {
                            dimensionValues: [{ value: "United Kingdom" }, { value: "London" }],
                            metricValues: [{ value: "287" }, { value: "945" }]
                        }
                    ],
                    rowCount: 10
                }
            },
            {
                name: "device_breakdown_report",
                description: "Run a device category breakdown",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    dateRanges: [{ startDate: "30daysAgo", endDate: "yesterday" }],
                    metrics: [{ name: "sessions" }, { name: "bounceRate" }],
                    dimensions: [{ name: "deviceCategory" }]
                },
                expectedOutput: {
                    dimensionHeaders: [{ name: "deviceCategory" }],
                    metricHeaders: [
                        { name: "sessions", type: "TYPE_INTEGER" },
                        { name: "bounceRate", type: "TYPE_FLOAT" }
                    ],
                    rows: [
                        {
                            dimensionValues: [{ value: "desktop" }],
                            metricValues: [{ value: "8523" }, { value: "0.42" }]
                        },
                        {
                            dimensionValues: [{ value: "mobile" }],
                            metricValues: [{ value: "12456" }, { value: "0.58" }]
                        },
                        {
                            dimensionValues: [{ value: "tablet" }],
                            metricValues: [{ value: "1234" }, { value: "0.51" }]
                        }
                    ],
                    rowCount: 3
                }
            }
        ],
        errorCases: [
            {
                name: "property_not_found",
                description: "Property does not exist",
                input: {
                    propertyId: "999999999",
                    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                    metrics: [{ name: "sessions" }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Property not found or you do not have access",
                    retryable: false
                }
            },
            {
                name: "invalid_metric",
                description: "Invalid metric name",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                    metrics: [{ name: "invalidMetric" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Field invalidMetric is not a valid metric",
                    retryable: false
                }
            },
            {
                name: "rate_limit_exceeded",
                description: "API rate limit exceeded",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
                    metrics: [{ name: "sessions" }]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Quota exceeded for Google Analytics API",
                    retryable: true
                }
            }
        ]
    },

    // ========== BATCH REPORT OPERATIONS ==========
    {
        operationId: "batchRunReports",
        provider: "google-analytics",
        validCases: [
            {
                name: "batch_multiple_reports",
                description: "Run multiple reports in a batch",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    requests: [
                        {
                            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                            metrics: [{ name: "sessions" }],
                            dimensions: [{ name: "country" }],
                            limit: 5
                        },
                        {
                            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                            metrics: [{ name: "activeUsers" }],
                            dimensions: [{ name: "deviceCategory" }]
                        }
                    ]
                },
                expectedOutput: {
                    reports: [
                        {
                            dimensionHeaders: [{ name: "country" }],
                            metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
                            rows: [
                                {
                                    dimensionValues: [{ value: "United States" }],
                                    metricValues: [{ value: "5234" }]
                                },
                                {
                                    dimensionValues: [{ value: "United Kingdom" }],
                                    metricValues: [{ value: "1234" }]
                                }
                            ],
                            rowCount: 5
                        },
                        {
                            dimensionHeaders: [{ name: "deviceCategory" }],
                            metricHeaders: [{ name: "activeUsers", type: "TYPE_INTEGER" }],
                            rows: [
                                {
                                    dimensionValues: [{ value: "desktop" }],
                                    metricValues: [{ value: "3456" }]
                                },
                                {
                                    dimensionValues: [{ value: "mobile" }],
                                    metricValues: [{ value: "4567" }]
                                }
                            ],
                            rowCount: 3
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "too_many_requests",
                description: "Too many requests in batch",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    requests: Array(6).fill({
                        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                        metrics: [{ name: "sessions" }]
                    })
                },
                expectedError: {
                    type: "validation",
                    message: "Batch request cannot contain more than 5 reports",
                    retryable: false
                }
            }
        ]
    },

    // ========== REALTIME REPORT OPERATIONS ==========
    {
        operationId: "runRealtimeReport",
        provider: "google-analytics",
        validCases: [
            {
                name: "realtime_active_users",
                description: "Get realtime active users",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    metrics: [{ name: "activeUsers" }]
                },
                expectedOutput: {
                    dimensionHeaders: [],
                    metricHeaders: [{ name: "activeUsers", type: "TYPE_INTEGER" }],
                    rows: [
                        {
                            dimensionValues: [],
                            metricValues: [{ value: "127" }]
                        }
                    ],
                    totals: [
                        {
                            dimensionValues: [],
                            metricValues: [{ value: "127" }]
                        }
                    ],
                    rowCount: 1
                }
            },
            {
                name: "realtime_by_page",
                description: "Get realtime users by page",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
                    dimensions: [{ name: "unifiedScreenName" }],
                    limit: 10
                },
                expectedOutput: {
                    dimensionHeaders: [{ name: "unifiedScreenName" }],
                    metricHeaders: [
                        { name: "activeUsers", type: "TYPE_INTEGER" },
                        { name: "screenPageViews", type: "TYPE_INTEGER" }
                    ],
                    rows: [
                        {
                            dimensionValues: [{ value: "/home" }],
                            metricValues: [{ value: "45" }, { value: "67" }]
                        },
                        {
                            dimensionValues: [{ value: "/products" }],
                            metricValues: [{ value: "32" }, { value: "48" }]
                        },
                        {
                            dimensionValues: [{ value: "/checkout" }],
                            metricValues: [{ value: "18" }, { value: "23" }]
                        }
                    ],
                    rowCount: 10
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_realtime_dimension",
                description: "Invalid dimension for realtime report",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID,
                    metrics: [{ name: "activeUsers" }],
                    dimensions: [{ name: "date" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Field date is not a valid realtime dimension",
                    retryable: false
                }
            }
        ]
    },

    // ========== METADATA OPERATIONS ==========
    {
        operationId: "getMetadata",
        provider: "google-analytics",
        validCases: [
            {
                name: "get_property_metadata",
                description: "Get available dimensions and metrics for property",
                input: {
                    propertyId: SAMPLE_PROPERTY_ID
                },
                expectedOutput: {
                    name: `properties/${SAMPLE_PROPERTY_ID}/metadata`,
                    dimensions: [
                        {
                            apiName: "date",
                            uiName: "Date",
                            description: "The date of the event",
                            category: "Time"
                        },
                        {
                            apiName: "city",
                            uiName: "City",
                            description: "The city from which the user activity originated",
                            category: "Geography"
                        },
                        {
                            apiName: "country",
                            uiName: "Country",
                            description: "The country from which the user activity originated",
                            category: "Geography"
                        },
                        {
                            apiName: "deviceCategory",
                            uiName: "Device category",
                            description: "The device category: desktop, mobile, or tablet",
                            category: "Platform / Device"
                        },
                        {
                            apiName: "pagePath",
                            uiName: "Page path",
                            description: "The page path of a page view",
                            category: "Page / Screen"
                        }
                    ],
                    metrics: [
                        {
                            apiName: "sessions",
                            uiName: "Sessions",
                            description: "The number of sessions that began on your site or app",
                            category: "Session",
                            type: "TYPE_INTEGER"
                        },
                        {
                            apiName: "activeUsers",
                            uiName: "Active users",
                            description:
                                "The number of distinct users who visited your site or app",
                            category: "User",
                            type: "TYPE_INTEGER"
                        },
                        {
                            apiName: "screenPageViews",
                            uiName: "Views",
                            description: "The number of app screens or web pages viewed",
                            category: "Page / Screen",
                            type: "TYPE_INTEGER"
                        },
                        {
                            apiName: "bounceRate",
                            uiName: "Bounce rate",
                            description: "The percentage of sessions that were bounced",
                            category: "Session",
                            type: "TYPE_FLOAT"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "property_not_found",
                description: "Property does not exist",
                input: {
                    propertyId: "999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Property not found or you do not have access",
                    retryable: false
                }
            }
        ]
    }
];
