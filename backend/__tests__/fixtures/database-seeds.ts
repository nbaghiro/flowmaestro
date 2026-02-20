/**
 * Database Seeding Utilities
 *
 * Provides functions to create test data in the database.
 * Used with testcontainers for integration tests with real PostgreSQL.
 */

import { randomUUID } from "crypto";
import type { PoolClient } from "pg";

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    password_hash: string | null;
    name: string | null;
    google_id: string | null;
    microsoft_id: string | null;
    auth_provider: "local" | "google" | "microsoft";
    avatar_url: string | null;
    email_verified: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface TestAgent {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    model: string;
    provider: string;
    connection_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: unknown[];
    memory_config: Record<string, unknown>;
    safety_config: Record<string, unknown>;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TestThread {
    id: string;
    user_id: string;
    workspace_id: string;
    agent_id: string;
    title: string | null;
    status: "active" | "archived" | "deleted";
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
    last_message_at: Date | null;
    archived_at: Date | null;
    deleted_at: Date | null;
}

export interface TestKnowledgeBase {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    category: string | null;
    config: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}

export interface TestKnowledgeDocument {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: string;
    source_url: string | null;
    file_path: string | null;
    file_type: string;
    file_size: number | null;
    content: string | null;
    metadata: Record<string, unknown>;
    status: string;
    error_message: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface TestConnection {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    connection_method: string;
    provider: string;
    encrypted_data: string;
    metadata: Record<string, unknown>;
    status: string;
    capabilities: Record<string, unknown>;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface TestFolder {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    color: string;
    position: number;
    parent_id: string | null;
    depth: number;
    path: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TestApiKey {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    scopes: string[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: Date | null;
    last_used_at: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    revoked_at: Date | null;
}

export interface TestThreadMessage {
    id: string;
    thread_id: string;
    execution_id: string;
    role: string;
    content: string;
    created_at: Date;
}

export interface TestExecutionLog {
    id: number; // BIGSERIAL
    execution_id: string;
    node_id: string | null;
    level: string;
    message: string;
    metadata: Record<string, unknown> | null;
    created_at: Date;
}

export interface TestWorkspace {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: "personal" | "team";
    type: "free" | "pro" | "team";
    owner_id: string;
    max_workflows: number;
    max_agents: number;
    created_at: Date;
    updated_at: Date;
}

export interface TestWorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: "owner" | "admin" | "member" | "viewer";
    created_at: Date;
}

export interface TestWorkflow {
    id: string;
    name: string;
    description: string | null;
    definition: Record<string, unknown>;
    user_id: string;
    workspace_id: string;
    version: number;
    workflow_type: "user" | "system" | "template";
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TestExecution {
    id: string;
    workflow_id: string;
    status: string;
    inputs: Record<string, unknown> | null;
    outputs: Record<string, unknown> | null;
    started_at: Date | null;
    completed_at: Date | null;
    created_at: Date;
}

// ============================================================================
// ID GENERATORS
// ============================================================================

/**
 * Generate a unique UUID for test entities.
 * Uses crypto.randomUUID() for proper UUID v4 generation.
 */
export function generateTestId(_prefix?: string): string {
    return randomUUID();
}

// ============================================================================
// USER SEEDING
// ============================================================================

export interface SeedUserOptions {
    id?: string;
    email?: string;
    password_hash?: string;
    name?: string;
    google_id?: string;
    microsoft_id?: string;
    auth_provider?: "local" | "google" | "microsoft";
    email_verified?: boolean;
}

/**
 * Seed a user in the database.
 */
export async function seedUser(
    client: PoolClient,
    options: SeedUserOptions = {}
): Promise<TestUser> {
    const id = options.id || generateTestId("user");
    const email = options.email || `${id}@test.flowmaestro.dev`;
    const password_hash = options.password_hash || "$2a$10$test_hash_for_testing";
    const name = options.name || `Test User ${id}`;
    const auth_provider = options.auth_provider || "local";

    const result = await client.query<TestUser>(
        `INSERT INTO flowmaestro.users (
            id, email, password_hash, name, google_id, microsoft_id,
            auth_provider, email_verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            id,
            email,
            password_hash,
            name,
            options.google_id || null,
            options.microsoft_id || null,
            auth_provider,
            options.email_verified ?? true
        ]
    );

    return mapUserRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapUserRow(row: Record<string, unknown>): TestUser {
    return {
        id: row.id as string,
        email: row.email as string,
        password_hash: row.password_hash as string | null,
        name: row.name as string | null,
        google_id: row.google_id as string | null,
        microsoft_id: row.microsoft_id as string | null,
        auth_provider: row.auth_provider as "local" | "google" | "microsoft",
        avatar_url: row.avatar_url as string | null,
        email_verified: row.email_verified as boolean,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string)
    };
}

// ============================================================================
// WORKSPACE SEEDING
// ============================================================================

export interface SeedWorkspaceOptions {
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    category?: "personal" | "team";
    type?: "free" | "pro" | "team";
    max_workflows?: number;
    max_agents?: number;
}

/**
 * Seed a workspace in the database.
 * Automatically creates a workspace member for the owner.
 */
export async function seedWorkspace(
    client: PoolClient,
    ownerId: string,
    options: SeedWorkspaceOptions = {}
): Promise<TestWorkspace> {
    const id = options.id || generateTestId("ws");
    const name = options.name || `Test Workspace ${id}`;
    const slug = options.slug || id.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const result = await client.query<TestWorkspace>(
        `INSERT INTO flowmaestro.workspaces (
            id, name, slug, description, category, type, owner_id,
            max_workflows, max_agents
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            id,
            name,
            slug,
            options.description || null,
            options.category || "personal",
            options.type || "free",
            ownerId,
            options.max_workflows ?? 5,
            options.max_agents ?? 2
        ]
    );

    // Create workspace member for owner
    await client.query(
        `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [id, ownerId]
    );

    return mapWorkspaceRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapWorkspaceRow(row: Record<string, unknown>): TestWorkspace {
    return {
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        description: row.description as string | null,
        category: row.category as "personal" | "team",
        type: row.type as "free" | "pro" | "team",
        owner_id: row.owner_id as string,
        max_workflows: row.max_workflows as number,
        max_agents: row.max_agents as number,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string)
    };
}

// ============================================================================
// WORKFLOW SEEDING
// ============================================================================

export interface SeedWorkflowOptions {
    id?: string;
    name?: string;
    description?: string;
    definition?: Record<string, unknown>;
    version?: number;
    workflow_type?: "user" | "system" | "template";
    ai_generated?: boolean;
}

/**
 * Seed a workflow in the database.
 */
export async function seedWorkflow(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    options: SeedWorkflowOptions = {}
): Promise<TestWorkflow> {
    const id = options.id || generateTestId("wf");
    const name = options.name || `Test Workflow ${id}`;
    const definition = options.definition || {
        nodes: {},
        edges: [],
        variables: {}
    };

    const result = await client.query<TestWorkflow>(
        `INSERT INTO flowmaestro.workflows (
            id, name, description, definition, user_id, workspace_id,
            version, workflow_type, ai_generated
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            id,
            name,
            options.description || null,
            JSON.stringify(definition),
            userId,
            workspaceId,
            options.version ?? 1,
            options.workflow_type || "user",
            options.ai_generated ?? false
        ]
    );

    return mapWorkflowRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapWorkflowRow(row: Record<string, unknown>): TestWorkflow {
    return {
        id: row.id as string,
        name: row.name as string,
        description: row.description as string | null,
        definition:
            typeof row.definition === "string"
                ? JSON.parse(row.definition)
                : (row.definition as Record<string, unknown>),
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        version: row.version as number,
        workflow_type: row.workflow_type as "user" | "system" | "template",
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string),
        deleted_at: row.deleted_at ? new Date(row.deleted_at as string) : null
    };
}

// ============================================================================
// EXECUTION SEEDING
// ============================================================================

export interface SeedExecutionOptions {
    id?: string;
    status?: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    started_at?: Date;
    completed_at?: Date;
    pause_context?: Record<string, unknown>;
}

/**
 * Seed an execution in the database.
 */
export async function seedExecution(
    client: PoolClient,
    workflowId: string,
    options: SeedExecutionOptions = {}
): Promise<TestExecution> {
    const id = options.id || generateTestId("exec");

    const result = await client.query<TestExecution>(
        `INSERT INTO flowmaestro.executions (
            id, workflow_id, status, inputs, outputs, started_at, completed_at, pause_context
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            id,
            workflowId,
            options.status || "pending",
            options.inputs ? JSON.stringify(options.inputs) : null,
            options.outputs ? JSON.stringify(options.outputs) : null,
            options.started_at || null,
            options.completed_at || null,
            options.pause_context ? JSON.stringify(options.pause_context) : null
        ]
    );

    return mapExecutionRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapExecutionRow(row: Record<string, unknown>): TestExecution {
    return {
        id: row.id as string,
        workflow_id: row.workflow_id as string,
        status: row.status as string,
        inputs: row.inputs as Record<string, unknown> | null,
        outputs: row.outputs as Record<string, unknown> | null,
        started_at: row.started_at ? new Date(row.started_at as string) : null,
        completed_at: row.completed_at ? new Date(row.completed_at as string) : null,
        created_at: new Date(row.created_at as string)
    };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export interface BasicScenario {
    user: TestUser;
    workspace: TestWorkspace;
    workflow: TestWorkflow;
}

/**
 * Seed a basic test scenario with user, workspace, and workflow.
 * Useful as a starting point for most tests.
 */
export async function seedBasicScenario(client: PoolClient): Promise<BasicScenario> {
    const user = await seedUser(client);
    const workspace = await seedWorkspace(client, user.id);
    const workflow = await seedWorkflow(client, workspace.id, user.id);

    return { user, workspace, workflow };
}

/**
 * Seed multiple workflows in a workspace.
 */
export async function seedMultipleWorkflows(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    count: number,
    options: SeedWorkflowOptions = {}
): Promise<TestWorkflow[]> {
    const workflows: TestWorkflow[] = [];

    for (let i = 0; i < count; i++) {
        const workflow = await seedWorkflow(client, workspaceId, userId, {
            ...options,
            name: options.name ? `${options.name} ${i + 1}` : undefined
        });
        workflows.push(workflow);
    }

    return workflows;
}

/**
 * Seed a workspace member with a specific role.
 */
export async function seedWorkspaceMember(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    role: "admin" | "member" | "viewer" = "member"
): Promise<TestWorkspaceMember> {
    const result = await client.query<TestWorkspaceMember>(
        `INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [workspaceId, userId, role]
    );

    return {
        id: result.rows[0].id as unknown as string,
        workspace_id: result.rows[0].workspace_id as unknown as string,
        user_id: result.rows[0].user_id as unknown as string,
        role: result.rows[0].role as unknown as "owner" | "admin" | "member" | "viewer",
        created_at: new Date(result.rows[0].created_at as unknown as string)
    };
}

// ============================================================================
// AGENT SEEDING
// ============================================================================

export interface SeedAgentOptions {
    id?: string;
    name?: string;
    description?: string;
    model?: string;
    provider?: string;
    connection_id?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: unknown[];
    memory_config?: Record<string, unknown>;
    safety_config?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

/**
 * Seed an agent in the database.
 */
export async function seedAgent(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    options: SeedAgentOptions = {}
): Promise<TestAgent> {
    const id = options.id || generateTestId("agent");
    const name = options.name || `Test Agent ${id.substring(0, 8)}`;
    const memoryConfig = options.memory_config || {
        max_messages: 50,
        embeddings_enabled: true,
        working_memory_enabled: true
    };
    const safetyConfig = options.safety_config || {
        max_iterations: 25,
        timeout_seconds: 300
    };

    const result = await client.query<TestAgent>(
        `INSERT INTO flowmaestro.agents (
            id, user_id, workspace_id, name, description, model, provider,
            connection_id, system_prompt, temperature, max_tokens, max_iterations,
            available_tools, memory_config, safety_config, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
            id,
            userId,
            workspaceId,
            name,
            options.description || null,
            options.model || "gpt-4o",
            options.provider || "openai",
            options.connection_id || null,
            options.system_prompt || "You are a helpful assistant.",
            options.temperature ?? 0.7,
            options.max_tokens ?? 4096,
            options.max_iterations ?? 25,
            JSON.stringify(options.available_tools || []),
            JSON.stringify(memoryConfig),
            JSON.stringify(safetyConfig),
            JSON.stringify(options.metadata || {})
        ]
    );

    return mapAgentRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapAgentRow(row: Record<string, unknown>): TestAgent {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        name: row.name as string,
        description: row.description as string | null,
        model: row.model as string,
        provider: row.provider as string,
        connection_id: row.connection_id as string | null,
        system_prompt: row.system_prompt as string,
        temperature: row.temperature as number,
        max_tokens: row.max_tokens as number,
        max_iterations: row.max_iterations as number,
        available_tools: (typeof row.available_tools === "string"
            ? JSON.parse(row.available_tools)
            : row.available_tools) as unknown[],
        memory_config: (typeof row.memory_config === "string"
            ? JSON.parse(row.memory_config)
            : row.memory_config) as Record<string, unknown>,
        safety_config: (typeof row.safety_config === "string"
            ? JSON.parse(row.safety_config)
            : row.safety_config) as Record<string, unknown>,
        metadata: (typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata) as Record<string, unknown>,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string),
        deleted_at: row.deleted_at ? new Date(row.deleted_at as string) : null
    };
}

// ============================================================================
// THREAD SEEDING
// ============================================================================

export interface SeedThreadOptions {
    id?: string;
    title?: string;
    status?: "active" | "archived" | "deleted";
    metadata?: Record<string, unknown>;
    last_message_at?: Date;
}

/**
 * Seed a thread in the database.
 */
export async function seedThread(
    client: PoolClient,
    agentId: string,
    workspaceId: string,
    userId: string,
    options: SeedThreadOptions = {}
): Promise<TestThread> {
    const id = options.id || generateTestId("thread");

    const result = await client.query<TestThread>(
        `INSERT INTO flowmaestro.threads (
            id, user_id, workspace_id, agent_id, title, status, metadata, last_message_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            id,
            userId,
            workspaceId,
            agentId,
            options.title || null,
            options.status || "active",
            JSON.stringify(options.metadata || {}),
            options.last_message_at || null
        ]
    );

    return mapThreadRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapThreadRow(row: Record<string, unknown>): TestThread {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        agent_id: row.agent_id as string,
        title: row.title as string | null,
        status: row.status as "active" | "archived" | "deleted",
        metadata: (typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata) as Record<string, unknown>,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string),
        last_message_at: row.last_message_at ? new Date(row.last_message_at as string) : null,
        archived_at: row.archived_at ? new Date(row.archived_at as string) : null,
        deleted_at: row.deleted_at ? new Date(row.deleted_at as string) : null
    };
}

// ============================================================================
// KNOWLEDGE BASE SEEDING
// ============================================================================

export interface SeedKnowledgeBaseOptions {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    config?: Record<string, unknown>;
}

/**
 * Seed a knowledge base in the database.
 */
export async function seedKnowledgeBase(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    options: SeedKnowledgeBaseOptions = {}
): Promise<TestKnowledgeBase> {
    const id = options.id || generateTestId("kb");
    const name = options.name || `Test Knowledge Base ${id.substring(0, 8)}`;
    const config = options.config || {
        embeddingModel: "text-embedding-3-small",
        embeddingProvider: "openai",
        chunkSize: 1000,
        chunkOverlap: 200,
        embeddingDimensions: 1536
    };

    const result = await client.query<TestKnowledgeBase>(
        `INSERT INTO flowmaestro.knowledge_bases (
            id, user_id, workspace_id, name, description, category, config
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            id,
            userId,
            workspaceId,
            name,
            options.description || null,
            options.category || null,
            JSON.stringify(config)
        ]
    );

    return mapKnowledgeBaseRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapKnowledgeBaseRow(row: Record<string, unknown>): TestKnowledgeBase {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        name: row.name as string,
        description: row.description as string | null,
        category: row.category as string | null,
        config: (typeof row.config === "string" ? JSON.parse(row.config) : row.config) as Record<
            string,
            unknown
        >,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string)
    };
}

// ============================================================================
// KNOWLEDGE DOCUMENT SEEDING
// ============================================================================

export interface SeedKnowledgeDocumentOptions {
    id?: string;
    name?: string;
    source_type?: string;
    source_url?: string;
    file_path?: string;
    file_type?: string;
    file_size?: number;
    content?: string;
    metadata?: Record<string, unknown>;
    status?: string;
}

/**
 * Seed a knowledge document in the database.
 */
export async function seedKnowledgeDocument(
    client: PoolClient,
    knowledgeBaseId: string,
    options: SeedKnowledgeDocumentOptions = {}
): Promise<TestKnowledgeDocument> {
    const id = options.id || generateTestId("doc");
    const name = options.name || `Test Document ${id.substring(0, 8)}.txt`;

    const result = await client.query<TestKnowledgeDocument>(
        `INSERT INTO flowmaestro.knowledge_documents (
            id, knowledge_base_id, name, source_type, source_url, file_path,
            file_type, file_size, content, metadata, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
            id,
            knowledgeBaseId,
            name,
            options.source_type || "file",
            options.source_url || null,
            options.file_path || `/tmp/test/${id}.txt`,
            options.file_type || "txt",
            options.file_size || 1024,
            options.content || "Test document content for E2E testing.",
            JSON.stringify(options.metadata || {}),
            options.status || "ready"
        ]
    );

    return mapKnowledgeDocumentRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapKnowledgeDocumentRow(row: Record<string, unknown>): TestKnowledgeDocument {
    return {
        id: row.id as string,
        knowledge_base_id: row.knowledge_base_id as string,
        name: row.name as string,
        source_type: row.source_type as string,
        source_url: row.source_url as string | null,
        file_path: row.file_path as string | null,
        file_type: row.file_type as string,
        file_size: row.file_size as number | null,
        content: row.content as string | null,
        metadata: (typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata) as Record<string, unknown>,
        status: row.status as string,
        error_message: row.error_message as string | null,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string)
    };
}

// ============================================================================
// CONNECTION SEEDING
// ============================================================================

export interface SeedConnectionOptions {
    id?: string;
    name?: string;
    connection_method?: string;
    encrypted_data?: string;
    metadata?: Record<string, unknown>;
    status?: string;
    capabilities?: Record<string, unknown>;
}

/**
 * Seed a connection in the database.
 */
export async function seedConnection(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    provider: string,
    options: SeedConnectionOptions = {}
): Promise<TestConnection> {
    const id = options.id || generateTestId("conn");
    const name = options.name || `${provider} Connection`;

    const result = await client.query<TestConnection>(
        `INSERT INTO flowmaestro.connections (
            id, user_id, workspace_id, name, connection_method, provider,
            encrypted_data, metadata, status, capabilities
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
            id,
            userId,
            workspaceId,
            name,
            options.connection_method || "oauth2",
            provider,
            options.encrypted_data || "encrypted_test_data",
            JSON.stringify(options.metadata || { connected_at: new Date().toISOString() }),
            options.status || "active",
            JSON.stringify(options.capabilities || { refresh: true })
        ]
    );

    return mapConnectionRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapConnectionRow(row: Record<string, unknown>): TestConnection {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        name: row.name as string,
        connection_method: row.connection_method as string,
        provider: row.provider as string,
        encrypted_data: row.encrypted_data as string,
        metadata: (typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata) as Record<string, unknown>,
        status: row.status as string,
        capabilities: (typeof row.capabilities === "string"
            ? JSON.parse(row.capabilities)
            : row.capabilities) as Record<string, unknown>,
        last_used_at: row.last_used_at ? new Date(row.last_used_at as string) : null,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string)
    };
}

// ============================================================================
// FOLDER SEEDING
// ============================================================================

export interface SeedFolderOptions {
    id?: string;
    name?: string;
    color?: string;
    position?: number;
    parent_id?: string;
}

/**
 * Seed a folder in the database.
 */
export async function seedFolder(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    options: SeedFolderOptions = {}
): Promise<TestFolder> {
    const id = options.id || generateTestId("folder");
    const name = options.name || `Test Folder ${id.substring(0, 8)}`;

    const result = await client.query<TestFolder>(
        `INSERT INTO flowmaestro.folders (
            id, user_id, workspace_id, name, color, position, parent_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            id,
            userId,
            workspaceId,
            name,
            options.color || "#6366f1",
            options.position ?? 0,
            options.parent_id || null
        ]
    );

    return mapFolderRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapFolderRow(row: Record<string, unknown>): TestFolder {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        name: row.name as string,
        color: row.color as string,
        position: row.position as number,
        parent_id: row.parent_id as string | null,
        depth: row.depth as number,
        path: row.path as string,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string),
        deleted_at: row.deleted_at ? new Date(row.deleted_at as string) : null
    };
}

// ============================================================================
// API KEY SEEDING
// ============================================================================

export interface SeedApiKeyOptions {
    id?: string;
    name?: string;
    key_prefix?: string;
    key_hash?: string;
    scopes?: string[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_at?: Date;
    is_active?: boolean;
}

/**
 * Seed an API key in the database.
 */
export async function seedApiKey(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    options: SeedApiKeyOptions = {}
): Promise<TestApiKey> {
    const id = options.id || generateTestId("apikey");
    const name = options.name || `Test API Key ${id.substring(0, 8)}`;
    // Generate a deterministic hash for testing (not secure, just for tests)
    const keyHash = options.key_hash || `test_hash_${id}`;
    const keyPrefix = options.key_prefix || `fm_live_${id.substring(0, 8)}`;

    const result = await client.query<TestApiKey>(
        `INSERT INTO flowmaestro.api_keys (
            id, user_id, workspace_id, name, key_prefix, key_hash,
            scopes, rate_limit_per_minute, rate_limit_per_day, expires_at, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
            id,
            userId,
            workspaceId,
            name,
            keyPrefix,
            keyHash,
            options.scopes || ["workflows:read", "workflows:execute"],
            options.rate_limit_per_minute ?? 60,
            options.rate_limit_per_day ?? 10000,
            options.expires_at || null,
            options.is_active ?? true
        ]
    );

    return mapApiKeyRow(result.rows[0] as unknown as Record<string, unknown>);
}

function mapApiKeyRow(row: Record<string, unknown>): TestApiKey {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        workspace_id: row.workspace_id as string,
        name: row.name as string,
        key_prefix: row.key_prefix as string,
        key_hash: row.key_hash as string,
        scopes: row.scopes as string[],
        rate_limit_per_minute: row.rate_limit_per_minute as number,
        rate_limit_per_day: row.rate_limit_per_day as number,
        expires_at: row.expires_at ? new Date(row.expires_at as string) : null,
        last_used_at: row.last_used_at ? new Date(row.last_used_at as string) : null,
        is_active: row.is_active as boolean,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string),
        revoked_at: row.revoked_at ? new Date(row.revoked_at as string) : null
    };
}

// ============================================================================
// THREAD MESSAGE SEEDING
// ============================================================================

export interface SeedThreadMessageOptions {
    id?: string;
    execution_id?: string;
    role?: string;
    content?: string;
    tool_calls?: Record<string, unknown>[];
    tool_name?: string;
    tool_call_id?: string;
    created_at?: Date;
}

/**
 * Seed a thread message in the database (agent_messages table).
 * Requires an execution_id - the message belongs to an execution which belongs to a thread.
 */
export async function seedThreadMessage(
    client: PoolClient,
    threadId: string,
    executionId: string,
    options: SeedThreadMessageOptions = {}
): Promise<TestThreadMessage> {
    const id = options.id || generateTestId("msg");

    // Use provided created_at or default to clock_timestamp() for unique timestamps
    const createdAtValue = options.created_at ? "$9::timestamp" : "clock_timestamp()";

    const query = `INSERT INTO flowmaestro.agent_messages (
            id, execution_id, thread_id, role, content, tool_calls, tool_name, tool_call_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${createdAtValue})
        RETURNING *`;

    const params: (string | null | Date)[] = [
        id,
        executionId,
        threadId,
        options.role || "user",
        options.content || "Test message content",
        options.tool_calls ? JSON.stringify(options.tool_calls) : null,
        options.tool_name || null,
        options.tool_call_id || null
    ];

    if (options.created_at) {
        params.push(options.created_at);
    }

    const result = await client.query<TestThreadMessage>(query, params);

    const row = result.rows[0] as unknown as Record<string, unknown>;
    return {
        id: row.id as string,
        thread_id: row.thread_id as string,
        execution_id: row.execution_id as string,
        role: row.role as string,
        content: row.content as string,
        created_at: new Date(row.created_at as string)
    };
}

// ============================================================================
// EXECUTION LOG SEEDING
// ============================================================================

export interface SeedExecutionLogOptions {
    node_id?: string;
    level?: string;
    message?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Seed an execution log entry in the database.
 */
export async function seedExecutionLog(
    client: PoolClient,
    executionId: string,
    options: SeedExecutionLogOptions = {}
): Promise<TestExecutionLog> {
    const result = await client.query<TestExecutionLog>(
        `INSERT INTO flowmaestro.execution_logs (
            execution_id, node_id, level, message, metadata
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
            executionId,
            options.node_id || null,
            options.level || "info",
            options.message || "Test log message",
            options.metadata ? JSON.stringify(options.metadata) : null
        ]
    );

    const row = result.rows[0] as unknown as Record<string, unknown>;
    return {
        id: Number(row.id),
        execution_id: row.execution_id as string,
        node_id: row.node_id as string | null,
        level: row.level as string,
        message: row.message as string,
        metadata: row.metadata as Record<string, unknown> | null,
        created_at: new Date(row.created_at as string)
    };
}

// ============================================================================
// COMPLEX SCENARIO SEEDERS
// ============================================================================

/**
 * Seed an agent with associated tools.
 */
export async function seedAgentWithTools(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    toolCount: number
): Promise<{ agent: TestAgent; workflows: TestWorkflow[] }> {
    const workflows: TestWorkflow[] = [];

    // Create tool workflows first
    for (let i = 0; i < toolCount; i++) {
        const workflow = await seedWorkflow(client, workspaceId, userId, {
            name: `Tool Workflow ${i + 1}`,
            workflow_type: "user"
        });
        workflows.push(workflow);
    }

    // Create agent with tool references
    const tools = workflows.map((wf, idx) => ({
        id: generateTestId("tool"),
        name: `tool_${idx + 1}`,
        description: `Tool ${idx + 1} based on workflow`,
        type: "workflow",
        schema: { type: "object", properties: {} },
        config: { workflowId: wf.id }
    }));

    const agent = await seedAgent(client, workspaceId, userId, {
        name: `Agent with ${toolCount} tools`,
        available_tools: tools
    });

    return { agent, workflows };
}

/**
 * Seed a workflow with multiple executions.
 */
export async function seedWorkflowWithExecutions(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    executionCount: number
): Promise<{ workflow: TestWorkflow; executions: TestExecution[] }> {
    const workflow = await seedWorkflow(client, workspaceId, userId);
    const executions: TestExecution[] = [];

    for (let i = 0; i < executionCount; i++) {
        const status = i === 0 ? "running" : i % 3 === 0 ? "failed" : "completed";
        const execution = await seedExecution(client, workflow.id, {
            status,
            inputs: { iteration: i },
            started_at: new Date(Date.now() - (executionCount - i) * 60000)
        });
        executions.push(execution);
    }

    return { workflow, executions };
}

/**
 * Seed a thread with multiple messages.
 * Creates an execution for the thread and adds messages to it.
 */
export async function seedThreadWithMessages(
    client: PoolClient,
    agentId: string,
    workspaceId: string,
    userId: string,
    messageCount: number
): Promise<{ thread: TestThread; executionId: string; messages: TestThreadMessage[] }> {
    const thread = await seedThread(client, agentId, workspaceId, userId);

    // Create an execution for the thread
    const execResult = await client.query<{ id: string }>(
        `INSERT INTO flowmaestro.agent_executions
         (agent_id, user_id, thread_id, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [agentId, userId, thread.id, "completed"]
    );
    const executionId = execResult.rows[0].id;

    const messages: TestThreadMessage[] = [];
    const baseTime = new Date();

    for (let i = 0; i < messageCount; i++) {
        const role = i % 2 === 0 ? "user" : "assistant";
        // Add milliseconds to ensure distinct, ordered timestamps
        const created_at = new Date(baseTime.getTime() + i * 1000);
        const message = await seedThreadMessage(client, thread.id, executionId, {
            role,
            content: `${role === "user" ? "User" : "Assistant"} message ${i + 1}`,
            created_at
        });
        messages.push(message);
    }

    // Update thread's last_message_at
    await client.query("UPDATE flowmaestro.threads SET last_message_at = NOW() WHERE id = $1", [
        thread.id
    ]);

    return { thread, executionId, messages };
}

/**
 * Seed a knowledge base with documents.
 */
export async function seedKnowledgeBaseWithDocuments(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    documentCount: number
): Promise<{ knowledgeBase: TestKnowledgeBase; documents: TestKnowledgeDocument[] }> {
    const knowledgeBase = await seedKnowledgeBase(client, workspaceId, userId);
    const documents: TestKnowledgeDocument[] = [];

    for (let i = 0; i < documentCount; i++) {
        const document = await seedKnowledgeDocument(client, knowledgeBase.id, {
            name: `Document ${i + 1}.txt`,
            content: `Content of document ${i + 1} for testing purposes.`
        });
        documents.push(document);
    }

    return { knowledgeBase, documents };
}

/**
 * Seed a workspace with multiple members.
 */
export async function seedWorkspaceWithMembers(
    client: PoolClient,
    ownerId: string,
    memberCount: number
): Promise<{ workspace: TestWorkspace; members: TestWorkspaceMember[]; users: TestUser[] }> {
    const workspace = await seedWorkspace(client, ownerId);
    const members: TestWorkspaceMember[] = [];
    const users: TestUser[] = [];

    for (let i = 0; i < memberCount; i++) {
        const user = await seedUser(client, { name: `Member ${i + 1}` });
        users.push(user);

        const role = i === 0 ? "admin" : i % 2 === 0 ? "member" : "viewer";
        const member = await seedWorkspaceMember(client, workspace.id, user.id, role);
        members.push(member);
    }

    return { workspace, members, users };
}

/**
 * Seed a folder hierarchy with specified depth and breadth.
 */
export async function seedFolderHierarchy(
    client: PoolClient,
    workspaceId: string,
    userId: string,
    depth: number,
    breadth: number
): Promise<TestFolder[]> {
    const folders: TestFolder[] = [];

    async function createLevel(parentId: string | undefined, currentDepth: number): Promise<void> {
        if (currentDepth >= depth) return;

        for (let i = 0; i < breadth; i++) {
            const folder = await seedFolder(client, workspaceId, userId, {
                name: `Folder L${currentDepth + 1}-${i + 1}`,
                parent_id: parentId,
                position: i
            });
            folders.push(folder);

            await createLevel(folder.id, currentDepth + 1);
        }
    }

    await createLevel(undefined, 0);
    return folders;
}

/**
 * Seed an execution with log entries.
 */
export async function seedExecutionWithLogs(
    client: PoolClient,
    workflowId: string,
    logCount: number
): Promise<{ execution: TestExecution; logs: TestExecutionLog[] }> {
    const execution = await seedExecution(client, workflowId, {
        status: "completed",
        started_at: new Date(Date.now() - 60000)
    });
    const logs: TestExecutionLog[] = [];

    const levels = ["debug", "info", "warn", "error"];

    for (let i = 0; i < logCount; i++) {
        const log = await seedExecutionLog(client, execution.id, {
            node_id: i % 3 === 0 ? `node_${i}` : undefined,
            level: levels[i % levels.length],
            message: `Log entry ${i + 1}`
        });
        logs.push(log);
    }

    return { execution, logs };
}
