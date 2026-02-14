/**
 * Form Interface Integration Test Setup
 *
 * Form-interface-specific setup that extends the main integration test setup
 * with form interface utilities and configurations.
 */

// Import main integration setup (applies global configuration)
import "../setup";

// Re-export main setup utilities
export { createTestContext, flushPromises, delay } from "../setup";

// Re-export form interface helpers
export {
    createFormInterfaceTestEnvironment,
    createSimpleFormInterfaceTestEnvironment,
    assertWorkflowStarted,
    assertRateLimitRecorded,
    assertEventPublished,
    type FormInterfaceTestEnvironment,
    type SimpleFormInterfaceTestEnvironment,
    type FormInterfaceTestOptions,
    type MockRepositories,
    type MockServices,
    type MockGCSService,
    type MockTemporalClient,
    type MockRedisEventBus,
    type MockFormInterfaceRepository,
    type MockFormInterfaceSubmissionRepository,
    type FormStreamingEvent
} from "./helpers/form-interface-test-env";

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
    // Form interface fixtures
    createTestFormInterface,
    createPublicFormInterface,
    createDraftFormInterface,
    createPublishedFormInterface,
    createWorkflowTargetFormInterface,
    createAgentTargetFormInterface,
    createNoUploadFormInterface,

    // Submission fixtures
    createTestSubmission,
    createRunningSubmission,
    createCompletedSubmission,
    createFailedSubmission,
    createSubmissionWithPendingAttachments,

    // Attachment fixtures
    createTestFileAttachment,
    createTestUrlAttachment,
    createFileTypeAttachments,
    createOversizedFileAttachment,
    createInvalidTypeFileAttachment,

    // Input fixtures
    createValidWorkflowFormInput,
    createValidAgentFormInput,
    createValidUpdateInput,

    // Chunk fixtures
    createTestChunk,
    createTestChunks,

    // Scenario fixtures
    createCompleteScenario,
    createSubmissionFlowScenario,

    // SSE event fixtures
    createWorkflowStartedEvent,
    createWorkflowProgressEvent,
    createNodeCompletedEvent,
    createWorkflowCompletedEvent,
    createWorkflowFailedEvent,
    createAgentTokenEvent,
    createAgentCompletedEvent,
    createAgentFailedEvent,

    // Content fixtures
    sampleContents,

    // User/workspace fixtures
    createTestUser,
    createTestWorkspace,

    // Validation fixtures
    RESERVED_SLUGS,
    INVALID_SLUG_EXAMPLES,

    // Types
    type CreateSubmissionChunkInput
} from "./helpers/form-interface-fixtures";

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
} from "../chat-interfaces/helpers/sse-test-client";

// ============================================================================
// FORM-INTERFACE-SPECIFIC TEST CONFIGURATION
// ============================================================================

// Increase timeout for form interface tests
jest.setTimeout(30000);

// ============================================================================
// FORM-INTERFACE-SPECIFIC MOCK ENVIRONMENT
// ============================================================================

// Set form-interface-specific environment variables for tests
process.env.EMBEDDING_MODEL = "text-embedding-3-small";
process.env.EMBEDDING_PROVIDER = "openai";
process.env.EMBEDDING_DIMENSIONS = "1536";
