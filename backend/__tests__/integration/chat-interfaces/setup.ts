/**
 * Chat Interface Integration Test Setup
 *
 * Chat-interface-specific setup that extends the main integration test setup
 * with chat interface utilities and configurations.
 */

// Import main integration setup (applies global configuration)
import "../setup";

// Re-export main setup utilities
export { createTestContext, flushPromises, delay } from "../setup";

// Re-export chat interface helpers
export {
    createChatInterfaceTestEnvironment,
    createSimpleChatInterfaceTestEnvironment,
    assertWorkflowStarted,
    assertRateLimitRecorded,
    type ChatInterfaceTestEnvironment,
    type SimpleChatInterfaceTestEnvironment,
    type ChatInterfaceTestOptions,
    type MockRepositories,
    type MockServices,
    type MockGCSService,
    type MockTemporalClient,
    type MockRedisEventBus
} from "./helpers/chat-interface-test-env";

export {
    createMockEmbeddingService,
    generateDeterministicEmbedding,
    generateSimilarEmbedding,
    cosineSimilarity,
    generateTestEmbeddingSet,
    testEmbeddings,
    type MockEmbeddingService,
    type EmbeddingMockOptions,
    type EmbeddingCall
} from "../knowledge-base/helpers/embedding-mock";

export {
    // Chat interface fixtures
    createTestChatInterface,
    createPublicChatInterface,
    createDraftChatInterface,
    createNoUploadChatInterface,

    // Session fixtures
    createTestSession,
    createSessionWithThread,
    createExpiredSession,

    // Chunk fixtures
    createTestChunk,
    createTestChunks,
    createSemanticTestChunks,

    // Attachment fixtures
    createTestFileAttachment,
    createTestUrlAttachment,
    createFileTypeAttachments,

    // Suggested prompts fixtures
    createTestSuggestedPrompts,

    // Content fixtures
    sampleContents,

    // Scenario fixtures
    createCompleteScenario,
    createSemanticSearchScenario
} from "./helpers/chat-interface-fixtures";

export {
    createSSETestClient,
    createSSEResponse,
    createConnectionEvent,
    createKeepalive,
    assertEventReceived,
    assertConnectionEstablished,
    assertSSEHeaders,
    type SSETestClient,
    type SSEEvent,
    type SSEConnectionResult
} from "./helpers/sse-test-client";

// ============================================================================
// CHAT-INTERFACE-SPECIFIC TEST CONFIGURATION
// ============================================================================

// Increase timeout for chat interface tests
jest.setTimeout(30000);

// ============================================================================
// CHAT-INTERFACE-SPECIFIC MOCK ENVIRONMENT
// ============================================================================

// Set chat-interface-specific environment variables for tests
process.env.EMBEDDING_MODEL = "text-embedding-3-small";
process.env.EMBEDDING_PROVIDER = "openai";
process.env.EMBEDDING_DIMENSIONS = "1536";
