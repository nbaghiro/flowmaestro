/**
 * Request Context Middleware Tests
 *
 * Tests for request context setup (request-context.ts)
 */

// Mock the shared package
const mockCreateRequestContext = jest.fn();
jest.mock("@flowmaestro/shared", () => ({
    createRequestContext: mockCreateRequestContext
}));

import { requestContextMiddleware } from "../request-context";
import type { FastifyRequest, FastifyReply } from "fastify";

// Mock request shape for testing
interface MockRequest {
    id: string;
    headers: Record<string, string | undefined>;
    ip: string;
    method: string;
    url: string;
    log: { child: jest.Mock };
    requestContext?: unknown;
    user?: { id: string; email: string };
}

function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
    return {
        id: "req-12345",
        headers: {},
        ip: "192.168.1.1",
        method: "GET",
        url: "/api/test",
        log: {
            child: jest.fn().mockReturnThis()
        },
        ...overrides
    };
}

describe("requestContextMiddleware", () => {
    let mockRequest: MockRequest;
    let mockReply: Partial<FastifyReply>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCreateRequestContext.mockImplementation((opts) => ({
            ...opts,
            timestamp: Date.now()
        }));

        mockRequest = createMockRequest();
        mockReply = {
            header: jest.fn().mockReturnThis()
        };
    });

    describe("context creation", () => {
        it("should attach requestContext to request", async () => {
            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockRequest.requestContext).toBeDefined();
            expect(mockCreateRequestContext).toHaveBeenCalled();
        });

        it("should pass request info to createRequestContext", async () => {
            mockRequest = createMockRequest({
                ip: "10.0.0.1",
                method: "POST",
                url: "/api/users",
                headers: {
                    "user-agent": "TestAgent/1.0"
                }
            });

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    ipAddress: "10.0.0.1",
                    method: "POST",
                    url: "/api/users",
                    userAgent: "TestAgent/1.0"
                })
            );
        });
    });

    describe("trace ID handling", () => {
        it("should use X-Trace-ID header when present", async () => {
            mockRequest.headers = {
                "x-trace-id": "external-trace-123"
            };

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    traceId: "external-trace-123"
                })
            );
        });

        it("should generate traceId when no header present", async () => {
            mockRequest.headers = {};

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    traceId: expect.any(String)
                })
            );
        });
    });

    describe("request ID handling", () => {
        it("should use X-Request-ID header when present", async () => {
            mockRequest.headers = {
                "x-request-id": "external-request-456"
            };

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: "external-request-456"
                })
            );
        });

        it("should generate requestId when no header present", async () => {
            mockRequest.headers = {};

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: expect.any(String)
                })
            );
        });
    });

    describe("session ID handling", () => {
        it("should extract sessionId from X-Session-ID header", async () => {
            mockRequest.headers = {
                "x-session-id": "session-abc-123"
            };

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: "session-abc-123"
                })
            );
        });

        it("should have undefined sessionId when header not present", async () => {
            mockRequest.headers = {};

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: undefined
                })
            );
        });
    });

    describe("user ID handling", () => {
        it("should extract userId from request.user", async () => {
            mockRequest.user = { id: "user-123", email: "test@example.com" };

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-123"
                })
            );
        });

        it("should have undefined userId when not authenticated", async () => {
            mockRequest.user = undefined;

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockCreateRequestContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: undefined
                })
            );
        });
    });

    describe("response headers", () => {
        it("should set X-Trace-ID response header", async () => {
            mockRequest.headers = {
                "x-trace-id": "trace-123"
            };

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.header).toHaveBeenCalledWith("X-Trace-ID", "trace-123");
        });

        it("should set X-Request-ID response header", async () => {
            mockRequest.headers = {
                "x-request-id": "request-456"
            };

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.header).toHaveBeenCalledWith("X-Request-ID", "request-456");
        });
    });

    describe("logger update", () => {
        it("should update request.log with correlation IDs", async () => {
            mockRequest = createMockRequest({
                headers: {
                    "x-trace-id": "trace-123",
                    "x-request-id": "request-456",
                    "x-session-id": "session-789"
                },
                user: { id: "user-123", email: "test@example.com" }
            });

            await requestContextMiddleware(
                mockRequest as unknown as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockRequest.log.child).toHaveBeenCalledWith({
                traceId: "trace-123",
                requestId: "request-456",
                userId: "user-123",
                sessionId: "session-789"
            });
        });
    });
});
