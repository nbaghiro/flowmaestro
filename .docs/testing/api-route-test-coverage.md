# API Route Test Coverage Analysis

This document provides a comprehensive analysis of API route handler test coverage, identifying gaps in existing tests and routes that lack tests entirely.

**Last Updated:** 2026-02-19

---

## Executive Summary

| Metric                  | Value       |
| ----------------------- | ----------- |
| Total Route Directories | 28          |
| Total Handler Files     | 266         |
| Handlers with Tests     | 37 (13.9%)  |
| Handlers Without Tests  | 229 (86.1%) |
| Total Test Cases        | 609         |
| Avg Tests Per Handler   | 16.5        |

### Critical Findings

**Three Major Issues:**

1. **Test Organization Problem (39% of all tests)**
    - 9 resources have all tests consolidated in single files instead of colocated with handlers
    - Examples: Form Interfaces (70 tests in 1 file), Workflows (50 tests in 1 file), Chat Interfaces (45 tests in 1 file)
    - Makes it difficult to locate, maintain, and debug tests for specific endpoints

2. **Zero Coverage for Critical Areas**
    - **Billing (10 handlers)** - Payment processing completely untested
    - **Webhooks (11 handlers)** - All integrations untested (Stripe, GitHub, Slack, Discord, etc.)
    - **OAuth flows** - Google/Microsoft authentication callback edge cases untested
    - **Public endpoints (9 handlers)** - External-facing API untested
    - **Password reset flows** - Account recovery edge cases untested

3. **Fragmented Coverage for High-Value Resources**
    - **Agents (14 handlers)** - 155 total tests but 13 handlers lack dedicated tests
    - **Knowledge Bases (14 handlers)** - Only 7% coverage on CRUD operations
    - **Workflows (13 handlers)** - Handler-level tests missing despite 50 total tests

---

## Test Architecture

All colocated API route tests follow this pattern:

```
backend/src/api/routes/{resource}/
├── create.ts
├── list.ts
├── get.ts
├── update.ts
├── delete.ts
├── index.ts
└── __tests__/
    └── {resource}.test.ts    # Single consolidated test file
```

### What's Tested vs Mocked

```
TESTED (Real Code)              MOCKED (Fake Data)
─────────────────               ──────────────────
Fastify server                  Repositories (DB layer)
Route handlers                  External services (Email, SMS)
Middleware (auth, validation)   Temporal client
Zod schema validation           Redis
Error handling                  Rate limiter
JWT signing/verification        SSE/WebSocket
```

### Test Pattern

```typescript
describe("GET /resource/:id", () => {
    it("should return resource for owner", async () => {
        // Arrange: Configure mocks
        const testUser = createTestUser();
        mockRepo.findById.mockResolvedValue(mockResource);

        // Act: Make HTTP request
        const response = await authenticatedRequest(fastify, testUser, {
            method: "GET",
            url: "/resource/123"
        });

        // Assert: Verify response
        expectStatus(response, 200);
        expect(response.json().data.id).toBe("123");
    });
});
```

---

## Routes WITH Tests - Detailed Coverage

### 1. Agents (`/api/routes/agents/`)

**Test Files:** 8 files in `agents/__tests__/`

- `agents.test.ts` (33 tests)
- `crud.test.ts` (30 tests)
- `memory.test.ts` (39 tests)
- `tools.test.ts` (23 tests)
- `execution.test.ts` (13 tests)
- `streaming.test.ts` (8 tests)
- `threads.test.ts` (5 tests)
- `folders.test.ts` (4 tests)

**Total: 155 tests**

| Handler              | Tested | Test Cases                                                                                  |
| -------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `list.ts`            | ✅     | List agents, filter by folder, empty list, auth required                                    |
| `create.ts`          | ✅     | Create with providers (openai/anthropic/google/cohere), validation errors, parameter bounds |
| `get.ts`             | ✅     | Get by ID, not found, invalid UUID                                                          |
| `update.ts`          | ✅     | Update name/temperature/provider, not found, validation                                     |
| `delete.ts`          | ✅     | Delete, not found, multi-tenant isolation                                                   |
| `execute.ts`         | ✅     | Execute with new/existing thread, thread validation, Temporal start, connection override    |
| `stream.ts`          | ✅     | Auth checks, 404 for non-existent/other user's execution, Redis event bus                   |
| `send-message.ts`    | ✅     | Send to running execution, 400 for non-running, Temporal signal                             |
| `get-execution.ts`   | ✅     | Get execution details, 404 for non-existent                                                 |
| `list-executions.ts` | ✅     | List with pagination, filter by status, 404 for non-existent agent                          |
| `add-tool.ts`        | ✅     | Add tool, duplicate name check, 404, validation                                             |
| `add-tools-batch.ts` | ✅     | Batch add, skip duplicates (existing & batch), 404                                          |
| `remove-tool.ts`     | ✅     | Remove tool, 404 for non-existent tool/agent                                                |
| `memory.ts`          | ✅     | Store/retrieve/search memory, TTL expiration, semantic search                               |

**Coverage Assessment: EXCELLENT**

- All core CRUD operations tested
- Execution flow comprehensively tested
- Tool management fully covered
- Memory operations have dedicated test file

**Remaining Gaps:**

- Performance under concurrent executions
- Rate limiting behavior
- Large tool collections handling

---

### 2. Workflows (`/api/routes/workflows/`)

**File:** `workflows/__tests__/workflows.test.ts` (50 test cases)

| Handler                     | Tested | Test Cases                                                                   |
| --------------------------- | ------ | ---------------------------------------------------------------------------- |
| `list.ts`                   | ✅     | List, pagination, folder filter, empty list                                  |
| `create.ts`                 | ✅     | Create workflow, AI-generated flag, validation                               |
| `get.ts`                    | ✅     | Get by ID, not found, multi-tenant                                           |
| `update.ts`                 | ✅     | Update name/definition, not found, multi-tenant                              |
| `delete.ts`                 | ✅     | Soft delete, not found, multi-tenant                                         |
| `execute.ts`                | ✅     | Execute with definition, validation error                                    |
| `upload-files.ts`           | ✅     | Multipart requirement, 401 without auth                                      |
| `generate.ts`               | ✅     | Generate from prompt, validation (short/invalid UUID), service error, auth   |
| `generation-chat.ts`        | ✅     | Chat init returns executionId, create from plan, folderId, validation, auth  |
| `chat.ts`                   | ✅     | Chat returns executionId, null action mode, context/message validation, auth |
| `chat-stream.ts`            | ✅     | SSE streaming tested via integration tests (22 tests)                        |
| `generation-chat-stream.ts` | ✅     | SSE streaming tested via integration tests (12 tests)                        |
| `get-by-system-key.ts`      | ✅     | Admin access, 404 for non-existent, 403 for non-admin, auth                  |

**Coverage Assessment: GOOD**

- All CRUD operations tested
- AI generation features comprehensively tested
- SSE streaming has integration tests

**Remaining Gaps:**

```typescript
describe("POST /workflows/:id/upload-files", () => {
    it("should validate file types"); // Missing
    it("should validate file size limits"); // Missing
    it("should handle multiple files"); // Missing
});
```

---

### 3. Executions (`/api/routes/executions/`)

**File:** `executions/__tests__/executions.test.ts` (36 test cases)

| Handler              | Tested | Test Cases                                                                                  |
| -------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `list.ts`            | ✅     | List, filter by workflow/status, pagination, multi-tenant                                   |
| `get.ts`             | ✅     | Get details, include node outputs, not found, multi-tenant                                  |
| `cancel.ts`          | ✅     | Cancel running, 400 for completed/failed, not found, multi-tenant                           |
| `getLogs.ts`         | ✅     | Get logs, filter by level/nodeId, not found, multi-tenant                                   |
| `stream.ts`          | ✅     | Auth checks, 404 for non-existent/other user's execution                                    |
| `submit-response.ts` | ✅     | Submit to paused, validation (number/boolean/required), 400 for non-paused, Temporal signal |

**Coverage Assessment: EXCELLENT**

- All handlers have comprehensive tests
- Multi-tenant isolation verified
- Human-in-the-loop (submit-response) fully tested

---

### 4. Form Interfaces (`/api/routes/form-interfaces/`)

**File:** `form-interfaces/__tests__/form-interfaces.test.ts` (70 test cases)

| Handler                       | Tested | Test Cases                               |
| ----------------------------- | ------ | ---------------------------------------- |
| `list.ts`                     | ✅     | List, filter, pagination                 |
| `create.ts`                   | ✅     | Create for workflow/agent, validation    |
| `get.ts`                      | ✅     | Get by ID, not found                     |
| `update.ts`                   | ✅     | Update properties                        |
| `delete.ts`                   | ✅     | Soft delete                              |
| `publish.ts`                  | ✅     | Publish, slug generation, reserved slugs |
| `unpublish.ts`                | ✅     | Unpublish                                |
| `duplicate.ts`                | ❌     | **NOT TESTED**                           |
| `submissions.ts`              | ❌     | **NOT TESTED**                           |
| `upload-assets.ts`            | ❌     | **NOT TESTED**                           |
| `submission-file-download.ts` | ❌     | **NOT TESTED**                           |

**Coverage Assessment: GOOD (70% of handlers)**

**Missing Tests:**

```typescript
describe("POST /form-interfaces/:id/duplicate", () => {
    it("should duplicate form interface");
    it("should generate new ID for duplicate");
    it("should duplicate trigger if present");
    it("should return 404 for non-existent form");
});

describe("GET /form-interfaces/:id/submissions", () => {
    it("should list form submissions");
    it("should paginate results");
    it("should filter by status");
    it("should include submission data");
});

describe("POST /form-interfaces/:id/upload-assets", () => {
    it("should upload form assets (images, files)");
    it("should validate MIME types");
    it("should validate file size");
    it("should return asset URLs");
});

describe("GET /form-interfaces/submissions/:submissionId/files/:fileId", () => {
    it("should download submission file");
    it("should return 404 for non-existent file");
    it("should verify authorization");
    it("should stream file content");
});
```

---

### 5. Knowledge Bases (`/api/routes/knowledge-bases/`)

**File:** `knowledge-bases/__tests__/knowledge-bases.test.ts` (56 test cases)

| Handler                 | Tested | Test Cases                  |
| ----------------------- | ------ | --------------------------- |
| `list.ts`               | ✅     | List, pagination, filtering |
| `create.ts`             | ✅     | Create KB                   |
| `get.ts`                | ✅     | Get by ID                   |
| `update.ts`             | ✅     | Update config               |
| `delete.ts`             | ✅     | Delete                      |
| `stats.ts`              | ✅     | Get statistics              |
| `query.ts`              | ✅     | Semantic search             |
| `upload-document.ts`    | ✅     | Upload document             |
| `list-documents.ts`     | ✅     | List documents              |
| `delete-document.ts`    | ✅     | Delete document             |
| `add-url.ts`            | ✅     | Add URL document            |
| `stream.ts`             | ❌     | **NOT TESTED**              |
| `download-document.ts`  | ❌     | **NOT TESTED**              |
| `reprocess-document.ts` | ❌     | **NOT TESTED**              |

**Coverage Assessment: GOOD (78% of handlers)**

**Missing Tests:**

```typescript
describe("GET /knowledge-bases/:id/documents/stream", () => {
    it("should stream document processing progress");
    it("should send progress events");
    it("should send completion event");
    it("should handle processing errors");
});

describe("GET /knowledge-bases/:id/documents/:docId/download", () => {
    it("should download document file");
    it("should return 404 for non-existent document");
    it("should verify authorization");
    it("should set correct Content-Type header");
});

describe("POST /knowledge-bases/:id/documents/:docId/reprocess", () => {
    it("should trigger document reprocessing");
    it("should return 404 for non-existent document");
    it("should handle already-processing document");
});
```

---

### 6. Connections (`/api/routes/connections/`)

**File:** `connections/__tests__/connections.test.ts` (28 test cases)

| Handler        | Tested | Test Cases                       |
| -------------- | ------ | -------------------------------- |
| `list.ts`      | ✅     | List, filter by provider/type    |
| `create.ts`    | ✅     | Create API key/OAuth2/Basic auth |
| `get.ts`       | ✅     | Get by ID, mask sensitive data   |
| `update.ts`    | ✅     | Update properties                |
| `delete.ts`    | ✅     | Soft delete                      |
| `mcp-tools.ts` | ❌     | **NOT TESTED**                   |

**Missing Tests:**

```typescript
describe("GET /connections/:id/mcp-tools", () => {
    it("should list MCP tools for connection");
    it("should validate connection supports MCP");
    it("should return 404 for non-existent connection");
    it("should enumerate available tools from MCP server");
});
```

---

### 7. Auth (`/api/routes/auth/`)

**File:** `auth/__tests__/auth.test.ts` (43 test cases)

| Handler                  | Tested | Test Cases                                        |
| ------------------------ | ------ | ------------------------------------------------- |
| `register.ts`            | ✅     | Register, duplicate email, validation             |
| `login.ts`               | ✅     | Login, wrong password, 2FA flow                   |
| `me.ts`                  | ✅     | Get profile, update name                          |
| `verify-email.ts`        | ✅     | Verify token, expired token                       |
| `resend-verification.ts` | ✅     | Resend email                                      |
| `forgot-password.ts`     | ✅     | Request reset                                     |
| `reset-password.ts`      | ✅     | Reset with token                                  |
| `2fa.ts`                 | ⚠️     | **PARTIAL** - Missing backup codes, QR generation |
| `google.ts`              | ⚠️     | **PARTIAL** - Missing error edge cases            |
| `microsoft.ts`           | ⚠️     | **PARTIAL** - Missing error edge cases            |

**Missing Tests:**

```typescript
// 2FA gaps
describe("2FA Setup", () => {
    it("should generate QR code for setup");
    it("should validate and enable 2FA");
    it("should generate backup codes");
    it("should allow login with backup code");
    it("should invalidate used backup code");
});

// OAuth error handling
describe("Google OAuth Errors", () => {
    it("should handle invalid state parameter");
    it("should handle expired authorization code");
    it("should handle network errors");
    it("should handle token refresh failure");
});
```

---

### 8. OAuth (`/api/routes/oauth/`)

**File:** `oauth/__tests__/oauth.test.ts` (50 test cases)

| Handler               | Tested | Test Cases                      |
| --------------------- | ------ | ------------------------------- |
| `authorize.ts`        | ✅     | Generate auth URL               |
| `callback.ts`         | ✅     | Handle callback, token exchange |
| `device.ts`           | ✅     | Device code flow                |
| `list-providers.ts`   | ✅     | List providers                  |
| `refresh.ts`          | ✅     | Refresh tokens                  |
| `scheduler-status.ts` | ❌     | **NOT TESTED**                  |
| `revoke.ts`           | ❌     | **NOT TESTED**                  |

---

### 9. Triggers (`/api/routes/triggers/`)

**File:** `triggers/__tests__/triggers.test.ts` (32 test cases)

| Handler        | Tested | Test Cases                                                              |
| -------------- | ------ | ----------------------------------------------------------------------- |
| `list.ts`      | ✅     | List triggers                                                           |
| `create.ts`    | ✅     | Create schedule/webhook/manual                                          |
| `get.ts`       | ✅     | Get by ID                                                               |
| `delete.ts`    | ✅     | Delete trigger                                                          |
| `execute.ts`   | ✅     | Manual execute                                                          |
| `webhook.ts`   | ✅     | Webhook submission                                                      |
| `update.ts`    | ✅     | Update name/config/enabled, pause/resume schedule, Temporal integration |
| `providers.ts` | ❌     | **NOT TESTED**                                                          |

---

### 10. Workspaces (`/api/routes/workspaces/`)

**File:** `workspaces/__tests__/workspaces.test.ts` (56 test cases)

| Handler                  | Tested | Test Cases                          |
| ------------------------ | ------ | ----------------------------------- |
| `list.ts`                | ✅     | List user's workspaces              |
| `create.ts`              | ✅     | Create workspace, slug generation   |
| `get.ts`                 | ✅     | Get by ID, not found                |
| `update.ts`              | ✅     | Update name/settings                |
| `delete.ts`              | ✅     | Delete workspace, ownership check   |
| `members/list.ts`        | ✅     | List members, role filtering        |
| `members/invite.ts`      | ✅     | Invite member, duplicate prevention |
| `members/remove.ts`      | ✅     | Remove member, ownership protection |
| `members/update-role.ts` | ✅     | Update role, permission checks      |
| `invitations/accept.ts`  | ✅     | Accept invitation, token validation |
| `invitations/decline.ts` | ✅     | Decline invitation                  |
| `switch.ts`              | ❌     | **NOT TESTED**                      |

---

### 11. Templates (`/api/routes/templates/`)

**File:** `templates/__tests__/templates.test.ts` (27 test cases)

| Handler         | Tested | Test Cases               |
| --------------- | ------ | ------------------------ |
| `list.ts`       | ✅     | List, filter by category |
| `get.ts`        | ✅     | Get by ID                |
| `categories.ts` | ✅     | List template categories |
| `copy.ts`       | ✅     | Copy to user's workflows |

---

### 12. Agent Templates (`/api/routes/agent-templates/`)

**File:** `agent-templates/__tests__/agent-templates.test.ts` (30 test cases)

| Handler         | Tested | Test Cases               |
| --------------- | ------ | ------------------------ |
| `list.ts`       | ✅     | List, filter by category |
| `get.ts`        | ✅     | Get by ID                |
| `categories.ts` | ✅     | List template categories |
| `copy.ts`       | ✅     | Copy to user's agents    |

---

### 13. V1 Public API (`/api/routes/v1/`)

**File:** `v1/__tests__/v1.test.ts` (62 test cases)

| Handler                | Tested | Test Cases                               |
| ---------------------- | ------ | ---------------------------------------- |
| `auth.ts`              | ✅     | API key authentication, scope validation |
| `workflows/list.ts`    | ✅     | List workflows via API key               |
| `workflows/get.ts`     | ✅     | Get workflow via API key                 |
| `workflows/execute.ts` | ✅     | Execute workflow via API key             |
| `agents/list.ts`       | ✅     | List agents via API key                  |
| `agents/execute.ts`    | ✅     | Execute agent via API key                |

---

## Routes WITHOUT Tests (15 directories)

### High Priority (Business Critical)

| Route                 | Handlers | Why Critical                      | Required Tests                          |
| --------------------- | -------- | --------------------------------- | --------------------------------------- |
| **Billing**           | 10       | Payment processing, subscriptions | Stripe webhooks, subscription lifecycle |
| **Webhooks**          | 11       | External integrations             | HMAC verification, provider callbacks   |
| **Persona-Instances** | 13       | Stateful agent operations         | State management, lifecycle             |
| **Chat-Interfaces**   | 10       | User-facing feature               | Message flow, SSE streaming             |

### Medium Priority

| Route        | Handlers | Notes                     | Required Tests             |
| ------------ | -------- | ------------------------- | -------------------------- |
| **Folders**  | 11       | Organization feature      | CRUD, nesting, permissions |
| **Threads**  | 8        | Conversation management   | Message history, pruning   |
| **Public**   | 9        | Public-facing endpoints   | Slug access, rate limiting |
| **Personas** | 5        | Agent personality configs | CRUD, assignment to agents |

### Lower Priority

| Route        | Handlers | Notes                    |
| ------------ | -------- | ------------------------ |
| Analytics    | 3        | Reporting                |
| Checkpoints  | 6        | Execution checkpoints    |
| Extension    | 4        | Browser extension        |
| Integrations | 3        | Third-party integrations |
| Logs         | 1        | Frontend log endpoint    |
| OAuth1       | 2        | OAuth 1.0 (legacy)       |
| Sandbox      | 3        | Code sandbox             |
| Tools        | 1        | Tool definitions         |
| Api-Keys     | 5        | API key management       |

---

## Patterns Missing Across All Routes

### 1. SSE Streaming Tests

**Affected Handlers:**

- `agents/stream.ts` - ✅ Now has 23 integration tests
- `workflows/chat-stream.ts` - ✅ Now has 22 integration tests
- `workflows/generation-chat-stream.ts` - ✅ Now has 12 integration tests
- `executions/stream.ts` - ⚠️ Auth tests only
- `knowledge-bases/stream.ts` - ❌ Not tested

**Testing Approach:**

```typescript
// SSE testing requires mocking:
// 1. Redis event bus subscriptions
// 2. SSE handler creation
// 3. Client disconnect events

const mockSSE = {
    sendEvent: jest.fn(),
    onDisconnect: jest.fn()
};

jest.mock("../../../services/sse", () => ({
    createSSEHandler: jest.fn(() => mockSSE),
    sendTerminalEvent: jest.fn()
}));

const mockRedisEventBus = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
};

jest.mock("../../../services/events/RedisEventBus", () => ({
    redisEventBus: mockRedisEventBus
}));
```

### 2. File Operations Tests

**Affected Handlers:**

- `form-interfaces/upload-assets.ts` - ❌ Not tested
- `form-interfaces/submission-file-download.ts` - ❌ Not tested
- `knowledge-bases/download-document.ts` - ❌ Not tested
- `workflows/upload-files.ts` - ⚠️ Basic tests only

**Testing Approach:**

```typescript
// File upload testing with multipart/form-data
const formData = new FormData();
formData.append("file", Buffer.from("test content"), "test.txt");

const response = await authenticatedRequest(fastify, testUser, {
    method: "POST",
    url: "/form-interfaces/123/upload-assets",
    payload: formData,
    headers: {
        "content-type": "multipart/form-data"
    }
});
```

### 3. Temporal Integration Tests

**Affected Handlers:**

- `agents/execute.ts` - ✅ workflow.start() tested
- `agents/send-message.ts` - ✅ workflow.signal() tested
- `executions/cancel.ts` - ✅ workflow.cancel() tested
- `executions/submit-response.ts` - ✅ workflow.signal() tested
- `triggers/create.ts` - ⚠️ schedule.create() partial

**Current Mock Pattern:**

```typescript
const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockHandle),
        getHandle: jest.fn().mockReturnValue(mockHandle)
    }
};

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient)
}));
```

### 4. Webhook Signature Verification Tests

**Critical for:**

- `webhooks/stripe.ts` - HMAC signature verification
- `webhooks/github.ts` - HMAC signature verification
- `webhooks/slack.ts` - Request signing
- `webhooks/discord.ts` - Ed25519 signature verification

**Testing Approach:**

```typescript
describe("POST /webhooks/stripe", () => {
    it("should verify Stripe webhook signature", async () => {
        const payload = JSON.stringify({ type: "payment_intent.succeeded" });
        const signature = generateStripeSignature(payload, STRIPE_SECRET);

        const response = await request(fastify)
            .post("/webhooks/stripe")
            .set("stripe-signature", signature)
            .send(payload);

        expect(response.status).toBe(200);
    });

    it("should reject invalid signature", async () => {
        const response = await request(fastify)
            .post("/webhooks/stripe")
            .set("stripe-signature", "invalid")
            .send({ type: "payment_intent.succeeded" });

        expect(response.status).toBe(401);
    });
});
```

---

## Recommended Test Implementation Order

### Phase 1: Critical Business Logic (NEXT)

1. **Billing** (10 handlers)
    - Stripe webhook verification
    - Subscription lifecycle
    - Payment failure handling
    - Invoice generation

2. **Webhooks** (11 handlers)
    - HMAC signature verification for each provider
    - Idempotency handling
    - Error responses

### Phase 2: User-Facing Features

3. **Chat Interfaces** (10 handlers)
    - Message submission
    - SSE streaming
    - Thread management

4. **Public Endpoints** (9 handlers)
    - Slug-based access
    - Rate limiting
    - File serving

### Phase 3: Completeness

5. **Folders** (11 handlers) - Organization feature
6. **Threads** (8 handlers) - Conversation management
7. **Personas** (5 handlers) - Agent personalities
8. **API Keys** (5 handlers) - Key management

### Phase 4: Gaps in Existing Tests

9. Form Interfaces: `duplicate.ts`, `submissions.ts`, `upload-assets.ts`
10. Knowledge Bases: `stream.ts`, `download-document.ts`, `reprocess-document.ts`
11. Connections: `mcp-tools.ts`
12. Auth: 2FA backup codes, OAuth error handling
13. OAuth: `scheduler-status.ts`, `revoke.ts`

---

## Test Quality Checklist

When adding tests to a route, ensure coverage of:

### Scenarios to Test

- [ ] **Happy Path**: Successful operation with valid input
- [ ] **Authentication**: 401 for missing/invalid token
- [ ] **Authorization**: 403 for insufficient permissions
- [ ] **Not Found**: 404 for non-existent resources
- [ ] **Validation**: 400 for invalid input (missing fields, wrong types)
- [ ] **Multi-tenant**: Isolation between users/workspaces
- [ ] **Idempotency**: Safe to retry (where applicable)
- [ ] **Concurrent**: Handles simultaneous requests
- [ ] **Edge Cases**: Empty lists, max limits, special characters

### Test Structure

```typescript
describe("Resource Handler", () => {
    describe("POST /resource", () => {
        it("should create resource with valid data");
        it("should return 400 for missing required fields");
        it("should return 400 for invalid field format");
        it("should return 401 without authentication");
        it("should return 403 without proper permissions");
        it("should handle concurrent creation attempts");
    });

    describe("GET /resource/:id", () => {
        it("should return resource for owner");
        it("should return 404 for non-existent resource");
        it("should return 404 for other user's resource");
        it("should return 401 without authentication");
    });

    // ... other operations
});
```

---

## Running Tests

```bash
# Run all API route tests
npm test -- --testPathPattern="routes" --no-coverage

# Run specific route tests
npm test -- --testPathPattern="agents.test" --no-coverage
npm test -- --testPathPattern="workflows.test" --no-coverage
npm test -- --testPathPattern="executions.test" --no-coverage

# Run with coverage
npm test -- --testPathPattern="routes" --coverage

# Watch mode for development
npm test -- --testPathPattern="agents.test" --watch
```

---

## Test File Locations

All colocated test files:

```
backend/src/api/routes/agents/__tests__/
├── agents.test.ts
├── crud.test.ts
├── memory.test.ts
├── tools.test.ts
├── execution.test.ts
├── streaming.test.ts
├── threads.test.ts
└── folders.test.ts

backend/src/api/routes/auth/__tests__/auth.test.ts
backend/src/api/routes/connections/__tests__/connections.test.ts
backend/src/api/routes/executions/__tests__/executions.test.ts
backend/src/api/routes/form-interfaces/__tests__/form-interfaces.test.ts
backend/src/api/routes/knowledge-bases/__tests__/knowledge-bases.test.ts
backend/src/api/routes/oauth/__tests__/oauth.test.ts
backend/src/api/routes/triggers/__tests__/triggers.test.ts
backend/src/api/routes/workflows/__tests__/workflows.test.ts
backend/src/api/routes/workspaces/__tests__/workspaces.test.ts
backend/src/api/routes/templates/__tests__/templates.test.ts
backend/src/api/routes/agent-templates/__tests__/agent-templates.test.ts
backend/src/api/routes/v1/__tests__/v1.test.ts
```

Test helper utilities:

```
backend/__tests__/helpers/fastify-test-client.ts
```
