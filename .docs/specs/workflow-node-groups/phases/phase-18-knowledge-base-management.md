# Phase 18: Knowledge Base Management

## Overview

Implement 2 knowledge base management nodes: Sync KB Source and KB Analytics.

---

## Prerequisites

- **Phase 17**: Knowledge Base Core nodes

---

## Existing Infrastructure

### Integration Providers for Sync Sources

**File**: `backend/src/integrations/providers/notion/NotionProvider.ts`

```typescript
// Notion provider with database query operations
// Use for syncing Notion databases/pages to knowledge base
```

**File**: `backend/src/integrations/providers/google-drive/GoogleDriveProvider.ts`

```typescript
// Google Drive provider with file listing and download
// Use for syncing Drive folders to knowledge base
```

### Knowledge Base Repositories (from Phase 17)

```typescript
// KnowledgeBaseRepository - manage KB metadata and config
// KnowledgeDocumentRepository - track documents with source_type, source_url
// KnowledgeChunkRepository - store chunks with embeddings
```

### Embeddings Executor

**File**: `backend/src/temporal/activities/node-executors/embeddings-executor.ts`

```typescript
// Multi-provider embeddings for newly synced content
// Supports OpenAI, Cohere, Google embedding models
```

### Connection Repository for OAuth

**File**: `backend/src/storage/repositories/ConnectionRepository.ts`

```typescript
// OAuth tokens for Notion, Google Drive
const connection = await connectionRepository.findByIdWithData(connectionId);
const tokens = connection.data as OAuthTokenData;
// { accessToken, refreshToken, expiresAt }
```

### Temporal Schedules for Sync

```typescript
// Use Temporal schedules for automated sync intervals
import { ScheduleClient } from "@temporalio/client";

const client = new ScheduleClient({ connection });
await client.create({
    scheduleId: `kb-sync-${kbId}-${sourceId}`,
    spec: {
        cronExpressions: [config.syncSchedule] // e.g., "0 2 * * *" for daily at 2am
    },
    action: {
        type: "startWorkflow",
        workflowType: "kbSyncWorkflow",
        args: [{ kbId, sourceId, mode: "incremental" }]
    }
});
```

---

## Nodes (2)

| Node               | Description                  | Category  |
| ------------------ | ---------------------------- | --------- |
| **Sync KB Source** | Import from external sources | knowledge |
| **KB Analytics**   | Show query stats and gaps    | knowledge |

---

## Node Specifications

### Sync KB Source Node

**Purpose**: Keep KB in sync with external content sources

**Config**:

- Knowledge base selection
- Source type: Notion / Google Drive / Confluence / Website
- Source connection/credentials
- Sync mode: full / incremental
- Sync frequency: manual / scheduled
- Content filters

**Inputs**: `trigger` (optional)
**Outputs**: `added` (number), `updated` (number), `deleted` (number), `errors` (array)

### KB Analytics Node

**Purpose**: Analyze KB usage and identify gaps

**Config**:

- Knowledge base selection
- Analysis type: usage / gaps / quality
- Time range
- Output format

**Inputs**: `trigger` (optional)
**Outputs**: `stats` (object), `topQueries` (array), `unansweredQueries` (array), `suggestions` (array)

---

## Complete TypeScript Interfaces

```typescript
// backend/src/temporal/activities/node-executors/knowledge/types.ts

export interface SyncKBSourceNodeConfig {
    knowledgeBaseId: string;
    sourceType: "notion" | "google-drive" | "confluence" | "website";
    connectionId: string;

    // Source-specific config
    notionConfig?: {
        databaseId?: string;
        pageId?: string;
        includeChildren: boolean;
    };
    driveConfig?: {
        folderId: string;
        includeSubfolders: boolean;
        fileTypes?: string[];
    };
    confluenceConfig?: {
        spaceKey: string;
        pageId?: string;
    };
    websiteConfig?: {
        url: string;
        maxDepth: number;
        includePatterns?: string[];
        excludePatterns?: string[];
    };

    syncMode: "full" | "incremental";
    syncSchedule?: string; // cron expression
    chunkingStrategy: "fixed" | "semantic" | "paragraph";
    deleteRemoved: boolean;
    outputVariable?: string;
}

export interface SyncKBSourceNodeResult {
    added: number;
    updated: number;
    deleted: number;
    errors: Array<{
        sourceId: string;
        sourceName: string;
        error: string;
    }>;
    syncDuration: number;
    lastSyncCursor?: string;
}

export interface KBAnalyticsNodeConfig {
    knowledgeBaseId: string;
    analysisType: "usage" | "gaps" | "quality" | "all";
    timeRange: {
        start: Date;
        end: Date;
    };
    outputFormat: "summary" | "detailed";
    outputVariable?: string;
}

export interface KBAnalyticsNodeResult {
    stats: {
        totalDocuments: number;
        totalChunks: number;
        totalQueries: number;
        avgResponseTime: number;
        avgSimilarityScore: number;
    };
    topQueries: Array<{
        query: string;
        count: number;
        avgSimilarity: number;
    }>;
    unansweredQueries: Array<{
        query: string;
        timestamp: Date;
        similarity: number;
    }>;
    suggestions: Array<{
        type: "content_gap" | "low_quality" | "stale_content";
        description: string;
        priority: "high" | "medium" | "low";
    }>;
}

// Database model for query logging
export interface KBQueryLog {
    id: string;
    knowledge_base_id: string;
    query: string;
    top_similarity: number;
    results_count: number;
    response_time_ms: number;
    user_id?: string;
    created_at: Date;
}
```

---

## Backend Executor Implementations

### Sync KB Source Executor

```typescript
// backend/src/temporal/activities/node-executors/knowledge/sync-kb-source-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { executeAddToKBNode } from "./add-to-kb-executor";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import { KnowledgeChunkRepository } from "../../../storage/repositories/KnowledgeChunkRepository";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import type { SyncKBSourceNodeConfig, SyncKBSourceNodeResult } from "./types";

const docRepo = new KnowledgeDocumentRepository();
const chunkRepo = new KnowledgeChunkRepository();
const connectionRepo = new ConnectionRepository();

export async function executeSyncKBSourceNode(
    config: SyncKBSourceNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();
    const errors: SyncKBSourceNodeResult["errors"] = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    // Get connection credentials
    const connection = await connectionRepo.findByIdWithData(config.connectionId);
    if (!connection) {
        throw new Error(`Connection ${config.connectionId} not found`);
    }

    // Get existing documents for this source (for incremental sync)
    const existingDocs = await getExistingDocuments(config.knowledgeBaseId, config.sourceType);

    // Fetch documents from source
    let sourceDocuments: SourceDocument[];
    switch (config.sourceType) {
        case "notion":
            sourceDocuments = await fetchNotionDocuments(connection, config.notionConfig!);
            break;
        case "google-drive":
            sourceDocuments = await fetchDriveDocuments(connection, config.driveConfig!);
            break;
        case "confluence":
            sourceDocuments = await fetchConfluenceDocuments(connection, config.confluenceConfig!);
            break;
        case "website":
            sourceDocuments = await crawlWebsite(config.websiteConfig!);
            break;
        default:
            throw new Error(`Unsupported source type: ${config.sourceType}`);
    }

    // Process each document
    const processedIds = new Set<string>();

    for (const sourceDoc of sourceDocuments) {
        try {
            const existingDoc = existingDocs.find((d) => d.source_url === sourceDoc.sourceId);

            if (existingDoc) {
                // Check if document has changed (incremental sync)
                if (
                    config.syncMode === "incremental" &&
                    !sourceDoc.hasChanged(existingDoc.updated_at)
                ) {
                    processedIds.add(sourceDoc.sourceId);
                    continue;
                }

                // Delete old chunks and re-process
                await chunkRepo.deleteByDocumentId(existingDoc.id);
                await docRepo.delete(existingDoc.id);
                updated++;
            } else {
                added++;
            }

            // Add document to KB using existing Add to KB logic
            await executeAddToKBNode(
                {
                    knowledgeBaseId: config.knowledgeBaseId,
                    contentSource: "text",
                    content: sourceDoc.content,
                    fileName: sourceDoc.name,
                    chunkingStrategy: config.chunkingStrategy,
                    metadata: {
                        sourceType: config.sourceType,
                        sourceId: sourceDoc.sourceId,
                        sourceUrl: sourceDoc.url,
                        lastModified: sourceDoc.lastModified
                    },
                    updateMode: "append"
                },
                context
            );

            processedIds.add(sourceDoc.sourceId);
        } catch (error) {
            errors.push({
                sourceId: sourceDoc.sourceId,
                sourceName: sourceDoc.name,
                error: (error as Error).message
            });
        }
    }

    // Delete removed documents (if enabled)
    if (config.deleteRemoved) {
        for (const existingDoc of existingDocs) {
            if (!processedIds.has(existingDoc.source_url!)) {
                await chunkRepo.deleteByDocumentId(existingDoc.id);
                await docRepo.delete(existingDoc.id);
                deleted++;
            }
        }
    }

    const result: SyncKBSourceNodeResult = {
        added,
        updated,
        deleted,
        errors,
        syncDuration: Date.now() - startTime
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

// Source document interface
interface SourceDocument {
    sourceId: string;
    name: string;
    content: string;
    url?: string;
    lastModified: Date;
    hasChanged: (since: Date) => boolean;
}

// Notion sync implementation
async function fetchNotionDocuments(
    connection: Connection,
    config: SyncKBSourceNodeConfig["notionConfig"]
): Promise<SourceDocument[]> {
    const { Client } = await import("@notionhq/client");
    const notion = new Client({ auth: connection.data.accessToken });

    const documents: SourceDocument[] = [];

    if (config?.databaseId) {
        // Query database pages
        const response = await notion.databases.query({
            database_id: config.databaseId
        });

        for (const page of response.results) {
            const pageContent = await getNotionPageContent(notion, page.id, config.includeChildren);
            documents.push({
                sourceId: page.id,
                name: getNotionPageTitle(page),
                content: pageContent,
                url: (page as { url?: string }).url,
                lastModified: new Date((page as { last_edited_time: string }).last_edited_time),
                hasChanged: (since: Date) =>
                    new Date((page as { last_edited_time: string }).last_edited_time) > since
            });
        }
    } else if (config?.pageId) {
        // Single page
        const page = await notion.pages.retrieve({ page_id: config.pageId });
        const pageContent = await getNotionPageContent(
            notion,
            config.pageId,
            config.includeChildren
        );
        documents.push({
            sourceId: config.pageId,
            name: getNotionPageTitle(page),
            content: pageContent,
            url: (page as { url?: string }).url,
            lastModified: new Date((page as { last_edited_time: string }).last_edited_time),
            hasChanged: (since: Date) =>
                new Date((page as { last_edited_time: string }).last_edited_time) > since
        });
    }

    return documents;
}

async function getNotionPageContent(
    notion: Client,
    pageId: string,
    includeChildren: boolean
): Promise<string> {
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    let content = "";

    for (const block of blocks.results) {
        content += extractNotionBlockText(block) + "\n";

        if (includeChildren && (block as { has_children?: boolean }).has_children) {
            content += await getNotionPageContent(notion, block.id, true);
        }
    }

    return content;
}

function extractNotionBlockText(block: unknown): string {
    // Extract text from various Notion block types
    const b = block as { type: string; [key: string]: unknown };
    const blockData = b[b.type] as { rich_text?: Array<{ plain_text: string }> };
    if (blockData?.rich_text) {
        return blockData.rich_text.map((t) => t.plain_text).join("");
    }
    return "";
}

function getNotionPageTitle(page: unknown): string {
    const p = page as { properties?: Record<string, { title?: Array<{ plain_text: string }> }> };
    const titleProp = Object.values(p.properties || {}).find((prop) => prop.title);
    return titleProp?.title?.[0]?.plain_text || "Untitled";
}

// Google Drive sync implementation
async function fetchDriveDocuments(
    connection: Connection,
    config: SyncKBSourceNodeConfig["driveConfig"]
): Promise<SourceDocument[]> {
    const { google } = await import("googleapis");
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: connection.data.accessToken,
        refresh_token: connection.data.refreshToken
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const documents: SourceDocument[] = [];

    // List files in folder
    let query = `'${config!.folderId}' in parents and trashed = false`;
    if (config!.fileTypes && config!.fileTypes.length > 0) {
        const mimeTypes = config!.fileTypes.map((t) => getMimeType(t));
        query += ` and (${mimeTypes.map((m) => `mimeType = '${m}'`).join(" or ")})`;
    }

    const response = await drive.files.list({
        q: query,
        fields: "files(id, name, mimeType, modifiedTime, webViewLink)"
    });

    for (const file of response.data.files || []) {
        try {
            const content = await downloadDriveFile(drive, file.id!, file.mimeType!);
            documents.push({
                sourceId: file.id!,
                name: file.name!,
                content,
                url: file.webViewLink!,
                lastModified: new Date(file.modifiedTime!),
                hasChanged: (since: Date) => new Date(file.modifiedTime!) > since
            });
        } catch (error) {
            console.error(`Failed to download ${file.name}:`, error);
        }
    }

    // Recursively fetch from subfolders if enabled
    if (config!.includeSubfolders) {
        const foldersResponse = await drive.files.list({
            q: `'${config!.folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id)"
        });

        for (const folder of foldersResponse.data.files || []) {
            const subDocs = await fetchDriveDocuments(connection, {
                ...config!,
                folderId: folder.id!
            });
            documents.push(...subDocs);
        }
    }

    return documents;
}

async function downloadDriveFile(
    drive: unknown,
    fileId: string,
    mimeType: string
): Promise<string> {
    // Export Google Docs as text, download others directly
    if (mimeType === "application/vnd.google-apps.document") {
        const response = await (drive as { files: { export: Function } }).files.export({
            fileId,
            mimeType: "text/plain"
        });
        return response.data as string;
    } else if (mimeType === "application/pdf") {
        // Use pdf-parse for PDFs
        const response = await (drive as { files: { get: Function } }).files.get(
            {
                fileId,
                alt: "media"
            },
            { responseType: "arraybuffer" }
        );
        const pdfParse = await import("pdf-parse");
        const parsed = await pdfParse.default(Buffer.from(response.data));
        return parsed.text;
    }
    // Add more file type handlers as needed
    return "";
}

function getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/vnd.google-apps.document",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        txt: "text/plain"
    };
    return mimeTypes[fileType] || "*/*";
}

async function getExistingDocuments(kbId: string, sourceType: string) {
    const { documents } = await docRepo.findByKnowledgeBaseId(kbId, { limit: 10000 });
    return documents.filter((d) => d.source_type === sourceType);
}

// Placeholder implementations for other sources
async function fetchConfluenceDocuments(
    _connection: Connection,
    _config: SyncKBSourceNodeConfig["confluenceConfig"]
): Promise<SourceDocument[]> {
    // Implement Confluence API integration
    throw new Error("Confluence sync not yet implemented");
}

async function crawlWebsite(
    _config: SyncKBSourceNodeConfig["websiteConfig"]
): Promise<SourceDocument[]> {
    // Implement web crawler
    throw new Error("Website crawl not yet implemented");
}
```

### KB Analytics Executor

```typescript
// backend/src/temporal/activities/node-executors/knowledge/kb-analytics-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { db } from "../../../storage/database";
import { KnowledgeBaseRepository } from "../../../storage/repositories/KnowledgeBaseRepository";
import type { KBAnalyticsNodeConfig, KBAnalyticsNodeResult } from "./types";

const kbRepo = new KnowledgeBaseRepository();

export async function executeKBAnalyticsNode(
    config: KBAnalyticsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const kb = await kbRepo.findById(config.knowledgeBaseId);
    if (!kb) {
        throw new Error(`Knowledge base ${config.knowledgeBaseId} not found`);
    }

    const result: KBAnalyticsNodeResult = {
        stats: await getKBStats(config.knowledgeBaseId),
        topQueries: [],
        unansweredQueries: [],
        suggestions: []
    };

    if (config.analysisType === "usage" || config.analysisType === "all") {
        result.topQueries = await getTopQueries(config.knowledgeBaseId, config.timeRange);
    }

    if (config.analysisType === "gaps" || config.analysisType === "all") {
        result.unansweredQueries = await getUnansweredQueries(
            config.knowledgeBaseId,
            config.timeRange
        );
    }

    if (config.analysisType === "quality" || config.analysisType === "all") {
        result.suggestions = await generateSuggestions(config.knowledgeBaseId);
    }

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

async function getKBStats(kbId: string): Promise<KBAnalyticsNodeResult["stats"]> {
    const stats = await kbRepo.getStats(kbId);

    // Get query stats
    const queryStatsResult = await db.query(
        `
        SELECT
            COUNT(*) as total_queries,
            AVG(response_time_ms) as avg_response_time,
            AVG(top_similarity) as avg_similarity
        FROM flowmaestro.kb_query_logs
        WHERE knowledge_base_id = $1
    `,
        [kbId]
    );

    const queryStats = queryStatsResult.rows[0];

    return {
        totalDocuments: stats?.document_count || 0,
        totalChunks: stats?.chunk_count || 0,
        totalQueries: parseInt(queryStats.total_queries || "0"),
        avgResponseTime: parseFloat(queryStats.avg_response_time || "0"),
        avgSimilarityScore: parseFloat(queryStats.avg_similarity || "0")
    };
}

async function getTopQueries(
    kbId: string,
    timeRange: KBAnalyticsNodeConfig["timeRange"]
): Promise<KBAnalyticsNodeResult["topQueries"]> {
    const result = await db.query(
        `
        SELECT
            query,
            COUNT(*) as count,
            AVG(top_similarity) as avg_similarity
        FROM flowmaestro.kb_query_logs
        WHERE knowledge_base_id = $1
            AND created_at >= $2
            AND created_at <= $3
        GROUP BY query
        ORDER BY count DESC
        LIMIT 20
    `,
        [kbId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
        query: row.query,
        count: parseInt(row.count),
        avgSimilarity: parseFloat(row.avg_similarity)
    }));
}

async function getUnansweredQueries(
    kbId: string,
    timeRange: KBAnalyticsNodeConfig["timeRange"]
): Promise<KBAnalyticsNodeResult["unansweredQueries"]> {
    // Queries with low similarity scores or no results
    const result = await db.query(
        `
        SELECT query, created_at, top_similarity
        FROM flowmaestro.kb_query_logs
        WHERE knowledge_base_id = $1
            AND created_at >= $2
            AND created_at <= $3
            AND (top_similarity < 0.6 OR results_count = 0)
        ORDER BY created_at DESC
        LIMIT 50
    `,
        [kbId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
        query: row.query,
        timestamp: new Date(row.created_at),
        similarity: parseFloat(row.top_similarity || "0")
    }));
}

async function generateSuggestions(kbId: string): Promise<KBAnalyticsNodeResult["suggestions"]> {
    const suggestions: KBAnalyticsNodeResult["suggestions"] = [];

    // Check for stale content
    const staleDocsResult = await db.query(
        `
        SELECT COUNT(*) as count
        FROM flowmaestro.knowledge_documents
        WHERE knowledge_base_id = $1
            AND updated_at < NOW() - INTERVAL '90 days'
    `,
        [kbId]
    );

    const staleCount = parseInt(staleDocsResult.rows[0].count);
    if (staleCount > 0) {
        suggestions.push({
            type: "stale_content",
            description: `${staleCount} documents haven't been updated in 90+ days`,
            priority: staleCount > 10 ? "high" : "medium"
        });
    }

    // Check for low-performing chunks
    const lowQualityResult = await db.query(
        `
        SELECT COUNT(DISTINCT kc.document_id) as doc_count
        FROM flowmaestro.knowledge_chunks kc
        LEFT JOIN (
            SELECT UNNEST(chunk_ids) as chunk_id, AVG(similarity) as avg_sim
            FROM flowmaestro.kb_query_logs
            WHERE knowledge_base_id = $1
            GROUP BY chunk_id
        ) qs ON kc.id = qs.chunk_id
        WHERE kc.knowledge_base_id = $1
            AND (qs.avg_sim IS NULL OR qs.avg_sim < 0.5)
    `,
        [kbId]
    );

    const lowQualityDocs = parseInt(lowQualityResult.rows[0].doc_count);
    if (lowQualityDocs > 0) {
        suggestions.push({
            type: "low_quality",
            description: `${lowQualityDocs} documents rarely match user queries`,
            priority: "medium"
        });
    }

    // Identify content gaps from unanswered queries
    const gapsResult = await db.query(
        `
        SELECT query, COUNT(*) as count
        FROM flowmaestro.kb_query_logs
        WHERE knowledge_base_id = $1
            AND top_similarity < 0.5
        GROUP BY query
        HAVING COUNT(*) > 3
        LIMIT 5
    `,
        [kbId]
    );

    for (const row of gapsResult.rows) {
        suggestions.push({
            type: "content_gap",
            description: `"${row.query}" asked ${row.count} times with poor results`,
            priority: "high"
        });
    }

    return suggestions;
}
```

---

## Query Logging Service

```typescript
// backend/src/services/knowledge-base/query-logger.ts

import { db } from "../../storage/database";

export interface LogQueryInput {
    knowledgeBaseId: string;
    query: string;
    topSimilarity: number;
    resultsCount: number;
    responseTimeMs: number;
    userId?: string;
    chunkIds?: string[];
}

export async function logKBQuery(input: LogQueryInput): Promise<void> {
    await db.query(
        `
        INSERT INTO flowmaestro.kb_query_logs
        (knowledge_base_id, query, top_similarity, results_count, response_time_ms, user_id, chunk_ids)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
        [
            input.knowledgeBaseId,
            input.query,
            input.topSimilarity,
            input.resultsCount,
            input.responseTimeMs,
            input.userId || null,
            input.chunkIds || []
        ]
    );
}
```

### Update Search KB to Log Queries

```typescript
// In search-kb-executor.ts, add query logging:
import { logKBQuery } from "../../../services/knowledge-base/query-logger";

export async function executeSearchKBNode(config, context) {
    const startTime = Date.now();
    // ... existing search logic ...

    // Log the query for analytics
    await logKBQuery({
        knowledgeBaseId: config.knowledgeBaseId,
        query,
        topSimilarity: filteredResults[0]?.similarity || 0,
        resultsCount: filteredResults.length,
        responseTimeMs: Date.now() - startTime,
        chunkIds: filteredResults.map((r) => r.id)
    });

    return result;
}
```

---

## Migration: Query Logs Table

```sql
-- backend/migrations/XXXXXXXXXX_create-kb-query-logs.sql
CREATE TABLE IF NOT EXISTS flowmaestro.kb_query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    top_similarity FLOAT,
    results_count INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    user_id UUID REFERENCES flowmaestro.users(id) ON DELETE SET NULL,
    chunk_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kb_query_logs_kb_id ON flowmaestro.kb_query_logs(knowledge_base_id);
CREATE INDEX idx_kb_query_logs_created_at ON flowmaestro.kb_query_logs(created_at);
CREATE INDEX idx_kb_query_logs_similarity ON flowmaestro.kb_query_logs(top_similarity);
```

---

## Node Registration

```typescript
// Add to backend/src/shared/registry/node-registry.ts

{
    type: "sync-kb-source",
    name: "Sync KB Source",
    description: "Sync documents from Notion, Google Drive, or other sources to knowledge base",
    category: "knowledge",
    subcategory: "management",
    keywords: ["sync", "import", "notion", "drive", "confluence", "crawl", "ingest"],
    inputs: [{ name: "trigger", type: "any", required: false }],
    outputs: [
        { name: "added", type: "number" },
        { name: "updated", type: "number" },
        { name: "deleted", type: "number" },
        { name: "errors", type: "array" }
    ],
    configSchema: { /* SyncKBSourceNodeConfig schema */ }
},
{
    type: "kb-analytics",
    name: "KB Analytics",
    description: "Analyze knowledge base usage, identify gaps, and get improvement suggestions",
    category: "knowledge",
    subcategory: "management",
    keywords: ["analytics", "stats", "usage", "gaps", "quality", "insights"],
    inputs: [{ name: "trigger", type: "any", required: false }],
    outputs: [
        { name: "stats", type: "object" },
        { name: "topQueries", type: "array" },
        { name: "unansweredQueries", type: "array" },
        { name: "suggestions", type: "array" }
    ],
    configSchema: { /* KBAnalyticsNodeConfig schema */ }
}
```

---

## Unit Tests

### Test Pattern

**Pattern C (Mock Services)**: Mock external sources and database operations.

### Files to Create

| Executor     | Test File                                                                     | Pattern |
| ------------ | ----------------------------------------------------------------------------- | ------- |
| SyncKBSource | `backend/tests/unit/node-executors/knowledge/sync-kb-source-executor.test.ts` | C       |
| KBAnalytics  | `backend/tests/unit/node-executors/knowledge/kb-analytics-executor.test.ts`   | C + DB  |

### Required Test Cases

#### sync-kb-source-executor.test.ts

- `should sync from Notion source`
- `should sync from Google Drive source`
- `should detect new/modified/deleted docs`
- `should use incremental sync when available`
- `should report sync statistics`
- `should handle source errors gracefully`

#### kb-analytics-executor.test.ts

- `should identify frequently searched topics`
- `should detect unanswered queries`
- `should calculate document relevance scores`
- `should suggest content improvements`
- `should generate usage reports`

---

## Test Workflow: KB Sync Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Schedule   │───▶│ Sync KB      │───▶│   Output    │
│ (daily)     │    │ Source       │    │ (stats)     │
└─────────────┘    └──────────────┘    └─────────────┘
```

**Test**: Sync documentation from Notion to KB nightly

---

## Sync Source Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Sync Process                         │
│                                                         │
│  1. Connect to source (Notion, Drive, etc.)             │
│  2. Fetch document list                                 │
│  3. Compare with existing KB documents                  │
│  4. For new/changed docs:                               │
│     - Fetch full content                                │
│     - Process and chunk                                 │
│     - Generate embeddings                               │
│     - Upsert to KB                                      │
│  5. Remove deleted documents (optional)                 │
│  6. Report sync statistics                              │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/knowledge/
├── SyncKBSourceNode.tsx
├── KBAnalyticsNode.tsx
├── config/
│   ├── SyncKBSourceNodeConfig.tsx
│   └── KBAnalyticsNodeConfig.tsx
└── index.ts
```

### Backend

```
backend/src/temporal/activities/node-executors/knowledge/
├── sync-kb-source-executor.ts
└── kb-analytics-executor.ts

backend/src/services/knowledge-base/
├── sync/
│   ├── sync-manager.ts
│   ├── notion-sync.ts
│   ├── drive-sync.ts
│   ├── confluence-sync.ts
│   └── website-crawler.ts
├── analytics/
│   ├── usage-tracker.ts
│   ├── gap-analyzer.ts
│   └── quality-scorer.ts
```

---

## How to Deliver

1. Register both nodes in `node-registry.ts`
2. Create sync adapters for each source type
3. Implement incremental sync logic (change detection)
4. Create analytics query logging
5. Implement gap analysis (unanswered queries)
6. Create frontend node components
7. Create config forms with source selector
8. Test sync with real sources

---

## How to Test

| Test             | Expected Result                 |
| ---------------- | ------------------------------- |
| Sync from Notion | Documents indexed from database |
| Incremental sync | Only changed docs reprocessed   |
| Sync with errors | Errors reported, others succeed |
| Analytics usage  | Top queries returned            |
| Analytics gaps   | Unanswered queries identified   |

### Integration Tests

```typescript
describe("Sync KB Source", () => {
    it("syncs from Notion database", async () => {
        const result = await executeSyncKBSource({
            kbId: testKBId,
            sourceType: "notion",
            sourceId: testNotionDbId,
            mode: "full"
        });
        expect(result.added).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
    });

    it("performs incremental sync", async () => {
        // First full sync
        await executeSyncKBSource({ mode: "full" });

        // Modify one doc in source
        // ...

        // Incremental sync
        const result = await executeSyncKBSource({ mode: "incremental" });
        expect(result.updated).toBe(1);
        expect(result.added).toBe(0);
    });
});

describe("KB Analytics", () => {
    it("identifies unanswered queries", async () => {
        // Log some queries that returned no results
        await logQuery(testKBId, "how to cancel subscription", { noResults: true });

        const result = await executeKBAnalytics({
            kbId: testKBId,
            analysisType: "gaps"
        });
        expect(result.unansweredQueries).toContain("how to cancel subscription");
    });
});
```

---

## Acceptance Criteria

- [ ] Sync KB Source connects to Notion
- [ ] Sync KB Source connects to Google Drive
- [ ] Sync KB Source supports full and incremental modes
- [ ] Sync KB Source reports added/updated/deleted counts
- [ ] Sync KB Source handles errors gracefully
- [ ] KB Analytics tracks query history
- [ ] KB Analytics identifies top queries
- [ ] KB Analytics finds unanswered queries
- [ ] KB Analytics suggests content improvements
- [ ] Both nodes display with Knowledge category styling

---

## Dependencies

These nodes enable automated KB maintenance and improvement.
