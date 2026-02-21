/**
 * Tests for error classes
 */

import { describe, it, expect } from "vitest";
import {
    AIError,
    AuthenticationError,
    RateLimitError,
    ProviderUnavailableError,
    ModelNotFoundError,
    ValidationError,
    TimeoutError,
    ContentFilterError,
    InsufficientQuotaError
} from "../errors";

describe("Error Classes", () => {
    describe("AIError", () => {
        it("should create an error with all properties", () => {
            const error = new AIError("Test error", {
                provider: "openai",
                statusCode: 500,
                errorCode: "TEST_ERROR",
                errorType: "test",
                retryable: true,
                retryAfterMs: 1000
            });

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AIError);
            expect(error.message).toBe("Test error");
            expect(error.name).toBe("AIError");
            expect(error.provider).toBe("openai");
            expect(error.statusCode).toBe(500);
            expect(error.errorCode).toBe("TEST_ERROR");
            expect(error.errorType).toBe("test");
            expect(error.retryable).toBe(true);
            expect(error.retryAfterMs).toBe(1000);
        });

        it("should preserve cause when provided", () => {
            const cause = new Error("Original error");
            const error = new AIError(
                "Wrapped error",
                { provider: "openai", retryable: false },
                cause
            );

            expect(error.cause).toBe(cause);
        });

        it("should work without optional properties", () => {
            const error = new AIError("Minimal error", {
                provider: "anthropic",
                retryable: false
            });

            expect(error.statusCode).toBeUndefined();
            expect(error.errorCode).toBeUndefined();
            expect(error.retryAfterMs).toBeUndefined();
        });
    });

    describe("AuthenticationError", () => {
        it("should create with correct properties", () => {
            const error = new AuthenticationError("openai", "Invalid API key");

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(AuthenticationError);
            expect(error.name).toBe("AuthenticationError");
            expect(error.message).toBe("Invalid API key");
            expect(error.provider).toBe("openai");
            expect(error.errorCode).toBe("AUTH_ERROR");
            expect(error.errorType).toBe("authentication");
            expect(error.retryable).toBe(false);
        });
    });

    describe("RateLimitError", () => {
        it("should create with correct properties and retryAfterMs", () => {
            const error = new RateLimitError("anthropic", 5000);

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(RateLimitError);
            expect(error.name).toBe("RateLimitError");
            expect(error.message).toBe("Rate limit exceeded for anthropic");
            expect(error.provider).toBe("anthropic");
            expect(error.statusCode).toBe(429);
            expect(error.errorCode).toBe("RATE_LIMIT");
            expect(error.errorType).toBe("rate_limit_error");
            expect(error.retryable).toBe(true);
            expect(error.retryAfterMs).toBe(5000);
        });

        it("should work without retryAfterMs", () => {
            const error = new RateLimitError("google");

            expect(error.retryAfterMs).toBeUndefined();
            expect(error.retryable).toBe(true);
        });
    });

    describe("ProviderUnavailableError", () => {
        it("should create with default message", () => {
            const error = new ProviderUnavailableError("cohere");

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(ProviderUnavailableError);
            expect(error.name).toBe("ProviderUnavailableError");
            expect(error.message).toBe("Provider cohere is temporarily unavailable");
            expect(error.statusCode).toBe(503);
            expect(error.errorCode).toBe("PROVIDER_UNAVAILABLE");
            expect(error.errorType).toBe("overloaded_error");
            expect(error.retryable).toBe(true);
        });

        it("should create with custom message", () => {
            const error = new ProviderUnavailableError("replicate", "Servers are overloaded");

            expect(error.message).toBe("Servers are overloaded");
        });
    });

    describe("ModelNotFoundError", () => {
        it("should create with correct properties", () => {
            const error = new ModelNotFoundError("openai", "gpt-99");

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(ModelNotFoundError);
            expect(error.name).toBe("ModelNotFoundError");
            expect(error.message).toBe("Model gpt-99 not found for provider openai");
            expect(error.statusCode).toBe(404);
            expect(error.errorCode).toBe("MODEL_NOT_FOUND");
            expect(error.errorType).toBe("invalid_request");
            expect(error.retryable).toBe(false);
        });
    });

    describe("ValidationError", () => {
        it("should create with field information", () => {
            const error = new ValidationError("openai", "Invalid temperature value", "temperature");

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.name).toBe("ValidationError");
            expect(error.message).toBe("Invalid temperature value");
            expect(error.errorCode).toBe("VALIDATION_ERROR:temperature");
            expect(error.errorType).toBe("validation");
            expect(error.retryable).toBe(false);
            expect(error.field).toBe("temperature");
        });

        it("should work without field", () => {
            const error = new ValidationError("anthropic", "Invalid request");

            expect(error.errorCode).toBe("VALIDATION_ERROR");
            expect(error.field).toBeUndefined();
        });
    });

    describe("TimeoutError", () => {
        it("should create with correct properties", () => {
            const error = new TimeoutError("google", "Text completion", 30000);

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(TimeoutError);
            expect(error.name).toBe("TimeoutError");
            expect(error.message).toBe("Text completion timed out after 30000ms");
            expect(error.errorCode).toBe("TIMEOUT");
            expect(error.errorType).toBe("timeout");
            expect(error.retryable).toBe(true);
            expect(error.operationType).toBe("Text completion");
            expect(error.timeoutMs).toBe(30000);
        });
    });

    describe("ContentFilterError", () => {
        it("should create with default message", () => {
            const error = new ContentFilterError("openai");

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(ContentFilterError);
            expect(error.name).toBe("ContentFilterError");
            expect(error.message).toBe("Content blocked by safety filter");
            expect(error.errorCode).toBe("CONTENT_FILTER");
            expect(error.errorType).toBe("content_filter");
            expect(error.retryable).toBe(false);
        });

        it("should create with custom message", () => {
            const error = new ContentFilterError("anthropic", "Your prompt was flagged");

            expect(error.message).toBe("Your prompt was flagged");
        });
    });

    describe("InsufficientQuotaError", () => {
        it("should create with default message", () => {
            const error = new InsufficientQuotaError("openai");

            expect(error).toBeInstanceOf(AIError);
            expect(error).toBeInstanceOf(InsufficientQuotaError);
            expect(error.name).toBe("InsufficientQuotaError");
            expect(error.message).toBe("Insufficient quota for openai");
            expect(error.statusCode).toBe(402);
            expect(error.errorCode).toBe("INSUFFICIENT_QUOTA");
            expect(error.errorType).toBe("quota_exceeded");
            expect(error.retryable).toBe(false);
        });

        it("should create with custom message", () => {
            const error = new InsufficientQuotaError("anthropic", "Monthly limit reached");

            expect(error.message).toBe("Monthly limit reached");
        });
    });

    describe("Error hierarchy", () => {
        it("should maintain proper inheritance chain", () => {
            const authError = new AuthenticationError("openai", "Invalid key");
            const rateError = new RateLimitError("openai");
            const providerError = new ProviderUnavailableError("openai");
            const modelError = new ModelNotFoundError("openai", "gpt-5");
            const validationError = new ValidationError("openai", "Bad input");
            const timeoutError = new TimeoutError("openai", "completion", 1000);
            const filterError = new ContentFilterError("openai");
            const quotaError = new InsufficientQuotaError("openai");

            const errors = [
                authError,
                rateError,
                providerError,
                modelError,
                validationError,
                timeoutError,
                filterError,
                quotaError
            ];

            for (const error of errors) {
                expect(error).toBeInstanceOf(Error);
                expect(error).toBeInstanceOf(AIError);
            }
        });

        it("should be catchable as AIError", () => {
            const throwAndCatch = (error: AIError) => {
                try {
                    throw error;
                } catch (e) {
                    if (e instanceof AIError) {
                        return e.provider;
                    }
                    return null;
                }
            };

            expect(throwAndCatch(new AuthenticationError("openai", "test"))).toBe("openai");
            expect(throwAndCatch(new RateLimitError("anthropic"))).toBe("anthropic");
            expect(throwAndCatch(new TimeoutError("google", "op", 1000))).toBe("google");
        });
    });
});
