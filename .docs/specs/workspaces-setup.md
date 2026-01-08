# Workspaces Implementation Plan

## Overview

Implement a multi-tenant workspace system where workspaces become the primary organizational unit for resources, billing, and collaboration. Each workspace has its own subscription type, credit balance, and member roles.

### Key Design Decisions

| Decision            | Choice                                         |
| ------------------- | ---------------------------------------------- |
| Billing Model       | Workspace type IS subscription (Free/Pro/Team) |
| Credit Scope        | Per-workspace credits                          |
| Personal Workspaces | Same rules as team (can invite members)        |
| Pricing Tiers       | Free ($0) / Pro ($29/mo) / Team ($99/mo)       |

---

## 1. Database Schema

### 1.1 New Tables

#### `workspaces`

```sql
CREATE TABLE flowmaestro.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'team'
    owner_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE RESTRICT,

    -- Feature limits (derived from type)
    max_workflows INTEGER NOT NULL DEFAULT 5,
    max_agents INTEGER NOT NULL DEFAULT 2,
    max_knowledge_bases INTEGER NOT NULL DEFAULT 1,
    max_members INTEGER NOT NULL DEFAULT 1,
    max_connections INTEGER NOT NULL DEFAULT 5,

    -- Billing
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    billing_email VARCHAR(255),

    -- Metadata
    settings JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (type IN ('free', 'pro', 'team')),
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$')
);

CREATE INDEX idx_workspaces_owner_id ON flowmaestro.workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_type ON flowmaestro.workspaces(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_slug ON flowmaestro.workspaces(slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_workspaces_stripe_customer ON flowmaestro.workspaces(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
```

#### `workspace_members`

```sql
CREATE TABLE flowmaestro.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'

    invited_by UUID REFERENCES flowmaestro.users(id),
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(workspace_id, user_id),
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

CREATE INDEX idx_workspace_members_workspace_id ON flowmaestro.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON flowmaestro.workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON flowmaestro.workspace_members(role);
```

#### `workspace_invitations`

```sql
CREATE TABLE flowmaestro.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',

    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES flowmaestro.users(id),
    message TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (role IN ('admin', 'member', 'viewer')),
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

CREATE INDEX idx_workspace_invitations_token ON flowmaestro.workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON flowmaestro.workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_workspace ON flowmaestro.workspace_invitations(workspace_id) WHERE status = 'pending';
```

#### `workspace_credits`

```sql
CREATE TABLE flowmaestro.workspace_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    lifetime_credits INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(workspace_id),
    CHECK (balance >= 0)
);

CREATE INDEX idx_workspace_credits_workspace_id ON flowmaestro.workspace_credits(workspace_id);
```

#### `credit_transactions` (workspace-scoped)

```sql
CREATE TABLE flowmaestro.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES flowmaestro.users(id),  -- who performed action

    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,  -- 'purchase', 'usage', 'refund', 'bonus', 'subscription'

    operation_type VARCHAR(100),
    operation_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_workspace ON flowmaestro.credit_transactions(workspace_id);
CREATE INDEX idx_credit_transactions_created ON flowmaestro.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON flowmaestro.credit_transactions(transaction_type);
```

### 1.2 Modified Tables

Add `workspace_id` to all resource tables:

```sql
-- Core Resources
ALTER TABLE flowmaestro.workflows ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.agents ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.threads ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.connections ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.database_connections ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.knowledge_bases ADD COLUMN workspace_id UUID;

-- Organization & Interfaces
ALTER TABLE flowmaestro.folders ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.form_interfaces ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.chat_interfaces ADD COLUMN workspace_id UUID;

-- Automation & API
ALTER TABLE flowmaestro.workflow_triggers ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.api_keys ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.outgoing_webhooks ADD COLUMN workspace_id UUID;

-- Analytics & Audit
ALTER TABLE flowmaestro.daily_analytics ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.hourly_analytics ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.model_usage_stats ADD COLUMN workspace_id UUID;
ALTER TABLE flowmaestro.safety_logs ADD COLUMN workspace_id UUID;
```

> **Note:** Folders are workspace-scoped, meaning each workspace has its own independent set of folders. This preserves the existing folder UX (colors, ordering, drag-drop) while adding workspace isolation.

### 1.3 Users Table Updates

```sql
ALTER TABLE flowmaestro.users
ADD COLUMN default_workspace_id UUID REFERENCES flowmaestro.workspaces(id) ON DELETE SET NULL,
ADD COLUMN last_workspace_id UUID REFERENCES flowmaestro.workspaces(id) ON DELETE SET NULL;
```

---

## 2. Workspace Types & Features

| Feature             | Free      | Pro ($29/mo) | Team ($99/mo) |
| ------------------- | --------- | ------------ | ------------- |
| Monthly Credits     | 100       | 2,500        | 10,000        |
| Max Workflows       | 5         | 50           | Unlimited     |
| Max Agents          | 2         | 20           | Unlimited     |
| Max Knowledge Bases | 1         | 10           | 50            |
| Max KB Chunks       | 100       | 5,000        | 50,000        |
| Max Members         | 1         | 5            | Unlimited     |
| Max Connections     | 5         | 25           | Unlimited     |
| Execution History   | 7 days    | 30 days      | 90 days       |
| Priority Execution  | No        | Yes          | Yes           |
| Audit Logs          | No        | No           | Yes           |
| SSO/SAML            | No        | No           | Yes           |
| Support             | Community | Email        | Priority      |

**Limits Config** (stored in workspace):

```typescript
const WORKSPACE_LIMITS = {
    free: {
        max_workflows: 5,
        max_agents: 2,
        max_knowledge_bases: 1,
        max_kb_chunks: 100,
        max_members: 1,
        max_connections: 5,
        monthly_credits: 100,
        execution_history_days: 7
    },
    pro: {
        max_workflows: 50,
        max_agents: 20,
        max_knowledge_bases: 10,
        max_kb_chunks: 5000,
        max_members: 5,
        max_connections: 25,
        monthly_credits: 2500,
        execution_history_days: 30
    },
    team: {
        max_workflows: -1, // unlimited
        max_agents: -1,
        max_knowledge_bases: 50,
        max_kb_chunks: 50000,
        max_members: -1,
        max_connections: -1,
        monthly_credits: 10000,
        execution_history_days: 90
    }
};
```

---

## 3. Role Permissions Matrix

| Permission             | Owner | Admin | Member | Viewer |
| ---------------------- | ----- | ----- | ------ | ------ |
| **View**               |       |       |        |        |
| View workspace         | ✓     | ✓     | ✓      | ✓      |
| View resources         | ✓     | ✓     | ✓      | ✓      |
| View analytics         | ✓     | ✓     | ✓      | ✓      |
| View billing           | ✓     | ✓     | -      | -      |
| **Create/Edit**        |       |       |        |        |
| Create workflows       | ✓     | ✓     | ✓      | -      |
| Edit workflows         | ✓     | ✓     | ✓      | -      |
| Create agents          | ✓     | ✓     | ✓      | -      |
| Edit agents            | ✓     | ✓     | ✓      | -      |
| Manage connections     | ✓     | ✓     | ✓      | -      |
| Manage knowledge bases | ✓     | ✓     | ✓      | -      |
| **Execute**            |       |       |        |        |
| Execute workflows      | ✓     | ✓     | ✓      | -      |
| Execute agents         | ✓     | ✓     | ✓      | -      |
| **Delete**             |       |       |        |        |
| Delete workflows       | ✓     | ✓     | -      | -      |
| Delete agents          | ✓     | ✓     | -      | -      |
| **Members**            |       |       |        |        |
| Invite members         | ✓     | ✓     | -      | -      |
| Remove members         | ✓     | ✓     | -      | -      |
| Change roles           | ✓     | ✓\*   | -      | -      |
| **Workspace**          |       |       |        |        |
| Edit settings          | ✓     | ✓     | -      | -      |
| Upgrade/downgrade      | ✓     | -     | -      | -      |
| Manage billing         | ✓     | -     | -      | -      |
| Delete workspace       | ✓     | -     | -      | -      |
| Transfer ownership     | ✓     | -     | -      | -      |

\*Admin cannot promote to Owner or demote other Admins

---

## 4. Backend Architecture

### 4.1 New Files

```
backend/src/
├── api/
│   ├── middleware/
│   │   ├── workspace-context.ts        # Extract workspace from request
│   │   └── workspace-permissions.ts    # Check role permissions
│   └── routes/
│       └── workspaces/
│           ├── index.ts
│           ├── create.ts
│           ├── list.ts
│           ├── get.ts
│           ├── update.ts
│           ├── delete.ts
│           ├── upgrade.ts
│           ├── members/
│           │   ├── list.ts
│           │   ├── invite.ts
│           │   ├── remove.ts
│           │   └── update-role.ts
│           └── invitations/
│               ├── list.ts
│               ├── accept.ts
│               ├── decline.ts
│               └── revoke.ts
├── services/
│   ├── WorkspaceService.ts
│   ├── WorkspaceMemberService.ts
│   ├── WorkspaceInvitationService.ts
│   └── WorkspaceCreditService.ts
├── storage/
│   ├── models/
│   │   ├── Workspace.ts
│   │   ├── WorkspaceMember.ts
│   │   └── WorkspaceInvitation.ts
│   └── repositories/
│       ├── WorkspaceRepository.ts
│       ├── WorkspaceMemberRepository.ts
│       ├── WorkspaceInvitationRepository.ts
│       └── WorkspaceCreditRepository.ts
└── shared/
    └── permissions/
        └── workspace-permissions.ts
```

### 4.2 Workspace Context Middleware

```typescript
// backend/src/api/middleware/workspace-context.ts
export async function workspaceContextMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    // Get workspace ID from: route param > header > user's last workspace
    const workspaceId =
        (request.params as any).workspaceId || request.headers["x-workspace-id"] || null;

    if (!workspaceId) {
        throw new BadRequestError("Workspace ID required");
    }

    const userId = request.user!.id;
    const memberRepo = new WorkspaceMemberRepository();
    const workspaceRepo = new WorkspaceRepository();

    const [membership, workspace] = await Promise.all([
        memberRepo.findByWorkspaceAndUser(workspaceId, userId),
        workspaceRepo.findById(workspaceId)
    ]);

    if (!membership) {
        throw new ForbiddenError("Not a member of this workspace");
    }

    if (!workspace || workspace.deleted_at) {
        throw new NotFoundError("Workspace not found");
    }

    request.workspace = {
        id: workspace.id,
        type: workspace.type,
        role: membership.role,
        limits: {
            max_workflows: workspace.max_workflows,
            max_agents: workspace.max_agents,
            max_knowledge_bases: workspace.max_knowledge_bases,
            max_members: workspace.max_members,
            max_connections: workspace.max_connections
        }
    };
}
```

### 4.3 Permission Middleware

```typescript
// backend/src/api/middleware/workspace-permissions.ts
type Permission =
    | "view"
    | "create"
    | "edit"
    | "delete"
    | "execute"
    | "invite_members"
    | "remove_members"
    | "change_roles"
    | "edit_settings"
    | "upgrade"
    | "manage_billing"
    | "delete_workspace";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    owner: ["*"], // all permissions
    admin: [
        "view",
        "create",
        "edit",
        "delete",
        "execute",
        "invite_members",
        "remove_members",
        "change_roles",
        "edit_settings",
        "view_billing"
    ],
    member: ["view", "create", "edit", "execute"],
    viewer: ["view"]
};

export function requirePermission(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const { role } = request.workspace!;
        const permissions = ROLE_PERMISSIONS[role];

        if (!permissions.includes("*") && !permissions.includes(permission)) {
            throw new ForbiddenError(`Insufficient permissions: ${permission} required`);
        }
    };
}
```

### 4.4 API Routes

#### Workspace CRUD

| Method | Path                                   | Permission       | Description            |
| ------ | -------------------------------------- | ---------------- | ---------------------- |
| GET    | `/api/workspaces`                      | (auth only)      | List user's workspaces |
| POST   | `/api/workspaces`                      | (auth only)      | Create workspace       |
| GET    | `/api/workspaces/:workspaceId`         | view             | Get workspace          |
| PUT    | `/api/workspaces/:workspaceId`         | edit_settings    | Update workspace       |
| DELETE | `/api/workspaces/:workspaceId`         | delete_workspace | Delete workspace       |
| POST   | `/api/workspaces/:workspaceId/upgrade` | upgrade          | Change type            |

#### Members

| Method | Path                                                | Permission     | Description     |
| ------ | --------------------------------------------------- | -------------- | --------------- |
| GET    | `/api/workspaces/:workspaceId/members`              | view           | List members    |
| POST   | `/api/workspaces/:workspaceId/members/invite`       | invite_members | Send invitation |
| DELETE | `/api/workspaces/:workspaceId/members/:userId`      | remove_members | Remove member   |
| PUT    | `/api/workspaces/:workspaceId/members/:userId/role` | change_roles   | Update role     |

#### Invitations

| Method | Path                                           | Permission     | Description    |
| ------ | ---------------------------------------------- | -------------- | -------------- |
| GET    | `/api/workspaces/:workspaceId/invitations`     | view           | List pending   |
| DELETE | `/api/workspaces/:workspaceId/invitations/:id` | invite_members | Revoke         |
| GET    | `/api/invitations/:token`                      | (public)       | Get invitation |
| POST   | `/api/invitations/:token/accept`               | (auth only)    | Accept         |
| POST   | `/api/invitations/:token/decline`              | (auth only)    | Decline        |

#### Credits

| Method | Path                                                | Permission | Description   |
| ------ | --------------------------------------------------- | ---------- | ------------- |
| GET    | `/api/workspaces/:workspaceId/credits/balance`      | view       | Get balance   |
| GET    | `/api/workspaces/:workspaceId/credits/transactions` | view       | Get history   |
| POST   | `/api/workspaces/:workspaceId/credits/estimate`     | view       | Estimate cost |

### 4.5 Modified Routes

Update ALL resource routes to use workspace context:

```typescript
// Example: backend/src/api/routes/workflows/list.ts
fastify.get(
    "/",
    {
        preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("view")]
    },
    async (request, reply) => {
        const workspaceId = request.workspace!.id;
        const workflows = await workflowRepo.findByWorkspaceId(workspaceId, options);
        return reply.send({ success: true, data: workflows });
    }
);
```

---

## 5. Frontend Architecture

> **Note:** This codebase uses **Zustand exclusively** for state management (not React Context). All workspace state should be managed via a Zustand store.

### 5.1 New Files

```
frontend/src/
├── pages/
│   ├── WorkspaceSettings.tsx           # Workspace settings page
│   └── AcceptInvitation.tsx            # Accept invitation page
├── stores/
│   └── workspaceStore.ts               # Workspace state (Zustand)
├── components/
│   └── workspace/
│       ├── WorkspaceSwitcher.tsx       # Dropdown to switch workspaces
│       ├── WorkspaceCard.tsx           # Workspace card for list
│       ├── CreateWorkspaceDialog.tsx   # Create new workspace
│       ├── InviteMemberDialog.tsx      # Invite member
│       ├── MemberList.tsx              # List/manage members
│       ├── MemberRoleSelect.tsx        # Role dropdown
│       ├── WorkspaceUsage.tsx          # Usage stats
│       ├── WorkspaceBilling.tsx        # Billing info
│       └── UpgradeDialog.tsx           # Upgrade workspace
```

### 5.2 Workspace Store (Zustand)

```typescript
// frontend/src/stores/workspaceStore.ts
import { create } from "zustand";
import type { Workspace, WorkspaceRole, Permission } from "@flowmaestro/shared";

interface WorkspaceStore {
    // State
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    currentRole: WorkspaceRole | null;
    isLoading: boolean;

    // Actions
    fetchWorkspaces: () => Promise<void>;
    setCurrentWorkspace: (workspace: Workspace) => void;
    switchWorkspace: (workspaceId: string) => Promise<void>;
    createWorkspace: (data: CreateWorkspaceInput) => Promise<Workspace>;
    updateWorkspace: (id: string, data: UpdateWorkspaceInput) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;

    // Permission helpers (computed from currentRole)
    hasPermission: (permission: Permission) => boolean;
    checkLimit: (resource: string) => { allowed: boolean; current: number; max: number };
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    workspaces: [],
    currentWorkspace: null,
    currentRole: null,
    isLoading: false,

    fetchWorkspaces: async () => {
        set({ isLoading: true });
        const { data } = await api.getWorkspaces();
        set({ workspaces: data, isLoading: false });
    },

    switchWorkspace: async (workspaceId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
            localStorage.setItem("currentWorkspaceId", workspaceId);
            set({ currentWorkspace: workspace });
            // Refresh other stores that depend on workspace
        }
    },

    hasPermission: (permission: Permission) => {
        const role = get().currentRole;
        if (!role) return false;
        return ROLE_PERMISSIONS[role].includes("*") || ROLE_PERMISSIONS[role].includes(permission);
    },

    checkLimit: (resource: string) => {
        const workspace = get().currentWorkspace;
        if (!workspace) return { allowed: false, current: 0, max: 0 };
        const max = workspace.limits[`max_${resource}`];
        // current count would come from workspace stats
        return { allowed: max === -1 || current < max, current, max };
    }
}));
```

### 5.3 API Client Updates

Integrate workspace header into the existing `apiFetch()` wrapper:

```typescript
// frontend/src/lib/api.ts
export function getCurrentWorkspaceId(): string | null {
    return localStorage.getItem("currentWorkspaceId");
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const sessionId = getOrCreateSessionId();
    const workspaceId = getCurrentWorkspaceId();

    const headers = {
        ...options.headers,
        "X-Session-ID": sessionId,
        ...(workspaceId && { "X-Workspace-Id": workspaceId })
    };

    // ... existing correlation and logging logic
    return fetch(url, { ...options, headers });
}
```

### 5.4 App.tsx Updates

No provider wrapper needed (Zustand stores are global):

```tsx
<Routes>
    {/* Public */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/invitation/:token" element={<AcceptInvitation />} />

    {/* Protected */}
    <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
            <Route path="/" element={<Workflows />} />
            <Route path="/workspace/settings" element={<WorkspaceSettings />} />
            {/* ... other routes */}
        </Route>
    </Route>
</Routes>
```

### 5.5 Sidebar Updates

Add WorkspaceSwitcher above navigation:

```tsx
// In Sidebar.tsx
<div className="p-4 border-b">
    <WorkspaceSwitcher />
</div>
<nav>
    {/* existing navigation */}
</nav>
```

---

## 6. Migration Strategy

### 6.1 Data Migration Script

```sql
-- 1. Create personal workspaces for existing users
INSERT INTO flowmaestro.workspaces (name, slug, type, owner_id, billing_email, max_workflows, max_agents, max_knowledge_bases, max_members, max_connections)
SELECT
    COALESCE(u.name, SPLIT_PART(u.email, '@', 1)) || '''s Workspace',
    LOWER(REGEXP_REPLACE(COALESCE(u.name, SPLIT_PART(u.email, '@', 1)), '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(u.id::text, 1, 8),
    'free',
    u.id,
    u.email,
    5, 2, 1, 1, 5
FROM flowmaestro.users u;

-- 2. Create owner memberships
INSERT INTO flowmaestro.workspace_members (workspace_id, user_id, role, accepted_at, created_at)
SELECT w.id, w.owner_id, 'owner', NOW(), NOW()
FROM flowmaestro.workspaces w;

-- 3. Create workspace credits (100 free credits)
INSERT INTO flowmaestro.workspace_credits (workspace_id, balance, lifetime_credits)
SELECT w.id, 100, 100 FROM flowmaestro.workspaces w;

-- 4. Migrate resources to workspaces
UPDATE flowmaestro.workflows w
SET workspace_id = (SELECT ws.id FROM flowmaestro.workspaces ws WHERE ws.owner_id = w.user_id LIMIT 1)
WHERE workspace_id IS NULL;

UPDATE flowmaestro.agents a
SET workspace_id = (SELECT ws.id FROM flowmaestro.workspaces ws WHERE ws.owner_id = a.user_id LIMIT 1)
WHERE workspace_id IS NULL;

UPDATE flowmaestro.threads t
SET workspace_id = (SELECT ws.id FROM flowmaestro.workspaces ws WHERE ws.owner_id = t.user_id LIMIT 1)
WHERE workspace_id IS NULL;

UPDATE flowmaestro.connections c
SET workspace_id = (SELECT ws.id FROM flowmaestro.workspaces ws WHERE ws.owner_id = c.user_id LIMIT 1)
WHERE workspace_id IS NULL;

UPDATE flowmaestro.database_connections dc
SET workspace_id = (SELECT ws.id FROM flowmaestro.workspaces ws WHERE ws.owner_id = dc.user_id LIMIT 1)
WHERE workspace_id IS NULL;

UPDATE flowmaestro.knowledge_bases kb
SET workspace_id = (SELECT ws.id FROM flowmaestro.workspaces ws WHERE ws.owner_id = kb.user_id LIMIT 1)
WHERE workspace_id IS NULL;

-- 5. Add NOT NULL constraints after migration
ALTER TABLE flowmaestro.workflows ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE flowmaestro.workflows ADD CONSTRAINT fk_workflows_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.agents ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE flowmaestro.agents ADD CONSTRAINT fk_agents_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.threads ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE flowmaestro.threads ADD CONSTRAINT fk_threads_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.connections ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE flowmaestro.connections ADD CONSTRAINT fk_connections_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.database_connections ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE flowmaestro.database_connections ADD CONSTRAINT fk_database_connections_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.knowledge_bases ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE flowmaestro.knowledge_bases ADD CONSTRAINT fk_knowledge_bases_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

-- 6. Add workspace indexes
CREATE INDEX idx_workflows_workspace_id ON flowmaestro.workflows(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_workspace_id ON flowmaestro.agents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_threads_workspace_id ON flowmaestro.threads(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_connections_workspace_id ON flowmaestro.connections(workspace_id);
CREATE INDEX idx_database_connections_workspace_id ON flowmaestro.database_connections(workspace_id);
CREATE INDEX idx_knowledge_bases_workspace_id ON flowmaestro.knowledge_bases(workspace_id);

-- 7. Set default workspace for users
UPDATE flowmaestro.users u
SET default_workspace_id = (SELECT w.id FROM flowmaestro.workspaces w WHERE w.owner_id = u.id LIMIT 1);
```

### 6.2 Repository Updates

Update all repository methods to filter by `workspace_id`:

```typescript
// WorkflowRepository.ts
async findByWorkspaceId(workspaceId: string, options: ListOptions): Promise<WorkflowModel[]> {
    const result = await pool.query<WorkflowRow>(
        `SELECT * FROM flowmaestro.workflows
         WHERE workspace_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [workspaceId, options.limit, options.offset]
    );
    return result.rows.map(mapRowToModel);
}
```

---

## 7. Implementation Phases

### Phase 1: Database Foundation

**Files to create:**

- `backend/migrations/1730000000037_create_workspaces_tables.sql`

**Tasks:**

1. Create workspaces table
2. Create workspace_members table
3. Create workspace_invitations table
4. Create workspace_credits table
5. Create credit_transactions table
6. Add workspace_id to all resource tables (nullable initially)
7. Add user workspace preference columns

### Phase 2: Backend Models & Repositories

**Files to create:**

- `backend/src/storage/models/Workspace.ts`
- `backend/src/storage/models/WorkspaceMember.ts`
- `backend/src/storage/models/WorkspaceInvitation.ts`
- `backend/src/storage/repositories/WorkspaceRepository.ts`
- `backend/src/storage/repositories/WorkspaceMemberRepository.ts`
- `backend/src/storage/repositories/WorkspaceInvitationRepository.ts`
- `backend/src/storage/repositories/WorkspaceCreditRepository.ts`

### Phase 3: Backend Middleware & Services

**Files to create:**

- `backend/src/api/middleware/workspace-context.ts`
- `backend/src/api/middleware/workspace-permissions.ts`
- `backend/src/shared/permissions/workspace-permissions.ts`
- `backend/src/services/WorkspaceService.ts`
- `backend/src/services/WorkspaceMemberService.ts`
- `backend/src/services/WorkspaceInvitationService.ts`
- `backend/src/services/WorkspaceCreditService.ts`

### Phase 4: Backend API Routes

**Files to create:**

- `backend/src/api/routes/workspaces/` (all route files)

**Files to modify:**

- `backend/src/api/server.ts` (register workspace routes)
- `backend/src/api/routes/auth/register.ts` (create personal workspace)

### Phase 5: Update Existing Routes

**Files to modify (add workspace middleware):**

- All routes in `backend/src/api/routes/workflows/`
- All routes in `backend/src/api/routes/agents/`
- All routes in `backend/src/api/routes/folders/`
- All routes in `backend/src/api/routes/connections/`
- All routes in `backend/src/api/routes/knowledge-bases/`
- All routes in `backend/src/api/routes/form-interfaces/`
- All routes in `backend/src/api/routes/chat-interfaces/`
- All routes in `backend/src/api/routes/triggers/`
- All routes in `backend/src/api/routes/api-keys/`
- All routes in `backend/src/api/routes/webhooks/`
- All routes in `backend/src/api/routes/threads/`

### Phase 6: Update Repositories

**Files to modify (change `findByUserId` → `findByWorkspaceId`):**

- `backend/src/storage/repositories/WorkflowRepository.ts`
- `backend/src/storage/repositories/AgentRepository.ts`
- `backend/src/storage/repositories/FolderRepository.ts`
- `backend/src/storage/repositories/ConnectionRepository.ts`
- `backend/src/storage/repositories/KnowledgeBaseRepository.ts`
- `backend/src/storage/repositories/FormInterfaceRepository.ts`
- `backend/src/storage/repositories/ChatInterfaceRepository.ts`
- `backend/src/storage/repositories/TriggerRepository.ts`
- `backend/src/storage/repositories/ApiKeyRepository.ts`
- `backend/src/storage/repositories/OutgoingWebhookRepository.ts`
- `backend/src/storage/repositories/ThreadRepository.ts`

### Phase 7: Frontend Store (Zustand)

**Files to create:**

- `frontend/src/stores/workspaceStore.ts`

**Files to modify:**

- `frontend/src/lib/api.ts` (add workspace header to apiFetch)
- `frontend/src/stores/index.ts` (export workspaceStore)

### Phase 8: Frontend Components

**Files to create:**

- `frontend/src/components/workspace/WorkspaceSwitcher.tsx`
- `frontend/src/components/workspace/WorkspaceCard.tsx`
- `frontend/src/components/workspace/CreateWorkspaceDialog.tsx`
- `frontend/src/components/workspace/InviteMemberDialog.tsx`
- `frontend/src/components/workspace/MemberList.tsx`
- `frontend/src/components/workspace/MemberRoleSelect.tsx`
- `frontend/src/components/workspace/WorkspaceUsage.tsx`
- `frontend/src/components/workspace/WorkspaceBilling.tsx`
- `frontend/src/components/workspace/UpgradeDialog.tsx`

**Files to modify:**

- `frontend/src/components/layout/Sidebar.tsx` (add WorkspaceSwitcher)

### Phase 9: Invitation Flow & Email

**Files to create:**

- `frontend/src/pages/AcceptInvitation.tsx`
- `backend/src/services/email/templates/WorkspaceInvitationEmail.tsx`

**Files to modify:**

- `frontend/src/App.tsx` (add invitation route)
- `backend/src/services/email/EmailService.ts` (add sendWorkspaceInvitation method)

### Phase 10: Data Migration

**Tasks:**

1. Run migration script on staging
2. Verify data integrity
3. Test all functionality
4. Run migration on production

### Phase 11: Stripe Billing Integration

**Files to create:**

- `backend/src/services/stripe/StripeService.ts`
- `backend/src/api/routes/workspaces/billing.ts`

**Tasks:**

- Create Stripe customers for workspaces
- Manage subscriptions (Pro $29/mo, Team $99/mo)
- Handle billing webhooks (payment_succeeded, subscription_updated)
- Create checkout sessions for upgrades

---

## 8. Critical Files Reference

These existing files should be studied for patterns:

| Pattern            | Reference File                                            |
| ------------------ | --------------------------------------------------------- |
| Migration format   | `backend/migrations/1730000000035_create-folders.sql`     |
| Repository pattern | `backend/src/storage/repositories/FolderRepository.ts`    |
| Model pattern      | `backend/src/storage/models/Folder.ts`                    |
| Route pattern      | `backend/src/api/routes/folders/index.ts`                 |
| Middleware pattern | `backend/src/api/middleware/auth.ts`                      |
| Zustand store      | `frontend/src/stores/workflowStore.ts`                    |
| Dialog component   | `frontend/src/components/folders/CreateFolderDialog.tsx`  |
| API client         | `frontend/src/lib/api.ts`                                 |
| Email template     | `backend/src/services/email/templates/PasswordResetEmail` |

---

## 9. Folder Integration

This codebase already has a folder system for organizing resources. Workspaces will integrate with folders as follows:

### Hierarchy

```
User (authentication)
└── Workspace (resource isolation, billing, team)
    └── Folder (organization, colors, ordering)
        └── Resources (workflows, agents, etc.)
```

### Key Points

1. **Folders are workspace-scoped:** Each workspace has its own independent set of folders
2. **No cross-workspace folders:** Folders cannot span multiple workspaces
3. **Preserved UX:** Existing folder features (colors, positions, drag-drop) remain unchanged
4. **Migration:** Existing folders migrate to the user's personal workspace

### Schema Change

```sql
-- Add workspace_id to folders table
ALTER TABLE flowmaestro.folders ADD COLUMN workspace_id UUID;

-- After data migration, add constraint
ALTER TABLE flowmaestro.folders
ADD CONSTRAINT fk_folders_workspace
    FOREIGN KEY (workspace_id) REFERENCES flowmaestro.workspaces(id) ON DELETE CASCADE;

ALTER TABLE flowmaestro.folders ALTER COLUMN workspace_id SET NOT NULL;
```

### Repository Update

```typescript
// FolderRepository.ts - Update query pattern
async findByWorkspaceId(workspaceId: string): Promise<FolderModel[]> {
    const query = `
        SELECT * FROM flowmaestro.folders
        WHERE workspace_id = $1 AND deleted_at IS NULL
        ORDER BY position ASC, created_at ASC
    `;
    const result = await db.query<FolderRow>(query, [workspaceId]);
    return result.rows.map((row) => this.mapRow(row));
}
```

---

## 10. Infrastructure Status

### Email Service ✅ Ready

- **Location:** `backend/src/services/email/EmailService.ts`
- **Provider:** Resend with React email templates
- **Existing templates:** Password reset, email verification, 2FA notifications
- **Action needed:** Add `WorkspaceInvitationEmail.tsx` template

### Stripe Integration ⚠️ Partial

- **Current:** `backend/src/api/routes/webhooks/stripe.ts` handles workflow triggers only
- **Missing:** Billing/subscription management for workspace upgrades
- **Action needed:**
    - Create `backend/src/services/stripe/StripeService.ts`
    - Implement customer creation, subscription management
    - Handle billing webhooks (payment_succeeded, subscription_updated)
    - Create checkout sessions for Pro/Team upgrades

---

## 11. Testing Checklist

- [ ] User can create workspace
- [ ] User can switch between workspaces
- [ ] Resources are isolated per workspace
- [ ] Role permissions enforced correctly
- [ ] Invitation flow works (send, accept, decline)
- [ ] Workspace limits enforced
- [ ] Credits tracked per workspace
- [ ] Upgrade/downgrade changes limits
- [ ] Migration preserves existing data
- [ ] Personal workspace created on registration
