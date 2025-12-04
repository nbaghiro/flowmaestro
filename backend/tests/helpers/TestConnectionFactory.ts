/**
 * Test Connection Factory
 * Creates mock connections for testing without real API keys
 */

import { Pool } from "pg";
import { EncryptionService } from "../../src/services/EncryptionService";

export interface TestConnectionConfig {
    name: string;
    provider: string;
    connectionMethod: "api_key" | "oauth2" | "basic_auth";
    data: Record<string, unknown>;
}

export class TestConnectionFactory {
    private pool: Pool;
    private encryptionService: EncryptionService;
    private testUserId: string;

    constructor(pool: Pool, testUserId: string) {
        this.pool = pool;
        this.testUserId = testUserId;

        // Use encryption key from environment (same as worker uses)
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error("ENCRYPTION_KEY environment variable is required for tests");
        }
        this.encryptionService = new EncryptionService();
    }

    /**
     * Create a test connection and return connection ID
     */
    async createConnection(config: TestConnectionConfig): Promise<string> {
        const encryptedData = this.encryptionService.encryptObject(config.data);

        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO connections
             (user_id, name, connection_method, provider, encrypted_data, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             RETURNING id`,
            [this.testUserId, config.name, config.connectionMethod, config.provider, encryptedData]
        );

        return result.rows[0].id;
    }

    /**
     * Create OpenAI API key connection
     */
    async createOpenAIConnection(apiKey: string = "test-openai-key"): Promise<string> {
        return this.createConnection({
            name: "Test OpenAI Connection",
            provider: "openai",
            connectionMethod: "api_key",
            data: {
                api_key: apiKey
            }
        });
    }

    /**
     * Create Anthropic API key connection
     */
    async createAnthropicConnection(apiKey: string = "test-anthropic-key"): Promise<string> {
        return this.createConnection({
            name: "Test Anthropic Connection",
            provider: "anthropic",
            connectionMethod: "api_key",
            data: {
                api_key: apiKey
            }
        });
    }

    /**
     * Create Google AI API key connection
     */
    async createGoogleAIConnection(apiKey: string = "test-google-key"): Promise<string> {
        return this.createConnection({
            name: "Test Google AI Connection",
            provider: "google",
            connectionMethod: "api_key",
            data: {
                api_key: apiKey
            }
        });
    }

    /**
     * Create Hugging Face API key connection
     */
    async createHuggingFaceConnection(apiKey: string = "test-huggingface-key"): Promise<string> {
        return this.createConnection({
            name: "Test Hugging Face Connection",
            provider: "huggingface",
            connectionMethod: "api_key",
            data: {
                api_key: apiKey
            }
        });
    }

    /**
     * Create Slack OAuth connection
     */
    async createSlackConnection(accessToken: string = "test-slack-token"): Promise<string> {
        return this.createConnection({
            name: "Test Slack Connection",
            provider: "slack",
            connectionMethod: "oauth2",
            data: {
                accessToken,
                tokenType: "Bearer",
                scope: "chat:write,files:write",
                teamId: "T12345678",
                teamName: "Test Team"
            }
        });
    }

    /**
     * Create database connection
     */
    async createDatabaseConnection(
        provider: "postgresql" | "mongodb",
        connectionString: string
    ): Promise<string> {
        return this.createConnection({
            name: `Test ${provider} Connection`,
            provider,
            connectionMethod: "basic_auth",
            data: {
                connectionString
            }
        });
    }

    /**
     * Create HTTP basic auth connection
     */
    async createBasicAuthConnection(
        name: string,
        username: string,
        password: string
    ): Promise<string> {
        return this.createConnection({
            name,
            provider: "http",
            connectionMethod: "basic_auth",
            data: {
                username,
                password
            }
        });
    }

    /**
     * Get connection data (decrypted)
     */
    async getConnectionData(connectionId: string): Promise<Record<string, unknown>> {
        const result = await this.pool.query<{ encrypted_data: string }>(
            "SELECT encrypted_data FROM connections WHERE id = $1",
            [connectionId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        return this.encryptionService.decryptObject(result.rows[0].encrypted_data);
    }

    /**
     * Delete all test connections
     */
    async cleanup(): Promise<void> {
        await this.pool.query("DELETE FROM connections WHERE user_id = $1", [this.testUserId]);
    }
}
