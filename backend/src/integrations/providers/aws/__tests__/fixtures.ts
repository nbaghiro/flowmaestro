/**
 * Test fixtures for AWS provider operations
 *
 * These fixtures are used for integration testing and validation
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Lambda operations fixtures
 */
const lambda_listFunctions: TestFixture = {
    operationId: "lambda_listFunctions",
    provider: "aws",
    validCases: [
        {
            name: "list_all_functions",
            description: "List all Lambda functions in the region",
            input: {},
            expectedOutput: {
                functions: [
                    {
                        functionName: "my-function",
                        runtime: "nodejs20.x",
                        handler: "index.handler",
                        memorySize: 128,
                        timeout: 3
                    }
                ],
                region: "us-east-1"
            }
        },
        {
            name: "list_with_pagination",
            description: "List functions with pagination",
            input: {
                maxResults: 10
            }
        }
    ],
    errorCases: [
        {
            name: "invalid_marker",
            description: "Invalid pagination marker",
            input: {
                marker: "invalid-marker-token"
            },
            expectedError: {
                type: "validation",
                message: "Invalid marker token",
                retryable: false
            }
        }
    ]
};

const lambda_getFunction: TestFixture = {
    operationId: "lambda_getFunction",
    provider: "aws",
    validCases: [
        {
            name: "get_function_details",
            description: "Get function configuration and metadata",
            input: {
                functionName: "my-function"
            },
            expectedOutput: {
                functionName: "my-function",
                runtime: "nodejs20.x",
                handler: "index.handler",
                memorySize: 128,
                timeout: 3,
                region: "us-east-1"
            }
        }
    ],
    errorCases: [
        {
            name: "function_not_found",
            description: "Function does not exist",
            input: {
                functionName: "nonexistent-function"
            },
            expectedError: {
                type: "not_found",
                message: "Function not found",
                retryable: false
            }
        },
        {
            name: "invalid_function_name",
            description: "Invalid function name format",
            input: {
                functionName: "invalid@function!name"
            },
            expectedError: {
                type: "validation",
                message: "Invalid function name",
                retryable: false
            }
        }
    ]
};

const lambda_invokeFunction: TestFixture = {
    operationId: "lambda_invokeFunction",
    provider: "aws",
    validCases: [
        {
            name: "invoke_sync",
            description: "Invoke function synchronously",
            input: {
                functionName: "my-function",
                invocationType: "RequestResponse",
                payload: { key: "value" }
            },
            expectedOutput: {
                functionName: "my-function",
                invocationType: "RequestResponse",
                result: { statusCode: 200, body: "Success" }
            }
        },
        {
            name: "invoke_async",
            description: "Invoke function asynchronously",
            input: {
                functionName: "my-function",
                invocationType: "Event",
                payload: { key: "value" }
            },
            expectedOutput: {
                functionName: "my-function",
                invocationType: "Event",
                result: { message: "Function invoked asynchronously", statusCode: 202 }
            }
        },
        {
            name: "invoke_dry_run",
            description: "Validate function without executing",
            input: {
                functionName: "my-function",
                invocationType: "DryRun"
            },
            expectedOutput: {
                functionName: "my-function",
                invocationType: "DryRun",
                result: { message: "Function validation successful", statusCode: 204 }
            }
        }
    ],
    errorCases: [
        {
            name: "function_not_found",
            description: "Function does not exist",
            input: {
                functionName: "nonexistent-function",
                invocationType: "RequestResponse"
            },
            expectedError: {
                type: "not_found",
                message: "Function not found",
                retryable: false
            }
        }
    ]
};

const lambda_updateFunctionCode: TestFixture = {
    operationId: "lambda_updateFunctionCode",
    provider: "aws",
    validCases: [
        {
            name: "update_from_s3",
            description: "Update function code from S3",
            input: {
                functionName: "my-function",
                s3Bucket: "my-bucket",
                s3Key: "function.zip"
            },
            expectedOutput: {
                functionName: "my-function",
                codeSha256: "abc123",
                codeSize: 1024
            }
        },
        {
            name: "update_from_zip",
            description: "Update function code from base64-encoded zip",
            input: {
                functionName: "my-function",
                zipFile: "UEsDBBQAAAAI..."
            },
            expectedOutput: {
                functionName: "my-function",
                codeSha256: "def456",
                codeSize: 2048
            }
        }
    ],
    errorCases: [
        {
            name: "no_code_source",
            description: "No code source provided",
            input: {
                functionName: "my-function"
            },
            expectedError: {
                type: "validation",
                message: "One of s3Bucket/s3Key, zipFile, or imageUri must be provided",
                retryable: false
            }
        }
    ]
};

const lambda_deleteFunction: TestFixture = {
    operationId: "lambda_deleteFunction",
    provider: "aws",
    validCases: [
        {
            name: "delete_function",
            description: "Delete a Lambda function",
            input: {
                functionName: "my-function"
            },
            expectedOutput: {
                functionName: "my-function",
                message: "Function deleted successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "function_not_found",
            description: "Function does not exist",
            input: {
                functionName: "nonexistent-function"
            },
            expectedError: {
                type: "not_found",
                message: "Function not found",
                retryable: false
            }
        }
    ]
};

// Additional Lambda operations
const lambda_createFunction: TestFixture = {
    operationId: "lambda_createFunction",
    provider: "aws",
    validCases: [
        {
            name: "create_function",
            input: {
                functionName: "new-function",
                runtime: "nodejs20.x",
                role: "arn:aws:iam::123456789012:role/lambda-role",
                handler: "index.handler",
                code: { zipFile: "UEsDBBQAAAAI..." }
            },
            expectedOutput: {
                functionName: "new-function",
                runtime: "nodejs20.x"
            }
        }
    ],
    errorCases: []
};

const lambda_getFunctionLogs: TestFixture = {
    operationId: "lambda_getFunctionLogs",
    provider: "aws",
    validCases: [
        {
            name: "get_recent_logs",
            input: { functionName: "my-function" },
            expectedOutput: { events: [] }
        }
    ],
    errorCases: []
};

const lambda_listFunctionVersions: TestFixture = {
    operationId: "lambda_listFunctionVersions",
    provider: "aws",
    validCases: [
        {
            name: "list_versions",
            input: { functionName: "my-function" },
            expectedOutput: { versions: [] }
        }
    ],
    errorCases: []
};

// CloudWatch operations
const cloudwatch_queryMetrics: TestFixture = {
    operationId: "cloudwatch_queryMetrics",
    provider: "aws",
    validCases: [
        {
            name: "query_lambda_metrics",
            input: {
                namespace: "AWS/Lambda",
                metricName: "Invocations",
                startTime: "2026-02-01T00:00:00Z",
                endTime: "2026-02-02T00:00:00Z"
            },
            expectedOutput: { datapoints: [] }
        }
    ],
    errorCases: []
};

const cloudwatch_putMetricData: TestFixture = {
    operationId: "cloudwatch_putMetricData",
    provider: "aws",
    validCases: [
        {
            name: "publish_metric",
            input: {
                namespace: "CustomApp",
                metricData: [{ metricName: "RequestCount", value: 1 }]
            },
            expectedOutput: { message: "Metrics published successfully" }
        }
    ],
    errorCases: []
};

const cloudwatch_listAlarms: TestFixture = {
    operationId: "cloudwatch_listAlarms",
    provider: "aws",
    validCases: [{ name: "list_all", input: {}, expectedOutput: { alarms: [] } }],
    errorCases: []
};

const cloudwatch_getAlarmHistory: TestFixture = {
    operationId: "cloudwatch_getAlarmHistory",
    provider: "aws",
    validCases: [
        { name: "get_history", input: { alarmName: "my-alarm" }, expectedOutput: { history: [] } }
    ],
    errorCases: []
};

const cloudwatch_setAlarmState: TestFixture = {
    operationId: "cloudwatch_setAlarmState",
    provider: "aws",
    validCases: [
        {
            name: "set_state",
            input: { alarmName: "my-alarm", stateValue: "OK", stateReason: "Test" },
            expectedOutput: { message: "Alarm state updated" }
        }
    ],
    errorCases: []
};

const cloudwatch_queryLogs: TestFixture = {
    operationId: "cloudwatch_queryLogs",
    provider: "aws",
    validCases: [
        {
            name: "query",
            input: { logGroupName: "/aws/lambda/my-function", filterPattern: "ERROR" },
            expectedOutput: { events: [] }
        }
    ],
    errorCases: []
};

const cloudwatch_getLogEvents: TestFixture = {
    operationId: "cloudwatch_getLogEvents",
    provider: "aws",
    validCases: [
        {
            name: "get_events",
            input: { logGroupName: "/aws/lambda/my-function", logStreamName: "2026/02/02/stream" },
            expectedOutput: { events: [] }
        }
    ],
    errorCases: []
};

const cloudwatch_createLogGroup: TestFixture = {
    operationId: "cloudwatch_createLogGroup",
    provider: "aws",
    validCases: [
        {
            name: "create",
            input: { logGroupName: "/my-app/logs" },
            expectedOutput: { message: "Log group created" }
        }
    ],
    errorCases: []
};

const cloudwatch_putLogEvents: TestFixture = {
    operationId: "cloudwatch_putLogEvents",
    provider: "aws",
    validCases: [
        {
            name: "put_events",
            input: {
                logGroupName: "/my-app",
                logStreamName: "stream",
                logEvents: [{ message: "test", timestamp: 1234567890 }]
            },
            expectedOutput: { message: "Events published" }
        }
    ],
    errorCases: []
};

const cloudwatch_describeLogStreams: TestFixture = {
    operationId: "cloudwatch_describeLogStreams",
    provider: "aws",
    validCases: [
        { name: "describe", input: { logGroupName: "/my-app" }, expectedOutput: { logStreams: [] } }
    ],
    errorCases: []
};

// ECS operations
const ecs_listClusters: TestFixture = {
    operationId: "ecs_listClusters",
    provider: "aws",
    validCases: [{ name: "list_all", input: {}, expectedOutput: { clusterArns: [] } }],
    errorCases: []
};

const ecs_listServices: TestFixture = {
    operationId: "ecs_listServices",
    provider: "aws",
    validCases: [
        {
            name: "list_in_cluster",
            input: { cluster: "my-cluster" },
            expectedOutput: { serviceArns: [] }
        }
    ],
    errorCases: []
};

const ecs_describeServices: TestFixture = {
    operationId: "ecs_describeServices",
    provider: "aws",
    validCases: [
        {
            name: "describe",
            input: { cluster: "my-cluster", services: ["my-service"] },
            expectedOutput: { services: [] }
        }
    ],
    errorCases: []
};

const ecs_updateService: TestFixture = {
    operationId: "ecs_updateService",
    provider: "aws",
    validCases: [
        {
            name: "update",
            input: { cluster: "my-cluster", service: "my-service", desiredCount: 2 },
            expectedOutput: { message: "Service updated" }
        }
    ],
    errorCases: []
};

const ecs_listTasks: TestFixture = {
    operationId: "ecs_listTasks",
    provider: "aws",
    validCases: [
        { name: "list", input: { cluster: "my-cluster" }, expectedOutput: { taskArns: [] } }
    ],
    errorCases: []
};

const ecs_describeTasks: TestFixture = {
    operationId: "ecs_describeTasks",
    provider: "aws",
    validCases: [
        {
            name: "describe",
            input: { cluster: "my-cluster", tasks: ["task-id"] },
            expectedOutput: { tasks: [] }
        }
    ],
    errorCases: []
};

const ecs_runTask: TestFixture = {
    operationId: "ecs_runTask",
    provider: "aws",
    validCases: [
        {
            name: "run",
            input: { cluster: "my-cluster", taskDefinition: "my-task:1" },
            expectedOutput: { tasks: [] }
        }
    ],
    errorCases: []
};

const ecs_stopTask: TestFixture = {
    operationId: "ecs_stopTask",
    provider: "aws",
    validCases: [
        {
            name: "stop",
            input: { cluster: "my-cluster", task: "task-id" },
            expectedOutput: { message: "Task stopped" }
        }
    ],
    errorCases: []
};

/**
 * Export all AWS fixtures as an array
 */
export const awsFixtures: TestFixture[] = [
    lambda_listFunctions,
    lambda_getFunction,
    lambda_invokeFunction,
    lambda_updateFunctionCode,
    lambda_deleteFunction,
    lambda_createFunction,
    lambda_getFunctionLogs,
    lambda_listFunctionVersions,
    cloudwatch_queryMetrics,
    cloudwatch_putMetricData,
    cloudwatch_listAlarms,
    cloudwatch_getAlarmHistory,
    cloudwatch_setAlarmState,
    cloudwatch_queryLogs,
    cloudwatch_getLogEvents,
    cloudwatch_createLogGroup,
    cloudwatch_putLogEvents,
    cloudwatch_describeLogStreams,
    ecs_listClusters,
    ecs_listServices,
    ecs_describeServices,
    ecs_updateService,
    ecs_listTasks,
    ecs_describeTasks,
    ecs_runTask,
    ecs_stopTask
];
