/**
 * BaseAPIClient Unit Tests
 *
 * Tests for HTTP client functionality including retry logic,
 * error handling, and backoff strategies.
 */

import { BaseAPIClient, BaseAPIClientConfig } from "../BaseAPIClient";

// Create a concrete implementation for testing
class TestAPIClient extends BaseAPIClient {
    constructor(config: BaseAPIClientConfig) {
        super(config);
    }

    // Expose protected methods for testing
    public testShouldRetry(error: unknown, attempt: number): boolean {
        return this.shouldRetry(error, attempt);
    }

    public testGetRetryDelay(attempt: number): number {
        return this.getRetryDelay(attempt);
    }

    public testCreateErrorResult(
        type: "validation" | "permission" | "not_found" | "rate_limit" | "server_error",
        message: string,
        retryable = false,
        code?: string,
        details?: Record<string, unknown>
    ) {
        return this.createErrorResult(type, message, retryable, code, details);
    }

    public async testExecuteWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
        return this.executeWithRetry(fn, attempt);
    }
}

// Mock the FetchClient
jest.mock("../../../core/utils/fetch-client", () => {
    const mockRequest = jest.fn();
    const mockGet = jest.fn();
    const mockPost = jest.fn();
    const mockPut = jest.fn();
    const mockPatch = jest.fn();
    const mockDelete = jest.fn();

    return {
        FetchClient: jest.fn().mockImplementation(() => ({
            request: mockRequest,
            get: mockGet,
            post: mockPost,
            put: mockPut,
            patch: mockPatch,
            delete: mockDelete,
            addResponseInterceptor: jest.fn()
        })),
        isFetchError: jest.fn((error: unknown) => {
            return error && typeof error === "object" && "response" in error;
        }),
        __mocks: {
            mockRequest,
            mockGet,
            mockPost,
            mockPut,
            mockPatch,
            mockDelete
        }
    };
});

// Import after mock - required by Jest's module mocking pattern
// eslint-disable-next-line import/order
import { FetchClient, isFetchError } from "../../../core/utils/fetch-client";

describe("BaseAPIClient", () => {
    let client: TestAPIClient;

    beforeEach(() => {
        jest.clearAllMocks();
        client = new TestAPIClient({
            baseURL: "https://api.example.com",
            timeout: 30000
        });
    });

    describe("constructor", () => {
        it("creates client with default retry config", () => {
            new TestAPIClient({
                baseURL: "https://api.example.com"
            });

            expect(FetchClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: "https://api.example.com",
                    timeout: 30000,
                    retryConfig: expect.objectContaining({
                        maxRetries: 3,
                        retryableStatuses: [429, 500, 502, 503, 504],
                        backoffStrategy: "exponential"
                    })
                })
            );
        });

        it("uses custom retry config when provided", () => {
            new TestAPIClient({
                baseURL: "https://api.example.com",
                retryConfig: {
                    maxRetries: 5,
                    retryableStatuses: [500],
                    backoffStrategy: "linear",
                    initialDelay: 500,
                    maxDelay: 5000
                }
            });

            expect(FetchClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    retryConfig: expect.objectContaining({
                        maxRetries: 5,
                        backoffStrategy: "linear"
                    })
                })
            );
        });

        it("configures connection pooling", () => {
            new TestAPIClient({
                baseURL: "https://api.example.com",
                connectionPool: {
                    maxSockets: 100,
                    maxFreeSockets: 20,
                    keepAlive: true,
                    keepAliveMsecs: 120000
                }
            });

            expect(FetchClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    connectionPool: expect.objectContaining({
                        maxSockets: 100,
                        maxFreeSockets: 20
                    })
                })
            );
        });
    });

    describe("shouldRetry", () => {
        it("returns false when max retries exceeded", () => {
            const error = { response: { status: 500 } };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            expect(client.testShouldRetry(error, 3)).toBe(false);
        });

        it("returns true for retryable status codes", () => {
            const error = { response: { status: 429 } };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            expect(client.testShouldRetry(error, 0)).toBe(true);
            expect(client.testShouldRetry(error, 1)).toBe(true);
            expect(client.testShouldRetry(error, 2)).toBe(true);
        });

        it("returns false for non-retryable status codes", () => {
            const error = { response: { status: 400 } };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            expect(client.testShouldRetry(error, 0)).toBe(false);
        });

        it("returns true for retryable network errors", () => {
            const error = { code: "ECONNRESET" };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            expect(client.testShouldRetry(error, 0)).toBe(true);
        });

        it("returns false for non-fetch errors", () => {
            const error = new Error("Random error");
            (isFetchError as unknown as jest.Mock).mockReturnValue(false);

            expect(client.testShouldRetry(error, 0)).toBe(false);
        });
    });

    describe("getRetryDelay", () => {
        it("uses exponential backoff by default", () => {
            const delay0 = client.testGetRetryDelay(0);
            const delay1 = client.testGetRetryDelay(1);
            const delay2 = client.testGetRetryDelay(2);

            expect(delay0).toBe(1000); // 1000 * 2^0
            expect(delay1).toBe(2000); // 1000 * 2^1
            expect(delay2).toBe(4000); // 1000 * 2^2
        });

        it("respects maxDelay", () => {
            const delay10 = client.testGetRetryDelay(10);

            // 1000 * 2^10 = 1024000, but maxDelay is 10000
            expect(delay10).toBe(10000);
        });

        it("uses linear backoff when configured", () => {
            const linearClient = new TestAPIClient({
                baseURL: "https://api.example.com",
                retryConfig: {
                    maxRetries: 3,
                    retryableStatuses: [500],
                    backoffStrategy: "linear",
                    initialDelay: 1000,
                    maxDelay: 10000
                }
            });

            const delay0 = linearClient.testGetRetryDelay(0);
            const delay1 = linearClient.testGetRetryDelay(1);
            const delay2 = linearClient.testGetRetryDelay(2);

            expect(delay0).toBe(1000); // 1000 * 1
            expect(delay1).toBe(2000); // 1000 * 2
            expect(delay2).toBe(3000); // 1000 * 3
        });

        it("uses constant backoff when configured", () => {
            const constantClient = new TestAPIClient({
                baseURL: "https://api.example.com",
                retryConfig: {
                    maxRetries: 3,
                    retryableStatuses: [500],
                    backoffStrategy: "constant",
                    initialDelay: 1500,
                    maxDelay: 10000
                }
            });

            const delay0 = constantClient.testGetRetryDelay(0);
            const delay1 = constantClient.testGetRetryDelay(1);
            const delay2 = constantClient.testGetRetryDelay(2);

            expect(delay0).toBe(1500);
            expect(delay1).toBe(1500);
            expect(delay2).toBe(1500);
        });
    });

    describe("createErrorResult", () => {
        it("creates validation error result", () => {
            const result = client.testCreateErrorResult(
                "validation",
                "Invalid input",
                false,
                "INVALID_INPUT",
                { field: "email" }
            );

            expect(result).toEqual({
                success: false,
                error: {
                    type: "validation",
                    message: "Invalid input",
                    code: "INVALID_INPUT",
                    retryable: false,
                    details: { field: "email" }
                }
            });
        });

        it("creates rate_limit error result", () => {
            const result = client.testCreateErrorResult(
                "rate_limit",
                "Too many requests",
                true,
                "429"
            );

            expect(result).toEqual({
                success: false,
                error: {
                    type: "rate_limit",
                    message: "Too many requests",
                    code: "429",
                    retryable: true,
                    details: undefined
                }
            });
        });

        it("creates server_error result", () => {
            const result = client.testCreateErrorResult(
                "server_error",
                "Internal server error",
                true
            );

            expect(result).toEqual({
                success: false,
                error: {
                    type: "server_error",
                    message: "Internal server error",
                    code: undefined,
                    retryable: true,
                    details: undefined
                }
            });
        });

        it("creates not_found error result", () => {
            const result = client.testCreateErrorResult(
                "not_found",
                "Resource not found",
                false,
                "404",
                { resource: "user", id: "123" }
            );

            expect(result).toEqual({
                success: false,
                error: {
                    type: "not_found",
                    message: "Resource not found",
                    code: "404",
                    retryable: false,
                    details: { resource: "user", id: "123" }
                }
            });
        });

        it("creates permission error result", () => {
            const result = client.testCreateErrorResult(
                "permission",
                "Access denied",
                false,
                "403"
            );

            expect(result).toEqual({
                success: false,
                error: {
                    type: "permission",
                    message: "Access denied",
                    code: "403",
                    retryable: false,
                    details: undefined
                }
            });
        });
    });

    describe("executeWithRetry", () => {
        it("returns result on first successful attempt", async () => {
            const fn = jest.fn().mockResolvedValue("success");

            const result = await client.testExecuteWithRetry(fn);

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("retries on retryable error", async () => {
            const error = { response: { status: 500 } };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            const fn = jest
                .fn()
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce("success");

            // Mock sleep to not actually wait
            jest.spyOn(
                client as unknown as { sleep: () => Promise<void> },
                "sleep"
            ).mockImplementation(() => Promise.resolve());

            const result = await client.testExecuteWithRetry(fn);

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it("throws after max retries exceeded", async () => {
            const error = { response: { status: 500 } };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            const fn = jest.fn().mockRejectedValue(error);

            // Mock sleep to not actually wait
            jest.spyOn(
                client as unknown as { sleep: () => Promise<void> },
                "sleep"
            ).mockImplementation(() => Promise.resolve());

            await expect(client.testExecuteWithRetry(fn)).rejects.toEqual(error);
            expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
        });

        it("throws immediately on non-retryable error", async () => {
            const error = { response: { status: 400 } };
            (isFetchError as unknown as jest.Mock).mockReturnValue(true);

            const fn = jest.fn().mockRejectedValue(error);

            await expect(client.testExecuteWithRetry(fn)).rejects.toEqual(error);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe("HTTP methods", () => {
        // Get the mock from the module
        const getMocks = () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fetchClientModule = require("../../../core/utils/fetch-client");
            return fetchClientModule.__mocks;
        };

        it("get method calls request with GET", async () => {
            const mocks = getMocks();
            mocks.mockRequest.mockResolvedValue({ data: "test" });

            // Create fresh client to get clean mocks
            const testClient = new TestAPIClient({
                baseURL: "https://api.example.com"
            });

            await testClient.get("/users", { page: 1 });

            expect(mocks.mockRequest).toHaveBeenCalledWith({
                method: "GET",
                url: "/users",
                params: { page: 1 }
            });
        });

        it("post method calls request with POST", async () => {
            const mocks = getMocks();
            mocks.mockRequest.mockResolvedValue({ id: 1 });

            const testClient = new TestAPIClient({
                baseURL: "https://api.example.com"
            });

            await testClient.post("/users", { name: "John" });

            expect(mocks.mockRequest).toHaveBeenCalledWith({
                method: "POST",
                url: "/users",
                data: { name: "John" }
            });
        });

        it("put method calls request with PUT", async () => {
            const mocks = getMocks();
            mocks.mockRequest.mockResolvedValue({ updated: true });

            const testClient = new TestAPIClient({
                baseURL: "https://api.example.com"
            });

            await testClient.put("/users/1", { name: "Jane" });

            expect(mocks.mockRequest).toHaveBeenCalledWith({
                method: "PUT",
                url: "/users/1",
                data: { name: "Jane" }
            });
        });

        it("patch method calls request with PATCH", async () => {
            const mocks = getMocks();
            mocks.mockRequest.mockResolvedValue({ patched: true });

            const testClient = new TestAPIClient({
                baseURL: "https://api.example.com"
            });

            await testClient.patch("/users/1", { email: "new@example.com" });

            expect(mocks.mockRequest).toHaveBeenCalledWith({
                method: "PATCH",
                url: "/users/1",
                data: { email: "new@example.com" }
            });
        });

        it("delete method calls request with DELETE", async () => {
            const mocks = getMocks();
            mocks.mockRequest.mockResolvedValue({ deleted: true });

            const testClient = new TestAPIClient({
                baseURL: "https://api.example.com"
            });

            await testClient.delete("/users/1");

            expect(mocks.mockRequest).toHaveBeenCalledWith({
                method: "DELETE",
                url: "/users/1"
            });
        });
    });
});
