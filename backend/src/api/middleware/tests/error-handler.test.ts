/**
 * Error Handler Middleware Tests
 *
 * Tests for centralized error handling middleware (error-handler.ts)
 */

import { FastifyError } from "fastify";
import { ZodError, z } from "zod";
import {
    createMockRequest,
    createMockReply
} from "../../../../tests/helpers/middleware-test-utils";

// Mock config module
jest.mock("../../../core/config", () => ({
    config: {
        env: "development"
    }
}));

import { config } from "../../../core/config";
import {
    errorHandler,
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    BadRequestError,
    InsufficientCreditsError
} from "../error-handler";

// Types for error response bodies in tests
interface ErrorResponseBody {
    success: false;
    error: string;
    details?: unknown;
    code?: string;
    stack?: string;
}

// Zod error response with typed details
interface ZodErrorDetail {
    path: string;
    message: string;
}

interface ZodErrorResponseBody {
    success: false;
    error: string;
    details: ZodErrorDetail[];
    code?: string;
    stack?: string;
}

// Mutable config type for tests
interface MutableConfig {
    env: string;
}

describe("Error Classes", () => {
    describe("AppError", () => {
        it("should create error with status code and message", () => {
            const error = new AppError(500, "Test error");

            expect(error.statusCode).toBe(500);
            expect(error.message).toBe("Test error");
            expect(error.name).toBe("AppError");
            expect(error.details).toBeUndefined();
        });

        it("should create error with details", () => {
            const error = new AppError(400, "Validation failed", { field: "email" });

            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual({ field: "email" });
        });
    });

    describe("ValidationError", () => {
        it("should create 400 error", () => {
            const error = new ValidationError("Invalid input");

            expect(error.statusCode).toBe(400);
            expect(error.name).toBe("ValidationError");
            expect(error.message).toBe("Invalid input");
        });

        it("should accept details", () => {
            const error = new ValidationError("Invalid input", { fields: ["name", "email"] });

            expect(error.details).toEqual({ fields: ["name", "email"] });
        });
    });

    describe("NotFoundError", () => {
        it("should create 404 error with default message", () => {
            const error = new NotFoundError();

            expect(error.statusCode).toBe(404);
            expect(error.name).toBe("NotFoundError");
            expect(error.message).toBe("Resource not found");
        });

        it("should create 404 error with custom message", () => {
            const error = new NotFoundError("User not found");

            expect(error.message).toBe("User not found");
        });
    });

    describe("UnauthorizedError", () => {
        it("should create 401 error with default message", () => {
            const error = new UnauthorizedError();

            expect(error.statusCode).toBe(401);
            expect(error.name).toBe("UnauthorizedError");
            expect(error.message).toBe("Unauthorized");
        });

        it("should create 401 error with custom message", () => {
            const error = new UnauthorizedError("Token expired");

            expect(error.message).toBe("Token expired");
        });
    });

    describe("ForbiddenError", () => {
        it("should create 403 error with default message", () => {
            const error = new ForbiddenError();

            expect(error.statusCode).toBe(403);
            expect(error.name).toBe("ForbiddenError");
            expect(error.message).toBe("Forbidden");
        });

        it("should create 403 error with custom message", () => {
            const error = new ForbiddenError("Access denied");

            expect(error.message).toBe("Access denied");
        });
    });

    describe("BadRequestError", () => {
        it("should create 400 error with default message", () => {
            const error = new BadRequestError();

            expect(error.statusCode).toBe(400);
            expect(error.name).toBe("BadRequestError");
            expect(error.message).toBe("Bad Request");
        });

        it("should create 400 error with custom message", () => {
            const error = new BadRequestError("Missing required field");

            expect(error.message).toBe("Missing required field");
        });
    });

    describe("InsufficientCreditsError", () => {
        it("should create 402 error with credit information", () => {
            const error = new InsufficientCreditsError(100, 50);

            expect(error.statusCode).toBe(402);
            expect(error.name).toBe("InsufficientCreditsError");
            expect(error.required).toBe(100);
            expect(error.available).toBe(50);
            expect(error.message).toContain("required 100");
            expect(error.message).toContain("available 50");
        });

        it("should include shortfall in details", () => {
            const error = new InsufficientCreditsError(100, 30);

            expect(error.details).toEqual({
                required: 100,
                available: 30,
                shortfall: 70
            });
        });
    });
});

describe("errorHandler", () => {
    describe("Zod validation errors", () => {
        it("should handle ZodError with formatted issues", async () => {
            const schema = z.object({
                email: z.string().email(),
                age: z.number().min(18)
            });

            let zodError: ZodError;
            try {
                schema.parse({ email: "invalid", age: 10 });
            } catch (e) {
                zodError = e as ZodError;
            }

            const request = createMockRequest({ url: "/test", method: "POST" });
            const reply = createMockReply();

            await errorHandler(zodError!, request, reply);

            expect(reply._tracking.statusCode).toBe(400);
            const body = reply._tracking.sentBody as ZodErrorResponseBody;
            expect(body.success).toBe(false);
            expect(body.error).toBe("Validation error");
            expect(body.details).toBeInstanceOf(Array);
            expect(body.details.length).toBe(2);
        });

        it("should format nested path in Zod errors", async () => {
            const schema = z.object({
                user: z.object({
                    profile: z.object({
                        email: z.string().email()
                    })
                })
            });

            let zodError: ZodError;
            try {
                schema.parse({ user: { profile: { email: "invalid" } } });
            } catch (e) {
                zodError = e as ZodError;
            }

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(zodError!, request, reply);

            const body = reply._tracking.sentBody as ZodErrorResponseBody;
            expect(body.details[0].path).toBe("user.profile.email");
        });
    });

    describe("AppError handling", () => {
        it("should handle AppError with correct status code", async () => {
            const error = new AppError(503, "Service unavailable");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(503);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.success).toBe(false);
            expect(body.error).toBe("Service unavailable");
        });

        it("should handle ValidationError", async () => {
            const error = new ValidationError("Invalid email format", { field: "email" });

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(400);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Invalid email format");
            expect(body.details).toEqual({ field: "email" });
        });

        it("should handle NotFoundError", async () => {
            const error = new NotFoundError("Workflow not found");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(404);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Workflow not found");
        });

        it("should handle UnauthorizedError", async () => {
            const error = new UnauthorizedError("Invalid token");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(401);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Invalid token");
        });

        it("should handle ForbiddenError", async () => {
            const error = new ForbiddenError("Insufficient permissions");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(403);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Insufficient permissions");
        });

        it("should handle InsufficientCreditsError", async () => {
            const error = new InsufficientCreditsError(500, 100);

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(402);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.details).toEqual({
                required: 500,
                available: 100,
                shortfall: 400
            });
        });
    });

    describe("Fastify validation errors", () => {
        it("should handle Fastify validation error", async () => {
            const error = {
                message: 'body/email must match format "email"',
                validation: [{ dataPath: "/email", message: 'must match format "email"' }]
            } as unknown as FastifyError;

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(400);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.success).toBe(false);
            expect(body.error).toBe("Validation error");
            expect(body.details).toBeDefined();
        });
    });

    describe("JWT errors", () => {
        it("should handle missing authorization header error", async () => {
            const error = new Error("No Authorization was found in request.headers");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(401);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Missing authorization token");
        });

        it("should handle invalid authorization token error", async () => {
            const error = new Error("Authorization token is malformed");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(401);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Invalid authorization token");
        });

        it("should handle Authorization token expired error", async () => {
            const error = new Error("Authorization token expired");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(401);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.error).toBe("Invalid authorization token");
        });
    });

    describe("Generic errors", () => {
        it("should handle unknown error with 500 status in development", async () => {
            (config as unknown as MutableConfig).env = "development";
            const error = new Error("Something went wrong internally");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(500);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            expect(body.success).toBe(false);
            // In development, should show actual error message
            expect(body.error).toBe("Something went wrong internally");
        });

        it("should hide error details in production", async () => {
            (config as unknown as MutableConfig).env = "production";
            const error = new Error("Internal database connection failed");

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(500);
            const body = reply._tracking.sentBody as ErrorResponseBody;
            // In production, should show generic message
            expect(body.error).toBe("Internal server error");

            // Reset to development for other tests
            (config as unknown as MutableConfig).env = "development";
        });

        it("should use pre-set statusCode from error", async () => {
            const error = new Error("Bad request") as Error & { statusCode: number };
            error.statusCode = 400;

            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(reply._tracking.statusCode).toBe(400);
        });
    });

    describe("Logging", () => {
        it("should log error with request details", async () => {
            const error = new Error("Test error");
            const request = createMockRequest({
                url: "/api/workflows/123",
                method: "DELETE"
            });
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(request.log.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: "Test error",
                    url: "/api/workflows/123",
                    method: "DELETE"
                })
            );
        });

        it("should log error stack trace", async () => {
            const error = new Error("Test error");
            error.stack = "Error: Test error\n    at test.ts:1:1";
            const request = createMockRequest();
            const reply = createMockReply();

            await errorHandler(error, request, reply);

            expect(request.log.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    stack: expect.stringContaining("Error: Test error")
                })
            );
        });
    });
});
