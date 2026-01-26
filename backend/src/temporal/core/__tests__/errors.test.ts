/**
 * Temporal Error Classes Tests
 *
 * Tests for custom error types with retry control.
 */

import {
    TemporalActivityError,
    RateLimitError,
    ProviderError,
    ValidationError,
    InterpolationError,
    ConfigurationError,
    NotFoundError,
    TimeoutError,
    CodeExecutionError
} from "../errors";

describe("Temporal Error Classes", () => {
    describe("TemporalActivityError", () => {
        it("should create error with message", () => {
            const error = new TemporalActivityError("Test error");
            expect(error.message).toBe("Test error");
            expect(error.name).toBe("TemporalActivityError");
            expect(error.retryable).toBe(false);
        });

        it("should allow setting retryable flag", () => {
            const retryableError = new TemporalActivityError("Retryable", true);
            expect(retryableError.retryable).toBe(true);

            const nonRetryableError = new TemporalActivityError("Non-retryable", false);
            expect(nonRetryableError.retryable).toBe(false);
        });

        it("should be instance of Error", () => {
            const error = new TemporalActivityError("Test");
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(TemporalActivityError);
        });
    });

    describe("RateLimitError", () => {
        it("should create error with provider name", () => {
            const error = new RateLimitError("openai");
            expect(error.message).toBe("Rate limited by openai");
            expect(error.provider).toBe("openai");
            expect(error.name).toBe("RateLimitError");
        });

        it("should include retry after time if provided", () => {
            const error = new RateLimitError("anthropic", 30);
            expect(error.message).toBe("Rate limited by anthropic (retry after 30s)");
            expect(error.retryAfter).toBe(30);
        });

        it("should be retryable", () => {
            const error = new RateLimitError("openai");
            expect(error.retryable).toBe(true);
        });

        it("should be instance of TemporalActivityError", () => {
            const error = new RateLimitError("openai");
            expect(error).toBeInstanceOf(TemporalActivityError);
        });
    });

    describe("ProviderError", () => {
        it("should create error with provider, status code, and message", () => {
            const error = new ProviderError("openai", 400, "Bad request");
            expect(error.message).toBe("openai error (400): Bad request");
            expect(error.provider).toBe("openai");
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe("ProviderError");
        });

        it("should be retryable for 429 (rate limit)", () => {
            const error = new ProviderError("openai", 429, "Too many requests");
            expect(error.retryable).toBe(true);
        });

        it("should be retryable for 500 (server error)", () => {
            const error = new ProviderError("openai", 500, "Internal server error");
            expect(error.retryable).toBe(true);
        });

        it("should be retryable for 502 (bad gateway)", () => {
            const error = new ProviderError("openai", 502, "Bad gateway");
            expect(error.retryable).toBe(true);
        });

        it("should be retryable for 503 (service unavailable)", () => {
            const error = new ProviderError("openai", 503, "Service unavailable");
            expect(error.retryable).toBe(true);
        });

        it("should be retryable for 529 (overloaded)", () => {
            const error = new ProviderError("anthropic", 529, "Overloaded");
            expect(error.retryable).toBe(true);
        });

        it("should NOT be retryable for 400 (bad request)", () => {
            const error = new ProviderError("openai", 400, "Bad request");
            expect(error.retryable).toBe(false);
        });

        it("should NOT be retryable for 401 (unauthorized)", () => {
            const error = new ProviderError("openai", 401, "Invalid API key");
            expect(error.retryable).toBe(false);
        });

        it("should NOT be retryable for 404 (not found)", () => {
            const error = new ProviderError("openai", 404, "Model not found");
            expect(error.retryable).toBe(false);
        });
    });

    describe("ValidationError", () => {
        it("should create error with message only", () => {
            const error = new ValidationError("Invalid input");
            expect(error.message).toBe("Invalid input");
            expect(error.field).toBeUndefined();
            expect(error.name).toBe("ValidationError");
        });

        it("should include field name in message", () => {
            const error = new ValidationError("must be a number", "temperature");
            expect(error.message).toBe("Validation error in 'temperature': must be a number");
            expect(error.field).toBe("temperature");
        });

        it("should store additional details", () => {
            const details = { min: 0, max: 2, received: 5 };
            const error = new ValidationError("out of range", "temperature", details);
            expect(error.details).toEqual(details);
        });

        it("should NOT be retryable", () => {
            const error = new ValidationError("Invalid");
            expect(error.retryable).toBe(false);
        });
    });

    describe("InterpolationError", () => {
        it("should create error with message only", () => {
            const error = new InterpolationError("Variable not found");
            expect(error.message).toBe("Variable not found");
            expect(error.variablePath).toBeUndefined();
            expect(error.name).toBe("InterpolationError");
        });

        it("should include variable path in message", () => {
            const error = new InterpolationError("not found in context", "user.profile.name");
            expect(error.message).toBe(
                "Interpolation error for 'user.profile.name': not found in context"
            );
            expect(error.variablePath).toBe("user.profile.name");
        });

        it("should NOT be retryable", () => {
            const error = new InterpolationError("Missing variable");
            expect(error.retryable).toBe(false);
        });
    });

    describe("ConfigurationError", () => {
        it("should create error with message only", () => {
            const error = new ConfigurationError("Missing API key");
            expect(error.message).toBe("Missing API key");
            expect(error.configKey).toBeUndefined();
            expect(error.name).toBe("ConfigurationError");
        });

        it("should include config key in message", () => {
            const error = new ConfigurationError("is required", "openaiApiKey");
            expect(error.message).toBe("Configuration error for 'openaiApiKey': is required");
            expect(error.configKey).toBe("openaiApiKey");
        });

        it("should NOT be retryable", () => {
            const error = new ConfigurationError("Invalid config");
            expect(error.retryable).toBe(false);
        });
    });

    describe("NotFoundError", () => {
        it("should create error with resource name only", () => {
            const error = new NotFoundError("Workflow");
            expect(error.message).toBe("Workflow not found");
            expect(error.name).toBe("NotFoundError");
        });

        it("should include identifier in message", () => {
            const error = new NotFoundError("User", "user-123");
            expect(error.message).toBe("User 'user-123' not found");
        });

        it("should NOT be retryable", () => {
            const error = new NotFoundError("Resource");
            expect(error.retryable).toBe(false);
        });
    });

    describe("TimeoutError", () => {
        it("should create error with operation and timeout", () => {
            const error = new TimeoutError("LLM call", 30000);
            expect(error.message).toBe("Operation 'LLM call' timed out after 30000ms");
            expect(error.timeoutMs).toBe(30000);
            expect(error.name).toBe("TimeoutError");
        });

        it("should be retryable", () => {
            const error = new TimeoutError("API request", 5000);
            expect(error.retryable).toBe(true);
        });
    });

    describe("CodeExecutionError", () => {
        it("should create error with message and language", () => {
            const error = new CodeExecutionError("Syntax error", "python");
            expect(error.message).toBe("Code execution error (python): Syntax error");
            expect(error.language).toBe("python");
            expect(error.name).toBe("CodeExecutionError");
        });

        it("should store output if provided", () => {
            const error = new CodeExecutionError(
                "Division by zero",
                "javascript",
                "Error at line 5"
            );
            expect(error.output).toBe("Error at line 5");
        });

        it("should NOT be retryable", () => {
            const error = new CodeExecutionError("Runtime error", "python");
            expect(error.retryable).toBe(false);
        });
    });

    describe("Error hierarchy", () => {
        it("should allow catching all Temporal errors", () => {
            const errors = [
                new RateLimitError("openai"),
                new ProviderError("openai", 500, "Error"),
                new ValidationError("Invalid"),
                new InterpolationError("Missing"),
                new ConfigurationError("Bad config"),
                new NotFoundError("Resource"),
                new TimeoutError("Operation", 1000),
                new CodeExecutionError("Error", "js")
            ];

            for (const error of errors) {
                expect(error).toBeInstanceOf(TemporalActivityError);
                expect(error).toBeInstanceOf(Error);
            }
        });

        it("should have correct names for identification", () => {
            expect(new RateLimitError("x").name).toBe("RateLimitError");
            expect(new ProviderError("x", 500, "y").name).toBe("ProviderError");
            expect(new ValidationError("x").name).toBe("ValidationError");
            expect(new InterpolationError("x").name).toBe("InterpolationError");
            expect(new ConfigurationError("x").name).toBe("ConfigurationError");
            expect(new NotFoundError("x").name).toBe("NotFoundError");
            expect(new TimeoutError("x", 1).name).toBe("TimeoutError");
            expect(new CodeExecutionError("x", "y").name).toBe("CodeExecutionError");
        });
    });
});
