/**
 * Pipedrive Provider Test Fixtures
 *
 * Based on official Pipedrive API documentation:
 * - Deals: https://developers.pipedrive.com/docs/api/v1/Deals
 * - Persons: https://developers.pipedrive.com/docs/api/v1/Persons
 * - Organizations: https://developers.pipedrive.com/docs/api/v1/Organizations
 * - Activities: https://developers.pipedrive.com/docs/api/v1/Activities
 * - Leads: https://developers.pipedrive.com/docs/api/v1/Leads
 */

import type { TestFixture } from "../../sandbox";

export const pipedriveFixtures: TestFixture[] = [
    // ==================== ACTIVITIES ====================
    {
        operationId: "createActivity",
        provider: "pipedrive",
        validCases: [
            {
                name: "create_call_activity",
                description: "Create a new call activity linked to a deal",
                input: {
                    subject: "Follow-up call with Sarah",
                    type: "call",
                    due_date: "2024-02-15",
                    due_time: "10:30",
                    duration: "00:30",
                    deal_id: 12345,
                    person_id: 67890,
                    note: "Discuss pricing options and contract terms"
                },
                expectedOutput: {
                    id: 98765,
                    type: "call",
                    subject: "Follow-up call with Sarah",
                    done: false,
                    due_date: "2024-02-15",
                    due_time: "10:30:00",
                    duration: "00:30:00",
                    user_id: 1001,
                    person_id: 67890,
                    org_id: null,
                    deal_id: 12345,
                    lead_id: null,
                    note: "Discuss pricing options and contract terms",
                    location: null,
                    public_description: null,
                    busy_flag: false,
                    add_time: "2024-02-10T14:30:00.000Z",
                    update_time: null,
                    marked_as_done_time: null
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_fields",
                description: "Activity created without required subject",
                input: {
                    type: "call",
                    due_date: "2024-02-15"
                },
                expectedError: {
                    type: "validation",
                    message: "Subject is required",
                    retryable: false
                }
            },
            {
                name: "invalid_deal_id",
                description: "Activity linked to non-existent deal",
                input: {
                    subject: "Test call",
                    type: "call",
                    deal_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Deal not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    subject: "Test activity",
                    type: "call"
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
        operationId: "deleteActivity",
        provider: "pipedrive",
        validCases: [
            {
                name: "delete_existing_activity",
                description: "Delete an existing activity",
                input: {
                    id: 98765
                },
                expectedOutput: {
                    deleted: true,
                    id: 98765
                }
            }
        ],
        errorCases: [
            {
                name: "activity_not_found",
                description: "Activity does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Activity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 98765
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
        operationId: "getActivity",
        provider: "pipedrive",
        validCases: [
            {
                name: "get_call_activity",
                description: "Get a specific call activity by ID",
                input: {
                    id: 98765
                },
                expectedOutput: {
                    id: 98765,
                    type: "call",
                    subject: "Follow-up call with Sarah",
                    done: false,
                    due_date: "2024-02-15",
                    due_time: "10:30:00",
                    duration: "00:30:00",
                    user_id: 1001,
                    person_id: 67890,
                    org_id: null,
                    deal_id: 12345,
                    lead_id: null,
                    note: "Discuss pricing options and contract terms",
                    location: null,
                    public_description: null,
                    busy_flag: false,
                    add_time: "2024-02-10T14:30:00.000Z",
                    update_time: "2024-02-11T09:15:00.000Z",
                    marked_as_done_time: null
                }
            }
        ],
        errorCases: [
            {
                name: "activity_not_found",
                description: "Activity does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Activity with ID 99999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 98765
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
        operationId: "listActivities",
        provider: "pipedrive",
        validCases: [
            {
                name: "list_all_activities",
                description: "Get all activities with default pagination",
                input: {},
                expectedOutput: {
                    activities: [
                        {
                            id: 98765,
                            type: "call",
                            subject: "Follow-up call with Sarah",
                            done: false,
                            due_date: "2024-02-15",
                            due_time: "10:30:00",
                            duration: "00:30:00",
                            user_id: 1001,
                            person_id: 67890,
                            org_id: null,
                            deal_id: 12345,
                            lead_id: null,
                            note: "Discuss pricing options",
                            location: null,
                            public_description: null,
                            busy_flag: false,
                            add_time: "2024-02-10T14:30:00.000Z",
                            update_time: null,
                            marked_as_done_time: null
                        },
                        {
                            id: 98766,
                            type: "meeting",
                            subject: "Product Demo - Enterprise Plan",
                            done: false,
                            due_date: "2024-02-20",
                            due_time: "14:00:00",
                            duration: "01:00:00",
                            user_id: 1001,
                            person_id: 67891,
                            org_id: 11111,
                            deal_id: 12346,
                            lead_id: null,
                            note: null,
                            location: "Conference Room A",
                            public_description: "Demo of enterprise features",
                            busy_flag: true,
                            add_time: "2024-02-10T14:35:00.000Z",
                            update_time: null,
                            marked_as_done_time: null
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: true,
                        next_start: 50
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_user_id",
                description: "Filter by non-existent user",
                input: {
                    user_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
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
        operationId: "updateActivity",
        provider: "pipedrive",
        validCases: [
            {
                name: "mark_activity_done",
                description: "Mark an activity as completed",
                input: {
                    id: 98765,
                    done: "1"
                },
                expectedOutput: {
                    id: 98765,
                    type: "call",
                    subject: "Follow-up call with Sarah",
                    done: true,
                    due_date: "2024-02-15",
                    due_time: "10:30:00",
                    duration: "00:30:00",
                    user_id: 1001,
                    person_id: 67890,
                    org_id: null,
                    deal_id: 12345,
                    lead_id: null,
                    note: "Discuss pricing options and contract terms",
                    location: null,
                    public_description: null,
                    busy_flag: false,
                    add_time: "2024-02-10T14:30:00.000Z",
                    update_time: "2024-02-15T11:00:00.000Z",
                    marked_as_done_time: "2024-02-15T11:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "activity_not_found",
                description: "Activity does not exist",
                input: {
                    id: 99999999,
                    done: "1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Activity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 98765,
                    done: "1"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== DEALS ====================
    {
        operationId: "createDeal",
        provider: "pipedrive",
        validCases: [
            {
                name: "create_basic_deal",
                description: "Create a basic deal with required fields",
                input: {
                    title: "Acme Corp - Enterprise License"
                },
                expectedOutput: {
                    id: 12345,
                    title: "Acme Corp - Enterprise License",
                    value: null,
                    currency: "USD",
                    status: "open",
                    stage_id: 1,
                    pipeline_id: 1,
                    person_id: null,
                    org_id: null,
                    user_id: 1001,
                    expected_close_date: null,
                    won_time: null,
                    lost_time: null,
                    lost_reason: null,
                    visible_to: "3",
                    add_time: "2024-02-10T14:00:00.000Z",
                    update_time: null,
                    close_time: null
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Deal created without required title",
                input: {
                    value: 50000
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            },
            {
                name: "invalid_stage_id",
                description: "Deal with invalid pipeline stage",
                input: {
                    title: "Test Deal",
                    stage_id: 99999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid stage ID",
                    retryable: false
                }
            },
            {
                name: "invalid_person_id",
                description: "Deal linked to non-existent person",
                input: {
                    title: "Test Deal",
                    person_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    title: "Test Deal"
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
        operationId: "deleteDeal",
        provider: "pipedrive",
        validCases: [
            {
                name: "delete_existing_deal",
                description: "Delete a deal (marks as deleted for 30 days)",
                input: {
                    id: 12345
                },
                expectedOutput: {
                    deleted: true,
                    id: 12345
                }
            }
        ],
        errorCases: [
            {
                name: "deal_not_found",
                description: "Deal does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Deal not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 12345
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
        operationId: "getDeal",
        provider: "pipedrive",
        validCases: [
            {
                name: "get_open_deal",
                description: "Get an open deal by ID",
                input: {
                    id: 12345
                },
                expectedOutput: {
                    id: 12345,
                    title: "Acme Corp - Enterprise License",
                    value: 50000,
                    currency: "USD",
                    status: "open",
                    stage_id: 3,
                    pipeline_id: 1,
                    person_id: 67890,
                    org_id: 11111,
                    user_id: 1001,
                    expected_close_date: "2024-03-15",
                    won_time: null,
                    lost_time: null,
                    lost_reason: null,
                    visible_to: "3",
                    add_time: "2024-01-15T10:00:00.000Z",
                    update_time: "2024-02-10T14:30:00.000Z",
                    close_time: null
                }
            }
        ],
        errorCases: [
            {
                name: "deal_not_found",
                description: "Deal does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Deal with ID 99999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 12345
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
        operationId: "listDeals",
        provider: "pipedrive",
        validCases: [
            {
                name: "list_all_deals",
                description: "Get all deals with default pagination",
                input: {},
                expectedOutput: {
                    deals: [
                        {
                            id: 12345,
                            title: "Acme Corp - Enterprise License",
                            value: 50000,
                            currency: "USD",
                            status: "open",
                            stage_id: 3,
                            pipeline_id: 1,
                            person_id: 67890,
                            org_id: 11111,
                            user_id: 1001,
                            expected_close_date: "2024-03-15",
                            won_time: null,
                            lost_time: null,
                            lost_reason: null,
                            visible_to: "3",
                            add_time: "2024-01-15T10:00:00.000Z",
                            update_time: "2024-02-10T14:30:00.000Z",
                            close_time: null
                        },
                        {
                            id: 12346,
                            title: "TechCorp - Annual Subscription",
                            value: 75000,
                            currency: "USD",
                            status: "open",
                            stage_id: 2,
                            pipeline_id: 1,
                            person_id: 67891,
                            org_id: 11112,
                            user_id: 1001,
                            expected_close_date: "2024-03-31",
                            won_time: null,
                            lost_time: null,
                            lost_reason: null,
                            visible_to: "5",
                            add_time: "2024-01-20T11:00:00.000Z",
                            update_time: "2024-02-08T16:00:00.000Z",
                            close_time: null
                        },
                        {
                            id: 12347,
                            title: "Globex Industries - Q1 Contract",
                            value: 125000,
                            currency: "EUR",
                            status: "won",
                            stage_id: 5,
                            pipeline_id: 1,
                            person_id: 67892,
                            org_id: 11113,
                            user_id: 1001,
                            expected_close_date: "2024-02-28",
                            won_time: "2024-02-10T14:10:00.000Z",
                            lost_time: null,
                            lost_reason: null,
                            visible_to: "3",
                            add_time: "2024-01-20T09:00:00.000Z",
                            update_time: "2024-02-10T14:10:00.000Z",
                            close_time: "2024-02-10T14:10:00.000Z"
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
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
        operationId: "searchDeals",
        provider: "pipedrive",
        validCases: [
            {
                name: "search_by_title",
                description: "Search deals by title",
                input: {
                    term: "Enterprise"
                },
                expectedOutput: {
                    deals: [
                        {
                            id: 12345,
                            title: "Acme Corp - Enterprise License",
                            value: 50000,
                            currency: "USD",
                            status: "open",
                            stage_id: 3,
                            pipeline_id: 1,
                            person_id: 67890,
                            org_id: 11111,
                            user_id: 1001,
                            expected_close_date: "2024-03-15",
                            won_time: null,
                            lost_time: null,
                            lost_reason: null,
                            visible_to: "3",
                            add_time: "2024-01-15T10:00:00.000Z",
                            update_time: "2024-02-10T14:30:00.000Z",
                            close_time: null
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "empty_search_term",
                description: "Search with empty term",
                input: {
                    term: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Search term is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    term: "test"
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
        operationId: "updateDeal",
        provider: "pipedrive",
        validCases: [
            {
                name: "update_deal_value",
                description: "Update deal value after negotiation",
                input: {
                    id: 12345,
                    value: 55000,
                    probability: 75
                },
                expectedOutput: {
                    id: 12345,
                    title: "Acme Corp - Enterprise License",
                    value: 55000,
                    currency: "USD",
                    status: "open",
                    stage_id: 3,
                    pipeline_id: 1,
                    person_id: 67890,
                    org_id: 11111,
                    user_id: 1001,
                    expected_close_date: "2024-03-15",
                    won_time: null,
                    lost_time: null,
                    lost_reason: null,
                    visible_to: "3",
                    add_time: "2024-01-15T10:00:00.000Z",
                    update_time: "2024-02-11T10:00:00.000Z",
                    close_time: null
                }
            }
        ],
        errorCases: [
            {
                name: "deal_not_found",
                description: "Deal does not exist",
                input: {
                    id: 99999999,
                    value: 50000
                },
                expectedError: {
                    type: "not_found",
                    message: "Deal not found",
                    retryable: false
                }
            },
            {
                name: "invalid_stage_id",
                description: "Update with invalid stage ID",
                input: {
                    id: 12345,
                    stage_id: 99999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid stage ID",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 12345,
                    value: 60000
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LEADS ====================
    {
        operationId: "createLead",
        provider: "pipedrive",
        validCases: [
            {
                name: "create_basic_lead",
                description: "Create a basic lead with title only",
                input: {
                    title: "Inbound - Website Contact Form"
                },
                expectedOutput: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    title: "Inbound - Website Contact Form",
                    owner_id: 1001,
                    person_id: null,
                    organization_id: null,
                    expected_close_date: null,
                    value: null,
                    label_ids: [],
                    is_archived: false,
                    add_time: "2024-02-10T15:00:00.000Z",
                    update_time: null
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Lead created without required title",
                input: {
                    person_id: 67890
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            },
            {
                name: "invalid_person_id",
                description: "Lead linked to non-existent person",
                input: {
                    title: "Test Lead",
                    person_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    title: "Test Lead"
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
        operationId: "deleteLead",
        provider: "pipedrive",
        validCases: [
            {
                name: "delete_existing_lead",
                description: "Archive a lead (can be recovered)",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    deleted: true,
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: {
                    id: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "invalid_uuid",
                description: "Invalid UUID format",
                input: {
                    id: "not-a-valid-uuid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid lead ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
        operationId: "getLead",
        provider: "pipedrive",
        validCases: [
            {
                name: "get_lead_by_id",
                description: "Get a specific lead by UUID",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    title: "Inbound - Website Contact Form",
                    owner_id: 1001,
                    person_id: 67894,
                    organization_id: 11115,
                    expected_close_date: "2024-03-31",
                    value: {
                        amount: 25000,
                        currency: "USD"
                    },
                    label_ids: ["11111111-2222-3333-4444-555555555555"],
                    is_archived: false,
                    add_time: "2024-02-10T15:00:00.000Z",
                    update_time: "2024-02-11T09:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: {
                    id: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead with ID 00000000-0000-0000-0000-000000000000 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
        operationId: "listLeads",
        provider: "pipedrive",
        validCases: [
            {
                name: "list_all_leads",
                description: "Get all non-archived leads",
                input: {},
                expectedOutput: {
                    leads: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            title: "Inbound - Website Contact Form",
                            owner_id: 1001,
                            person_id: 67894,
                            organization_id: 11115,
                            expected_close_date: "2024-03-31",
                            value: {
                                amount: 25000,
                                currency: "USD"
                            },
                            label_ids: ["11111111-2222-3333-4444-555555555555"],
                            is_archived: false,
                            add_time: "2024-02-10T15:00:00.000Z",
                            update_time: "2024-02-11T09:30:00.000Z"
                        },
                        {
                            id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                            title: "Referral - Enterprise Inquiry",
                            owner_id: 1001,
                            person_id: 67890,
                            organization_id: 11111,
                            expected_close_date: "2024-04-30",
                            value: {
                                amount: 100000,
                                currency: "USD"
                            },
                            label_ids: [],
                            is_archived: false,
                            add_time: "2024-02-10T15:05:00.000Z",
                            update_time: null
                        },
                        {
                            id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                            title: "Trade Show - Booth Visitor",
                            owner_id: 1001,
                            person_id: null,
                            organization_id: null,
                            expected_close_date: null,
                            value: null,
                            label_ids: [
                                "11111111-2222-3333-4444-555555555555",
                                "66666666-7777-8888-9999-000000000000"
                            ],
                            is_archived: false,
                            add_time: "2024-02-10T15:10:00.000Z",
                            update_time: null
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
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
        operationId: "updateLead",
        provider: "pipedrive",
        validCases: [
            {
                name: "update_lead_value",
                description: "Update lead value after qualification",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    value: {
                        amount: 50000,
                        currency: "USD"
                    },
                    expected_close_date: "2024-04-15"
                },
                expectedOutput: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    title: "Inbound - Website Contact Form",
                    owner_id: 1001,
                    person_id: 67894,
                    organization_id: 11115,
                    expected_close_date: "2024-04-15",
                    value: {
                        amount: 50000,
                        currency: "USD"
                    },
                    label_ids: ["11111111-2222-3333-4444-555555555555"],
                    is_archived: false,
                    add_time: "2024-02-10T15:00:00.000Z",
                    update_time: "2024-02-11T14:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: {
                    id: "00000000-0000-0000-0000-000000000000",
                    title: "Updated Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "invalid_person_id",
                description: "Link to non-existent person",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    person_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    title: "Updated"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== ORGANIZATIONS ====================
    {
        operationId: "createOrganization",
        provider: "pipedrive",
        validCases: [
            {
                name: "create_basic_organization",
                description: "Create a basic organization",
                input: {
                    name: "Acme Corporation"
                },
                expectedOutput: {
                    id: 11111,
                    name: "Acme Corporation",
                    owner_id: 1001,
                    address: null,
                    address_country: null,
                    cc_email: "acme-corp@pipedrivemail.com",
                    visible_to: "3",
                    add_time: "2024-02-10T16:00:00.000Z",
                    update_time: null,
                    active_flag: true
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Organization created without required name",
                input: {
                    address: "123 Main St"
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_owner_id",
                description: "Organization with non-existent owner",
                input: {
                    name: "Test Org",
                    owner_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test Org"
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
        operationId: "deleteOrganization",
        provider: "pipedrive",
        validCases: [
            {
                name: "delete_existing_organization",
                description: "Delete an organization",
                input: {
                    id: 11111
                },
                expectedOutput: {
                    deleted: true,
                    id: 11111
                }
            }
        ],
        errorCases: [
            {
                name: "organization_not_found",
                description: "Organization does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 11111
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
        operationId: "getOrganization",
        provider: "pipedrive",
        validCases: [
            {
                name: "get_organization_by_id",
                description: "Get an organization by ID",
                input: {
                    id: 11111
                },
                expectedOutput: {
                    id: 11111,
                    name: "Acme Corporation",
                    owner_id: 1001,
                    address: "500 Enterprise Blvd, Suite 100, New York, NY 10001",
                    address_country: "United States",
                    cc_email: "acme-corp@pipedrivemail.com",
                    visible_to: "3",
                    add_time: "2024-01-10T09:00:00.000Z",
                    update_time: "2024-02-05T14:30:00.000Z",
                    active_flag: true
                }
            }
        ],
        errorCases: [
            {
                name: "organization_not_found",
                description: "Organization does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization with ID 99999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 11111
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
        operationId: "listOrganizations",
        provider: "pipedrive",
        validCases: [
            {
                name: "list_all_organizations",
                description: "Get all organizations with default pagination",
                input: {},
                expectedOutput: {
                    organizations: [
                        {
                            id: 11111,
                            name: "Acme Corporation",
                            owner_id: 1001,
                            address: "500 Enterprise Blvd, Suite 100, New York, NY 10001",
                            address_country: "United States",
                            cc_email: "acme-corp@pipedrivemail.com",
                            visible_to: "3",
                            add_time: "2024-01-10T09:00:00.000Z",
                            update_time: "2024-02-05T14:30:00.000Z",
                            active_flag: true
                        },
                        {
                            id: 11112,
                            name: "TechCorp International",
                            owner_id: 1001,
                            address: "123 Innovation Way, San Francisco, CA 94105, USA",
                            address_country: "United States",
                            cc_email: "techcorp-international@pipedrivemail.com",
                            visible_to: "5",
                            add_time: "2024-01-15T11:00:00.000Z",
                            update_time: "2024-02-01T10:00:00.000Z",
                            active_flag: true
                        },
                        {
                            id: 11113,
                            name: "Globex Industries Ltd",
                            owner_id: 1002,
                            address: "45 Commerce Street, London EC2A 1AB, UK",
                            address_country: "United Kingdom",
                            cc_email: "globex-industries@pipedrivemail.com",
                            visible_to: "7",
                            add_time: "2024-01-20T14:00:00.000Z",
                            update_time: null,
                            active_flag: true
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
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
        operationId: "searchOrganizations",
        provider: "pipedrive",
        validCases: [
            {
                name: "search_by_name",
                description: "Search organizations by name",
                input: {
                    term: "Tech"
                },
                expectedOutput: {
                    organizations: [
                        {
                            id: 11112,
                            name: "TechCorp International",
                            owner_id: 1001,
                            address: "123 Innovation Way, San Francisco, CA 94105, USA",
                            address_country: "United States",
                            cc_email: "techcorp-international@pipedrivemail.com",
                            visible_to: "5",
                            add_time: "2024-01-15T11:00:00.000Z",
                            update_time: "2024-02-01T10:00:00.000Z",
                            active_flag: true
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "empty_search_term",
                description: "Search with empty term",
                input: {
                    term: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Search term is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    term: "test"
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
        operationId: "updateOrganization",
        provider: "pipedrive",
        validCases: [
            {
                name: "update_organization_address",
                description: "Update organization address",
                input: {
                    id: 11111,
                    address: "600 Corporate Plaza, Suite 200, New York, NY 10002"
                },
                expectedOutput: {
                    id: 11111,
                    name: "Acme Corporation",
                    owner_id: 1001,
                    address: "600 Corporate Plaza, Suite 200, New York, NY 10002",
                    address_country: "United States",
                    cc_email: "acme-corp@pipedrivemail.com",
                    visible_to: "3",
                    add_time: "2024-01-10T09:00:00.000Z",
                    update_time: "2024-02-11T16:00:00.000Z",
                    active_flag: true
                }
            }
        ],
        errorCases: [
            {
                name: "organization_not_found",
                description: "Organization does not exist",
                input: {
                    id: 99999999,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "invalid_owner_id",
                description: "Assign to non-existent owner",
                input: {
                    id: 11111,
                    owner_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 11111,
                    name: "Updated"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== PERSONS (CONTACTS) ====================
    {
        operationId: "createPerson",
        provider: "pipedrive",
        validCases: [
            {
                name: "create_basic_person",
                description: "Create a basic contact with name only",
                input: {
                    name: "John Smith"
                },
                expectedOutput: {
                    id: 67890,
                    name: "John Smith",
                    first_name: "John",
                    last_name: "Smith",
                    email: [],
                    phone: [],
                    org_id: null,
                    owner_id: 1001,
                    visible_to: "3",
                    add_time: "2024-02-10T17:00:00.000Z",
                    update_time: null,
                    active_flag: true
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Person created without required name",
                input: {
                    email: [{ value: "test@example.com", label: "work", primary: true }]
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Person with invalid email format",
                input: {
                    name: "Test Person",
                    email: [{ value: "not-an-email", label: "work", primary: true }]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "invalid_org_id",
                description: "Person linked to non-existent organization",
                input: {
                    name: "Test Person",
                    org_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test Person"
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
        operationId: "deletePerson",
        provider: "pipedrive",
        validCases: [
            {
                name: "delete_existing_person",
                description: "Delete a contact",
                input: {
                    id: 67890
                },
                expectedOutput: {
                    deleted: true,
                    id: 67890
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 67890
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
        operationId: "getPerson",
        provider: "pipedrive",
        validCases: [
            {
                name: "get_person_by_id",
                description: "Get a contact by ID",
                input: {
                    id: 67890
                },
                expectedOutput: {
                    id: 67890,
                    name: "Sarah Johnson",
                    first_name: "Sarah",
                    last_name: "Johnson",
                    email: [
                        { value: "sarah.johnson@acme.com", label: "work", primary: true },
                        { value: "sarah.j@gmail.com", label: "personal", primary: false }
                    ],
                    phone: [{ value: "+1-555-1234", label: "work", primary: true }],
                    org_id: 11111,
                    owner_id: 1001,
                    visible_to: "3",
                    add_time: "2024-01-12T10:00:00.000Z",
                    update_time: "2024-02-08T15:30:00.000Z",
                    active_flag: true
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: {
                    id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact with ID 99999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 67890
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
        operationId: "listPersons",
        provider: "pipedrive",
        validCases: [
            {
                name: "list_all_persons",
                description: "Get all contacts with default pagination",
                input: {},
                expectedOutput: {
                    persons: [
                        {
                            id: 67890,
                            name: "Sarah Johnson",
                            first_name: "Sarah",
                            last_name: "Johnson",
                            email: [
                                { value: "sarah.johnson@acme.com", label: "work", primary: true }
                            ],
                            phone: [{ value: "+1-555-1234", label: "work", primary: true }],
                            org_id: 11111,
                            owner_id: 1001,
                            visible_to: "3",
                            add_time: "2024-01-12T10:00:00.000Z",
                            update_time: "2024-02-08T15:30:00.000Z",
                            active_flag: true
                        },
                        {
                            id: 67891,
                            name: "Michael Chen",
                            first_name: "Michael",
                            last_name: "Chen",
                            email: [{ value: "m.chen@techcorp.com", label: "work", primary: true }],
                            phone: [
                                { value: "+1-555-0123", label: "work", primary: true },
                                { value: "+1-555-0124", label: "mobile", primary: false }
                            ],
                            org_id: 11112,
                            owner_id: 1001,
                            visible_to: "5",
                            add_time: "2024-01-15T14:00:00.000Z",
                            update_time: "2024-02-05T11:00:00.000Z",
                            active_flag: true
                        },
                        {
                            id: 67892,
                            name: "Emma Wilson",
                            first_name: "Emma",
                            last_name: "Wilson",
                            email: [{ value: "e.wilson@globex.com", label: "work", primary: true }],
                            phone: [{ value: "+44-20-7123-4567", label: "work", primary: true }],
                            org_id: 11113,
                            owner_id: 1002,
                            visible_to: "7",
                            add_time: "2024-01-20T09:00:00.000Z",
                            update_time: null,
                            active_flag: true
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
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
        operationId: "searchPersons",
        provider: "pipedrive",
        validCases: [
            {
                name: "search_by_name",
                description: "Search contacts by name",
                input: {
                    term: "Johnson"
                },
                expectedOutput: {
                    persons: [
                        {
                            id: 67890,
                            name: "Sarah Johnson",
                            first_name: "Sarah",
                            last_name: "Johnson",
                            email: [
                                { value: "sarah.johnson@acme.com", label: "work", primary: true }
                            ],
                            phone: [{ value: "+1-555-1234", label: "work", primary: true }],
                            org_id: 11111,
                            owner_id: 1001,
                            visible_to: "3",
                            add_time: "2024-01-12T10:00:00.000Z",
                            update_time: "2024-02-08T15:30:00.000Z",
                            active_flag: true
                        }
                    ],
                    pagination: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "empty_search_term",
                description: "Search with empty term",
                input: {
                    term: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Search term is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    term: "test"
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
        operationId: "updatePerson",
        provider: "pipedrive",
        validCases: [
            {
                name: "add_email_to_person",
                description: "Add a new email address to contact",
                input: {
                    id: 67890,
                    email: [
                        { value: "sarah.johnson@acme.com", label: "work", primary: true },
                        { value: "sarah.j@gmail.com", label: "personal", primary: false },
                        { value: "s.johnson@newcompany.com", label: "work", primary: false }
                    ]
                },
                expectedOutput: {
                    id: 67890,
                    name: "Sarah Johnson",
                    first_name: "Sarah",
                    last_name: "Johnson",
                    email: [
                        { value: "sarah.johnson@acme.com", label: "work", primary: true },
                        { value: "sarah.j@gmail.com", label: "personal", primary: false },
                        { value: "s.johnson@newcompany.com", label: "work", primary: false }
                    ],
                    phone: [{ value: "+1-555-1234", label: "work", primary: true }],
                    org_id: 11111,
                    owner_id: 1001,
                    visible_to: "3",
                    add_time: "2024-01-12T10:00:00.000Z",
                    update_time: "2024-02-11T17:00:00.000Z",
                    active_flag: true
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: {
                    id: 99999999,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "invalid_org_id",
                description: "Link to non-existent organization",
                input: {
                    id: 67890,
                    org_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Update with invalid email format",
                input: {
                    id: 67890,
                    email: [{ value: "not-an-email", label: "work", primary: true }]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: 67890,
                    name: "Updated"
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
