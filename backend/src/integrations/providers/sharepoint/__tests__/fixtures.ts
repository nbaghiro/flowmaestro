/**
 * SharePoint Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const sharepointFixtures: TestFixture[] = [
    {
        operationId: "listSites",
        provider: "sharepoint",
        validCases: [
            {
                name: "list_all_sites",
                description: "List all accessible SharePoint sites",
                input: {},
                expectedOutput: {
                    sites: [
                        {
                            id: "contoso.sharepoint.com,site-id-1",
                            name: "Engineering",
                            displayName: "Engineering Team Site",
                            webUrl: "https://contoso.sharepoint.com/sites/engineering"
                        },
                        {
                            id: "contoso.sharepoint.com,site-id-2",
                            name: "Marketing",
                            displayName: "Marketing Team Site",
                            webUrl: "https://contoso.sharepoint.com/sites/marketing"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to list sites",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access denied",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getSite",
        provider: "sharepoint",
        validCases: [
            {
                name: "get_site_details",
                description: "Get details of a specific site",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1"
                },
                expectedOutput: {
                    id: "contoso.sharepoint.com,site-id-1",
                    name: "Engineering",
                    displayName: "Engineering Team Site",
                    webUrl: "https://contoso.sharepoint.com/sites/engineering",
                    description: "Engineering team collaboration site"
                }
            }
        ],
        errorCases: [
            {
                name: "site_not_found",
                description: "Site does not exist",
                input: {
                    siteId: "nonexistent-site"
                },
                expectedError: {
                    type: "not_found",
                    message: "Site not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listLists",
        provider: "sharepoint",
        validCases: [
            {
                name: "list_site_lists",
                description: "List all lists in a site",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1"
                },
                expectedOutput: {
                    lists: [
                        {
                            id: "list-id-1",
                            name: "Tasks",
                            displayName: "Tasks",
                            description: "Team task tracker"
                        },
                        {
                            id: "list-id-2",
                            name: "Contacts",
                            displayName: "Contacts",
                            description: "Team contacts"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "site_not_found",
                description: "Site does not exist",
                input: {
                    siteId: "nonexistent-site"
                },
                expectedError: {
                    type: "not_found",
                    message: "Site not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getList",
        provider: "sharepoint",
        validCases: [
            {
                name: "get_list_details",
                description: "Get details of a specific list",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1",
                    listId: "list-id-1"
                },
                expectedOutput: {
                    id: "list-id-1",
                    name: "Tasks",
                    displayName: "Tasks",
                    description: "Team task tracker"
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1",
                    listId: "nonexistent-list"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listItems",
        provider: "sharepoint",
        validCases: [
            {
                name: "list_items_with_fields",
                description: "List items in a list with expanded fields",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1",
                    listId: "list-id-1"
                },
                expectedOutput: {
                    items: [
                        {
                            id: "1",
                            fields: {
                                Title: "Implement feature X",
                                Status: "In Progress",
                                AssignedTo: "John Doe"
                            }
                        },
                        {
                            id: "2",
                            fields: {
                                Title: "Review PR #42",
                                Status: "Done",
                                AssignedTo: "Jane Smith"
                            }
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1",
                    listId: "nonexistent-list"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createItem",
        provider: "sharepoint",
        validCases: [
            {
                name: "create_list_item",
                description: "Create a new list item",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1",
                    listId: "list-id-1",
                    fields: {
                        Title: "New task",
                        Status: "Not Started",
                        AssignedTo: "John Doe"
                    }
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    fields: {
                        Title: "New task",
                        Status: "Not Started",
                        AssignedTo: "John Doe"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_fields",
                description: "Invalid field names in request",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1",
                    listId: "list-id-1",
                    fields: {
                        NonExistentField: "value"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid field: NonExistentField",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listDriveItems",
        provider: "sharepoint",
        validCases: [
            {
                name: "list_root_files",
                description: "List files in site document library root",
                input: {
                    siteId: "contoso.sharepoint.com,site-id-1"
                },
                expectedOutput: {
                    items: [
                        {
                            id: "drive-item-1",
                            name: "Project Plan.docx",
                            size: 204800,
                            file: {
                                mimeType:
                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            }
                        },
                        {
                            id: "drive-item-2",
                            name: "Reports",
                            folder: { childCount: 5 }
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "site_not_found",
                description: "Site does not exist",
                input: {
                    siteId: "nonexistent-site"
                },
                expectedError: {
                    type: "not_found",
                    message: "Site not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchContent",
        provider: "sharepoint",
        validCases: [
            {
                name: "search_across_sites",
                description: "Search content across all SharePoint sites",
                input: {
                    query: "project plan"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "hit-1",
                            summary: "...project plan for Q1...",
                            resource: {
                                name: "Q1 Project Plan.docx",
                                webUrl: "https://contoso.sharepoint.com/sites/engineering/Q1 Project Plan.docx"
                            }
                        }
                    ],
                    total: 1
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Too many search requests",
                input: {
                    query: "report"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too many requests. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
