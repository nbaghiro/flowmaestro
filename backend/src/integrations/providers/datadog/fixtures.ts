/**
 * Datadog Provider Test Fixtures
 *
 * Comprehensive test fixtures for Datadog monitoring/observability operations
 * including events, monitors, metrics, and incidents.
 */

import type { TestFixture } from "../../sandbox";

// Current timestamps for realistic test data
const now = Math.floor(Date.now() / 1000);
const oneHourAgo = now - 3600;

export const datadogFixtures: TestFixture[] = [
    // ==================== CREATE EVENT ====================
    {
        operationId: "createEvent",
        provider: "datadog",
        validCases: [
            {
                name: "deployment_event",
                description: "Post a deployment event to the Datadog event stream",
                input: {
                    title: "Production Deployment - api-server v2.3.1",
                    text: "Deployed api-server version 2.3.1 to production cluster.\n\n**Changes:**\n- Fixed authentication token refresh bug\n- Improved query performance by 15%\n- Added new /health endpoint",
                    tags: ["env:production", "service:api-server", "team:platform"],
                    alertType: "success",
                    priority: "normal",
                    host: "prod-api-server-01"
                },
                expectedOutput: {
                    id: 7834521098,
                    title: "Production Deployment - api-server v2.3.1",
                    status: "ok"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_alert_type",
                description: "Invalid alert type provided",
                input: {
                    title: "Test Event",
                    text: "Test event body",
                    alertType: "critical"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid alert type. Must be one of: info, warning, error, success",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for events API",
                input: {
                    title: "High volume test event",
                    text: "This event triggered rate limiting"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== CREATE INCIDENT ====================
    {
        operationId: "createIncident",
        provider: "datadog",
        validCases: [
            {
                name: "critical_incident",
                description: "Create a critical incident for service outage",
                input: {
                    title: "Payment Processing Service Outage",
                    customerImpactScope:
                        "All payment transactions failing. Approximately 5,000 customers affected. Revenue impact estimated at $50,000/hour.",
                    fields: {
                        severity: "SEV1",
                        detection_method: "monitor",
                        services: ["payment-gateway", "stripe-integration", "order-service"],
                        commander: "jane.doe@company.com"
                    }
                },
                expectedOutput: {
                    id: "incident-abc123def456",
                    title: "Payment Processing Service Outage",
                    customerImpactScope:
                        "All payment transactions failing. Approximately 5,000 customers affected. Revenue impact estimated at $50,000/hour.",
                    state: "active",
                    created: "2024-01-15T10:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "empty_title",
                description: "Incident title cannot be empty",
                input: {
                    title: "",
                    customerImpactScope: "Some impact description"
                },
                expectedError: {
                    type: "validation",
                    message: "Incident title is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for incidents API",
                input: {
                    title: "Test incident for rate limiting"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== CREATE MONITOR ====================
    {
        operationId: "createMonitor",
        provider: "datadog",
        validCases: [
            {
                name: "cpu_metric_alert",
                description: "Create a CPU usage metric alert monitor",
                input: {
                    name: "High CPU Usage Alert - Production Web Servers",
                    type: "metric alert",
                    query: "avg(last_5m):avg:system.cpu.user{env:production,service:web-server} > 80",
                    message:
                        "CPU usage has exceeded 80% for the past 5 minutes on {{host.name}}.\n\nCurrent value: {{value}}%\n\n@slack-infra-alerts @pagerduty-infrastructure",
                    tags: [
                        "env:production",
                        "service:web-server",
                        "team:infrastructure",
                        "severity:high"
                    ],
                    priority: 2
                },
                expectedOutput: {
                    id: 12345678,
                    name: "High CPU Usage Alert - Production Web Servers",
                    type: "metric alert",
                    query: "avg(last_5m):avg:system.cpu.user{env:production,service:web-server} > 80",
                    message:
                        "CPU usage has exceeded 80% for the past 5 minutes on {{host.name}}.\n\nCurrent value: {{value}}%\n\n@slack-infra-alerts @pagerduty-infrastructure",
                    tags: [
                        "env:production",
                        "service:web-server",
                        "team:infrastructure",
                        "severity:high"
                    ],
                    priority: 2,
                    overallState: "OK",
                    createdAt: "2024-01-15T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Monitor query syntax is invalid",
                input: {
                    name: "Invalid Monitor",
                    type: "metric alert",
                    query: "invalid query syntax here",
                    message: "This should fail"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid monitor query syntax",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for monitors API",
                input: {
                    name: "Rate Limited Monitor",
                    type: "metric alert",
                    query: "avg(last_5m):avg:system.cpu.user{*} > 80",
                    message: "Test monitor"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== GET MONITOR ====================
    {
        operationId: "getMonitor",
        provider: "datadog",
        validCases: [
            {
                name: "get_active_monitor",
                description: "Get details of an active alerting monitor",
                input: {
                    monitorId: 12345678
                },
                expectedOutput: {
                    id: 12345678,
                    name: "High CPU Usage Alert - Production Web Servers",
                    type: "metric alert",
                    query: "avg(last_5m):avg:system.cpu.user{env:production,service:web-server} > 80",
                    message:
                        "CPU usage has exceeded 80% for the past 5 minutes on {{host.name}}.\n\nCurrent value: {{value}}%\n\n@slack-infra-alerts @pagerduty-infrastructure",
                    tags: [
                        "env:production",
                        "service:web-server",
                        "team:infrastructure",
                        "severity:high"
                    ],
                    priority: 2,
                    overallState: "Alert",
                    options: {
                        thresholds: {
                            critical: 80,
                            warning: 70
                        },
                        notify_no_data: false,
                        renotify_interval: 60,
                        escalation_message: "CPU still elevated. Escalating to senior on-call."
                    },
                    createdAt: "2024-01-10T10:00:00Z",
                    modifiedAt: "2024-01-14T15:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Monitor with specified ID does not exist",
                input: {
                    monitorId: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Monitor not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    monitorId: 12345678
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST EVENTS ====================
    {
        operationId: "listEvents",
        provider: "datadog",
        validCases: [
            {
                name: "list_recent_events",
                description: "List events from the last hour",
                input: {
                    start: oneHourAgo,
                    end: now
                },
                expectedOutput: {
                    events: [
                        {
                            id: 7834521098,
                            title: "Production Deployment - api-server v2.3.1",
                            text: "Deployed api-server version 2.3.1 to production cluster.",
                            dateHappened: now - 1800,
                            priority: "normal",
                            host: "prod-api-server-01",
                            tags: ["env:production", "service:api-server", "team:platform"],
                            alertType: "success"
                        },
                        {
                            id: 7834521097,
                            title: "Auto-scaling triggered for web-servers",
                            text: "Scaled from 5 to 8 instances due to increased traffic.",
                            dateHappened: now - 2400,
                            priority: "normal",
                            host: "autoscaler",
                            tags: ["env:production", "service:web-server", "autoscaling"],
                            alertType: "info"
                        },
                        {
                            id: 7834521096,
                            title: "Cache flush completed",
                            text: "Redis cache flush completed for user-session namespace.",
                            dateHappened: now - 3000,
                            priority: "low",
                            host: "redis-cluster-01",
                            tags: ["env:production", "service:redis"],
                            alertType: "info"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_time_range",
                description: "End time is before start time",
                input: {
                    start: now,
                    end: oneHourAgo
                },
                expectedError: {
                    type: "validation",
                    message: "End time must be after start time",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for events API",
                input: {
                    start: oneHourAgo,
                    end: now
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST INCIDENTS ====================
    {
        operationId: "listIncidents",
        provider: "datadog",
        validCases: [
            {
                name: "list_active_incidents",
                description: "List all active incidents",
                input: {
                    pageSize: 25
                },
                expectedOutput: {
                    incidents: [
                        {
                            id: "incident-abc123def456",
                            title: "Payment Processing Service Outage",
                            customerImpactScope:
                                "All payment transactions failing. Approximately 5,000 customers affected.",
                            customerImpacted: true,
                            severity: "SEV1",
                            state: "active",
                            detected: "2024-01-15T10:25:00Z",
                            created: "2024-01-15T10:30:00Z",
                            modified: "2024-01-15T11:45:00Z"
                        },
                        {
                            id: "incident-xyz789ghi012",
                            title: "API Response Time Degradation - p99 > 5s",
                            customerImpactScope: "Users experiencing slow page loads.",
                            customerImpacted: true,
                            severity: "SEV2",
                            state: "stable",
                            detected: "2024-01-15T14:20:00Z",
                            created: "2024-01-15T14:22:00Z",
                            modified: "2024-01-15T15:30:00Z"
                        },
                        {
                            id: "incident-sec456mno789",
                            title: "Elevated Failed Authentication Attempts Detected",
                            customerImpactScope: "No direct customer impact.",
                            customerImpacted: false,
                            severity: "SEV3",
                            state: "active",
                            detected: "2024-01-15T16:40:00Z",
                            created: "2024-01-15T16:45:00Z",
                            modified: "2024-01-15T17:00:00Z"
                        }
                    ],
                    count: 3,
                    pagination: {
                        offset: 0,
                        size: 25,
                        total: 3
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum",
                input: {
                    pageSize: 200
                },
                expectedError: {
                    type: "validation",
                    message: "Page size must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for incidents API",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LIST MONITORS ====================
    {
        operationId: "listMonitors",
        provider: "datadog",
        validCases: [
            {
                name: "list_all_monitors",
                description: "List all monitors for the organization",
                input: {},
                expectedOutput: {
                    monitors: [
                        {
                            id: 12345678,
                            name: "High CPU Usage Alert - Production Web Servers",
                            type: "metric alert",
                            query: "avg(last_5m):avg:system.cpu.user{env:production,service:web-server} > 80",
                            message: "CPU usage has exceeded 80%",
                            tags: ["env:production", "service:web-server", "team:infrastructure"],
                            priority: 2,
                            overallState: "Alert",
                            createdAt: "2024-01-10T10:00:00Z",
                            modifiedAt: "2024-01-14T15:30:00Z"
                        },
                        {
                            id: 12345679,
                            name: "API Error Rate > 1%",
                            type: "metric alert",
                            query: "avg(last_10m):sum:trace.http.request.errors{env:production,service:api-gateway}.as_rate() / sum:trace.http.request.hits{env:production,service:api-gateway}.as_rate() * 100 > 1",
                            message: "Error rate for api-gateway has exceeded 1%",
                            tags: ["env:production", "service:api-gateway", "team:platform"],
                            priority: 1,
                            overallState: "OK",
                            createdAt: "2024-01-05T09:00:00Z",
                            modifiedAt: "2024-01-12T11:20:00Z"
                        },
                        {
                            id: 12345680,
                            name: "PostgreSQL Primary Health Check",
                            type: "service check",
                            query: '"postgres.can_connect".over("env:production","role:primary").by("host").last(3).count_by_status()',
                            message: "PostgreSQL primary database health check is failing",
                            tags: ["env:production", "service:postgresql", "role:primary"],
                            priority: 1,
                            overallState: "OK",
                            createdAt: "2023-12-01T08:00:00Z",
                            modifiedAt: "2024-01-15T10:00:00Z"
                        },
                        {
                            id: 12345681,
                            name: "Disk Space Warning - /var/log",
                            type: "metric alert",
                            query: "avg(last_15m):avg:system.disk.in_use{mount:/var/log,env:production} * 100 > 85",
                            message: "Disk space on /var/log is running low",
                            tags: ["env:production", "resource:disk"],
                            priority: 3,
                            overallState: "Warn",
                            createdAt: "2023-11-15T14:00:00Z",
                            modifiedAt: "2024-01-10T09:00:00Z"
                        }
                    ],
                    count: 4
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded for monitors API",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid API key",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API credentials",
                    retryable: false
                }
            }
        ]
    },

    // ==================== MUTE MONITOR ====================
    {
        operationId: "muteMonitor",
        provider: "datadog",
        validCases: [
            {
                name: "mute_indefinitely",
                description: "Mute a monitor indefinitely",
                input: {
                    monitorId: 12345678
                },
                expectedOutput: {
                    id: 12345678,
                    name: "High CPU Usage Alert - Production Web Servers",
                    muted: true,
                    overallState: "Alert"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Monitor with specified ID does not exist",
                input: {
                    monitorId: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Monitor not found",
                    retryable: false
                }
            },
            {
                name: "invalid_scope",
                description: "Invalid scope format provided",
                input: {
                    monitorId: 12345678,
                    scope: "invalid scope format"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid scope format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    monitorId: 12345678
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== QUERY METRICS ====================
    {
        operationId: "queryMetrics",
        provider: "datadog",
        validCases: [
            {
                name: "query_cpu_metrics",
                description: "Query average CPU usage metrics",
                input: {
                    query: "avg:system.cpu.user{env:production,service:web-server}",
                    from: oneHourAgo,
                    to: now
                },
                expectedOutput: {
                    query: "avg:system.cpu.user{env:production,service:web-server}",
                    fromDate: oneHourAgo * 1000,
                    toDate: now * 1000,
                    series: [
                        {
                            metric: "system.cpu.user",
                            displayName: "system.cpu.user",
                            points: [
                                { timestamp: (oneHourAgo + 300) * 1000, value: 45.2 },
                                { timestamp: (oneHourAgo + 600) * 1000, value: 48.7 },
                                { timestamp: (oneHourAgo + 900) * 1000, value: 52.1 },
                                { timestamp: (oneHourAgo + 1200) * 1000, value: 67.3 },
                                { timestamp: (oneHourAgo + 1500) * 1000, value: 78.9 },
                                { timestamp: (oneHourAgo + 1800) * 1000, value: 82.4 },
                                { timestamp: (oneHourAgo + 2100) * 1000, value: 75.6 },
                                { timestamp: (oneHourAgo + 2400) * 1000, value: 68.2 },
                                { timestamp: (oneHourAgo + 2700) * 1000, value: 55.8 },
                                { timestamp: (oneHourAgo + 3000) * 1000, value: 49.3 },
                                { timestamp: (oneHourAgo + 3300) * 1000, value: 46.1 },
                                { timestamp: (oneHourAgo + 3600) * 1000, value: 44.5 }
                            ],
                            unit: "%",
                            scope: "env:production,service:web-server",
                            expression: "avg:system.cpu.user{env:production,service:web-server}"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query_syntax",
                description: "Query has invalid syntax",
                input: {
                    query: "invalid query syntax",
                    from: oneHourAgo,
                    to: now
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid query syntax",
                    retryable: false
                }
            },
            {
                name: "time_range_too_large",
                description: "Requested time range exceeds limit",
                input: {
                    query: "avg:system.cpu.user{*}",
                    from: now - 31536000,
                    to: now
                },
                expectedError: {
                    type: "validation",
                    message: "Time range exceeds maximum allowed (31 days for detailed metrics)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for metrics API",
                input: {
                    query: "avg:system.cpu.user{*}",
                    from: oneHourAgo,
                    to: now
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== SUBMIT METRICS ====================
    {
        operationId: "submitMetrics",
        provider: "datadog",
        validCases: [
            {
                name: "submit_single_gauge",
                description: "Submit a single gauge metric",
                input: {
                    series: [
                        {
                            metric: "custom.app.active_users",
                            points: [[now, 1247]],
                            tags: ["env:production", "service:web-app"],
                            type: "gauge"
                        }
                    ]
                },
                expectedOutput: {
                    status: "ok",
                    seriesCount: 1,
                    totalPoints: 1
                }
            }
        ],
        errorCases: [
            {
                name: "empty_series",
                description: "Empty series array provided",
                input: {
                    series: []
                },
                expectedError: {
                    type: "validation",
                    message: "At least one metric series is required",
                    retryable: false
                }
            },
            {
                name: "invalid_metric_name",
                description: "Metric name contains invalid characters",
                input: {
                    series: [
                        {
                            metric: "invalid metric name!",
                            points: [[now, 100]],
                            type: "gauge"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid metric name format",
                    retryable: false
                }
            },
            {
                name: "timestamp_too_old",
                description: "Metric timestamp is too far in the past",
                input: {
                    series: [
                        {
                            metric: "custom.test.metric",
                            points: [[now - 7200000, 100]],
                            type: "gauge"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Metric timestamp is too old (max 4 hours in the past)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for metrics submission",
                input: {
                    series: [
                        {
                            metric: "custom.test.metric",
                            points: [[now, 100]],
                            type: "gauge"
                        }
                    ]
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
