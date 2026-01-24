import { randomBytes } from "crypto";
import type { ChatInterfaceSession, ChatInterfaceSessionStatus } from "@flowmaestro/shared";
import { db } from "../database";

// Database row interface
interface ChatInterfaceSessionRow {
    id: string;
    interface_id: string;
    session_token: string;
    browser_fingerprint: string | null;
    thread_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    referrer: string | null;
    country_code: string | null;
    status: ChatInterfaceSessionStatus;
    message_count: number;
    persistence_token: string | null;
    first_seen_at: string | Date;
    last_activity_at: string | Date;
    ended_at: string | Date | null;
    current_execution_id: string | null;
    execution_status: "idle" | "running" | "completed" | "failed";
}

// Input for creating a session
export interface CreateChatInterfaceSessionInput {
    interfaceId: string;
    browserFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    countryCode?: string;
    persistenceToken?: string;
}

export class ChatInterfaceSessionRepository {
    /**
     * Create a new session
     */
    async create(input: CreateChatInterfaceSessionInput): Promise<ChatInterfaceSession> {
        // Generate a unique session token
        const sessionToken = this.generateToken();
        // Generate persistence token if persistence is enabled (determined by caller)
        const persistenceToken = input.persistenceToken || null;

        const query = `
            INSERT INTO flowmaestro.chat_interface_sessions
                (interface_id, session_token, browser_fingerprint, ip_address,
                 user_agent, referrer, country_code, persistence_token)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            input.interfaceId,
            sessionToken,
            input.browserFingerprint || null,
            input.ipAddress || null,
            input.userAgent || null,
            input.referrer || null,
            input.countryCode || null,
            persistenceToken
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as ChatInterfaceSessionRow);
    }

    /**
     * Find session by ID
     */
    async findById(id: string): Promise<ChatInterfaceSession | null> {
        const query = `
            SELECT * FROM flowmaestro.chat_interface_sessions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Find session by session token
     */
    async findBySessionToken(
        interfaceId: string,
        sessionToken: string
    ): Promise<ChatInterfaceSession | null> {
        const query = `
            SELECT * FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1 AND session_token = $2
        `;

        const result = await db.query(query, [interfaceId, sessionToken]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Find session by interface slug and session token
     */
    async findBySlugAndToken(
        slug: string,
        sessionToken: string
    ): Promise<ChatInterfaceSession | null> {
        const query = `
            SELECT s.*
            FROM flowmaestro.chat_interface_sessions s
            JOIN flowmaestro.chat_interfaces i ON s.interface_id = i.id
            WHERE i.slug = $1 AND s.session_token = $2
        `;

        const result = await db.query(query, [slug, sessionToken]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Find session by persistence token (for localStorage resume)
     */
    async findByPersistenceToken(
        interfaceId: string,
        persistenceToken: string
    ): Promise<ChatInterfaceSession | null> {
        const query = `
            SELECT * FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1 AND persistence_token = $2 AND status = 'active'
            ORDER BY last_activity_at DESC
            LIMIT 1
        `;

        const result = await db.query(query, [interfaceId, persistenceToken]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Find session by browser fingerprint (for session continuity)
     */
    async findByFingerprint(
        interfaceId: string,
        fingerprint: string
    ): Promise<ChatInterfaceSession | null> {
        const query = `
            SELECT * FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1 AND browser_fingerprint = $2 AND status = 'active'
            ORDER BY last_activity_at DESC
            LIMIT 1
        `;

        const result = await db.query(query, [interfaceId, fingerprint]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Find sessions for a chat interface (admin view)
     */
    async findByInterfaceId(
        interfaceId: string,
        options: { limit?: number; offset?: number; status?: ChatInterfaceSessionStatus } = {}
    ): Promise<{ sessions: ChatInterfaceSession[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1
        `;

        const values: unknown[] = [interfaceId];

        if (options.status) {
            countQuery += " AND status = $2";
            query += " AND status = $2";
            values.push(options.status);
        }

        query += ` ORDER BY last_activity_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const [countResult, sessionsResult] = await Promise.all([
            db.query<{ count: string }>(
                countQuery,
                options.status ? [interfaceId, options.status] : [interfaceId]
            ),
            db.query(query, values)
        ]);

        return {
            sessions: sessionsResult.rows.map((row) => this.mapRow(row as ChatInterfaceSessionRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Update session's thread ID
     */
    async updateThreadId(id: string, threadId: string): Promise<ChatInterfaceSession | null> {
        const query = `
            UPDATE flowmaestro.chat_interface_sessions
            SET thread_id = $2, last_activity_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id, threadId]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Increment message count
     */
    async incrementMessageCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.chat_interface_sessions
            SET message_count = message_count + 1, last_activity_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async updateLastActivity(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.chat_interface_sessions
            SET last_activity_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Update execution status
     */
    async updateExecutionStatus(
        id: string,
        executionId: string | null,
        status: "idle" | "running" | "completed" | "failed"
    ): Promise<void> {
        const query = `
            UPDATE flowmaestro.chat_interface_sessions
            SET current_execution_id = $2, execution_status = $3, last_activity_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id, executionId, status]);
    }

    /**
     * End a session
     */
    async endSession(id: string): Promise<ChatInterfaceSession | null> {
        const query = `
            UPDATE flowmaestro.chat_interface_sessions
            SET status = 'ended', ended_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as ChatInterfaceSessionRow)
            : null;
    }

    /**
     * Expire old sessions (for background cleanup job)
     */
    async expireOldSessions(interfaceId: string, timeoutMinutes: number): Promise<number> {
        const query = `
            UPDATE flowmaestro.chat_interface_sessions
            SET status = 'expired'
            WHERE interface_id = $1
              AND status = 'active'
              AND last_activity_at < NOW() - INTERVAL '1 minute' * $2
        `;

        const result = await db.query(query, [interfaceId, timeoutMinutes]);
        return result.rowCount || 0;
    }

    /**
     * Count active sessions for a chat interface
     */
    async countActiveSessions(interfaceId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1 AND status = 'active'
        `;

        const result = await db.query<{ count: string }>(query, [interfaceId]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Get session statistics for analytics
     */
    async getSessionStats(
        interfaceId: string,
        hours: number = 24
    ): Promise<{
        totalSessions: number;
        activeSessions: number;
        totalMessages: number;
        avgMessagesPerSession: number;
    }> {
        const query = `
            SELECT
                COUNT(*) as total_sessions,
                COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
                COALESCE(SUM(message_count), 0) as total_messages,
                COALESCE(AVG(message_count), 0) as avg_messages
            FROM flowmaestro.chat_interface_sessions
            WHERE interface_id = $1
              AND first_seen_at > NOW() - INTERVAL '1 hour' * $2
        `;

        const result = await db.query<{
            total_sessions: string;
            active_sessions: string;
            total_messages: string;
            avg_messages: string;
        }>(query, [interfaceId, hours]);

        const row = result.rows[0];
        return {
            totalSessions: parseInt(row.total_sessions),
            activeSessions: parseInt(row.active_sessions),
            totalMessages: parseInt(row.total_messages),
            avgMessagesPerSession: parseFloat(row.avg_messages)
        };
    }

    /**
     * Generate persistence token for new session with localStorage persistence
     */
    generatePersistenceToken(): string {
        return this.generateToken();
    }

    /**
     * Generate a secure random token
     */
    private generateToken(): string {
        return randomBytes(32).toString("hex");
    }

    /**
     * Map database row to ChatInterfaceSession model
     */
    private mapRow(row: ChatInterfaceSessionRow): ChatInterfaceSession {
        return {
            id: row.id,
            interfaceId: row.interface_id,
            sessionToken: row.session_token,
            browserFingerprint: row.browser_fingerprint,
            threadId: row.thread_id,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            referrer: row.referrer,
            countryCode: row.country_code,
            status: row.status,
            messageCount: row.message_count,
            persistenceToken: row.persistence_token,
            firstSeenAt: new Date(row.first_seen_at),
            lastActivityAt: new Date(row.last_activity_at),
            endedAt: row.ended_at ? new Date(row.ended_at) : null,
            currentExecutionId: row.current_execution_id,
            executionStatus: row.execution_status
        };
    }
}
