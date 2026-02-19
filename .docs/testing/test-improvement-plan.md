# Integration Provider Test Improvement Plan

> Based on analysis of Nango's test infrastructure patterns applied to FlowMaestro's integration provider system.

## Executive Summary

FlowMaestro has a solid test foundation (~900 tests, <10s execution) but relies heavily on mocks. This plan proposes targeted improvements to catch real-world integration issues earlier, particularly for the 152 integration providers.

**Key Gaps Identified:**

1. No containerized database testing (real PostgreSQL/Redis)
2. Limited OAuth token refresh testing
3. No real external API tests (even for public endpoints)
4. Provider-specific webhook signature verification not tested
5. No composable seeder system for integration tests

---

## Improvement Areas

### 1. Containerized Test Infrastructure

**Current State:** All database operations mocked via `jest.mock()`

**Problem:** Mocks don't catch:

- SQL syntax errors
- Migration issues
- Transaction edge cases
- Connection pooling bugs
- Redis serialization issues

**Proposed Solution:** Add TestContainers for integration tests

```
Priority: HIGH
Effort: MEDIUM (3-5 days)
Impact: Catches database bugs before production
```

**Implementation:**

```typescript
// backend/tests/setup/containers.ts
import { PostgreSqlContainer, RedisContainer } from "testcontainers";

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export async function setupTestContainers() {
    [pgContainer, redisContainer] = await Promise.all([
        new PostgreSqlContainer("postgres:15-alpine").withDatabase("flowmaestro_test").start(),
        new RedisContainer("redis:7-alpine").start()
    ]);

    process.env.DATABASE_URL = pgContainer.getConnectionUri();
    process.env.REDIS_URL = redisContainer.getConnectionUri();
}

export async function teardownTestContainers() {
    await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
}
```

**Jest Configuration:**

```javascript
// jest.integration.config.js
module.exports = {
    ...baseConfig,
    displayName: "integration-db",
    testMatch: ["**/*.db.test.ts"],
    globalSetup: "./tests/setup/containers.ts",
    globalTeardown: "./tests/setup/teardown.ts",
    testTimeout: 30000,
    maxWorkers: 1 // Sequential to avoid DB conflicts
};
```

**Files to Create:**

- `backend/tests/setup/containers.ts`
- `backend/tests/setup/teardown.ts`
- `backend/jest.integration.config.js`
- `backend/package.json` (add testcontainers dependency)

---

### 2. Composable Seeder System

**Current State:** Test data created inline or via simple factories in `fixtures/`

**Problem:**

- Duplicated setup code across tests
- Hard to create complex test scenarios (user + workspace + connection + provider)
- No relationship management between entities

**Proposed Solution:** Hierarchical seeder system

```
Priority: HIGH
Effort: MEDIUM (2-3 days)
Impact: Faster test writing, more realistic scenarios
```

**Implementation:**

```typescript
// backend/tests/seeders/index.ts
export * from "./user.seeder";
export * from "./workspace.seeder";
export * from "./connection.seeder";
export * from "./provider.seeder";

// Convenience function for full setup
export async function seedFullEnvironment(overrides?: Partial<SeedOptions>) {
    const user = await seedUser(overrides?.user);
    const workspace = await seedWorkspace({ owner: user, ...overrides?.workspace });
    const connection = await seedConnection({ workspace, ...overrides?.connection });
    return { user, workspace, connection };
}
```

```typescript
// backend/tests/seeders/connection.seeder.ts
import { connectionRepository } from "@/storage/repositories";
import { encryptionService } from "@/services/encryption";

interface ConnectionSeedOptions {
    workspace: Workspace;
    provider?: string;
    connectionMethod?: "api_key" | "oauth2" | "basic_auth";
    rawCredentials?: Record<string, any>;
    status?: "active" | "inactive";
}

export async function seedConnection(options: ConnectionSeedOptions): Promise<Connection> {
    const {
        workspace,
        provider = "openai",
        connectionMethod = "api_key",
        rawCredentials = { api_key: "test-key-12345" },
        status = "active"
    } = options;

    return connectionRepository.create({
        workspace_id: workspace.id,
        user_id: workspace.owner_id,
        provider,
        connection_method: connectionMethod,
        encrypted_data: encryptionService.encrypt(rawCredentials),
        status,
        name: `Test ${provider} connection`
    });
}

// Preset factories for common scenarios
export function getOAuth2Credentials(overrides?: Partial<OAuth2Credentials>): OAuth2Credentials {
    return {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: Date.now() + 3600 * 1000, // 1 hour from now
        scope: ["read", "write"],
        ...overrides
    };
}

export function getExpiredOAuth2Credentials(): OAuth2Credentials {
    return getOAuth2Credentials({
        expires_at: Date.now() - 1000 // Expired
    });
}

export function getExpiringOAuth2Credentials(minutesUntilExpiry: number): OAuth2Credentials {
    return getOAuth2Credentials({
        expires_at: Date.now() + minutesUntilExpiry * 60 * 1000
    });
}
```

**Directory Structure:**

```
backend/tests/seeders/
├── index.ts                 # Export all + convenience functions
├── user.seeder.ts           # User creation
├── workspace.seeder.ts      # Workspace + membership
├── connection.seeder.ts     # Connections with credentials
├── provider.seeder.ts       # Provider configurations
├── workflow.seeder.ts       # Workflow definitions
└── execution.seeder.ts      # Execution records
```

---

### 3. OAuth Token Refresh Test Suite

**Current State:** Token refresh logic exists but limited test coverage

**Problem:**

- Background scheduler not tested
- Edge cases (expired refresh token, partial failures) not covered
- Credential update persistence not verified

**Proposed Solution:** Comprehensive refresh testing

```
Priority: HIGH
Effort: MEDIUM (2-3 days)
Impact: Prevents auth failures in production
```

**Implementation:**

```typescript
// backend/src/integrations/core/__tests__/token-refresh.test.ts
import { seedConnection, getExpiringOAuth2Credentials } from "@tests/seeders";
import { oauthService } from "@/services/oauth";
import { connectionRepository } from "@/storage/repositories";
import { CredentialRefreshScheduler } from "@/services/oauth/scheduler";

describe("OAuth Token Refresh", () => {
    describe("On-Demand Refresh", () => {
        it("should refresh token expiring within 5 minutes", async () => {
            const connection = await seedConnection({
                workspace,
                provider: "slack",
                connectionMethod: "oauth2",
                rawCredentials: getExpiringOAuth2Credentials(4) // 4 min until expiry
            });

            const refreshSpy = jest.spyOn(oauthService, "refreshToken").mockResolvedValue({
                access_token: "new-token",
                expires_at: Date.now() + 3600 * 1000
            });

            const client = await getAuthenticatedClient(connection);

            expect(refreshSpy).toHaveBeenCalledWith(
                "slack",
                expect.objectContaining({ refresh_token: "test-refresh-token" })
            );
        });

        it("should NOT refresh token with >5 minutes remaining", async () => {
            const connection = await seedConnection({
                workspace,
                provider: "slack",
                connectionMethod: "oauth2",
                rawCredentials: getExpiringOAuth2Credentials(10) // 10 min until expiry
            });

            const refreshSpy = jest.spyOn(oauthService, "refreshToken");

            await getAuthenticatedClient(connection);

            expect(refreshSpy).not.toHaveBeenCalled();
        });

        it("should update database with new tokens after refresh", async () => {
            const connection = await seedConnection({
                workspace,
                provider: "slack",
                connectionMethod: "oauth2",
                rawCredentials: getExpiringOAuth2Credentials(2)
            });

            jest.spyOn(oauthService, "refreshToken").mockResolvedValue({
                access_token: "brand-new-token",
                refresh_token: "brand-new-refresh",
                expires_at: Date.now() + 7200 * 1000
            });

            await getAuthenticatedClient(connection);

            const updated = await connectionRepository.findById(connection.id);
            const decrypted = encryptionService.decrypt(updated.encrypted_data);

            expect(decrypted.access_token).toBe("brand-new-token");
            expect(decrypted.refresh_token).toBe("brand-new-refresh");
        });

        it("should handle refresh token expiration gracefully", async () => {
            const connection = await seedConnection({
                workspace,
                provider: "slack",
                connectionMethod: "oauth2",
                rawCredentials: getExpiringOAuth2Credentials(2)
            });

            jest.spyOn(oauthService, "refreshToken").mockRejectedValue(
                new OAuthError("invalid_grant", "Refresh token expired")
            );

            await expect(getAuthenticatedClient(connection)).rejects.toThrow(
                "Refresh token expired"
            );

            // Verify connection marked as needing re-auth
            const updated = await connectionRepository.findById(connection.id);
            expect(updated.status).toBe("requires_reauth");
        });
    });

    describe("Background Scheduler", () => {
        it("should refresh tokens expiring within 10 minutes", async () => {
            await seedConnection({
                workspace,
                provider: "slack",
                rawCredentials: getExpiringOAuth2Credentials(8)
            });
            await seedConnection({
                workspace,
                provider: "github",
                rawCredentials: getExpiringOAuth2Credentials(15) // Won't refresh
            });

            const refreshSpy = jest
                .spyOn(oauthService, "refreshToken")
                .mockResolvedValue({ access_token: "new", expires_at: future });

            const scheduler = new CredentialRefreshScheduler();
            await scheduler.runRefreshCycle();

            expect(refreshSpy).toHaveBeenCalledTimes(1); // Only slack
        });

        it("should continue on individual refresh failures", async () => {
            await seedConnection({
                workspace,
                provider: "slack",
                rawCredentials: getExpiringOAuth2Credentials(5)
            });
            await seedConnection({
                workspace,
                provider: "github",
                rawCredentials: getExpiringOAuth2Credentials(5)
            });

            const refreshSpy = jest
                .spyOn(oauthService, "refreshToken")
                .mockRejectedValueOnce(new Error("Slack failed"))
                .mockResolvedValueOnce({ access_token: "github-new", expires_at: future });

            const scheduler = new CredentialRefreshScheduler();
            await scheduler.runRefreshCycle();

            expect(refreshSpy).toHaveBeenCalledTimes(2); // Both attempted
        });
    });
});
```

**Files to Create:**

- `backend/src/integrations/core/__tests__/token-refresh.test.ts`
- `backend/src/integrations/core/__tests__/token-refresh.db.test.ts` (with real DB)

---

### 4. Webhook Signature Verification Tests

**Current State:** `verifyWebhookSignature` method exists in BaseProvider but testing unclear

**Problem:**

- Provider-specific signature algorithms not tested
- Timestamp validation (replay attack prevention) not tested
- Edge cases (malformed headers, wrong encoding) not covered

**Proposed Solution:** Per-provider webhook verification tests

```
Priority: MEDIUM
Effort: LOW (1-2 days)
Impact: Prevents webhook spoofing vulnerabilities
```

**Implementation:**

```typescript
// backend/src/integrations/providers/slack/__tests__/webhook.test.ts
import crypto from "crypto";
import { SlackProvider } from "../SlackProvider";

describe("Slack Webhook Verification", () => {
    const signingSecret = "test-signing-secret-12345";
    let provider: SlackProvider;

    beforeEach(() => {
        provider = new SlackProvider();
    });

    it("should verify valid Slack signature (v0)", () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = JSON.stringify({ type: "event_callback", event: {} });

        const sigBaseString = `v0:${timestamp}:${body}`;
        const signature =
            "v0=" + crypto.createHmac("sha256", signingSecret).update(sigBaseString).digest("hex");

        const isValid = provider.verifyWebhookSignature(signingSecret, {
            headers: {
                "x-slack-signature": signature,
                "x-slack-request-timestamp": String(timestamp)
            },
            body
        });

        expect(isValid).toBe(true);
    });

    it("should reject timestamps older than 5 minutes (replay attack)", () => {
        const oldTimestamp = Math.floor(Date.now() / 1000) - 6 * 60; // 6 min ago
        const body = JSON.stringify({ type: "event_callback" });

        const sigBaseString = `v0:${oldTimestamp}:${body}`;
        const signature =
            "v0=" + crypto.createHmac("sha256", signingSecret).update(sigBaseString).digest("hex");

        const isValid = provider.verifyWebhookSignature(signingSecret, {
            headers: {
                "x-slack-signature": signature,
                "x-slack-request-timestamp": String(oldTimestamp)
            },
            body
        });

        expect(isValid).toBe(false);
    });

    it("should reject invalid signature", () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = JSON.stringify({ type: "event_callback" });

        const isValid = provider.verifyWebhookSignature(signingSecret, {
            headers: {
                "x-slack-signature": "v0=invalid-signature",
                "x-slack-request-timestamp": String(timestamp)
            },
            body
        });

        expect(isValid).toBe(false);
    });

    it("should reject missing signature header", () => {
        expect(() =>
            provider.verifyWebhookSignature(signingSecret, {
                headers: { "x-slack-request-timestamp": "12345" },
                body: "{}"
            })
        ).toThrow("Missing x-slack-signature header");
    });
});
```

**Providers to Test:**
| Provider | Signature Method | Headers |
|----------|------------------|---------|
| Slack | HMAC-SHA256 | `x-slack-signature`, `x-slack-request-timestamp` |
| GitHub | HMAC-SHA256 | `x-hub-signature-256` |
| Stripe | HMAC-SHA256 | `stripe-signature` (with timestamp) |
| HubSpot | SHA256 hash | `x-hubspot-signature` |
| Shopify | HMAC-SHA256 | `x-shopify-hmac-sha256` |

**Files to Create:**

- `backend/src/integrations/providers/slack/__tests__/webhook.test.ts`
- `backend/src/integrations/providers/github/__tests__/webhook.test.ts`
- `backend/src/integrations/providers/stripe/__tests__/webhook.test.ts`
- (etc. for high-priority providers)

---

### 5. Real External API Tests (Selective)

**Current State:** All external calls mocked via sandbox/fixtures

**Problem:**

- Provider API changes not detected until production
- Real response formats not validated
- Rate limiting behavior not tested

**Proposed Solution:** Selective real API tests for public endpoints

```
Priority: MEDIUM
Effort: LOW (1 day)
Impact: Early detection of API changes
```

**Implementation:**

```typescript
// backend/tests/integration/providers/github-real.test.ts
/**
 * @group real-api
 * These tests call real external APIs.
 * Run with: npm run test:real-api
 * Skipped in CI by default.
 */
describe("GitHub Provider (Real API)", () => {
    const provider = new GitHubProvider();

    it("should fetch public user data", async () => {
        const result = await provider.executeOperation(
            "getUser",
            { username: "octocat" },
            null, // No connection needed for public endpoints
            { mode: "workflow" }
        );

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            login: "octocat",
            id: 583231,
            type: "User"
        });
    });

    it("should fetch public repository", async () => {
        const result = await provider.executeOperation(
            "getRepository",
            { owner: "octocat", repo: "Hello-World" },
            null,
            { mode: "workflow" }
        );

        expect(result.success).toBe(true);
        expect(result.data.full_name).toBe("octocat/Hello-World");
    });

    it("should handle rate limiting gracefully", async () => {
        // Make rapid requests to potentially trigger rate limit
        const results = await Promise.all(
            Array(10)
                .fill(null)
                .map(() =>
                    provider.executeOperation("getUser", { username: "octocat" }, null, {
                        mode: "workflow"
                    })
                )
        );

        // All should succeed or return rate limit error (not crash)
        results.forEach((r) => {
            expect(r.success || r.error?.code === "RATE_LIMITED").toBe(true);
        });
    });
});
```

**Jest Configuration:**

```javascript
// jest.real-api.config.js
module.exports = {
    ...baseConfig,
    displayName: 'real-api',
    testMatch: ['**/*-real.test.ts'],
    testTimeout: 30000,
    maxWorkers: 1  // Sequential to respect rate limits
};

// package.json
{
    "scripts": {
        "test:real-api": "jest --config jest.real-api.config.js --runInBand"
    }
}
```

---

### 6. Custom Test Matchers

**Current State:** Standard Jest matchers only

**Problem:** Verbose assertions for common patterns

**Proposed Solution:** Domain-specific matchers

```
Priority: LOW
Effort: LOW (0.5 day)
Impact: Cleaner test code, better error messages
```

**Implementation:**

```typescript
// backend/tests/matchers/index.ts
import { expect } from "@jest/globals";

expect.extend({
    toBeIsoDate(received: string) {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        const pass = isoRegex.test(received);
        return {
            pass,
            message: () => `Expected ${received} ${pass ? "not " : ""}to be ISO 8601 date`
        };
    },

    toBeUUID(received: string) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const pass = uuidRegex.test(received);
        return {
            pass,
            message: () => `Expected ${received} ${pass ? "not " : ""}to be UUID v4`
        };
    },

    toBeEncrypted(received: string) {
        // AES-256-GCM format: iv:authTag:ciphertext (base64)
        const parts = received.split(":");
        const pass = parts.length === 3 && parts.every((p) => p.length > 10);
        return {
            pass,
            message: () => `Expected ${received} ${pass ? "not " : ""}to be encrypted`
        };
    },

    toBeSuccessResult(received: OperationResult) {
        const pass = received.success === true && received.data !== undefined;
        return {
            pass,
            message: () => `Expected operation result to ${pass ? "not " : ""}be successful`
        };
    },

    toBeErrorResult(received: OperationResult, expectedCode?: string) {
        const pass =
            received.success === false && (!expectedCode || received.error?.code === expectedCode);
        return {
            pass,
            message: () =>
                `Expected operation result to ${pass ? "not " : ""}be error${expectedCode ? ` with code ${expectedCode}` : ""}`
        };
    }
});

// Type declarations
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeIsoDate(): R;
            toBeUUID(): R;
            toBeEncrypted(): R;
            toBeSuccessResult(): R;
            toBeErrorResult(code?: string): R;
        }
    }
}
```

**Usage:**

```typescript
// Before
expect(response.json.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
expect(response.json.id).toMatch(/^[0-9a-f-]{36}$/);

// After
expect(response.json.created_at).toBeIsoDate();
expect(response.json.id).toBeUUID();
expect(result).toBeSuccessResult();
expect(result).toBeErrorResult("RATE_LIMITED");
```

---

### 7. Type-Safe API Test Client

**Current State:** `fastify.inject()` with manual typing

**Problem:**

- No compile-time validation of endpoints
- Response types not inferred
- Repetitive auth header setup

**Proposed Solution:** Typed test client wrapper

```
Priority: LOW
Effort: MEDIUM (1-2 days)
Impact: Fewer runtime errors in tests
```

**Implementation:**

```typescript
// backend/tests/helpers/typed-client.ts
import { FastifyInstance } from "fastify";
import { ApiRoutes } from "@/api/routes/types";

type RouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface TypedRequestOptions<T extends keyof ApiRoutes> {
    method: RouteMethod;
    token?: string;
    body?: ApiRoutes[T]["body"];
    query?: ApiRoutes[T]["query"];
}

interface TypedResponse<T extends keyof ApiRoutes> {
    status: number;
    json: ApiRoutes[T]["response"];
    headers: Record<string, string>;
}

export function createTypedClient(fastify: FastifyInstance) {
    return {
        async fetch<T extends keyof ApiRoutes>(
            route: T,
            options: TypedRequestOptions<T>
        ): Promise<TypedResponse<T>> {
            const response = await fastify.inject({
                method: options.method,
                url: route as string,
                headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
                payload: options.body,
                query: options.query
            });

            return {
                status: response.statusCode,
                json: JSON.parse(response.body),
                headers: response.headers as Record<string, string>
            };
        }
    };
}

// Usage
const client = createTypedClient(fastify);
const res = await client.fetch("/api/connections", {
    method: "POST",
    token: authToken,
    body: { provider: "slack", connection_method: "oauth2" } // Type-checked!
});
// res.json is typed as ConnectionResponse
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Task                                               | Priority | Effort | Owner |
| -------------------------------------------------- | -------- | ------ | ----- |
| Set up TestContainers infrastructure               | HIGH     | 3 days | -     |
| Create basic seeders (user, workspace, connection) | HIGH     | 2 days | -     |

### Phase 2: OAuth Testing (Week 2)

| Task                                        | Priority | Effort | Owner |
| ------------------------------------------- | -------- | ------ | ----- |
| Token refresh unit tests                    | HIGH     | 1 day  | -     |
| Token refresh integration tests (with DB)   | HIGH     | 1 day  | -     |
| Background scheduler tests                  | HIGH     | 1 day  | -     |
| Edge case tests (expired refresh, failures) | MEDIUM   | 1 day  | -     |

### Phase 3: Provider Security (Week 3)

| Task                              | Priority | Effort  | Owner |
| --------------------------------- | -------- | ------- | ----- |
| Slack webhook verification tests  | MEDIUM   | 0.5 day | -     |
| GitHub webhook verification tests | MEDIUM   | 0.5 day | -     |
| Stripe webhook verification tests | MEDIUM   | 0.5 day | -     |
| Additional provider webhook tests | LOW      | 1 day   | -     |

### Phase 4: Polish (Week 4)

| Task                                      | Priority | Effort   | Owner |
| ----------------------------------------- | -------- | -------- | ----- |
| Custom matchers                           | LOW      | 0.5 day  | -     |
| Real API tests (GitHub, public endpoints) | MEDIUM   | 1 day    | -     |
| Typed test client                         | LOW      | 1.5 days | -     |
| Documentation updates                     | LOW      | 0.5 day  | -     |

---

## Success Metrics

| Metric                             | Current | Target |
| ---------------------------------- | ------- | ------ |
| Integration provider test coverage | ~60%    | 85%    |
| OAuth flow test coverage           | ~40%    | 90%    |
| Webhook verification test coverage | ~20%    | 80%    |
| Tests using real DB                | 0       | 50+    |
| Real external API tests            | 0       | 10+    |

---

## Dependencies

**NPM Packages to Add:**

```json
{
    "devDependencies": {
        "testcontainers": "^10.x",
        "@testcontainers/postgresql": "^10.x",
        "@testcontainers/redis": "^10.x"
    }
}
```

**CI Updates Required:**

- Docker-in-Docker support for TestContainers
- Separate job for `test:real-api` (optional, can skip in CI)
- Increased timeout for integration tests

---

## Risks & Mitigations

| Risk                           | Impact | Mitigation                               |
| ------------------------------ | ------ | ---------------------------------------- |
| TestContainers slow in CI      | Medium | Use container reuse, parallel jobs       |
| Real API tests flaky           | Low    | Mark as optional, use stable endpoints   |
| Breaking existing mocked tests | High   | Phase in gradually, keep both approaches |

---

## Decision Log

| Decision                               | Rationale                              | Date |
| -------------------------------------- | -------------------------------------- | ---- |
| Use TestContainers over Docker Compose | Programmatic control, Jest integration | -    |
| Keep mocked tests alongside DB tests   | Fast feedback loop for unit tests      | -    |
| Selective real API tests only          | Avoid flakiness, rate limits           | -    |

---

## References

- [Nango Test Infrastructure Analysis](./nango-comparison.md)
- [FlowMaestro Testing Guide](../testing-guide.md)
- [TestContainers Documentation](https://testcontainers.com/)
