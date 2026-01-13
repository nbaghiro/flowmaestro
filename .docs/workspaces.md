# Workspaces

This document provides a comprehensive overview of the FlowMaestro workspaces system, including multi-tenancy, role-based access control (RBAC), credit system, and billing integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Workspace Types & Plans](#workspace-types--plans)
3. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
4. [Resource Isolation](#resource-isolation)
5. [Credit System](#credit-system)
6. [Stripe Integration](#stripe-integration)
7. [Member Management](#member-management)
8. [API Reference](#api-reference)
9. [Frontend Integration](#frontend-integration)
10. [Implementation Status](#implementation-status)

---

## Overview

Workspaces are the foundational multi-tenancy unit in FlowMaestro. Every resource (workflow, agent, knowledge base, etc.) belongs to exactly one workspace. Users can own multiple workspaces and be members of workspaces owned by others.

### Key Concepts

| Concept                | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Workspace**          | An isolated container for resources with its own billing, limits, and members |
| **Personal Workspace** | Auto-created on user signup (free tier, single member)                        |
| **Team Workspace**     | Created manually for collaboration (supports multiple members)                |
| **Owner**              | The user who created the workspace; has full control including deletion       |
| **Member**             | A user who has been invited to and accepted membership in a workspace         |

### Workspace Lifecycle

```
User Signup
    │
    ▼
Personal Workspace Created (Free)
    │
    ├─► Upgrade to Pro/Team
    │
    └─► Create Additional Team Workspaces
            │
            ▼
        Invite Members
            │
            ▼
        Collaborate on Resources
```

---

## Workspace Types & Plans

### Categories

| Category   | Description        | Members          |
| ---------- | ------------------ | ---------------- |
| `personal` | For individual use | Owner only       |
| `team`     | For collaboration  | Multiple members |

### Plan Types

| Plan   | Monthly Price | Use Case                               |
| ------ | ------------- | -------------------------------------- |
| `free` | $0            | Getting started, personal projects     |
| `pro`  | $29/month     | Power users, small teams               |
| `team` | $99/month     | Organizations, unlimited collaboration |

### Resource Limits by Plan

| Resource          | Free   | Pro     | Team      |
| ----------------- | ------ | ------- | --------- |
| Workflows         | 5      | 50      | Unlimited |
| Agents            | 2      | 20      | Unlimited |
| Knowledge Bases   | 1      | 10      | 50        |
| KB Chunks         | 100    | 5,000   | 50,000    |
| Members           | 1      | 5       | Unlimited |
| Connections       | 5      | 25      | Unlimited |
| Monthly Credits   | 100    | 2,500   | 10,000    |
| Execution History | 7 days | 30 days | 90 days   |

### Limit Enforcement

Limits are checked when creating new resources:

```typescript
// Backend middleware pattern
async function checkWorkflowLimit(request, reply) {
    const { limits } = request.workspace;
    const currentCount = await workflowRepo.countByWorkspace(request.workspace.id);

    if (limits.maxWorkflows !== -1 && currentCount >= limits.maxWorkflows) {
        throw new ForbiddenError("Workflow limit reached. Please upgrade your plan.");
    }
}
```

---

## Role-Based Access Control (RBAC)

### Roles

| Role     | Description                                                                    |
| -------- | ------------------------------------------------------------------------------ |
| `owner`  | Full control including billing, deletion, and ownership transfer               |
| `admin`  | Can manage members and settings, but cannot delete workspace or manage billing |
| `member` | Can create, edit, and execute resources                                        |
| `viewer` | Read-only access to resources                                                  |

### Permissions

| Permission           | Owner | Admin | Member | Viewer |
| -------------------- | :---: | :---: | :----: | :----: |
| `view`               |   ✓   |   ✓   |   ✓    |   ✓    |
| `create`             |   ✓   |   ✓   |   ✓    |        |
| `edit`               |   ✓   |   ✓   |   ✓    |        |
| `delete`             |   ✓   |   ✓   |        |        |
| `execute`            |   ✓   |   ✓   |   ✓    |        |
| `invite_members`     |   ✓   |   ✓   |        |        |
| `remove_members`     |   ✓   |   ✓   |        |        |
| `change_roles`       |   ✓   |   ✓   |        |        |
| `edit_settings`      |   ✓   |   ✓   |        |        |
| `view_billing`       |   ✓   |   ✓   |        |        |
| `upgrade`            |   ✓   |       |        |        |
| `manage_billing`     |   ✓   |       |        |        |
| `delete_workspace`   |   ✓   |       |        |        |
| `transfer_ownership` |   ✓   |       |        |        |

### Backend Enforcement

RBAC is enforced through middleware layers:

#### 1. Workspace Context Middleware

Validates user is a workspace member and attaches context to the request:

```typescript
// backend/src/api/middleware/workspace-context.ts
export async function workspaceContextMiddleware(request, reply) {
    const workspaceId = request.params.workspaceId || request.headers["x-workspace-id"];

    // Verify workspace exists
    const workspace = await workspaceRepo.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace not found");

    // Verify user is a member
    const membership = await memberRepo.findByWorkspaceAndUser(workspaceId, request.user.id);
    if (!membership) throw new ForbiddenError("You are not a member of this workspace");

    // Attach context
    request.workspace = {
        id: workspace.id,
        type: workspace.type,
        role: membership.role,
        isOwner: membership.role === "owner",
        limits: { maxWorkflows, maxAgents, ... }
    };
}
```

#### 2. Permission Middleware

Checks if the user's role has the required permission:

```typescript
// backend/src/api/middleware/workspace-permissions.ts
export function requirePermission(permission: WorkspacePermission) {
    return async (request, reply) => {
        const { role } = request.workspace;

        if (!ROLE_PERMISSIONS[role].includes(permission)) {
            throw new ForbiddenError(`You don't have permission to ${permission}`);
        }
    };
}
```

#### 3. Route Protection Example

```typescript
// Protect a delete route
fastify.delete(
    "/:workflowId",
    {
        preHandler: [
            authMiddleware, // 1. Verify JWT
            workspaceContextMiddleware, // 2. Validate workspace membership
            requirePermission("delete") // 3. Check delete permission
        ]
    },
    deleteWorkflowHandler
);
```

#### 4. Role Hierarchy for Member Management

Prevents privilege escalation:

```typescript
export function canManageRole(actorRole: string, targetRole: string): boolean {
    if (actorRole === "owner") return true;
    if (actorRole === "admin") return targetRole === "member" || targetRole === "viewer";
    return false;
}

export function canAssignRole(actorRole: string, roleToAssign: string): boolean {
    if (actorRole === "owner") return true;
    if (actorRole === "admin") return roleToAssign === "member" || roleToAssign === "viewer";
    return false;
}
```

### Frontend Enforcement

Frontend uses the same permission definitions for UI rendering:

```typescript
// frontend/src/stores/workspaceStore.ts
const { hasPermission } = useWorkspaceStore();

// Conditionally render based on permissions
{hasPermission("invite_members") && <InviteMemberButton />}
{hasPermission("delete") && <DeleteButton />}
{hasPermission("view_billing") && <BillingTab />}
```

---

## Resource Isolation

### Database Schema

Every resource table includes a `workspace_id` foreign key:

```sql
-- Example: workflows table
ALTER TABLE workflows ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
```

### Tables with workspace_id

| Table                  | Purpose                    |
| ---------------------- | -------------------------- |
| `workflows`            | Workflow definitions       |
| `agents`               | AI agent configurations    |
| `threads`              | Agent conversation threads |
| `connections`          | OAuth/API connections      |
| `database_connections` | Database connections       |
| `knowledge_bases`      | Vector knowledge stores    |
| `folders`              | Resource organization      |
| `form_interfaces`      | Public form endpoints      |
| `chat_interfaces`      | Public chat endpoints      |
| `workflow_triggers`    | Webhook/schedule triggers  |
| `api_keys`             | API access keys            |
| `outgoing_webhooks`    | Webhook destinations       |

### API Request Flow

```
Frontend Request
    │
    ▼
X-Workspace-Id Header (auto-added by api.ts)
    │
    ▼
workspaceContextMiddleware
    │
    ├─► Validates membership
    ├─► Attaches workspace context
    │
    ▼
Repository Query (filtered by workspace_id)
    │
    ▼
Response (workspace-scoped data only)
```

### Frontend Header Injection

```typescript
// frontend/src/lib/api.ts
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
    const headers = new Headers(options?.headers);

    // Auto-add workspace ID to all requests
    const workspaceId = getCurrentWorkspaceId();
    if (workspaceId) {
        headers.set("X-Workspace-Id", workspaceId);
    }

    return fetch(url, { ...options, headers });
}
```

### Repository Pattern

```typescript
// Before (user-scoped)
async findByUserId(userId: string): Promise<Workflow[]>

// After (workspace-scoped)
async findByWorkspaceId(workspaceId: string): Promise<Workflow[]> {
    const result = await pool.query(
        `SELECT * FROM workflows
         WHERE workspace_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [workspaceId]
    );
    return result.rows;
}
```

---

## Credit System

### Overview

Credits are the universal currency for resource consumption in FlowMaestro. Every execution (workflow run, agent interaction, etc.) consumes credits based on the operations performed.

### Credit Value

- **1 credit = $0.01 USD** (with 20% margin built into pricing)
- Credits are non-transferable between workspaces

### Credit Balance Structure

```typescript
interface CreditBalance {
    subscription: number; // Monthly allocation from plan
    purchased: number; // One-time credit pack purchases
    bonus: number; // Promotional/referral credits
    reserved: number; // Held for in-progress executions
    available: number; // subscription + purchased + bonus - reserved
    usedThisMonth: number; // For analytics/display
    usedAllTime: number; // Lifetime usage
}
```

### Monthly Credit Allocations

| Plan | Monthly Credits | Reset Behavior                                 |
| ---- | --------------- | ---------------------------------------------- |
| Free | 100             | Resets on billing cycle, unused credits expire |
| Pro  | 2,500           | Resets on billing cycle, unused credits expire |
| Team | 10,000          | Resets on billing cycle, unused credits expire |

### Credit Packs (One-Time Purchase)

| Pack       | Credits | Price  | Savings |
| ---------- | ------- | ------ | ------- |
| Starter    | 500     | $5     | 0%      |
| Growth     | 2,500   | $22.50 | 10%     |
| Scale      | 10,000  | $80    | 20%     |
| Enterprise | 50,000  | $350   | 30%     |

Purchased credits never expire and are used after subscription credits are depleted.

### Credit Consumption

#### Deduction Priority

When consuming credits, they are deducted in this order:

1. **Subscription credits** (monthly allocation)
2. **Bonus credits** (promotional)
3. **Purchased credits** (never expire)

#### Node Costs (Flat per Execution)

| Node Type                                  | Credits | Notes |
| ------------------------------------------ | ------- | ----- |
| Triggers (manual, schedule, webhook)       | 0       | Free  |
| Variables, Output, Condition, Merge, Delay | 0       | Free  |
| Data Transform                             | 1       |       |
| HTTP Request                               | 2       |       |
| Code Execution                             | 3       |       |
| Database Query                             | 3       |       |
| Knowledge Search                           | 5       |       |
| Knowledge Index                            | 10      |       |
| Image Gen (Stable Diffusion)               | 30      |       |
| Image Gen (DALL-E)                         | 50      |       |
| Image Gen (Midjourney)                     | 100     |       |

#### LLM Costs (Token-Based)

LLM credits are calculated based on actual token usage:

```typescript
credits = ceil((tokenCostUSD / 0.01) * 1.2); // 20% margin
```

| Model             | Input (per 1M tokens) | Output (per 1M tokens) |
| ----------------- | --------------------- | ---------------------- |
| GPT-4o            | $2.50                 | $10.00                 |
| GPT-4o-mini       | $0.15                 | $0.60                  |
| GPT-4-turbo       | $10.00                | $30.00                 |
| Claude 3.5 Sonnet | $3.00                 | $15.00                 |
| Claude 3 Opus     | $15.00                | $75.00                 |
| Claude 3 Haiku    | $0.25                 | $1.25                  |
| Gemini 1.5 Pro    | $1.25                 | $5.00                  |
| Gemini 1.5 Flash  | $0.075                | $0.30                  |
| Llama 3.1 70B     | $0.59                 | $0.79                  |
| Llama 3.1 8B      | $0.05                 | $0.08                  |

### Credit Lifecycle

```
Execution Request
    │
    ▼
Estimate Credits (pre-execution)
    │
    ▼
Reserve Credits
    │ (credits.reserved += estimated)
    │
    ▼
Execute Workflow/Agent
    │
    ▼
Calculate Actual Usage
    │
    ▼
Finalize Credits
    ├─► Release reservation
    ├─► Deduct actual amount
    └─► Record transaction
```

### Credit Transactions

All credit changes are recorded for audit:

```typescript
interface CreditTransaction {
    id: string;
    workspaceId: string;
    userId: string | null;
    amount: number; // Positive for additions, negative for usage
    balanceBefore: number;
    balanceAfter: number;
    transactionType: "subscription" | "purchase" | "usage" | "refund" | "bonus" | "expiration";
    operationType: string | null; // "workflow_execution", "agent_chat", etc.
    operationId: string | null; // Reference to specific execution
    description: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
```

---

## Stripe Integration

> **Note**: Stripe integration is planned but not yet implemented. This section documents the intended design.

### Subscription Plans

| Plan ID              | Price     | Billing                |
| -------------------- | --------- | ---------------------- |
| `price_free`         | $0        | N/A                    |
| `price_pro_monthly`  | $29/month | Monthly                |
| `price_pro_yearly`   | $290/year | Yearly (2 months free) |
| `price_team_monthly` | $99/month | Monthly                |
| `price_team_yearly`  | $990/year | Yearly (2 months free) |

### Stripe Customer Mapping

Each workspace has optional Stripe fields:

```typescript
interface Workspace {
    stripeSubscriptionId: string | null;
    billingEmail: string | null;
}
```

### Checkout Flow

```
User clicks "Upgrade to Pro"
    │
    ▼
Create Stripe Checkout Session
    │ - customer_email: workspace.billingEmail || user.email
    │ - metadata: { workspaceId }
    │ - success_url: /workspace/settings?upgraded=true
    │ - cancel_url: /workspace/settings
    │
    ▼
Redirect to Stripe Checkout
    │
    ▼
Payment Completed
    │
    ▼
Stripe Webhook: checkout.session.completed
    │
    ▼
Update Workspace
    ├─► Set type to "pro" or "team"
    ├─► Update limits
    ├─► Set stripeSubscriptionId
    └─► Add monthly credits
```

### Webhook Events to Handle

| Event                           | Action                           |
| ------------------------------- | -------------------------------- |
| `checkout.session.completed`    | Upgrade workspace, add credits   |
| `customer.subscription.updated` | Sync plan changes                |
| `customer.subscription.deleted` | Downgrade to free                |
| `invoice.payment_succeeded`     | Add monthly credits              |
| `invoice.payment_failed`        | Send warning email, grace period |

### Credit Refresh on Billing Cycle

```typescript
// Triggered by invoice.payment_succeeded webhook
async function refreshMonthlyCredits(workspaceId: string) {
    const workspace = await workspaceRepo.findById(workspaceId);
    const limits = WORKSPACE_LIMITS[workspace.type];

    await creditRepo.addSubscriptionCredits(
        workspaceId,
        limits.monthly_credits,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
    );
}
```

### Credit Pack Purchase Flow

```
User selects "Growth Pack" ($22.50 for 2,500 credits)
    │
    ▼
Create Stripe Checkout Session (one-time payment)
    │ - mode: "payment"
    │ - line_items: [{ price: price_growth_pack, quantity: 1 }]
    │ - metadata: { workspaceId, packId: "growth" }
    │
    ▼
Stripe Webhook: checkout.session.completed
    │
    ▼
Add purchased credits (never expire)
```

---

## Member Management

### Invitation Flow

```
Owner/Admin invites user@example.com
    │
    ▼
Create WorkspaceInvitation record
    │ - token: crypto.randomBytes(32)
    │ - status: "pending"
    │ - expiresAt: now + 7 days
    │
    ▼
Send invitation email
    │ - Link: /accept-invitation?token=xxx
    │
    ▼
Recipient clicks link
    │
    ├─► If logged in as invitee email:
    │       Accept/Decline buttons shown
    │
    └─► If not logged in or different email:
            Login/Register prompts shown
    │
    ▼
Accept Invitation
    │
    ▼
Create WorkspaceMember record
    │ - role: invitation.role
    │ - acceptedAt: now
    │
    ▼
Update invitation status to "accepted"
    │
    ▼
Redirect to workspace
```

### Member Role Changes

Only certain role transitions are allowed:

| Actor Role | Can Change To                           |
| ---------- | --------------------------------------- |
| Owner      | Any role (owner, admin, member, viewer) |
| Admin      | member, viewer only                     |
| Member     | Cannot change roles                     |
| Viewer     | Cannot change roles                     |

### Member Removal

- Owners can remove anyone except themselves
- Admins can remove members and viewers only
- Members/viewers cannot remove anyone
- Removing the owner requires ownership transfer first

---

## API Reference

### Workspace Endpoints

| Method | Endpoint              | Permission       | Description            |
| ------ | --------------------- | ---------------- | ---------------------- |
| GET    | `/api/workspaces`     | Authenticated    | List user's workspaces |
| POST   | `/api/workspaces`     | Authenticated    | Create new workspace   |
| GET    | `/api/workspaces/:id` | view             | Get workspace details  |
| PATCH  | `/api/workspaces/:id` | edit_settings    | Update workspace       |
| DELETE | `/api/workspaces/:id` | delete_workspace | Delete workspace       |

### Member Endpoints

| Method | Endpoint                                   | Permission     | Description     |
| ------ | ------------------------------------------ | -------------- | --------------- |
| GET    | `/api/workspaces/:id/members`              | view           | List members    |
| POST   | `/api/workspaces/:id/members/invite`       | invite_members | Send invitation |
| DELETE | `/api/workspaces/:id/members/:userId`      | remove_members | Remove member   |
| PATCH  | `/api/workspaces/:id/members/:userId/role` | change_roles   | Update role     |

### Invitation Endpoints

| Method | Endpoint                                        | Permission     | Description            |
| ------ | ----------------------------------------------- | -------------- | ---------------------- |
| GET    | `/api/workspaces/:id/invitations`               | invite_members | List pending           |
| GET    | `/api/invitations/:token`                       | Public         | Get invitation details |
| POST   | `/api/invitations/:token/accept`                | Authenticated  | Accept invitation      |
| POST   | `/api/invitations/:token/decline`               | Authenticated  | Decline invitation     |
| DELETE | `/api/workspaces/:id/invitations/:invitationId` | invite_members | Revoke invitation      |

### Credit Endpoints

| Method | Endpoint                                   | Permission   | Description             |
| ------ | ------------------------------------------ | ------------ | ----------------------- |
| GET    | `/api/workspaces/:id/credits`              | view         | Get credit balance      |
| GET    | `/api/workspaces/:id/credits/transactions` | view_billing | Get transaction history |
| POST   | `/api/workspaces/:id/credits/estimate`     | view         | Estimate execution cost |

---

## Frontend Integration

### Workspace Store (Zustand)

```typescript
// frontend/src/stores/workspaceStore.ts
interface WorkspaceStore {
    // State
    ownedWorkspaces: WorkspaceWithStats[];
    memberWorkspaces: WorkspaceWithStats[];
    currentWorkspace: WorkspaceWithStats | null;
    currentRole: WorkspaceRole | null;
    creditBalance: CreditBalance | null;
    members: WorkspaceMemberWithUser[];
    isInitialized: boolean;

    // Actions
    initialize: () => Promise<void>;
    switchWorkspace: (id: string) => Promise<void>;
    createWorkspace: (name: string) => Promise<Workspace>;
    updateWorkspace: (id: string, data: UpdateWorkspaceInput) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;

    // Member actions
    fetchMembers: () => Promise<void>;
    inviteMember: (email: string, role: WorkspaceRole) => Promise<void>;
    removeMember: (userId: string) => Promise<void>;
    updateMemberRole: (userId: string, role: WorkspaceRole) => Promise<void>;

    // Credit actions
    fetchCredits: () => Promise<void>;

    // Helpers
    hasPermission: (permission: WorkspacePermission) => boolean;
    getCurrentWorkspaceId: () => string | null;
}
```

### Initialization Flow

```typescript
// frontend/src/main.tsx
function StoreInitializer({ children }) {
    const initializeAuth = useAuthStore(state => state.initialize);
    const isAuthInitialized = useAuthStore(state => state.isInitialized);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const initializeWorkspace = useWorkspaceStore(state => state.initialize);

    // Initialize auth first
    useEffect(() => {
        initializeAuth();
    }, []);

    // Initialize workspace after auth completes
    useEffect(() => {
        if (isAuthInitialized && isAuthenticated) {
            initializeWorkspace();
        }
    }, [isAuthInitialized, isAuthenticated]);

    return <>{children}</>;
}
```

### Protected Route Gate

```typescript
// frontend/src/components/ProtectedRoute.tsx
export function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
    const { isInitialized, isLoading, currentWorkspace } = useWorkspaceStore();

    // Wait for both auth and workspace to be ready
    if (isAuthLoading || !isInitialized || isLoading || !currentWorkspace) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
}
```

### Key UI Components

| Component            | Location             | Purpose                   |
| -------------------- | -------------------- | ------------------------- |
| `WorkspaceSwitcher`  | Sidebar              | Switch between workspaces |
| `MemberList`         | Workspace Settings   | View/manage members       |
| `InviteMemberDialog` | Workspace Settings   | Send invitations          |
| `CreditProgressBar`  | Sidebar              | Show credit usage         |
| `AcceptInvitation`   | `/accept-invitation` | Handle invitation links   |

---

## Implementation Status

### Completed

- [x] Database schema (all tables and columns)
- [x] Backend repositories (Workspace, Member, Invitation, Credit)
- [x] Backend services (WorkspaceService, CreditService)
- [x] API routes (all CRUD operations)
- [x] Middleware (workspace context, permissions)
- [x] Frontend store (workspaceStore)
- [x] Frontend API methods
- [x] Shared types
- [x] WorkspaceSwitcher component
- [x] MemberList component
- [x] InviteMemberDialog component
- [x] AcceptInvitation page
- [x] Email invitation template
- [x] ProtectedRoute workspace gate
- [x] API header injection (X-Workspace-Id)

### Pending

- [ ] **Auto-create personal workspace on signup** - Wire `WorkspaceService.createPersonalWorkspace()` into registration flow
- [ ] **Data migration** - Populate `workspace_id` for existing resources
- [ ] **NOT NULL constraints** - Add after data migration completes
- [ ] **Resource limit enforcement** - Check limits when creating resources
- [ ] **Credit deduction during execution** - Wire CreditService into workflow/agent execution
- [ ] **Stripe checkout integration** - Plan upgrades and credit pack purchases
- [ ] **Stripe webhook handlers** - Subscription lifecycle events
- [ ] **Monthly credit reset** - Triggered by billing cycle
- [ ] **Workspace settings page** - Full settings UI
- [ ] **Billing page** - Subscription and credit management UI

### Database Migration Required

After deploying the workspace feature, run the data migration to:

1. Create personal workspaces for all existing users
2. Populate `workspace_id` on all existing resources
3. Add NOT NULL constraints to `workspace_id` columns
4. Enable foreign key constraints

---

## File Reference

### Backend

| File                                                                | Purpose             |
| ------------------------------------------------------------------- | ------------------- |
| `backend/migrations/1730000000038_create-workspaces.sql`            | Database schema     |
| `backend/src/storage/repositories/WorkspaceRepository.ts`           | Workspace CRUD      |
| `backend/src/storage/repositories/WorkspaceMemberRepository.ts`     | Member management   |
| `backend/src/storage/repositories/WorkspaceInvitationRepository.ts` | Invitations         |
| `backend/src/storage/repositories/WorkspaceCreditRepository.ts`     | Credit operations   |
| `backend/src/services/workspace/WorkspaceService.ts`                | Business logic      |
| `backend/src/services/workspace/CreditService.ts`                   | Credit calculations |
| `backend/src/api/middleware/workspace-context.ts`                   | Request middleware  |
| `backend/src/api/middleware/workspace-permissions.ts`               | Permission checks   |
| `backend/src/api/routes/workspaces/`                                | API routes          |

### Frontend

| File                                                       | Purpose                          |
| ---------------------------------------------------------- | -------------------------------- |
| `frontend/src/stores/workspaceStore.ts`                    | Zustand store                    |
| `frontend/src/lib/api.ts`                                  | API client with header injection |
| `frontend/src/components/ProtectedRoute.tsx`               | Auth + workspace gate            |
| `frontend/src/components/workspace/WorkspaceSwitcher.tsx`  | Workspace switcher               |
| `frontend/src/components/workspace/MemberList.tsx`         | Member management                |
| `frontend/src/components/workspace/InviteMemberDialog.tsx` | Invite modal                     |
| `frontend/src/pages/AcceptInvitation.tsx`                  | Invitation acceptance            |

### Shared

| File                      | Purpose                           |
| ------------------------- | --------------------------------- |
| `shared/src/workspace.ts` | Types, roles, permissions, limits |
