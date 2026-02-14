# API Route Test Coverage Analysis

This document provides a comprehensive analysis of API route test coverage, identifying gaps in existing tests and routes that lack tests entirely.

**Last Updated:** 2026-02-14 (Phase 1, 2, 3, 4 & 5 partial completed)

---

## Executive Summary

| Metric                  | Value     |
| ----------------------- | --------- |
| Total Route Directories | 33        |
| Routes with Tests       | 11 (33%)  |
| Total Handler Files     | 277       |
| Tested Handlers         | ~95 (34%) |
| Total Test Cases        | 575       |
| Routes Without Tests    | 22        |

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

## Routes WITH Tests - Gap Analysis

### 1. Agents (`/api/routes/agents/`)

**File:** `agents/__tests__/agents.test.ts` (763 lines, 33 test cases)

| Handler              | Tested | Test Cases                                                                                  |
| -------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `list.ts`            | ✅     | List agents, filter by folder, empty list, auth required                                    |
| `create.ts`          | ✅     | Create with providers (openai/anthropic/google/cohere), validation errors, parameter bounds |
| `get.ts`             | ✅     | Get by ID, not found, invalid UUID                                                          |
| `update.ts`          | ✅     | Update name/temperature/provider, not found, validation                                     |
| `delete.ts`          | ✅     | Delete, not found, multi-tenant isolation                                                   |
| `execute.ts`         | ✅     | Execute with new/existing thread, thread validation, Temporal start, connection override    |
| `stream.ts`          | ✅     | Auth checks, 404 for non-existent/other user's execution                                    |
| `send-message.ts`    | ✅     | Send to running execution, 400 for non-running, Temporal signal                             |
| `get-execution.ts`   | ✅     | Get execution details, 404 for non-existent                                                 |
| `list-executions.ts` | ✅     | List with pagination, filter by status, 404 for non-existent agent                          |
| `add-tool.ts`        | ✅     | Add tool, duplicate name check, 404, validation                                             |
| `add-tools-batch.ts` | ✅     | Batch add, skip duplicates (existing & batch), 404                                          |
| `remove-tool.ts`     | ✅     | Remove tool, 404 for non-existent tool/agent                                                |

**Missing Test Coverage:**

#### `execute.ts` - Critical

```typescript
// Handler functionality:
// - Validates agent exists and belongs to workspace
// - Creates or reuses thread
// - Loads thread message history
// - Creates execution record
// - Starts Temporal workflow

// Required tests:
describe("POST /agents/:id/execute", () => {
    it("should create new thread and start execution");
    it("should reuse existing thread");
    it("should return 404 for non-existent agent");
    it("should return 400 for thread belonging to different agent");
    it("should pass connection_id and model overrides to Temporal");
    it("should return 401 without authentication");
    it("should return execution ID and thread ID on success");
});
```

#### `stream.ts` - Critical

```typescript
// Handler functionality:
// - SSE endpoint for real-time agent execution updates
// - Subscribes to Redis channels: started, thinking, token, message,
//   tool_call_started, tool_call_completed, tool_call_failed,
//   execution:completed, execution:failed
// - Filters events by executionId
// - Handles client disconnect with cleanup

// Required tests:
describe("GET /agents/:id/executions/:executionId/stream", () => {
    it("should establish SSE connection for valid execution");
    it("should return 404 for non-existent execution");
    it("should return 404 for execution belonging to different user");
    it("should send connected event on connection");
    it("should forward token events to client");
    it("should forward tool_call events to client");
    it("should send completed event and close stream");
    it("should cleanup subscriptions on client disconnect");
});
```

#### `send-message.ts`

```typescript
// Required tests:
describe("POST /agents/:id/executions/:executionId/message", () => {
    it("should send message to running execution");
    it("should return 400 for non-running execution");
    it("should return 404 for non-existent execution");
    it("should signal Temporal workflow with message");
});
```

#### Tool Management (`add-tool.ts`, `add-tools-batch.ts`, `remove-tool.ts`)

```typescript
// Required tests:
describe("POST /agents/:id/tools", () => {
    it("should add tool to agent");
    it("should return 400 for duplicate tool name");
    it("should generate unique tool ID");
});

describe("POST /agents/:id/tools/batch", () => {
    it("should add multiple tools");
    it("should skip duplicates and return skipped list");
    it("should handle empty array");
});

describe("DELETE /agents/:id/tools/:toolId", () => {
    it("should remove tool from agent");
    it("should return 404 for non-existent tool");
});
```

#### Execution Management (`get-execution.ts`, `list-executions.ts`)

```typescript
// Required tests:
describe("GET /agents/:id/executions/:executionId", () => {
    it("should return execution details");
    it("should include message history");
    it("should return 404 for other user's execution");
});

describe("GET /agents/:id/executions", () => {
    it("should list executions with pagination");
    it("should filter by status");
    it("should include message preview");
});
```

---

### 2. Workflows (`/api/routes/workflows/`)

**File:** `workflows/__tests__/workflows.test.ts` (50 test cases)

| Handler                     | Tested | Test Cases                                                                                 |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `list.ts`                   | ✅     | List, pagination, folder filter, empty list                                                |
| `create.ts`                 | ✅     | Create workflow, AI-generated flag, validation                                             |
| `get.ts`                    | ✅     | Get by ID, not found, multi-tenant                                                         |
| `update.ts`                 | ✅     | Update name/definition, not found, multi-tenant                                            |
| `delete.ts`                 | ✅     | Soft delete, not found, multi-tenant                                                       |
| `execute.ts`                | ✅     | Execute with definition, validation error                                                  |
| `upload-files.ts`           | ✅     | Multipart requirement, 401 without auth                                                    |
| `generate.ts`               | ✅     | Generate from prompt, validation (short/invalid UUID), service error, auth                 |
| `generation-chat.ts`        | ✅     | Chat init returns executionId, create from plan, folderId, validation, auth                |
| `chat.ts`                   | ✅     | Chat returns executionId, null action mode, context/message validation, auth               |
| `chat-stream.ts`            | ⚠️     | SSE streams tested via chat init; direct SSE testing requires integration tests            |
| `generation-chat-stream.ts` | ⚠️     | SSE streams tested via generation-chat init; direct SSE testing requires integration tests |
| `get-by-system-key.ts`      | ✅     | Admin access, 404 for non-existent, 403 for non-admin, auth                                |

**Completed Test Coverage (Phase 4):**

#### AI Generation Features ✅

```typescript
// generate.ts - 5 tests
describe("POST /workflows/generate", () => {
    it("should generate workflow from prompt"); // ✅
    it("should return 400 for prompt too short"); // ✅
    it("should return 400 for invalid connectionId"); // ✅
    it("should return 500 when generation fails"); // ✅
    it("should return 401 without authentication"); // ✅
});

// generation-chat.ts - 8 tests
describe("POST /workflows/generation/chat", () => {
    it("should initiate generation chat and return execution ID"); // ✅
    it("should return 400 for missing required fields"); // ✅
    it("should return 400 for invalid connectionId"); // ✅
    it("should return 401 without authentication"); // ✅
});

describe("POST /workflows/generation/create", () => {
    it("should create workflow from approved plan"); // ✅
    it("should create workflow with folderId"); // ✅
    it("should return 400 for missing plan name"); // ✅
    it("should return 401 without authentication"); // ✅
});

// chat.ts - 5 tests
describe("POST /workflows/chat", () => {
    it("should initiate workflow chat and return execution ID"); // ✅
    it("should work with null action for conversational mode"); // ✅
    it("should return 400 for missing context"); // ✅
    it("should return 400 for message too long"); // ✅
    it("should return 401 without authentication"); // ✅
});

// get-by-system-key.ts - 4 tests
describe("GET /workflows/system/:key", () => {
    it("should return system workflow for admin user"); // ✅
    it("should return 404 for non-existent system key"); // ✅
    it("should return 403 for non-admin user"); // ✅
    it("should return 401 without authentication"); // ✅
});
```

#### Chat Interface ✅ COMPLETED

Tests added in Phase 4 - see table above.

#### File Operations

```typescript
describe("POST /workflows/:id/upload-files", () => {
    it("should upload files for workflow");
    it("should validate file types");
    it("should validate file size limits");
    it("should return file URLs");
});
```

#### System Key Access

```typescript
describe("GET /workflows/system/:systemKey", () => {
    it("should return workflow by system key");
    it("should return 404 for invalid key");
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

**Note:** All handlers in this route are now tested. Full SSE streaming tests would require
integration testing with actual SSE connections; current tests verify authorization and error handling.

---

### 4. Form Interfaces (`/api/routes/form-interfaces/`)

**File:** `form-interfaces/__tests__/form-interfaces.test.ts` (1365 lines, 57 test cases)

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

**Missing Test Coverage:**

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

**File:** `knowledge-bases/__tests__/knowledge-bases.test.ts` (1934 lines, 56 test cases)

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

**Missing Test Coverage:**

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

**File:** `connections/__tests__/connections.test.ts` (680 lines, 28 test cases)

| Handler        | Tested | Test Cases                       |
| -------------- | ------ | -------------------------------- |
| `list.ts`      | ✅     | List, filter by provider/type    |
| `create.ts`    | ✅     | Create API key/OAuth2/Basic auth |
| `get.ts`       | ✅     | Get by ID, mask sensitive data   |
| `update.ts`    | ✅     | Update properties                |
| `delete.ts`    | ✅     | Soft delete                      |
| `mcp-tools.ts` | ❌     | **NOT TESTED**                   |

**Missing Test Coverage:**

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

**File:** `auth/__tests__/auth.test.ts` (1098 lines, 43 test cases)

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

**Missing Test Coverage:**

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

**File:** `oauth/__tests__/oauth.test.ts` (1389 lines, 50 test cases)

| Handler               | Tested | Test Cases                      |
| --------------------- | ------ | ------------------------------- |
| `authorize.ts`        | ✅     | Generate auth URL               |
| `callback.ts`         | ✅     | Handle callback, token exchange |
| `device.ts`           | ✅     | Device code flow                |
| `list-providers.ts`   | ✅     | List providers                  |
| `refresh.ts`          | ✅     | Refresh tokens                  |
| `scheduler-status.ts` | ❌     | **NOT TESTED**                  |
| `revoke.ts`           | ❌     | **NOT TESTED**                  |

**Missing Test Coverage:**

```typescript
describe("GET /oauth/scheduler-status", () => {
    it("should return scheduler status");
    it("should show pending token refreshes");
});

describe("POST /oauth/:connectionId/revoke", () => {
    it("should revoke OAuth connection");
    it("should cleanup stored tokens");
    it("should return 404 for non-existent connection");
});
```

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

**Remaining Gap:**

```typescript
describe("GET /triggers/providers", () => {
    it("should list available trigger types");
    it("should include provider metadata");
});
```

---

## Routes WITHOUT Tests (24 directories)

### High Priority (Business Critical)

| Route                 | Handlers | Why Critical                      |
| --------------------- | -------- | --------------------------------- |
| **Billing**           | 10       | Payment processing, subscriptions |
| **Webhooks**          | 11       | External integrations             |
| **Persona-Instances** | 13       | Stateful agent operations         |
| **Chat-Interfaces**   | 10       | User-facing feature               |

### Medium Priority

| Route          | Handlers | Notes                     |
| -------------- | -------- | ------------------------- |
| **Folders**    | 11       | Organization feature      |
| **Threads**    | 8        | Conversation management   |
| **Public**     | 8        | Public-facing endpoints   |
| **Workspaces** | 6+       | Team collaboration        |
| **Personas**   | 5        | Agent personality configs |

### Lower Priority

| Route           | Handlers | Notes                    |
| --------------- | -------- | ------------------------ |
| Analytics       | 3        | Reporting                |
| Templates       | 4        | Workflow templates       |
| Agent-Templates | 4        | Agent templates          |
| Checkpoints     | 6        | Execution checkpoints    |
| Extension       | 4        | Browser extension        |
| Integrations    | 2        | Third-party integrations |
| Logs            | 1        | Logging endpoint         |
| OAuth1          | 2        | OAuth 1.0 (legacy)       |
| Sandbox         | 3        | Code sandbox             |
| Tools           | 1        | Tool definitions         |
| Api-Keys        | -        | API key management       |
| Blog            | -        | Blog integration         |
| V1              | -        | Versioned API            |

---

## Patterns Missing Across All Routes

### 1. SSE Streaming (Critical Gap)

**Affected Handlers:**

- `agents/stream.ts`
- `workflows/chat-stream.ts`
- `workflows/generation-chat-stream.ts`
- `executions/stream.ts`
- `knowledge-bases/stream.ts`

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

### 2. File Operations

**Affected Handlers:**

- `form-interfaces/upload-assets.ts`
- `form-interfaces/submission-file-download.ts`
- `knowledge-bases/download-document.ts`
- `workflows/upload-files.ts`

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

### 3. Temporal Integration

**Affected Handlers:**

- `agents/execute.ts` - workflow.start()
- `agents/send-message.ts` - workflow.signal()
- `executions/cancel.ts` - workflow.cancel()
- `executions/submit-response.ts` - workflow.signal()
- `triggers/create.ts` - schedule.create()

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

---

## Recommended Test Implementation Order

### Phase 1: Critical Execution Paths ✅ COMPLETED

1. ~~`executions/stream.ts`~~ - Auth/error handling tests added
2. ~~`executions/submit-response.ts`~~ - Full coverage including type validation
3. ~~`agents/execute.ts`~~ - Full coverage including Temporal integration
4. ~~`agents/stream.ts`~~ - Auth/error handling tests added
5. ~~`agents/send-message.ts`~~ - Full coverage including Temporal signal
6. ~~`agents/list-executions.ts`~~ - Full coverage with filtering
7. ~~`agents/get-execution.ts`~~ - Full coverage

### Phase 2: Missing CRUD Operations ✅ COMPLETED

1. ~~`agents/add-tool.ts`, `add-tools-batch.ts`, `remove-tool.ts`~~ - Full coverage
2. ~~`agents/get-execution.ts`, `list-executions.ts`~~ - Done in Phase 1
3. ~~`triggers/update.ts`~~ - Full coverage including Temporal schedule operations
4. ~~`form-interfaces/duplicate.ts`, `submissions.ts`~~ - Already had tests (70 total)

### Phase 3: File Operations ✅ COMPLETED

1. ~~`form-interfaces/upload-assets.ts`~~ - Basic tests (multipart, 404, 401)
2. ~~`form-interfaces/submission-file-download.ts`~~ - Already comprehensive (10+ tests)
3. ~~`knowledge-bases/download-document.ts`~~ - Already comprehensive (signed URLs, validation)
4. ~~`workflows/upload-files.ts`~~ - Added multipart/auth tests

Note: Full multipart file upload testing requires integration tests with actual file streams.

### Phase 4: AI Features ✅ COMPLETED

1. ✅ `workflows/generate.ts` - 5 tests
2. ✅ `workflows/generation-chat.ts` - 8 tests (chat + create endpoints)
3. ✅ `workflows/chat.ts` - 5 tests
4. ✅ `workflows/chat-stream.ts` - 22 integration tests (event emission, lifecycle, cleanup)
5. ✅ `workflows/generation-chat-stream.ts` - 12 integration tests (event emission, lifecycle)
6. ✅ `workflows/get-by-system-key.ts` - 4 tests (admin-only route)
7. ✅ `agents/stream.ts` - 23 integration tests (Redis event bus, channel subscriptions, event filtering)

### Phase 5: New Route Test Suites (Partial)

**Completed:**

1. ✅ `templates/` - 27 tests (list, get, categories, copy to workflow)
2. ✅ `agent-templates/` - 30 tests (list, get, categories, copy to agent)

**Remaining:**

1. Billing (payment critical)
2. Webhooks (integration critical)
3. Chat-Interfaces (user-facing)
4. Persona-Instances (complex state)
5. Folders (organization)
6. Threads (conversation management)
7. Workspaces (team collaboration)
8. Personas (agent personalities)

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
backend/src/api/routes/agents/__tests__/agents.test.ts
backend/src/api/routes/auth/__tests__/auth.test.ts
backend/src/api/routes/connections/__tests__/connections.test.ts
backend/src/api/routes/executions/__tests__/executions.test.ts
backend/src/api/routes/form-interfaces/__tests__/form-interfaces.test.ts
backend/src/api/routes/knowledge-bases/__tests__/knowledge-bases.test.ts
backend/src/api/routes/oauth/__tests__/oauth.test.ts
backend/src/api/routes/triggers/__tests__/triggers.test.ts
backend/src/api/routes/workflows/__tests__/workflows.test.ts
```

Test helper utilities:

```
backend/__tests__/helpers/fastify-test-client.ts
```
