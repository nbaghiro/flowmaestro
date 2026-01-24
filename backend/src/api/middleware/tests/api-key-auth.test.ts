/**
 * API Key Auth Middleware Tests
 *
 * Tests for API key authentication middleware (api-key-auth.ts)
 */

import {
    createMockRequest,
    createMockReply,
    createMockApiKey,
    assertErrorResponse,
    assertNoResponse
} from "../../../../tests/helpers/middleware-test-utils";
import {
    createMockApiKeyRepository,
    createTestApiKeyString
} from "../../../../tests/helpers/service-mocks";

// Mock the ApiKeyRepository
jest.mock("../../../storage/repositories/ApiKeyRepository");

import { ApiKeyRepository } from "../../../storage/repositories/ApiKeyRepository";
import { apiKeyAuthMiddleware, optionalApiKeyAuthMiddleware } from "../api-key-auth";

const MockedApiKeyRepository = ApiKeyRepository as jest.MockedClass<typeof ApiKeyRepository>;

// Type for error response body in tests
interface ErrorResponseBody {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        request_id: string;
        timestamp: string;
    };
}

describe("apiKeyAuthMiddleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("API key extraction", () => {
        it("should extract API key from X-API-Key header", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey();
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertNoResponse(reply);
            expect(request.apiKey).toEqual(mockApiKey);
            expect(request.apiKeyScopes).toBeDefined();
            expect(request.apiKeyUserId).toBe(mockApiKey.user_id);
            expect(request.apiKeyWorkspaceId).toBe(mockApiKey.workspace_id);
        });

        it("should extract API key from Authorization Bearer header", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey();
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { authorization: `Bearer ${validApiKey}` }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertNoResponse(reply);
            expect(request.apiKey).toEqual(mockApiKey);
        });

        it("should prefer X-API-Key header over Authorization header", async () => {
            const primaryKey = createTestApiKeyString();
            const fallbackKey = "fm_live_" + "b".repeat(56);

            const mockApiKey = createMockApiKey({ id: "primary-key" });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: {
                    "x-api-key": primaryKey,
                    authorization: `Bearer ${fallbackKey}`
                }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            // Verify it used the X-API-Key header (would hash the primary key)
            expect(mockRepo.findByHash).toHaveBeenCalled();
            expect(request.apiKey?.id).toBe("primary-key");
        });

        it("should handle array header values (take first)", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey();
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": [validApiKey, "another-key"] as unknown as string }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertNoResponse(reply);
            expect(request.apiKey).toBeDefined();
        });

        it("should ignore Bearer token that does not start with fm_live_", async () => {
            const request = createMockRequest({
                headers: { authorization: "Bearer some-jwt-token-not-api-key" }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "invalid_api_key");
        });
    });

    describe("Error cases - missing or invalid API key", () => {
        it("should return 401 when no API key is provided", async () => {
            const request = createMockRequest({ headers: {} });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "invalid_api_key");
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error.message).toContain("Missing API key");
        });

        it("should return 401 when API key has invalid format", async () => {
            const request = createMockRequest({
                headers: { "x-api-key": "invalid_key_format" }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "invalid_api_key");
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error.message).toContain("Invalid API key format");
        });

        it("should return 401 when API key is not found in database", async () => {
            const validApiKey = createTestApiKeyString();
            const mockRepo = createMockApiKeyRepository({ findByHash: null });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "invalid_api_key");
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error.message).toContain("API key not found");
        });
    });

    describe("Error cases - revoked, expired, inactive API key", () => {
        it("should return 401 when API key is revoked", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey({ revoked_at: new Date() });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "revoked_api_key");
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error.message).toContain("revoked");
        });

        it("should return 401 when API key is expired", async () => {
            const validApiKey = createTestApiKeyString();
            const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 24 hours ago
            const mockApiKey = createMockApiKey({ expires_at: pastDate });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "expired_api_key");
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error.message).toContain("expired");
        });

        it("should return 401 when API key is inactive", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey({ is_active: false });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertErrorResponse(reply, 401, "invalid_api_key");
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error.message).toContain("inactive");
        });
    });

    describe("Valid API key with scopes", () => {
        it("should set apiKeyScopes as a Set", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey({
                scopes: ["workflows:read", "workflows:execute", "agents:read"]
            });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            expect(request.apiKeyScopes).toBeInstanceOf(Set);
            expect(request.apiKeyScopes?.has("workflows:read")).toBe(true);
            expect(request.apiKeyScopes?.has("workflows:execute")).toBe(true);
            expect(request.apiKeyScopes?.has("agents:read")).toBe(true);
            expect(request.apiKeyScopes?.has("agents:execute")).toBe(false);
        });

        it("should accept API key with null expires_at (never expires)", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey({ expires_at: null });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertNoResponse(reply);
            expect(request.apiKey).toBeDefined();
        });

        it("should accept API key with future expires_at", async () => {
            const validApiKey = createTestApiKeyString();
            const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year
            const mockApiKey = createMockApiKey({ expires_at: futureDate });
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            assertNoResponse(reply);
            expect(request.apiKey).toBeDefined();
        });
    });

    describe("Last used tracking", () => {
        it("should update last_used asynchronously on successful auth", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey();
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey },
                ip: "192.168.1.100"
            });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            // Wait for async update
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockRepo.updateLastUsed).toHaveBeenCalledWith(mockApiKey.id, "192.168.1.100");
        });

        it("should not fail if updateLastUsed throws", async () => {
            const validApiKey = createTestApiKeyString();
            const mockApiKey = createMockApiKey();
            const mockRepo = createMockApiKeyRepository({ findByHash: mockApiKey });
            mockRepo.updateLastUsed = jest.fn().mockRejectedValue(new Error("DB error"));
            MockedApiKeyRepository.mockImplementation(
                () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
            );

            const request = createMockRequest({
                headers: { "x-api-key": validApiKey }
            });
            const reply = createMockReply();

            // Should not throw
            await apiKeyAuthMiddleware(request, reply);

            assertNoResponse(reply);
            expect(request.apiKey).toBeDefined();
        });
    });

    describe("Meta information in error responses", () => {
        it("should include request_id and timestamp in error responses", async () => {
            const request = createMockRequest({ headers: {} });
            const reply = createMockReply();

            await apiKeyAuthMiddleware(request, reply);

            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.meta).toBeDefined();
            expect(body.meta!.request_id).toBeDefined();
            expect(body.meta!.timestamp).toBeDefined();
            // Timestamp should be ISO format
            expect(new Date(body.meta!.timestamp).toISOString()).toBe(body.meta!.timestamp);
        });
    });
});

describe("optionalApiKeyAuthMiddleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should set API key when valid key is provided", async () => {
        const validApiKey = createTestApiKeyString();
        const mockApiKey = createMockApiKey();
        const mockRepo = createMockApiKeyRepository({
            findByHash: mockApiKey,
            isValid: true
        });
        MockedApiKeyRepository.mockImplementation(
            () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
        );

        const request = createMockRequest({
            headers: { "x-api-key": validApiKey }
        });
        const reply = createMockReply();

        await optionalApiKeyAuthMiddleware(request, reply);

        expect(request.apiKey).toEqual(mockApiKey);
        expect(request.apiKeyScopes).toBeDefined();
    });

    it("should not set API key when no key is provided", async () => {
        const request = createMockRequest({ headers: {} });
        const reply = createMockReply();

        await optionalApiKeyAuthMiddleware(request, reply);

        assertNoResponse(reply);
        expect(request.apiKey).toBeUndefined();
        expect(request.apiKeyScopes).toBeUndefined();
    });

    it("should not set API key when key format is invalid", async () => {
        const request = createMockRequest({
            headers: { "x-api-key": "invalid_format" }
        });
        const reply = createMockReply();

        await optionalApiKeyAuthMiddleware(request, reply);

        assertNoResponse(reply);
        expect(request.apiKey).toBeUndefined();
    });

    it("should not set API key when key is not found", async () => {
        const validApiKey = createTestApiKeyString();
        const mockRepo = createMockApiKeyRepository({ findByHash: null });
        MockedApiKeyRepository.mockImplementation(
            () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
        );

        const request = createMockRequest({
            headers: { "x-api-key": validApiKey }
        });
        const reply = createMockReply();

        await optionalApiKeyAuthMiddleware(request, reply);

        assertNoResponse(reply);
        expect(request.apiKey).toBeUndefined();
    });

    it("should not set API key when key is invalid (isValid returns false)", async () => {
        const validApiKey = createTestApiKeyString();
        const mockApiKey = createMockApiKey({ is_active: false });
        const mockRepo = createMockApiKeyRepository({
            findByHash: mockApiKey,
            isValid: false
        });
        MockedApiKeyRepository.mockImplementation(
            () => mockRepo as unknown as InstanceType<typeof ApiKeyRepository>
        );

        const request = createMockRequest({
            headers: { "x-api-key": validApiKey }
        });
        const reply = createMockReply();

        await optionalApiKeyAuthMiddleware(request, reply);

        assertNoResponse(reply);
        expect(request.apiKey).toBeUndefined();
    });
});
