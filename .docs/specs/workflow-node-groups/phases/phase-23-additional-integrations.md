# Phase 23: Additional Integrations

## Overview

Extend existing providers with operations for workflow use. All 25+ providers **already exist** with the BaseProvider pattern and MCP auto-wrapping - this phase focuses on **adding operations** to commonly-used providers.

---

## Prerequisites

- **Phase 22**: Core Integrations (pattern established)

---

## Existing Providers (All Already Implemented)

All providers exist in `backend/src/integrations/providers/`:

| Category               | Providers (Already Exist)                   |
| ---------------------- | ------------------------------------------- |
| **CRM/Sales**          | HubSpot, Salesforce, Apollo                 |
| **Productivity**       | Notion, Airtable, Coda                      |
| **Project Management** | Linear, Jira, Figma                         |
| **Communication**      | Slack, Gmail, WhatsApp, Instagram, Facebook |
| **Microsoft**          | Teams, OneDrive, Excel, Word                |
| **Developer**          | GitHub                                      |
| **Database**           | PostgreSQL, MongoDB                         |
| **Support**            | Zendesk                                     |
| **Google**             | Gmail, Sheets, Drive, Calendar              |

---

## Priority Providers for This Phase

Focus on adding operations to these high-value providers:

### 1. Notion (Productivity)

**Current Provider**: `backend/src/integrations/providers/notion/`

**Operations to add**:

- `queryDatabase` - Query database with filters
- `createPage` - Create new page/row
- `updatePage` - Update page properties
- `getPage` - Get page content
- `appendBlock` - Add content to page

```typescript
// backend/src/integrations/providers/notion/operations/queryDatabase.ts
export const queryDatabaseSchema = z.object({
    database_id: z.string(),
    filter: z.record(z.unknown()).optional(),
    sorts: z
        .array(
            z.object({
                property: z.string(),
                direction: z.enum(["ascending", "descending"])
            })
        )
        .optional(),
    page_size: z.number().max(100).default(100)
});

export const queryDatabaseOperation: OperationDefinition = {
    id: "queryDatabase",
    name: "Query Database",
    description: "Query a Notion database with filters and sorting",
    category: "read",
    inputSchema: queryDatabaseSchema,
    inputSchemaJSON: toJSONSchema(queryDatabaseSchema)
};
```

### 2. HubSpot (CRM)

**Current Provider**: `backend/src/integrations/providers/hubspot/`

**Operations to add**:

- `getContact` - Get contact by email/ID
- `createContact` - Create new contact
- `updateContact` - Update contact properties
- `createDeal` - Create new deal
- `updateDeal` - Update deal stage/properties
- `getCompany` - Get company by domain/ID

```typescript
// backend/src/integrations/providers/hubspot/operations/createContact.ts
export const createContactSchema = z.object({
    email: z.string().email(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    properties: z.record(z.string()).optional()
});

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in HubSpot CRM",
    category: "create",
    inputSchema: createContactSchema,
    inputSchemaJSON: toJSONSchema(createContactSchema)
};
```

### 3. GitHub (Developer)

**Current Provider**: `backend/src/integrations/providers/github/`

**Operations to add**:

- `createIssue` - Create GitHub issue
- `createPullRequest` - Create PR
- `getRepositoryInfo` - Get repo details
- `listIssues` - List issues with filters
- `addComment` - Add comment to issue/PR

### 4. Airtable (Database)

**Current Provider**: `backend/src/integrations/providers/airtable/`

**Operations to add**:

- `listRecords` - List records with filters
- `createRecord` - Create new record
- `updateRecord` - Update record fields
- `deleteRecord` - Delete record
- `getRecord` - Get single record

---

## Unit Tests

### Test Pattern

**Pattern C (Mock Services)**: Use `nock` to mock provider APIs.

### Files to Create

| Integration | Test File                                                     | Pattern |
| ----------- | ------------------------------------------------------------- | ------- |
| HubSpot     | `backend/tests/unit/integrations/hubspot-operations.test.ts`  | C       |
| Notion      | `backend/tests/unit/integrations/notion-operations.test.ts`   | C       |
| Airtable    | `backend/tests/unit/integrations/airtable-operations.test.ts` | C       |

### Required Test Cases

#### hubspot-operations.test.ts

- `should create contact`
- `should update contact properties`
- `should search contacts by criteria`
- `should handle API pagination`

#### notion-operations.test.ts

- `should query database`
- `should create page`
- `should update page properties`
- `should handle rich text formatting`

#### airtable-operations.test.ts

- `should list records with filter`
- `should create record`
- `should update record fields`
- `should handle formula fields`

---

## Test Workflow: CRM Sync

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Notion     │───▶│  Transform   │───▶│  HubSpot    │
│ (query)     │    │              │    │ (create)    │
└─────────────┘    └──────────────┘    └─────────────┘
```

**Test Flow**:

1. Query Notion database for new leads (status = "New")
2. Transform data to HubSpot format
3. Create contacts in HubSpot CRM

---

## Adding Operations Pattern

Every provider follows the same pattern. To add operations:

```typescript
// 1. Define schema with Zod
export const operationSchema = z.object({
    field1: z.string(),
    field2: z.number().optional()
});

// 2. Create operation definition
export const myOperation: OperationDefinition = {
    id: "myOperation",
    name: "My Operation",
    description: "Does something useful",
    category: "read", // or "create", "update", "delete", "action"
    inputSchema: operationSchema,
    inputSchemaJSON: toJSONSchema(operationSchema), // For MCP tools
    retryable: true,
    timeout: 30000
};

// 3. Implement executor
export async function executeMyOperation(
    client: ProviderClient,
    params: z.infer<typeof operationSchema>
): Promise<OperationResult> {
    const response = await client.post("/api/endpoint", params);
    return { success: true, data: response };
}

// 4. Register in Provider constructor
class MyProvider extends BaseProvider {
    constructor() {
        super();
        this.registerOperation(myOperation); // Auto-adds to MCP tools
        this.mcpAdapter = new MyMCPAdapter(this.operations);
    }
}
```

---

## Files to Modify

### Notion

```
backend/src/integrations/providers/notion/
├── NotionProvider.ts          # Register operations
├── client/NotionClient.ts     # API client
├── mcp/NotionMCPAdapter.ts    # Already exists
└── operations/
    ├── index.ts
    ├── queryDatabase.ts       # NEW
    ├── createPage.ts          # NEW
    ├── updatePage.ts          # NEW
    ├── getPage.ts             # NEW
    └── appendBlock.ts         # NEW
```

### HubSpot

```
backend/src/integrations/providers/hubspot/
├── HubSpotProvider.ts
├── client/HubSpotClient.ts
├── mcp/HubSpotMCPAdapter.ts
└── operations/
    ├── index.ts
    ├── getContact.ts          # NEW
    ├── createContact.ts       # NEW
    ├── updateContact.ts       # NEW
    ├── createDeal.ts          # NEW
    ├── updateDeal.ts          # NEW
    └── getCompany.ts          # NEW
```

### GitHub

```
backend/src/integrations/providers/github/
└── operations/
    ├── createIssue.ts         # NEW
    ├── createPullRequest.ts   # NEW
    ├── getRepositoryInfo.ts   # NEW
    ├── listIssues.ts          # NEW
    └── addComment.ts          # NEW
```

### Airtable

```
backend/src/integrations/providers/airtable/
└── operations/
    ├── listRecords.ts         # NEW
    ├── createRecord.ts        # NEW
    ├── updateRecord.ts        # NEW
    ├── deleteRecord.ts        # NEW
    └── getRecord.ts           # NEW
```

---

## How to Deliver

1. **Pick provider** from list above
2. **Check existing structure** - Verify BaseProvider pattern
3. **Add operations** - Follow Zod → OperationDefinition pattern
4. **Register in provider** - Add to constructor
5. **Test workflow execution** - IntegrationNode with operation
6. **Verify MCP tools** - Check `/api/connections/:id/mcp-tools`
7. **Add tests** - Both workflow and MCP paths

---

## How to Test

| Test                  | Expected Result                    |
| --------------------- | ---------------------------------- |
| Notion queryDatabase  | Returns filtered database rows     |
| Notion createPage     | Creates page with properties       |
| HubSpot createContact | Contact created in CRM             |
| HubSpot createDeal    | Deal created with associations     |
| GitHub createIssue    | Issue created in repository        |
| Airtable listRecords  | Records returned with pagination   |
| MCP tools list        | All new operations appear as tools |
| Agent uses new tool   | Tool executes correctly            |

### Integration Tests

```typescript
describe("Notion Operations", () => {
    it("queries database via workflow", async () => {
        const result = await executeIntegrationNode(
            {
                connectionId: notionConnectionId,
                operation: "queryDatabase",
                parameters: {
                    database_id: testDatabaseId,
                    filter: { property: "Status", select: { equals: "Active" } }
                }
            },
            context
        );

        expect(result.data.results.length).toBeGreaterThan(0);
    });

    it("creates page via workflow", async () => {
        const result = await executeIntegrationNode(
            {
                connectionId: notionConnectionId,
                operation: "createPage",
                parameters: {
                    parent: { database_id: testDatabaseId },
                    properties: {
                        Name: { title: [{ text: { content: "Test" } }] }
                    }
                }
            },
            context
        );

        expect(result.data.id).toBeDefined();
    });
});

describe("HubSpot Operations", () => {
    it("creates contact and deal", async () => {
        // Create contact
        const contact = await executeIntegrationNode(
            {
                connectionId: hubspotConnectionId,
                operation: "createContact",
                parameters: { email: "test@example.com", firstname: "Test" }
            },
            context
        );

        // Create deal with contact association
        const deal = await executeIntegrationNode(
            {
                connectionId: hubspotConnectionId,
                operation: "createDeal",
                parameters: {
                    dealname: "Test Deal",
                    amount: 5000,
                    associated_contacts: [contact.data.id]
                }
            },
            context
        );

        expect(deal.data.id).toBeDefined();
    });
});
```

---

## Acceptance Criteria

- [ ] Notion has 5+ operations with full query/create/update support
- [ ] HubSpot has 6+ operations covering contacts, deals, companies
- [ ] GitHub has 5+ operations for issues and PRs
- [ ] Airtable has 5+ operations for CRUD
- [ ] All operations have proper Zod schemas
- [ ] All operations auto-wrapped as MCP tools
- [ ] IntegrationNode works with all new operations
- [ ] Agent can use all new operations as tools

---

## Future Providers

After these additions, consider adding operations to:

| Provider        | Suggested Operations                      |
| --------------- | ----------------------------------------- |
| Salesforce      | getAccount, createLead, updateOpportunity |
| Linear          | createIssue, updateIssue, listProjects    |
| Jira            | createIssue, transitionIssue, addComment  |
| Zendesk         | createTicket, updateTicket, addComment    |
| Microsoft Teams | sendMessage, createChannel                |

---

## Key Points

1. **All providers exist** - No new provider creation needed
2. **Follow the pattern** - Zod schema → OperationDefinition → register
3. **MCP auto-wrapping** - Operations automatically become agent tools
4. **Test both paths** - Workflow execution + agent tool availability
5. **Consistent schemas** - Use Zod with proper descriptions for LLM understanding
