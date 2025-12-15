import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { config } from "../core/config";

interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

class Database {
    private pool: Pool;
    private static instance: Database;

    private constructor(dbConfig: DatabaseConfig) {
        this.pool = new Pool({
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database,
            user: dbConfig.user,
            password: dbConfig.password,
            max: dbConfig.max || 20,
            idleTimeoutMillis: dbConfig.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: dbConfig.connectionTimeoutMillis || 2000,
            // Set timezone to UTC to ensure consistent timestamp handling
            // This prevents timezone mismatches between Node.js and PostgreSQL
            options: "-c timezone=UTC"
        });

        this.pool.on("error", (err) => {
            console.error("Unexpected database error:", err);
        });
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            const dbConfig: DatabaseConfig = {
                host: config.database.host,
                port: config.database.port,
                database: config.database.database,
                user: config.database.user,
                password: config.database.password
            };
            Database.instance = new Database(dbConfig);
        }
        return Database.instance;
    }

    public async query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[]
    ): Promise<QueryResult<T>> {
        const start = Date.now();
        try {
            const result = await this.pool.query<T>(text, params);
            const duration = Date.now() - start;

            if (config.logLevel === "debug") {
                console.log("Executed query", { text, duration, rows: result.rowCount });
            }

            return result;
        } catch (error) {
            console.error("Database query error:", { text, error });
            throw error;
        }
    }

    public async getClient(): Promise<PoolClient> {
        return this.pool.connect();
    }

    public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async healthCheck(): Promise<boolean> {
        try {
            await this.query("SELECT 1");
            return true;
        } catch (_error) {
            return false;
        }
    }

    public getPool(): Pool {
        return this.pool;
    }
}

export const db = Database.getInstance();
export { Database };
