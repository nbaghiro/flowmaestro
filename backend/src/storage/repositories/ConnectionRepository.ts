import { getEncryptionService } from "../../services/EncryptionService";
import { db } from "../database";
import {
    ConnectionWithData,
    CreateConnectionInput,
    UpdateConnectionInput,
    ConnectionSummary,
    ConnectionData,
    ConnectionMethod,
    ConnectionStatus,
    ConnectionMetadata,
    ConnectionCapabilities
} from "../models/Connection";

// Database row interface matching PostgreSQL table structure
interface ConnectionRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    encrypted_data: string;
    metadata: ConnectionMetadata | string;
    status: ConnectionStatus;
    capabilities: ConnectionCapabilities | string;
    last_used_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
}

export class ConnectionRepository {
    private encryptionService = getEncryptionService();

    /**
     * Create a new connection
     */
    async create(input: CreateConnectionInput): Promise<ConnectionSummary> {
        // Encrypt the connection data
        const encryptedData = this.encryptionService.encryptObject(input.data);

        const query = `
            INSERT INTO flowmaestro.connections (
                user_id,
                workspace_id,
                name,
                connection_method,
                provider,
                encrypted_data,
                metadata,
                status,
                capabilities
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.workspace_id,
            input.name,
            input.connection_method,
            input.provider,
            encryptedData,
            JSON.stringify(input.metadata || {}),
            input.status || "active",
            JSON.stringify(input.capabilities || {})
        ];

        const result = await db.query(query, values);
        return this.mapToSummary(result.rows[0] as ConnectionRow);
    }

    /**
     * Find connection by ID (returns summary without decrypted data)
     */
    async findById(id: string): Promise<ConnectionSummary | null> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0] as ConnectionRow) : null;
    }

    /**
     * Find connection by ID with decrypted data
     * ONLY use when you need the actual connection credentials
     */
    async findByIdWithData(id: string): Promise<ConnectionWithData | null> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToConnectionWithData(result.rows[0] as ConnectionRow);
    }

    /**
     * Find connection by ID and workspace ID
     */
    async findByIdAndWorkspaceId(
        id: string,
        workspaceId: string
    ): Promise<ConnectionSummary | null> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE id = $1 AND workspace_id = $2
        `;

        const result = await db.query(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0] as ConnectionRow) : null;
    }

    /**
     * Find connections by workspace ID
     */
    async findByWorkspaceId(
        workspaceId: string,
        options: {
            limit?: number;
            offset?: number;
            provider?: string;
            connection_method?: ConnectionMethod;
            status?: ConnectionStatus;
        } = {}
    ): Promise<{ connections: ConnectionSummary[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.connections
            WHERE workspace_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.connections
            WHERE workspace_id = $1
        `;

        const countParams: unknown[] = [workspaceId];
        const queryParams: unknown[] = [workspaceId];

        // Add filters
        if (options.provider) {
            countQuery += ` AND provider = $${countParams.length + 1}`;
            query += ` AND provider = $${queryParams.length + 1}`;
            countParams.push(options.provider);
            queryParams.push(options.provider);
        }

        if (options.connection_method) {
            countQuery += ` AND connection_method = $${countParams.length + 1}`;
            query += ` AND connection_method = $${queryParams.length + 1}`;
            countParams.push(options.connection_method);
            queryParams.push(options.connection_method);
        }

        if (options.status) {
            countQuery += ` AND status = $${countParams.length + 1}`;
            query += ` AND status = $${queryParams.length + 1}`;
            countParams.push(options.status);
            queryParams.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, connectionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query(query, queryParams)
        ]);

        return {
            connections: connectionsResult.rows.map((row) =>
                this.mapToSummary(row as ConnectionRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * @deprecated Use findByWorkspaceId instead. Kept for backward compatibility.
     */
    async findByUserId(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
            provider?: string;
            connection_method?: ConnectionMethod;
            status?: ConnectionStatus;
        } = {}
    ): Promise<{ connections: ConnectionSummary[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.connections
            WHERE user_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.connections
            WHERE user_id = $1
        `;

        const countParams: unknown[] = [userId];
        const queryParams: unknown[] = [userId];

        // Add filters
        if (options.provider) {
            countQuery += ` AND provider = $${countParams.length + 1}`;
            query += ` AND provider = $${queryParams.length + 1}`;
            countParams.push(options.provider);
            queryParams.push(options.provider);
        }

        if (options.connection_method) {
            countQuery += ` AND connection_method = $${countParams.length + 1}`;
            query += ` AND connection_method = $${queryParams.length + 1}`;
            countParams.push(options.connection_method);
            queryParams.push(options.connection_method);
        }

        if (options.status) {
            countQuery += ` AND status = $${countParams.length + 1}`;
            query += ` AND status = $${queryParams.length + 1}`;
            countParams.push(options.status);
            queryParams.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, connectionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query(query, queryParams)
        ]);

        return {
            connections: connectionsResult.rows.map((row) =>
                this.mapToSummary(row as ConnectionRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find connections by provider in a workspace
     */
    async findByProviderInWorkspace(
        workspaceId: string,
        provider: string
    ): Promise<ConnectionSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE workspace_id = $1 AND provider = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [workspaceId, provider]);
        return result.rows.map((row) => this.mapToSummary(row as ConnectionRow));
    }

    /**
     * @deprecated Use findByProviderInWorkspace instead. Kept for backward compatibility.
     */
    async findByProvider(userId: string, provider: string): Promise<ConnectionSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE user_id = $1 AND provider = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [userId, provider]);
        return result.rows.map((row) => this.mapToSummary(row as ConnectionRow));
    }

    /**
     * Find connections by connection method in a workspace
     */
    async findByMethodInWorkspace(
        workspaceId: string,
        method: ConnectionMethod
    ): Promise<ConnectionSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE workspace_id = $1 AND connection_method = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [workspaceId, method]);
        return result.rows.map((row) => this.mapToSummary(row as ConnectionRow));
    }

    /**
     * @deprecated Use findByMethodInWorkspace instead. Kept for backward compatibility.
     */
    async findByMethod(userId: string, method: ConnectionMethod): Promise<ConnectionSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE user_id = $1 AND connection_method = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [userId, method]);
        return result.rows.map((row) => this.mapToSummary(row as ConnectionRow));
    }

    /**
     * Update a connection
     */
    async update(id: string, input: UpdateConnectionInput): Promise<ConnectionSummary | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.data !== undefined) {
            updates.push(`encrypted_data = $${paramIndex++}`);
            values.push(this.encryptionService.encryptObject(input.data));
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.capabilities !== undefined) {
            updates.push(`capabilities = $${paramIndex++}`);
            values.push(JSON.stringify(input.capabilities));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.connections
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0] as ConnectionRow) : null;
    }

    /**
     * Update OAuth tokens (for token refresh)
     */
    async updateTokens(id: string, tokenData: unknown): Promise<void> {
        // First, get the current connection to preserve other data
        const current = await this.findByIdWithData(id);
        if (!current) {
            throw new Error(`Connection not found: ${id}`);
        }

        // Merge new tokens with existing data
        const currentData = current.data as unknown as Record<string, unknown>;
        const updatedData = {
            ...currentData,
            ...(tokenData as unknown as Record<string, unknown>)
        };

        // Encrypt and update
        const encryptedData = this.encryptionService.encryptObject(updatedData);

        // Update metadata with new expiry time if provided
        let metadata = current.metadata as Record<string, unknown>;
        const tokenDataTyped = tokenData as { expires_in?: number };
        if (tokenDataTyped.expires_in) {
            metadata = {
                ...metadata,
                expires_at: Date.now() + tokenDataTyped.expires_in * 1000
            };
        }

        const query = `
            UPDATE flowmaestro.connections
            SET encrypted_data = $1, metadata = $2, status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;

        await db.query(query, [encryptedData, JSON.stringify(metadata), id]);
    }

    /**
     * Mark connection as used (update last_used_at)
     */
    async markAsUsed(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.connections
            SET last_used_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Update connection status
     */
    async updateStatus(id: string, status: ConnectionStatus): Promise<void> {
        const query = `
            UPDATE flowmaestro.connections
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;

        await db.query(query, [status, id]);
    }

    /**
     * Delete a connection
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.connections
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Check if connection is expired (for OAuth tokens)
     */
    isExpired(connection: ConnectionSummary): boolean {
        if (!connection.metadata?.expires_at) {
            return false;
        }

        // Consider expired if expires within 5 minutes
        const expiresAt = connection.metadata.expires_at;
        const now = Date.now();
        const buffer = 5 * 60 * 1000; // 5 minutes

        return expiresAt < now + buffer;
    }

    /**
     * Get connections that need token refresh (for a specific user)
     */
    async findExpiringSoon(userId: string): Promise<ConnectionSummary[]> {
        // Get all OAuth connections
        const { connections } = await this.findByUserId(userId, {
            connection_method: "oauth2",
            status: "active"
        });

        // Filter to those expiring within 5 minutes
        return connections.filter((conn) => this.isExpired(conn));
    }

    /**
     * Get ALL connections that need token refresh (across all users)
     * Used by the automatic credential refresh scheduler
     *
     * @param bufferMs - Time buffer in milliseconds (default: 10 minutes)
     * @returns Connections with user_id included for tracking
     */
    async findAllExpiringSoon(
        bufferMs: number = 10 * 60 * 1000
    ): Promise<Array<ConnectionSummary & { user_id: string }>> {
        const expiryThreshold = Date.now() + bufferMs;

        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE connection_method = 'oauth2'
            AND status = 'active'
            AND (metadata->>'expires_at')::bigint > 0
            AND (metadata->>'expires_at')::bigint < $1
            ORDER BY (metadata->>'expires_at')::bigint ASC
        `;

        const result = await db.query(query, [expiryThreshold]);

        return result.rows.map((row) => {
            const summary = this.mapToSummary(row as ConnectionRow);
            return {
                ...summary,
                user_id: (row as ConnectionRow).user_id
            };
        });
    }

    /**
     * Get the user_id for a connection (for authorization checks)
     */
    async getOwnerId(connectionId: string): Promise<string | null> {
        const query = "SELECT user_id FROM flowmaestro.connections WHERE id = $1";
        const result = await db.query<{ user_id: string }>(query, [connectionId]);
        return result.rows[0]?.user_id || null;
    }

    /**
     * Map database row to summary (safe for API responses)
     */
    private mapToSummary(row: ConnectionRow): ConnectionSummary {
        return {
            id: row.id,
            name: row.name,
            connection_method: row.connection_method,
            provider: row.provider,
            status: row.status,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            capabilities:
                typeof row.capabilities === "string"
                    ? JSON.parse(row.capabilities)
                    : row.capabilities,
            last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    /**
     * Map database row to connection with decrypted data
     * ONLY use internally when you need the actual connection credentials
     */
    private mapToConnectionWithData(row: ConnectionRow): ConnectionWithData {
        const summary = this.mapToSummary(row);
        const data = this.encryptionService.decryptObject<ConnectionData>(row.encrypted_data);

        return {
            ...summary,
            user_id: row.user_id,
            workspace_id: row.workspace_id,
            data
        };
    }
}
