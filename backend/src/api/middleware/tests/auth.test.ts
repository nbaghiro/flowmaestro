/**
 * Auth Middleware Tests
 *
 * Tests for JWT authentication middleware (auth.ts)
 */

import {
    createMockRequest,
    assertThrowsError
} from "../../../../tests/helpers/middleware-test-utils";
import { authMiddleware, optionalAuthMiddleware } from "../auth";

describe("authMiddleware", () => {
    describe("Bearer token authentication", () => {
        it("should authenticate with valid Bearer token in Authorization header", async () => {
            const request = createMockRequest({
                headers: { authorization: "Bearer valid-jwt-token" }
            });
            // Mock successful JWT verification
            request.jwtVerify = jest.fn().mockResolvedValue(undefined);
            // Simulate Fastify setting user after verification
            (request as unknown as { user: { id: string; email: string } }).user = {
                id: "user-123",
                email: "test@example.com"
            };

            await authMiddleware(request);

            expect(request.jwtVerify).toHaveBeenCalled();
            expect(request.user).toBeDefined();
            expect(request.user.id).toBe("user-123");
        });

        it("should fail when Authorization header is missing and no query token", async () => {
            const request = createMockRequest({
                headers: {},
                query: {}
            });

            await assertThrowsError(
                () => authMiddleware(request),
                "UnauthorizedError",
                /Authentication required/
            );
        });

        it("should fail when Authorization header is not Bearer format", async () => {
            const request = createMockRequest({
                headers: { authorization: "Basic dXNlcjpwYXNz" },
                query: {}
            });

            await assertThrowsError(
                () => authMiddleware(request),
                "UnauthorizedError",
                /Authentication required/
            );
        });

        it("should fail when JWT verification fails", async () => {
            const request = createMockRequest({
                headers: { authorization: "Bearer invalid-token" }
            });
            request.jwtVerify = jest.fn().mockRejectedValue(new Error("Invalid token"));

            await assertThrowsError(
                () => authMiddleware(request),
                "UnauthorizedError",
                /Authentication required/
            );
        });
    });

    describe("Query parameter token (SSE/EventSource fallback)", () => {
        it("should authenticate with valid token in query parameter", async () => {
            const request = createMockRequest({
                headers: {},
                query: { token: "valid-jwt-token" }
            });
            // Mock manual JWT verification
            request.server.jwt.verify = jest.fn().mockReturnValue({
                id: "user-456",
                email: "sse@example.com"
            });

            await authMiddleware(request);

            expect(request.server.jwt.verify).toHaveBeenCalledWith("valid-jwt-token");
            expect(request.user).toBeDefined();
            expect(request.user.id).toBe("user-456");
        });

        it("should handle array token in query parameter (takes first)", async () => {
            const request = createMockRequest({
                headers: {},
                query: { token: ["first-token", "second-token"] as unknown as string }
            });
            request.server.jwt.verify = jest.fn().mockReturnValue({
                id: "user-789",
                email: "array@example.com"
            });

            await authMiddleware(request);

            expect(request.server.jwt.verify).toHaveBeenCalledWith("first-token");
        });

        it("should prefer Bearer header over query token", async () => {
            const request = createMockRequest({
                headers: { authorization: "Bearer header-token" },
                query: { token: "query-token" }
            });
            request.jwtVerify = jest.fn().mockResolvedValue(undefined);
            (request as unknown as { user: { id: string; email: string } }).user = {
                id: "header-user",
                email: "header@example.com"
            };

            await authMiddleware(request);

            // Should have used jwtVerify (Bearer header path) not server.jwt.verify
            expect(request.jwtVerify).toHaveBeenCalled();
            expect(request.user.id).toBe("header-user");
        });

        it("should fail when query token verification fails", async () => {
            const request = createMockRequest({
                headers: {},
                query: { token: "invalid-token" }
            });
            request.server.jwt.verify = jest.fn().mockImplementation(() => {
                throw new Error("Invalid token");
            });

            await assertThrowsError(
                () => authMiddleware(request),
                "UnauthorizedError",
                /Authentication required/
            );
        });
    });

    describe("Edge cases", () => {
        it("should fail if jwtVerify succeeds but user is not set", async () => {
            const request = createMockRequest({
                headers: { authorization: "Bearer valid-token" }
            });
            request.jwtVerify = jest.fn().mockResolvedValue(undefined);
            // Simulate user not being set (edge case)
            (request as unknown as { user: undefined }).user = undefined;

            await assertThrowsError(
                () => authMiddleware(request),
                "UnauthorizedError",
                /Authentication required/
            );
        });

        it("should handle empty string token in query", async () => {
            const request = createMockRequest({
                headers: {},
                query: { token: "" }
            });

            await assertThrowsError(
                () => authMiddleware(request),
                "UnauthorizedError",
                /Authentication required/
            );
        });
    });
});

describe("optionalAuthMiddleware", () => {
    it("should set user when valid token is provided", async () => {
        const request = createMockRequest({
            headers: { authorization: "Bearer valid-token" }
        });
        request.jwtVerify = jest.fn().mockResolvedValue(undefined);
        (request as unknown as { user: { id: string; email: string } }).user = {
            id: "user-123",
            email: "test@example.com"
        };

        await optionalAuthMiddleware(request);

        expect(request.jwtVerify).toHaveBeenCalled();
        expect(request.user).toBeDefined();
    });

    it("should not fail when no token is provided", async () => {
        const request = createMockRequest({
            headers: {}
        });
        request.jwtVerify = jest.fn().mockRejectedValue(new Error("No token"));

        // Should not throw
        await expect(optionalAuthMiddleware(request)).resolves.toBeUndefined();

        // User should remain undefined
        expect(request.user).toBeUndefined();
    });

    it("should not fail when token is invalid", async () => {
        const request = createMockRequest({
            headers: { authorization: "Bearer invalid-token" }
        });
        request.jwtVerify = jest.fn().mockRejectedValue(new Error("Invalid token"));

        // Should not throw
        await expect(optionalAuthMiddleware(request)).resolves.toBeUndefined();
    });
});
