/**
 * Global test setup for AI SDK
 */

import { vi, beforeAll, afterAll, afterEach } from "vitest";

// Store original environment
const originalEnv = { ...process.env };

// Mock WebSocket globally
vi.mock("ws", () => {
    const MockWebSocket = vi.fn() as ReturnType<typeof vi.fn> & {
        OPEN: number;
        CLOSED: number;
    };
    MockWebSocket.OPEN = 1;
    MockWebSocket.CLOSED = 3;
    return { default: MockWebSocket };
});

// Clear environment before each test
beforeAll(() => {
    // Clear all API keys from environment
    const apiKeyPatterns = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_API_KEY",
        "COHERE_API_KEY",
        "HUGGINGFACE_API_KEY",
        "REPLICATE_API_KEY",
        "STABILITY_API_KEY",
        "FAL_API_KEY",
        "RUNWAY_API_KEY",
        "LUMA_API_KEY",
        "ELEVENLABS_API_KEY",
        "XAI_API_KEY"
    ];

    for (const key of apiKeyPatterns) {
        delete process.env[key];
    }
});

// Reset mocks after each test
afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

// Restore environment after all tests
afterAll(() => {
    process.env = originalEnv;
});

// Export test utilities
export { vi };
