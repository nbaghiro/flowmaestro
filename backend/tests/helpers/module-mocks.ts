/**
 * Shared Module Mocks
 *
 * Common mock implementations for Jest module mocking.
 * These are designed to be used with jest.mock() calls.
 *
 * Usage:
 *   import { mockDatabase, mockEncryptionService } from "../../../helpers/module-mocks";
 *
 *   jest.mock("../../../../src/storage/database", () => mockDatabase());
 *   jest.mock("../../../../src/services/EncryptionService", () => mockEncryptionService());
 */

// ============================================================================
// DATABASE MODULE MOCK
// ============================================================================

/**
 * Mock for the database module (src/storage/database)
 * Prevents actual database connections during tests
 */
export function mockDatabase() {
    return {
        Database: {
            getInstance: jest.fn().mockReturnValue({
                pool: {
                    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                    connect: jest.fn().mockResolvedValue({
                        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                        release: jest.fn()
                    }),
                    end: jest.fn().mockResolvedValue(undefined)
                }
            })
        },
        db: {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
            connect: jest.fn().mockResolvedValue({
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                release: jest.fn()
            }),
            end: jest.fn().mockResolvedValue(undefined)
        }
    };
}

// ============================================================================
// ENCRYPTION SERVICE MOCK
// ============================================================================

/**
 * Mock for the EncryptionService (src/services/EncryptionService)
 * Prevents ENCRYPTION_KEY environment variable requirement during tests
 */
export function mockEncryptionService() {
    const mockInstance = {
        encrypt: jest.fn().mockImplementation((value: string) => `encrypted:${value}`),
        decrypt: jest.fn().mockImplementation((value: string) => value.replace("encrypted:", ""))
    };

    return {
        EncryptionService: jest.fn().mockImplementation(() => mockInstance),
        getEncryptionService: jest.fn().mockReturnValue(mockInstance)
    };
}

// ============================================================================
// CONNECTION REPOSITORY MOCK
// ============================================================================

/**
 * Mock for ConnectionRepository (src/storage/repositories/ConnectionRepository)
 * Prevents database access when testing handlers that use connections
 */
export function mockConnectionRepository() {
    return {
        ConnectionRepository: jest.fn().mockImplementation(() => ({
            findById: jest.fn().mockResolvedValue(null),
            findByIdWithData: jest.fn().mockResolvedValue(null),
            findByUserId: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: "mock-connection-id" }),
            update: jest.fn().mockResolvedValue({ id: "mock-connection-id" }),
            delete: jest.fn().mockResolvedValue(true)
        }))
    };
}

// ============================================================================
// CONFIG MOCK FACTORIES
// ============================================================================

/**
 * Mock for AI config with all providers
 * @param overrides - Partial config to override defaults
 */
export function mockAIConfig(overrides: Record<string, { apiKey?: string }> = {}) {
    const defaults = {
        openai: { apiKey: "test-openai-key" },
        anthropic: { apiKey: "test-anthropic-key" },
        google: { apiKey: "test-google-key" },
        cohere: { apiKey: "test-cohere-key" },
        replicate: { apiKey: "test-replicate-key" },
        runway: { apiKey: "test-runway-key" },
        luma: { apiKey: "test-luma-key" },
        stabilityai: { apiKey: "test-stability-key" },
        elevenlabs: { apiKey: "test-elevenlabs-key" },
        deepgram: { apiKey: "test-deepgram-key" }
    };

    return {
        config: {
            ai: { ...defaults, ...overrides }
        }
    };
}

/**
 * Full config mock with common settings
 */
export function mockConfig(overrides: Record<string, unknown> = {}) {
    return {
        config: {
            ai: mockAIConfig().config.ai,
            database: {
                host: "localhost",
                port: 5432,
                database: "test",
                user: "test",
                password: "test"
            },
            encryption: {
                key: "0".repeat(64) // Valid 64-char hex key
            },
            ...overrides
        }
    };
}

// ============================================================================
// REPOSITORY MOCK FACTORIES
// ============================================================================

/**
 * Generic repository mock factory
 * @param entityName - Name for logging/identification
 * @param defaultEntity - Default entity to return from findById
 */
export function mockRepository<T extends { id: string }>(
    entityName: string,
    defaultEntity: T | null = null
) {
    return {
        [`${entityName}Repository`]: jest.fn().mockImplementation(() => ({
            findById: jest.fn().mockResolvedValue(defaultEntity),
            findByUserId: jest.fn().mockResolvedValue(defaultEntity ? [defaultEntity] : []),
            create: jest
                .fn()
                .mockImplementation((data: Partial<T>) =>
                    Promise.resolve({ id: `mock-${entityName.toLowerCase()}-id`, ...data })
                ),
            update: jest
                .fn()
                .mockImplementation((id: string, data: Partial<T>) =>
                    Promise.resolve({ id, ...data })
                ),
            delete: jest.fn().mockResolvedValue(true),
            softDelete: jest.fn().mockResolvedValue(true)
        }))
    };
}

// ============================================================================
// FETCH MOCK HELPERS
// ============================================================================

/**
 * Create a mock Response object for fetch mocking
 */
export function createMockResponse(
    body: unknown,
    options: { status?: number; headers?: Record<string, string> } = {}
): Response {
    const { status = 200, headers = {} } = options;
    const bodyString = typeof body === "string" ? body : JSON.stringify(body);

    return new Response(bodyString, {
        status,
        statusText: status >= 200 && status < 300 ? "OK" : "Error",
        headers: new Headers({
            "Content-Type": "application/json",
            ...headers
        })
    });
}

/**
 * Create a mock fetch function that matches URL patterns
 * @param responses - Map of URL patterns to response configs
 */
export function createMockFetch(
    responses: Map<
        string,
        Array<{ body: unknown; status?: number; headers?: Record<string, string> }>
    >
) {
    const callCounts = new Map<string, number>();

    return jest.fn(async (url: string | URL | Request): Promise<Response> => {
        const urlString = url.toString();

        for (const [pattern, responseList] of responses.entries()) {
            if (urlString.includes(pattern)) {
                const count = callCounts.get(pattern) || 0;
                callCounts.set(pattern, count + 1);

                const responseIndex = Math.min(count, responseList.length - 1);
                const response = responseList[responseIndex];

                return createMockResponse(response.body, {
                    status: response.status,
                    headers: response.headers
                });
            }
        }

        throw new Error(`No mock for URL: ${urlString}`);
    });
}

// ============================================================================
// FS PROMISES MOCK
// ============================================================================

/**
 * Mock for fs/promises module
 */
export function mockFsPromises() {
    return {
        open: jest.fn().mockResolvedValue({
            close: jest.fn().mockResolvedValue(undefined)
        }),
        readFile: jest.fn().mockResolvedValue(Buffer.from("mock-file-data")),
        writeFile: jest.fn().mockResolvedValue(undefined),
        unlink: jest.fn().mockResolvedValue(undefined),
        mkdir: jest.fn().mockResolvedValue(undefined),
        rmdir: jest.fn().mockResolvedValue(undefined),
        stat: jest.fn().mockResolvedValue({
            isFile: () => true,
            isDirectory: () => false,
            size: 1024
        }),
        access: jest.fn().mockResolvedValue(undefined)
    };
}
