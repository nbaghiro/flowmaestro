/**
 * Redshift Data API Client
 *
 * Implements the AWS Redshift Data API for executing SQL queries
 * against both provisioned clusters and Serverless workgroups.
 *
 * @see https://docs.aws.amazon.com/redshift-data/latest/APIReference/Welcome.html
 */

import {
    RedshiftDataClient,
    ExecuteStatementCommand,
    DescribeStatementCommand,
    GetStatementResultCommand,
    ListDatabasesCommand,
    ListSchemasCommand,
    ListTablesCommand,
    DescribeTableCommand,
    StatusString
} from "@aws-sdk/client-redshift-data";
import { createServiceLogger } from "../../../../core/logging";

const logger = createServiceLogger("RedshiftClient");

export interface RedshiftConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    database: string;
    dbUser?: string;
    clusterIdentifier?: string;
    workgroupName?: string;
}

export interface QueryResult {
    columns: Array<{
        name: string;
        type: string;
    }>;
    rows: Record<string, unknown>[];
    rowCount: number;
}

export interface DatabaseInfo {
    name: string;
}

export interface SchemaInfo {
    name: string;
}

export interface TableInfo {
    name: string;
    schema: string;
    type: string;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    length?: number;
    precision?: number;
    scale?: number;
}

export class RedshiftClient {
    private readonly client: RedshiftDataClient;
    private readonly database: string;
    private readonly dbUser?: string;
    private readonly clusterIdentifier?: string;
    private readonly workgroupName?: string;
    private readonly pollInterval = 500; // ms

    constructor(config: RedshiftConfig) {
        if (!config.clusterIdentifier && !config.workgroupName) {
            throw new Error(
                "Redshift connection requires either clusterIdentifier (provisioned) or workgroupName (serverless)"
            );
        }

        this.database = config.database;
        this.dbUser = config.dbUser;
        this.clusterIdentifier = config.clusterIdentifier;
        this.workgroupName = config.workgroupName;

        this.client = new RedshiftDataClient({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
            }
        });
    }

    /**
     * Execute a SQL statement and wait for results
     */
    async executeStatement(sql: string, options?: { timeout?: number }): Promise<QueryResult> {
        const timeout = options?.timeout || 300000; // 5 minute default
        const startTime = Date.now();

        // Submit the statement
        const executeResponse = await this.client.send(
            new ExecuteStatementCommand({
                Database: this.database,
                Sql: sql,
                ...(this.clusterIdentifier
                    ? { ClusterIdentifier: this.clusterIdentifier, DbUser: this.dbUser }
                    : { WorkgroupName: this.workgroupName })
            })
        );

        const statementId = executeResponse.Id;
        if (!statementId) {
            logger.error({ sql }, "Failed to get statement ID from Redshift");
            throw new Error("Failed to get statement ID from Redshift");
        }

        // Poll for completion
        let status: StatusString | undefined;
        let polling = true;

        while (polling) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Query execution timed out");
            }

            const describeResponse = await this.client.send(
                new DescribeStatementCommand({ Id: statementId })
            );

            status = describeResponse.Status;
            const errorMessage = describeResponse.Error;

            if (status === "FINISHED") {
                polling = false;
            } else if (status === "FAILED" || status === "ABORTED") {
                throw new Error(errorMessage || `Query ${status.toLowerCase()}`);
            } else {
                await this.sleep(this.pollInterval);
            }
        }

        // Get results
        const resultResponse = await this.client.send(
            new GetStatementResultCommand({ Id: statementId })
        );

        const columns =
            resultResponse.ColumnMetadata?.map((col) => ({
                name: col.name || "",
                type: col.typeName || "unknown"
            })) || [];

        const rows: Record<string, unknown>[] = [];
        if (resultResponse.Records) {
            for (const record of resultResponse.Records) {
                const row: Record<string, unknown> = {};
                record.forEach((field, index) => {
                    const colName = columns[index]?.name || `col_${index}`;
                    // Extract value from Field union type
                    row[colName] = this.extractFieldValue(field);
                });
                rows.push(row);
            }
        }

        return {
            columns,
            rows,
            rowCount: rows.length
        };
    }

    /**
     * Execute a data modification statement (INSERT, UPDATE, DELETE)
     */
    async executeModification(sql: string): Promise<{ rowsAffected: number }> {
        const result = await this.executeStatement(sql);
        return { rowsAffected: result.rowCount };
    }

    /**
     * List all databases
     */
    async listDatabases(): Promise<DatabaseInfo[]> {
        const response = await this.client.send(
            new ListDatabasesCommand({
                Database: this.database,
                ...(this.clusterIdentifier
                    ? { ClusterIdentifier: this.clusterIdentifier, DbUser: this.dbUser }
                    : { WorkgroupName: this.workgroupName })
            })
        );

        return (
            response.Databases?.map((db) => ({
                name: db
            })) || []
        );
    }

    /**
     * List all schemas in a database
     */
    async listSchemas(database?: string): Promise<SchemaInfo[]> {
        const response = await this.client.send(
            new ListSchemasCommand({
                Database: database || this.database,
                ...(this.clusterIdentifier
                    ? { ClusterIdentifier: this.clusterIdentifier, DbUser: this.dbUser }
                    : { WorkgroupName: this.workgroupName })
            })
        );

        return (
            response.Schemas?.map((schema) => ({
                name: schema
            })) || []
        );
    }

    /**
     * List all tables in a schema
     */
    async listTables(database?: string, schema?: string): Promise<TableInfo[]> {
        const response = await this.client.send(
            new ListTablesCommand({
                Database: database || this.database,
                SchemaPattern: schema || "public",
                ...(this.clusterIdentifier
                    ? { ClusterIdentifier: this.clusterIdentifier, DbUser: this.dbUser }
                    : { WorkgroupName: this.workgroupName })
            })
        );

        return (
            response.Tables?.map((table) => ({
                name: table.name || "",
                schema: table.schema || "public",
                type: table.type || "TABLE"
            })) || []
        );
    }

    /**
     * Describe table columns
     */
    async describeTable(table: string, database?: string, schema?: string): Promise<ColumnInfo[]> {
        const response = await this.client.send(
            new DescribeTableCommand({
                Database: database || this.database,
                Schema: schema || "public",
                Table: table,
                ...(this.clusterIdentifier
                    ? { ClusterIdentifier: this.clusterIdentifier, DbUser: this.dbUser }
                    : { WorkgroupName: this.workgroupName })
            })
        );

        return (
            response.ColumnList?.map((col) => ({
                name: col.name || "",
                type: col.typeName || "unknown",
                nullable: col.nullable !== 0,
                length: col.length,
                precision: col.precision,
                scale: col.scale
            })) || []
        );
    }

    /**
     * Extract value from Redshift Data API Field type
     */
    private extractFieldValue(field: {
        blobValue?: Uint8Array;
        booleanValue?: boolean;
        doubleValue?: number;
        isNull?: boolean;
        longValue?: number;
        stringValue?: string;
    }): unknown {
        if (field.isNull) return null;
        if (field.stringValue !== undefined) return field.stringValue;
        if (field.longValue !== undefined) return field.longValue;
        if (field.doubleValue !== undefined) return field.doubleValue;
        if (field.booleanValue !== undefined) return field.booleanValue;
        if (field.blobValue !== undefined) {
            return Buffer.from(field.blobValue).toString("base64");
        }
        return null;
    }

    /**
     * Sleep for a specified number of milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Close the client (cleanup)
     */
    async close(): Promise<void> {
        this.client.destroy();
    }
}
