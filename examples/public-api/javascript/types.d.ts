/**
 * Type stubs for @flowmaestro/sdk
 *
 * These types allow the examples to compile without the SDK installed.
 * In production usage, install the actual SDK package:
 *   npm install @flowmaestro/sdk
 */

declare module "@flowmaestro/sdk" {
    export interface FlowMaestroClientConfig {
        apiKey: string;
        baseUrl?: string;
    }

    export interface WorkflowInput {
        type: string;
        required?: boolean;
        description?: string;
        default?: unknown;
    }

    export interface Workflow {
        id: string;
        name: string;
        description?: string;
        version?: number;
        inputs?: Record<string, WorkflowInput>;
        created_at?: string;
        updated_at?: string;
    }

    export interface Execution {
        id: string;
        execution_id: string;
        workflow_id: string;
        status: string;
        inputs?: Record<string, unknown>;
        outputs?: Record<string, unknown>;
        started_at?: string;
        completed_at?: string;
        created_at?: string;
        error?: string;
    }

    export interface ExecutionEvent {
        type: string;
        event: string;
        data: Record<string, unknown>;
        timestamp: string;
        node_id?: string;
        node_type?: string;
        progress?: number;
        error?: string;
    }

    export interface Agent {
        id: string;
        name: string;
        description?: string;
        model?: string;
    }

    export interface Thread {
        id: string;
        agent_id: string;
        title?: string;
        created_at: string;
    }

    export interface Message {
        id: string;
        thread_id: string;
        role: string;
        content: string;
        status?: string;
        created_at: string;
    }

    export interface MessagesResponse {
        data: {
            messages: Message[];
        };
    }

    export interface KnowledgeBase {
        id: string;
        name: string;
        description?: string;
        embedding_model?: string;
        chunk_size?: number;
        document_count?: number;
        chunk_count?: number;
    }

    export interface SearchResult {
        id: string;
        content: string;
        document_id: string;
        document_name?: string;
        score: number;
        metadata?: Record<string, unknown>;
    }

    export interface SearchResponse {
        data: {
            results: SearchResult[];
        };
        results?: SearchResult[];
    }

    export interface ApiResponse<T> {
        data: T;
    }

    export interface ListResponse<T> {
        data: T[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            total_count?: number;
        };
    }

    export class NotFoundError extends Error {
        constructor(message: string);
    }

    export class RateLimitError extends Error {
        retryAfter?: number;
        constructor(message: string, retryAfter?: number);
    }

    export class FlowMaestroClient {
        constructor(config: FlowMaestroClientConfig);

        workflows: {
            get(id: string): Promise<ApiResponse<Workflow>>;
            list(options?: {
                page?: number;
                limit?: number;
                per_page?: number;
            }): Promise<ListResponse<Workflow>>;
            execute(
                id: string,
                options: { inputs?: Record<string, unknown> }
            ): Promise<ApiResponse<Execution>>;
        };

        executions: {
            get(id: string): Promise<ApiResponse<Execution>>;
            list(options?: {
                workflow_id?: string;
                status?: string;
                page?: number;
                limit?: number;
            }): Promise<ListResponse<Execution>>;
            cancel(id: string): Promise<ApiResponse<Execution>>;
            stream(id: string): AsyncIterable<ExecutionEvent>;
            streamIterator(id: string): AsyncIterable<ExecutionEvent>;
            waitForCompletion(
                id: string,
                options?: { timeout?: number; pollInterval?: number }
            ): Promise<Execution>;
        };

        agents: {
            get(id: string): Promise<ApiResponse<Agent>>;
            list(options?: { page?: number; limit?: number }): Promise<ListResponse<Agent>>;
            createThread(
                agentId: string,
                options?: { title?: string; metadata?: Record<string, unknown> }
            ): Promise<ApiResponse<Thread>>;
        };

        threads: {
            create(agentId: string, options?: { title?: string }): Promise<ApiResponse<Thread>>;
            get(id: string): Promise<ApiResponse<Thread>>;
            list(options?: {
                agent_id?: string;
                page?: number;
                limit?: number;
            }): Promise<ListResponse<Thread>>;
            sendMessage(
                threadId: string,
                content: string | { content: string }
            ): Promise<ApiResponse<Message>>;
            streamMessage(
                threadId: string,
                content: string | { content: string }
            ): AsyncIterable<{ event: string; data: unknown }>;
            getMessages(
                threadId: string,
                options?: { page?: number; limit?: number }
            ): Promise<ListResponse<Message>>;
            listMessages(
                threadId: string,
                options?: { page?: number; limit?: number; order?: string }
            ): Promise<MessagesResponse>;
        };

        knowledgeBases: {
            get(id: string): Promise<ApiResponse<KnowledgeBase>>;
            list(options?: { page?: number; limit?: number }): Promise<ListResponse<KnowledgeBase>>;
            search(
                id: string,
                query: string,
                options?: { limit?: number; threshold?: number }
            ): Promise<SearchResponse>;
            query(id: string, options: { query: string; top_k?: number }): Promise<SearchResponse>;
        };
    }
}
