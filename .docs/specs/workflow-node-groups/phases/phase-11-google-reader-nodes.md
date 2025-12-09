# Phase 11: Reader Nodes (Google)

## Overview

Implement 3 Google reader nodes: Gmail Reader, Sheets Reader, and Drive Reader.

---

## Prerequisites

- **Phase 10**: Trigger nodes (readers often follow triggers)

---

## Existing Infrastructure

### Google Integration Providers Already Exist

**File**: `backend/src/integrations/providers/gmail/GmailProvider.ts`

```typescript
// Gmail provider exists with operations
// Use existing operations for reader nodes
```

**File**: `backend/src/integrations/providers/google-sheets/GoogleSheetsProvider.ts`

```typescript
// Sheets provider with read/write operations
```

**File**: `backend/src/integrations/providers/google-drive/GoogleDriveProvider.ts`

```typescript
// Drive provider with file operations
```

### Connection Repository for OAuth Tokens

**File**: `backend/src/storage/repositories/ConnectionRepository.ts`

```typescript
// OAuth tokens are stored in connections
const connection = await connectionRepository.findByIdWithData(connectionId);
const tokens = connection.data as OAuthTokenData;
// { accessToken, refreshToken, expiresAt }
```

### Integration Executor Pattern

**File**: `backend/src/temporal/activities/node-executors/integration-executor.ts`

```typescript
// Reader nodes can use the integration executor pattern
export async function executeIntegrationNode(
    config: IntegrationNodeConfig,
    context: JsonObject
): Promise<IntegrationNodeResult>;

// Or create specific readers that call provider operations directly
```

### Google OAuth Scopes Required

```typescript
// Ensure these scopes are configured in Google Cloud Console:
const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
];
```

---

## Nodes (3)

| Node              | Description              | Category           |
| ----------------- | ------------------------ | ------------------ |
| **Gmail Reader**  | Fetch emails by criteria | automation/readers |
| **Sheets Reader** | Pull spreadsheet data    | automation/readers |
| **Drive Reader**  | Download file content    | automation/readers |

---

## Node Specifications

### Gmail Reader Node

**Purpose**: Fetch emails matching search criteria

**Config**:

- Account (Google OAuth)
- Search query (Gmail syntax)
- Max results
- Include attachments
- Include body (full/snippet)
- Date range

**Inputs**: `query` (optional override)
**Outputs**: `emails` (array), `count` (number)

### Sheets Reader Node

**Purpose**: Read data from Google Sheets

**Config**:

- Account (Google OAuth)
- Spreadsheet selection
- Sheet name
- Range (A1 notation)
- Has header row
- Column filters

**Inputs**: `range` (optional override)
**Outputs**: `rows` (array), `headers` (array), `count` (number)

### Drive Reader Node

**Purpose**: List and download files from Google Drive

**Config**:

- Account (Google OAuth)
- Folder path
- File type filter
- Max results
- Download content vs. metadata only

**Inputs**: `folderId` (optional override)
**Outputs**: `files` (array), `content` (if single file)

---

## Unit Tests

### Test Pattern

**Pattern C (Mock Services)**: Use `nock` to mock Google APIs.

### Files to Create

| Executor     | Test File                                                                  | Pattern |
| ------------ | -------------------------------------------------------------------------- | ------- |
| GmailReader  | `backend/tests/unit/node-executors/readers/gmail-reader-executor.test.ts`  | C       |
| SheetsReader | `backend/tests/unit/node-executors/readers/sheets-reader-executor.test.ts` | C       |
| DriveReader  | `backend/tests/unit/node-executors/readers/drive-reader-executor.test.ts`  | C       |

### Mock Setup

```typescript
nock("https://gmail.googleapis.com")
    .get("/gmail/v1/users/me/messages")
    .reply(200, { messages: [{ id: "123" }] });
```

### Required Test Cases

#### gmail-reader-executor.test.ts

- `should fetch emails matching query`
- `should parse email body and attachments`
- `should respect maxResults limit`
- `should handle pagination`
- `should filter by label/sender`

#### sheets-reader-executor.test.ts

- `should read specified range`
- `should parse values as correct types`
- `should handle empty cells`
- `should read entire sheet when range not specified`
- `should return row/column metadata`

#### drive-reader-executor.test.ts

- `should list files in folder`
- `should download file content`
- `should respect file type filters`
- `should handle nested folders`
- `should return file metadata`

---

## Test Workflow: Daily Sales Report

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│  Schedule   │───▶│ Sheets       │───▶│  Summarizer │───▶│   Output    │
│ (8am daily) │    │ Reader       │    │ (AI)        │    │ (report)    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test**: Read sales data from Google Sheet, generate summary

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/automation/readers/
├── GmailReaderNode.tsx
├── SheetsReaderNode.tsx
├── DriveReaderNode.tsx
├── config/
│   ├── GmailReaderNodeConfig.tsx
│   ├── SheetsReaderNodeConfig.tsx
│   └── DriveReaderNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/readers/
├── gmail-reader-executor.ts
├── sheets-reader-executor.ts
└── drive-reader-executor.ts

backend/src/integrations/google/
├── auth.ts           # Google OAuth handling
├── gmail-client.ts   # Gmail API wrapper
├── sheets-client.ts  # Sheets API wrapper
└── drive-client.ts   # Drive API wrapper
```

---

## How to Deliver

1. Register all 3 nodes in `node-registry.ts`
2. Set up Google OAuth flow (consent screen, credentials)
3. Create Google API client wrappers
4. Create frontend node components
5. Create config forms with account picker
6. Implement backend executors
7. Handle pagination for large results
8. Test with real Google accounts

---

## How to Test

| Test                     | Expected Result            |
| ------------------------ | -------------------------- |
| Gmail search "is:unread" | Returns unread emails      |
| Gmail with attachments   | Attachments included       |
| Sheets read range A1:D10 | Returns 10 rows, 4 columns |
| Sheets with headers      | First row as field names   |
| Drive list folder        | Returns file metadata      |
| Drive download file      | Returns file content       |

### Integration Tests

```typescript
describe("Gmail Reader", () => {
    it("fetches emails by query", async () => {
        const result = await executeGmailReader({
            accountId: testAccountId,
            query: "is:unread",
            maxResults: 5
        });
        expect(result.emails.length).toBeLessThanOrEqual(5);
        expect(result.emails[0]).toHaveProperty("subject");
    });
});

describe("Sheets Reader", () => {
    it("reads spreadsheet data", async () => {
        const result = await executeSheetsReader({
            accountId: testAccountId,
            spreadsheetId: testSpreadsheetId,
            sheetName: "Sheet1",
            range: "A1:C10",
            hasHeader: true
        });
        expect(result.headers).toHaveLength(3);
        expect(result.rows.length).toBeLessThanOrEqual(9);
    });
});
```

---

## Acceptance Criteria

- [ ] Gmail Reader connects via Google OAuth
- [ ] Gmail Reader uses Gmail search syntax
- [ ] Gmail Reader returns full email with body
- [ ] Gmail Reader includes attachments when configured
- [ ] Sheets Reader lists available spreadsheets
- [ ] Sheets Reader reads specified range
- [ ] Sheets Reader treats first row as headers
- [ ] Sheets Reader returns typed data
- [ ] Drive Reader lists folder contents
- [ ] Drive Reader downloads file content
- [ ] All nodes display with Automation category styling
- [ ] All nodes show "Reader" badge

---

## Dependencies

These nodes pull data from Google services for processing.

Requires:

- Google OAuth credentials (Google Cloud Console)
- Gmail, Sheets, Drive API scopes
