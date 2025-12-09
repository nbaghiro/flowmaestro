# Phase 18: Core Integrations

## Overview

Extend the existing integration providers with additional operations and ensure they work seamlessly with the IntegrationNode. The providers already exist with MCP auto-wrapping - this phase focuses on **adding operations** and **testing workflow execution**.

---

## Prerequisites

- **Phase 21**: Integration Framework (IntegrationNode component)

---

## Existing Providers (Already Implemented)

These providers **already exist** in `backend/src/integrations/providers/`:

| Provider          | Current Operations        | Status             |
| ----------------- | ------------------------- | ------------------ |
| **Slack**         | sendMessage, listChannels | ✅ Exists          |
| **Gmail**         | (needs operations)        | ✅ Provider exists |
| **Google Sheets** | (needs operations)        | ✅ Provider exists |

---

## Provider Structure Reference

Each provider follows the established pattern:

```
backend/src/integrations/providers/slack/
├── SlackProvider.ts           # Extends BaseProvider
├── client/
│   └── SlackClient.ts         # API client with auth
├── mcp/
│   └── SlackMCPAdapter.ts     # Auto-wraps operations as MCP tools
└── operations/
    ├── index.ts               # Exports all operations
    ├── sendMessage.ts         # Operation definition + executor
    └── listChannels.ts        # Operation definition + executor
```

---

## Operations to Add/Verify

### Slack Operations (Extend Existing)

**Current**: sendMessage, listChannels

**Add**:

- `searchMessages` - Search workspace messages
- `addReaction` - React to message
- `getUserInfo` - Get user details

```typescript
// backend/src/integrations/providers/slack/operations/searchMessages.ts
export const searchMessagesSchema = z.object({
    query: z.string().describe("Search query"),
    count: z.number().optional().default(20),
    sort: z.enum(["score", "timestamp"]).optional()
});

export const searchMessagesOperation: OperationDefinition = {
    id: "searchMessages",
    name: "Search Messages",
    description: "Search for messages in Slack workspace",
    category: "search",
    inputSchema: searchMessagesSchema,
    inputSchemaJSON: toJSONSchema(searchMessagesSchema)
};

export async function executeSearchMessages(
    client: SlackClient,
    params: z.infer<typeof searchMessagesSchema>
): Promise<OperationResult> {
    const response = await client.post("/search.messages", {
        query: params.query,
        count: params.count,
        sort: params.sort
    });

    return {
        success: true,
        data: response.messages
    };
}
```

### Gmail Operations (Add to Existing Provider)

**Current Provider**: `backend/src/integrations/providers/gmail/`

**Operations to add**:

- `sendEmail` - Send email with attachments
- `searchEmails` - Search with Gmail query syntax
- `getEmail` - Get specific email by ID
- `replyToEmail` - Reply in thread

```typescript
// backend/src/integrations/providers/gmail/operations/sendEmail.ts
export const sendEmailSchema = z.object({
    to: z.array(z.string().email()),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    subject: z.string(),
    body: z.string(),
    bodyType: z.enum(["text", "html"]).default("text"),
    attachments: z
        .array(
            z.object({
                filename: z.string(),
                content: z.string(),
                contentType: z.string()
            })
        )
        .optional()
});

export const sendEmailOperation: OperationDefinition = {
    id: "sendEmail",
    name: "Send Email",
    description: "Send an email with optional attachments",
    category: "send",
    inputSchema: sendEmailSchema,
    inputSchemaJSON: toJSONSchema(sendEmailSchema)
};
```

### Google Sheets Operations (Add to Existing Provider)

**Current Provider**: `backend/src/integrations/providers/google-sheets/`

**Operations to add**:

- `readSheet` - Read data from range
- `appendRows` - Add rows to sheet
- `updateCells` - Update specific cells
- `createSheet` - Create new sheet tab

```typescript
// backend/src/integrations/providers/google-sheets/operations/readSheet.ts
export const readSheetSchema = z.object({
    spreadsheetId: z.string(),
    range: z.string().describe("A1 notation, e.g., 'Sheet1!A1:D10'"),
    valueRenderOption: z.enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"]).optional()
});

export const readSheetOperation: OperationDefinition = {
    id: "readSheet",
    name: "Read Sheet",
    description: "Read data from a Google Sheets range",
    category: "read",
    inputSchema: readSheetSchema,
    inputSchemaJSON: toJSONSchema(readSheetSchema)
};
```

---

## Unit Tests

### Test Pattern

**Pattern C (Mock Services)**: Use `nock` to mock provider APIs.

### Files to Create

| Integration   | Test File                                                   | Pattern |
| ------------- | ----------------------------------------------------------- | ------- |
| Slack         | `backend/tests/unit/integrations/slack-operations.test.ts`  | C       |
| Gmail         | `backend/tests/unit/integrations/gmail-operations.test.ts`  | C       |
| Google Sheets | `backend/tests/unit/integrations/sheets-operations.test.ts` | C       |

### Required Test Cases

#### slack-operations.test.ts

- `should send message to channel`
- `should send direct message`
- `should list channels`
- `should handle rate limiting`

#### gmail-operations.test.ts

- `should search emails by query`
- `should send email with attachments`
- `should read email content`
- `should handle OAuth token refresh`

#### sheets-operations.test.ts

- `should read range from spreadsheet`
- `should write data to range`
- `should append rows to sheet`
- `should create new spreadsheet`

---

## Test Workflow: Lead Notification

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Webhook    │───▶│   Gmail      │───▶│   Slack     │
│ (lead)      │    │ (search)     │    │ (notify)    │
└─────────────┘    └──────────────┘    └─────────────┘
```

**Test Flow**:

1. Webhook receives new lead data
2. Gmail node searches for past conversations with lead's email
3. Slack node notifies sales channel with lead info + history

---

## How MCP Auto-Wrapping Works

When you add a new operation, it's **automatically available as an MCP tool** for agents:

```typescript
// 1. Register operation in provider constructor
class SlackProvider extends BaseProvider {
    constructor() {
        super();
        this.registerOperation(sendMessageOperation);
        this.registerOperation(listChannelsOperation);
        this.registerOperation(searchMessagesOperation); // NEW

        // MCP adapter automatically wraps all registered operations
        this.mcpAdapter = new SlackMCPAdapter(this.operations);
    }
}

// 2. MCP adapter auto-generates tools
class SlackMCPAdapter {
    getTools(): MCPTool[] {
        // Automatically converts ALL operations to MCP tools
        return Array.from(this.operations.values()).map((op) => ({
            name: `slack_${op.id}`, // slack_searchMessages
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }
}

// 3. Agents can now use the tool
// GET /api/connections/:id/mcp-tools returns:
// [
//   { name: "slack_sendMessage", ... },
//   { name: "slack_listChannels", ... },
//   { name: "slack_searchMessages", ... }  // NEW - automatically added
// ]
```

---

## Files to Modify/Create

### Slack (Extend)

```
backend/src/integrations/providers/slack/
├── SlackProvider.ts           # Register new operations
└── operations/
    ├── index.ts               # Export new operations
    ├── searchMessages.ts      # NEW
    ├── addReaction.ts         # NEW
    └── getUserInfo.ts         # NEW
```

### Gmail (Add Operations)

```
backend/src/integrations/providers/gmail/
├── GmailProvider.ts           # Register operations
├── client/
│   └── GmailClient.ts         # API client
└── operations/
    ├── index.ts
    ├── sendEmail.ts           # NEW
    ├── searchEmails.ts        # NEW
    ├── getEmail.ts            # NEW
    └── replyToEmail.ts        # NEW
```

### Google Sheets (Add Operations)

```
backend/src/integrations/providers/google-sheets/
├── GoogleSheetsProvider.ts    # Register operations
├── client/
│   └── GoogleSheetsClient.ts  # API client
└── operations/
    ├── index.ts
    ├── readSheet.ts           # NEW
    ├── appendRows.ts          # NEW
    ├── updateCells.ts         # NEW
    └── createSheet.ts         # NEW
```

---

## How to Deliver

1. **Verify existing provider structure** matches BaseProvider pattern
2. **Add operations** following the Zod schema → OperationDefinition pattern
3. **Register operations** in provider constructor
4. **Test via workflow** - IntegrationNode with each operation
5. **Test via agent** - Verify MCP tools are auto-generated
6. **Add integration tests** for each operation

---

## How to Test

| Test                  | Expected Result                   |
| --------------------- | --------------------------------- |
| Slack sendMessage     | Message posted to channel         |
| Slack searchMessages  | Matching messages returned        |
| Gmail sendEmail       | Email delivered                   |
| Gmail searchEmails    | Matching emails returned          |
| Sheets readSheet      | Data returned as array            |
| Sheets appendRows     | New rows added                    |
| MCP tools endpoint    | All operations available as tools |
| Agent uses Slack tool | Tool executes via MCP adapter     |

### Integration Tests

```typescript
describe("Slack Operations", () => {
    it("sends message via workflow execution", async () => {
        const result = await executeIntegrationNode(
            {
                connectionId: slackConnectionId,
                operation: "sendMessage",
                parameters: { channel: "general", text: "Test" }
            },
            context
        );

        expect(result.success).toBe(true);
    });

    it("is available as MCP tool", async () => {
        const tools = await getMCPTools(slackConnectionId);
        expect(tools.find((t) => t.name === "slack_sendMessage")).toBeDefined();
    });
});

describe("Gmail Operations", () => {
    it("sends email via workflow execution", async () => {
        const result = await executeIntegrationNode(
            {
                connectionId: gmailConnectionId,
                operation: "sendEmail",
                parameters: {
                    to: ["test@example.com"],
                    subject: "Test Email",
                    body: "This is a test"
                }
            },
            context
        );

        expect(result.data.messageId).toBeDefined();
    });
});
```

---

## Acceptance Criteria

- [ ] Slack has 5+ operations (sendMessage, listChannels, searchMessages, addReaction, getUserInfo)
- [ ] Gmail has 4+ operations (sendEmail, searchEmails, getEmail, replyToEmail)
- [ ] Google Sheets has 4+ operations (readSheet, appendRows, updateCells, createSheet)
- [ ] All operations have Zod schemas with JSON Schema conversion
- [ ] All operations are auto-wrapped as MCP tools
- [ ] IntegrationNode can execute all operations
- [ ] Agents can use all operations as tools
- [ ] OAuth flows work for all three providers

---

## Key Points

1. **Providers already exist** - Just add/extend operations
2. **Follow established patterns** - Zod schema → OperationDefinition → register
3. **MCP auto-wrapping is automatic** - No extra work needed for agent tools
4. **Two execution paths** - Workflows use direct API, agents use MCP
5. **Test both paths** - Verify workflow execution AND agent tool availability
