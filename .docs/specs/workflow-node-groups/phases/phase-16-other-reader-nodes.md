# Phase 16: Reader Nodes (Other)

## Overview

Implement 3 additional reader nodes: Notion Reader, Airtable Reader, and HTTP Request.

---

## Prerequisites

- **Phase 15**: Google Reader nodes (similar patterns)

---

## Existing Infrastructure

### Integration Providers Already Exist

**File**: `backend/src/integrations/providers/notion/NotionProvider.ts`

```typescript
// Notion provider with database query operations
```

**File**: `backend/src/integrations/providers/airtable/AirtableProvider.ts`

```typescript
// Airtable provider with record operations
```

### HTTP Executor Already Exists

**File**: `backend/src/temporal/activities/node-executors/http-executor.ts`

```typescript
export interface HTTPNodeConfig {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: JsonValue;
    timeout?: number;
    outputVariable?: string;
}

export async function executeHTTPNode(
    config: HTTPNodeConfig,
    context: JsonObject
): Promise<HTTPNodeResult>;

// Already supports:
// - All HTTP methods
// - Variable interpolation in URL and body
// - Custom headers
// - Timeout handling
```

### Native Fetch API

**From CLAUDE.md Guidelines**:

```typescript
// Always use native fetch, not axios
const response = await fetch(url, {
    method: config.method,
    headers: config.headers,
    body: JSON.stringify(config.body),
    signal: AbortSignal.timeout(config.timeout)
});

if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

---

## Nodes (3)

| Node                | Description                | Category           |
| ------------------- | -------------------------- | ------------------ |
| **Notion Reader**   | Query databases or pages   | automation/readers |
| **Airtable Reader** | Fetch records with filters | automation/readers |
| **HTTP Request**    | Make HTTP calls with auth  | automation/readers |

---

## Node Specifications

### Notion Reader Node

**Purpose**: Query Notion databases and pages

**Config**:

- Account (Notion OAuth)
- Database or page ID
- Filter conditions
- Sort order
- Page size

**Inputs**: `filter` (optional override)
**Outputs**: `results` (array), `hasMore` (boolean), `nextCursor` (string)

### Airtable Reader Node

**Purpose**: Read records from Airtable bases

**Config**:

- Account (Airtable API key)
- Base ID
- Table name
- View (optional)
- Filter formula
- Max records

**Inputs**: `filter` (optional override)
**Outputs**: `records` (array), `count` (number)

### HTTP Request Node

**Purpose**: Make HTTP requests to any API

**Config**:

- Method: GET / POST / PUT / PATCH / DELETE
- URL (supports variables)
- Headers
- Body (JSON / form / raw)
- Authentication: none / bearer / basic / API key
- Timeout
- Retry count

**Inputs**: `url` (optional), `body` (optional)
**Outputs**: `response` (any), `status` (number), `headers` (object)

---

## Test Workflow: Notion Sync

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│  Webhook    │───▶│   Notion     │───▶│  Transform  │───▶│   Output    │
│ (trigger)   │    │   Reader     │    │             │    │ (data)      │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test**: Read data from Notion database, transform for use

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/automation/readers/
├── NotionReaderNode.tsx
├── AirtableReaderNode.tsx
├── HTTPRequestNode.tsx
├── config/
│   ├── NotionReaderNodeConfig.tsx
│   ├── AirtableReaderNodeConfig.tsx
│   └── HTTPRequestNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/readers/
├── notion-reader-executor.ts
├── airtable-reader-executor.ts
└── http-request-executor.ts

backend/src/integrations/
├── notion/
│   ├── auth.ts
│   └── client.ts
├── airtable/
│   ├── auth.ts
│   └── client.ts
```

---

## How to Deliver

1. Register all 3 nodes in `node-registry.ts`
2. Set up Notion OAuth integration
3. Set up Airtable API key handling
4. Create API client wrappers
5. Create frontend node components
6. Create config forms with auth UI
7. Implement backend executors
8. Test with real accounts

---

## How to Test

| Test                  | Expected Result             |
| --------------------- | --------------------------- |
| Notion query database | Returns filtered results    |
| Notion read page      | Returns page content        |
| Airtable list records | Returns table records       |
| Airtable with filter  | Returns filtered records    |
| HTTP GET public API   | Returns response data       |
| HTTP POST with auth   | Authenticated request works |
| HTTP timeout          | Times out with error        |

### Integration Tests

```typescript
describe("Notion Reader", () => {
    it("queries database with filter", async () => {
        const result = await executeNotionReader({
            accountId: testAccountId,
            databaseId: testDatabaseId,
            filter: {
                property: "Status",
                select: { equals: "Active" }
            }
        });
        expect(result.results.length).toBeGreaterThan(0);
    });
});

describe("HTTP Request", () => {
    it("makes authenticated request", async () => {
        const result = await executeHTTPRequest({
            method: "GET",
            url: "https://api.example.com/data",
            auth: {
                type: "bearer",
                token: "test-token"
            }
        });
        expect(result.status).toBe(200);
    });
});
```

---

## Acceptance Criteria

- [ ] Notion Reader connects via OAuth
- [ ] Notion Reader queries databases with filters
- [ ] Notion Reader reads page content
- [ ] Notion Reader handles pagination
- [ ] Airtable Reader connects via API key
- [ ] Airtable Reader supports filter formulas
- [ ] Airtable Reader supports views
- [ ] HTTP Request supports all methods
- [ ] HTTP Request supports bearer/basic/API key auth
- [ ] HTTP Request shows response preview
- [ ] HTTP Request handles errors gracefully
- [ ] All nodes display with Automation category styling

---

## Dependencies

These nodes complete the reader set for external data sources.

HTTP Request is particularly versatile for any API integration not covered by dedicated nodes.
