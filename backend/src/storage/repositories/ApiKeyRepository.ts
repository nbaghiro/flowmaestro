import * as crypto from "crypto";
import { db } from "../database";
import type {
    ApiKeyModel,
    ApiKeyWithSecret,
    CreateApiKeyInput,
    UpdateApiKeyInput,
    ApiKeyListItem,
    ApiKeyScope
} from "../models/ApiKey";

const API_KEY_PREFIX = "fm_live_";
const KEY_LENGTH = 32; // 32 bytes = 256 bits

interface ApiKeyRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    scopes: string[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: string | Date | null;
    last_used_at: string | Date | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: string | Date;
    updated_at: string | Date;
    revoked_at: string | Date | null;
}

export class ApiKeyRepository {
    /**
     * Generate a secure random API key.
     * Format: fm_live_<32-char-base62>
     */
    private generateKey(): string {
        const bytes = crypto.randomBytes(KEY_LENGTH);
        const base62 = this.toBase62(bytes);
        return `${API_KEY_PREFIX}${base62}`;
    }

    /**
     * Convert bytes to base62 string.
     */
    private toBase62(bytes: Buffer): string {
        const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        let result = "";
        let value = BigInt("0x" + bytes.toString("hex"));

        while (value > 0n) {
            result = chars[Number(value % 62n)] + result;
            value = value / 62n;
        }

        // Pad to consistent length
        while (result.length < 43) {
            result = "0" + result;
        }

        return result.slice(0, 32);
    }

    /**
     * Hash an API key using SHA-256.
     */
    private hashKey(key: string): string {
        return crypto.createHash("sha256").update(key).digest("hex");
    }

    /**
     * Extract the prefix (first 12 chars) from an API key for display.
     */
    private extractPrefix(key: string): string {
        return key.slice(0, 12);
    }

    /**
     * Create a new API key. Returns the key with the raw secret (only time it's available).
     */
    async create(input: CreateApiKeyInput): Promise<ApiKeyWithSecret> {
        const rawKey = this.generateKey();
        const keyHash = this.hashKey(rawKey);
        const keyPrefix = this.extractPrefix(rawKey);

        const query = `
            INSERT INTO flowmaestro.api_keys (
                user_id, workspace_id, name, key_prefix, key_hash, scopes,
                rate_limit_per_minute, rate_limit_per_day, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.workspace_id,
            input.name,
            keyPrefix,
            keyHash,
            input.scopes,
            input.rate_limit_per_minute ?? 60,
            input.rate_limit_per_day ?? 10000,
            input.expires_at ?? null
        ];

        const result = await db.query<ApiKeyRow>(query, values);
        const model = this.mapRow(result.rows[0]);

        return {
            ...model,
            key: rawKey
        };
    }

    /**
     * Find an API key by its hash (for authentication).
     */
    async findByHash(keyHash: string): Promise<ApiKeyModel | null> {
        const query = `
            SELECT * FROM flowmaestro.api_keys
            WHERE key_hash = $1
        `;

        const result = await db.query<ApiKeyRow>(query, [keyHash]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Find an API key by raw key value (hashes and looks up).
     */
    async findByKey(rawKey: string): Promise<ApiKeyModel | null> {
        const keyHash = this.hashKey(rawKey);
        return this.findByHash(keyHash);
    }

    /**
     * Find an API key by ID.
     */
    async findById(id: string): Promise<ApiKeyModel | null> {
        const query = `
            SELECT * FROM flowmaestro.api_keys
            WHERE id = $1
        `;

        const result = await db.query<ApiKeyRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Find an API key by ID and user ID (for ownership verification).
     */
    async findByIdAndUserId(id: string, userId: string): Promise<ApiKeyModel | null> {
        const query = `
            SELECT * FROM flowmaestro.api_keys
            WHERE id = $1 AND user_id = $2
        `;

        const result = await db.query<ApiKeyRow>(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Find an API key by ID and workspace ID (for workspace-based access control).
     */
    async findByIdAndWorkspaceId(id: string, workspaceId: string): Promise<ApiKeyModel | null> {
        const query = `
            SELECT * FROM flowmaestro.api_keys
            WHERE id = $1 AND workspace_id = $2
        `;

        const result = await db.query<ApiKeyRow>(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * List all API keys for a user.
     */
    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; includeRevoked?: boolean } = {}
    ): Promise<{ keys: ApiKeyListItem[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const includeRevoked = options.includeRevoked || false;

        const whereClause = includeRevoked
            ? "WHERE user_id = $1"
            : "WHERE user_id = $1 AND revoked_at IS NULL";

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.api_keys
            ${whereClause}
        `;

        const query = `
            SELECT * FROM flowmaestro.api_keys
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, keysResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<ApiKeyRow>(query, [userId, limit, offset])
        ]);

        return {
            keys: keysResult.rows.map((row) => this.mapToListItem(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * List all API keys for a workspace.
     */
    async findByWorkspaceId(
        workspaceId: string,
        options: { limit?: number; offset?: number; includeRevoked?: boolean } = {}
    ): Promise<{ keys: ApiKeyListItem[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const includeRevoked = options.includeRevoked || false;

        const whereClause = includeRevoked
            ? "WHERE workspace_id = $1"
            : "WHERE workspace_id = $1 AND revoked_at IS NULL";

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.api_keys
            ${whereClause}
        `;

        const query = `
            SELECT * FROM flowmaestro.api_keys
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, keysResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [workspaceId]),
            db.query<ApiKeyRow>(query, [workspaceId, limit, offset])
        ]);

        return {
            keys: keysResult.rows.map((row) => this.mapToListItem(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Update an API key by user ID.
     */
    async update(
        id: string,
        userId: string,
        input: UpdateApiKeyInput
    ): Promise<ApiKeyModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.scopes !== undefined) {
            updates.push(`scopes = $${paramIndex++}`);
            values.push(input.scopes);
        }

        if (input.rate_limit_per_minute !== undefined) {
            updates.push(`rate_limit_per_minute = $${paramIndex++}`);
            values.push(input.rate_limit_per_minute);
        }

        if (input.rate_limit_per_day !== undefined) {
            updates.push(`rate_limit_per_day = $${paramIndex++}`);
            values.push(input.rate_limit_per_day);
        }

        if (input.expires_at !== undefined) {
            updates.push(`expires_at = $${paramIndex++}`);
            values.push(input.expires_at);
        }

        if (input.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(input.is_active);
        }

        if (updates.length === 0) {
            return this.findByIdAndUserId(id, userId);
        }

        values.push(id, userId);
        const query = `
            UPDATE flowmaestro.api_keys
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND revoked_at IS NULL
            RETURNING *
        `;

        const result = await db.query<ApiKeyRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Update an API key by workspace ID.
     */
    async updateByWorkspaceId(
        id: string,
        workspaceId: string,
        input: UpdateApiKeyInput
    ): Promise<ApiKeyModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.scopes !== undefined) {
            updates.push(`scopes = $${paramIndex++}`);
            values.push(input.scopes);
        }

        if (input.rate_limit_per_minute !== undefined) {
            updates.push(`rate_limit_per_minute = $${paramIndex++}`);
            values.push(input.rate_limit_per_minute);
        }

        if (input.rate_limit_per_day !== undefined) {
            updates.push(`rate_limit_per_day = $${paramIndex++}`);
            values.push(input.rate_limit_per_day);
        }

        if (input.expires_at !== undefined) {
            updates.push(`expires_at = $${paramIndex++}`);
            values.push(input.expires_at);
        }

        if (input.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(input.is_active);
        }

        if (updates.length === 0) {
            return this.findByIdAndWorkspaceId(id, workspaceId);
        }

        values.push(id, workspaceId);
        const query = `
            UPDATE flowmaestro.api_keys
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex} AND revoked_at IS NULL
            RETURNING *
        `;

        const result = await db.query<ApiKeyRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Update last used timestamp and IP (non-blocking, for tracking).
     */
    async updateLastUsed(id: string, ip: string | null): Promise<void> {
        const query = `
            UPDATE flowmaestro.api_keys
            SET last_used_at = CURRENT_TIMESTAMP, last_used_ip = $2
            WHERE id = $1
        `;

        await db.query(query, [id, ip]);
    }

    /**
     * Revoke an API key by user ID.
     */
    async revoke(id: string, userId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.api_keys
            SET revoked_at = CURRENT_TIMESTAMP, is_active = false
            WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Revoke an API key by workspace ID.
     */
    async revokeByWorkspaceId(id: string, workspaceId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.api_keys
            SET revoked_at = CURRENT_TIMESTAMP, is_active = false
            WHERE id = $1 AND workspace_id = $2 AND revoked_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Rotate an API key by user ID (revoke old, create new with same settings).
     */
    async rotate(id: string, userId: string): Promise<ApiKeyWithSecret | null> {
        const existingKey = await this.findByIdAndUserId(id, userId);
        if (!existingKey || existingKey.revoked_at) {
            return null;
        }

        // Revoke the old key
        await this.revoke(id, userId);

        // Create a new key with the same settings
        return this.create({
            user_id: userId,
            workspace_id: existingKey.workspace_id,
            name: existingKey.name,
            scopes: existingKey.scopes,
            rate_limit_per_minute: existingKey.rate_limit_per_minute,
            rate_limit_per_day: existingKey.rate_limit_per_day,
            expires_at: existingKey.expires_at
        });
    }

    /**
     * Rotate an API key by workspace ID (revoke old, create new with same settings).
     */
    async rotateByWorkspaceId(
        id: string,
        workspaceId: string,
        userId: string
    ): Promise<ApiKeyWithSecret | null> {
        const existingKey = await this.findByIdAndWorkspaceId(id, workspaceId);
        if (!existingKey || existingKey.revoked_at) {
            return null;
        }

        // Revoke the old key
        await this.revokeByWorkspaceId(id, workspaceId);

        // Create a new key with the same settings
        return this.create({
            user_id: userId,
            workspace_id: workspaceId,
            name: existingKey.name,
            scopes: existingKey.scopes,
            rate_limit_per_minute: existingKey.rate_limit_per_minute,
            rate_limit_per_day: existingKey.rate_limit_per_day,
            expires_at: existingKey.expires_at
        });
    }

    /**
     * Check if an API key has a specific scope.
     */
    hasScope(key: ApiKeyModel, scope: ApiKeyScope): boolean {
        return key.scopes.includes(scope);
    }

    /**
     * Check if an API key has all specified scopes.
     */
    hasScopes(key: ApiKeyModel, scopes: ApiKeyScope[]): boolean {
        return scopes.every((scope) => key.scopes.includes(scope));
    }

    /**
     * Check if an API key is valid (active, not expired, not revoked).
     */
    isValid(key: ApiKeyModel): boolean {
        if (!key.is_active) return false;
        if (key.revoked_at) return false;
        if (key.expires_at && new Date() > key.expires_at) return false;
        return true;
    }

    private mapRow(row: ApiKeyRow): ApiKeyModel {
        return {
            id: row.id,
            user_id: row.user_id,
            workspace_id: row.workspace_id,
            name: row.name,
            key_prefix: row.key_prefix,
            key_hash: row.key_hash,
            scopes: row.scopes as ApiKeyScope[],
            rate_limit_per_minute: row.rate_limit_per_minute,
            rate_limit_per_day: row.rate_limit_per_day,
            expires_at: row.expires_at ? new Date(row.expires_at) : null,
            last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
            last_used_ip: row.last_used_ip,
            is_active: row.is_active,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            revoked_at: row.revoked_at ? new Date(row.revoked_at) : null
        };
    }

    private mapToListItem(row: ApiKeyRow): ApiKeyListItem {
        return {
            id: row.id,
            name: row.name,
            key_prefix: row.key_prefix,
            scopes: row.scopes as ApiKeyScope[],
            rate_limit_per_minute: row.rate_limit_per_minute,
            rate_limit_per_day: row.rate_limit_per_day,
            expires_at: row.expires_at ? new Date(row.expires_at) : null,
            last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
            is_active: row.is_active,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }
}
