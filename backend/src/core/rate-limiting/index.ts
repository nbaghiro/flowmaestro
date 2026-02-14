/**
 * Rate Limiting Module
 *
 * Provides rate limiting for various operations:
 * - LLM API calls (prevent cost runaway)
 * - Tool executions (prevent abuse)
 *
 * Note: LLM rate limiter has been moved to core/utils/llm-rate-limiter.ts
 * to live alongside the base rate-limiter.ts
 */

export {
    LLMRateLimiter,
    getLLMRateLimiter,
    RateLimitExceededError,
    DEFAULT_LLM_RATE_LIMITS
} from "../utils/llm-rate-limiter";

export type { LLMRateLimitConfig, RateLimitResult } from "../utils/llm-rate-limiter";
