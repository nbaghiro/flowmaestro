/**
 * Chat Interface Test Fixtures
 *
 * Factory functions for creating test data for chat interface integration tests.
 * All fixtures use deterministic IDs for reproducible tests.
 */

import { v4 as uuidv4 } from "uuid";
import type {
    ChatInterface,
    ChatInterfaceSession,
    PublicChatInterface,
    ChatMessageAttachment,
    ChatInterfaceSuggestedPrompt
} from "@flowmaestro/shared";
import { generateDeterministicEmbedding } from "../../knowledge-base/helpers/embedding-mock";
import type { CreateChunkInput } from "../../../../src/storage/repositories/ChatInterfaceMessageChunkRepository";

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_USER_ID = "test-user-001";
const DEFAULT_WORKSPACE_ID = "test-workspace-001";
const DEFAULT_AGENT_ID = "test-agent-001";

// ============================================================================
// CHAT INTERFACE FIXTURES
// ============================================================================

/**
 * Create a test chat interface with default or custom values.
 */
export function createTestChatInterface(overrides: Partial<ChatInterface> = {}): ChatInterface {
    const id = overrides.id || `ci-${uuidv4().slice(0, 8)}`;
    const slug = overrides.slug || `test-chat-${id.slice(3)}`;

    return {
        id,
        userId: overrides.userId || DEFAULT_USER_ID,
        workspaceId: overrides.workspaceId || DEFAULT_WORKSPACE_ID,
        name: overrides.name || "Test Chat Interface",
        slug,
        agentId: overrides.agentId || DEFAULT_AGENT_ID,

        // Branding - Header
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#3b82f6",
        iconUrl: overrides.iconUrl !== undefined ? overrides.iconUrl : null,
        title: overrides.title || "Test Chat",
        description:
            overrides.description !== undefined ? overrides.description : "A test chat interface",

        // Branding - Theme
        primaryColor: overrides.primaryColor || "#3b82f6",
        fontFamily: overrides.fontFamily || "Inter",
        borderRadius: overrides.borderRadius ?? 8,

        // Chat Configuration
        welcomeMessage: overrides.welcomeMessage || "Hello! How can I help you?",
        placeholderText: overrides.placeholderText || "Type your message...",
        suggestedPrompts: overrides.suggestedPrompts || [],

        // File Upload Configuration
        allowFileUpload: overrides.allowFileUpload ?? true,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || [
            "application/pdf",
            "text/plain",
            "image/*"
        ],

        // Session Configuration
        persistenceType: overrides.persistenceType || "session",
        sessionTimeoutMinutes: overrides.sessionTimeoutMinutes ?? 30,

        // Widget Configuration
        widgetPosition: overrides.widgetPosition || "bottom-right",
        widgetButtonIcon: overrides.widgetButtonIcon || "💬",
        widgetButtonText:
            overrides.widgetButtonText !== undefined ? overrides.widgetButtonText : null,
        widgetInitialState: overrides.widgetInitialState || "collapsed",

        // Rate Limiting
        rateLimitMessages: overrides.rateLimitMessages ?? 10,
        rateLimitWindowSeconds: overrides.rateLimitWindowSeconds ?? 60,

        // State
        status: overrides.status || "published",
        publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : new Date(),

        // Stats
        sessionCount: overrides.sessionCount ?? 0,
        messageCount: overrides.messageCount ?? 0,
        lastActivityAt: overrides.lastActivityAt !== undefined ? overrides.lastActivityAt : null,

        // Timestamps
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date()
    };
}

/**
 * Create a public chat interface (stripped for embedding).
 */
export function createPublicChatInterface(
    overrides: Partial<PublicChatInterface> = {}
): PublicChatInterface {
    const id = overrides.id || `ci-${uuidv4().slice(0, 8)}`;
    const slug = overrides.slug || `test-chat-${id.slice(3)}`;

    return {
        id,
        slug,
        title: overrides.title || "Test Chat",
        description:
            overrides.description !== undefined ? overrides.description : "A test chat interface",
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#3b82f6",
        iconUrl: overrides.iconUrl !== undefined ? overrides.iconUrl : null,
        primaryColor: overrides.primaryColor || "#3b82f6",
        fontFamily: overrides.fontFamily || "Inter",
        borderRadius: overrides.borderRadius ?? 8,
        welcomeMessage: overrides.welcomeMessage || "Hello! How can I help you?",
        placeholderText: overrides.placeholderText || "Type your message...",
        suggestedPrompts: overrides.suggestedPrompts || [],
        allowFileUpload: overrides.allowFileUpload ?? true,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || [
            "application/pdf",
            "text/plain",
            "image/*"
        ],
        persistenceType: overrides.persistenceType || "session",
        widgetPosition: overrides.widgetPosition || "bottom-right",
        widgetButtonIcon: overrides.widgetButtonIcon || "💬",
        widgetButtonText:
            overrides.widgetButtonText !== undefined ? overrides.widgetButtonText : null,
        widgetInitialState: overrides.widgetInitialState || "collapsed"
    };
}

/**
 * Create a draft (unpublished) chat interface.
 */
export function createDraftChatInterface(overrides: Partial<ChatInterface> = {}): ChatInterface {
    return createTestChatInterface({
        ...overrides,
        status: "draft",
        publishedAt: null
    });
}

/**
 * Create a chat interface with file uploads disabled.
 */
export function createNoUploadChatInterface(overrides: Partial<ChatInterface> = {}): ChatInterface {
    return createTestChatInterface({
        ...overrides,
        allowFileUpload: false
    });
}

// ============================================================================
// SESSION FIXTURES
// ============================================================================

/**
 * Create a test session with default or custom values.
 */
export function createTestSession(
    interfaceId: string,
    overrides: Partial<ChatInterfaceSession> = {}
): ChatInterfaceSession {
    const id = overrides.id || `session-${uuidv4().slice(0, 8)}`;
    const sessionToken =
        overrides.sessionToken || `tok_${Buffer.from(uuidv4()).toString("hex").slice(0, 32)}`;

    return {
        id,
        interfaceId,
        sessionToken,
        browserFingerprint:
            overrides.browserFingerprint !== undefined
                ? overrides.browserFingerprint
                : `fp_${uuidv4().slice(0, 16)}`,
        threadId: overrides.threadId !== undefined ? overrides.threadId : null,
        ipAddress: overrides.ipAddress !== undefined ? overrides.ipAddress : "127.0.0.1",
        userAgent:
            overrides.userAgent !== undefined ? overrides.userAgent : "Mozilla/5.0 (Test Browser)",
        referrer: overrides.referrer !== undefined ? overrides.referrer : "https://example.com",
        countryCode: overrides.countryCode !== undefined ? overrides.countryCode : "US",
        status: overrides.status || "active",
        messageCount: overrides.messageCount ?? 0,
        persistenceToken:
            overrides.persistenceToken !== undefined
                ? overrides.persistenceToken
                : `persist_${uuidv4().slice(0, 16)}`,
        firstSeenAt: overrides.firstSeenAt || new Date(),
        lastActivityAt: overrides.lastActivityAt || new Date(),
        endedAt: overrides.endedAt !== undefined ? overrides.endedAt : null,
        currentExecutionId:
            overrides.currentExecutionId !== undefined ? overrides.currentExecutionId : null,
        executionStatus: overrides.executionStatus || "idle"
    };
}

/**
 * Create a session with an active thread.
 */
export function createSessionWithThread(
    interfaceId: string,
    threadId: string,
    overrides: Partial<ChatInterfaceSession> = {}
): ChatInterfaceSession {
    return createTestSession(interfaceId, {
        ...overrides,
        threadId,
        messageCount: overrides.messageCount ?? 5
    });
}

/**
 * Create an expired session.
 */
export function createExpiredSession(
    interfaceId: string,
    overrides: Partial<ChatInterfaceSession> = {}
): ChatInterfaceSession {
    const now = new Date();
    const expiredTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    return createTestSession(interfaceId, {
        ...overrides,
        status: "expired",
        lastActivityAt: expiredTime,
        endedAt: now
    });
}

// ============================================================================
// CHUNK FIXTURES
// ============================================================================

/**
 * Create a test chunk with default or custom values.
 */
export function createTestChunk(
    sessionId: string,
    overrides: Partial<CreateChunkInput> = {}
): CreateChunkInput {
    const content =
        overrides.content ||
        "This is sample chunk content for testing chat interface RAG functionality.";

    return {
        sessionId,
        threadId: overrides.threadId,
        sourceType: overrides.sourceType || "file",
        sourceName: overrides.sourceName || "test-document.pdf",
        sourceIndex: overrides.sourceIndex ?? 0,
        content,
        chunkIndex: overrides.chunkIndex ?? 0,
        embedding: overrides.embedding || generateDeterministicEmbedding(content),
        metadata: overrides.metadata || { fileName: "test-document.pdf" }
    };
}

/**
 * Create multiple chunks for a session.
 */
export function createTestChunks(
    sessionId: string,
    count: number,
    sourceName: string = "test-document.pdf",
    contentGenerator?: (index: number) => string
): CreateChunkInput[] {
    const defaultGenerator = (i: number) =>
        `Chunk ${i + 1} content from ${sourceName} with meaningful text for semantic search testing.`;

    const generator = contentGenerator || defaultGenerator;

    return Array.from({ length: count }, (_, i) => {
        const content = generator(i);
        return createTestChunk(sessionId, {
            content,
            chunkIndex: i,
            sourceName,
            sourceIndex: 0,
            embedding: generateDeterministicEmbedding(content),
            metadata: { chunkIndex: i, source: sourceName }
        });
    });
}

/**
 * Create semantic test chunks with policy-related content.
 */
export function createSemanticTestChunks(sessionId: string): CreateChunkInput[] {
    const contents = [
        "Our vacation policy allows employees to take up to 20 days of paid time off per year. Vacation requests must be submitted at least two weeks in advance.",
        "The remote work policy permits employees to work from home up to 3 days per week. A stable internet connection is required.",
        "Expense reimbursement can take up to 14 business days. Submit all receipts through the expense portal.",
        "Security protocols require all employees to use VPN when accessing company resources remotely. Two-factor authentication is mandatory.",
        "The onboarding process includes HR paperwork, IT setup, and team introduction meetings over the first week."
    ];

    return contents.map((content, i) =>
        createTestChunk(sessionId, {
            content,
            chunkIndex: i,
            sourceName: "company-policies.pdf",
            sourceIndex: 0,
            embedding: generateDeterministicEmbedding(content),
            metadata: { section: `Section ${i + 1}` }
        })
    );
}

// ============================================================================
// ATTACHMENT FIXTURES
// ============================================================================

/**
 * Create a test file attachment.
 */
export function createTestFileAttachment(
    overrides: Partial<ChatMessageAttachment> = {}
): ChatMessageAttachment {
    const id = overrides.id || `att-${uuidv4().slice(0, 8)}`;

    return {
        id,
        type: "file",
        fileName: overrides.fileName || "test-document.pdf",
        fileSize: overrides.fileSize ?? 1024 * 100, // 100KB
        mimeType: overrides.mimeType || "application/pdf",
        gcsUri: overrides.gcsUri || `gs://test-bucket/attachments/${id}/test-document.pdf`,
        downloadUrl:
            overrides.downloadUrl ||
            `https://storage.googleapis.com/test-bucket/attachments/${id}/test-document.pdf?signed=true`,
        url: overrides.url
    };
}

/**
 * Create a test URL attachment.
 */
export function createTestUrlAttachment(
    overrides: Partial<ChatMessageAttachment> = {}
): ChatMessageAttachment {
    return {
        id: overrides.id || `att-${uuidv4().slice(0, 8)}`,
        type: "url",
        url: overrides.url || "https://example.com/document"
    };
}

/**
 * Create attachments for different file types.
 */
export function createFileTypeAttachments(): Record<string, ChatMessageAttachment> {
    const fileTypes = [
        { ext: "pdf", mime: "application/pdf" },
        {
            ext: "docx",
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        { ext: "txt", mime: "text/plain" },
        { ext: "md", mime: "text/markdown" },
        { ext: "html", mime: "text/html" },
        { ext: "json", mime: "application/json" },
        { ext: "csv", mime: "text/csv" }
    ];

    const result: Record<string, ChatMessageAttachment> = {};

    for (const { ext, mime } of fileTypes) {
        result[ext] = createTestFileAttachment({
            fileName: `test-document.${ext}`,
            mimeType: mime
        });
    }

    return result;
}

// ============================================================================
// SUGGESTED PROMPTS FIXTURES
// ============================================================================

/**
 * Create test suggested prompts.
 */
export function createTestSuggestedPrompts(): ChatInterfaceSuggestedPrompt[] {
    return [
        { text: "What is the vacation policy?", icon: "🏖️" },
        { text: "How do I submit an expense report?", icon: "💰" },
        { text: "Tell me about remote work guidelines", icon: "🏠" }
    ];
}

// ============================================================================
// SCENARIO FIXTURES
// ============================================================================

/**
 * Create a complete test scenario with interface, session, and chunks.
 */
export function createCompleteScenario(
    options: {
        interfaceName?: string;
        chunkCount?: number;
        hasThread?: boolean;
    } = {}
): {
    chatInterface: ChatInterface;
    session: ChatInterfaceSession;
    chunks: CreateChunkInput[];
    threadId?: string;
} {
    const chatInterface = createTestChatInterface({
        id: "ci-scenario-001",
        name: options.interfaceName || "Scenario Chat Interface"
    });

    const threadId = options.hasThread ? `thread-${uuidv4().slice(0, 8)}` : undefined;

    const session = createTestSession(chatInterface.id, {
        id: "session-scenario-001",
        threadId
    });

    const chunks = createTestChunks(session.id, options.chunkCount || 5);

    return { chatInterface, session, chunks, threadId };
}

/**
 * Create a semantic search test scenario.
 */
export function createSemanticSearchScenario(): {
    chatInterface: ChatInterface;
    session: ChatInterfaceSession;
    chunks: CreateChunkInput[];
    testQueries: Array<{ query: string; expectedTopChunkIndex: number }>;
} {
    const chatInterface = createTestChatInterface({
        id: "ci-semantic-001",
        name: "Semantic Search Test Chat"
    });

    const session = createTestSession(chatInterface.id, {
        id: "session-semantic-001"
    });

    const chunks = createSemanticTestChunks(session.id);

    const testQueries = [
        { query: "vacation days off PTO", expectedTopChunkIndex: 0 },
        { query: "work from home remote", expectedTopChunkIndex: 1 },
        { query: "expense receipt reimbursement", expectedTopChunkIndex: 2 },
        { query: "VPN security authentication", expectedTopChunkIndex: 3 },
        { query: "new employee orientation", expectedTopChunkIndex: 4 }
    ];

    return { chatInterface, session, chunks, testQueries };
}

// ============================================================================
// SAMPLE CONTENT FIXTURES
// ============================================================================

/**
 * Sample file content for different types.
 */
export const sampleContents = {
    pdf: `Introduction to Company Policies

This document outlines the key policies that all employees must follow.

Chapter 1: Vacation Policy
Employees are entitled to 20 days of paid vacation per year.

Chapter 2: Remote Work
Our company supports flexible work arrangements.`,

    txt: `Meeting Notes - Q4 Planning

Attendees: John, Sarah, Mike

Action Items:
1. Review budget proposals by Friday
2. Schedule follow-up with marketing team`,

    html: `<html>
<head><title>Product Documentation</title></head>
<body>
<h1>API Reference</h1>
<p>This document describes the public API endpoints.</p>
</body>
</html>`,

    json: `{
  "company": "Test Corp",
  "employees": 150,
  "departments": ["Engineering", "Marketing"]
}`,

    csv: `name,department,start_date
John Smith,Engineering,2020-01-15
Jane Doe,Marketing,2019-06-01`,

    md: `# Project README

## Overview
This project implements a workflow automation system.

## Installation
\`\`\`bash
npm install
\`\`\``,

    empty: "",

    whitespaceOnly: "   \n\t\n   "
};
