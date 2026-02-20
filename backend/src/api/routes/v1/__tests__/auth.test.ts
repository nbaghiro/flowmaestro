/**
 * v1 API Key Authentication Tests
 *
 * Tests for API key validation, scopes, expiration, and revocation.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    createTestApiKey,
    mockApiKeyRepo,
    parseResponse,
    mockWorkflowRepo
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

describe("v1 API Key Authentication", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockApiKey();
    });

    it("should reject requests without API key", async () => {
        const response = await fastify.inject({
            method: "GET",
            url: "/api/v1/workflows"
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.payload);
        expect(body.error.code).toBe("invalid_api_key");
    });

    it("should reject requests with invalid API key format", async () => {
        const response = await fastify.inject({
            method: "GET",
            url: "/api/v1/workflows",
            headers: { "X-API-Key": "invalid-key" }
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.payload);
        expect(body.error.code).toBe("invalid_api_key");
    });

    it("should reject requests with revoked API key", async () => {
        const revokedKey = createTestApiKey({ revoked_at: new Date() });
        mockApiKeyRepo.findByHash.mockResolvedValue(revokedKey);

        const response = await apiKeyRequest(fastify, {
            method: "GET",
            url: "/api/v1/workflows"
        });

        expect(response.statusCode).toBe(401);
        const body = parseResponse(response);
        expect(body.error.code).toBe("revoked_api_key");
    });

    it("should reject requests with expired API key", async () => {
        const expiredKey = createTestApiKey({
            expires_at: new Date(Date.now() - 86400000)
        });
        mockApiKeyRepo.findByHash.mockResolvedValue(expiredKey);

        const response = await apiKeyRequest(fastify, {
            method: "GET",
            url: "/api/v1/workflows"
        });

        expect(response.statusCode).toBe(401);
        const body = parseResponse(response);
        expect(body.error.code).toBe("expired_api_key");
    });

    it("should reject requests with inactive API key", async () => {
        const inactiveKey = createTestApiKey({ is_active: false });
        mockApiKeyRepo.findByHash.mockResolvedValue(inactiveKey);

        const response = await apiKeyRequest(fastify, {
            method: "GET",
            url: "/api/v1/workflows"
        });

        expect(response.statusCode).toBe(401);
    });

    it("should reject requests with insufficient scopes", async () => {
        const limitedKey = createTestApiKey({ scopes: [] });
        mockApiKeyRepo.findByHash.mockResolvedValue(limitedKey);

        mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
            workflows: [],
            total: 0
        });

        const response = await apiKeyRequest(fastify, {
            method: "GET",
            url: "/api/v1/workflows"
        });

        expect(response.statusCode).toBe(403);
        const body = parseResponse(response);
        expect(body.error.code).toBe("insufficient_scope");
    });

    it("should accept requests with valid API key via Bearer header", async () => {
        mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
            workflows: [],
            total: 0
        });

        const response = await fastify.inject({
            method: "GET",
            url: "/api/v1/workflows",
            headers: { Authorization: "Bearer fm_live_test_api_key" }
        });

        expect(response.statusCode).toBe(200);
    });
});
