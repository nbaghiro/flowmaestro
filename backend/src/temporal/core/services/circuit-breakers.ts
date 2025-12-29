/**
 * LLM Circuit Breakers
 *
 * Per-provider circuit breakers for LLM API calls.
 * Prevents cascading failures when a provider is experiencing issues.
 */

import { CircuitBreaker } from "../../../core/utils/circuit-breaker";

// ============================================================================
// CIRCUIT BREAKERS
// ============================================================================

/**
 * Provider-specific circuit breakers with LLM-appropriate timeouts
 */
export const llmCircuitBreakers = {
    openai: new CircuitBreaker({
        name: "llm-openai",
        failureThreshold: 5,
        resetTimeout: 30000 // 30 seconds
    }),
    anthropic: new CircuitBreaker({
        name: "llm-anthropic",
        failureThreshold: 5,
        resetTimeout: 30000
    }),
    google: new CircuitBreaker({
        name: "llm-google",
        failureThreshold: 5,
        resetTimeout: 30000
    }),
    cohere: new CircuitBreaker({
        name: "llm-cohere",
        failureThreshold: 5,
        resetTimeout: 30000
    }),
    huggingface: new CircuitBreaker({
        name: "llm-huggingface",
        failureThreshold: 5,
        resetTimeout: 60000 // Longer for HuggingFace (model loading can be slow)
    })
};

export type LLMProvider = keyof typeof llmCircuitBreakers;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get circuit breaker for a specific LLM provider
 */
export function getLLMCircuitBreaker(provider: string): CircuitBreaker | undefined {
    return llmCircuitBreakers[provider as LLMProvider];
}

/**
 * Get status of all LLM circuit breakers
 */
export function getLLMCircuitBreakerStatus(): Record<
    string,
    { state: string; failureCount: number; lastFailureTime: number | null }
> {
    const status: Record<
        string,
        { state: string; failureCount: number; lastFailureTime: number | null }
    > = {};

    for (const [provider, breaker] of Object.entries(llmCircuitBreakers)) {
        status[provider] = breaker.getStats();
    }

    return status;
}
