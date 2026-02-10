/**
 * Databricks SQL Statement Execution API Client
 *
 * Implements the Databricks SQL Statement Execution API 2.0 for executing
 * SQL queries against a SQL Warehouse.
 *
 * @see https://docs.databricks.com/api/workspace/statementexecution
 */

import { createServiceLogger } from "../../../../core/logging";

const logger = createServiceLogger("DatabricksClient");

export interface DatabricksConfig {
    host: string;
    accessToken: string;
    warehouseId: string;
    catalog?: string;
    schema?: string;
}

export interface StatementResponse {
    statement_id: string;
    status: {
        state: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "CLOSED";
        error?: {
            error_code: string;
            message: string;
        };
    };
    manifest?: {
        format: string;
        schema: {
            columns: Array<{
                name: string;
                type_name: string;
                type_text: string;
                position: number;
            }>;
        };
        total_row_count?: number;
        total_chunk_count?: number;
    };
    result?: {
        chunk_index?: number;
        row_offset?: number;
        row_count?: number;
        data_array?: unknown[][];
        next_chunk_index?: number;
        next_chunk_internal_link?: string;
    };
}

export interface QueryResult {
    columns: Array<{
        name: string;
        type: string;
    }>;
    rows: Record<string, unknown>[];
    rowCount: number;
}

export interface CatalogInfo {
    name: string;
    comment?: string;
    owner?: string;
}

export interface SchemaInfo {
    name: string;
    catalog_name: string;
    comment?: string;
    owner?: string;
}

export interface TableInfo {
    name: string;
    catalog_name: string;
    schema_name: string;
    table_type: string;
    comment?: string;
}

export class DatabricksClient {
    private readonly baseUrl: string;
    private readonly accessToken: string;
    private readonly warehouseId: string;
    private readonly catalog: string;
    private readonly schema: string;

    constructor(config: DatabricksConfig) {
        // Normalize host to not have trailing slash
        const host = config.host.replace(/\/$/, "");
        this.baseUrl = host.startsWith("https://") ? host : `https://${host}`;
        this.accessToken = config.accessToken;
        this.warehouseId = config.warehouseId;
        this.catalog = config.catalog || "main";
        this.schema = config.schema || "default";
    }

    /**
     * Execute a SQL statement and wait for results
     */
    async executeStatement(sql: string, options?: { timeout?: number }): Promise<QueryResult> {
        const timeout = options?.timeout || 300000; // 5 minute default
        const startTime = Date.now();

        // Submit the statement
        const response = await this.submitStatement(sql);
        const statementId = response.statement_id;
        let status = response.status;

        // Poll for completion
        while (status.state === "PENDING" || status.state === "RUNNING") {
            if (Date.now() - startTime > timeout) {
                // Cancel the statement
                await this.cancelStatement(statementId);
                throw new Error("Query execution timed out");
            }

            await this.sleep(500);
            const statusResponse = await this.getStatementStatus(statementId);
            status = statusResponse.status;

            if (status.state === "SUCCEEDED") {
                return this.parseResults(statusResponse);
            }
        }

        if (status.state === "FAILED") {
            throw new Error(status.error?.message || "Query execution failed");
        }

        if (status.state === "CANCELED") {
            throw new Error("Query was canceled");
        }

        // If we got here with SUCCEEDED, parse the results
        if (status.state === "SUCCEEDED") {
            const finalResponse = await this.getStatementStatus(statementId);
            return this.parseResults(finalResponse);
        }

        throw new Error(`Unexpected statement state: ${status.state}`);
    }

    /**
     * Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE)
     */
    async executeModification(sql: string): Promise<{ rowsAffected: number }> {
        const response = await this.executeStatement(sql);
        return { rowsAffected: response.rowCount };
    }

    /**
     * List all catalogs in the workspace
     */
    async listCatalogs(): Promise<CatalogInfo[]> {
        const result = await this.executeStatement("SHOW CATALOGS");
        return result.rows.map((row) => ({
            name: row.catalog as string,
            comment: row.comment as string | undefined,
            owner: row.owner as string | undefined
        }));
    }

    /**
     * List all schemas in a catalog
     */
    async listSchemas(catalog?: string): Promise<SchemaInfo[]> {
        const catalogName = catalog || this.catalog;
        const result = await this.executeStatement(
            `SHOW SCHEMAS IN ${this.escapeIdentifier(catalogName)}`
        );
        return result.rows.map((row) => ({
            name:
                (row.databaseName as string) ||
                (row.schemaName as string) ||
                (row.schema_name as string),
            catalog_name: catalogName,
            comment: row.comment as string | undefined,
            owner: row.owner as string | undefined
        }));
    }

    /**
     * List all tables in a schema
     */
    async listTables(catalog?: string, schema?: string): Promise<TableInfo[]> {
        const catalogName = catalog || this.catalog;
        const schemaName = schema || this.schema;
        const result = await this.executeStatement(
            `SHOW TABLES IN ${this.escapeIdentifier(catalogName)}.${this.escapeIdentifier(schemaName)}`
        );
        return result.rows.map((row) => ({
            name: (row.tableName as string) || (row.table_name as string),
            catalog_name: catalogName,
            schema_name: schemaName,
            table_type: row.isTemporary === true ? "TEMPORARY" : "TABLE",
            comment: row.comment as string | undefined
        }));
    }

    /**
     * Submit a SQL statement for execution
     */
    private async submitStatement(sql: string): Promise<StatementResponse> {
        const url = `${this.baseUrl}/api/2.0/sql/statements`;

        const body = {
            warehouse_id: this.warehouseId,
            catalog: this.catalog,
            schema: this.schema,
            statement: sql,
            wait_timeout: "0s", // Don't wait, we'll poll
            disposition: "INLINE",
            format: "JSON_ARRAY"
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error(
                { status: response.status, body: errorBody },
                "Failed to submit statement"
            );
            throw new Error(`Failed to submit statement: ${response.status} ${errorBody}`);
        }

        return response.json() as Promise<StatementResponse>;
    }

    /**
     * Get the status and results of a statement
     */
    private async getStatementStatus(statementId: string): Promise<StatementResponse> {
        const url = `${this.baseUrl}/api/2.0/sql/statements/${statementId}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error(
                { status: response.status, body: errorBody },
                "Failed to get statement status"
            );
            throw new Error(`Failed to get statement status: ${response.status} ${errorBody}`);
        }

        return response.json() as Promise<StatementResponse>;
    }

    /**
     * Cancel a running statement
     */
    private async cancelStatement(statementId: string): Promise<void> {
        const url = `${this.baseUrl}/api/2.0/sql/statements/${statementId}/cancel`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.warn({ status: response.status, body: errorBody }, "Failed to cancel statement");
        }
    }

    /**
     * Parse statement results into a QueryResult
     */
    private parseResults(response: StatementResponse): QueryResult {
        const manifest = response.manifest;
        const result = response.result;

        if (!manifest || !result) {
            return { columns: [], rows: [], rowCount: 0 };
        }

        const columns = manifest.schema.columns.map((col) => ({
            name: col.name,
            type: col.type_name
        }));

        const rows: Record<string, unknown>[] = [];
        if (result.data_array) {
            for (const dataRow of result.data_array) {
                const row: Record<string, unknown> = {};
                columns.forEach((col, index) => {
                    row[col.name] = dataRow[index];
                });
                rows.push(row);
            }
        }

        return {
            columns,
            rows,
            rowCount: manifest.total_row_count ?? rows.length
        };
    }

    /**
     * Escape an identifier for use in SQL
     */
    private escapeIdentifier(identifier: string): string {
        // Replace backticks with double backticks and wrap in backticks
        return "`" + identifier.replace(/`/g, "``") + "`";
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
        // No persistent connections to close
    }
}
