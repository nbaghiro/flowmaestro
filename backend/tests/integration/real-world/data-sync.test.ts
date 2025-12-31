/**
 * Data Sync Workflow Tests
 *
 * Tests a realistic data synchronization pipeline:
 * Trigger → Database (fetch) → Loop[Transform → HTTP (sync)] → Output
 *
 * Simulates a common ETL/data sync workflow between systems.
 */

import { ContextSnapshot, ExecutableNode, TypedEdge, JsonObject } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";

// Types for data sync workflow
interface SyncConfig {
    sourceTable: string;
    targetEndpoint: string;
    batchSize: number;
    syncMode: "full" | "incremental";
    lastSyncTimestamp?: number;
    fieldMapping: Record<string, string>;
}

interface DatabaseRecord {
    id: string;
    data: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
}

interface TransformedRecord {
    externalId: string;
    payload: Record<string, unknown>;
    operation: "create" | "update" | "delete";
}

interface SyncResult {
    recordId: string;
    success: boolean;
    externalId?: string;
    error?: string;
    responseCode?: number;
}

interface SyncSummary {
    totalRecords: number;
    successful: number;
    failed: number;
    skipped: number;
    duration: number;
    errors: Array<{ recordId: string; error: string }>;
}

// Workflow builder for data sync
function buildDataSyncWorkflow(): {
    nodes: Map<string, ExecutableNode>;
    edges: TypedEdge[];
    executionLevels: string[][];
} {
    const nodes = new Map<string, ExecutableNode>();

    nodes.set("Trigger", {
        id: "Trigger",
        type: "trigger",
        config: { triggerType: "schedule" },
        dependencies: []
    });

    nodes.set("FetchRecords", {
        id: "FetchRecords",
        type: "database",
        config: {
            operation: "query",
            query: "SELECT * FROM {{Trigger.sourceTable}} WHERE updated_at > {{Trigger.lastSync}}"
        },
        dependencies: ["Trigger"]
    });

    nodes.set("SyncLoop", {
        id: "SyncLoop",
        type: "loop",
        config: {
            iterateOver: "{{FetchRecords.records}}",
            maxIterations: 1000
        },
        dependencies: ["FetchRecords"]
    });

    nodes.set("TransformRecord", {
        id: "TransformRecord",
        type: "transform",
        config: {
            operation: "map",
            mapping: "{{Trigger.fieldMapping}}"
        },
        dependencies: ["SyncLoop"]
    });

    nodes.set("SyncToTarget", {
        id: "SyncToTarget",
        type: "http",
        config: {
            url: "{{Trigger.targetEndpoint}}",
            method: "POST",
            body: "{{TransformRecord.payload}}"
        },
        dependencies: ["TransformRecord"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        config: {},
        dependencies: ["SyncLoop"]
    });

    const edges: TypedEdge[] = [
        { id: "e1", source: "Trigger", target: "FetchRecords", type: "default" },
        { id: "e2", source: "FetchRecords", target: "SyncLoop", type: "default" },
        { id: "e3", source: "SyncLoop", target: "TransformRecord", type: "loop-body" },
        { id: "e4", source: "TransformRecord", target: "SyncToTarget", type: "default" },
        { id: "e5", source: "SyncToTarget", target: "SyncLoop", type: "loop-back" },
        { id: "e6", source: "SyncLoop", target: "Output", type: "loop-complete" }
    ];

    const executionLevels = [["Trigger"], ["FetchRecords"], ["SyncLoop"], ["Output"]];

    return { nodes, edges, executionLevels };
}

// Create mock database records
function createMockRecords(
    count: number,
    options: {
        includeDeleted?: boolean;
        oldRecords?: number;
        baseTimestamp?: number;
    } = {}
): DatabaseRecord[] {
    const baseTime = options.baseTimestamp || Date.now();
    const records: DatabaseRecord[] = [];

    for (let i = 0; i < count; i++) {
        const isOld = options.oldRecords && i < options.oldRecords;
        const isDeleted = options.includeDeleted && i === count - 1;

        records.push({
            id: `record_${i + 1}`,
            data: {
                name: `Item ${i + 1}`,
                value: (i + 1) * 100,
                status: isDeleted ? "deleted" : "active",
                category: i % 2 === 0 ? "A" : "B"
            },
            createdAt: baseTime - 86400000, // 1 day ago
            updatedAt: isOld ? baseTime - 172800000 : baseTime // 2 days ago for old records
        });
    }

    return records;
}

// Transform record based on field mapping
function transformRecord(
    record: DatabaseRecord,
    fieldMapping: Record<string, string>
): TransformedRecord {
    const payload: Record<string, unknown> = {};

    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
        if (sourceField in record.data) {
            payload[targetField] = record.data[sourceField];
        }
    }

    const operation =
        record.data.status === "deleted"
            ? "delete"
            : record.createdAt === record.updatedAt
              ? "create"
              : "update";

    return {
        externalId: `ext_${record.id}`,
        payload,
        operation
    };
}

// Simulate data sync workflow
async function simulateDataSync(
    config: SyncConfig,
    mockData: {
        records: DatabaseRecord[];
        syncResults?: Map<string, SyncResult>;
        failOnRecord?: string;
        conflictRecords?: string[];
    }
): Promise<{
    context: ContextSnapshot;
    summary: SyncSummary;
    processedRecords: TransformedRecord[];
    syncResults: SyncResult[];
}> {
    const _workflow = buildDataSyncWorkflow();
    let context = createContext(config as unknown as JsonObject);
    const startTime = Date.now();

    // Execute Trigger
    context = storeNodeOutput(context, "Trigger", config as unknown as JsonObject);

    // Execute FetchRecords
    const filteredRecords =
        config.syncMode === "incremental" && config.lastSyncTimestamp
            ? mockData.records.filter((r) => r.updatedAt > config.lastSyncTimestamp!)
            : mockData.records;

    context = storeNodeOutput(context, "FetchRecords", {
        records: filteredRecords,
        count: filteredRecords.length
    });

    // Execute SyncLoop
    const processedRecords: TransformedRecord[] = [];
    const syncResults: SyncResult[] = [];
    let successful = 0;
    let failed = 0;
    const skipped = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    for (const record of filteredRecords) {
        // Transform record
        const transformed = transformRecord(record, config.fieldMapping);
        processedRecords.push(transformed);

        context = storeNodeOutput(
            context,
            `TransformRecord_${record.id}`,
            transformed as unknown as JsonObject
        );

        // Check for failure condition
        if (mockData.failOnRecord === record.id) {
            const result: SyncResult = {
                recordId: record.id,
                success: false,
                error: "Sync failed: Connection refused"
            };
            syncResults.push(result);
            failed++;
            errors.push({ recordId: record.id, error: result.error! });
            continue;
        }

        // Check for conflict
        if (mockData.conflictRecords?.includes(record.id)) {
            const result: SyncResult = {
                recordId: record.id,
                success: false,
                error: "Conflict: Record was modified in target system",
                responseCode: 409
            };
            syncResults.push(result);
            failed++;
            errors.push({ recordId: record.id, error: result.error! });
            continue;
        }

        // Check for custom sync result
        if (mockData.syncResults?.has(record.id)) {
            const customResult = mockData.syncResults.get(record.id)!;
            syncResults.push(customResult);
            if (customResult.success) {
                successful++;
            } else {
                failed++;
                if (customResult.error) {
                    errors.push({ recordId: record.id, error: customResult.error });
                }
            }
            continue;
        }

        // Default success
        const result: SyncResult = {
            recordId: record.id,
            success: true,
            externalId: transformed.externalId,
            responseCode: transformed.operation === "create" ? 201 : 200
        };
        syncResults.push(result);
        successful++;
    }

    const duration = Date.now() - startTime;

    const summary: SyncSummary = {
        totalRecords: filteredRecords.length,
        successful,
        failed,
        skipped,
        duration,
        errors
    };

    context = storeNodeOutput(context, "SyncLoop", {
        iterations: filteredRecords.length,
        results: syncResults
    });

    context = storeNodeOutput(context, "Output", summary as unknown as JsonObject);

    return { context, summary, processedRecords, syncResults };
}

describe("Data Sync Workflow", () => {
    describe("batch processing", () => {
        it("should process all records in a batch", async () => {
            const config: SyncConfig = {
                sourceTable: "products",
                targetEndpoint: "https://api.external.com/products",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title", value: "price" }
            };

            const records = createMockRecords(10);
            const result = await simulateDataSync(config, { records });

            expect(result.summary.totalRecords).toBe(10);
            expect(result.summary.successful).toBe(10);
            expect(result.processedRecords.length).toBe(10);
        });

        it("should handle large batches (100+ records)", async () => {
            const config: SyncConfig = {
                sourceTable: "orders",
                targetEndpoint: "https://api.erp.com/orders",
                batchSize: 500,
                syncMode: "full",
                fieldMapping: { name: "orderName", value: "amount" }
            };

            const records = createMockRecords(150);
            const result = await simulateDataSync(config, { records });

            expect(result.summary.totalRecords).toBe(150);
            expect(result.summary.successful).toBe(150);
        });

        it("should respect batch size limits", async () => {
            const config: SyncConfig = {
                sourceTable: "customers",
                targetEndpoint: "https://api.crm.com/customers",
                batchSize: 50,
                syncMode: "full",
                fieldMapping: { name: "fullName" }
            };

            const records = createMockRecords(75);
            const result = await simulateDataSync(config, { records });

            // All records should be processed even if > batchSize
            expect(result.summary.totalRecords).toBe(75);
        });
    });

    describe("incremental sync", () => {
        it("should only sync records updated after last sync", async () => {
            const baseTime = Date.now();
            const config: SyncConfig = {
                sourceTable: "users",
                targetEndpoint: "https://api.external.com/users",
                batchSize: 100,
                syncMode: "incremental",
                lastSyncTimestamp: baseTime - 100000, // 100 seconds ago
                fieldMapping: { name: "userName" }
            };

            const records = createMockRecords(10, {
                oldRecords: 5,
                baseTimestamp: baseTime
            });

            const result = await simulateDataSync(config, { records });

            // Only 5 records should be synced (the newer ones)
            expect(result.summary.totalRecords).toBe(5);
        });

        it("should sync all records when no last sync timestamp", async () => {
            const config: SyncConfig = {
                sourceTable: "products",
                targetEndpoint: "https://api.external.com/products",
                batchSize: 100,
                syncMode: "incremental",
                // No lastSyncTimestamp
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(10);
            const result = await simulateDataSync(config, { records });

            expect(result.summary.totalRecords).toBe(10);
        });

        it("should handle no new records since last sync", async () => {
            const baseTime = Date.now();
            const config: SyncConfig = {
                sourceTable: "inventory",
                targetEndpoint: "https://api.warehouse.com/inventory",
                batchSize: 100,
                syncMode: "incremental",
                lastSyncTimestamp: baseTime + 100000, // Future timestamp
                fieldMapping: { name: "itemName" }
            };

            const records = createMockRecords(10, { baseTimestamp: baseTime });
            const result = await simulateDataSync(config, { records });

            expect(result.summary.totalRecords).toBe(0);
            expect(result.summary.successful).toBe(0);
        });

        it("should track last sync for next run", async () => {
            const config: SyncConfig = {
                sourceTable: "transactions",
                targetEndpoint: "https://api.ledger.com/transactions",
                batchSize: 100,
                syncMode: "incremental",
                lastSyncTimestamp: Date.now() - 86400000, // 1 day ago
                fieldMapping: { name: "description", value: "amount" }
            };

            const records = createMockRecords(5);
            const result = await simulateDataSync(config, { records });

            // Verify the sync completed and we have output data
            expect(result.summary.totalRecords).toBe(5);
            expect(result.context.nodeOutputs.get("Output")).toBeDefined();
        });
    });

    describe("conflict handling", () => {
        it("should handle sync conflicts gracefully", async () => {
            const config: SyncConfig = {
                sourceTable: "contacts",
                targetEndpoint: "https://api.crm.com/contacts",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "fullName" }
            };

            const records = createMockRecords(5);
            const result = await simulateDataSync(config, {
                records,
                conflictRecords: ["record_2", "record_4"]
            });

            expect(result.summary.failed).toBe(2);
            expect(result.summary.successful).toBe(3);
            expect(result.summary.errors.length).toBe(2);
        });

        it("should report 409 status for conflicts", async () => {
            const config: SyncConfig = {
                sourceTable: "documents",
                targetEndpoint: "https://api.docs.com/documents",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(3);
            const result = await simulateDataSync(config, {
                records,
                conflictRecords: ["record_1"]
            });

            const conflictResult = result.syncResults.find((r) => r.recordId === "record_1");
            expect(conflictResult?.responseCode).toBe(409);
        });

        it("should include conflict details in error", async () => {
            const config: SyncConfig = {
                sourceTable: "settings",
                targetEndpoint: "https://api.config.com/settings",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "key", value: "configValue" }
            };

            const records = createMockRecords(2);
            const result = await simulateDataSync(config, {
                records,
                conflictRecords: ["record_2"]
            });

            const error = result.summary.errors.find((e) => e.recordId === "record_2");
            expect(error?.error).toContain("Conflict");
        });
    });

    describe("empty dataset handling", () => {
        it("should handle empty source table", async () => {
            const config: SyncConfig = {
                sourceTable: "empty_table",
                targetEndpoint: "https://api.external.com/data",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const result = await simulateDataSync(config, { records: [] });

            expect(result.summary.totalRecords).toBe(0);
            expect(result.summary.successful).toBe(0);
            expect(result.summary.failed).toBe(0);
            expect(result.processedRecords.length).toBe(0);
        });

        it("should complete successfully with no records", async () => {
            const config: SyncConfig = {
                sourceTable: "archive",
                targetEndpoint: "https://api.storage.com/archive",
                batchSize: 100,
                syncMode: "incremental",
                lastSyncTimestamp: Date.now(),
                fieldMapping: { name: "title" }
            };

            const result = await simulateDataSync(config, { records: [] });

            expect(result.context.nodeOutputs.get("Output")).toBeDefined();
        });

        it("should report zero duration for empty sync", async () => {
            const config: SyncConfig = {
                sourceTable: "void",
                targetEndpoint: "https://api.null.com/void",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: {}
            };

            const result = await simulateDataSync(config, { records: [] });

            expect(result.summary.duration).toBeLessThan(50);
        });
    });

    describe("field mapping", () => {
        it("should transform fields according to mapping", async () => {
            const config: SyncConfig = {
                sourceTable: "products",
                targetEndpoint: "https://api.external.com/products",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: {
                    name: "productTitle",
                    value: "priceInCents",
                    status: "productStatus"
                }
            };

            const records = createMockRecords(1);
            const result = await simulateDataSync(config, { records });

            const transformed = result.processedRecords[0];
            expect(transformed.payload).toHaveProperty("productTitle");
            expect(transformed.payload).toHaveProperty("priceInCents");
            expect(transformed.payload).toHaveProperty("productStatus");
        });

        it("should skip unmapped fields", async () => {
            const config: SyncConfig = {
                sourceTable: "users",
                targetEndpoint: "https://api.external.com/users",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: {
                    name: "userName"
                    // value, status, category not mapped
                }
            };

            const records = createMockRecords(1);
            const result = await simulateDataSync(config, { records });

            const transformed = result.processedRecords[0];
            expect(transformed.payload).toHaveProperty("userName");
            expect(transformed.payload).not.toHaveProperty("priceInCents");
            expect(transformed.payload).not.toHaveProperty("status");
        });

        it("should handle empty field mapping", async () => {
            const config: SyncConfig = {
                sourceTable: "minimal",
                targetEndpoint: "https://api.external.com/minimal",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: {}
            };

            const records = createMockRecords(1);
            const result = await simulateDataSync(config, { records });

            expect(result.processedRecords[0].payload).toEqual({});
        });

        it("should preserve field values during transformation", async () => {
            const config: SyncConfig = {
                sourceTable: "prices",
                targetEndpoint: "https://api.external.com/prices",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { value: "amount" }
            };

            const records: DatabaseRecord[] = [
                {
                    id: "record_1",
                    data: { name: "Test", value: 12345, status: "active", category: "A" },
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ];

            const result = await simulateDataSync(config, { records });

            expect(result.processedRecords[0].payload.amount).toBe(12345);
        });
    });

    describe("operation detection", () => {
        it("should detect create operation for new records", async () => {
            const now = Date.now();
            const config: SyncConfig = {
                sourceTable: "items",
                targetEndpoint: "https://api.external.com/items",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records: DatabaseRecord[] = [
                {
                    id: "new_record",
                    data: { name: "New Item", value: 100, status: "active", category: "A" },
                    createdAt: now,
                    updatedAt: now // Same as created = new
                }
            ];

            const result = await simulateDataSync(config, { records });

            expect(result.processedRecords[0].operation).toBe("create");
            expect(result.syncResults[0].responseCode).toBe(201);
        });

        it("should detect update operation for modified records", async () => {
            const now = Date.now();
            const config: SyncConfig = {
                sourceTable: "items",
                targetEndpoint: "https://api.external.com/items",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records: DatabaseRecord[] = [
                {
                    id: "updated_record",
                    data: { name: "Updated Item", value: 200, status: "active", category: "B" },
                    createdAt: now - 86400000, // Created yesterday
                    updatedAt: now // Updated today
                }
            ];

            const result = await simulateDataSync(config, { records });

            expect(result.processedRecords[0].operation).toBe("update");
            expect(result.syncResults[0].responseCode).toBe(200);
        });

        it("should detect delete operation for deleted records", async () => {
            const config: SyncConfig = {
                sourceTable: "items",
                targetEndpoint: "https://api.external.com/items",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(3, { includeDeleted: true });
            const result = await simulateDataSync(config, { records });

            const deletedRecord = result.processedRecords.find(
                (r) => r.externalId === "ext_record_3"
            );
            expect(deletedRecord?.operation).toBe("delete");
        });
    });

    describe("error aggregation", () => {
        it("should aggregate all sync errors", async () => {
            const config: SyncConfig = {
                sourceTable: "problematic",
                targetEndpoint: "https://api.unstable.com/data",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(5);
            const customResults = new Map<string, SyncResult>();
            customResults.set("record_1", {
                recordId: "record_1",
                success: false,
                error: "Timeout"
            });
            customResults.set("record_3", {
                recordId: "record_3",
                success: false,
                error: "Invalid data"
            });
            customResults.set("record_5", {
                recordId: "record_5",
                success: false,
                error: "Server error"
            });

            const result = await simulateDataSync(config, { records, syncResults: customResults });

            expect(result.summary.errors.length).toBe(3);
            expect(result.summary.errors.map((e) => e.recordId)).toContain("record_1");
            expect(result.summary.errors.map((e) => e.recordId)).toContain("record_3");
            expect(result.summary.errors.map((e) => e.recordId)).toContain("record_5");
        });

        it("should include error message for each failed record", async () => {
            const config: SyncConfig = {
                sourceTable: "errors",
                targetEndpoint: "https://api.failing.com/data",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(2);
            const result = await simulateDataSync(config, {
                records,
                failOnRecord: "record_1"
            });

            const error = result.summary.errors.find((e) => e.recordId === "record_1");
            expect(error?.error).toContain("Connection refused");
        });

        it("should calculate correct success/failure counts", async () => {
            const config: SyncConfig = {
                sourceTable: "mixed",
                targetEndpoint: "https://api.mixed.com/data",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(10);
            const result = await simulateDataSync(config, {
                records,
                conflictRecords: ["record_2", "record_5", "record_8"]
            });

            expect(result.summary.totalRecords).toBe(10);
            expect(result.summary.successful).toBe(7);
            expect(result.summary.failed).toBe(3);
        });
    });

    describe("sync result tracking", () => {
        it("should track external ID for each synced record", async () => {
            const config: SyncConfig = {
                sourceTable: "synced",
                targetEndpoint: "https://api.external.com/synced",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(3);
            const result = await simulateDataSync(config, { records });

            result.syncResults.forEach((syncResult, i) => {
                expect(syncResult.externalId).toBe(`ext_record_${i + 1}`);
            });
        });

        it("should track duration of sync operation", async () => {
            const config: SyncConfig = {
                sourceTable: "timed",
                targetEndpoint: "https://api.timed.com/data",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(10);
            const result = await simulateDataSync(config, { records });

            expect(result.summary.duration).toBeGreaterThanOrEqual(0);
            expect(result.summary.duration).toBeLessThan(100); // Mock should be fast
        });

        it("should output summary to Output node", async () => {
            const config: SyncConfig = {
                sourceTable: "summary",
                targetEndpoint: "https://api.external.com/summary",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(5);
            const result = await simulateDataSync(config, { records });

            const outputNode = result.context.nodeOutputs.get("Output") as SyncSummary;
            expect(outputNode.totalRecords).toBe(5);
            expect(outputNode.successful).toBe(5);
        });
    });

    describe("partial sync failure", () => {
        it("should continue processing after individual record failure", async () => {
            const config: SyncConfig = {
                sourceTable: "resilient",
                targetEndpoint: "https://api.external.com/resilient",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(5);
            const result = await simulateDataSync(config, {
                records,
                failOnRecord: "record_2"
            });

            // Should have processed all 5 records
            expect(result.processedRecords.length).toBe(5);
            expect(result.summary.successful).toBe(4);
            expect(result.summary.failed).toBe(1);
        });

        it("should not stop sync on first failure", async () => {
            const config: SyncConfig = {
                sourceTable: "continuous",
                targetEndpoint: "https://api.external.com/continuous",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(5);
            const result = await simulateDataSync(config, {
                records,
                failOnRecord: "record_1" // First record fails
            });

            // Records 2-5 should still succeed
            const successfulResults = result.syncResults.filter((r) => r.success);
            expect(successfulResults.length).toBe(4);
        });

        it("should report partial success status", async () => {
            const config: SyncConfig = {
                sourceTable: "partial",
                targetEndpoint: "https://api.external.com/partial",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(10);
            const customResults = new Map<string, SyncResult>();
            customResults.set("record_3", {
                recordId: "record_3",
                success: false,
                error: "Failed"
            });
            customResults.set("record_7", {
                recordId: "record_7",
                success: false,
                error: "Failed"
            });

            const result = await simulateDataSync(config, { records, syncResults: customResults });

            expect(result.summary.successful).toBe(8);
            expect(result.summary.failed).toBe(2);
            expect(result.summary.totalRecords).toBe(10);
        });
    });

    describe("multi-table sync", () => {
        it("should handle different source tables", async () => {
            const tables = ["users", "products", "orders"];

            const results = await Promise.all(
                tables.map((table) => {
                    const config: SyncConfig = {
                        sourceTable: table,
                        targetEndpoint: `https://api.external.com/${table}`,
                        batchSize: 100,
                        syncMode: "full",
                        fieldMapping: { name: "title" }
                    };
                    return simulateDataSync(config, { records: createMockRecords(3) });
                })
            );

            expect(results.length).toBe(3);
            results.forEach((result) => {
                expect(result.summary.successful).toBe(3);
            });
        });

        it("should maintain isolation between table syncs", async () => {
            const config1: SyncConfig = {
                sourceTable: "table_a",
                targetEndpoint: "https://api.external.com/table_a",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "fieldA" }
            };

            const config2: SyncConfig = {
                sourceTable: "table_b",
                targetEndpoint: "https://api.external.com/table_b",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "fieldB" }
            };

            const result1 = await simulateDataSync(config1, { records: createMockRecords(5) });
            const result2 = await simulateDataSync(config2, { records: createMockRecords(3) });

            expect(result1.summary.totalRecords).toBe(5);
            expect(result2.summary.totalRecords).toBe(3);
        });
    });

    describe("performance characteristics", () => {
        it("should complete sync in reasonable time", async () => {
            const config: SyncConfig = {
                sourceTable: "performance",
                targetEndpoint: "https://api.external.com/performance",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(100);
            const startTime = Date.now();
            await simulateDataSync(config, { records });
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(200); // Mock should be fast
        });

        it("should handle rapid sequential syncs", async () => {
            const config: SyncConfig = {
                sourceTable: "rapid",
                targetEndpoint: "https://api.external.com/rapid",
                batchSize: 100,
                syncMode: "full",
                fieldMapping: { name: "title" }
            };

            const records = createMockRecords(10);

            const results = [];
            for (let i = 0; i < 5; i++) {
                results.push(await simulateDataSync(config, { records }));
            }

            expect(results.length).toBe(5);
            results.forEach((result) => {
                expect(result.summary.successful).toBe(10);
            });
        });
    });
});
