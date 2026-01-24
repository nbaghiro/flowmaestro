import { db } from "../database";
import type {
    PersonaInstanceConnectionModel,
    CreatePersonaInstanceConnectionInput,
    PersonaInstanceConnectionWithDetails
} from "../models/PersonaInstanceConnection";

/**
 * Database row interface for persona_instance_connections table
 */
interface PersonaInstanceConnectionRow {
    id: string;
    instance_id: string;
    connection_id: string;
    granted_scopes: string[] | string;
    created_at: string | Date;
}

/**
 * Database row with joined connection data
 */
interface PersonaInstanceConnectionDetailRow extends PersonaInstanceConnectionRow {
    connection_name: string;
    connection_provider: string;
    connection_method: string;
}

export class PersonaInstanceConnectionRepository {
    /**
     * Create a new persona instance connection
     */
    async create(
        input: CreatePersonaInstanceConnectionInput
    ): Promise<PersonaInstanceConnectionModel> {
        const query = `
            INSERT INTO flowmaestro.persona_instance_connections (
                instance_id, connection_id, granted_scopes
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (instance_id, connection_id)
            DO UPDATE SET granted_scopes = $3
            RETURNING *
        `;

        const values = [
            input.instance_id,
            input.connection_id,
            JSON.stringify(input.granted_scopes || [])
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as PersonaInstanceConnectionRow);
    }

    /**
     * Create multiple connections at once
     */
    async createMany(
        inputs: CreatePersonaInstanceConnectionInput[]
    ): Promise<PersonaInstanceConnectionModel[]> {
        if (inputs.length === 0) return [];

        const results: PersonaInstanceConnectionModel[] = [];
        for (const input of inputs) {
            const connection = await this.create(input);
            results.push(connection);
        }
        return results;
    }

    /**
     * Find all connections for an instance
     */
    async findByInstanceId(instanceId: string): Promise<PersonaInstanceConnectionModel[]> {
        const query = `
            SELECT * FROM flowmaestro.persona_instance_connections
            WHERE instance_id = $1
            ORDER BY created_at ASC
        `;

        const result = await db.query(query, [instanceId]);
        return result.rows.map((row) => this.mapRow(row as PersonaInstanceConnectionRow));
    }

    /**
     * Find all connections for an instance with connection details
     */
    async findByInstanceIdWithDetails(
        instanceId: string
    ): Promise<PersonaInstanceConnectionWithDetails[]> {
        const query = `
            SELECT
                pic.*,
                c.name as connection_name,
                c.provider as connection_provider,
                c.connection_method as connection_method
            FROM flowmaestro.persona_instance_connections pic
            JOIN flowmaestro.connections c ON pic.connection_id = c.id
            WHERE pic.instance_id = $1
            ORDER BY pic.created_at ASC
        `;

        const result = await db.query(query, [instanceId]);
        return result.rows.map((row) =>
            this.mapRowWithDetails(row as PersonaInstanceConnectionDetailRow)
        );
    }

    /**
     * Find a specific connection for an instance
     */
    async findByInstanceAndConnection(
        instanceId: string,
        connectionId: string
    ): Promise<PersonaInstanceConnectionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.persona_instance_connections
            WHERE instance_id = $1 AND connection_id = $2
        `;

        const result = await db.query(query, [instanceId, connectionId]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as PersonaInstanceConnectionRow)
            : null;
    }

    /**
     * Check if instance has access to a specific provider
     */
    async hasProviderAccess(instanceId: string, provider: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM flowmaestro.persona_instance_connections pic
            JOIN flowmaestro.connections c ON pic.connection_id = c.id
            WHERE pic.instance_id = $1 AND c.provider = $2
            LIMIT 1
        `;

        const result = await db.query(query, [instanceId, provider]);
        return result.rows.length > 0;
    }

    /**
     * Get connection for a specific provider (first one if multiple)
     */
    async getConnectionForProvider(
        instanceId: string,
        provider: string
    ): Promise<PersonaInstanceConnectionWithDetails | null> {
        const query = `
            SELECT
                pic.*,
                c.name as connection_name,
                c.provider as connection_provider,
                c.connection_method as connection_method
            FROM flowmaestro.persona_instance_connections pic
            JOIN flowmaestro.connections c ON pic.connection_id = c.id
            WHERE pic.instance_id = $1 AND c.provider = $2
            LIMIT 1
        `;

        const result = await db.query(query, [instanceId, provider]);
        return result.rows.length > 0
            ? this.mapRowWithDetails(result.rows[0] as PersonaInstanceConnectionDetailRow)
            : null;
    }

    /**
     * Update granted scopes for a connection
     */
    async updateScopes(
        instanceId: string,
        connectionId: string,
        scopes: string[]
    ): Promise<PersonaInstanceConnectionModel | null> {
        const query = `
            UPDATE flowmaestro.persona_instance_connections
            SET granted_scopes = $3
            WHERE instance_id = $1 AND connection_id = $2
            RETURNING *
        `;

        const result = await db.query(query, [instanceId, connectionId, JSON.stringify(scopes)]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as PersonaInstanceConnectionRow)
            : null;
    }

    /**
     * Delete a connection from an instance
     */
    async delete(instanceId: string, connectionId: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.persona_instance_connections
            WHERE instance_id = $1 AND connection_id = $2
        `;

        const result = await db.query(query, [instanceId, connectionId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Delete all connections for an instance
     */
    async deleteAllForInstance(instanceId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.persona_instance_connections
            WHERE instance_id = $1
        `;

        const result = await db.query(query, [instanceId]);
        return result.rowCount || 0;
    }

    /**
     * Map database row to model
     */
    private mapRow(row: PersonaInstanceConnectionRow): PersonaInstanceConnectionModel {
        return {
            id: row.id,
            instance_id: row.instance_id,
            connection_id: row.connection_id,
            granted_scopes:
                typeof row.granted_scopes === "string"
                    ? JSON.parse(row.granted_scopes)
                    : row.granted_scopes || [],
            created_at: new Date(row.created_at)
        };
    }

    /**
     * Map database row with details to model
     */
    private mapRowWithDetails(
        row: PersonaInstanceConnectionDetailRow
    ): PersonaInstanceConnectionWithDetails {
        return {
            id: row.id,
            instance_id: row.instance_id,
            connection_id: row.connection_id,
            granted_scopes:
                typeof row.granted_scopes === "string"
                    ? JSON.parse(row.granted_scopes)
                    : row.granted_scopes || [],
            created_at: new Date(row.created_at),
            connection: {
                id: row.connection_id,
                name: row.connection_name,
                provider: row.connection_provider,
                connection_method: row.connection_method
            }
        };
    }
}
