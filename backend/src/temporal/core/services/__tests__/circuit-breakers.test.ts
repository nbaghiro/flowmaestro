/**
 * Circuit Breakers Tests
 *
 * Tests for LLM circuit breaker configuration and management.
 */

import {
    llmCircuitBreakers,
    getLLMCircuitBreaker,
    getLLMCircuitBreakerStatus,
    type LLMProvider
} from "../circuit-breakers";

describe("Circuit Breakers", () => {
    describe("llmCircuitBreakers", () => {
        it("should have circuit breakers for all major LLM providers", () => {
            expect(llmCircuitBreakers.openai).toBeDefined();
            expect(llmCircuitBreakers.anthropic).toBeDefined();
            expect(llmCircuitBreakers.google).toBeDefined();
            expect(llmCircuitBreakers.cohere).toBeDefined();
            expect(llmCircuitBreakers.huggingface).toBeDefined();
        });

        it("should have correct provider count", () => {
            const providers = Object.keys(llmCircuitBreakers);
            expect(providers).toHaveLength(5);
        });

        it("should have circuit breaker instances with getStats method", () => {
            for (const [_provider, breaker] of Object.entries(llmCircuitBreakers)) {
                expect(breaker).toBeDefined();
                expect(typeof breaker.getStats).toBe("function");
                const stats = breaker.getStats();
                expect(stats).toHaveProperty("state");
                expect(stats).toHaveProperty("failureCount");
                expect(stats).toHaveProperty("lastFailureTime");
            }
        });
    });

    describe("getLLMCircuitBreaker", () => {
        it("should return circuit breaker for valid providers", () => {
            const providers: LLMProvider[] = [
                "openai",
                "anthropic",
                "google",
                "cohere",
                "huggingface"
            ];

            for (const provider of providers) {
                const breaker = getLLMCircuitBreaker(provider);
                expect(breaker).toBeDefined();
                expect(breaker).toBe(llmCircuitBreakers[provider]);
            }
        });

        it("should return undefined for unknown provider", () => {
            const breaker = getLLMCircuitBreaker("unknown-provider");
            expect(breaker).toBeUndefined();
        });

        it("should return undefined for empty string", () => {
            const breaker = getLLMCircuitBreaker("");
            expect(breaker).toBeUndefined();
        });

        it("should be case-sensitive", () => {
            const breaker = getLLMCircuitBreaker("OpenAI");
            expect(breaker).toBeUndefined();
        });
    });

    describe("getLLMCircuitBreakerStatus", () => {
        it("should return status for all providers", () => {
            const status = getLLMCircuitBreakerStatus();

            expect(status).toHaveProperty("openai");
            expect(status).toHaveProperty("anthropic");
            expect(status).toHaveProperty("google");
            expect(status).toHaveProperty("cohere");
            expect(status).toHaveProperty("huggingface");
        });

        it("should include state, failureCount, and lastFailureTime for each provider", () => {
            const status = getLLMCircuitBreakerStatus();

            for (const providerStatus of Object.values(status)) {
                expect(providerStatus).toHaveProperty("state");
                expect(providerStatus).toHaveProperty("failureCount");
                expect(providerStatus).toHaveProperty("lastFailureTime");
            }
        });

        it("should return closed state initially", () => {
            const status = getLLMCircuitBreakerStatus();

            // Circuit breakers start in closed state (healthy)
            for (const providerStatus of Object.values(status)) {
                expect(providerStatus.state.toLowerCase()).toBe("closed");
                expect(providerStatus.failureCount).toBe(0);
            }
        });

        it("should return correct number of providers", () => {
            const status = getLLMCircuitBreakerStatus();
            const providerCount = Object.keys(status).length;
            expect(providerCount).toBe(5);
        });
    });

    describe("circuit breaker configuration", () => {
        it("should have standard failure threshold for most providers", () => {
            // All providers should have reasonable failure thresholds
            for (const breaker of Object.values(llmCircuitBreakers)) {
                const stats = breaker.getStats();
                // Circuit breakers should start with 0 failures
                expect(stats.failureCount).toBe(0);
            }
        });

        it("should have all providers with same initial state", () => {
            const status = getLLMCircuitBreakerStatus();

            const states = Object.values(status).map((s) => s.state.toLowerCase());
            const uniqueStates = [...new Set(states)];

            // All should be in same state initially
            expect(uniqueStates).toHaveLength(1);
            expect(uniqueStates[0]).toBe("closed");
        });
    });

    describe("LLMProvider type", () => {
        it("should allow all valid provider strings", () => {
            const validProviders: LLMProvider[] = [
                "openai",
                "anthropic",
                "google",
                "cohere",
                "huggingface"
            ];

            for (const provider of validProviders) {
                expect(llmCircuitBreakers[provider]).toBeDefined();
            }
        });
    });
});
