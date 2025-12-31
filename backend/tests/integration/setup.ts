/**
 * Integration Test Setup
 *
 * Global setup and teardown for integration tests.
 * Configures mocking, extends Jest with custom matchers, and manages test environment.
 */

import { extendJestWithWorkflowMatchers } from "../helpers/assertion-helpers";
import { setupHttpMocking, teardownHttpMocking } from "../helpers/http-mock";
import { saveAndClearHandlers, restoreHandlers } from "../helpers/mock-registry";

// ============================================================================
// GLOBAL SETUP
// ============================================================================

// Extend Jest with custom workflow matchers
extendJestWithWorkflowMatchers();

// Increase timeout for integration tests (workflows can take time)
jest.setTimeout(30000);

// Suppress console output during tests (optional - comment out for debugging)
// const originalConsole = { ...console };
// beforeAll(() => {
//     console.log = jest.fn();
//     console.info = jest.fn();
//     console.warn = jest.fn();
//     console.debug = jest.fn();
// });
//
// afterAll(() => {
//     console.log = originalConsole.log;
//     console.info = originalConsole.info;
//     console.warn = originalConsole.warn;
//     console.debug = originalConsole.debug;
// });

// ============================================================================
// HTTP MOCKING SETUP
// ============================================================================

beforeEach(() => {
    // Setup HTTP mocking for each test
    setupHttpMocking();
});

afterEach(() => {
    // Cleanup HTTP mocks after each test
    teardownHttpMocking();
});

// ============================================================================
// HANDLER REGISTRY SETUP
// ============================================================================

// Save original handlers before all tests in a file
beforeAll(() => {
    saveAndClearHandlers();
});

// Restore original handlers after all tests
afterAll(() => {
    restoreHandlers();
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Helper to create a test context with common setup
 */
export function createTestContext() {
    return {
        executionId: `test-exec-${Date.now()}`,
        userId: "test-user",
        workflowId: `test-workflow-${Date.now()}`
    };
}

/**
 * Helper to wait for async operations to complete
 */
export async function flushPromises(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Helper to create a delay in tests
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// MOCK ENVIRONMENT VARIABLES
// ============================================================================

// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.TEMPORAL_ADDRESS = "localhost:7233";

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

// Catch unhandled promise rejections in tests
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// ============================================================================
// EXPORTS FOR TEST FILES
// ============================================================================

export { extendJestWithWorkflowMatchers } from "../helpers/assertion-helpers";
export { setupHttpMocking, teardownHttpMocking, clearHttpMocks } from "../helpers/http-mock";
export {
    saveAndClearHandlers,
    restoreHandlers,
    clearAndMockHandlers,
    installDefaultMockHandlers,
    createMockHandler
} from "../helpers/mock-registry";
export {
    createTestEnvironment,
    runWorkflowTest,
    runWorkflowAndAssert,
    createTestWorkflowDefinition,
    createDefaultMockActivities,
    createFailingNodeActivities,
    createCustomOutputActivities,
    createDelayedActivities
} from "../helpers/temporal-test-env";
export {
    chatCompletions,
    embeddings,
    errors as llmErrors,
    createChatCompletion,
    createEmbeddingResponse,
    toLLMNodeOutput
} from "../fixtures/llm-responses";
export {
    createMockActivities,
    failNode,
    withDelays,
    withOutputs,
    mergeConfigs
} from "../fixtures/activities";
export {
    createLinearWorkflow,
    createDiamondWorkflow,
    createConditionalWorkflow,
    createLoopWorkflow,
    createErrorCascadeWorkflow,
    createComplexWorkflow
} from "../fixtures/workflows";
export {
    createEmptyContext,
    createContextWithOutputs,
    createLoopState,
    createParallelState,
    deepCloneContext,
    contextsAreEqual
} from "../fixtures/contexts";
