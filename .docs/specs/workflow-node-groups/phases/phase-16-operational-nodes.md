# Phase 16: Operational Nodes

## Overview

Implement 2 operational resilience nodes: Rate Limiter and Circuit Breaker.

---

## Prerequisites

- **Phase 15**: Governance nodes (enterprise patterns)

---

## Existing Infrastructure

### Redis Rate Limiter

**File**: `backend/src/core/utils/rate-limiter.ts`

```typescript
import { createClient } from "redis";

export class RateLimiter {
    private redis: ReturnType<typeof createClient>;

    async isRateLimited(key: string, maxRequests: number, windowMinutes: number): Promise<boolean> {
        const redisKey = `ratelimit:${key}`;
        const count = await this.redis.incr(redisKey);
        if (count === 1) {
            await this.redis.expire(redisKey, windowMinutes * 60);
        }
        return count > maxRequests;
    }

    async getResetTime(key: string): Promise<number> {
        const redisKey = `ratelimit:${key}`;
        const ttl = await this.redis.ttl(redisKey);
        return ttl > 0 ? ttl : 0;
    }
}

export const rateLimiter = new RateLimiter();

// Extend this for node-level rate limiting with sliding window and queuing
```

### Redis for Distributed State

**File**: `backend/src/services/events/RedisEventBus.ts`

```typescript
// Use Redis for circuit breaker state sharing across worker instances
// Store failure counts, circuit state, and timestamps
```

### Configuration

**File**: `backend/src/core/config/index.ts`

```typescript
// Redis configuration for rate limiter and circuit breaker
export const config = {
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379")
    }
};
```

---

## Nodes (2)

| Node                | Description                | Category         |
| ------------------- | -------------------------- | ---------------- |
| **Rate Limiter**    | Enforce request limits     | tools/enterprise |
| **Circuit Breaker** | Handle failures gracefully | tools/enterprise |

---

## Node Specifications

### Rate Limiter Node

**Purpose**: Control the rate of operations to avoid API limits or overload

**Config**:

- Limit: requests per window
- Window: second / minute / hour / day
- Key: global / per-user / per-resource / custom field
- Behavior on limit: queue / reject / delay
- Queue size (if queuing)
- Priority levels (optional)

**Inputs**: `data` (passthrough)
**Outputs**: `data` (passthrough), `queued` (boolean), `waitTime` (number)

### Circuit Breaker Node

**Purpose**: Prevent cascading failures by stopping calls to failing services

**Config**:

- Failure threshold: N failures in M seconds
- Success threshold to close: N successes
- Timeout before half-open
- Fallback action: error / default value / skip
- Monitored errors: all / specific types

**Inputs**: `data` (passthrough)
**Outputs**: `data` (passthrough), `circuitState` (open/closed/half-open)

---

## Complete TypeScript Interfaces

```typescript
// backend/src/temporal/activities/node-executors/enterprise/types.ts

export interface RateLimiterNodeConfig {
    limit: number;
    window: "second" | "minute" | "hour" | "day";
    windowCount?: number; // e.g., 5 for "5 minutes"
    keyType: "global" | "per-user" | "per-resource" | "custom";
    customKeyField?: string; // JSONPath to extract key from context
    behavior: "queue" | "reject" | "delay";
    maxQueueSize?: number;
    queueTimeoutMs?: number;
    priorityField?: string; // JSONPath to extract priority (higher = processed first)
    outputVariable?: string;
}

export interface RateLimiterNodeResult {
    passed: boolean;
    queued: boolean;
    waitTime: number;
    queuePosition?: number;
    currentCount: number;
    limit: number;
    resetIn: number;
}

export interface CircuitBreakerNodeConfig {
    circuitId: string; // Unique identifier for this circuit (shared across executions)
    failureThreshold: number;
    failureWindowMs: number;
    successThreshold: number;
    halfOpenTimeoutMs: number;
    fallbackAction: "error" | "default" | "skip";
    fallbackValue?: unknown;
    monitoredErrors: "all" | string[]; // Error types/messages to count as failures
    outputVariable?: string;
}

export interface CircuitBreakerNodeResult {
    allowed: boolean;
    circuitState: "closed" | "open" | "half-open";
    failedFast: boolean;
    fallbackUsed: boolean;
    failureCount: number;
    successCount: number;
    lastFailure?: Date;
}

// Circuit state stored in Redis
export interface CircuitState {
    state: "closed" | "open" | "half-open";
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
    openedAt?: number;
}
```

---

## Backend Executor Implementations

### Rate Limiter Executor

```typescript
// backend/src/temporal/activities/node-executors/enterprise/rate-limiter-executor.ts
import { createClient } from "redis";
import type { JsonObject } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import type { RateLimiterNodeConfig, RateLimiterNodeResult } from "./types";

const redis = createClient({
    socket: { host: config.redis.host, port: config.redis.port }
});

// Ensure connection
let isConnected = false;
async function ensureRedisConnection() {
    if (!isConnected) {
        await redis.connect();
        isConnected = true;
    }
}

export async function executeRateLimiterNode(
    config: RateLimiterNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    await ensureRedisConnection();

    // Build rate limit key
    const key = buildRateLimitKey(config, context);
    const windowMs = getWindowMs(config.window, config.windowCount);

    // Get current count
    const currentCount = await getCurrentCount(key);

    if (currentCount >= config.limit) {
        // Rate limit exceeded
        return handleLimitExceeded(config, key, currentCount, context);
    }

    // Increment counter using sliding window
    await incrementCounter(key, windowMs);
    const resetIn = await getResetTime(key);

    const result: RateLimiterNodeResult = {
        passed: true,
        queued: false,
        waitTime: 0,
        currentCount: currentCount + 1,
        limit: config.limit,
        resetIn
    };

    if (config.outputVariable) {
        return {
            ...context,
            [config.outputVariable]: result
        } as unknown as JsonObject;
    }
    return { ...context, ...result } as unknown as JsonObject;
}

function buildRateLimitKey(config: RateLimiterNodeConfig, context: JsonObject): string {
    const baseKey = "node-ratelimit";

    switch (config.keyType) {
        case "global":
            return `${baseKey}:global`;
        case "per-user":
            return `${baseKey}:user:${context.userId}`;
        case "per-resource":
            return `${baseKey}:resource:${context.resourceId || context.workflowId}`;
        case "custom":
            if (config.customKeyField) {
                const value = getNestedValue(context, config.customKeyField);
                return `${baseKey}:custom:${value}`;
            }
            return `${baseKey}:global`;
        default:
            return `${baseKey}:global`;
    }
}

function getWindowMs(window: string, count?: number): number {
    const multiplier = count || 1;
    switch (window) {
        case "second":
            return 1000 * multiplier;
        case "minute":
            return 60 * 1000 * multiplier;
        case "hour":
            return 60 * 60 * 1000 * multiplier;
        case "day":
            return 24 * 60 * 60 * 1000 * multiplier;
        default:
            return 60 * 1000;
    }
}

async function getCurrentCount(key: string): Promise<number> {
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
}

async function incrementCounter(key: string, windowMs: number): Promise<void> {
    const multi = redis.multi();
    multi.incr(key);
    multi.pExpire(key, windowMs);
    await multi.exec();
}

async function getResetTime(key: string): Promise<number> {
    const ttl = await redis.pTtl(key);
    return ttl > 0 ? ttl : 0;
}

async function handleLimitExceeded(
    config: RateLimiterNodeConfig,
    key: string,
    currentCount: number,
    context: JsonObject
): Promise<JsonObject> {
    const resetIn = await getResetTime(key);

    switch (config.behavior) {
        case "reject":
            const rejectResult: RateLimiterNodeResult = {
                passed: false,
                queued: false,
                waitTime: 0,
                currentCount,
                limit: config.limit,
                resetIn
            };
            if (config.outputVariable) {
                return { [config.outputVariable]: rejectResult } as unknown as JsonObject;
            }
            return rejectResult as unknown as JsonObject;

        case "delay":
            // Wait for reset time then proceed
            await new Promise((resolve) => setTimeout(resolve, resetIn));
            return executeRateLimiterNode(config, context);

        case "queue":
            return handleQueueBehavior(config, key, currentCount, context);

        default:
            throw new Error(`Unsupported rate limit behavior: ${config.behavior}`);
    }
}

async function handleQueueBehavior(
    config: RateLimiterNodeConfig,
    key: string,
    currentCount: number,
    context: JsonObject
): Promise<JsonObject> {
    const queueKey = `${key}:queue`;
    const queueSize = await redis.lLen(queueKey);

    if (config.maxQueueSize && queueSize >= config.maxQueueSize) {
        // Queue full, reject
        const result: RateLimiterNodeResult = {
            passed: false,
            queued: false,
            waitTime: 0,
            currentCount,
            limit: config.limit,
            resetIn: await getResetTime(key)
        };
        return result as unknown as JsonObject;
    }

    // Add to queue
    const queueItem = JSON.stringify({
        context,
        timestamp: Date.now(),
        priority: config.priorityField ? getNestedValue(context, config.priorityField) : 0
    });
    await redis.rPush(queueKey, queueItem);

    // Wait for our turn (simplified - production would use Redis pub/sub)
    const timeoutMs = config.queueTimeoutMs || 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const nextItem = await redis.lIndex(queueKey, 0);
        if (nextItem && JSON.parse(nextItem).context === context) {
            // Our turn
            await redis.lPop(queueKey);
            return executeRateLimiterNode({ ...config, behavior: "reject" }, context);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Timed out in queue
    const result: RateLimiterNodeResult = {
        passed: false,
        queued: true,
        waitTime: Date.now() - startTime,
        queuePosition: -1,
        currentCount,
        limit: config.limit,
        resetIn: 0
    };
    return result as unknown as JsonObject;
}

function getNestedValue(obj: JsonObject, path: string): unknown {
    return path.split(".").reduce((current, key) => {
        return current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined;
    }, obj as unknown);
}
```

### Circuit Breaker Executor

```typescript
// backend/src/temporal/activities/node-executors/enterprise/circuit-breaker-executor.ts
import { createClient } from "redis";
import type { JsonObject } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import type { CircuitBreakerNodeConfig, CircuitBreakerNodeResult, CircuitState } from "./types";

const redis = createClient({
    socket: { host: config.redis.host, port: config.redis.port }
});

let isConnected = false;
async function ensureRedisConnection() {
    if (!isConnected) {
        await redis.connect();
        isConnected = true;
    }
}

const DEFAULT_CIRCUIT_STATE: CircuitState = {
    state: "closed",
    failureCount: 0,
    successCount: 0
};

export async function executeCircuitBreakerNode(
    nodeConfig: CircuitBreakerNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    await ensureRedisConnection();

    const circuitKey = `circuit:${nodeConfig.circuitId}`;
    let state = await getCircuitState(circuitKey);

    // Check if circuit should transition
    state = await checkStateTransition(state, nodeConfig, circuitKey);

    // Handle based on current state
    let result: CircuitBreakerNodeResult;

    switch (state.state) {
        case "open":
            result = handleOpenCircuit(state, nodeConfig);
            break;
        case "half-open":
            result = handleHalfOpenCircuit(state, nodeConfig);
            break;
        case "closed":
        default:
            result = handleClosedCircuit(state, nodeConfig);
            break;
    }

    if (nodeConfig.outputVariable) {
        return {
            ...context,
            [nodeConfig.outputVariable]: result
        } as unknown as JsonObject;
    }
    return { ...context, ...result } as unknown as JsonObject;
}

async function getCircuitState(key: string): Promise<CircuitState> {
    const stateJson = await redis.get(key);
    if (!stateJson) {
        return { ...DEFAULT_CIRCUIT_STATE };
    }
    return JSON.parse(stateJson);
}

async function setCircuitState(key: string, state: CircuitState): Promise<void> {
    await redis.set(key, JSON.stringify(state));
}

async function checkStateTransition(
    state: CircuitState,
    config: CircuitBreakerNodeConfig,
    key: string
): Promise<CircuitState> {
    const now = Date.now();

    // Open -> Half-Open transition
    if (state.state === "open" && state.openedAt) {
        if (now - state.openedAt >= config.halfOpenTimeoutMs) {
            state = {
                ...state,
                state: "half-open",
                successCount: 0
            };
            await setCircuitState(key, state);
        }
    }

    // Clean up old failures outside window
    if (state.state === "closed" && state.lastFailureTime) {
        if (now - state.lastFailureTime > config.failureWindowMs) {
            state = {
                ...state,
                failureCount: 0,
                lastFailureTime: undefined
            };
            await setCircuitState(key, state);
        }
    }

    return state;
}

function handleOpenCircuit(
    state: CircuitState,
    config: CircuitBreakerNodeConfig
): CircuitBreakerNodeResult {
    // Circuit is open - fail fast
    const result: CircuitBreakerNodeResult = {
        allowed: false,
        circuitState: "open",
        failedFast: true,
        fallbackUsed: config.fallbackAction !== "error",
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailure: state.lastFailureTime ? new Date(state.lastFailureTime) : undefined
    };

    if (config.fallbackAction === "error") {
        throw new Error(`Circuit breaker ${config.circuitId} is OPEN`);
    }

    return result;
}

function handleHalfOpenCircuit(
    state: CircuitState,
    config: CircuitBreakerNodeConfig
): CircuitBreakerNodeResult {
    // Allow limited traffic through to test
    return {
        allowed: true,
        circuitState: "half-open",
        failedFast: false,
        fallbackUsed: false,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailure: state.lastFailureTime ? new Date(state.lastFailureTime) : undefined
    };
}

function handleClosedCircuit(
    state: CircuitState,
    _config: CircuitBreakerNodeConfig
): CircuitBreakerNodeResult {
    // Circuit is closed - allow all traffic
    return {
        allowed: true,
        circuitState: "closed",
        failedFast: false,
        fallbackUsed: false,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailure: state.lastFailureTime ? new Date(state.lastFailureTime) : undefined
    };
}

/**
 * Call this after the protected operation succeeds
 */
export async function recordCircuitSuccess(
    circuitId: string,
    config: CircuitBreakerNodeConfig
): Promise<void> {
    await ensureRedisConnection();

    const key = `circuit:${circuitId}`;
    const state = await getCircuitState(key);

    if (state.state === "half-open") {
        state.successCount++;

        if (state.successCount >= config.successThreshold) {
            // Close the circuit
            await setCircuitState(key, {
                state: "closed",
                failureCount: 0,
                successCount: 0
            });
        } else {
            await setCircuitState(key, state);
        }
    }
}

/**
 * Call this after the protected operation fails
 */
export async function recordCircuitFailure(
    circuitId: string,
    config: CircuitBreakerNodeConfig,
    error: Error
): Promise<void> {
    await ensureRedisConnection();

    // Check if error should be counted
    if (config.monitoredErrors !== "all") {
        const errorMatches = config.monitoredErrors.some(
            (pattern) => error.message.includes(pattern) || error.name.includes(pattern)
        );
        if (!errorMatches) {
            return; // Don't count this error
        }
    }

    const key = `circuit:${circuitId}`;
    const state = await getCircuitState(key);
    const now = Date.now();

    state.failureCount++;
    state.lastFailureTime = now;

    if (state.state === "half-open") {
        // Any failure in half-open opens the circuit
        state.state = "open";
        state.openedAt = now;
    } else if (state.failureCount >= config.failureThreshold) {
        // Threshold exceeded - open the circuit
        state.state = "open";
        state.openedAt = now;
    }

    await setCircuitState(key, state);
}
```

### Circuit Breaker Wrapper (for use in workflows)

```typescript
// backend/src/temporal/activities/node-executors/enterprise/circuit-breaker-wrapper.ts
import type { JsonObject } from "@flowmaestro/shared";
import {
    executeCircuitBreakerNode,
    recordCircuitSuccess,
    recordCircuitFailure
} from "./circuit-breaker-executor";
import type { CircuitBreakerNodeConfig, CircuitBreakerNodeResult } from "./types";

/**
 * Wrap a node executor with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
    config: CircuitBreakerNodeConfig,
    context: JsonObject,
    operation: () => Promise<T>
): Promise<{ result?: T; circuitResult: CircuitBreakerNodeResult }> {
    // Check circuit state first
    const circuitResult = await executeCircuitBreakerNode(config, context);
    const cbResult = circuitResult as unknown as CircuitBreakerNodeResult;

    if (!cbResult.allowed) {
        // Circuit is open - return fallback
        if (config.fallbackAction === "default" && config.fallbackValue !== undefined) {
            return {
                result: config.fallbackValue as T,
                circuitResult: cbResult
            };
        }
        if (config.fallbackAction === "skip") {
            return { circuitResult: cbResult };
        }
        throw new Error(`Circuit ${config.circuitId} is open`);
    }

    // Execute the operation
    try {
        const result = await operation();
        await recordCircuitSuccess(config.circuitId, config);
        return { result, circuitResult: cbResult };
    } catch (error) {
        await recordCircuitFailure(config.circuitId, config, error as Error);
        throw error;
    }
}
```

---

## Node Registration

```typescript
// Add to backend/src/shared/registry/node-registry.ts

{
    type: "rate-limiter",
    name: "Rate Limiter",
    description: "Control request rate to prevent overload or API limit violations",
    category: "tools",
    subcategory: "enterprise",
    keywords: ["rate", "limit", "throttle", "queue", "api", "control"],
    isEnterprise: true,
    inputs: [{ name: "data", type: "any", required: false }],
    outputs: [
        { name: "passed", type: "boolean" },
        { name: "queued", type: "boolean" },
        { name: "waitTime", type: "number" },
        { name: "data", type: "any" }
    ],
    configSchema: { /* RateLimiterNodeConfig schema */ }
},
{
    type: "circuit-breaker",
    name: "Circuit Breaker",
    description: "Prevent cascading failures by failing fast when services are down",
    category: "tools",
    subcategory: "enterprise",
    keywords: ["circuit", "breaker", "resilience", "fallback", "failure"],
    isEnterprise: true,
    inputs: [{ name: "data", type: "any", required: false }],
    outputs: [
        { name: "allowed", type: "boolean" },
        { name: "circuitState", type: "string" },
        { name: "data", type: "any" }
    ],
    configSchema: { /* CircuitBreakerNodeConfig schema */ }
}
```

---

## Unit Tests

### Test Pattern

**Pattern D (Mock Redis)**: Mock Redis for rate limiting state and circuit breaker state.

### Files to Create

| Executor       | Test File                                                                        | Pattern |
| -------------- | -------------------------------------------------------------------------------- | ------- |
| RateLimiter    | `backend/tests/unit/node-executors/operational/rate-limiter-executor.test.ts`    | D       |
| CircuitBreaker | `backend/tests/unit/node-executors/operational/circuit-breaker-executor.test.ts` | D       |

### Mock Setup

```typescript
import { MockRedis } from "../../../mocks/redis.mock";

let mockRedis: MockRedis;
beforeEach(() => {
    mockRedis = new MockRedis();
    jest.spyOn(redis, "getClient").mockReturnValue(mockRedis);
});
```

### Required Test Cases

#### rate-limiter-executor.test.ts

- `should allow requests under limit`
- `should reject requests over limit`
- `should reset count after window expires`
- `should support per-key rate limiting`
- `should queue requests in queue mode`
- `should handle concurrent requests correctly`

#### circuit-breaker-executor.test.ts

- `should allow requests when circuit closed`
- `should open circuit after failure threshold`
- `should reject requests when circuit open`
- `should half-open after reset timeout`
- `should close circuit on successful probe`
- `should track failure/success metrics`

---

## Test Workflow: Resilient API Calls

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Loop      │───▶│ Rate         │───▶│ Circuit     │───▶│ HTTP        │
│ (items)     │    │ Limiter      │    │ Breaker     │    │ Request     │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                   10 req/sec          5 failures opens
```

**Test**: Process 100 items with rate limiting, handle API failures gracefully

---

## Rate Limiter Algorithms

### Token Bucket

```
┌──────────────────────────────────────────┐
│ Bucket: 10 tokens, refill 1/second       │
│                                          │
│ Request arrives:                         │
│   - If token available → proceed         │
│   - If no token → queue or reject        │
└──────────────────────────────────────────┘
```

### Sliding Window

```
┌──────────────────────────────────────────┐
│ Window: last 60 seconds                  │
│ Limit: 100 requests                      │
│                                          │
│ Count requests in window:                │
│   - If < 100 → proceed                   │
│   - If >= 100 → wait or reject           │
└──────────────────────────────────────────┘
```

---

## Circuit Breaker States

```
                 success
          ┌─────────────────┐
          │                 │
          ▼                 │
     ┌─────────┐       ┌─────────┐
     │ CLOSED  │──────▶│  OPEN   │
     │         │ fail  │         │
     └─────────┘ x5    └─────────┘
          ▲                 │
          │                 │ timeout
          │            ┌────┴────┐
          │            ▼         │
          │       ┌─────────┐    │
          └───────│HALF-OPEN│    │
            ok    │         │    │
                  └─────────┘    │
                       │ fail    │
                       └─────────┘
```

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/tools/enterprise/
├── RateLimiterNode.tsx
├── CircuitBreakerNode.tsx
├── config/
│   ├── RateLimiterNodeConfig.tsx
│   └── CircuitBreakerNodeConfig.tsx
└── index.ts
```

### Backend

```
backend/src/temporal/activities/node-executors/enterprise/
├── rate-limiter-executor.ts
└── circuit-breaker-executor.ts

backend/src/services/enterprise/
├── rate-limiter.ts
├── circuit-breaker.ts
└── metrics-collector.ts
```

---

## How to Deliver

1. Register both nodes in `node-registry.ts` with `isEnterprise: true`
2. Implement rate limiting with Redis (distributed)
3. Implement circuit breaker state machine
4. Create frontend node components
5. Create config forms with visual limit editors
6. Add metrics/monitoring for limits and breaker state
7. Test under load conditions

---

## How to Test

| Test               | Expected Result                    |
| ------------------ | ---------------------------------- |
| Rate 10/s, send 15 | 10 pass, 5 queued/rejected         |
| Rate with queue    | Queued requests processed in order |
| Circuit 5 failures | Circuit opens, requests fail fast  |
| Circuit timeout    | Moves to half-open state           |
| Circuit success    | Closes after threshold             |

### Integration Tests

```typescript
describe("Rate Limiter", () => {
    it("enforces rate limit", async () => {
        const results = await Promise.all(
            Array(15)
                .fill(null)
                .map(() =>
                    executeRateLimiter({
                        limit: 10,
                        window: "second",
                        behavior: "reject"
                    })
                )
        );

        const passed = results.filter((r) => !r.rejected);
        const rejected = results.filter((r) => r.rejected);

        expect(passed.length).toBe(10);
        expect(rejected.length).toBe(5);
    });
});

describe("Circuit Breaker", () => {
    it("opens after failures", async () => {
        // Simulate 5 failures
        for (let i = 0; i < 5; i++) {
            await executeCircuitBreaker({ simulateFailure: true });
        }

        const state = await getCircuitState();
        expect(state).toBe("open");

        // Next request should fail fast
        const result = await executeCircuitBreaker({});
        expect(result.failedFast).toBe(true);
    });
});
```

---

## Acceptance Criteria

- [ ] Rate Limiter enforces requests per second
- [ ] Rate Limiter enforces requests per minute/hour
- [ ] Rate Limiter supports per-key limiting
- [ ] Rate Limiter queues requests when configured
- [ ] Rate Limiter reports wait time
- [ ] Circuit Breaker opens after N failures
- [ ] Circuit Breaker enters half-open after timeout
- [ ] Circuit Breaker closes after N successes
- [ ] Circuit Breaker returns fallback when open
- [ ] Both nodes show metrics in UI
- [ ] Both nodes show "Enterprise" badge

---

## Dependencies

These nodes protect against API rate limits and cascading failures.
