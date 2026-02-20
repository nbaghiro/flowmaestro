/**
 * Knowledge Base Test Fixtures
 *
 * Factory functions for creating test data for knowledge base integration tests.
 * All fixtures use deterministic IDs for reproducible tests.
 */

import { v4 as uuidv4 } from "uuid";
import { generateDeterministicEmbedding, generateSimilarEmbedding } from "./embedding-mock";
import type {
    KnowledgeChunkModel,
    ChunkSearchResult,
    ChunkMetadata
} from "../../../../src/storage/models/KnowledgeChunk";
import type {
    DocumentFileType,
    DocumentSourceType,
    KnowledgeDocumentModel
} from "../../../../src/storage/models/KnowledgeDocument";

// ============================================================================
// TYPES
// ============================================================================

export interface TestKnowledgeBase {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    config: KnowledgeBaseConfig;
    created_at: Date;
    updated_at: Date;
}

export interface KnowledgeBaseConfig {
    embeddingModel: string;
    embeddingProvider: string;
    chunkSize: number;
    chunkOverlap: number;
    embeddingDimensions: number;
}

export interface ChunkData {
    content: string;
    index: number;
    metadata: ChunkMetadata;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_KB_CONFIG: KnowledgeBaseConfig = {
    embeddingModel: "text-embedding-3-small",
    embeddingProvider: "openai",
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingDimensions: 1536
};

const DEFAULT_USER_ID = "test-user-001";
const DEFAULT_WORKSPACE_ID = "test-workspace-001";

// ============================================================================
// KNOWLEDGE BASE FIXTURES
// ============================================================================

/**
 * Create a test knowledge base with default or custom values.
 */
export function createTestKnowledgeBase(
    overrides: Partial<TestKnowledgeBase> = {}
): TestKnowledgeBase {
    const id = overrides.id || `kb-${uuidv4().slice(0, 8)}`;
    return {
        id,
        user_id: overrides.user_id || DEFAULT_USER_ID,
        workspace_id: overrides.workspace_id || DEFAULT_WORKSPACE_ID,
        name: overrides.name || "Test Knowledge Base",
        description: overrides.description !== undefined ? overrides.description : "A test KB",
        config: { ...DEFAULT_KB_CONFIG, ...overrides.config },
        created_at: overrides.created_at || new Date(),
        updated_at: overrides.updated_at || new Date()
    };
}

/**
 * Create multiple knowledge bases for testing.
 */
export function createTestKnowledgeBases(
    count: number,
    overrides: Partial<TestKnowledgeBase> = {}
): TestKnowledgeBase[] {
    return Array.from({ length: count }, (_, i) =>
        createTestKnowledgeBase({
            ...overrides,
            id: `kb-test-${String(i + 1).padStart(3, "0")}`,
            name: `Test Knowledge Base ${i + 1}`
        })
    );
}

// ============================================================================
// DOCUMENT FIXTURES
// ============================================================================

/**
 * Create a test document with default or custom values.
 */
export function createTestDocument(
    knowledgeBaseId: string,
    overrides: Partial<KnowledgeDocumentModel> = {}
): KnowledgeDocumentModel {
    const id = overrides.id || `doc-${uuidv4().slice(0, 8)}`;
    return {
        id,
        knowledge_base_id: knowledgeBaseId,
        name: overrides.name || "test-document.pdf",
        source_type: overrides.source_type || "file",
        source_id: overrides.source_id !== undefined ? overrides.source_id : null,
        source_url: overrides.source_url !== undefined ? overrides.source_url : null,
        file_path:
            overrides.file_path !== undefined
                ? overrides.file_path
                : `knowledge-bases/${knowledgeBaseId}/${id}.pdf`,
        file_type: overrides.file_type || "pdf",
        file_size: overrides.file_size !== undefined ? overrides.file_size : BigInt(1024),
        content: overrides.content !== undefined ? overrides.content : null,
        metadata: overrides.metadata || {},
        status: overrides.status || "ready",
        error_message: overrides.error_message !== undefined ? overrides.error_message : null,
        processing_started_at: overrides.processing_started_at || null,
        processing_completed_at: overrides.processing_completed_at || null,
        created_at: overrides.created_at || new Date(),
        updated_at: overrides.updated_at || new Date()
    };
}

/**
 * Create a document in pending state (awaiting processing).
 */
export function createPendingDocument(
    knowledgeBaseId: string,
    overrides: Partial<KnowledgeDocumentModel> = {}
): KnowledgeDocumentModel {
    return createTestDocument(knowledgeBaseId, {
        ...overrides,
        status: "pending",
        processing_started_at: null,
        processing_completed_at: null
    });
}

/**
 * Create a document in processing state.
 */
export function createProcessingDocument(
    knowledgeBaseId: string,
    overrides: Partial<KnowledgeDocumentModel> = {}
): KnowledgeDocumentModel {
    return createTestDocument(knowledgeBaseId, {
        ...overrides,
        status: "processing",
        processing_started_at: new Date(),
        processing_completed_at: null
    });
}

/**
 * Create a failed document with an error message.
 */
export function createFailedDocument(
    knowledgeBaseId: string,
    errorMessage: string,
    overrides: Partial<KnowledgeDocumentModel> = {}
): KnowledgeDocumentModel {
    return createTestDocument(knowledgeBaseId, {
        ...overrides,
        status: "failed",
        error_message: errorMessage,
        processing_started_at: new Date(Date.now() - 5000),
        processing_completed_at: new Date()
    });
}

/**
 * Create a URL-sourced document.
 */
export function createUrlDocument(
    knowledgeBaseId: string,
    url: string,
    overrides: Partial<KnowledgeDocumentModel> = {}
): KnowledgeDocumentModel {
    return createTestDocument(knowledgeBaseId, {
        ...overrides,
        name: overrides.name || new URL(url).hostname,
        source_type: "url" as DocumentSourceType,
        source_url: url,
        file_path: null,
        file_type: "html" as DocumentFileType
    });
}

/**
 * Create documents for different file types.
 */
export function createDocumentsForFileTypes(
    knowledgeBaseId: string
): Record<DocumentFileType, KnowledgeDocumentModel> {
    const fileTypes: DocumentFileType[] = [
        "pdf",
        "docx",
        "doc",
        "txt",
        "md",
        "html",
        "json",
        "csv"
    ];
    const result: Partial<Record<DocumentFileType, KnowledgeDocumentModel>> = {};

    for (const fileType of fileTypes) {
        result[fileType] = createTestDocument(knowledgeBaseId, {
            id: `doc-${fileType}-001`,
            name: `test-document.${fileType}`,
            file_type: fileType,
            file_path: `knowledge-bases/${knowledgeBaseId}/test-document.${fileType}`
        });
    }

    return result as Record<DocumentFileType, KnowledgeDocumentModel>;
}

// ============================================================================
// CHUNK FIXTURES
// ============================================================================

/**
 * Create a test chunk with default or custom values.
 */
export function createTestChunk(
    documentId: string,
    knowledgeBaseId: string,
    overrides: Partial<KnowledgeChunkModel> = {}
): KnowledgeChunkModel {
    const id = overrides.id || `chunk-${uuidv4().slice(0, 8)}`;
    const content = overrides.content || `Test chunk content for document ${documentId}`;

    return {
        id,
        document_id: documentId,
        knowledge_base_id: knowledgeBaseId,
        chunk_index: overrides.chunk_index ?? 0,
        content,
        embedding:
            overrides.embedding !== undefined
                ? overrides.embedding
                : generateDeterministicEmbedding(content),
        token_count: overrides.token_count ?? Math.ceil(content.length / 4),
        metadata: overrides.metadata || {},
        created_at: overrides.created_at || new Date()
    };
}

/**
 * Create multiple chunks for a document.
 */
export function createTestChunks(
    documentId: string,
    knowledgeBaseId: string,
    count: number,
    contentGenerator?: (index: number) => string
): KnowledgeChunkModel[] {
    const defaultGenerator = (i: number) =>
        `Chunk ${i + 1} content with some meaningful text that represents extracted content from the document.`;

    const generator = contentGenerator || defaultGenerator;

    return Array.from({ length: count }, (_, i) => {
        const content = generator(i);
        return createTestChunk(documentId, knowledgeBaseId, {
            id: `chunk-${documentId}-${String(i).padStart(3, "0")}`,
            chunk_index: i,
            content,
            token_count: Math.ceil(content.length / 4),
            metadata: {
                start_char: i * 500,
                end_char: (i + 1) * 500
            }
        });
    });
}

/**
 * Create chunks with pre-defined content for semantic search testing.
 */
export function createSemanticTestChunks(
    documentId: string,
    knowledgeBaseId: string
): KnowledgeChunkModel[] {
    const contents = [
        "Our vacation policy allows employees to take up to 20 days of paid time off per year. Vacation requests must be submitted at least two weeks in advance.",
        "The remote work policy permits employees to work from home up to 3 days per week. A stable internet connection is required.",
        "Expense reimbursement can take up to 14 business days. Submit all receipts through the expense portal.",
        "Security protocols require all employees to use VPN when accessing company resources remotely. Two-factor authentication is mandatory.",
        "The onboarding process includes HR paperwork, IT setup, and team introduction meetings over the first week."
    ];

    return contents.map((content, i) =>
        createTestChunk(documentId, knowledgeBaseId, {
            id: `chunk-semantic-${String(i).padStart(3, "0")}`,
            chunk_index: i,
            content,
            metadata: { section: `Section ${i + 1}` }
        })
    );
}

/**
 * Create chunk data (pre-embedding) for workflow testing.
 */
export function createChunkData(count: number): ChunkData[] {
    return Array.from({ length: count }, (_, i) => ({
        content: `Chunk ${i + 1} content with meaningful text.`,
        index: i,
        metadata: { chunkIndex: i, source: "test" }
    }));
}

// ============================================================================
// SEARCH RESULT FIXTURES
// ============================================================================

/**
 * Create a mock search result.
 */
export function createSearchResult(
    chunk: KnowledgeChunkModel,
    documentName: string,
    similarity: number
): ChunkSearchResult {
    return {
        id: chunk.id,
        document_id: chunk.document_id,
        document_name: documentName,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        metadata: chunk.metadata,
        similarity
    };
}

/**
 * Create a set of search results with decreasing similarity scores.
 */
export function createSearchResults(
    chunks: KnowledgeChunkModel[],
    documentName: string,
    baseSimililarity: number = 0.95
): ChunkSearchResult[] {
    return chunks.map((chunk, i) =>
        createSearchResult(chunk, documentName, Math.max(0, baseSimililarity - i * 0.1))
    );
}

/**
 * Create search results with chunks that have embeddings similar to a query.
 */
export function createSimilaritySearchResults(
    queryText: string,
    documentId: string,
    _knowledgeBaseId: string,
    documentName: string,
    count: number = 5
): { queryEmbedding: number[]; results: ChunkSearchResult[] } {
    const queryEmbedding = generateDeterministicEmbedding(queryText);
    const results: ChunkSearchResult[] = [];

    for (let i = 0; i < count; i++) {
        const similarity = 0.95 - i * 0.1;
        if (similarity <= 0) break;

        const content = `Result ${i + 1} content related to: ${queryText}`;
        // Generate embedding for verification purposes (not stored in result)
        generateSimilarEmbedding(queryEmbedding, similarity, i);

        results.push({
            id: `chunk-result-${i}`,
            document_id: documentId,
            document_name: documentName,
            chunk_index: i,
            content,
            metadata: { section: `Section ${i + 1}` },
            similarity: Math.round(similarity * 1000) / 1000
        });
    }

    return { queryEmbedding, results };
}

// ============================================================================
// DOCUMENT CONTENT FIXTURES
// ============================================================================

/**
 * Sample content for different file types.
 */
export const sampleContents = {
    pdf: `Introduction to Company Policies

This document outlines the key policies that all employees must follow.

Chapter 1: Vacation Policy
Employees are entitled to 20 days of paid vacation per year. Vacation must be requested at least 2 weeks in advance through the HR portal.

Chapter 2: Remote Work
Our company supports flexible work arrangements. Employees may work remotely up to 3 days per week with manager approval.

Chapter 3: Expense Reimbursement
Business expenses must be submitted within 30 days. Receipts are required for all expenses over $25.`,

    docx: `Employee Handbook

Welcome to the company! This handbook contains important information about your employment.

Section 1: Working Hours
Standard working hours are 9 AM to 5 PM, Monday through Friday.

Section 2: Benefits
We offer comprehensive health insurance, 401(k) matching, and professional development opportunities.`,

    txt: `Meeting Notes - Q4 Planning

Attendees: John, Sarah, Mike

Action Items:
1. Review budget proposals by Friday
2. Schedule follow-up with marketing team
3. Finalize product roadmap

Next meeting: November 15th`,

    html: `<html>
<head><title>Product Documentation</title></head>
<body>
<h1>API Reference</h1>
<p>This document describes the public API endpoints.</p>
<h2>Authentication</h2>
<p>All requests must include an API key in the Authorization header.</p>
</body>
</html>`,

    csv: `name,department,start_date,salary
John Smith,Engineering,2020-01-15,85000
Jane Doe,Marketing,2019-06-01,75000
Bob Johnson,Sales,2021-03-20,70000`,

    json: `{
  "company": "Test Corp",
  "employees": 150,
  "departments": ["Engineering", "Marketing", "Sales", "HR"],
  "founded": 2015
}`,

    md: `# Project README

## Overview
This project implements a workflow automation system.

## Installation
\`\`\`bash
npm install
npm run build
\`\`\`

## Usage
See the documentation for detailed usage instructions.`,

    empty: "",

    whitespaceOnly: "   \n\t\n   ",

    veryLarge: "A".repeat(100000) // 100KB of text
};

// ============================================================================
// WORKFLOW INPUT FIXTURES
// ============================================================================

/**
 * Create document processing workflow input.
 */
export function createProcessingInput(
    documentId: string,
    knowledgeBaseId: string,
    overrides: {
        filePath?: string;
        sourceUrl?: string;
        fileType?: string;
        userId?: string;
    } = {}
): {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: string;
    userId?: string;
} {
    return {
        documentId,
        knowledgeBaseId,
        filePath: overrides.filePath ?? `/uploads/${documentId}.pdf`,
        sourceUrl: overrides.sourceUrl,
        fileType: overrides.fileType ?? "pdf",
        userId: overrides.userId ?? DEFAULT_USER_ID
    };
}

// ============================================================================
// SCENARIO FIXTURES
// ============================================================================

/**
 * Create a complete test scenario with KB, document, and chunks.
 */
export function createCompleteScenario(
    options: {
        kbName?: string;
        documentName?: string;
        chunkCount?: number;
    } = {}
): {
    knowledgeBase: TestKnowledgeBase;
    document: KnowledgeDocumentModel;
    chunks: KnowledgeChunkModel[];
} {
    const knowledgeBase = createTestKnowledgeBase({
        id: "kb-scenario-001",
        name: options.kbName || "Scenario Knowledge Base"
    });

    const document = createTestDocument(knowledgeBase.id, {
        id: "doc-scenario-001",
        name: options.documentName || "scenario-document.pdf"
    });

    const chunks = createTestChunks(document.id, knowledgeBase.id, options.chunkCount || 5);

    return { knowledgeBase, document, chunks };
}

/**
 * Create a semantic search test scenario.
 */
export function createSemanticSearchScenario(): {
    knowledgeBase: TestKnowledgeBase;
    document: KnowledgeDocumentModel;
    chunks: KnowledgeChunkModel[];
    testQueries: Array<{ query: string; expectedTopChunkIndex: number }>;
} {
    const knowledgeBase = createTestKnowledgeBase({
        id: "kb-semantic-001",
        name: "Semantic Search Test KB"
    });

    const document = createTestDocument(knowledgeBase.id, {
        id: "doc-semantic-001",
        name: "company-policies.pdf"
    });

    const chunks = createSemanticTestChunks(document.id, knowledgeBase.id);

    const testQueries = [
        { query: "vacation days off PTO", expectedTopChunkIndex: 0 },
        { query: "work from home remote", expectedTopChunkIndex: 1 },
        { query: "expense receipt reimbursement", expectedTopChunkIndex: 2 },
        { query: "VPN security authentication", expectedTopChunkIndex: 3 },
        { query: "new employee orientation", expectedTopChunkIndex: 4 }
    ];

    return { knowledgeBase, document, chunks, testQueries };
}
