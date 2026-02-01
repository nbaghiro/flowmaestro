/**
 * Jira Provider Test Fixtures
 *
 * Based on Jira Cloud REST API v3 response structures.
 * Uses Atlassian Document Format (ADF) for rich text fields.
 */

import type { TestFixture } from "../../../sandbox";

// Helper for creating ADF text content
const createADFText = (text: string) => ({
    type: "doc",
    version: 1,
    content: [
        {
            type: "paragraph",
            content: [
                {
                    type: "text",
                    text
                }
            ]
        }
    ]
});

// Sample issue data for searchIssues filterable tests
const sampleIssues = [
    {
        id: "10001",
        key: "PROJ-1",
        self: "https://test-company.atlassian.net/rest/api/3/issue/10001",
        fields: {
            summary: "Implement user authentication",
            description: createADFText("Implement OAuth2 authentication flow for the application."),
            issuetype: {
                id: "10001",
                name: "Story",
                description: "A user story",
                iconUrl: "https://test-company.atlassian.net/images/icons/issuetypes/story.svg",
                subtask: false
            },
            project: {
                id: "10000",
                key: "PROJ",
                name: "Sample Project",
                projectTypeKey: "software",
                self: "https://test-company.atlassian.net/rest/api/3/project/10000"
            },
            status: {
                id: "10001",
                name: "In Progress",
                description: "Work is being done",
                statusCategory: {
                    id: 4,
                    key: "indeterminate",
                    name: "In Progress",
                    colorName: "yellow"
                }
            },
            priority: {
                id: "2",
                name: "High",
                iconUrl: "https://test-company.atlassian.net/images/icons/priorities/high.svg"
            },
            assignee: {
                accountId: "5b109f2e9729b51b54dc274d",
                emailAddress: "alice@example.com",
                displayName: "Alice Smith",
                active: true,
                avatarUrls: {
                    "48x48": "https://avatar-management.atlassian.net/avatar/alice.png"
                }
            },
            reporter: {
                accountId: "5b109f2e9729b51b54dc274e",
                emailAddress: "bob@example.com",
                displayName: "Bob Johnson",
                active: true
            },
            labels: ["backend", "security"],
            created: "2024-01-15T10:00:00.000+0000",
            updated: "2024-01-20T14:30:00.000+0000"
        },
        _status: "In Progress",
        _assignee: "5b109f2e9729b51b54dc274d",
        _project: "PROJ"
    },
    {
        id: "10002",
        key: "PROJ-2",
        self: "https://test-company.atlassian.net/rest/api/3/issue/10002",
        fields: {
            summary: "Fix login page CSS bug",
            description: createADFText("The login button is misaligned on mobile devices."),
            issuetype: {
                id: "10002",
                name: "Bug",
                description: "A bug in the system",
                iconUrl: "https://test-company.atlassian.net/images/icons/issuetypes/bug.svg",
                subtask: false
            },
            project: {
                id: "10000",
                key: "PROJ",
                name: "Sample Project",
                projectTypeKey: "software",
                self: "https://test-company.atlassian.net/rest/api/3/project/10000"
            },
            status: {
                id: "10000",
                name: "To Do",
                description: "Work has not started",
                statusCategory: {
                    id: 2,
                    key: "new",
                    name: "To Do",
                    colorName: "blue-gray"
                }
            },
            priority: {
                id: "3",
                name: "Medium",
                iconUrl: "https://test-company.atlassian.net/images/icons/priorities/medium.svg"
            },
            assignee: null,
            reporter: {
                accountId: "5b109f2e9729b51b54dc274e",
                emailAddress: "bob@example.com",
                displayName: "Bob Johnson",
                active: true
            },
            labels: ["frontend", "css"],
            created: "2024-01-16T09:00:00.000+0000",
            updated: "2024-01-16T09:00:00.000+0000"
        },
        _status: "To Do",
        _assignee: null,
        _project: "PROJ"
    },
    {
        id: "10003",
        key: "PROJ-3",
        self: "https://test-company.atlassian.net/rest/api/3/issue/10003",
        fields: {
            summary: "Database migration script",
            description: createADFText("Create migration script for v2.0 schema changes."),
            issuetype: {
                id: "10003",
                name: "Task",
                description: "A task to be done",
                iconUrl: "https://test-company.atlassian.net/images/icons/issuetypes/task.svg",
                subtask: false
            },
            project: {
                id: "10000",
                key: "PROJ",
                name: "Sample Project",
                projectTypeKey: "software",
                self: "https://test-company.atlassian.net/rest/api/3/project/10000"
            },
            status: {
                id: "10002",
                name: "Done",
                description: "Work is complete",
                statusCategory: {
                    id: 3,
                    key: "done",
                    name: "Done",
                    colorName: "green"
                }
            },
            priority: {
                id: "1",
                name: "Highest",
                iconUrl: "https://test-company.atlassian.net/images/icons/priorities/highest.svg"
            },
            assignee: {
                accountId: "5b109f2e9729b51b54dc274f",
                emailAddress: "carol@example.com",
                displayName: "Carol Williams",
                active: true
            },
            reporter: {
                accountId: "5b109f2e9729b51b54dc274d",
                emailAddress: "alice@example.com",
                displayName: "Alice Smith",
                active: true
            },
            labels: ["database", "migration"],
            created: "2024-01-10T08:00:00.000+0000",
            updated: "2024-01-18T16:00:00.000+0000"
        },
        _status: "Done",
        _assignee: "5b109f2e9729b51b54dc274f",
        _project: "PROJ"
    },
    {
        id: "10004",
        key: "MOBILE-1",
        self: "https://test-company.atlassian.net/rest/api/3/issue/10004",
        fields: {
            summary: "Implement push notifications",
            description: createADFText("Add push notification support for iOS and Android."),
            issuetype: {
                id: "10001",
                name: "Story",
                description: "A user story",
                iconUrl: "https://test-company.atlassian.net/images/icons/issuetypes/story.svg",
                subtask: false
            },
            project: {
                id: "10001",
                key: "MOBILE",
                name: "Mobile App",
                projectTypeKey: "software",
                self: "https://test-company.atlassian.net/rest/api/3/project/10001"
            },
            status: {
                id: "10001",
                name: "In Progress",
                description: "Work is being done",
                statusCategory: {
                    id: 4,
                    key: "indeterminate",
                    name: "In Progress",
                    colorName: "yellow"
                }
            },
            priority: {
                id: "2",
                name: "High",
                iconUrl: "https://test-company.atlassian.net/images/icons/priorities/high.svg"
            },
            assignee: {
                accountId: "5b109f2e9729b51b54dc274d",
                emailAddress: "alice@example.com",
                displayName: "Alice Smith",
                active: true
            },
            reporter: {
                accountId: "5b109f2e9729b51b54dc274d",
                emailAddress: "alice@example.com",
                displayName: "Alice Smith",
                active: true
            },
            labels: ["mobile", "notifications"],
            created: "2024-01-17T11:00:00.000+0000",
            updated: "2024-01-19T10:00:00.000+0000"
        },
        _status: "In Progress",
        _assignee: "5b109f2e9729b51b54dc274d",
        _project: "MOBILE"
    },
    {
        id: "10005",
        key: "PROJ-4",
        self: "https://test-company.atlassian.net/rest/api/3/issue/10005",
        fields: {
            summary: "API rate limiting implementation",
            description: createADFText("Implement rate limiting for public API endpoints."),
            issuetype: {
                id: "10003",
                name: "Task",
                description: "A task to be done",
                iconUrl: "https://test-company.atlassian.net/images/icons/issuetypes/task.svg",
                subtask: false
            },
            project: {
                id: "10000",
                key: "PROJ",
                name: "Sample Project",
                projectTypeKey: "software",
                self: "https://test-company.atlassian.net/rest/api/3/project/10000"
            },
            status: {
                id: "10000",
                name: "To Do",
                description: "Work has not started",
                statusCategory: {
                    id: 2,
                    key: "new",
                    name: "To Do",
                    colorName: "blue-gray"
                }
            },
            priority: {
                id: "2",
                name: "High",
                iconUrl: "https://test-company.atlassian.net/images/icons/priorities/high.svg"
            },
            assignee: {
                accountId: "5b109f2e9729b51b54dc274e",
                emailAddress: "bob@example.com",
                displayName: "Bob Johnson",
                active: true
            },
            reporter: {
                accountId: "5b109f2e9729b51b54dc274d",
                emailAddress: "alice@example.com",
                displayName: "Alice Smith",
                active: true
            },
            labels: ["backend", "api"],
            created: "2024-01-18T14:00:00.000+0000",
            updated: "2024-01-18T14:00:00.000+0000"
        },
        _status: "To Do",
        _assignee: "5b109f2e9729b51b54dc274e",
        _project: "PROJ"
    }
];

export const jiraFixtures: TestFixture[] = [
    // ========== ISSUE OPERATIONS ==========
    {
        operationId: "createIssue",
        provider: "jira",
        validCases: [
            {
                name: "create_basic_task",
                description: "Create a basic task issue",
                input: {
                    project: { key: "PROJ" },
                    issuetype: { name: "Task" },
                    summary: "Implement new feature"
                },
                expectedOutput: {
                    id: "10006",
                    key: "PROJ-5",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10006"
                }
            },
            {
                name: "create_story_with_description",
                description: "Create a story with ADF description",
                input: {
                    project: { key: "PROJ" },
                    issuetype: { name: "Story" },
                    summary: "User login feature",
                    description: createADFText("As a user, I want to log in securely.")
                },
                expectedOutput: {
                    id: "10007",
                    key: "PROJ-6",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10007"
                }
            },
            {
                name: "create_bug_with_priority",
                description: "Create a bug with high priority and labels",
                input: {
                    project: { key: "PROJ" },
                    issuetype: { name: "Bug" },
                    summary: "Application crashes on startup",
                    priority: { name: "Highest" },
                    labels: ["critical", "crash"]
                },
                expectedOutput: {
                    id: "10008",
                    key: "PROJ-7",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10008"
                }
            },
            {
                name: "create_issue_with_assignee",
                description: "Create issue assigned to a user",
                input: {
                    project: { key: "PROJ" },
                    issuetype: { name: "Task" },
                    summary: "Review code changes",
                    assignee: { accountId: "5b109f2e9729b51b54dc274d" }
                },
                expectedOutput: {
                    id: "10009",
                    key: "PROJ-8",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10009"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Create issue in non-existent project",
                input: {
                    project: { key: "INVALID" },
                    issuetype: { name: "Task" },
                    summary: "Test issue"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found or you do not have permission to view it",
                    retryable: false
                }
            },
            {
                name: "invalid_issue_type",
                description: "Create issue with invalid type",
                input: {
                    project: { key: "PROJ" },
                    issuetype: { name: "InvalidType" },
                    summary: "Test issue"
                },
                expectedError: {
                    type: "validation",
                    message: "Issue type 'InvalidType' is not valid for project PROJ",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getIssue",
        provider: "jira",
        validCases: [
            {
                name: "get_issue_by_key",
                description: "Get issue details by key",
                input: {
                    issueIdOrKey: "PROJ-1"
                },
                expectedOutput: {
                    id: "10001",
                    key: "PROJ-1",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10001",
                    fields: {
                        summary: "Implement user authentication",
                        issuetype: {
                            id: "10001",
                            name: "Story"
                        },
                        status: {
                            id: "10001",
                            name: "In Progress"
                        },
                        priority: {
                            id: "2",
                            name: "High"
                        },
                        assignee: {
                            accountId: "5b109f2e9729b51b54dc274d",
                            displayName: "Alice Smith"
                        }
                    }
                }
            },
            {
                name: "get_issue_by_id",
                description: "Get issue details by ID",
                input: {
                    issueIdOrKey: "10002"
                },
                expectedOutput: {
                    id: "10002",
                    key: "PROJ-2",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10002",
                    fields: {
                        summary: "Fix login page CSS bug",
                        issuetype: {
                            id: "10002",
                            name: "Bug"
                        },
                        status: {
                            id: "10000",
                            name: "To Do"
                        },
                        priority: {
                            id: "3",
                            name: "Medium"
                        },
                        assignee: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                description: "Issue does not exist",
                input: {
                    issueIdOrKey: "PROJ-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue does not exist or you do not have permission to see it",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateIssue",
        provider: "jira",
        validCases: [
            {
                name: "update_summary",
                description: "Update issue summary",
                input: {
                    issueIdOrKey: "PROJ-1",
                    fields: {
                        summary: "Updated: Implement user authentication"
                    }
                },
                expectedOutput: {
                    success: true
                }
            },
            {
                name: "update_multiple_fields",
                description: "Update multiple issue fields",
                input: {
                    issueIdOrKey: "PROJ-1",
                    fields: {
                        summary: "Updated summary",
                        description: createADFText("Updated description"),
                        labels: ["updated", "modified"]
                    }
                },
                expectedOutput: {
                    success: true
                }
            },
            {
                name: "update_assignee",
                description: "Reassign issue to another user",
                input: {
                    issueIdOrKey: "PROJ-1",
                    fields: {
                        assignee: { accountId: "5b109f2e9729b51b54dc274f" }
                    }
                },
                expectedOutput: {
                    success: true
                }
            }
        ],
        errorCases: [
            {
                name: "update_readonly_field",
                description: "Attempt to update a read-only field",
                input: {
                    issueIdOrKey: "PROJ-1",
                    fields: {
                        created: "2024-01-01T00:00:00.000Z"
                    }
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Field 'created' cannot be set. It is not on the appropriate screen, or it is read-only",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteIssue",
        provider: "jira",
        validCases: [
            {
                name: "delete_issue",
                description: "Delete an issue",
                input: {
                    issueIdOrKey: "PROJ-99"
                },
                expectedOutput: {
                    deleted: true
                }
            },
            {
                name: "delete_with_subtasks",
                description: "Delete issue and its subtasks",
                input: {
                    issueIdOrKey: "PROJ-100",
                    deleteSubtasks: true
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "delete_not_found",
                description: "Delete non-existent issue",
                input: {
                    issueIdOrKey: "PROJ-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue does not exist or you do not have permission to see it",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "assignIssue",
        provider: "jira",
        validCases: [
            {
                name: "assign_to_user",
                description: "Assign issue to a user",
                input: {
                    issueIdOrKey: "PROJ-1",
                    accountId: "5b109f2e9729b51b54dc274d"
                },
                expectedOutput: {
                    success: true
                }
            },
            {
                name: "unassign_issue",
                description: "Unassign issue",
                input: {
                    issueIdOrKey: "PROJ-1",
                    accountId: null
                },
                expectedOutput: {
                    success: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_assignee",
                description: "Assign to non-existent user",
                input: {
                    issueIdOrKey: "PROJ-1",
                    accountId: "invalid-account-id"
                },
                expectedError: {
                    type: "validation",
                    message: "The accountId 'invalid-account-id' does not exist",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "transitionIssue",
        provider: "jira",
        validCases: [
            {
                name: "transition_to_in_progress",
                description: "Transition issue to In Progress",
                input: {
                    issueIdOrKey: "PROJ-2",
                    transitionId: "21"
                },
                expectedOutput: {
                    message: "Issue transitioned successfully"
                }
            },
            {
                name: "transition_to_done",
                description: "Transition issue to Done with comment",
                input: {
                    issueIdOrKey: "PROJ-1",
                    transitionId: "31",
                    comment: createADFText("Completed and ready for review.")
                },
                expectedOutput: {
                    message: "Issue transitioned successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_transition",
                description: "Invalid transition for current status",
                input: {
                    issueIdOrKey: "PROJ-3",
                    transitionId: "21"
                },
                expectedError: {
                    type: "validation",
                    message: "It is not possible to transition this issue to the requested status",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "addComment",
        provider: "jira",
        validCases: [
            {
                name: "add_simple_comment",
                description: "Add a simple text comment",
                input: {
                    issueIdOrKey: "PROJ-1",
                    body: createADFText("This looks good. Approved!")
                },
                expectedOutput: {
                    id: "10100",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10001/comment/10100",
                    created: "2024-01-20T15:00:00.000+0000"
                }
            },
            {
                name: "add_formatted_comment",
                description: "Add a comment with formatting",
                input: {
                    issueIdOrKey: "PROJ-1",
                    body: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: "Please review the following:",
                                        marks: [{ type: "strong" }]
                                    }
                                ]
                            },
                            {
                                type: "bulletList",
                                content: [
                                    {
                                        type: "listItem",
                                        content: [
                                            {
                                                type: "paragraph",
                                                content: [{ type: "text", text: "Unit tests" }]
                                            }
                                        ]
                                    },
                                    {
                                        type: "listItem",
                                        content: [
                                            {
                                                type: "paragraph",
                                                content: [{ type: "text", text: "Documentation" }]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                },
                expectedOutput: {
                    id: "10101",
                    self: "https://test-company.atlassian.net/rest/api/3/issue/10001/comment/10101",
                    created: "2024-01-20T15:05:00.000+0000"
                }
            }
        ],
        errorCases: [
            {
                name: "comment_on_nonexistent_issue",
                description: "Add comment to non-existent issue",
                input: {
                    issueIdOrKey: "PROJ-99999",
                    body: createADFText("Test comment")
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue does not exist or you do not have permission to see it",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getComments",
        provider: "jira",
        validCases: [
            {
                name: "get_all_comments",
                description: "Get all comments for an issue",
                input: {
                    issueIdOrKey: "PROJ-1"
                },
                expectedOutput: {
                    comments: [
                        {
                            id: "10100",
                            self: "https://test-company.atlassian.net/rest/api/3/issue/10001/comment/10100",
                            author: {
                                accountId: "5b109f2e9729b51b54dc274e",
                                displayName: "Bob Johnson"
                            },
                            body: createADFText("This looks good. Approved!"),
                            created: "2024-01-20T15:00:00.000+0000",
                            updated: "2024-01-20T15:00:00.000+0000"
                        }
                    ],
                    startAt: 0,
                    maxResults: 50,
                    total: 1
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                description: "Issue does not exist",
                input: {
                    issueIdOrKey: "INVALID-999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue does not exist or you do not have permission to see it",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "linkIssues",
        provider: "jira",
        validCases: [
            {
                name: "link_blocks",
                description: "Create a 'blocks' link between issues",
                input: {
                    type: { name: "Blocks" },
                    inwardIssue: { key: "PROJ-1" },
                    outwardIssue: { key: "PROJ-2" }
                },
                expectedOutput: {
                    success: true
                }
            },
            {
                name: "link_relates_to",
                description: "Create a 'relates to' link",
                input: {
                    type: { name: "Relates" },
                    inwardIssue: { key: "PROJ-1" },
                    outwardIssue: { key: "PROJ-3" }
                },
                expectedOutput: {
                    success: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_link_type",
                description: "Create link with invalid type",
                input: {
                    type: { name: "InvalidLink" },
                    inwardIssue: { key: "PROJ-1" },
                    outwardIssue: { key: "PROJ-2" }
                },
                expectedError: {
                    type: "validation",
                    message: "No issue link type with name 'InvalidLink' found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "addAttachment",
        provider: "jira",
        validCases: [
            {
                name: "upload_attachment",
                description: "Upload a file attachment",
                input: {
                    issueIdOrKey: "PROJ-1",
                    fileName: "screenshot.png",
                    fileContent:
                        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                },
                expectedOutput: {
                    id: "10200",
                    self: "https://test-company.atlassian.net/rest/api/3/attachment/10200",
                    filename: "screenshot.png",
                    size: 68,
                    mimeType: "image/png",
                    created: "2024-01-20T16:00:00.000+0000"
                }
            }
        ],
        errorCases: [
            {
                name: "attachment_too_large",
                description: "File exceeds maximum attachment size",
                input: {
                    issueIdOrKey: "PROJ-1",
                    fileName: "large-file.zip",
                    fileContent: "base64-encoded-large-content"
                },
                expectedError: {
                    type: "validation",
                    message: "File size exceeds maximum allowed attachment size",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchIssues",
        provider: "jira",
        validCases: [
            {
                name: "search_all_issues",
                description: "Search all issues (returns all from filterableData)",
                input: {
                    jql: "project = PROJ",
                    maxResults: 50
                }
            },
            {
                name: "search_with_pagination",
                description: "Search with pagination (2 results)",
                input: {
                    jql: "project = PROJ",
                    startAt: 0,
                    maxResults: 2
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_jql",
                description: "Search with invalid JQL syntax",
                input: {
                    jql: "project = INVALID SYNTAX HERE",
                    maxResults: 50
                },
                expectedError: {
                    type: "validation",
                    message: "The value 'SYNTAX' does not exist for the field 'project'",
                    retryable: false
                }
            }
        ],
        filterableData: {
            records: sampleIssues,
            recordsField: "issues",
            offsetField: "startAt",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "maxResults",
            offsetParam: "startAt",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_assignee", "_project"]
            }
        }
    },

    // ========== PROJECT OPERATIONS ==========
    {
        operationId: "listProjects",
        provider: "jira",
        validCases: [
            {
                name: "list_all_projects",
                description: "List all accessible projects",
                input: {},
                expectedOutput: {
                    projects: [
                        {
                            id: "10000",
                            key: "PROJ",
                            name: "Sample Project",
                            projectTypeKey: "software",
                            isPrivate: false,
                            self: "https://test-company.atlassian.net/rest/api/3/project/10000",
                            avatarUrls: {
                                "48x48":
                                    "https://test-company.atlassian.net/secure/projectavatar?pid=10000&avatarId=10200"
                            }
                        },
                        {
                            id: "10001",
                            key: "MOBILE",
                            name: "Mobile App",
                            projectTypeKey: "software",
                            isPrivate: false,
                            self: "https://test-company.atlassian.net/rest/api/3/project/10001",
                            avatarUrls: {
                                "48x48":
                                    "https://test-company.atlassian.net/secure/projectavatar?pid=10001&avatarId=10201"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to list projects",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to view projects",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getProject",
        provider: "jira",
        validCases: [
            {
                name: "get_project_by_key",
                description: "Get project details by key",
                input: {
                    projectIdOrKey: "PROJ"
                },
                expectedOutput: {
                    id: "10000",
                    key: "PROJ",
                    name: "Sample Project",
                    description: "A sample software development project",
                    projectTypeKey: "software",
                    lead: {
                        accountId: "5b109f2e9729b51b54dc274d",
                        displayName: "Alice Smith"
                    },
                    issueTypes: [
                        { id: "10001", name: "Story" },
                        { id: "10002", name: "Bug" },
                        { id: "10003", name: "Task" }
                    ],
                    self: "https://test-company.atlassian.net/rest/api/3/project/10000"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectIdOrKey: "INVALID"
                },
                expectedError: {
                    type: "not_found",
                    message: "No project could be found with key 'INVALID'",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getIssueTypes",
        provider: "jira",
        validCases: [
            {
                name: "get_project_issue_types",
                description: "Get all issue types for a project",
                input: {
                    projectIdOrKey: "PROJ"
                },
                expectedOutput: {
                    issueTypes: [
                        {
                            id: "10001",
                            name: "Story",
                            description: "A user story",
                            iconUrl:
                                "https://test-company.atlassian.net/images/icons/issuetypes/story.svg",
                            subtask: false
                        },
                        {
                            id: "10002",
                            name: "Bug",
                            description: "A bug in the system",
                            iconUrl:
                                "https://test-company.atlassian.net/images/icons/issuetypes/bug.svg",
                            subtask: false
                        },
                        {
                            id: "10003",
                            name: "Task",
                            description: "A task to be done",
                            iconUrl:
                                "https://test-company.atlassian.net/images/icons/issuetypes/task.svg",
                            subtask: false
                        },
                        {
                            id: "10004",
                            name: "Sub-task",
                            description: "A sub-task of a parent issue",
                            iconUrl:
                                "https://test-company.atlassian.net/images/icons/issuetypes/subtask.svg",
                            subtask: true
                        },
                        {
                            id: "10005",
                            name: "Epic",
                            description: "A collection of related stories",
                            iconUrl:
                                "https://test-company.atlassian.net/images/icons/issuetypes/epic.svg",
                            subtask: false
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectIdOrKey: "INVALID"
                },
                expectedError: {
                    type: "not_found",
                    message: "No project could be found with key 'INVALID'",
                    retryable: false
                }
            }
        ]
    },

    // ========== USER OPERATIONS ==========
    {
        operationId: "getCurrentUser",
        provider: "jira",
        validCases: [
            {
                name: "get_current_user",
                description: "Get authenticated user details",
                input: {},
                expectedOutput: {
                    accountId: "5b109f2e9729b51b54dc274d",
                    accountType: "atlassian",
                    emailAddress: "alice@example.com",
                    displayName: "Alice Smith",
                    active: true,
                    timeZone: "America/New_York",
                    locale: "en_US",
                    avatarUrls: {
                        "48x48": "https://avatar-management.atlassian.net/avatar/alice.png",
                        "24x24": "https://avatar-management.atlassian.net/avatar/alice_small.png"
                    },
                    self: "https://test-company.atlassian.net/rest/api/3/user?accountId=5b109f2e9729b51b54dc274d"
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired authentication",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchUsers",
        provider: "jira",
        validCases: [
            {
                name: "search_by_query",
                description: "Search users by name or email",
                input: {
                    query: "alice"
                },
                expectedOutput: {
                    users: [
                        {
                            accountId: "5b109f2e9729b51b54dc274d",
                            accountType: "atlassian",
                            emailAddress: "alice@example.com",
                            displayName: "Alice Smith",
                            active: true
                        }
                    ]
                }
            },
            {
                name: "get_user_by_account_id",
                description: "Get specific user by account ID",
                input: {
                    accountId: "5b109f2e9729b51b54dc274e"
                },
                expectedOutput: {
                    accountId: "5b109f2e9729b51b54dc274e",
                    accountType: "atlassian",
                    emailAddress: "bob@example.com",
                    displayName: "Bob Johnson",
                    active: true
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User does not exist",
                input: {
                    accountId: "invalid-account-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            }
        ]
    },

    // ========== FIELD OPERATIONS ==========
    {
        operationId: "listFields",
        provider: "jira",
        validCases: [
            {
                name: "list_all_fields",
                description: "Get all fields including custom fields",
                input: {},
                expectedOutput: {
                    fields: [
                        {
                            id: "summary",
                            name: "Summary",
                            custom: false,
                            orderable: true,
                            navigable: true,
                            searchable: true,
                            schema: { type: "string", system: "summary" }
                        },
                        {
                            id: "description",
                            name: "Description",
                            custom: false,
                            orderable: true,
                            navigable: true,
                            searchable: true,
                            schema: { type: "string", system: "description" }
                        },
                        {
                            id: "status",
                            name: "Status",
                            custom: false,
                            orderable: true,
                            navigable: true,
                            searchable: true,
                            schema: { type: "status", system: "status" }
                        },
                        {
                            id: "customfield_10001",
                            name: "Story Points",
                            custom: true,
                            orderable: true,
                            navigable: true,
                            searchable: true,
                            schema: {
                                type: "number",
                                custom: "com.atlassian.jira.plugin.system.customfieldtypes:float",
                                customId: 10001
                            }
                        },
                        {
                            id: "customfield_10002",
                            name: "Sprint",
                            custom: true,
                            orderable: true,
                            navigable: true,
                            searchable: true,
                            schema: {
                                type: "array",
                                items: "string",
                                custom: "com.pyxis.greenhopper.jira:gh-sprint",
                                customId: 10002
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to view fields",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to view fields",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getCustomFieldConfigs",
        provider: "jira",
        validCases: [
            {
                name: "get_select_field_options",
                description: "Get options for a select custom field",
                input: {
                    fieldId: "customfield_10003"
                },
                expectedOutput: {
                    fieldId: "customfield_10003",
                    name: "Environment",
                    type: "com.atlassian.jira.plugin.system.customfieldtypes:select",
                    options: [
                        { id: "10100", value: "Production" },
                        { id: "10101", value: "Staging" },
                        { id: "10102", value: "Development" }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "field_not_found",
                description: "Custom field does not exist",
                input: {
                    fieldId: "customfield_99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Field not found",
                    retryable: false
                }
            }
        ]
    }
];
