/**
 * Scope Checker Middleware Tests
 *
 * Tests for API key scope validation middleware (scope-checker.ts)
 */

import {
    createMockRequest,
    createMockReply,
    assertErrorResponse,
    assertNoResponse
} from "../../../../__tests__/helpers/middleware-test-utils";
import { createApiKeyScopes } from "../../../../__tests__/helpers/service-mocks";
import {
    requireScopes,
    requireAnyScope,
    hasScope,
    hasAllScopes,
    hasAnyOfScopes
} from "../scope-checker";
import type { ApiKeyScope } from "../../../storage/models/ApiKey";

// Type for scope error response body in tests
interface ScopeErrorResponseBody {
    success: false;
    error: {
        code: string;
        message: string;
        details: {
            required_scopes?: string[];
            missing_scopes: string[];
            present_scopes: string[];
        };
    };
    meta?: {
        request_id: string;
        timestamp: string;
    };
}

describe("requireScopes", () => {
    describe("Single scope requirement", () => {
        it("should pass when required scope is present", async () => {
            const middleware = requireScopes("workflows:read");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read", "workflows:execute"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        });

        it("should fail when required scope is missing", async () => {
            const middleware = requireScopes("workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.message).toContain("workflows:execute");
            expect(body.error.details.missing_scopes).toContain("workflows:execute");
        });
    });

    describe("Multiple scope requirements", () => {
        it("should pass when all required scopes are present", async () => {
            const middleware = requireScopes("workflows:read", "workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes([
                    "workflows:read",
                    "workflows:execute",
                    "agents:read"
                ])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        });

        it("should fail when some required scopes are missing", async () => {
            const middleware = requireScopes(
                "workflows:read",
                "workflows:execute",
                "agents:execute"
            );
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read", "agents:read"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.details.missing_scopes).toContain("workflows:execute");
            expect(body.error.details.missing_scopes).toContain("agents:execute");
            expect(body.error.details.missing_scopes).not.toContain("workflows:read");
        });

        it("should fail when all required scopes are missing", async () => {
            const middleware = requireScopes("agents:read", "agents:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.details.missing_scopes).toHaveLength(2);
        });
    });

    describe("No authentication", () => {
        it("should fail when apiKeyScopes is undefined", async () => {
            const middleware = requireScopes("workflows:read");
            const request = createMockRequest({
                apiKeyScopes: undefined
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.message).toContain("No authorization scopes available");
        });
    });

    describe("Error response format", () => {
        it("should include required_scopes, missing_scopes, and your_scopes in details", async () => {
            const middleware = requireScopes("workflows:read", "workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read", "agents:read"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.details).toEqual({
                required_scopes: ["workflows:read", "workflows:execute"],
                missing_scopes: ["workflows:execute"],
                your_scopes: expect.arrayContaining(["workflows:read", "agents:read"])
            });
        });

        it("should include request_id and timestamp in meta", async () => {
            const middleware = requireScopes("workflows:read");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes([])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.meta).toBeDefined();
            expect(body.meta!.request_id).toBeDefined();
            expect(typeof body.meta!.request_id).toBe("string");
            expect(body.meta!.timestamp).toBeDefined();
            // Timestamp should be valid ISO date
            expect(new Date(body.meta!.timestamp).toISOString()).toBe(body.meta!.timestamp);
        });
    });
});

describe("requireAnyScope", () => {
    describe("Multiple scope options", () => {
        it("should pass when first scope is present", async () => {
            const middleware = requireAnyScope("workflows:read", "workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        });

        it("should pass when second scope is present", async () => {
            const middleware = requireAnyScope("workflows:read", "workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:execute"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        });

        it("should pass when all scopes are present", async () => {
            const middleware = requireAnyScope("workflows:read", "workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read", "workflows:execute"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        });

        it("should fail when none of the scopes are present", async () => {
            const middleware = requireAnyScope("workflows:read", "workflows:execute");
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["agents:read", "agents:execute"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.message).toContain("workflows:read");
            expect(body.error.message).toContain("workflows:execute");
        });
    });

    describe("No authentication", () => {
        it("should fail when apiKeyScopes is undefined", async () => {
            const middleware = requireAnyScope("workflows:read");
            const request = createMockRequest({
                apiKeyScopes: undefined
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.message).toContain("No authorization scopes available");
        });
    });

    describe("Error response format", () => {
        it("should include required_any_of and your_scopes in details", async () => {
            const middleware = requireAnyScope(
                "workflows:read",
                "workflows:execute",
                "agents:read"
            );
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["threads:read"])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            const body = reply._tracking.sentBody as ScopeErrorResponseBody;
            expect(body.error.details).toEqual({
                required_any_of: ["workflows:read", "workflows:execute", "agents:read"],
                your_scopes: ["threads:read"]
            });
        });
    });
});

describe("Helper functions", () => {
    describe("hasScope", () => {
        it("should return true when scope is present", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read", "agents:read"])
            });

            expect(hasScope(request, "workflows:read")).toBe(true);
            expect(hasScope(request, "agents:read")).toBe(true);
        });

        it("should return false when scope is not present", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });

            expect(hasScope(request, "workflows:execute")).toBe(false);
            expect(hasScope(request, "agents:read")).toBe(false);
        });

        it("should return false when apiKeyScopes is undefined", () => {
            const request = createMockRequest({
                apiKeyScopes: undefined
            });

            expect(hasScope(request, "workflows:read")).toBe(false);
        });
    });

    describe("hasAllScopes", () => {
        it("should return true when all scopes are present", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes([
                    "workflows:read",
                    "workflows:execute",
                    "agents:read"
                ])
            });

            expect(hasAllScopes(request, ["workflows:read", "workflows:execute"])).toBe(true);
        });

        it("should return false when some scopes are missing", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });

            expect(hasAllScopes(request, ["workflows:read", "workflows:execute"])).toBe(false);
        });

        it("should return false when apiKeyScopes is undefined", () => {
            const request = createMockRequest({
                apiKeyScopes: undefined
            });

            expect(hasAllScopes(request, ["workflows:read"])).toBe(false);
        });

        it("should return true for empty scope array", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });

            expect(hasAllScopes(request, [])).toBe(true);
        });
    });

    describe("hasAnyOfScopes", () => {
        it("should return true when at least one scope is present", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });

            expect(hasAnyOfScopes(request, ["workflows:read", "workflows:execute"])).toBe(true);
        });

        it("should return false when no scopes match", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["agents:read"])
            });

            expect(hasAnyOfScopes(request, ["workflows:read", "workflows:execute"])).toBe(false);
        });

        it("should return false when apiKeyScopes is undefined", () => {
            const request = createMockRequest({
                apiKeyScopes: undefined
            });

            expect(hasAnyOfScopes(request, ["workflows:read", "workflows:execute"])).toBe(false);
        });

        it("should return false for empty scope array", () => {
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(["workflows:read"])
            });

            expect(hasAnyOfScopes(request, [])).toBe(false);
        });
    });
});

describe("All API key scopes", () => {
    const allScopes: ApiKeyScope[] = [
        "workflows:read",
        "workflows:execute",
        "executions:read",
        "executions:cancel",
        "agents:read",
        "agents:execute",
        "threads:read",
        "threads:write",
        "triggers:read",
        "triggers:execute",
        "knowledge-bases:read",
        "knowledge-bases:query",
        "webhooks:read",
        "webhooks:write"
    ];

    it("should correctly validate each scope type", async () => {
        for (const scope of allScopes) {
            const middleware = requireScopes(scope);
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes([scope])
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        }
    });

    it("should fail when checking for scope not in the set", async () => {
        for (const scope of allScopes) {
            const middleware = requireScopes(scope);
            // Create set without the target scope
            const otherScopes = allScopes.filter((s) => s !== scope);
            const request = createMockRequest({
                apiKeyScopes: createApiKeyScopes(otherScopes)
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertErrorResponse(reply, 403, "insufficient_scope");
        }
    });
});
