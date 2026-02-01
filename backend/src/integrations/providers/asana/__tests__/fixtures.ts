/**
 * Asana Provider Test Fixtures
 *
 * Contains comprehensive test fixtures for all Asana operations including
 * projects, tasks, sections, users, workspaces, teams, tags, and comments.
 */

import type { TestFixture } from "../../../sandbox";

// Common GIDs used across fixtures for consistency
const WORKSPACE_GID = "1205678901234567";
const TEAM_GID = "1206789012345678";
const PROJECT_GID = "1207890123456789";
const SECTION_GID = "1208901234567890";
const TASK_GID = "1209012345678901";
const SUBTASK_GID = "1210123456789012";
const USER_GID = "1201234567890123";
const TAG_GID = "1211234567890123";
const COMMENT_GID = "1212345678901234";
const NONEXISTENT_GID = "9999999999999999";

export const asanaFixtures: TestFixture[] = [
    // ============================================================================
    // PROJECT OPERATIONS
    // ============================================================================
    {
        operationId: "createProject",
        provider: "asana",
        validCases: [
            {
                name: "basic_createProject",
                description: "Create a new project in Asana within a workspace.",
                input: {
                    workspace: WORKSPACE_GID,
                    name: "Q1 2024 Product Launch"
                },
                expectedOutput: {
                    gid: PROJECT_GID,
                    name: "Q1 2024 Product Launch",
                    resource_type: "project",
                    permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace: NONEXISTENT_GID,
                    name: "Test Project"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID,
                    name: "Test Project"
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
        operationId: "deleteProject",
        provider: "asana",
        validCases: [
            {
                name: "basic_deleteProject",
                description: "Delete a project from Asana. This action cannot be undone.",
                input: {
                    project_gid: PROJECT_GID
                },
                expectedOutput: {
                    deleted: true,
                    project_gid: PROJECT_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project not found",
                input: {
                    project_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    project_gid: PROJECT_GID
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
        operationId: "getProject",
        provider: "asana",
        validCases: [
            {
                name: "basic_getProject",
                description: "Retrieve a specific project from Asana by its GID.",
                input: {
                    project_gid: PROJECT_GID
                },
                expectedOutput: {
                    gid: PROJECT_GID,
                    name: "Q1 2024 Product Launch",
                    resource_type: "project",
                    notes: "Launch preparation for the new product line.",
                    color: "dark-blue",
                    archived: false,
                    public: true,
                    created_at: "2024-01-15T10:30:00.000Z",
                    modified_at: "2024-02-20T14:45:00.000Z",
                    permalink_url: `https://app.asana.com/0/${PROJECT_GID}`,
                    workspace: {
                        gid: WORKSPACE_GID,
                        name: "Acme Corporation"
                    },
                    owner: {
                        gid: USER_GID,
                        name: "Sarah Chen"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project not found",
                input: {
                    project_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    project_gid: PROJECT_GID
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
        operationId: "listProjects",
        provider: "asana",
        validCases: [
            {
                name: "basic_listProjects",
                description: "List projects from a workspace in Asana.",
                input: {
                    workspace: WORKSPACE_GID,
                    limit: 50
                },
                expectedOutput: {
                    projects: [
                        {
                            gid: PROJECT_GID,
                            name: "Q1 2024 Product Launch",
                            resource_type: "project"
                        },
                        {
                            gid: "1207890123456790",
                            name: "Engineering Roadmap 2024",
                            resource_type: "project"
                        },
                        {
                            gid: "1207890123456791",
                            name: "Customer Success Initiatives",
                            resource_type: "project"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID
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
        operationId: "updateProject",
        provider: "asana",
        validCases: [
            {
                name: "basic_updateProject",
                description: "Update an existing project name in Asana.",
                input: {
                    project_gid: PROJECT_GID,
                    name: "Q1 2024 Product Launch - Final Phase"
                },
                expectedOutput: {
                    gid: PROJECT_GID,
                    name: "Q1 2024 Product Launch - Final Phase",
                    resource_type: "project",
                    permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project not found",
                input: {
                    project_gid: NONEXISTENT_GID,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    project_gid: PROJECT_GID,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // SECTION OPERATIONS
    // ============================================================================
    {
        operationId: "addTaskToSection",
        provider: "asana",
        validCases: [
            {
                name: "basic_addTaskToSection",
                description: "Add or move a task to a specific section within a project.",
                input: {
                    section_gid: SECTION_GID,
                    task: TASK_GID
                },
                expectedOutput: {
                    added: true,
                    task_gid: TASK_GID,
                    section_gid: SECTION_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Section or task not found",
                input: {
                    section_gid: NONEXISTENT_GID,
                    task: TASK_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Section not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    section_gid: SECTION_GID,
                    task: TASK_GID
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
        operationId: "createSection",
        provider: "asana",
        validCases: [
            {
                name: "basic_createSection",
                description: "Create a new section in a project.",
                input: {
                    project: PROJECT_GID,
                    name: "In Progress"
                },
                expectedOutput: {
                    gid: SECTION_GID,
                    name: "In Progress",
                    resource_type: "section",
                    project_gid: PROJECT_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project not found",
                input: {
                    project: NONEXISTENT_GID,
                    name: "New Section"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    project: PROJECT_GID,
                    name: "New Section"
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
        operationId: "deleteSection",
        provider: "asana",
        validCases: [
            {
                name: "basic_deleteSection",
                description:
                    "Delete a section from Asana. Tasks in the section will not be deleted.",
                input: {
                    section_gid: SECTION_GID
                },
                expectedOutput: {
                    deleted: true,
                    section_gid: SECTION_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Section not found",
                input: {
                    section_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Section not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    section_gid: SECTION_GID
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
        operationId: "getSection",
        provider: "asana",
        validCases: [
            {
                name: "basic_getSection",
                description: "Retrieve a specific section from Asana by its GID.",
                input: {
                    section_gid: SECTION_GID
                },
                expectedOutput: {
                    gid: SECTION_GID,
                    name: "In Progress",
                    resource_type: "section",
                    created_at: "2024-01-15T10:30:00.000Z",
                    project: {
                        gid: PROJECT_GID,
                        name: "Q1 2024 Product Launch"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Section not found",
                input: {
                    section_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Section not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    section_gid: SECTION_GID
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
        operationId: "listSections",
        provider: "asana",
        validCases: [
            {
                name: "basic_listSections",
                description: "List all sections in a project.",
                input: {
                    project: PROJECT_GID,
                    limit: 50
                },
                expectedOutput: {
                    sections: [
                        {
                            gid: "1208901234567889",
                            name: "Backlog",
                            resource_type: "section"
                        },
                        {
                            gid: "1208901234567890",
                            name: "To Do",
                            resource_type: "section"
                        },
                        {
                            gid: SECTION_GID,
                            name: "In Progress",
                            resource_type: "section"
                        },
                        {
                            gid: "1208901234567892",
                            name: "Review",
                            resource_type: "section"
                        },
                        {
                            gid: "1208901234567893",
                            name: "Done",
                            resource_type: "section"
                        }
                    ],
                    count: 5,
                    project_gid: PROJECT_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project not found",
                input: {
                    project: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    project: PROJECT_GID
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
        operationId: "updateSection",
        provider: "asana",
        validCases: [
            {
                name: "basic_updateSection",
                description: "Update an existing section in Asana (e.g., rename it).",
                input: {
                    section_gid: SECTION_GID,
                    name: "Work in Progress"
                },
                expectedOutput: {
                    gid: SECTION_GID,
                    name: "Work in Progress",
                    resource_type: "section"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Section not found",
                input: {
                    section_gid: NONEXISTENT_GID,
                    name: "Updated Section"
                },
                expectedError: {
                    type: "not_found",
                    message: "Section not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    section_gid: SECTION_GID,
                    name: "Updated Section"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // TASK OPERATIONS
    // ============================================================================
    {
        operationId: "addCommentToTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_addCommentToTask",
                description: "Add a comment (story) to a task in Asana.",
                input: {
                    task_gid: TASK_GID,
                    text: "Great progress on this task! Let me know if you need any help with the API integration."
                },
                expectedOutput: {
                    gid: COMMENT_GID,
                    text: "Great progress on this task! Let me know if you need any help with the API integration.",
                    resource_type: "story",
                    created_at: "2024-02-20T14:30:00.000Z",
                    task_gid: TASK_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task not found",
                input: {
                    task_gid: NONEXISTENT_GID,
                    text: "Test comment"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID,
                    text: "Test comment"
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
        operationId: "addTagToTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_addTagToTask",
                description: "Add a tag to a task in Asana.",
                input: {
                    task_gid: TASK_GID,
                    tag: TAG_GID
                },
                expectedOutput: {
                    added: true,
                    task_gid: TASK_GID,
                    tag_gid: TAG_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task or tag not found",
                input: {
                    task_gid: NONEXISTENT_GID,
                    tag: TAG_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID,
                    tag: TAG_GID
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
        operationId: "addTaskToProject",
        provider: "asana",
        validCases: [
            {
                name: "basic_addTaskToProject",
                description: "Add an existing task to a project.",
                input: {
                    task_gid: TASK_GID,
                    project: PROJECT_GID
                },
                expectedOutput: {
                    added: true,
                    task_gid: TASK_GID,
                    project_gid: PROJECT_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task or project not found",
                input: {
                    task_gid: NONEXISTENT_GID,
                    project: PROJECT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID,
                    project: PROJECT_GID
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
        operationId: "createSubtask",
        provider: "asana",
        validCases: [
            {
                name: "basic_createSubtask",
                description: "Create a subtask under a parent task in Asana.",
                input: {
                    parent_task_gid: TASK_GID,
                    name: "Write unit tests for authentication module"
                },
                expectedOutput: {
                    gid: SUBTASK_GID,
                    name: "Write unit tests for authentication module",
                    resource_type: "task",
                    permalink_url: `https://app.asana.com/0/0/${SUBTASK_GID}`,
                    parent_gid: TASK_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Parent task not found",
                input: {
                    parent_task_gid: NONEXISTENT_GID,
                    name: "Test Subtask"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    parent_task_gid: TASK_GID,
                    name: "Test Subtask"
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
        operationId: "createTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_createTask",
                description: "Create a new task in Asana with minimal fields.",
                input: {
                    workspace: WORKSPACE_GID,
                    name: "Implement user authentication flow"
                },
                expectedOutput: {
                    gid: TASK_GID,
                    name: "Implement user authentication flow",
                    resource_type: "task",
                    permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace: NONEXISTENT_GID,
                    name: "Test Task"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID,
                    name: "Test Task"
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
        operationId: "deleteTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_deleteTask",
                description: "Delete a task from Asana. This action cannot be undone.",
                input: {
                    task_gid: TASK_GID
                },
                expectedOutput: {
                    deleted: true,
                    task_gid: TASK_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task not found",
                input: {
                    task_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID
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
        operationId: "getSubtasks",
        provider: "asana",
        validCases: [
            {
                name: "basic_getSubtasks",
                description: "Get all subtasks of a parent task in Asana.",
                input: {
                    task_gid: TASK_GID,
                    limit: 50
                },
                expectedOutput: {
                    subtasks: [
                        {
                            gid: SUBTASK_GID,
                            name: "Write unit tests for authentication module",
                            resource_type: "task"
                        },
                        {
                            gid: "1210123456789013",
                            name: "Update API documentation",
                            resource_type: "task"
                        },
                        {
                            gid: "1210123456789014",
                            name: "Code review and merge",
                            resource_type: "task"
                        }
                    ],
                    count: 3,
                    parent_gid: TASK_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Parent task not found",
                input: {
                    task_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID
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
        operationId: "getTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_getTask",
                description: "Retrieve a specific task from Asana by its GID.",
                input: {
                    task_gid: TASK_GID
                },
                expectedOutput: {
                    gid: TASK_GID,
                    name: "Implement user authentication flow",
                    resource_type: "task",
                    notes: "Build OAuth2 integration with support for Google and GitHub providers.",
                    completed: false,
                    completed_at: null,
                    due_on: "2024-03-15",
                    start_on: "2024-02-15",
                    created_at: "2024-02-01T09:00:00.000Z",
                    modified_at: "2024-02-20T14:30:00.000Z",
                    permalink_url: `https://app.asana.com/0/0/${TASK_GID}`,
                    assignee: {
                        gid: USER_GID,
                        name: "Sarah Chen"
                    },
                    workspace: {
                        gid: WORKSPACE_GID,
                        name: "Acme Corporation"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task not found",
                input: {
                    task_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID
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
        operationId: "getTaskComments",
        provider: "asana",
        validCases: [
            {
                name: "basic_getTaskComments",
                description: "Get all comments (stories) on a task in Asana.",
                input: {
                    task_gid: TASK_GID,
                    limit: 50
                },
                expectedOutput: {
                    comments: [
                        {
                            gid: COMMENT_GID,
                            text: "Started working on the OAuth integration.",
                            resource_subtype: "comment_added",
                            created_at: "2024-02-15T10:00:00.000Z",
                            created_by: {
                                gid: USER_GID,
                                name: "Sarah Chen"
                            }
                        },
                        {
                            gid: "1212345678901235",
                            text: "Google OAuth implementation complete. Moving on to GitHub.",
                            resource_subtype: "comment_added",
                            created_at: "2024-02-18T16:30:00.000Z",
                            created_by: {
                                gid: USER_GID,
                                name: "Sarah Chen"
                            }
                        }
                    ],
                    count: 2,
                    task_gid: TASK_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task not found",
                input: {
                    task_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID
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
        operationId: "listTasks",
        provider: "asana",
        validCases: [
            {
                name: "listTasks_by_project",
                description: "List tasks from a project in Asana.",
                input: {
                    project: PROJECT_GID,
                    limit: 50
                },
                expectedOutput: {
                    tasks: [
                        {
                            gid: TASK_GID,
                            name: "Implement user authentication flow",
                            resource_type: "task"
                        },
                        {
                            gid: "1209012345678902",
                            name: "Design new dashboard UI",
                            resource_type: "task"
                        },
                        {
                            gid: "1209012345678903",
                            name: "Set up CI/CD pipeline",
                            resource_type: "task"
                        },
                        {
                            gid: "1209012345678904",
                            name: "Write API documentation",
                            resource_type: "task"
                        }
                    ],
                    count: 4
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project not found",
                input: {
                    project: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "validation",
                description: "Missing required filter",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "validation",
                    message:
                        "At least one filter is required: project, section, or assignee with workspace",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    project: PROJECT_GID
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
        operationId: "removeTagFromTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_removeTagFromTask",
                description: "Remove a tag from a task in Asana.",
                input: {
                    task_gid: TASK_GID,
                    tag: TAG_GID
                },
                expectedOutput: {
                    removed: true,
                    task_gid: TASK_GID,
                    tag_gid: TAG_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task or tag not found",
                input: {
                    task_gid: NONEXISTENT_GID,
                    tag: TAG_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID,
                    tag: TAG_GID
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
        operationId: "removeTaskFromProject",
        provider: "asana",
        validCases: [
            {
                name: "basic_removeTaskFromProject",
                description:
                    "Remove a task from a project. The task will still exist but no longer be part of the project.",
                input: {
                    task_gid: TASK_GID,
                    project: PROJECT_GID
                },
                expectedOutput: {
                    removed: true,
                    task_gid: TASK_GID,
                    project_gid: PROJECT_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task or project not found",
                input: {
                    task_gid: NONEXISTENT_GID,
                    project: PROJECT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID,
                    project: PROJECT_GID
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
        operationId: "searchTasks",
        provider: "asana",
        validCases: [
            {
                name: "basic_searchTasks",
                description: "Search for tasks in a workspace using text search.",
                input: {
                    workspace: WORKSPACE_GID,
                    text: "permission",
                    limit: 50
                },
                expectedOutput: {
                    tasks: [
                        {
                            gid: TASK_GID,
                            name: "Implement user authentication flow",
                            resource_type: "task"
                        },
                        {
                            gid: "1209012345678906",
                            name: "Set up two-factor authentication",
                            resource_type: "task"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace: NONEXISTENT_GID,
                    text: "test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID,
                    text: "test"
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
        operationId: "updateTask",
        provider: "asana",
        validCases: [
            {
                name: "basic_updateTask",
                description: "Update task name and notes.",
                input: {
                    task_gid: TASK_GID,
                    name: "Implement OAuth2 authentication flow",
                    notes: "Updated: Build OAuth2 integration with support for Google, GitHub, and Microsoft providers."
                },
                expectedOutput: {
                    gid: TASK_GID,
                    name: "Implement OAuth2 authentication flow",
                    resource_type: "task",
                    permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task not found",
                input: {
                    task_gid: NONEXISTENT_GID,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    task_gid: TASK_GID,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // USER OPERATIONS
    // ============================================================================
    {
        operationId: "getCurrentUser",
        provider: "asana",
        validCases: [
            {
                name: "basic_getCurrentUser",
                description: "Get the currently authenticated Asana user.",
                input: {},
                expectedOutput: {
                    gid: USER_GID,
                    name: "Sarah Chen",
                    email: "sarah.chen@acmecorp.com",
                    resource_type: "user",
                    photo: {
                        image_128x128: "https://asana.com/photos/sarah_chen_128.png"
                    },
                    workspaces: [
                        {
                            gid: WORKSPACE_GID,
                            name: "Acme Corporation"
                        },
                        {
                            gid: "1205678901234568",
                            name: "Personal Projects"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Authentication failed",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired access token",
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
        operationId: "getUser",
        provider: "asana",
        validCases: [
            {
                name: "basic_getUser",
                description: "Retrieve a specific user from Asana by their GID.",
                input: {
                    user_gid: USER_GID
                },
                expectedOutput: {
                    gid: USER_GID,
                    name: "Sarah Chen",
                    email: "sarah.chen@acmecorp.com",
                    resource_type: "user",
                    photo: {
                        image_128x128: "https://asana.com/photos/sarah_chen_128.png"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "User not found",
                input: {
                    user_gid: NONEXISTENT_GID
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
                    user_gid: USER_GID
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
        operationId: "getWorkspace",
        provider: "asana",
        validCases: [
            {
                name: "basic_getWorkspace",
                description: "Retrieve a specific workspace from Asana by its GID.",
                input: {
                    workspace_gid: WORKSPACE_GID
                },
                expectedOutput: {
                    gid: WORKSPACE_GID,
                    name: "Acme Corporation",
                    resource_type: "workspace",
                    is_organization: true,
                    email_domains: ["acmecorp.com"]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace_gid: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace_gid: WORKSPACE_GID
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
        operationId: "listTags",
        provider: "asana",
        validCases: [
            {
                name: "basic_listTags",
                description: "List all tags in a workspace.",
                input: {
                    workspace: WORKSPACE_GID,
                    limit: 50
                },
                expectedOutput: {
                    tags: [
                        {
                            gid: TAG_GID,
                            name: "Backend",
                            resource_type: "tag",
                            color: "dark-blue"
                        },
                        {
                            gid: "1211234567890124",
                            name: "High Priority",
                            resource_type: "tag",
                            color: "dark-red"
                        },
                        {
                            gid: "1211234567890125",
                            name: "Frontend",
                            resource_type: "tag",
                            color: "dark-green"
                        },
                        {
                            gid: "1211234567890126",
                            name: "Bug",
                            resource_type: "tag",
                            color: "dark-orange"
                        },
                        {
                            gid: "1211234567890127",
                            name: "Feature Request",
                            resource_type: "tag",
                            color: "dark-purple"
                        }
                    ],
                    count: 5,
                    workspace_gid: WORKSPACE_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID
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
        operationId: "listTeams",
        provider: "asana",
        validCases: [
            {
                name: "basic_listTeams",
                description: "List all teams in an organization workspace.",
                input: {
                    workspace: WORKSPACE_GID,
                    limit: 50
                },
                expectedOutput: {
                    teams: [
                        {
                            gid: TEAM_GID,
                            name: "Engineering",
                            resource_type: "team"
                        },
                        {
                            gid: "1206789012345679",
                            name: "Product",
                            resource_type: "team"
                        },
                        {
                            gid: "1206789012345680",
                            name: "Design",
                            resource_type: "team"
                        },
                        {
                            gid: "1206789012345681",
                            name: "Marketing",
                            resource_type: "team"
                        },
                        {
                            gid: "1206789012345682",
                            name: "Customer Success",
                            resource_type: "team"
                        }
                    ],
                    count: 5,
                    workspace_gid: WORKSPACE_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found or not an organization",
                input: {
                    workspace: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found or not an organization",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID
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
        provider: "asana",
        validCases: [
            {
                name: "basic_listUsers",
                description: "List all users in a workspace.",
                input: {
                    workspace: WORKSPACE_GID,
                    limit: 50
                },
                expectedOutput: {
                    users: [
                        {
                            gid: USER_GID,
                            name: "Sarah Chen",
                            resource_type: "user"
                        },
                        {
                            gid: "1201234567890124",
                            name: "Mike Johnson",
                            resource_type: "user"
                        },
                        {
                            gid: "1201234567890125",
                            name: "Emily Davis",
                            resource_type: "user"
                        },
                        {
                            gid: "1201234567890126",
                            name: "Alex Rodriguez",
                            resource_type: "user"
                        },
                        {
                            gid: "1201234567890127",
                            name: "Jessica Kim",
                            resource_type: "user"
                        }
                    ],
                    count: 5,
                    workspace_gid: WORKSPACE_GID
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Workspace not found",
                input: {
                    workspace: NONEXISTENT_GID
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace: WORKSPACE_GID
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
        operationId: "listWorkspaces",
        provider: "asana",
        validCases: [
            {
                name: "basic_listWorkspaces",
                description: "List all workspaces the authenticated user has access to.",
                input: {
                    limit: 50
                },
                expectedOutput: {
                    workspaces: [
                        {
                            gid: WORKSPACE_GID,
                            name: "Acme Corporation",
                            resource_type: "workspace"
                        },
                        {
                            gid: "1205678901234568",
                            name: "Personal Projects",
                            resource_type: "workspace"
                        },
                        {
                            gid: "1205678901234569",
                            name: "Freelance Clients",
                            resource_type: "workspace"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Authentication failed",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired access token",
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
    }
];
