import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { AWSClient } from "./client/AWSClient";
import * as CloudWatch from "./operations/cloudwatch";
import * as ECS from "./operations/ecs";
import * as Lambda from "./operations/lambda";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

// Import all operations

/**
 * AWS Provider - unified access to Lambda, CloudWatch, and ECS
 *
 * ## Setup Instructions
 *
 * ### 1. Create an IAM User
 * 1. Go to https://console.aws.amazon.com/iam/
 * 2. Navigate to "Users" and click "Add users"
 * 3. Enter a username (e.g., "flowmaestro-developer-tools")
 * 4. Select "Access key - Programmatic access"
 *
 * ### 2. Set IAM Permissions
 * Attach a policy with appropriate permissions for the services you need.
 * Example policy for full access to Lambda, CloudWatch, and ECS:
 * ```json
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [
 *     {
 *       "Effect": "Allow",
 *       "Action": [
 *         "lambda:*",
 *         "cloudwatch:*",
 *         "logs:*",
 *         "ecs:*"
 *       ],
 *       "Resource": "*"
 *     }
 *   ]
 * }
 * ```
 *
 * ### 3. Generate Access Keys
 * 1. After creating the user, go to "Security credentials"
 * 2. Create an access key
 * 3. Save both the Access Key ID and Secret Access Key
 *
 * ### 4. Configure in FlowMaestro
 * - Access Key ID: Your AWS access key
 * - Secret Access Key: Your AWS secret key
 * - Region: The AWS region for your resources
 *
 * ### 5. Rate Limits
 * - Lambda: 1000 concurrent executions, 10 requests/second per function
 * - CloudWatch Logs: 5 requests/second per account per region
 * - CloudWatch Metrics: 1500 GetMetricData requests/second
 * - ECS: 50 requests/second per account per region
 */
export class AWSProvider extends BaseProvider {
    readonly name = "aws";
    readonly displayName = "AWS";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        maxRequestSize: 6 * 1024 * 1024, // 6MB for Lambda invocation payload
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, AWSClient> = new Map();

    constructor() {
        super();

        // Register Lambda operations (8 total)
        this.registerOperation(Lambda.listFunctionsOperation);
        this.registerOperation(Lambda.getFunctionOperation);
        this.registerOperation(Lambda.invokeFunctionOperation);
        this.registerOperation(Lambda.updateFunctionCodeOperation);
        this.registerOperation(Lambda.deleteFunctionOperation);
        this.registerOperation(Lambda.createFunctionOperation);
        this.registerOperation(Lambda.getFunctionLogsOperation);
        this.registerOperation(Lambda.listFunctionVersionsOperation);

        // Register CloudWatch operations (10 total)
        this.registerOperation(CloudWatch.queryMetricsOperation);
        this.registerOperation(CloudWatch.putMetricDataOperation);
        this.registerOperation(CloudWatch.listAlarmsOperation);
        this.registerOperation(CloudWatch.getAlarmHistoryOperation);
        this.registerOperation(CloudWatch.setAlarmStateOperation);
        this.registerOperation(CloudWatch.queryLogsOperation);
        this.registerOperation(CloudWatch.getLogEventsOperation);
        this.registerOperation(CloudWatch.createLogGroupOperation);
        this.registerOperation(CloudWatch.putLogEventsOperation);
        this.registerOperation(CloudWatch.describeLogStreamsOperation);

        // Register ECS operations (8 total)
        this.registerOperation(ECS.listClustersOperation);
        this.registerOperation(ECS.listServicesOperation);
        this.registerOperation(ECS.describeServicesOperation);
        this.registerOperation(ECS.updateServiceOperation);
        this.registerOperation(ECS.listTasksOperation);
        this.registerOperation(ECS.describeTasksOperation);
        this.registerOperation(ECS.runTaskOperation);
        this.registerOperation(ECS.stopTaskOperation);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "" // Signature V4 computed dynamically
        };
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            // Lambda operations
            case "lambda_listFunctions":
                return await Lambda.executeListFunctions(client, validatedParams as never);
            case "lambda_getFunction":
                return await Lambda.executeGetFunction(client, validatedParams as never);
            case "lambda_invokeFunction":
                return await Lambda.executeInvokeFunction(client, validatedParams as never);
            case "lambda_updateFunctionCode":
                return await Lambda.executeUpdateFunctionCode(client, validatedParams as never);
            case "lambda_deleteFunction":
                return await Lambda.executeDeleteFunction(client, validatedParams as never);
            case "lambda_createFunction":
                return await Lambda.executeCreateFunction(client, validatedParams as never);
            case "lambda_getFunctionLogs":
                return await Lambda.executeGetFunctionLogs(client, validatedParams as never);
            case "lambda_listFunctionVersions":
                return await Lambda.executeListFunctionVersions(client, validatedParams as never);

            // CloudWatch operations
            case "cloudwatch_queryMetrics":
                return await CloudWatch.executeQueryMetrics(client, validatedParams as never);
            case "cloudwatch_putMetricData":
                return await CloudWatch.executePutMetricData(client, validatedParams as never);
            case "cloudwatch_listAlarms":
                return await CloudWatch.executeListAlarms(client, validatedParams as never);
            case "cloudwatch_getAlarmHistory":
                return await CloudWatch.executeGetAlarmHistory(client, validatedParams as never);
            case "cloudwatch_setAlarmState":
                return await CloudWatch.executeSetAlarmState(client, validatedParams as never);
            case "cloudwatch_queryLogs":
                return await CloudWatch.executeQueryLogs(client, validatedParams as never);
            case "cloudwatch_getLogEvents":
                return await CloudWatch.executeGetLogEvents(client, validatedParams as never);
            case "cloudwatch_createLogGroup":
                return await CloudWatch.executeCreateLogGroup(client, validatedParams as never);
            case "cloudwatch_putLogEvents":
                return await CloudWatch.executePutLogEvents(client, validatedParams as never);
            case "cloudwatch_describeLogStreams":
                return await CloudWatch.executeDescribeLogStreams(client, validatedParams as never);

            // ECS operations
            case "ecs_listClusters":
                return await ECS.executeListClusters(client, validatedParams as never);
            case "ecs_listServices":
                return await ECS.executeListServices(client, validatedParams as never);
            case "ecs_describeServices":
                return await ECS.executeDescribeServices(client, validatedParams as never);
            case "ecs_updateService":
                return await ECS.executeUpdateService(client, validatedParams as never);
            case "ecs_listTasks":
                return await ECS.executeListTasks(client, validatedParams as never);
            case "ecs_describeTasks":
                return await ECS.executeDescribeTasks(client, validatedParams as never);
            case "ecs_runTask":
                return await ECS.executeRunTask(client, validatedParams as never);
            case "ecs_stopTask":
                return await ECS.executeStopTask(client, validatedParams as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.getOperations().map((op) => ({
            name: `aws_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        // Remove aws_ prefix to get operation ID
        const operationId = toolName.replace("aws_", "");

        const result = await this.executeOperation(operationId, params, connection, {
            mode: "agent",
            conversationId: "unknown",
            toolCallId: "unknown"
        });

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create AWS client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): AWSClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const providerConfig = connection.metadata.provider_config as
            | { region?: string }
            | undefined;

        if (!data.api_key || !data.api_secret) {
            throw new Error(
                "AWS credentials are required. Please reconnect with valid credentials."
            );
        }

        if (!providerConfig?.region) {
            throw new Error("AWS region is required. Please reconnect and select a region.");
        }

        const client = new AWSClient({
            accessKeyId: data.api_key,
            secretAccessKey: data.api_secret,
            region: providerConfig.region
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
