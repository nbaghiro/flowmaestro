/**
 * Workflows Resource
 */

import type { HttpClient } from "../http/base-client";
import type {
    Workflow,
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    ExecuteWorkflowOptions,
    ExecuteWorkflowResponse
} from "../types";

export class Workflows {
    constructor(private readonly http: HttpClient) {}

    /**
     * List all workflows
     *
     * @param options - Pagination options
     * @returns Paginated list of workflows
     *
     * @example
     * ```typescript
     * const { data: workflows, pagination } = await client.workflows.list();
     * console.log(`Found ${pagination.total_count} workflows`);
     * for (const workflow of workflows) {
     *     console.log(`- ${workflow.name} (${workflow.id})`);
     * }
     * ```
     */
    async list(options: PaginationParams = {}): Promise<PaginatedResponse<Workflow>> {
        return this.http.getPaginated<Workflow>("/api/v1/workflows", {
            page: options.page,
            per_page: options.per_page
        });
    }

    /**
     * Get a workflow by ID
     *
     * @param id - Workflow ID
     * @returns Workflow details including input schema
     *
     * @example
     * ```typescript
     * const { data: workflow } = await client.workflows.get("wf_123");
     * console.log(`Workflow: ${workflow.name}`);
     * if (workflow.inputs) {
     *     console.log("Required inputs:", Object.keys(workflow.inputs));
     * }
     * ```
     */
    async get(id: string): Promise<ApiResponse<Workflow>> {
        return this.http.get<Workflow>(`/api/v1/workflows/${id}`);
    }

    /**
     * Execute a workflow
     *
     * @param id - Workflow ID
     * @param options - Execution options including inputs
     * @returns Execution details with execution_id for tracking
     *
     * @example
     * ```typescript
     * const { data } = await client.workflows.execute("wf_123", {
     *     inputs: {
     *         name: "John Doe",
     *         email: "john@example.com"
     *     }
     * });
     * console.log(`Started execution: ${data.execution_id}`);
     * ```
     */
    async execute(
        id: string,
        options: ExecuteWorkflowOptions = {}
    ): Promise<ApiResponse<ExecuteWorkflowResponse>> {
        return this.http.post<ExecuteWorkflowResponse>(`/api/v1/workflows/${id}/execute`, {
            inputs: options.inputs || {}
        });
    }
}
