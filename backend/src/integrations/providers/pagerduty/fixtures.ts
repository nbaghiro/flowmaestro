/**
 * PagerDuty Provider Test Fixtures
 *
 * Based on PagerDuty API documentation:
 * - Incidents: https://developer.pagerduty.com/api-reference/b3A6Mjc0NDAwNA-list-incidents
 * - Services: https://developer.pagerduty.com/api-reference/b3A6Mjc0NDEyMQ-list-services
 * - Users: https://developer.pagerduty.com/api-reference/b3A6Mjc0NDE0Mw-list-users
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample incidents for filterable data
 */
const sampleIncidents = [
    {
        id: "P1234567",
        incident_number: 1234,
        title: "High CPU usage on production server",
        status: "triggered",
        urgency: "high",
        created_at: "2024-12-19T10:00:00Z",
        service: { id: "PSERVICE1", summary: "Production API" },
        html_url: "https://acme.pagerduty.com/incidents/P1234567",
        _priority: "P1"
    },
    {
        id: "P1234568",
        incident_number: 1235,
        title: "Database connection pool exhausted",
        status: "acknowledged",
        urgency: "high",
        created_at: "2024-12-19T09:30:00Z",
        service: { id: "PSERVICE2", summary: "Database Cluster" },
        html_url: "https://acme.pagerduty.com/incidents/P1234568",
        _priority: "P1"
    },
    {
        id: "P1234569",
        incident_number: 1236,
        title: "Elevated error rate in checkout flow",
        status: "triggered",
        urgency: "low",
        created_at: "2024-12-19T08:00:00Z",
        service: { id: "PSERVICE3", summary: "Checkout Service" },
        html_url: "https://acme.pagerduty.com/incidents/P1234569",
        _priority: "P2"
    },
    {
        id: "P1234570",
        incident_number: 1237,
        title: "SSL certificate expiring in 7 days",
        status: "resolved",
        urgency: "low",
        created_at: "2024-12-18T14:00:00Z",
        service: { id: "PSERVICE1", summary: "Production API" },
        html_url: "https://acme.pagerduty.com/incidents/P1234570",
        _priority: "P3"
    }
];

/**
 * Sample services for filterable data
 */
const sampleServices = [
    {
        id: "PSERVICE1",
        name: "Production API",
        description: "Core production API service",
        status: "active",
        auto_resolve_timeout: 14400,
        escalation_policy: { id: "PESCPOL1", summary: "Engineering On-Call" },
        html_url: "https://acme.pagerduty.com/services/PSERVICE1",
        _team: "engineering"
    },
    {
        id: "PSERVICE2",
        name: "Database Cluster",
        description: "Primary database cluster monitoring",
        status: "active",
        auto_resolve_timeout: 3600,
        escalation_policy: { id: "PESCPOL2", summary: "Database Team" },
        html_url: "https://acme.pagerduty.com/services/PSERVICE2",
        _team: "database"
    },
    {
        id: "PSERVICE3",
        name: "Checkout Service",
        description: "E-commerce checkout flow",
        status: "active",
        auto_resolve_timeout: 7200,
        escalation_policy: { id: "PESCPOL1", summary: "Engineering On-Call" },
        html_url: "https://acme.pagerduty.com/services/PSERVICE3",
        _team: "engineering"
    }
];

export const pagerdutyFixtures: TestFixture[] = [
    {
        operationId: "createIncident",
        provider: "pagerduty",
        validCases: [
            {
                name: "create_high_urgency_incident",
                description: "Create a high urgency incident",
                input: {
                    title: "Production server unresponsive",
                    serviceId: "PSERVICE1",
                    from: "admin@example.com",
                    urgency: "high",
                    details:
                        "Server cpu-01 is not responding to health checks. Last ping failed at 10:05 UTC."
                },
                expectedOutput: {
                    incident: {
                        id: "P1234571",
                        incident_number: 1238,
                        title: "Production server unresponsive",
                        status: "triggered",
                        urgency: "high",
                        service: { id: "PSERVICE1", summary: "Production API" },
                        html_url: "https://acme.pagerduty.com/incidents/P1234571"
                    },
                    incidentId: "P1234571",
                    incidentNumber: 1238,
                    htmlUrl: "https://acme.pagerduty.com/incidents/P1234571"
                }
            },
            {
                name: "create_low_urgency_incident",
                description: "Create a low urgency incident",
                input: {
                    title: "Disk space warning on backup server",
                    serviceId: "PSERVICE2",
                    from: "monitoring@example.com",
                    urgency: "low",
                    details: "Backup server disk usage at 85%"
                },
                expectedOutput: {
                    incident: {
                        id: "P1234572",
                        incident_number: 1239,
                        title: "Disk space warning on backup server",
                        status: "triggered",
                        urgency: "low",
                        service: { id: "PSERVICE2", summary: "Database Cluster" },
                        html_url: "https://acme.pagerduty.com/incidents/P1234572"
                    },
                    incidentId: "P1234572",
                    incidentNumber: 1239,
                    htmlUrl: "https://acme.pagerduty.com/incidents/P1234572"
                }
            },
            {
                name: "create_incident_with_assignees",
                description: "Create an incident with specific assignees",
                input: {
                    title: "Critical security vulnerability detected",
                    serviceId: "PSERVICE1",
                    from: "security@example.com",
                    urgency: "high",
                    details: "CVE-2024-1234 detected in production. Immediate patching required.",
                    assigneeIds: ["PUSER001", "PUSER002"],
                    incidentKey: "sec-vuln-2024-1234"
                },
                expectedOutput: {
                    incident: {
                        id: "P1234573",
                        incident_number: 1240,
                        title: "Critical security vulnerability detected",
                        status: "triggered",
                        urgency: "high",
                        service: { id: "PSERVICE1", summary: "Production API" },
                        html_url: "https://acme.pagerduty.com/incidents/P1234573"
                    },
                    incidentId: "P1234573",
                    incidentNumber: 1240,
                    htmlUrl: "https://acme.pagerduty.com/incidents/P1234573"
                }
            }
        ],
        errorCases: [
            {
                name: "service_not_found",
                description: "Service does not exist",
                input: {
                    title: "Test incident",
                    serviceId: "PSERVICE_INVALID",
                    from: "admin@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Service PSERVICE_INVALID not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    title: "Test incident",
                    serviceId: "PSERVICE1",
                    from: "admin@example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getIncident",
        provider: "pagerduty",
        validCases: [
            {
                name: "get_triggered_incident",
                description: "Get a triggered incident",
                input: {
                    incidentId: "P1234567"
                },
                expectedOutput: {
                    incident: {
                        id: "P1234567",
                        incident_number: 1234,
                        title: "High CPU usage on production server",
                        status: "triggered",
                        urgency: "high",
                        created_at: "2024-12-19T10:00:00Z",
                        last_status_change_at: "2024-12-19T10:00:00Z",
                        service: {
                            id: "PSERVICE1",
                            type: "service_reference",
                            summary: "Production API",
                            html_url: "https://acme.pagerduty.com/services/PSERVICE1"
                        },
                        escalation_policy: {
                            id: "PESCPOL1",
                            type: "escalation_policy_reference",
                            summary: "Engineering On-Call"
                        },
                        assignments: [
                            {
                                at: "2024-12-19T10:00:00Z",
                                assignee: {
                                    id: "PUSER001",
                                    type: "user_reference",
                                    summary: "John Smith"
                                }
                            }
                        ],
                        acknowledgements: [],
                        html_url: "https://acme.pagerduty.com/incidents/P1234567"
                    }
                }
            },
            {
                name: "get_acknowledged_incident",
                description: "Get an acknowledged incident",
                input: {
                    incidentId: "P1234568"
                },
                expectedOutput: {
                    incident: {
                        id: "P1234568",
                        incident_number: 1235,
                        title: "Database connection pool exhausted",
                        status: "acknowledged",
                        urgency: "high",
                        created_at: "2024-12-19T09:30:00Z",
                        last_status_change_at: "2024-12-19T09:35:00Z",
                        service: {
                            id: "PSERVICE2",
                            type: "service_reference",
                            summary: "Database Cluster",
                            html_url: "https://acme.pagerduty.com/services/PSERVICE2"
                        },
                        escalation_policy: {
                            id: "PESCPOL2",
                            type: "escalation_policy_reference",
                            summary: "Database Team"
                        },
                        acknowledgements: [
                            {
                                at: "2024-12-19T09:35:00Z",
                                acknowledger: {
                                    id: "PUSER002",
                                    type: "user_reference",
                                    summary: "Jane Doe"
                                }
                            }
                        ],
                        html_url: "https://acme.pagerduty.com/incidents/P1234568"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "incident_not_found",
                description: "Incident does not exist",
                input: {
                    incidentId: "PNONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "Incident PNONEXISTENT not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    incidentId: "P1234567"
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
        operationId: "getService",
        provider: "pagerduty",
        validCases: [
            {
                name: "get_service_basic",
                description: "Get a service with basic details",
                input: {
                    serviceId: "PSERVICE1"
                },
                expectedOutput: {
                    service: {
                        id: "PSERVICE1",
                        name: "Production API",
                        description: "Core production API service",
                        status: "active",
                        auto_resolve_timeout: 14400,
                        acknowledgement_timeout: 1800,
                        created_at: "2023-01-15T10:00:00Z",
                        escalation_policy: {
                            id: "PESCPOL1",
                            type: "escalation_policy_reference",
                            summary: "Engineering On-Call"
                        },
                        html_url: "https://acme.pagerduty.com/services/PSERVICE1"
                    }
                }
            },
            {
                name: "get_service_with_integrations",
                description: "Get a service with integrations included",
                input: {
                    serviceId: "PSERVICE2",
                    include: ["integrations"]
                },
                expectedOutput: {
                    service: {
                        id: "PSERVICE2",
                        name: "Database Cluster",
                        description: "Primary database cluster monitoring",
                        status: "active",
                        auto_resolve_timeout: 3600,
                        acknowledgement_timeout: 1800,
                        created_at: "2023-02-20T14:00:00Z",
                        escalation_policy: {
                            id: "PESCPOL2",
                            type: "escalation_policy_reference",
                            summary: "Database Team"
                        },
                        integrations: [
                            {
                                id: "PINT001",
                                type: "generic_events_api_inbound_integration",
                                summary: "Events API",
                                integration_key: "abc123def456"
                            }
                        ],
                        html_url: "https://acme.pagerduty.com/services/PSERVICE2"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "service_not_found",
                description: "Service does not exist",
                input: {
                    serviceId: "PSERVICE_INVALID"
                },
                expectedError: {
                    type: "not_found",
                    message: "Service PSERVICE_INVALID not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    serviceId: "PSERVICE1"
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
        operationId: "listEscalationPolicies",
        provider: "pagerduty",
        validCases: [
            {
                name: "list_all_escalation_policies",
                description: "List all escalation policies",
                input: {
                    limit: 25
                },
                expectedOutput: {
                    escalationPolicies: [
                        {
                            id: "PESCPOL1",
                            name: "Engineering On-Call",
                            description: "Primary engineering escalation",
                            num_loops: 2,
                            escalation_rules: [
                                {
                                    id: "PRULE001",
                                    escalation_delay_in_minutes: 30,
                                    targets: [
                                        {
                                            id: "PUSER001",
                                            type: "user_reference",
                                            summary: "John Smith"
                                        }
                                    ]
                                }
                            ],
                            html_url: "https://acme.pagerduty.com/escalation_policies/PESCPOL1"
                        },
                        {
                            id: "PESCPOL2",
                            name: "Database Team",
                            description: "Database team escalation",
                            num_loops: 3,
                            escalation_rules: [
                                {
                                    id: "PRULE002",
                                    escalation_delay_in_minutes: 15,
                                    targets: [
                                        {
                                            id: "PUSER002",
                                            type: "user_reference",
                                            summary: "Jane Doe"
                                        }
                                    ]
                                }
                            ],
                            html_url: "https://acme.pagerduty.com/escalation_policies/PESCPOL2"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 25,
                        more: false,
                        total: 2
                    }
                }
            },
            {
                name: "search_escalation_policies",
                description: "Search escalation policies by name",
                input: {
                    query: "Engineering",
                    limit: 10
                },
                expectedOutput: {
                    escalationPolicies: [
                        {
                            id: "PESCPOL1",
                            name: "Engineering On-Call",
                            description: "Primary engineering escalation",
                            num_loops: 2,
                            html_url: "https://acme.pagerduty.com/escalation_policies/PESCPOL1"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 10,
                        more: false,
                        total: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_user_filter",
                description: "Invalid user ID in filter",
                input: {
                    userIds: ["INVALID_USER"],
                    limit: 25
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid user ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
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
        operationId: "listIncidents",
        provider: "pagerduty",
        filterableData: {
            records: sampleIncidents,
            recordsField: "incidents",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            offsetField: "offset",
            filterConfig: {
                type: "generic",
                filterableFields: ["status", "urgency", "_priority"]
            }
        },
        validCases: [
            {
                name: "list_all_incidents",
                description: "List all incidents",
                input: {
                    limit: 25
                }
            },
            {
                name: "list_triggered_incidents",
                description: "List only triggered incidents",
                input: {
                    statuses: ["triggered"],
                    limit: 25
                }
            },
            {
                name: "list_high_urgency_incidents",
                description: "List high urgency incidents",
                input: {
                    urgencies: ["high"],
                    limit: 25
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_range",
                description: "Invalid date range",
                input: {
                    since: "invalid-date",
                    limit: 25
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format for 'since' parameter",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
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
        operationId: "listOnCalls",
        provider: "pagerduty",
        validCases: [
            {
                name: "list_current_oncalls",
                description: "List current on-call users",
                input: {
                    earliest: true,
                    limit: 25
                },
                expectedOutput: {
                    onCalls: [
                        {
                            escalation_policy: {
                                id: "PESCPOL1",
                                type: "escalation_policy_reference",
                                summary: "Engineering On-Call"
                            },
                            escalation_level: 1,
                            schedule: null,
                            user: {
                                id: "PUSER001",
                                type: "user_reference",
                                summary: "John Smith",
                                html_url: "https://acme.pagerduty.com/users/PUSER001"
                            },
                            start: "2024-12-19T00:00:00Z",
                            end: "2024-12-20T00:00:00Z"
                        },
                        {
                            escalation_policy: {
                                id: "PESCPOL2",
                                type: "escalation_policy_reference",
                                summary: "Database Team"
                            },
                            escalation_level: 1,
                            schedule: {
                                id: "PSCHED001",
                                type: "schedule_reference",
                                summary: "Database Primary"
                            },
                            user: {
                                id: "PUSER002",
                                type: "user_reference",
                                summary: "Jane Doe",
                                html_url: "https://acme.pagerduty.com/users/PUSER002"
                            },
                            start: "2024-12-19T08:00:00Z",
                            end: "2024-12-19T20:00:00Z"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 25,
                        more: false,
                        total: 2
                    }
                }
            },
            {
                name: "list_oncalls_by_policy",
                description: "List on-calls for specific escalation policy",
                input: {
                    escalationPolicyIds: ["PESCPOL1"],
                    limit: 25
                },
                expectedOutput: {
                    onCalls: [
                        {
                            escalation_policy: {
                                id: "PESCPOL1",
                                type: "escalation_policy_reference",
                                summary: "Engineering On-Call"
                            },
                            escalation_level: 1,
                            schedule: null,
                            user: {
                                id: "PUSER001",
                                type: "user_reference",
                                summary: "John Smith"
                            },
                            start: "2024-12-19T00:00:00Z",
                            end: "2024-12-20T00:00:00Z"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 25,
                        more: false,
                        total: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_policy_id",
                description: "Invalid escalation policy ID",
                input: {
                    escalationPolicyIds: ["INVALID"],
                    limit: 25
                },
                expectedError: {
                    type: "not_found",
                    message: "Escalation policy not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
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
        operationId: "listSchedules",
        provider: "pagerduty",
        validCases: [
            {
                name: "list_all_schedules",
                description: "List all on-call schedules",
                input: {
                    limit: 25
                },
                expectedOutput: {
                    schedules: [
                        {
                            id: "PSCHED001",
                            name: "Database Primary",
                            description: "Primary database on-call rotation",
                            time_zone: "America/New_York",
                            escalation_policies: [
                                {
                                    id: "PESCPOL2",
                                    type: "escalation_policy_reference",
                                    summary: "Database Team"
                                }
                            ],
                            users: [
                                { id: "PUSER002", type: "user_reference", summary: "Jane Doe" },
                                { id: "PUSER003", type: "user_reference", summary: "Mike Wilson" }
                            ],
                            html_url: "https://acme.pagerduty.com/schedules/PSCHED001"
                        },
                        {
                            id: "PSCHED002",
                            name: "Engineering Weekend",
                            description: "Weekend engineering rotation",
                            time_zone: "America/Los_Angeles",
                            escalation_policies: [
                                {
                                    id: "PESCPOL1",
                                    type: "escalation_policy_reference",
                                    summary: "Engineering On-Call"
                                }
                            ],
                            users: [
                                { id: "PUSER001", type: "user_reference", summary: "John Smith" }
                            ],
                            html_url: "https://acme.pagerduty.com/schedules/PSCHED002"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 25,
                        more: false,
                        total: 2
                    }
                }
            },
            {
                name: "search_schedules",
                description: "Search schedules by name",
                input: {
                    query: "Database",
                    limit: 10
                },
                expectedOutput: {
                    schedules: [
                        {
                            id: "PSCHED001",
                            name: "Database Primary",
                            description: "Primary database on-call rotation",
                            time_zone: "America/New_York",
                            html_url: "https://acme.pagerduty.com/schedules/PSCHED001"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 10,
                        more: false,
                        total: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to view schedules",
                input: {
                    limit: 25
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
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
        operationId: "listServices",
        provider: "pagerduty",
        filterableData: {
            records: sampleServices,
            recordsField: "services",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            offsetField: "offset",
            filterConfig: {
                type: "generic",
                filterableFields: ["status", "_team"]
            }
        },
        validCases: [
            {
                name: "list_all_services",
                description: "List all services",
                input: {
                    limit: 25
                }
            },
            {
                name: "search_services",
                description: "Search services by name",
                input: {
                    query: "Production",
                    limit: 10
                }
            },
            {
                name: "list_services_by_team",
                description: "List services for a specific team",
                input: {
                    teamIds: ["PTEAM001"],
                    limit: 25
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_team_id",
                description: "Invalid team ID filter",
                input: {
                    teamIds: ["INVALID"],
                    limit: 25
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid team ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
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
        operationId: "listUsers",
        provider: "pagerduty",
        validCases: [
            {
                name: "list_all_users",
                description: "List all users in the account",
                input: {
                    limit: 25
                },
                expectedOutput: {
                    users: [
                        {
                            id: "PUSER001",
                            name: "John Smith",
                            email: "john.smith@example.com",
                            time_zone: "America/New_York",
                            color: "teal",
                            role: "admin",
                            job_title: "Senior Engineer",
                            html_url: "https://acme.pagerduty.com/users/PUSER001"
                        },
                        {
                            id: "PUSER002",
                            name: "Jane Doe",
                            email: "jane.doe@example.com",
                            time_zone: "America/Los_Angeles",
                            color: "purple",
                            role: "user",
                            job_title: "Database Administrator",
                            html_url: "https://acme.pagerduty.com/users/PUSER002"
                        },
                        {
                            id: "PUSER003",
                            name: "Mike Wilson",
                            email: "mike.wilson@example.com",
                            time_zone: "Europe/London",
                            color: "green",
                            role: "user",
                            job_title: "DevOps Engineer",
                            html_url: "https://acme.pagerduty.com/users/PUSER003"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 25,
                        more: false,
                        total: 3
                    }
                }
            },
            {
                name: "search_users",
                description: "Search users by name or email",
                input: {
                    query: "john",
                    limit: 10
                },
                expectedOutput: {
                    users: [
                        {
                            id: "PUSER001",
                            name: "John Smith",
                            email: "john.smith@example.com",
                            time_zone: "America/New_York",
                            role: "admin",
                            html_url: "https://acme.pagerduty.com/users/PUSER001"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 10,
                        more: false,
                        total: 1
                    }
                }
            },
            {
                name: "list_users_with_contact_methods",
                description: "List users with contact methods included",
                input: {
                    include: ["contact_methods"],
                    limit: 10
                },
                expectedOutput: {
                    users: [
                        {
                            id: "PUSER001",
                            name: "John Smith",
                            email: "john.smith@example.com",
                            contact_methods: [
                                {
                                    id: "PCM001",
                                    type: "email_contact_method",
                                    address: "john.smith@example.com"
                                },
                                {
                                    id: "PCM002",
                                    type: "phone_contact_method",
                                    address: "+1-555-123-4567"
                                }
                            ],
                            html_url: "https://acme.pagerduty.com/users/PUSER001"
                        }
                    ],
                    pagination: {
                        offset: 0,
                        limit: 10,
                        more: true,
                        total: 3
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to list users",
                input: {
                    limit: 25
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
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
        operationId: "updateIncident",
        provider: "pagerduty",
        validCases: [
            {
                name: "acknowledge_incident",
                description: "Acknowledge a triggered incident",
                input: {
                    incidentId: "P1234567",
                    from: "john.smith@example.com",
                    status: "acknowledged"
                },
                expectedOutput: {
                    incident: {
                        id: "P1234567",
                        incident_number: 1234,
                        title: "High CPU usage on production server",
                        status: "acknowledged",
                        urgency: "high",
                        html_url: "https://acme.pagerduty.com/incidents/P1234567"
                    },
                    incidentId: "P1234567",
                    status: "acknowledged",
                    htmlUrl: "https://acme.pagerduty.com/incidents/P1234567"
                }
            },
            {
                name: "resolve_incident",
                description: "Resolve an incident with resolution note",
                input: {
                    incidentId: "P1234568",
                    from: "jane.doe@example.com",
                    status: "resolved",
                    resolution:
                        "Database connection pool increased to 200. Monitoring for recurrence."
                },
                expectedOutput: {
                    incident: {
                        id: "P1234568",
                        incident_number: 1235,
                        title: "Database connection pool exhausted",
                        status: "resolved",
                        urgency: "high",
                        html_url: "https://acme.pagerduty.com/incidents/P1234568"
                    },
                    incidentId: "P1234568",
                    status: "resolved",
                    htmlUrl: "https://acme.pagerduty.com/incidents/P1234568"
                }
            },
            {
                name: "reassign_incident",
                description: "Reassign an incident to another user",
                input: {
                    incidentId: "P1234569",
                    from: "admin@example.com",
                    assignees: [{ id: "PUSER003", type: "user_reference" }]
                },
                expectedOutput: {
                    incident: {
                        id: "P1234569",
                        incident_number: 1236,
                        title: "Elevated error rate in checkout flow",
                        status: "triggered",
                        urgency: "low",
                        html_url: "https://acme.pagerduty.com/incidents/P1234569"
                    },
                    incidentId: "P1234569",
                    status: "triggered",
                    htmlUrl: "https://acme.pagerduty.com/incidents/P1234569"
                }
            }
        ],
        errorCases: [
            {
                name: "incident_not_found",
                description: "Incident does not exist",
                input: {
                    incidentId: "PNONEXISTENT",
                    from: "admin@example.com",
                    status: "acknowledged"
                },
                expectedError: {
                    type: "not_found",
                    message: "Incident PNONEXISTENT not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    incidentId: "P1234567",
                    from: "admin@example.com",
                    status: "acknowledged"
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
