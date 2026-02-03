import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { AzureDevOpsClient } from "./client/AzureDevOpsClient";

// Import all operations
import * as Pipelines from "./operations/pipelines";
import * as Releases from "./operations/releases";
import * as Repositories from "./operations/repositories";
import * as TestPlans from "./operations/test-plans";
import * as WorkItems from "./operations/work-items";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class AzureDevOpsProvider extends BaseProvider {
    readonly name = "azure-devops";
    readonly displayName = "Azure DevOps";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        maxRequestSize: 5 * 1024 * 1024,
        rateLimit: {
            tokensPerMinute: 200
        }
    };

    private clientPool: Map<string, AzureDevOpsClient> = new Map();

    constructor() {
        super();

        // Register Work Items operations (10)
        this.registerOperation(WorkItems.listWorkItemsOperation);
        this.registerOperation(WorkItems.getWorkItemOperation);
        this.registerOperation(WorkItems.createWorkItemOperation);
        this.registerOperation(WorkItems.updateWorkItemOperation);
        this.registerOperation(WorkItems.deleteWorkItemOperation);
        this.registerOperation(WorkItems.addCommentOperation);
        this.registerOperation(WorkItems.listCommentsOperation);
        this.registerOperation(WorkItems.addAttachmentOperation);
        this.registerOperation(WorkItems.linkWorkItemsOperation);
        this.registerOperation(WorkItems.getWorkItemHistoryOperation);

        // Register Repositories operations (7)
        this.registerOperation(Repositories.listRepositoriesOperation);
        this.registerOperation(Repositories.getRepositoryOperation);
        this.registerOperation(Repositories.createRepositoryOperation);
        this.registerOperation(Repositories.listBranchesOperation);
        this.registerOperation(Repositories.createPullRequestOperation);
        this.registerOperation(Repositories.updatePullRequestOperation);
        this.registerOperation(Repositories.getPullRequestOperation);

        // Register Pipelines operations (10)
        this.registerOperation(Pipelines.listPipelinesOperation);
        this.registerOperation(Pipelines.getPipelineOperation);
        this.registerOperation(Pipelines.runPipelineOperation);
        this.registerOperation(Pipelines.listPipelineRunsOperation);
        this.registerOperation(Pipelines.getPipelineRunOperation);
        this.registerOperation(Pipelines.cancelPipelineRunOperation);
        this.registerOperation(Pipelines.listVariableGroupsOperation);
        this.registerOperation(Pipelines.createVariableGroupOperation);
        this.registerOperation(Pipelines.updateVariableGroupOperation);
        this.registerOperation(Pipelines.approvePipelineGateOperation);

        // Register Releases operations (4)
        this.registerOperation(Releases.listReleasesOperation);
        this.registerOperation(Releases.createReleaseOperation);
        this.registerOperation(Releases.getReleaseStatusOperation);
        this.registerOperation(Releases.approveReleaseOperation);

        // Register Test Plans operations (4)
        this.registerOperation(TestPlans.listTestPlansOperation);
        this.registerOperation(TestPlans.getTestPlanOperation);
        this.registerOperation(TestPlans.createTestRunOperation);
        this.registerOperation(TestPlans.updateTestResultsOperation);
    }

    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {token}"
        };
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Work Items operations
            case "work_items_list":
                return await WorkItems.executeListWorkItems(client, validatedParams as never);
            case "work_items_get":
                return await WorkItems.executeGetWorkItem(client, validatedParams as never);
            case "work_items_create":
                return await WorkItems.executeCreateWorkItem(client, validatedParams as never);
            case "work_items_update":
                return await WorkItems.executeUpdateWorkItem(client, validatedParams as never);
            case "work_items_delete":
                return await WorkItems.executeDeleteWorkItem(client, validatedParams as never);
            case "work_items_addComment":
                return await WorkItems.executeAddComment(client, validatedParams as never);
            case "work_items_listComments":
                return await WorkItems.executeListComments(client, validatedParams as never);
            case "work_items_addAttachment":
                return await WorkItems.executeAddAttachment(client, validatedParams as never);
            case "work_items_link":
                return await WorkItems.executeLinkWorkItems(client, validatedParams as never);
            case "work_items_getHistory":
                return await WorkItems.executeGetWorkItemHistory(client, validatedParams as never);

            // Repositories operations
            case "repositories_list":
                return await Repositories.executeListRepositories(client, validatedParams as never);
            case "repositories_get":
                return await Repositories.executeGetRepository(client, validatedParams as never);
            case "repositories_create":
                return await Repositories.executeCreateRepository(client, validatedParams as never);
            case "repositories_listBranches":
                return await Repositories.executeListBranches(client, validatedParams as never);
            case "repositories_createPullRequest":
                return await Repositories.executeCreatePullRequest(
                    client,
                    validatedParams as never
                );
            case "repositories_updatePullRequest":
                return await Repositories.executeUpdatePullRequest(
                    client,
                    validatedParams as never
                );
            case "repositories_getPullRequest":
                return await Repositories.executeGetPullRequest(client, validatedParams as never);

            // Pipelines operations
            case "pipelines_list":
                return await Pipelines.executeListPipelines(client, validatedParams as never);
            case "pipelines_get":
                return await Pipelines.executeGetPipeline(client, validatedParams as never);
            case "pipelines_run":
                return await Pipelines.executeRunPipeline(client, validatedParams as never);
            case "pipelines_listRuns":
                return await Pipelines.executeListPipelineRuns(client, validatedParams as never);
            case "pipelines_getRun":
                return await Pipelines.executeGetPipelineRun(client, validatedParams as never);
            case "pipelines_cancelRun":
                return await Pipelines.executeCancelPipelineRun(client, validatedParams as never);
            case "pipelines_listVariableGroups":
                return await Pipelines.executeListVariableGroups(client, validatedParams as never);
            case "pipelines_createVariableGroup":
                return await Pipelines.executeCreateVariableGroup(client, validatedParams as never);
            case "pipelines_updateVariableGroup":
                return await Pipelines.executeUpdateVariableGroup(client, validatedParams as never);
            case "pipelines_approveGate":
                return await Pipelines.executeApprovePipelineGate(client, validatedParams as never);

            // Releases operations
            case "releases_list":
                return await Releases.executeListReleases(client, validatedParams as never);
            case "releases_create":
                return await Releases.executeCreateRelease(client, validatedParams as never);
            case "releases_getStatus":
                return await Releases.executeGetReleaseStatus(client, validatedParams as never);
            case "releases_approve":
                return await Releases.executeApproveRelease(client, validatedParams as never);

            // Test Plans operations
            case "testPlans_list":
                return await TestPlans.executeListTestPlans(client, validatedParams as never);
            case "testPlans_get":
                return await TestPlans.executeGetTestPlan(client, validatedParams as never);
            case "testPlans_createRun":
                return await TestPlans.executeCreateTestRun(client, validatedParams as never);
            case "testPlans_updateResults":
                return await TestPlans.executeUpdateTestResults(client, validatedParams as never);

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

    getMCPTools(): MCPTool[] {
        return this.getOperations().map((op) => ({
            name: `azure_devops_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const operationId = toolName.replace("azure_devops_", "");

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

    private getOrCreateClient(connection: ConnectionWithData): AzureDevOpsClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const providerConfig = connection.metadata.provider_config as
            | { organization?: string }
            | undefined;

        if (!data.access_token) {
            throw new Error(
                "OAuth access token is required. Please reconnect with valid credentials."
            );
        }

        if (!providerConfig?.organization) {
            throw new Error(
                "Azure DevOps organization is required. Please reconnect and enter your organization."
            );
        }

        const client = new AzureDevOpsClient({
            accessToken: data.access_token,
            organization: providerConfig.organization
        });

        this.clientPool.set(poolKey, client);

        return client;
    }
}
