/**
 * Rate Limiting Edge Case Tests
 *
 * Tests workflow behavior with rate limiting scenarios:
 * - Single rate limit response triggers retry
 * - Multiple consecutive rate limits
 * - Rate limit with backoff header (Retry-After)
 * - Rate limit exhausts retries
 */

import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// Types for rate limiting simulation
interface RateLimitConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

interface RateLimitResponse {
    status: 429;
    headers: {
        "retry-after"?: string;
        "x-ratelimit-limit"?: string;
        "x-ratelimit-remaining"?: string;
        "x-ratelimit-reset"?: string;
    };
    body: {
        error: string;
        message: string;
    };
}

interface RequestAttempt {
    attemptNumber: number;
    timestamp: number;
    delayBefore: number;
    success: boolean;
    response?: unknown;
    error?: RateLimitResponse | Error;
}

interface RateLimitResult {
    context: ContextSnapshot;
    attempts: RequestAttempt[];
    finalSuccess: boolean;
    totalRetries: number;
    totalDelayMs: number;
    backoffDelays: number[];
}

// Default rate limit config
const DEFAULT_CONFIG: RateLimitConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
};

// Calculate exponential backoff delay
function calculateBackoff(
    attempt: number,
    config: RateLimitConfig,
    retryAfterHeader?: string
): number {
    // If Retry-After header is present, use it
    if (retryAfterHeader) {
        const retryAfterSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(retryAfterSeconds)) {
            return Math.min(retryAfterSeconds * 1000, config.maxDelayMs);
        }
    }

    // Otherwise use exponential backoff
    const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelayMs);
}

// Create mock rate limit response
function createRateLimitResponse(options: {
    retryAfter?: number;
    limit?: number;
    remaining?: number;
    resetTime?: number;
}): RateLimitResponse {
    const headers: RateLimitResponse["headers"] = {};

    if (options.retryAfter !== undefined) {
        headers["retry-after"] = options.retryAfter.toString();
    }
    if (options.limit !== undefined) {
        headers["x-ratelimit-limit"] = options.limit.toString();
    }
    if (options.remaining !== undefined) {
        headers["x-ratelimit-remaining"] = options.remaining.toString();
    }
    if (options.resetTime !== undefined) {
        headers["x-ratelimit-reset"] = options.resetTime.toString();
    }

    return {
        status: 429,
        headers,
        body: {
            error: "rate_limit_exceeded",
            message: "Too many requests. Please retry later."
        }
    };
}

// Simulate rate-limited request
async function simulateRateLimitedRequest(
    requestFn: () => Promise<{
        success: boolean;
        response?: unknown;
        rateLimited?: RateLimitResponse;
    }>,
    config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
    let context = createContext({});
    const attempts: RequestAttempt[] = [];
    const backoffDelays: number[] = [];
    let totalDelayMs = 0;
    let finalSuccess = false;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        const delayBefore = attempt === 0 ? 0 : backoffDelays[backoffDelays.length - 1];
        totalDelayMs += delayBefore;

        // Simulate the delay (in real implementation)
        // await new Promise(resolve => setTimeout(resolve, delayBefore));

        const timestamp = Date.now() + totalDelayMs;
        const result = await requestFn();

        if (result.success) {
            attempts.push({
                attemptNumber: attempt + 1,
                timestamp,
                delayBefore,
                success: true,
                response: result.response
            });
            finalSuccess = true;
            break;
        }

        if (result.rateLimited) {
            attempts.push({
                attemptNumber: attempt + 1,
                timestamp,
                delayBefore,
                success: false,
                error: result.rateLimited
            });

            // Calculate next backoff
            const nextDelay = calculateBackoff(
                attempt,
                config,
                result.rateLimited.headers["retry-after"]
            );
            backoffDelays.push(nextDelay);
        }
    }

    context = storeNodeOutput(context, "RateLimitedRequest", {
        attempts: attempts.length,
        success: finalSuccess,
        totalDelay: totalDelayMs
    });

    return {
        context,
        attempts,
        finalSuccess,
        totalRetries: attempts.length - 1,
        totalDelayMs,
        backoffDelays
    };
}

// Simulate workflow with multiple rate-limited nodes
async function simulateWorkflowWithRateLimits(
    nodes: Array<{
        id: string;
        rateLimitResponses: number; // Number of 429s before success
        retryAfterSeconds?: number;
    }>,
    config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{
    context: ContextSnapshot;
    nodeResults: Map<string, RateLimitResult>;
    workflowSuccess: boolean;
    totalWorkflowDelay: number;
}> {
    let context = createContext({});
    const nodeResults = new Map<string, RateLimitResult>();
    let workflowSuccess = true;
    let totalWorkflowDelay = 0;

    for (const node of nodes) {
        let rateLimitCount = 0;

        const result = await simulateRateLimitedRequest(async () => {
            if (rateLimitCount < node.rateLimitResponses) {
                rateLimitCount++;
                return {
                    success: false,
                    rateLimited: createRateLimitResponse({
                        retryAfter: node.retryAfterSeconds,
                        remaining: 0,
                        limit: 100
                    })
                };
            }
            return {
                success: true,
                response: { data: `${node.id}_response` }
            };
        }, config);

        nodeResults.set(node.id, result);
        totalWorkflowDelay += result.totalDelayMs;

        if (!result.finalSuccess) {
            workflowSuccess = false;
            break;
        }

        context = storeNodeOutput(context, node.id, {
            success: result.finalSuccess,
            attempts: result.attempts.length
        });
    }

    return { context, nodeResults, workflowSuccess, totalWorkflowDelay };
}

describe("Rate Limiting Edge Cases", () => {
    describe("single rate limit response triggers retry", () => {
        it("should retry after single 429 response", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: 1 })
                    };
                }
                return { success: true, response: { data: "success" } };
            });

            expect(result.finalSuccess).toBe(true);
            expect(result.attempts.length).toBe(2);
            expect(result.totalRetries).toBe(1);
        });

        it("should succeed on first attempt if no rate limit", async () => {
            const result = await simulateRateLimitedRequest(async () => ({
                success: true,
                response: { data: "immediate_success" }
            }));

            expect(result.finalSuccess).toBe(true);
            expect(result.attempts.length).toBe(1);
            expect(result.totalRetries).toBe(0);
        });

        it("should respect Retry-After header", async () => {
            let callCount = 0;
            const retryAfterSeconds = 5;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: retryAfterSeconds })
                    };
                }
                return { success: true, response: { data: "success" } };
            });

            expect(result.backoffDelays[0]).toBe(retryAfterSeconds * 1000);
        });

        it("should use exponential backoff without Retry-After", async () => {
            let callCount = 0;
            const config: RateLimitConfig = {
                maxRetries: 3,
                baseDelayMs: 1000,
                maxDelayMs: 30000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({})
                    };
                }
                return { success: true, response: {} };
            }, config);

            // First backoff should be baseDelay * 2^0 = 1000ms
            expect(result.backoffDelays[0]).toBe(1000);
        });
    });

    describe("multiple consecutive rate limits", () => {
        it("should handle two consecutive 429s then success", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount <= 2) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({})
                    };
                }
                return { success: true, response: {} };
            });

            expect(result.finalSuccess).toBe(true);
            expect(result.attempts.length).toBe(3);
            expect(result.totalRetries).toBe(2);
        });

        it("should handle three consecutive 429s then success", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount <= 3) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({})
                    };
                }
                return { success: true, response: {} };
            });

            expect(result.finalSuccess).toBe(true);
            expect(result.attempts.length).toBe(4);
        });

        it("should increase backoff exponentially", async () => {
            let callCount = 0;
            const config: RateLimitConfig = {
                maxRetries: 5,
                baseDelayMs: 100,
                maxDelayMs: 10000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount <= 4) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({})
                    };
                }
                return { success: true, response: {} };
            }, config);

            // Backoffs should be: 100, 200, 400, 800
            expect(result.backoffDelays[0]).toBe(100);
            expect(result.backoffDelays[1]).toBe(200);
            expect(result.backoffDelays[2]).toBe(400);
            expect(result.backoffDelays[3]).toBe(800);
        });

        it("should track all rate limit responses", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount <= 2) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ remaining: 0, limit: 100 })
                    };
                }
                return { success: true, response: {} };
            });

            const rateLimitedAttempts = result.attempts.filter((a) => !a.success);
            expect(rateLimitedAttempts.length).toBe(2);
            rateLimitedAttempts.forEach((attempt) => {
                expect((attempt.error as RateLimitResponse).status).toBe(429);
            });
        });
    });

    describe("rate limit with backoff header", () => {
        it("should use Retry-After header value", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: 10 })
                    };
                }
                return { success: true, response: {} };
            });

            expect(result.backoffDelays[0]).toBe(10000); // 10 seconds in ms
        });

        it("should cap Retry-After at maxDelayMs", async () => {
            let callCount = 0;
            const config: RateLimitConfig = {
                maxRetries: 3,
                baseDelayMs: 1000,
                maxDelayMs: 5000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: 60 }) // 60 seconds
                    };
                }
                return { success: true, response: {} };
            }, config);

            expect(result.backoffDelays[0]).toBe(5000); // Capped at maxDelayMs
        });

        it("should handle varying Retry-After values", async () => {
            let callCount = 0;
            const retryAfterValues = [1, 5, 2];

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount <= 3) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({
                            retryAfter: retryAfterValues[callCount - 1]
                        })
                    };
                }
                return { success: true, response: {} };
            });

            expect(result.backoffDelays[0]).toBe(1000);
            expect(result.backoffDelays[1]).toBe(5000);
            expect(result.backoffDelays[2]).toBe(2000);
        });

        it("should include rate limit headers in response", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({
                            retryAfter: 5,
                            limit: 100,
                            remaining: 0,
                            resetTime: Date.now() + 5000
                        })
                    };
                }
                return { success: true, response: {} };
            });

            const rateLimitError = result.attempts[0].error as RateLimitResponse;
            expect(rateLimitError.headers["x-ratelimit-limit"]).toBe("100");
            expect(rateLimitError.headers["x-ratelimit-remaining"]).toBe("0");
        });
    });

    describe("rate limit exhausts retries", () => {
        it("should fail after max retries exceeded", async () => {
            const config: RateLimitConfig = {
                maxRetries: 3,
                baseDelayMs: 100,
                maxDelayMs: 1000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(
                async () => ({
                    success: false,
                    rateLimited: createRateLimitResponse({})
                }),
                config
            );

            expect(result.finalSuccess).toBe(false);
            expect(result.attempts.length).toBe(4); // Initial + 3 retries
        });

        it("should track all failed attempts", async () => {
            const config: RateLimitConfig = {
                maxRetries: 2,
                baseDelayMs: 100,
                maxDelayMs: 1000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(
                async () => ({
                    success: false,
                    rateLimited: createRateLimitResponse({})
                }),
                config
            );

            expect(result.attempts.every((a) => !a.success)).toBe(true);
        });

        it("should calculate total delay from all retries", async () => {
            const config: RateLimitConfig = {
                maxRetries: 3,
                baseDelayMs: 100,
                maxDelayMs: 10000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(
                async () => ({
                    success: false,
                    rateLimited: createRateLimitResponse({})
                }),
                config
            );

            // Total delay: 100 + 200 + 400 = 700ms
            expect(result.totalDelayMs).toBe(700);
        });

        it("should not retry with maxRetries = 0", async () => {
            const config: RateLimitConfig = {
                maxRetries: 0,
                baseDelayMs: 100,
                maxDelayMs: 1000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(
                async () => ({
                    success: false,
                    rateLimited: createRateLimitResponse({})
                }),
                config
            );

            expect(result.attempts.length).toBe(1);
            expect(result.finalSuccess).toBe(false);
        });

        it("should handle high retry count", async () => {
            const config: RateLimitConfig = {
                maxRetries: 10,
                baseDelayMs: 10,
                maxDelayMs: 1000,
                backoffMultiplier: 2
            };

            let callCount = 0;
            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount <= 8) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({})
                    };
                }
                return { success: true, response: {} };
            }, config);

            expect(result.finalSuccess).toBe(true);
            expect(result.attempts.length).toBe(9);
        });
    });

    describe("workflow-level rate limiting", () => {
        it("should handle rate limits on single node", async () => {
            const result = await simulateWorkflowWithRateLimits([
                { id: "Node1", rateLimitResponses: 1 }
            ]);

            expect(result.workflowSuccess).toBe(true);
            expect(result.nodeResults.get("Node1")?.totalRetries).toBe(1);
        });

        it("should handle rate limits on multiple nodes", async () => {
            const result = await simulateWorkflowWithRateLimits([
                { id: "Node1", rateLimitResponses: 1 },
                { id: "Node2", rateLimitResponses: 2 },
                { id: "Node3", rateLimitResponses: 0 }
            ]);

            expect(result.workflowSuccess).toBe(true);
            expect(result.nodeResults.get("Node1")?.totalRetries).toBe(1);
            expect(result.nodeResults.get("Node2")?.totalRetries).toBe(2);
            expect(result.nodeResults.get("Node3")?.totalRetries).toBe(0);
        });

        it("should fail workflow when node exhausts retries", async () => {
            const result = await simulateWorkflowWithRateLimits([
                { id: "Node1", rateLimitResponses: 0 },
                { id: "Node2", rateLimitResponses: 10 } // More than maxRetries
            ]);

            expect(result.workflowSuccess).toBe(false);
        });

        it("should accumulate delays across nodes", async () => {
            const result = await simulateWorkflowWithRateLimits([
                { id: "Node1", rateLimitResponses: 1, retryAfterSeconds: 1 },
                { id: "Node2", rateLimitResponses: 1, retryAfterSeconds: 2 }
            ]);

            expect(result.totalWorkflowDelay).toBe(3000); // 1s + 2s
        });
    });

    describe("rate limit response parsing", () => {
        it("should parse numeric Retry-After", async () => {
            const response = createRateLimitResponse({ retryAfter: 30 });

            expect(response.headers["retry-after"]).toBe("30");
        });

        it("should include error message in response body", async () => {
            const response = createRateLimitResponse({});

            expect(response.body.error).toBe("rate_limit_exceeded");
            expect(response.body.message).toContain("Too many requests");
        });

        it("should include all rate limit headers", async () => {
            const now = Date.now();
            const response = createRateLimitResponse({
                retryAfter: 5,
                limit: 1000,
                remaining: 0,
                resetTime: now + 5000
            });

            expect(response.headers["retry-after"]).toBe("5");
            expect(response.headers["x-ratelimit-limit"]).toBe("1000");
            expect(response.headers["x-ratelimit-remaining"]).toBe("0");
            expect(response.headers["x-ratelimit-reset"]).toBeDefined();
        });
    });

    describe("concurrent rate limit handling", () => {
        it("should handle parallel requests hitting rate limit", async () => {
            const results = await Promise.all([
                simulateRateLimitedRequest(async () => {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: 1 })
                    };
                }),
                simulateRateLimitedRequest(async () => {
                    return { success: true, response: {} };
                })
            ]);

            expect(results[0].finalSuccess).toBe(false);
            expect(results[1].finalSuccess).toBe(true);
        });

        it("should maintain isolation between concurrent requests", async () => {
            let request1Count = 0;

            const [result1, result2] = await Promise.all([
                simulateRateLimitedRequest(async () => {
                    request1Count++;
                    if (request1Count === 1) {
                        return {
                            success: false,
                            rateLimited: createRateLimitResponse({})
                        };
                    }
                    return { success: true, response: { id: 1 } };
                }),
                simulateRateLimitedRequest(async () => {
                    return { success: true, response: { id: 2 } };
                })
            ]);

            expect(result1.attempts.length).toBe(2);
            expect(result2.attempts.length).toBe(1);
        });
    });

    describe("edge cases", () => {
        it("should handle zero Retry-After", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: 0 })
                    };
                }
                return { success: true, response: {} };
            });

            expect(result.backoffDelays[0]).toBe(0);
            expect(result.finalSuccess).toBe(true);
        });

        it("should handle very large Retry-After", async () => {
            const config: RateLimitConfig = {
                maxRetries: 1,
                baseDelayMs: 100,
                maxDelayMs: 60000,
                backoffMultiplier: 2
            };

            let callCount = 0;
            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({ retryAfter: 3600 }) // 1 hour
                    };
                }
                return { success: true, response: {} };
            }, config);

            expect(result.backoffDelays[0]).toBe(60000); // Capped at maxDelayMs
        });

        it("should handle missing Retry-After header", async () => {
            let callCount = 0;
            const config: RateLimitConfig = {
                maxRetries: 1,
                baseDelayMs: 500,
                maxDelayMs: 10000,
                backoffMultiplier: 2
            };

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                if (callCount === 1) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({}) // No retryAfter
                    };
                }
                return { success: true, response: {} };
            }, config);

            // Should fall back to exponential backoff
            expect(result.backoffDelays[0]).toBe(500);
        });

        it("should handle intermittent rate limits", async () => {
            let callCount = 0;

            const result = await simulateRateLimitedRequest(async () => {
                callCount++;
                // Rate limit on 1st and 3rd attempts
                if (callCount === 1 || callCount === 3) {
                    return {
                        success: false,
                        rateLimited: createRateLimitResponse({})
                    };
                }
                return { success: true, response: {} };
            });

            expect(result.finalSuccess).toBe(true);
            expect(result.attempts.length).toBe(2);
        });
    });
});
