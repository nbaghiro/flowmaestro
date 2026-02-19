# Nango Test Infrastructure Analysis

> Reference document comparing Nango's integration provider testing patterns with FlowMaestro's current approach.

## Overview

[Nango](https://github.com/NangoHQ/nango) is an open-source integration platform with 200+ provider connectors. Their test infrastructure demonstrates mature patterns for testing OAuth flows, credential management, and external API interactions.

---

## Key Patterns from Nango

### 1. Containerized Test Infrastructure

**Location:** `/tests/setup.ts`

Nango spins up real services for integration tests:

```typescript
import { PostgreSqlContainer, ElasticsearchContainer } from "testcontainers";

export async function setup() {
    const [pg, es, redis, mq] = await Promise.all([
        new PostgreSqlContainer("postgres:15.5-alpine").withDatabase("postgres").start(),
        new ElasticsearchContainer("elasticsearch:8.13.0").start(),
        new GenericContainer("redis:8.0.4-alpine").start(),
        new GenericContainer("activemq:5.18.3").start()
    ]);

    // Set environment variables dynamically
    process.env.NANGO_DATABASE_URL = pg.getConnectionUri();
    process.env.NANGO_LOGS_ES_URL = es.getHttpUrl();
}
```

**Why it matters:**

- Catches SQL/migration issues before production
- Tests real transaction behavior
- Validates connection pooling

---

### 2. Composable Seeder System

**Location:** `/packages/shared/lib/seeders/`

Seeders build on each other hierarchically:

```typescript
// Global convenience function
export async function seedAccountEnvAndUser() {
    const account = await createAccount();
    const env = await createEnvironmentSeed(account);
    const user = await seedUser(account);
    const plan = await createPlanSeed(account);
    return { account, env, user, plan };
}

// Individual seeders
export async function createConnectionSeed({
    env,
    provider,
    rawCredentials
}: ConnectionSeedOptions) {
    return connectionService.upsertConnection({
        connectionId: generateId(),
        providerConfigKey: provider,
        parsedRawCredentials: rawCredentials,
        environmentId: env.id
    });
}

// Preset credential factories
export function getTestOAuth2Credentials(): OAuth2Credentials {
    return {
        type: "OAUTH2",
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: new Date(Date.now() + 3600000)
    };
}
```

**Benefits:**

- DRY test setup code
- Easy to create complex scenarios
- Consistent test data across suite

---

### 3. OAuth Token Refresh Testing

**Location:** `/packages/shared/lib/services/connections/credentials/refresh.integration.test.ts`

Comprehensive coverage of refresh scenarios:

```typescript
describe("OAuth2 Token Refresh", () => {
    it("should refresh expired token", async () => {
        const connection = await createConnectionSeed({
            env,
            provider: "airtable",
            rawCredentials: {
                type: "OAUTH2",
                access_token: "expired-token",
                refresh_token: "valid-refresh",
                expires_at: new Date(Date.now() - 1000) // Expired
            }
        });

        vi.spyOn(connectionService, "getNewCredentials").mockResolvedValue(
            Ok({
                access_token: "new-token",
                expires_at: new Date(Date.now() + 3600000)
            })
        );

        const result = await refreshOrTestCredentials({ connection });

        expect(result.last_refresh_success).toBeDefined();
        expect(decrypted.access_token).toBe("new-token");
    });

    it("should decide based on refresh margin", async () => {
        // Tests REFRESH_MARGIN_S constant (tokens refreshed early)
        const result = shouldRefreshCredentials(credentials, provider);
        expect(result.shouldRefresh).toBe(true);
        expect(result.reason).toBe("expiring_soon");
    });
});
```

**Patterns:**

- Test both successful and failed refresh
- Verify database persistence of new tokens
- Test decision logic separately from execution
- Provider-specific behaviors (e.g., Facebook always refreshes)

---

### 4. Real External API Tests

**Location:** `/packages/server/lib/controllers/proxy/allProxy.integration.test.ts`

Selective tests against real APIs:

```typescript
it("should call the proxy", async () => {
    const { env } = await seeders.seedAccountEnvAndUser();
    const integration = await seeders.createConfigSeed(env, "github", "github");
    const connection = await seeders.createConnectionSeed({
        env,
        config_id: integration.id,
        provider: "github"
    });

    // Actually calls api.github.com
    const res = await api.fetch("/proxy/users/octocat", {
        headers: {
            "connection-id": connection.connection_id,
            "provider-config-key": integration.unique_key
        }
    });

    expect(res.json).toMatchObject({
        login: "octocat",
        avatar_url: expect.stringContaining("githubusercontent.com")
    });
});
```

**When to use real APIs:**

- Public endpoints (no auth required)
- Stable, well-known data (GitHub's octocat user)
- Validating response format hasn't changed

---

### 5. Webhook Signature Verification

**Location:** `/packages/server/lib/webhook/hubspot-webhook-routing.unit.test.ts`

Provider-specific signature testing:

```typescript
// Mock crypto for controlled testing
vi.mock("crypto", async () => ({
    ...(await vi.importActual("crypto")),
    timingSafeEqual: () => true // Control signature validation
}));

describe("HubSpot Webhook Routing", () => {
    it("should verify signature and route events", async () => {
        const body = [{ eventType: "contact.created", objectId: "123" }];

        // HubSpot uses: sha256(client_secret + body)
        const signature = crypto
            .createHash("sha256")
            .update(`${integration.oauth_client_secret}${JSON.stringify(body)}`)
            .digest("hex");

        await HubspotWebhookRouting.default(nango, { "x-hubspot-signature": signature }, body);

        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: "contact.created" })
        );
    });
});
```

**Provider signature methods:**

| Provider | Algorithm               | Headers                                          |
| -------- | ----------------------- | ------------------------------------------------ |
| HubSpot  | SHA256(secret + body)   | `x-hubspot-signature`                            |
| Slack    | HMAC-SHA256(v0:ts:body) | `x-slack-signature`, `x-slack-request-timestamp` |
| GitHub   | HMAC-SHA256(body)       | `x-hub-signature-256`                            |
| Stripe   | HMAC-SHA256(ts.body)    | `stripe-signature`                               |

---

### 6. Type-Safe API Test Client

**Location:** `/packages/server/lib/utils/tests.ts`

Fully typed test client with type guards:

```typescript
export async function runServer() {
    await multipleMigrations();
    const server = createServer(express().use(router));
    const port = await getPort();

    return new Promise((resolve) => {
        server.listen(port, () => {
            resolve({
                server,
                url: `http://localhost:${port}`,
                fetch: apiFetch(`http://localhost:${port}`)
            });
        });
    });
}

// Type guard for response validation
export function isSuccess<T>(json: T | ErrorResponse): json is T {
    return !("error" in json);
}

export function shouldBeProtected(response: Response) {
    expect(response.status).toBe(401);
    expect(response.json).toMatchObject({
        error: { code: "unauthorized" }
    });
}

// Usage
const res = await api.fetch("/providers", { token: env.secret_key });
isSuccess(res.json); // Narrows type
expect(res.json.data).toBeArray();
```

---

### 7. Custom Test Matchers

**Location:** `/tests/setupFiles.ts`

Domain-specific assertions:

```typescript
expect.extend({
    toBeIsoDate(received) {
        const pass = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(received);
        return { pass, message: () => `Expected ISO date` };
    },

    toBeSha256(received) {
        const pass = /^[a-f0-9]{64}$/.test(received);
        return { pass, message: () => `Expected SHA-256 hash` };
    },

    toBeUUID(received) {
        const pass = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            received
        );
        return { pass, message: () => `Expected UUID v4` };
    },

    toBeWithinMs(received: Date, expected: Date, toleranceMs: number) {
        const diff = Math.abs(received.getTime() - expected.getTime());
        const pass = diff <= toleranceMs;
        return { pass, message: () => `Expected within ${toleranceMs}ms` };
    }
});
```

---

## FlowMaestro Current State

### What We Have

| Area                | Status          | Notes                     |
| ------------------- | --------------- | ------------------------- |
| Test framework      | Jest            | Solid foundation          |
| Test count          | ~900            | Good coverage             |
| Mock infrastructure | Comprehensive   | All external calls mocked |
| Fixtures            | Basic factories | Not composable            |
| API route tests     | Good            | `fastify.inject()` based  |
| Workflow tests      | Excellent       | 150+ scenarios            |

### What We're Missing

| Area                    | Gap                       | Impact                 |
| ----------------------- | ------------------------- | ---------------------- |
| Containerized DB tests  | No real PostgreSQL/Redis  | Miss SQL bugs          |
| Composable seeders      | Manual setup in each test | DRY violation          |
| OAuth refresh tests     | Minimal coverage          | Auth failures in prod  |
| Webhook signature tests | None observed             | Security risk          |
| Real API tests          | Zero                      | API changes undetected |
| Custom matchers         | None                      | Verbose assertions     |

---

## Comparison Table

| Feature                 | Nango                     | FlowMaestro     |
| ----------------------- | ------------------------- | --------------- |
| Test framework          | Vitest                    | Jest            |
| Containerized services  | PostgreSQL, Redis, ES, MQ | None            |
| Real external API tests | Yes (selective)           | No              |
| Seeder system           | Composable, hierarchical  | Basic factories |
| OAuth refresh tests     | Comprehensive             | Limited         |
| Webhook signature tests | Per-provider              | Unknown         |
| Custom matchers         | 4 matchers                | None            |
| Type-safe test client   | Yes                       | Basic           |
| Test execution          | <20s                      | <10s            |
| Total tests             | ~1000                     | ~900            |

---

## Recommended Adoptions

### High Priority

1. **TestContainers** - Real database testing catches issues mocks miss
2. **Seeder system** - Reduces test setup boilerplate by 50%+
3. **OAuth refresh tests** - Critical path for integration reliability

### Medium Priority

4. **Webhook signature tests** - Security hygiene
5. **Real API tests** - Detect breaking changes early

### Low Priority

6. **Custom matchers** - Nice to have, improves readability
7. **Typed test client** - Optional DX improvement

---

## References

- Nango GitHub: https://github.com/NangoHQ/nango
- TestContainers: https://testcontainers.com/
- Vitest: https://vitest.dev/ (Nango's test runner)
