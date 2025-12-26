# FlowMaestro Development Guidelines

This document provides coding standards, architectural context, and best practices for Claude Code when working on the FlowMaestro codebase.

---

## General Coding Style

### Code Formatting

- **Indentation**: 4 spaces (no tabs) - enforced by Prettier via `tabWidth: 4`
- **Quotes**: Double quotes for strings
- **Semicolons**: Required at the end of statements
- **Line Length**: 100 characters max - enforced by Prettier via `printWidth: 100`
- **Trailing Commas**: Not required - enforced by Prettier via `trailingComma: "none"`

### TypeScript Standards

- **No `any` type**: Always use proper typing. Use `unknown` if type is truly unknown, then narrow with type guards
- **Strict Mode**: TypeScript strict mode is enabled across all workspaces with explicit flags:
    - `noImplicitAny: true` - No implicit any types allowed
    - `strictNullChecks: true` - Null and undefined must be explicitly handled
    - `strictFunctionTypes: true` - Function types are checked strictly
    - `strictBindCallApply: true` - bind, call, apply are type-checked
    - `strictPropertyInitialization: true` - Class properties must be initialized
    - `noImplicitThis: true` - `this` expressions must have explicit types
- **Type Definitions**: Export interfaces and types for shared data structures
- **Type Imports**: Use `import type` for type-only imports
- **Shared Types**: All types that are used across frontend and backend MUST be defined in the `@flowmaestro/shared` package (`shared/src/`), not in frontend or backend. Import from `@flowmaestro/shared`.
- **Generic Constraints**: Use proper generic constraints instead of `any`
- **Compilation Checks**: ALWAYS run TypeScript compiler before committing changes

### HTTP Client Standards

**IMPORTANT**: Always use native `fetch` API for HTTP requests. Never use axios or other HTTP client libraries.

- **Native Fetch**: Use Node.js built-in `fetch` (available since Node 18)
- **No axios**: The codebase has migrated away from axios - do not add it back
- **Type Safety**: Always type your fetch responses properly
- **Error Handling**: Check `response.ok` before parsing response
- **Timeouts**: Use `AbortController` with `signal` for request timeouts
- **JSON Parsing**: Use `await response.json()` for JSON responses
- **FormData**: Let browser/Node.js set Content-Type for FormData (includes boundary)

#### Fetch Examples

```typescript
// ❌ BAD - Don't use axios
import axios from "axios";
const response = await axios.get("/api/data");
const data = response.data;

// ✅ GOOD - Use native fetch
const response = await fetch("/api/data");
if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
const data = await response.json();

// ✅ GOOD - POST with JSON body
const response = await fetch("/api/data", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: "example" })
});

// ✅ GOOD - With timeout using AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

try {
    const response = await fetch("/api/data", {
        signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json();
} catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
        throw new Error("Request timeout");
    }
    throw error;
}

// ✅ GOOD - FormData upload (no Content-Type header)
const formData = new FormData();
formData.append("file", fileBlob);

const response = await fetch("/api/upload", {
    method: "POST",
    body: formData // Don't set Content-Type - browser sets it with boundary
});
```

#### Using the FetchClient Utility

For advanced use cases with retry logic and connection pooling, use the `FetchClient` utility:

```typescript
import { FetchClient } from "../shared/utils/fetch-client";

const client = new FetchClient({
    baseURL: "https://api.example.com",
    timeout: 30000,
    retryConfig: {
        maxRetries: 3,
        retryableStatuses: [429, 500, 502, 503],
        backoffStrategy: "exponential"
    }
});

// Add request interceptor (e.g., for auth)
client.addRequestInterceptor((config) => {
    if (!config.headers) {
        config.headers = {};
    }
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
});

// Make requests
const data = await client.get("/endpoint");
const created = await client.post("/endpoint", { name: "test" });
```

### Logging Standards

**IMPORTANT**: Never use `console.log`, `console.error`, `console.warn`, or `console.debug` in application code. Always use the structured logging module.

#### Backend Logging

Use the centralized logger from `backend/src/core/logging`:

```typescript
// ❌ BAD - Don't use console
console.log("User logged in", { userId: "123" });
console.error("Failed to process request", error);

// ✅ GOOD - Use structured logger
import { createServiceLogger } from "../core/logging";

const logger = createServiceLogger("MyService");

logger.info({ userId: "123" }, "User logged in");
logger.error({ err: error, userId: "123" }, "Failed to process request");
```

**Logger Types:**

| Function | Use Case |
|----------|----------|
| `createServiceLogger(name)` | For services and modules - creates a child logger with component name |
| `createRequestLogger(request)` | For route handlers - includes correlation IDs from request |
| `createWorkerLogger(name)` | For Temporal workers |

**Log Levels:**
- `trace` - Very detailed debugging (rarely used)
- `debug` - Development debugging info
- `info` - Normal operational messages
- `warn` - Warning conditions
- `error` - Error conditions
- `fatal` - Critical failures

#### Frontend Logging

Use the frontend logger from `frontend/src/lib/logger.ts`:

```typescript
// ❌ BAD - Don't use console
console.log("Button clicked");
console.error("API call failed", error);

// ✅ GOOD - Use structured logger
import { logger } from "../lib/logger";

logger.info("Button clicked", { buttonId: "submit" });
logger.error("API call failed", error, { endpoint: "/api/users" });
```

The frontend logger automatically:
- Batches logs and sends to backend every 5 seconds (or when 50 logs accumulate)
- Captures session ID and correlation IDs
- Redacts sensitive fields (passwords, tokens, API keys)
- Uses `sendBeacon` on page unload to ensure logs aren't lost

#### Exceptions (where console is allowed)

| Location | Reason |
|----------|--------|
| `backend/tests/**` | Test files can use console for debugging |
| `backend/scripts/**` | CLI scripts output to console |
| `frontend/src/lib/logger.ts` | The logger itself uses console in dev mode |
| `backend/src/temporal/shared/workflow-logger.ts` | Temporal workflows run in a V8 sandbox that cannot use external modules |

### Pre-Commit Type Checking Protocol

**CRITICAL**: Before committing any code changes, you MUST:

1. **Run TypeScript Compiler** to check for errors:

    ```bash
    # Check all packages
    npx tsc --noEmit

    # Or check specific packages
    cd backend && npx tsc --noEmit
    cd frontend && npx tsc --noEmit
    cd shared && npx tsc --noEmit
    ```

2. **Fix ALL Type Errors**: Do not commit code with TypeScript errors. Common issues:
    - Implicit `any` types - add explicit type annotations
    - Missing return types - add explicit return type declarations
    - Undefined/null access - add null checks or optional chaining
    - Type mismatches - ensure types align correctly
    - Missing imports - import types from shared package

3. **Address Type Warnings**: Fix warnings about:
    - Unused variables or imports (remove or prefix with `_`)
    - Unreachable code
    - Deprecated API usage
    - Type assertion usage (prefer type guards)

4. **Run Linter** to catch additional issues:
    ```bash
    npm run lint
    ```

**Why This Matters**:

- Type errors in production can cause runtime failures
- Implicit `any` bypasses type safety and defeats the purpose of TypeScript
- Type warnings indicate potential bugs or code quality issues
- Consistent type checking prevents technical debt accumulation

### Examples

```typescript
// ❌ BAD
function processData(data: any) {
    const result = data.map((item) => {
        return {
            id: item.id,
            name: item.name
        };
    });
    alert("Data processed!");
}

// ✅ GOOD
interface DataItem {
    id: string;
    name: string;
}

function processData(data: DataItem[]): DataItem[] {
    const result = data.map((item) => {
        return {
            id: item.id,
            name: item.name
        };
    });

    // Use custom dialog instead of alert
    showSuccessDialog({ message: "Data processed successfully" });

    return result;
}
```

---

## Frontend-Specific Guidelines

### Technology Stack

- **Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite (fast HMR and builds)
- **State Management**: Zustand 4.5.0 (NOT Redux)
- **Server State**: TanStack Query 5.18.0 (for API calls and caching)
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Radix UI for accessible primitives
- **Workflow Canvas**: React Flow 11.10.4
- **Real-time**: Socket.IO Client 4.7.4

### Component Organization

```
frontend/src/
├── pages/              # Route-level page components
├── components/
│   ├── common/         # Reusable UI components (Dialog, ConfirmDialog, etc.)
│   ├── canvas/         # React Flow workflow canvas components
│   └── [feature]/      # Feature-specific components
├── stores/             # Zustand state stores
├── lib/                # API clients, utilities, websocket
└── hooks/              # Custom React hooks
```

### UI/UX Standards

#### Dialogs and Modals

**CRITICAL**: Never use browser `alert()`, `confirm()`, or `prompt()`. Always use custom dialog components.

```typescript
// ❌ NEVER DO THIS
alert("Operation completed");
const confirmed = confirm("Are you sure?");

// ✅ ALWAYS DO THIS
import { Dialog } from "../components/common/Dialog";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

// For simple messages
<Dialog
    isOpen={isOpen}
    onClose={handleClose}
    title="Success"
>
    <p>Operation completed successfully</p>
</Dialog>

// For confirmations
<ConfirmDialog
    isOpen={isOpen}
    onClose={handleClose}
    onConfirm={handleConfirm}
    title="Confirm Action"
    message="Are you sure you want to proceed?"
    confirmText="Yes, proceed"
    cancelText="Cancel"
    variant="danger"  // Use for destructive actions
/>
```

#### Available Dialog Components

- `Dialog` (frontend/src/components/common/Dialog.tsx) - Base dialog with title, content, and close
- `ConfirmDialog` (frontend/src/components/common/ConfirmDialog.tsx) - Two-action confirmation
- Form dialogs - See examples like `CreateWorkflowDialog.tsx` for form patterns

### State Management Patterns

#### Zustand Stores

Use Zustand for client-side state. Follow the existing store pattern:

```typescript
import { create } from "zustand";

interface MyStore {
    items: Item[];
    selectedItem: Item | null;
    setItems: (items: Item[]) => void;
    selectItem: (id: string) => void;
    clearSelection: () => void;
}

export const useMyStore = create<MyStore>((set, get) => ({
    items: [],
    selectedItem: null,

    setItems: (items) => set({ items }),

    selectItem: (id) => {
        const item = get().items.find((i) => i.id === id);
        set({ selectedItem: item || null });
    },

    clearSelection: () => set({ selectedItem: null })
}));
```

#### TanStack Query for API Calls

Use TanStack Query (React Query) for all server state:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// Fetch data
const { data, isLoading, error } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.getWorkflows()
});

// Mutations
const queryClient = useQueryClient();
const mutation = useMutation({
    mutationFn: (data: CreateWorkflowData) => api.createWorkflow(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
    }
});
```

### Component Patterns

#### Functional Components with TypeScript

```typescript
import React from "react";

interface MyComponentProps {
    title: string;
    count: number;
    onUpdate: (count: number) => void;
    optional?: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({
    title,
    count,
    onUpdate,
    optional = "default value",
}) => {
    const [localState, setLocalState] = React.useState<number>(0);

    return (
        <div className="p-4">
            <h2>{title}</h2>
            <p>Count: {count}</p>
        </div>
    );
};
```

#### Event Handlers

```typescript
const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    // Handle click
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
};
```

### API Integration

Use the centralized API client (`frontend/src/lib/api.ts`):

```typescript
import { api } from "../lib/api";

// All API methods return typed responses
const workflows = await api.getWorkflows();
const workflow = await api.getWorkflow(id);
const newWorkflow = await api.createWorkflow(data);
```

### WebSocket Usage

Use the WebSocket wrapper (`frontend/src/lib/websocket.ts`):

```typescript
import { websocket } from "../lib/websocket";

// In useEffect
React.useEffect(() => {
    const handler = (data: ExecutionUpdate) => {
        // Handle update
    };

    websocket.on("execution:update", handler);

    return () => {
        websocket.off("execution:update", handler);
    };
}, []);
```

### API Centralization

**IMPORTANT**: All frontend API calls MUST be defined in `frontend/src/lib/api.ts`. Do not make direct `fetch()` calls scattered throughout components.

**Why this matters:**

- Single source of truth for all API endpoints
- Consistent error handling and authentication
- Easier to update when API routes change
- Better type safety with shared response types

**How to add a new API call:**

1. Add the function to `frontend/src/lib/api.ts`:

```typescript
export async function myNewApiCall(param: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/my-endpoint`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ param })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}
```

2. Import and use in your component:

```typescript
import { myNewApiCall } from "../lib/api";

// In your component
const result = await myNewApiCall("value");
```

**Exception**: React hooks that need to construct dynamic OAuth redirect URLs (e.g., `useGoogleAuth.ts`, `useMicrosoftAuth.ts`) may define URL constants locally, but should use URL helper functions from `api.ts` when available.

---

## Backend-Specific Guidelines

### Technology Stack

- **Framework**: Fastify 5.6.1 (NOT Express)
- **Runtime**: Node.js 22+
- **Database**: PostgreSQL 15 with connection pooling
- **Cache**: Redis 7
- **Orchestration**: Temporal 1.23.0 for durable workflows
- **Validation**: Zod 3.22.4
- **ORM**: None - Using raw SQL with type-safe repositories

### Project Structure

```
backend/src/
├── api/
│   ├── routes/           # REST endpoints organized by resource
│   │   └── {resource}/
│   │       └── {action}.ts
│   ├── middleware/       # Auth, validation, error handling
│   └── server.ts         # Fastify server setup
├── temporal/
│   ├── workflows/        # Temporal workflow definitions
│   └── activities/       # Activity implementations (node executors)
├── storage/
│   ├── repositories/     # Type-safe database access layer
│   ├── models/           # TypeScript interfaces for DB entities
│   └── database.ts       # PostgreSQL connection pool
├── shared/
│   ├── config/           # Configuration management
│   ├── registry/         # Node type registry
│   └── utils/            # Shared utilities
└── types/                # TypeScript type definitions
```

### API Route Pattern

All routes follow this structure:

```typescript
// backend/src/api/routes/workflows/create.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { AppError } from "../../../shared/errors";

const createWorkflowSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    definition: z.object({
        nodes: z.array(z.any()),
        edges: z.array(z.any())
    })
});

export async function createWorkflowHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Validate request body
    const body = createWorkflowSchema.parse(request.body);

    // Get user from auth middleware
    const userId = request.user.id;

    // Business logic
    const workflowRepo = new WorkflowRepository();
    const workflow = await workflowRepo.create({
        userId,
        name: body.name,
        description: body.description,
        definition: body.definition
    });

    // Return standard response
    reply.code(201).send({
        success: true,
        data: workflow
    });
}
```

### Database Access Pattern

Use repositories for all database access:

```typescript
// backend/src/storage/repositories/WorkflowRepository.ts
import { pool } from "../database";
import type { Workflow, CreateWorkflowData } from "../models/Workflow";

export class WorkflowRepository {
    async findById(id: string, userId: string): Promise<Workflow | null> {
        const result = await pool.query<Workflow>(
            `SELECT * FROM workflows
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );

        return result.rows[0] || null;
    }

    async create(data: CreateWorkflowData): Promise<Workflow> {
        const result = await pool.query<Workflow>(
            `INSERT INTO workflows (user_id, name, description, definition)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [data.userId, data.name, data.description, data.definition]
        );

        return result.rows[0];
    }

    async update(id: string, userId: string, data: Partial<Workflow>): Promise<Workflow | null> {
        const result = await pool.query<Workflow>(
            `UPDATE workflows
             SET name = COALESCE($3, name),
                 description = COALESCE($4, description),
                 definition = COALESCE($5, definition),
                 updated_at = NOW()
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING *`,
            [id, userId, data.name, data.description, data.definition]
        );

        return result.rows[0] || null;
    }

    async softDelete(id: string, userId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE workflows
             SET deleted_at = NOW()
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );

        return result.rowCount > 0;
    }
}
```

### Error Handling

Use custom error classes:

```typescript
import {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError
} from "../../../shared/errors";

// In handlers
if (!workflow) {
    throw new NotFoundError("Workflow not found");
}

if (!hasPermission) {
    throw new UnauthorizedError("You don't have permission to access this resource");
}

if (invalidInput) {
    throw new ValidationError("Invalid input data", { field: "name" });
}

// Generic errors
throw new AppError("Something went wrong", 500);
```

### Middleware Chain

Routes use this middleware order:

1. **Authentication** (`auth.ts`) - Verify JWT token
2. **Validation** (inline with Zod) - Validate request body/params
3. **Handler** - Business logic
4. **Error Handler** (`errorHandler.ts`) - Catch and format errors

```typescript
import { authenticate } from "../../middleware/auth";

// Register route
fastify.post("/workflows", { preHandler: [authenticate] }, createWorkflowHandler);
```

### Temporal Workflows

Follow the activity pattern for node executors:

```typescript
// backend/src/temporal/activities/node-executors/my-node-executor.ts
import { ActivityContext } from "../../types";

export async function executeMyNode(
    context: ActivityContext,
    config: MyNodeConfig
): Promise<ActivityContext> {
    // Validate config
    if (!config.requiredField) {
        throw new Error("requiredField is required");
    }

    // Execute logic
    const result = await performOperation(config);

    // Update context
    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: result
        }
    };
}
```

### Database Design Principles

- **Multi-tenant**: All tables have `user_id` foreign key
- **Soft Deletes**: Use `deleted_at` timestamp, never hard delete
- **Timestamps**: All tables have `created_at` and `updated_at`
- **JSONB**: Use for flexible schema (workflow definitions, configs)
- **Indexes**: Add indexes on frequently queried columns
- **Foreign Keys**: Always use foreign key constraints

---

## Testing Guidelines

### Frontend Testing

- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Playwright for user flow testing
- **Test Files**: Co-locate with components (`MyComponent.test.tsx`)

### Backend Testing

- **Integration Tests**: Jest + Supertest for API endpoint testing
- **Test Location**: `backend/tests/integration/`
- **Test Pattern**: Test happy path, error cases, and edge cases

```typescript
describe("POST /api/workflows", () => {
    it("should create a workflow", async () => {
        const response = await request(app)
            .post("/api/workflows")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Test Workflow",
                description: "Test description",
                definition: { nodes: [], edges: [] }
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("id");
    });
});
```

---

## Common Patterns

### Loading States

```typescript
if (isLoading) {
    return <div>Loading...</div>;
}

if (error) {
    return <div>Error: {error.message}</div>;
}

return <div>{/* Render data */}</div>;
```

### Form Handling

```typescript
const [formData, setFormData] = React.useState({
    name: "",
    description: ""
});
const [errors, setErrors] = React.useState<Record<string, string>>({});

const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate
    const validationErrors: Record<string, string> = {};
    if (!formData.name) {
        validationErrors.name = "Name is required";
    }

    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
    }

    // Submit
    try {
        await mutation.mutateAsync(formData);
        onSuccess();
    } catch (error) {
        setErrors({ submit: "Failed to submit form" });
    }
};
```

### Async Operations with Loading State

```typescript
const [isProcessing, setIsProcessing] = React.useState(false);

const handleAction = async (): Promise<void> => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
        await performOperation();
        showSuccessDialog({ message: "Operation completed" });
    } catch (error) {
        showErrorDialog({
            message: error instanceof Error ? error.message : "Operation failed"
        });
    } finally {
        setIsProcessing(false);
    }
};
```

---

## Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

### Backend (.env)

```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/flowmaestro
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
TEMPORAL_ADDRESS=localhost:7233
```

---

## Secret Management

FlowMaestro uses a **Pulumi-driven secret management system** where all secrets are defined in a single location and automatically provisioned across GCP Secret Manager, Kubernetes, and local development environments.

### Architecture Overview

```
Pulumi.production.yaml (single source of truth)
        │
        ▼
    pulumi up
        │
        ├──► GCP Secret Manager (empty secrets created)
        ├──► K8s ExternalSecrets (grouped by category)
        └──► Pulumi outputs (JSON definitions for scripts)
                │
                ├──► setup-secrets-gcp.sh (prompts for values → GCP)
                ├──► sync-secrets-local.sh (GCP → backend/.env)
                └──► External Secrets Operator (GCP → K8s Secrets)
```

### Adding a New Secret

**IMPORTANT**: Never hardcode secrets in multiple places. Always use the Pulumi-driven approach.

**Step 1: Define the secret in `infra/pulumi/Pulumi.production.yaml`**

Add to the `flowmaestro-infrastructure:secrets` JSON array:

```json
{
    "name": "my-new-secret",
    "envVar": "MY_NEW_SECRET",
    "category": "service",
    "deployments": ["api"],
    "required": false,
    "description": "Description of what this secret is for"
}
```

Secret definition properties:

- `name`: kebab-case identifier (becomes GCP secret name: `flowmaestro-app-{name}`)
- `envVar`: SCREAMING_SNAKE_CASE environment variable name
- `category`: `core` | `oauth` | `llm` | `service` (determines K8s secret grouping)
- `deployments`: `["api"]` | `["worker"]` | `["api", "worker"]` (which pods need this secret)
- `required`: `true` | `false` (whether pod should fail without it)
- `description`: Human-readable description (shown in setup prompts)

**Step 2: Apply infrastructure changes**

```bash
cd infra/pulumi && pulumi up
```

This creates:

- Empty GCP secret `flowmaestro-app-my-new-secret`
- K8s ExternalSecret mapping (grouped by category)
- Updated Pulumi outputs

**Step 3: Set the secret value**

```bash
./infra/scripts/setup-secrets-gcp.sh
# Prompts for MY_NEW_SECRET value and writes to GCP
```

**Step 4: Sync to environments**

```bash
# For Kubernetes (automatic within 5 minutes, or force):
kubectl annotate externalsecret -n flowmaestro --all force-sync=$(date +%s)
kubectl rollout restart deployment/api-server -n flowmaestro

# For local development:
./infra/scripts/sync-secrets-local.sh
```

### Secret Categories

Secrets are grouped into K8s secrets by category:

| Category  | K8s Secret Name   | Purpose                                         |
| --------- | ----------------- | ----------------------------------------------- |
| `core`    | `core-secrets`    | JWT, encryption keys                            |
| `oauth`   | `oauth-secrets`   | OAuth client IDs/secrets                        |
| `llm`     | `llm-secrets`     | LLM API keys (OpenAI, Anthropic, etc.)          |
| `service` | `service-secrets` | Third-party service keys (Resend, Twilio, etc.) |

### Updating an Existing Secret Value

```bash
# Interactive (prompts for all secrets):
./infra/scripts/setup-secrets-gcp.sh --prompt-all

# Direct update:
echo -n "new-value" | gcloud secrets versions add flowmaestro-app-my-secret --data-file=-
```

### Accessing Secrets in Code

Secrets are available as environment variables. The backend reads them automatically:

```typescript
// backend/src/shared/config/index.ts
const resendApiKey = process.env.RESEND_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
```

### Key Files

| File                                        | Purpose                                     |
| ------------------------------------------- | ------------------------------------------- |
| `infra/pulumi/Pulumi.production.yaml`       | Secret definitions (single source of truth) |
| `infra/pulumi/src/resources/app-secrets.ts` | Pulumi resource generation logic            |
| `infra/scripts/setup-secrets-gcp.sh`        | Interactive script to set secret values     |
| `infra/scripts/sync-secrets-local.sh`       | Sync secrets to local `.env` file           |

---

## Key Architectural Decisions

1. **Fastify over Express**: 3x faster, better TypeScript support
2. **Zustand over Redux**: Simpler, less boilerplate, better performance
3. **TanStack Query**: Automatic caching, background refetching, request deduplication
4. **Repository Pattern**: Centralized, type-safe database access
5. **Temporal**: Durable workflow execution with automatic retries and timeouts
6. **Soft Deletes**: Data recovery and audit trail
7. **Custom Dialogs**: Consistent UX, better accessibility, customizable styling
8. **WebSocket**: Real-time updates for workflow execution status

---

## Development Commands

```bash
# Docker infrastructure
npm run docker:up      # Start all services (postgres, redis, temporal, etc.)
npm run docker:down    # Stop services (keeps data)
npm run docker:clean   # Stop and remove volumes, create fresh ones
npm run docker:reset   # Complete reset: clean + start + migrate (one command!)
npm run docker:logs    # View container logs

# Database migrations
npm run db:migrate     # Run all pending migrations
npm run db:migrate:down  # Rollback last migration
npm run db:migrate:create <name>  # Create new migration file

# Start development servers (frontend + backend)
npm run dev

# Run tests
npm test                # All tests
npm run test:frontend  # Frontend only
npm run test:backend   # Backend only

# Build for production
npm run build          # All packages
npm run build:frontend # Frontend only
npm run build:backend  # Backend only

# Lint and format
npm run lint           # Lint all packages
npm run format         # Format all packages
```

**Important:** All npm scripts automatically load environment variables from `.env` files. You **never** need to manually export variables like `DATABASE_URL` - the tooling handles this automatically via `dotenv-cli`.

---

## Additional Documentation

For more detailed architectural documentation, see:

- `.docs/architecture.md` - Comprehensive architecture guide with code examples
- `.docs/architecture_summary.md` - Quick reference guide

---

## Summary

When working on FlowMaestro:

1. ✅ Use 4 spaces, double quotes, semicolons, and proper TypeScript typing
2. ✅ Never use `any` type - use proper types or `unknown` with type guards
3. ✅ Never use browser alerts - always use custom Dialog components
4. ✅ Follow the established patterns for components, stores, routes, and repositories
5. ✅ Use TanStack Query for server state, Zustand for client state
6. ✅ Use Fastify patterns for backend, not Express patterns
7. ✅ Use repository pattern for database access with proper multi-tenancy
8. ✅ Test thoroughly and handle errors gracefully
9. ✅ Only create markdown files when specifically requested
