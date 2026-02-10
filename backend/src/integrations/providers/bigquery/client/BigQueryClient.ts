/**
 * BigQuery Client
 *
 * Implements the Google BigQuery API for executing SQL queries,
 * managing datasets and tables, and streaming data inserts.
 *
 * @see https://cloud.google.com/bigquery/docs/reference/rest
 */

import { BigQuery, Dataset, Table } from "@google-cloud/bigquery";
import { createServiceLogger } from "../../../../core/logging";

const logger = createServiceLogger("BigQueryClient");

export interface BigQueryConfig {
    projectId: string;
    serviceAccountKey: string;
    location?: string;
    defaultDataset?: string;
}

export interface QueryResult {
    columns: Array<{
        name: string;
        type: string;
    }>;
    rows: Record<string, unknown>[];
    rowCount: number;
    totalBytesProcessed?: number;
}

export interface DatasetInfo {
    id: string;
    location: string;
    createdAt?: string;
    description?: string;
}

export interface TableInfo {
    id: string;
    datasetId: string;
    type: string;
    createdAt?: string;
    description?: string;
    numRows?: number;
}

export interface TableSchemaField {
    name: string;
    type: string;
    mode: string;
    description?: string;
    fields?: TableSchemaField[];
}

export interface TableSchema {
    tableId: string;
    datasetId: string;
    fields: TableSchemaField[];
    numRows?: number;
    numBytes?: number;
}

export interface InsertResult {
    insertedCount: number;
    errors?: Array<{
        row: number;
        errors: string[];
    }>;
}

export class BigQueryClient {
    private readonly client: BigQuery;
    private readonly projectId: string;
    private readonly location: string;
    private readonly defaultDataset?: string;

    constructor(config: BigQueryConfig) {
        this.projectId = config.projectId;
        this.location = config.location || "US";
        this.defaultDataset = config.defaultDataset;

        // Parse service account key JSON
        let credentials: { client_email: string; private_key: string };
        try {
            credentials = JSON.parse(config.serviceAccountKey);
        } catch (_error) {
            throw new Error("Invalid service account key JSON");
        }

        this.client = new BigQuery({
            projectId: this.projectId,
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key
            }
        });
    }

    /**
     * Execute a SQL query and return results
     */
    async executeQuery(
        query: string,
        options?: {
            useLegacySql?: boolean;
            timeout?: number;
            maxResults?: number;
        }
    ): Promise<QueryResult> {
        const timeoutMs = options?.timeout || 300000; // 5 minute default

        try {
            const jobResponse = await this.client.createQueryJob({
                query,
                useLegacySql: options?.useLegacySql ?? false,
                location: this.location,
                defaultDataset: this.defaultDataset
                    ? { projectId: this.projectId, datasetId: this.defaultDataset }
                    : undefined,
                jobTimeoutMs: timeoutMs
            });

            const job = Array.isArray(jobResponse) ? jobResponse[0] : jobResponse;

            const queryResultsResponse = await job.getQueryResults({
                maxResults: options?.maxResults
            });

            const rows = Array.isArray(queryResultsResponse)
                ? queryResultsResponse[0]
                : queryResultsResponse;

            // Get schema from job metadata
            const metadataResponse = await job.getMetadata();
            const metadata = Array.isArray(metadataResponse)
                ? metadataResponse[0]
                : metadataResponse;

            const stats = metadata as {
                statistics?: {
                    query?: {
                        schema?: { fields?: Array<{ name: string; type: string }> };
                        totalBytesProcessed?: string;
                    };
                };
            };
            const schema = stats.statistics?.query?.schema?.fields || [];
            const totalBytesProcessed = stats.statistics?.query?.totalBytesProcessed;

            const columns = schema.map((field) => ({
                name: field.name,
                type: field.type
            }));

            return {
                columns,
                rows: rows as Record<string, unknown>[],
                rowCount: rows.length,
                totalBytesProcessed: totalBytesProcessed
                    ? parseInt(totalBytesProcessed, 10)
                    : undefined
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Query failed";
            logger.error({ error, query }, "BigQuery query failed");
            throw new Error(message);
        }
    }

    /**
     * List all datasets in the project
     */
    async listDatasets(options?: { maxResults?: number }): Promise<DatasetInfo[]> {
        try {
            const [datasets] = await this.client.getDatasets({
                maxResults: options?.maxResults
            });

            return datasets.map((dataset: Dataset) => {
                const metadata = dataset.metadata;
                return {
                    id: dataset.id || "",
                    location: metadata?.location || this.location,
                    createdAt: metadata?.creationTime
                        ? new Date(parseInt(metadata.creationTime, 10)).toISOString()
                        : undefined,
                    description: metadata?.description
                };
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to list datasets";
            logger.error({ error }, "Failed to list datasets");
            throw new Error(message);
        }
    }

    /**
     * List all tables in a dataset
     */
    async listTables(datasetId: string, options?: { maxResults?: number }): Promise<TableInfo[]> {
        try {
            const dataset = this.client.dataset(datasetId);
            const [tables] = await dataset.getTables({
                maxResults: options?.maxResults
            });

            return tables.map((table: Table) => {
                const metadata = table.metadata;
                return {
                    id: table.id || "",
                    datasetId,
                    type: metadata?.type || "TABLE",
                    createdAt: metadata?.creationTime
                        ? new Date(parseInt(metadata.creationTime, 10)).toISOString()
                        : undefined,
                    description: metadata?.description,
                    numRows: metadata?.numRows ? parseInt(metadata.numRows, 10) : undefined
                };
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to list tables";
            logger.error({ error, datasetId }, "Failed to list tables");
            throw new Error(message);
        }
    }

    /**
     * Get table schema and metadata
     */
    async getTableSchema(datasetId: string, tableId: string): Promise<TableSchema> {
        try {
            const table = this.client.dataset(datasetId).table(tableId);
            const [metadata] = await table.getMetadata();

            const mapFields = (
                fields: Array<{
                    name: string;
                    type: string;
                    mode?: string;
                    description?: string;
                    fields?: Array<{
                        name: string;
                        type: string;
                        mode?: string;
                        description?: string;
                    }>;
                }>
            ): TableSchemaField[] => {
                return fields.map((field) => ({
                    name: field.name,
                    type: field.type,
                    mode: field.mode || "NULLABLE",
                    description: field.description,
                    fields: field.fields ? mapFields(field.fields) : undefined
                }));
            };

            return {
                tableId,
                datasetId,
                fields: mapFields(metadata.schema?.fields || []),
                numRows: metadata.numRows ? parseInt(metadata.numRows, 10) : undefined,
                numBytes: metadata.numBytes ? parseInt(metadata.numBytes, 10) : undefined
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to get table schema";
            logger.error({ error, datasetId, tableId }, "Failed to get table schema");
            throw new Error(message);
        }
    }

    /**
     * Insert rows using streaming insert
     */
    async insertRows(
        datasetId: string,
        tableId: string,
        rows: Record<string, unknown>[]
    ): Promise<InsertResult> {
        try {
            const table = this.client.dataset(datasetId).table(tableId);
            await table.insert(rows, {
                raw: false,
                skipInvalidRows: false,
                ignoreUnknownValues: false
            });

            // Response is empty array on success
            return {
                insertedCount: rows.length,
                errors: undefined
            };
        } catch (error) {
            // BigQuery streaming insert returns partial success with errors
            if (
                error &&
                typeof error === "object" &&
                "errors" in error &&
                Array.isArray((error as { errors: unknown[] }).errors)
            ) {
                const insertErrors = (
                    error as {
                        errors: Array<{
                            row: number;
                            errors: Array<{ reason: string; message: string }>;
                        }>;
                    }
                ).errors;

                const formattedErrors = insertErrors.map((err) => ({
                    row: err.row,
                    errors: err.errors.map((e) => e.message)
                }));

                logger.warn({ errors: formattedErrors }, "Partial insert failures");

                return {
                    insertedCount: rows.length - insertErrors.length,
                    errors: formattedErrors
                };
            }

            const message = error instanceof Error ? error.message : "Insert failed";
            logger.error({ error, datasetId, tableId }, "BigQuery insert failed");
            throw new Error(message);
        }
    }

    /**
     * Close the client (cleanup)
     */
    async close(): Promise<void> {
        // BigQuery client doesn't maintain persistent connections
    }
}
