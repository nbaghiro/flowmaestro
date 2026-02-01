/**
 * Knowledge Base Integration Test Setup
 *
 * KB-specific setup that extends the main integration test setup
 * with knowledge base utilities and configurations.
 */

// Import main integration setup (applies global configuration)
import "../setup";

// Re-export main setup utilities
export { createTestContext, flushPromises, delay } from "../setup";

// Re-export KB-specific helpers
export {
    createKBTestEnvironment,
    createSimpleKBTestEnvironment,
    runDocumentProcessingWorkflow,
    runWorkflowWithActivities,
    assertActivityCalled,
    assertActivityNotCalled,
    assertActivityOrder,
    type KBTestEnvironment,
    type SimpleKBTestEnvironment,
    type KBTestOptions,
    type ProcessingResult,
    type MockGCSService,
    type MockRepositories,
    type ActivityLogEntry
} from "./helpers/kb-test-env";

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
} from "./helpers/embedding-mock";

export {
    // Knowledge base fixtures
    createTestKnowledgeBase,
    createTestKnowledgeBases,
    type TestKnowledgeBase,
    type KnowledgeBaseConfig,

    // Document fixtures
    createTestDocument,
    createPendingDocument,
    createProcessingDocument,
    createFailedDocument,
    createUrlDocument,
    createDocumentsForFileTypes,

    // Chunk fixtures
    createTestChunk,
    createTestChunks,
    createSemanticTestChunks,
    createChunkData,
    type ChunkData,

    // Search result fixtures
    createSearchResult,
    createSearchResults,
    createSimilaritySearchResults,

    // Content fixtures
    sampleContents,

    // Workflow input fixtures
    createProcessingInput,

    // Scenario fixtures
    createCompleteScenario,
    createSemanticSearchScenario
} from "./helpers/kb-fixtures";

// ============================================================================
// KB-SPECIFIC TEST CONFIGURATION
// ============================================================================

// Increase timeout for KB tests (document processing can be slow)
jest.setTimeout(60000);

// ============================================================================
// KB-SPECIFIC MOCK ENVIRONMENT
// ============================================================================

// Set KB-specific environment variables for tests
process.env.EMBEDDING_MODEL = "text-embedding-3-small";
process.env.EMBEDDING_PROVIDER = "openai";
process.env.EMBEDDING_DIMENSIONS = "1536";
process.env.CHUNK_SIZE = "1000";
process.env.CHUNK_OVERLAP = "200";
