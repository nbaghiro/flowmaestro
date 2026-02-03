/**
 * Power BI Provider Test Fixtures
 *
 * Based on Power BI REST API response structures.
 * https://learn.microsoft.com/en-us/rest/api/power-bi/
 */

import type { TestFixture } from "../../../sandbox";

// Sample IDs
const SAMPLE_WORKSPACE_ID = "f089354e-8366-4e18-aea3-4cb4a3a50b48";
const SAMPLE_REPORT_ID = "5b218778-e7a5-4d73-8187-f10824047715";
const SAMPLE_DATASET_ID = "cfafbeb1-8037-4d0c-896e-a46fb27ff229";
const SAMPLE_DASHBOARD_ID = "69ffaa6c-b36d-4d01-96f5-1ed67c64d4af";

export const powerBIFixtures: TestFixture[] = [
    // ========== WORKSPACE OPERATIONS ==========
    {
        operationId: "listWorkspaces",
        provider: "power-bi",
        validCases: [
            {
                name: "list_all_workspaces",
                description: "List all accessible workspaces",
                input: {},
                expectedOutput: {
                    "@odata.context": "http://api.powerbi.com/v1.0/myorg/$metadata#groups",
                    "@odata.count": 3,
                    value: [
                        {
                            id: SAMPLE_WORKSPACE_ID,
                            name: "Sales Analytics",
                            isReadOnly: false,
                            isOnDedicatedCapacity: true,
                            capacityId: "0f084df7-c13d-451b-af5f-ed0c466403b2",
                            type: "Workspace"
                        },
                        {
                            id: "a2f89923-421a-464e-bf4c-25eab39bb09f",
                            name: "Marketing Reports",
                            isReadOnly: false,
                            isOnDedicatedCapacity: false,
                            type: "Workspace"
                        },
                        {
                            id: "b3c90034-532b-575f-cg5d-36fac40cc10g",
                            name: "Finance Dashboard",
                            isReadOnly: true,
                            isOnDedicatedCapacity: true,
                            type: "Workspace"
                        }
                    ]
                }
            },
            {
                name: "list_workspaces_filtered",
                description: "List workspaces with filter",
                input: {
                    filter: "contains(name,'Sales')",
                    top: 10
                },
                expectedOutput: {
                    "@odata.context": "http://api.powerbi.com/v1.0/myorg/$metadata#groups",
                    "@odata.count": 1,
                    value: [
                        {
                            id: SAMPLE_WORKSPACE_ID,
                            name: "Sales Analytics",
                            isReadOnly: false,
                            isOnDedicatedCapacity: true,
                            type: "Workspace"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "User not authorized",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "User is not authorized to access workspaces",
                    retryable: false
                }
            }
        ]
    },

    // ========== REPORT OPERATIONS ==========
    {
        operationId: "listReports",
        provider: "power-bi",
        validCases: [
            {
                name: "list_workspace_reports",
                description: "List all reports in a workspace",
                input: {
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {
                    "@odata.context":
                        "http://api.powerbi.com/v1.0/myorg/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/$metadata#reports",
                    value: [
                        {
                            id: SAMPLE_REPORT_ID,
                            name: "Q4 Sales Report",
                            webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/reports/5b218778-e7a5-4d73-8187-f10824047715",
                            embedUrl:
                                "https://app.powerbi.com/reportEmbed?reportId=5b218778-e7a5-4d73-8187-f10824047715&groupId=f089354e-8366-4e18-aea3-4cb4a3a50b48",
                            datasetId: SAMPLE_DATASET_ID,
                            reportType: "PowerBIReport",
                            description: "Quarterly sales performance report"
                        },
                        {
                            id: "6c329889-f8b6-5e84-9298-g21935158826",
                            name: "Regional Performance",
                            webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/reports/6c329889-f8b6-5e84-9298-g21935158826",
                            datasetId: SAMPLE_DATASET_ID,
                            reportType: "PowerBIReport"
                        }
                    ]
                }
            },
            {
                name: "list_my_workspace_reports",
                description: "List reports from My Workspace",
                input: {},
                expectedOutput: {
                    "@odata.context": "http://api.powerbi.com/v1.0/myorg/$metadata#reports",
                    value: [
                        {
                            id: "personal-report-id",
                            name: "Personal Dashboard",
                            webUrl: "https://app.powerbi.com/reports/personal-report-id",
                            reportType: "PowerBIReport"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspaceId: "non-existent-workspace-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getReport",
        provider: "power-bi",
        validCases: [
            {
                name: "get_report_details",
                description: "Get details of a specific report",
                input: {
                    reportId: SAMPLE_REPORT_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {
                    id: SAMPLE_REPORT_ID,
                    name: "Q4 Sales Report",
                    webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/reports/5b218778-e7a5-4d73-8187-f10824047715",
                    embedUrl:
                        "https://app.powerbi.com/reportEmbed?reportId=5b218778-e7a5-4d73-8187-f10824047715&groupId=f089354e-8366-4e18-aea3-4cb4a3a50b48",
                    datasetId: SAMPLE_DATASET_ID,
                    reportType: "PowerBIReport",
                    description: "Quarterly sales performance report",
                    createdDateTime: "2024-01-15T10:30:00Z",
                    modifiedDateTime: "2024-01-20T14:45:00Z",
                    modifiedBy: "user@company.com"
                }
            }
        ],
        errorCases: [
            {
                name: "report_not_found",
                description: "Report does not exist",
                input: {
                    reportId: "non-existent-report-id",
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedError: {
                    type: "not_found",
                    message: "Report not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "exportReport",
        provider: "power-bi",
        validCases: [
            {
                name: "export_report_to_pdf",
                description: "Export report to PDF",
                input: {
                    reportId: SAMPLE_REPORT_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID,
                    format: "PDF"
                },
                expectedOutput: {
                    id: "export-request-id-123",
                    createdDateTime: "2024-01-20T15:00:00Z",
                    status: "Running",
                    percentComplete: 0,
                    reportId: SAMPLE_REPORT_ID,
                    reportName: "Q4 Sales Report",
                    resourceLocation: null
                }
            },
            {
                name: "export_specific_pages",
                description: "Export specific report pages to PPTX",
                input: {
                    reportId: SAMPLE_REPORT_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID,
                    format: "PPTX",
                    pages: ["Overview", "Sales by Region"]
                },
                expectedOutput: {
                    id: "export-request-id-456",
                    createdDateTime: "2024-01-20T15:05:00Z",
                    status: "Running",
                    percentComplete: 0,
                    reportId: SAMPLE_REPORT_ID,
                    reportName: "Q4 Sales Report"
                }
            }
        ],
        errorCases: [
            {
                name: "export_not_supported",
                description: "Report does not support export",
                input: {
                    reportId: "paginated-report-id",
                    workspaceId: SAMPLE_WORKSPACE_ID,
                    format: "PDF"
                },
                expectedError: {
                    type: "validation",
                    message: "Export is not supported for this report type",
                    retryable: false
                }
            }
        ]
    },

    // ========== DATASET OPERATIONS ==========
    {
        operationId: "listDatasets",
        provider: "power-bi",
        validCases: [
            {
                name: "list_workspace_datasets",
                description: "List all datasets in a workspace",
                input: {
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {
                    "@odata.context":
                        "http://api.powerbi.com/v1.0/myorg/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/$metadata#datasets",
                    value: [
                        {
                            id: SAMPLE_DATASET_ID,
                            name: "Sales Data",
                            webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/datasets/cfafbeb1-8037-4d0c-896e-a46fb27ff229",
                            addRowsAPIEnabled: false,
                            configuredBy: "admin@company.com",
                            isRefreshable: true,
                            isEffectiveIdentityRequired: false,
                            isOnPremGatewayRequired: false,
                            targetStorageMode: "Abf"
                        },
                        {
                            id: "dgbgcfc2-9148-5e1d-907f-b57gc38gg33a",
                            name: "Customer Data",
                            webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/datasets/dgbgcfc2-9148-5e1d-907f-b57gc38gg33a",
                            isRefreshable: true,
                            configuredBy: "analyst@company.com"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspaceId: "invalid-workspace-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getDataset",
        provider: "power-bi",
        validCases: [
            {
                name: "get_dataset_details",
                description: "Get details of a specific dataset",
                input: {
                    datasetId: SAMPLE_DATASET_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {
                    id: SAMPLE_DATASET_ID,
                    name: "Sales Data",
                    webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/datasets/cfafbeb1-8037-4d0c-896e-a46fb27ff229",
                    addRowsAPIEnabled: false,
                    configuredBy: "admin@company.com",
                    isRefreshable: true,
                    isEffectiveIdentityRequired: false,
                    isOnPremGatewayRequired: false,
                    targetStorageMode: "Abf",
                    createdDate: "2024-01-10T09:00:00Z",
                    contentProviderType: "OneDriveForBusiness"
                }
            }
        ],
        errorCases: [
            {
                name: "dataset_not_found",
                description: "Dataset does not exist",
                input: {
                    datasetId: "non-existent-dataset-id",
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedError: {
                    type: "not_found",
                    message: "Dataset not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "refreshDataset",
        provider: "power-bi",
        validCases: [
            {
                name: "trigger_refresh",
                description: "Trigger dataset refresh",
                input: {
                    datasetId: SAMPLE_DATASET_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {}
            },
            {
                name: "trigger_refresh_with_notification",
                description: "Trigger dataset refresh with email notification",
                input: {
                    datasetId: SAMPLE_DATASET_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID,
                    notifyOption: "MailOnCompletion"
                },
                expectedOutput: {}
            }
        ],
        errorCases: [
            {
                name: "refresh_in_progress",
                description: "Dataset refresh already in progress",
                input: {
                    datasetId: SAMPLE_DATASET_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedError: {
                    type: "validation",
                    message: "Refresh operation is already in progress for this dataset",
                    retryable: false
                }
            },
            {
                name: "not_refreshable",
                description: "Dataset is not refreshable",
                input: {
                    datasetId: "streaming-dataset-id",
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedError: {
                    type: "validation",
                    message: "This dataset is not refreshable",
                    retryable: false
                }
            }
        ]
    },

    // ========== DASHBOARD OPERATIONS ==========
    {
        operationId: "listDashboards",
        provider: "power-bi",
        validCases: [
            {
                name: "list_workspace_dashboards",
                description: "List all dashboards in a workspace",
                input: {
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {
                    "@odata.context":
                        "http://api.powerbi.com/v1.0/myorg/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/$metadata#dashboards",
                    value: [
                        {
                            id: SAMPLE_DASHBOARD_ID,
                            displayName: "Executive Summary",
                            isReadOnly: false,
                            webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/dashboards/69ffaa6c-b36d-4d01-96f5-1ed67c64d4af",
                            embedUrl:
                                "https://app.powerbi.com/dashboardEmbed?dashboardId=69ffaa6c-b36d-4d01-96f5-1ed67c64d4af&groupId=f089354e-8366-4e18-aea3-4cb4a3a50b48"
                        },
                        {
                            id: "70ggbb7d-c47e-5e12-a7g6-2fe78d75e5bg",
                            displayName: "Sales KPIs",
                            isReadOnly: false,
                            webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/dashboards/70ggbb7d-c47e-5e12-a7g6-2fe78d75e5bg"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspaceId: "invalid-workspace-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getDashboard",
        provider: "power-bi",
        validCases: [
            {
                name: "get_dashboard_details",
                description: "Get details of a specific dashboard",
                input: {
                    dashboardId: SAMPLE_DASHBOARD_ID,
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedOutput: {
                    id: SAMPLE_DASHBOARD_ID,
                    displayName: "Executive Summary",
                    isReadOnly: false,
                    webUrl: "https://app.powerbi.com/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48/dashboards/69ffaa6c-b36d-4d01-96f5-1ed67c64d4af",
                    embedUrl:
                        "https://app.powerbi.com/dashboardEmbed?dashboardId=69ffaa6c-b36d-4d01-96f5-1ed67c64d4af&groupId=f089354e-8366-4e18-aea3-4cb4a3a50b48",
                    tiles: [
                        {
                            id: "tile-1",
                            title: "Total Revenue",
                            rowSpan: 1,
                            colSpan: 2
                        },
                        {
                            id: "tile-2",
                            title: "Sales by Region",
                            rowSpan: 2,
                            colSpan: 2
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "dashboard_not_found",
                description: "Dashboard does not exist",
                input: {
                    dashboardId: "non-existent-dashboard-id",
                    workspaceId: SAMPLE_WORKSPACE_ID
                },
                expectedError: {
                    type: "not_found",
                    message: "Dashboard not found",
                    retryable: false
                }
            }
        ]
    }
];
