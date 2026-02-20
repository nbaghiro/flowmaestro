# Prompt: Add API Route Test Suite

Use this prompt to instruct an agent to add a comprehensive test suite for an API route.

---

## Instructions

You are tasked with adding a comprehensive unit test suite for the `{ROUTE_NAME}` API route handlers located at `backend/src/api/routes/{ROUTE_NAME}/`.

### Step 1: Analyze the Route Handlers

First, read all handler files in the route directory to understand:

- What endpoints are exposed (HTTP method + path)
- Request body schemas (look for Zod validation)
- Response structures
- Dependencies (repositories, services, Temporal client)
- Authentication/authorization requirements

```bash
# List all handlers
ls backend/src/api/routes/{ROUTE_NAME}/

# Read the index.ts to see route registration
cat backend/src/api/routes/{ROUTE_NAME}/index.ts
```

### Step 2: Create the Test File

Create the test file at:

```
backend/src/api/routes/{ROUTE_NAME}/__tests__/{ROUTE_NAME}.test.ts
```

### Step 3: Test File Structure

Use this template structure:

```typescript
import { FastifyInstance } from "fastify";
import { buildTestApp, authenticatedRequest, expectStatus } from "../../../../../__tests__/helpers/fastify-test-client";

// Mock repositories
jest.mock("../../../../storage/repositories/{Resource}Repository");
// Mock other dependencies as needed
jest.mock("../../../../services/{ServiceName}");
jest.mock("../../../../temporal/client");

// Import mocked modules
import { {Resource}Repository } from "../../../../storage/repositories/{Resource}Repository";
import { getTemporalClient } from "../../../../temporal/client";

// Type the mocks
const Mock{Resource}Repository = {Resource}Repository as jest.MockedClass<typeof {Resource}Repository>;

describe("{ROUTE_NAME} routes", () => {
    let fastify: FastifyInstance;

    // Test user fixture
    const testUser = {
        id: "user-123",
        email: "test@example.com",
        workspaceId: "workspace-123"
    };

    // Resource fixtures
    const mock{Resource} = {
        id: "resource-123",
        userId: testUser.id,
        workspaceId: testUser.workspaceId,
        name: "Test Resource",
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeAll(async () => {
        fastify = await buildTestApp();
    });

    afterAll(async () => {
        await fastify.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock implementations
        Mock{Resource}Repository.prototype.findById.mockResolvedValue(mock{Resource});
        Mock{Resource}Repository.prototype.findAll.mockResolvedValue([mock{Resource}]);
        Mock{Resource}Repository.prototype.create.mockResolvedValue(mock{Resource});
        Mock{Resource}Repository.prototype.update.mockResolvedValue(mock{Resource});
        Mock{Resource}Repository.prototype.delete.mockResolvedValue(true);
    });

    // ==========================================
    // LIST
    // ==========================================
    describe("GET /{route-path}", () => {
        it("should list resources for authenticated user", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}"
            });

            expectStatus(response, 200);
            expect(response.json().data).toHaveLength(1);
            expect(Mock{Resource}Repository.prototype.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ workspaceId: testUser.workspaceId })
            );
        });

        it("should return empty array when no resources exist", async () => {
            Mock{Resource}Repository.prototype.findAll.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}"
            });

            expectStatus(response, 200);
            expect(response.json().data).toEqual([]);
        });

        it("should support pagination", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}?page=1&limit=10"
            });

            expectStatus(response, 200);
            expect(Mock{Resource}Repository.prototype.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ page: 1, limit: 10 })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/{route-path}"
            });

            expectStatus(response, 401);
        });
    });

    // ==========================================
    // CREATE
    // ==========================================
    describe("POST /{route-path}", () => {
        const validPayload = {
            name: "New Resource",
            // ... other required fields
        };

        it("should create resource with valid data", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/{route-path}",
                payload: validPayload
            });

            expectStatus(response, 201);
            expect(response.json().data).toHaveProperty("id");
            expect(Mock{Resource}Repository.prototype.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...validPayload,
                    workspaceId: testUser.workspaceId
                })
            );
        });

        it("should return 400 for missing required fields", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/{route-path}",
                payload: {}
            });

            expectStatus(response, 400);
            expect(response.json().error).toContain("name");
        });

        it("should return 400 for invalid field format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/{route-path}",
                payload: { name: "" } // Empty string when min length required
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/{route-path}",
                payload: validPayload
            });

            expectStatus(response, 401);
        });
    });

    // ==========================================
    // GET BY ID
    // ==========================================
    describe("GET /{route-path}/:id", () => {
        it("should return resource for owner", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}/resource-123"
            });

            expectStatus(response, 200);
            expect(response.json().data.id).toBe("resource-123");
        });

        it("should return 404 for non-existent resource", async () => {
            Mock{Resource}Repository.prototype.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}/non-existent"
            });

            expectStatus(response, 404);
        });

        it("should return 404 for other user's resource (multi-tenant isolation)", async () => {
            Mock{Resource}Repository.prototype.findById.mockResolvedValue({
                ...mock{Resource},
                workspaceId: "other-workspace"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}/resource-123"
            });

            expectStatus(response, 404);
        });

        it("should return 400 for invalid UUID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/{route-path}/not-a-uuid"
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/{route-path}/resource-123"
            });

            expectStatus(response, 401);
        });
    });

    // ==========================================
    // UPDATE
    // ==========================================
    describe("PATCH /{route-path}/:id", () => {
        it("should update resource with valid data", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/{route-path}/resource-123",
                payload: { name: "Updated Name" }
            });

            expectStatus(response, 200);
            expect(Mock{Resource}Repository.prototype.update).toHaveBeenCalledWith(
                "resource-123",
                expect.objectContaining({ name: "Updated Name" })
            );
        });

        it("should return 404 for non-existent resource", async () => {
            Mock{Resource}Repository.prototype.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/{route-path}/non-existent",
                payload: { name: "Updated" }
            });

            expectStatus(response, 404);
        });

        it("should return 400 for invalid update data", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/{route-path}/resource-123",
                payload: { name: "" }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await fastify.inject({
                method: "PATCH",
                url: "/{route-path}/resource-123",
                payload: { name: "Updated" }
            });

            expectStatus(response, 401);
        });
    });

    // ==========================================
    // DELETE
    // ==========================================
    describe("DELETE /{route-path}/:id", () => {
        it("should delete resource", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/{route-path}/resource-123"
            });

            expectStatus(response, 200);
            expect(Mock{Resource}Repository.prototype.delete).toHaveBeenCalledWith("resource-123");
        });

        it("should return 404 for non-existent resource", async () => {
            Mock{Resource}Repository.prototype.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/{route-path}/non-existent"
            });

            expectStatus(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await fastify.inject({
                method: "DELETE",
                url: "/{route-path}/resource-123"
            });

            expectStatus(response, 401);
        });
    });

    // ==========================================
    // CUSTOM ENDPOINTS (add as needed)
    // ==========================================
    // describe("POST /{route-path}/:id/custom-action", () => { ... });
});
```

### Step 4: Mock Patterns

#### Repository Mocking

```typescript
jest.mock("../../../../storage/repositories/MyRepository");
import { MyRepository } from "../../../../storage/repositories/MyRepository";
const MockMyRepository = MyRepository as jest.MockedClass<typeof MyRepository>;

beforeEach(() => {
    MockMyRepository.prototype.findById.mockResolvedValue(mockResource);
});
```

#### Temporal Client Mocking

```typescript
jest.mock("../../../../temporal/client");
import { getTemporalClient } from "../../../../temporal/client";

const mockWorkflowHandle = {
    workflowId: "workflow-123",
    result: jest.fn().mockResolvedValue({ success: true }),
    signal: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined)
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockWorkflowHandle),
        getHandle: jest.fn().mockReturnValue(mockWorkflowHandle)
    },
    schedule: {
        create: jest.fn().mockResolvedValue({ scheduleId: "schedule-123" })
    }
};

(getTemporalClient as jest.Mock).mockResolvedValue(mockTemporalClient);
```

#### External Service Mocking

```typescript
jest.mock("../../../../services/EmailService");
import { EmailService } from "../../../../services/EmailService";

const MockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
MockEmailService.prototype.send.mockResolvedValue({ messageId: "msg-123" });
```

#### Redis/Cache Mocking

```typescript
jest.mock("../../../../services/cache/RedisCache");
import { redisCache } from "../../../../services/cache/RedisCache";

(redisCache.get as jest.Mock).mockResolvedValue(null);
(redisCache.set as jest.Mock).mockResolvedValue("OK");
```

### Step 5: Test Scenarios Checklist

For each endpoint, ensure you test:

- [ ] **Happy Path** - Successful operation with valid input
- [ ] **Authentication** - 401 without token
- [ ] **Authorization** - 403 without permission (if role-based)
- [ ] **Not Found** - 404 for non-existent resources
- [ ] **Validation** - 400 for invalid input
    - Missing required fields
    - Invalid field types
    - Invalid field formats (email, UUID, etc.)
    - Out-of-range values (min/max length, number bounds)
- [ ] **Multi-tenant Isolation** - Cannot access other workspace's resources
- [ ] **Edge Cases**
    - Empty strings
    - Empty arrays
    - Null values where optional
    - Maximum length strings
    - Special characters in strings

### Step 6: SSE Streaming Endpoints

For SSE endpoints, use this pattern:

```typescript
describe("GET /{route-path}/:id/stream", () => {
    it("should return 401 without authentication", async () => {
        const response = await fastify.inject({
            method: "GET",
            url: "/{route-path}/resource-123/stream"
        });

        expectStatus(response, 401);
    });

    it("should return 404 for non-existent resource", async () => {
        Mock{Resource}Repository.prototype.findById.mockResolvedValue(null);

        const response = await authenticatedRequest(fastify, testUser, {
            method: "GET",
            url: "/{route-path}/resource-123/stream"
        });

        expectStatus(response, 404);
    });

    it("should return 404 for other user's resource", async () => {
        Mock{Resource}Repository.prototype.findById.mockResolvedValue({
            ...mock{Resource},
            workspaceId: "other-workspace"
        });

        const response = await authenticatedRequest(fastify, testUser, {
            method: "GET",
            url: "/{route-path}/resource-123/stream"
        });

        expectStatus(response, 404);
    });

    // Note: Full SSE event testing requires integration tests
    // Unit tests focus on auth and error handling
});
```

### Step 7: File Upload Endpoints

For multipart/form-data endpoints:

```typescript
describe("POST /{route-path}/:id/upload", () => {
    it("should return 400 without multipart content-type", async () => {
        const response = await authenticatedRequest(fastify, testUser, {
            method: "POST",
            url: "/{route-path}/resource-123/upload",
            payload: { file: "not-a-file" }
        });

        expectStatus(response, 400);
    });

    it("should return 401 without authentication", async () => {
        const response = await fastify.inject({
            method: "POST",
            url: "/{route-path}/resource-123/upload"
        });

        expectStatus(response, 401);
    });

    it("should return 404 for non-existent resource", async () => {
        Mock{Resource}Repository.prototype.findById.mockResolvedValue(null);

        // Use form-data for actual upload testing
        const form = new FormData();
        form.append("file", Buffer.from("test"), "test.txt");

        const response = await authenticatedRequest(fastify, testUser, {
            method: "POST",
            url: "/{route-path}/non-existent/upload",
            payload: form,
            headers: form.getHeaders()
        });

        expectStatus(response, 404);
    });
});
```

### Step 8: Webhook Endpoints

For webhook signature verification:

```typescript
import crypto from "crypto";

describe("POST /webhooks/{provider}", () => {
    const webhookSecret = "test-webhook-secret";

    function generateSignature(payload: string): string {
        const timestamp = Math.floor(Date.now() / 1000);
        const signedPayload = `${timestamp}.${payload}`;
        const signature = crypto
            .createHmac("sha256", webhookSecret)
            .update(signedPayload)
            .digest("hex");
        return `t=${timestamp},v1=${signature}`;
    }

    it("should process webhook with valid signature", async () => {
        const payload = JSON.stringify({ type: "event.type", data: {} });
        const signature = generateSignature(payload);

        const response = await fastify.inject({
            method: "POST",
            url: "/webhooks/{provider}",
            payload,
            headers: {
                "content-type": "application/json",
                "{provider}-signature": signature
            }
        });

        expectStatus(response, 200);
    });

    it("should return 401 for invalid signature", async () => {
        const response = await fastify.inject({
            method: "POST",
            url: "/webhooks/{provider}",
            payload: { type: "event.type" },
            headers: {
                "content-type": "application/json",
                "{provider}-signature": "invalid-signature"
            }
        });

        expectStatus(response, 401);
    });

    it("should return 401 for missing signature", async () => {
        const response = await fastify.inject({
            method: "POST",
            url: "/webhooks/{provider}",
            payload: { type: "event.type" }
        });

        expectStatus(response, 401);
    });
});
```

### Step 9: Run and Verify Tests

```bash
# Run the new tests
npm test -- --testPathPattern="{ROUTE_NAME}.test" --no-coverage

# Run with coverage to identify gaps
npm test -- --testPathPattern="{ROUTE_NAME}.test" --coverage

# Verify TypeScript compilation
cd backend && npx tsc --noEmit
```

### Step 10: Quality Verification

Before completing, verify:

1. All handlers in the route have at least one test
2. All tests pass: `npm test -- --testPathPattern="{ROUTE_NAME}.test"`
3. No TypeScript errors: `cd backend && npx tsc --noEmit`
4. Code follows project conventions (4-space indent, double quotes)

---

## Example Agent Invocation

```
Add comprehensive unit tests for the "billing" API route handlers.

The route is located at: backend/src/api/routes/billing/

Follow the test patterns in .docs/prompts/add-api-route-tests.md

Key handlers to test:
- list-subscriptions.ts
- get-subscription.ts
- create-checkout-session.ts
- cancel-subscription.ts
- update-subscription.ts
- get-invoices.ts
- get-usage.ts
- webhook.ts (Stripe webhook with signature verification)

Focus on:
1. Happy path for each endpoint
2. Authentication (401) and authorization (403)
3. Validation errors (400)
4. Not found errors (404)
5. Stripe webhook signature verification
6. Multi-tenant isolation

Create the test file at:
backend/src/api/routes/billing/__tests__/billing.test.ts
```

---

## Routes Needing Tests (Priority Order)

1. **billing** - Payment processing (CRITICAL)
2. **webhooks** - External integrations (CRITICAL)
3. **chat-interfaces** - User-facing feature
4. **public** - External API
5. **folders** - Organization
6. **threads** - Conversation management
7. **personas** - Agent personalities
8. **api-keys** - Key management
9. **checkpoints** - Execution state
10. **persona-instances** - Stateful agents
