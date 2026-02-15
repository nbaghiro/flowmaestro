/**
 * Linear Provider Test Fixtures
 *
 * Based on official Linear API documentation:
 * - GraphQL API: https://developers.linear.app/docs/graphql/working-with-the-graphql-api
 * - Issue Object: https://studio.apollographql.com/public/Linear-API/schema/reference
 */

import type { TestFixture } from "../../sandbox";

export const linearFixtures: TestFixture[] = [
    {
        operationId: "createIssue",
        provider: "linear",
        validCases: [
            {
                name: "simple_issue",
                description: "Create a simple issue with title",
                input: {
                    teamId: "team-abc-123",
                    title: "Implement user authentication"
                },
                // Normalized output matching executeCreateIssue return format
                expectedOutput: {
                    id: "issue-uuid-789",
                    title: "Implement user authentication",
                    identifier: "ENG-42",
                    url: "https://linear.app/demo-team/issue/ENG-42",
                    createdAt: "{{iso}}"
                }
            },
            {
                name: "issue_with_details",
                description: "Create an issue with description and priority",
                input: {
                    teamId: "team-abc-123",
                    title: "Fix performance regression",
                    description: "Page load time has increased by 50% after the last deployment.",
                    priority: 1,
                    stateId: "state-todo-123"
                },
                // Normalized output matching executeCreateIssue return format
                expectedOutput: {
                    id: "issue-uuid-790",
                    title: "Fix performance regression",
                    identifier: "ENG-43",
                    url: "https://linear.app/demo-team/issue/ENG-43",
                    createdAt: "{{iso}}"
                }
            },
            {
                name: "issue_with_assignee_and_labels",
                description: "Create an issue with assignee and labels",
                input: {
                    teamId: "team-abc-123",
                    title: "Add dark mode support",
                    description: "Implement dark mode theme switching.",
                    priority: 2,
                    assigneeId: "user-assignee-456",
                    labelIds: ["label-bug-123", "label-ui-456"]
                },
                // Normalized output matching executeCreateIssue return format
                expectedOutput: {
                    id: "issue-uuid-791",
                    title: "Add dark mode support",
                    identifier: "ENG-44",
                    url: "https://linear.app/demo-team/issue/ENG-44",
                    createdAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "team_not_found",
                description: "Team does not exist",
                input: {
                    teamId: "team-nonexistent",
                    title: "Test Issue"
                },
                expectedError: {
                    type: "not_found",
                    message: "Entity not found: Team",
                    retryable: false
                }
            },
            {
                name: "invalid_priority",
                description: "Priority value out of range",
                input: {
                    teamId: "team-abc-123",
                    title: "Test Issue",
                    priority: 10
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Variable '$priority' got invalid value 10. Expected type 'Int' to be between 0 and 4.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    teamId: "team-abc-123",
                    title: "Test Issue"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid or expired API key",
                input: {
                    teamId: "team-abc-123",
                    title: "Test Issue"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication required. Please provide a valid API key.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listIssues",
        provider: "linear",
        validCases: [
            {
                name: "list_team_issues",
                description: "List all issues for a team",
                input: {
                    teamId: "team-abc-123"
                },
                expectedOutput: {
                    issues: {
                        nodes: [
                            {
                                id: "issue-uuid-789",
                                identifier: "ENG-42",
                                number: 42,
                                title: "Implement user authentication",
                                description: "Add OAuth2 authentication flow",
                                priority: 2,
                                priorityLabel: "High",
                                url: "https://linear.app/demo-team/issue/ENG-42",
                                createdAt: "2024-01-15T10:00:00.000Z",
                                updatedAt: "2024-01-20T15:30:00.000Z",
                                state: {
                                    id: "state-progress-123",
                                    name: "In Progress",
                                    color: "#f2c94c",
                                    type: "started"
                                },
                                assignee: {
                                    id: "user-assignee-456",
                                    name: "Jane Developer",
                                    email: "jane@example.com"
                                }
                            },
                            {
                                id: "issue-uuid-790",
                                identifier: "ENG-43",
                                number: 43,
                                title: "Fix performance regression",
                                description: "Page load time has increased",
                                priority: 1,
                                priorityLabel: "Urgent",
                                url: "https://linear.app/demo-team/issue/ENG-43",
                                createdAt: "2024-01-16T09:00:00.000Z",
                                updatedAt: "2024-01-19T12:00:00.000Z",
                                state: {
                                    id: "state-todo-123",
                                    name: "Todo",
                                    color: "#e2e2e2",
                                    type: "unstarted"
                                },
                                assignee: null
                            }
                        ],
                        pageInfo: {
                            hasNextPage: false,
                            hasPreviousPage: false,
                            startCursor: "issue-uuid-789",
                            endCursor: "issue-uuid-790"
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "team_not_found",
                description: "Team does not exist",
                input: {
                    teamId: "team-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Entity not found: Team",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    teamId: "team-abc-123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getIssue",
        provider: "linear",
        validCases: [
            {
                name: "get_issue_by_id",
                description: "Get an issue by its ID",
                input: {
                    issueId: "issue-uuid-789"
                },
                expectedOutput: {
                    issue: {
                        id: "issue-uuid-789",
                        identifier: "ENG-42",
                        number: 42,
                        title: "Implement user authentication",
                        description: "Add OAuth2 authentication flow with social login support.",
                        priority: 2,
                        priorityLabel: "High",
                        estimate: 5,
                        url: "https://linear.app/demo-team/issue/ENG-42",
                        branchName: "demo-user/eng-42-implement-user-authentication",
                        createdAt: "2024-01-15T10:00:00.000Z",
                        updatedAt: "2024-01-20T15:30:00.000Z",
                        archivedAt: null,
                        startedAt: "2024-01-18T09:00:00.000Z",
                        completedAt: null,
                        canceledAt: null,
                        dueDate: "2024-02-01",
                        trashed: false,
                        state: {
                            id: "state-progress-123",
                            name: "In Progress",
                            color: "#f2c94c",
                            type: "started"
                        },
                        team: {
                            id: "team-abc-123",
                            name: "Engineering",
                            key: "ENG"
                        },
                        assignee: {
                            id: "user-assignee-456",
                            name: "Jane Developer",
                            email: "jane@example.com"
                        },
                        creator: {
                            id: "user-creator-123",
                            name: "Demo User",
                            email: "demo@example.com"
                        },
                        labels: {
                            nodes: [
                                {
                                    id: "label-feature-123",
                                    name: "Feature",
                                    color: "#27ae60"
                                }
                            ]
                        },
                        project: {
                            id: "project-q1-123",
                            name: "Q1 Roadmap",
                            icon: "rocket",
                            color: "#5e6ad2"
                        },
                        cycle: null,
                        parent: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                description: "Issue does not exist",
                input: {
                    issueId: "nonexistent-issue-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Entity not found: Issue",
                    retryable: false
                }
            }
        ]
    }
];
