import { db } from "../database";

type DatabaseProvider = "postgresql" | "mysql" | "mongodb";

interface DatabaseConnectionRow {
    id: string;
    user_id: string;
    name: string;
    provider: DatabaseProvider;
    host: string | null;
    port: number | null;
    database: string | null;
    username: string | null;
    password: string | null;
    connection_string: string | null;
    ssl_enabled: boolean;
    options: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDatabaseConnectionInput {
    user_id: string;
    name: string;
    provider: DatabaseProvider;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    connection_string?: string;
    ssl_enabled?: boolean;
    options?: Record<string, unknown>;
}

export class DatabaseConnectionRepository {
    async create(input: CreateDatabaseConnectionInput): Promise<DatabaseConnectionRow> {
        const query = `
            INSERT INTO flowmaestro.database_connections (
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.provider,
            input.host || null,
            input.port || null,
            input.database || null,
            input.username || null,
            input.password || null,
            input.connection_string || null,
            input.ssl_enabled ?? false,
            JSON.stringify(input.options || {})
        ];

        const result = await db.query<DatabaseConnectionRow>(query, values);
        return result.rows[0];
    }

    async findById(id: string): Promise<DatabaseConnectionRow | null> {
        const query = `
            SELECT *
            FROM flowmaestro.database_connections
            WHERE id = $1
        `;

        const result = await db.query<DatabaseConnectionRow>(query, [id]);
        return result.rows[0] || null;
    }
}
