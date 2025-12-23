/**
 * Database Helper for Integration Tests
 * Provides utilities for test database setup, seeding, and cleanup
 */

import { randomUUID } from "crypto";
import { Pool, QueryResultRow } from "pg";

export class DatabaseHelper {
    private pool: Pool;
    private testSchema: string = "test_schema";
    private testUserId: string | null = null;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Initialize test schema (isolated from main schema)
     */
    async initializeTestSchema(): Promise<void> {
        await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.testSchema}`);
        await this.pool.query(`SET search_path TO ${this.testSchema}, public`);
    }

    /**
     * Clean up test schema after tests
     */
    async cleanupTestSchema(): Promise<void> {
        await this.pool.query(`DROP SCHEMA IF EXISTS ${this.testSchema} CASCADE`);
    }

    /**
     * Seed test user with unique ID and return user ID
     * Creates a new test user for each test run to ensure isolation
     */
    async seedTestUser(): Promise<string> {
        // Generate unique UUID for test user
        const testUserId = randomUUID();
        // Use timestamp and random string for identifiable email
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const testEmail = `test-${timestamp}-${randomStr}@flowmaestro.test`;

        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO users (id, email, password_hash, name)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
                testUserId,
                testEmail,
                "$2a$10$abcdefghijklmnopqrstuv", // Dummy hash for test user
                `Test User (${timestamp})`
            ]
        );

        this.testUserId = result.rows[0].id;
        console.log(`✅ Created test user: ${testEmail} (ID: ${this.testUserId})`);
        return this.testUserId;
    }

    /**
     * Create a test workflow and return workflow ID
     */
    async createTestWorkflow(userId: string, name: string, definition: object): Promise<string> {
        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO workflows (user_id, name, description, definition)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [userId, name, "Test workflow", JSON.stringify(definition)]
        );
        return result.rows[0].id;
    }

    /**
     * Create a test execution and return execution ID
     */
    async createTestExecution(workflowId: string, inputs: object = {}): Promise<string> {
        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO executions (workflow_id, status, inputs, outputs, current_state)
             VALUES ($1, 'running', $2, '{}', '{}')
             RETURNING id`,
            [workflowId, JSON.stringify(inputs)]
        );
        return result.rows[0].id;
    }

    /**
     * Create a test database connection and return connection ID
     * This creates a connection in the database_connections table for testing database nodes
     */
    async createTestDatabaseConnection(
        userId: string,
        provider: "postgresql" | "mysql" | "mongodb",
        connectionDetails: {
            host?: string;
            port?: number;
            database?: string;
            username?: string;
            password?: string;
            connection_string?: string;
            ssl_enabled?: boolean;
        }
    ): Promise<string> {
        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO database_connections (
                user_id,
                name,
                provider,
                host,
                port,
                database,
                username,
                password,
                connection_string,
                ssl_enabled,
                options
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}'::jsonb)
            RETURNING id`,
            [
                userId,
                `Test ${provider} Connection`,
                provider,
                connectionDetails.host ?? null,
                connectionDetails.port ?? null,
                connectionDetails.database ?? null,
                connectionDetails.username ?? null,
                connectionDetails.password ?? null,
                connectionDetails.connection_string ?? null,
                connectionDetails.ssl_enabled ?? false
            ]
        );

        const connectionId = result.rows[0]?.id;
        if (!connectionId) {
            throw new Error("Failed to create test database connection");
        }

        console.log(`✅ Created test database connection: ${connectionId} (${provider})`);
        return connectionId;
    }

    /**
     * Get execution by ID
     */
    async getExecution(executionId: string): Promise<unknown> {
        const result = await this.pool.query("SELECT * FROM executions WHERE id = $1", [
            executionId
        ]);
        return result.rows[0] || null;
    }

    /**
     * Get all execution logs for an execution
     */
    async getExecutionLogs(executionId: string): Promise<QueryResultRow[]> {
        const result = await this.pool.query(
            `SELECT * FROM execution_logs
             WHERE execution_id = $1
             ORDER BY created_at ASC`,
            [executionId]
        );
        return result.rows;
    }

    /**
     * Clean up ONLY test user's data (user-scoped cleanup for safety)
     */
    async cleanup(): Promise<void> {
        if (!this.testUserId) {
            console.warn("No test user ID set, skipping cleanup");
            return;
        }

        // Safety check: Verify this is a test user by checking email domain
        const userCheck = await this.pool.query<{ email: string }>(
            "SELECT email FROM users WHERE id = $1",
            [this.testUserId]
        );

        if (userCheck.rows.length === 0) {
            console.warn(`Test user ${this.testUserId} not found, skipping cleanup`);
            return;
        }

        const email = userCheck.rows[0].email;
        if (!email.endsWith("@flowmaestro.test")) {
            throw new Error(
                `SAFETY CHECK FAILED: Attempted to cleanup non-test user: ${email}. ` +
                    'Test user emails must end with "@flowmaestro.test"'
            );
        }

        try {
            // Delete user-owned data in order (CASCADE should handle some dependencies)
            // Workflows CASCADE to executions → execution_logs
            await this.pool.query("DELETE FROM workflows WHERE user_id = $1", [this.testUserId]);

            // Knowledge bases CASCADE to documents → chunks
            await this.pool.query("DELETE FROM knowledge_bases WHERE user_id = $1", [
                this.testUserId
            ]);

            // Connections
            await this.pool.query("DELETE FROM connections WHERE user_id = $1", [this.testUserId]);

            // Database connections
            await this.pool.query("DELETE FROM database_connections WHERE user_id = $1", [
                this.testUserId
            ]);

            // Finally delete the test user
            await this.pool.query("DELETE FROM users WHERE id = $1", [this.testUserId]);

            console.log(`✅ Cleaned up test user: ${this.testUserId}`);
        } catch (error) {
            console.error(
                `Cleanup error for user ${this.testUserId}:`,
                error instanceof Error ? error.message : error
            );
            // Don't throw - allow tests to continue even if cleanup fails
        }
    }

    /**
     * Execute raw query (for custom test scenarios)
     */
    async query<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params: unknown[] = []
    ): Promise<T[]> {
        const result = await this.pool.query<T>(sql, params);
        return result.rows;
    }

    /**
     * Start a transaction
     */
    async beginTransaction(): Promise<void> {
        await this.pool.query("BEGIN");
    }

    /**
     * Commit a transaction
     */
    async commitTransaction(): Promise<void> {
        await this.pool.query("COMMIT");
    }

    /**
     * Rollback a transaction
     */
    async rollbackTransaction(): Promise<void> {
        await this.pool.query("ROLLBACK");
    }

    /**
     * Seed knowledge base with test documents
     */
    async seedKnowledgeBase(
        userId: string,
        name: string,
        documents: Array<{ content: string; embedding: number[] }>
    ): Promise<string> {
        // Create knowledge base
        const kbResult = await this.pool.query<{ id: string }>(
            `INSERT INTO knowledge_bases (user_id, name, description, config)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
                userId,
                name,
                "Test knowledge base",
                JSON.stringify({
                    embeddingModel: "text-embedding-3-small",
                    chunkSize: 500,
                    chunkOverlap: 50
                })
            ]
        );

        const kbId = kbResult.rows[0].id;

        // Create documents and chunks
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];

            // Create document
            const docResult = await this.pool.query<{ id: string }>(
                `INSERT INTO knowledge_documents
                 (knowledge_base_id, name, source_type, content, status)
                 VALUES ($1, $2, 'text', $3, 'ready')
                 RETURNING id`,
                [kbId, `test-doc-${i + 1}`, doc.content]
            );

            const docId = docResult.rows[0].id;

            // Create chunk with embedding
            await this.pool.query(
                `INSERT INTO knowledge_chunks
                 (document_id, knowledge_base_id, chunk_index, content, embedding)
                 VALUES ($1, $2, $3, $4, $5)`,
                [docId, kbId, 0, doc.content, JSON.stringify(doc.embedding)]
            );
        }

        return kbId;
    }
}
