# Workspaces Implementation Plan

## Overview

Implement a multi-tenant workspace system where workspaces become the primary organizational unit for resources, billing, and collaboration. Each workspace has its own subscription type, credit balance, and member roles.

### Key Design Decisions

| Decision            | Choice                                              |
| ------------------- | --------------------------------------------------- |
| Billing Model       | Owner pays for workspace subscription               |
| Billing Entity      | Stripe customer on User, subscriptions on Workspace |
| Credit Scope        | Per-workspace credits (consumed by all members)     |
| Personal Workspaces | Same rules as team (can invite members)             |
| Pricing Tiers       | Free ($0) / Pro ($29/mo) / Team ($99/mo)            |

### Ownership vs Membership

Users can have two different relationships with workspaces:

```
User: alice@example.com
├── OWNS (created & pays for):
│   ├── "Alice's Personal" (Free) ─── Created on signup
│   └── "Alice's Agency" (Team) ───── She pays $99/mo
│
└── MEMBER OF (uses, doesn't pay):
    ├── "Acme Corp" (Team) ─────────── Bob owns & pays
    └── "Design Team" (Pro) ─────────── Carol owns & pays
```

**Billing Principle: Owner Pays**

| Role   | Billing Responsibility | Can Upgrade | Can View Invoices |
| ------ | ---------------------- | ----------- | ----------------- |
| Owner  | Pays for subscription  | ✓           | ✓                 |
| Admin  | None                   | -           | ✓                 |
| Member | None                   | -           | -                 |
| Viewer | None                   | -           | -                 |

---

## 1. Database Schema

### 1.1 Users Table Update (Stripe Customer)

The Stripe customer is stored on the **user** (not workspace) for unified billing:

```sql
-- Add Stripe customer to users table
ALTER TABLE flowmaestro.users
    ADD COLUMN stripe_customer_id VARCHAR(255);

CREATE UNIQUE INDEX idx_users_stripe_customer
    ON flowmaestro.users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
```

> **Why user-level Stripe customer?**
>
> - Single payment method for all owned workspaces
> - Unified invoicing (one invoice with multiple subscriptions)
> - Easier account-level promotions and discounts

### 1.2 New Tables

#### `workspaces`

```sql
CREATE TABLE flowmaestro.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'team',  -- 'personal' | 'team'
    type VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'team'
    owner_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE RESTRICT,

    -- Feature limits (derived from type)
    max_workflows INTEGER NOT NULL DEFAULT 5,
    max_agents INTEGER NOT NULL DEFAULT 2,
    max_knowledge_bases INTEGER NOT NULL DEFAULT 1,
    max_members INTEGER NOT NULL DEFAULT 1,
    max_connections INTEGER NOT NULL DEFAULT 5,

    -- Billing (subscription only - customer is on owner's user record)
    stripe_subscription_id VARCHAR(255),  -- null for free tier
    billing_email VARCHAR(255),  -- optional override, defaults to owner email

    -- Metadata
    settings JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (category IN ('personal', 'team')),
    CHECK (type IN ('free', 'pro', 'team')),
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$')
);

CREATE INDEX idx_workspaces_owner_id ON flowmaestro.workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_type ON flowmaestro.workspaces(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_slug ON flowmaestro.workspaces(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_category ON flowmaestro.workspaces(category) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_workspaces_stripe_subscription ON flowmaestro.workspaces(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
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

### 1.3 Modified Tables

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

### 1.4 Users Table Updates

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

## 3. Billing & Stripe Integration

### 3.1 Billing Architecture

```
Stripe Structure
────────────────
User (Bob) ──────────────────────────► Stripe Customer: cus_bob123
├── Workspace: "Bob's Personal" (Pro)    └── Subscription: sub_xxx ($29/mo)
└── Workspace: "Acme Corp" (Team)        └── Subscription: sub_yyy ($99/mo)
                                         ─────────────────────────────────
                                         Single Invoice: $128/mo

User (Alice) ─────────────────────────► Stripe Customer: cus_alice456
├── Workspace: "Alice's Personal" (Free)  └── (no subscription)
└── Member of "Acme Corp" ─────────────► (Bob pays, Alice just uses)
```

### 3.2 Key Billing Rules

| Rule                         | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Owner Pays**               | Only workspace owner is billed for subscription                           |
| **User = Stripe Customer**   | Each user has one Stripe customer (created on first upgrade)              |
| **Workspace = Subscription** | Each paid workspace has its own subscription                              |
| **Unified Invoice**          | User receives single invoice for all owned workspaces                     |
| **Members Don't Pay**        | Members consume workspace resources but billing is owner's responsibility |

### 3.3 Upgrade Flow

```typescript
// POST /api/workspaces/:id/billing/upgrade
async function upgradeWorkspace(userId: string, workspaceId: string, plan: "pro" | "team") {
    const workspace = await workspaceRepo.findById(workspaceId);

    // CRITICAL: Only owner can upgrade
    if (workspace.ownerId !== userId) {
        throw new ForbiddenError("Only the workspace owner can manage billing");
    }

    // Get or create Stripe customer for the OWNER
    const owner = await userRepo.findById(workspace.ownerId);
    let customerId = owner.stripeCustomerId;

    if (!customerId) {
        const customer = await stripe.customers.create({
            email: owner.email,
            name: owner.name,
            metadata: { userId: owner.id }
        });
        customerId = customer.id;
        await userRepo.update(owner.id, { stripeCustomerId: customerId });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
        subscription_data: {
            metadata: {
                workspaceId: workspace.id,
                workspaceName: workspace.name
            }
        },
        success_url: `${APP_URL}/workspace/settings?upgraded=true`,
        cancel_url: `${APP_URL}/workspace/settings`
    });

    return { checkoutUrl: session.url };
}
```

### 3.4 Webhook Handling

```typescript
// POST /api/webhooks/stripe/billing
async function handleBillingWebhook(event: Stripe.Event) {
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const workspaceId = session.subscription_data?.metadata?.workspaceId;
            const subscriptionId = session.subscription as string;

            // Update workspace with subscription
            await workspaceRepo.update(workspaceId, {
                stripeSubscriptionId: subscriptionId,
                type: determinePlanFromSubscription(subscriptionId)
            });
            break;
        }

        case "invoice.paid": {
            // Add monthly credits to all workspaces on invoice
            const invoice = event.data.object as Stripe.Invoice;
            for (const lineItem of invoice.lines.data) {
                const workspaceId = lineItem.metadata?.workspaceId;
                if (workspaceId) {
                    const plan = await getWorkspacePlan(workspaceId);
                    await creditService.addCredits(workspaceId, {
                        amount: WORKSPACE_LIMITS[plan].monthly_credits,
                        type: "subscription",
                        description: `Monthly ${plan} credits`
                    });
                }
            }
            break;
        }

        case "customer.subscription.deleted": {
            // Downgrade workspace to Free
            const subscription = event.data.object as Stripe.Subscription;
            const workspaceId = subscription.metadata.workspaceId;

            await workspaceRepo.update(workspaceId, {
                type: "free",
                stripeSubscriptionId: null,
                ...WORKSPACE_LIMITS.free
            });
            break;
        }

        case "customer.subscription.updated": {
            // Handle plan changes (upgrade/downgrade)
            const subscription = event.data.object as Stripe.Subscription;
            const workspaceId = subscription.metadata.workspaceId;
            const newPlan = determinePlanFromPrice(subscription.items.data[0].price.id);

            await workspaceRepo.update(workspaceId, {
                type: newPlan,
                ...WORKSPACE_LIMITS[newPlan]
            });
            break;
        }
    }
}
```

### 3.5 Billing UI Visibility

| UI Element              | Owner | Admin | Member | Viewer |
| ----------------------- | ----- | ----- | ------ | ------ |
| See plan badge          | ✓     | ✓     | ✓      | ✓      |
| See credit balance      | ✓     | ✓     | ✓      | ✓      |
| "Upgrade" button        | ✓     | -     | -      | -      |
| Billing settings page   | ✓     | -     | -      | -      |
| View invoices           | ✓     | ✓     | -      | -      |
| Manage payment method   | ✓     | -     | -      | -      |
| Cancel subscription     | ✓     | -     | -      | -      |
| Purchase add-on credits | ✓     | -     | -      | -      |

### 3.6 Credit Consumption

Credits are consumed at the **workspace level**, regardless of which member triggered the usage:

```typescript
async function consumeCredits(workspaceId: string, userId: string, amount: number) {
    // Credits come from workspace pool, not user
    const credits = await creditRepo.findByWorkspaceId(workspaceId);

    if (credits.balance < amount) {
        throw new InsufficientCreditsError("Workspace has insufficient credits");
    }

    await creditRepo.deduct(workspaceId, amount);

    // Track which user consumed credits for analytics
    await creditTransactionRepo.create({
        workspaceId,
        userId, // User who triggered the action
        amount: -amount,
        type: "usage",
        description: "Workflow execution"
    });
}
```

---

## 4. Credit System

### 4.1 Credit Pricing Model

Credits are an **abstraction layer over USD costs**. Rather than billing users directly for LLM API costs (which vary by model and fluctuate), credits provide predictable pricing and simplified billing.

#### Exchange Rate

```
1 Credit = $0.01 USD (1 cent)
```

#### LLM Model Credits (with 20% margin)

| Model             | Input (per 1K tokens) | Output (per 1K tokens) |
| ----------------- | --------------------- | ---------------------- |
| GPT-4o            | 0.3 credits           | 1.2 credits            |
| GPT-4o-mini       | 0.02 credits          | 0.07 credits           |
| Claude 3.5 Sonnet | 0.36 credits          | 1.8 credits            |
| Claude 3 Haiku    | 0.03 credits          | 0.15 credits           |
| Gemini 1.5 Pro    | 0.15 credits          | 0.6 credits            |
| Gemini 1.5 Flash  | 0.01 credits          | 0.04 credits           |

**Formula:**

```typescript
const MARGIN = 1.2; // 20% margin for sustainability
const creditsUsed = Math.ceil((usdCost / 0.01) * MARGIN);
```

### 4.2 Credit Costs by Action

#### Workflow Node Costs

| Node Type          | Credit Cost  | Description                  |
| ------------------ | ------------ | ---------------------------- |
| **LLM Node**       | Variable     | Based on model + tokens      |
| **Code Node**      | 0.1 credits  | Fixed per execution          |
| **HTTP Node**      | 0.05 credits | Fixed per request            |
| **Database Query** | 0.1 credits  | Per query executed           |
| **Conditional**    | 0 credits    | Logic only                   |
| **Loop**           | 0 credits    | Container (children charged) |
| **Transform**      | 0 credits    | Data manipulation            |

**Example Workflow:**

```
Workflow: "Summarize Document"
├── HTTP Node: Fetch document ────── 0.05 credits
├── LLM Node: GPT-4o summarize
│   ├── Input: 2,000 tokens ──────── 0.6 credits
│   └── Output: 500 tokens ───────── 0.6 credits
└── Code Node: Format output ─────── 0.1 credits
──────────────────────────────────────────────────
Total: 1.35 credits per execution
```

#### Agent Costs

| Action               | Credit Cost             | Description              |
| -------------------- | ----------------------- | ------------------------ |
| **Agent Turn**       | Variable                | Each LLM call (by model) |
| **Tool Call**        | 0.2 credits + tool cost | Invoking external tool   |
| **Memory Retrieval** | 0.1 credits             | Vector search            |
| **Memory Storage**   | 0.05 credits            | Store to memory          |

**Example Agent Session:**

```
Agent: "Research Assistant" (Claude 3.5 Sonnet)
├── Turn 1: Answer question
│   └── LLM: 500 in / 200 out ────── 0.54 credits
├── Turn 2: Web search (tool)
│   ├── Tool overhead ────────────── 0.2 credits
│   └── LLM: 1000 in / 300 out ───── 0.9 credits
├── Turn 3: Final response
│   └── LLM: 800 in / 400 out ────── 1.0 credits
└── Memory: Store conversation ───── 0.05 credits
────────────────────────────────────────────────────
Total: 2.69 credits for session
```

#### Knowledge Base Costs

| Action               | Credit Cost               | Description        |
| -------------------- | ------------------------- | ------------------ |
| Document Upload      | 1 credit per 10 pages     | Parsing + chunking |
| Embedding Generation | 0.1 credits per 1K tokens | Vector embedding   |
| Semantic Search      | 0.05 credits per query    | Similarity search  |
| Document Deletion    | 0 credits                 | Cleanup only       |

### 4.3 Credit Allocation by Plan

#### Monthly Allocation

| Plan              | Monthly Credits | Credit Value | Effective $/Credit |
| ----------------- | --------------- | ------------ | ------------------ |
| **Free**          | 100             | $1.00        | $0.0100            |
| **Pro** ($29/mo)  | 2,500           | $25.00       | $0.0116            |
| **Team** ($99/mo) | 10,000          | $100.00      | $0.0099            |

> Paid plans get better value per credit (bulk discount built into subscription).

#### Credit Rollover Policy

| Credit Type                | Rollover | Expiration           |
| -------------------------- | -------- | -------------------- |
| **Subscription** (monthly) | No       | End of billing cycle |
| **Purchased** (packs)      | Yes      | 1 year from purchase |
| **Bonus** (promotional)    | Yes      | 90 days              |

### 4.4 Credit Balance Schema

```sql
-- Enhanced workspace_credits table
CREATE TABLE flowmaestro.workspace_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Balances by type (for expiration tracking)
    subscription_balance INTEGER NOT NULL DEFAULT 0,
    purchased_balance INTEGER NOT NULL DEFAULT 0,
    bonus_balance INTEGER NOT NULL DEFAULT 0,

    -- Reserved credits (during execution)
    reserved INTEGER NOT NULL DEFAULT 0,

    -- Expiration tracking
    subscription_expires_at TIMESTAMPTZ,

    -- Lifetime statistics
    lifetime_allocated INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(workspace_id)
);

-- Total available = subscription + purchased + bonus - reserved
CREATE FUNCTION flowmaestro.get_available_credits(ws_id UUID)
RETURNS INTEGER AS $$
    SELECT GREATEST(0,
        subscription_balance + purchased_balance + bonus_balance - reserved
    )
    FROM flowmaestro.workspace_credits
    WHERE workspace_id = ws_id;
$$ LANGUAGE SQL STABLE;
```

### 4.5 Credit Consumption Order

Credits are deducted in order of expiration (use expiring credits first):

```typescript
// backend/src/services/CreditService.ts
async function deductCredits(workspaceId: string, amount: number): Promise<void> {
    const credits = await creditRepo.findByWorkspaceId(workspaceId);
    let remaining = amount;

    // 1. Subscription credits first (expire soonest)
    if (credits.subscriptionBalance > 0 && remaining > 0) {
        const deduct = Math.min(credits.subscriptionBalance, remaining);
        credits.subscriptionBalance -= deduct;
        remaining -= deduct;
    }

    // 2. Bonus credits next (medium expiration)
    if (credits.bonusBalance > 0 && remaining > 0) {
        const deduct = Math.min(credits.bonusBalance, remaining);
        credits.bonusBalance -= deduct;
        remaining -= deduct;
    }

    // 3. Purchased credits last (longest lived)
    if (credits.purchasedBalance > 0 && remaining > 0) {
        const deduct = Math.min(credits.purchasedBalance, remaining);
        credits.purchasedBalance -= deduct;
        remaining -= deduct;
    }

    if (remaining > 0) {
        throw new InsufficientCreditsError({
            required: amount,
            available: amount - remaining
        });
    }

    await creditRepo.update(workspaceId, credits);
}
```

### 4.6 Purchasing Additional Credits

#### Credit Pack Pricing

| Pack           | Credits | Price   | $/Credit | Savings |
| -------------- | ------- | ------- | -------- | ------- |
| **Starter**    | 500     | $5.00   | $0.0100  | 0%      |
| **Growth**     | 2,500   | $22.50  | $0.0090  | 10%     |
| **Scale**      | 10,000  | $80.00  | $0.0080  | 20%     |
| **Enterprise** | 50,000  | $350.00 | $0.0070  | 30%     |

#### Purchase Flow

```typescript
// POST /api/workspaces/:workspaceId/credits/purchase
async function purchaseCredits(
    userId: string,
    workspaceId: string,
    packId: string
): Promise<{ checkoutUrl: string }> {
    const workspace = await workspaceRepo.findById(workspaceId);

    // Only owner can purchase
    if (workspace.ownerId !== userId) {
        throw new ForbiddenError("Only workspace owner can purchase credits");
    }

    const pack = CREDIT_PACKS[packId];
    const owner = await userRepo.findById(workspace.ownerId);
    const customerId = await getOrCreateStripeCustomer(owner);

    // One-time payment (not subscription)
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    unit_amount: pack.priceInCents,
                    product_data: {
                        name: `${pack.credits.toLocaleString()} Credits`,
                        description: `Credit pack for ${workspace.name}`
                    }
                },
                quantity: 1
            }
        ],
        metadata: {
            type: "credit_purchase",
            workspaceId,
            packId,
            credits: pack.credits.toString()
        },
        success_url: `${APP_URL}/workspace/credits?purchased=true`,
        cancel_url: `${APP_URL}/workspace/credits`
    });

    return { checkoutUrl: session.url };
}
```

#### Purchase Webhook Handler

```typescript
// Handle checkout.session.completed for credit purchases
async function handleCreditPurchase(session: Stripe.Checkout.Session) {
    if (session.metadata?.type !== "credit_purchase") return;

    const { workspaceId, credits, packId } = session.metadata;
    const creditAmount = parseInt(credits, 10);

    await db.transaction(async (tx) => {
        // Add to purchased balance (longest lived)
        const current = await creditRepo.findByWorkspaceId(tx, workspaceId);
        await creditRepo.update(tx, workspaceId, {
            purchasedBalance: current.purchasedBalance + creditAmount,
            lifetimePurchased: current.lifetimePurchased + creditAmount
        });

        // Log transaction
        await creditTransactionRepo.create(tx, {
            workspaceId,
            amount: creditAmount,
            balanceBefore: current.purchasedBalance,
            balanceAfter: current.purchasedBalance + creditAmount,
            transactionType: "purchase",
            description: `Purchased ${packId} pack (${creditAmount.toLocaleString()} credits)`,
            metadata: {
                stripeSessionId: session.id,
                packId,
                amountPaidCents: session.amount_total
            }
        });
    });
}
```

### 4.7 Credit API Endpoints

| Method | Path                    | Permission | Description                    |
| ------ | ----------------------- | ---------- | ------------------------------ |
| GET    | `/credits/balance`      | view       | Current balance breakdown      |
| GET    | `/credits/transactions` | view       | Transaction history            |
| POST   | `/credits/estimate`     | view       | Estimate cost before execution |
| GET    | `/credits/packs`        | view       | Available credit packs         |
| POST   | `/credits/purchase`     | owner      | Purchase credit pack           |

**Balance Response:**

```typescript
interface CreditBalanceResponse {
    available: number; // Total usable credits
    subscription: number; // From monthly plan
    purchased: number; // From credit packs
    bonus: number; // Promotional credits
    reserved: number; // Currently reserved for executions
    subscriptionExpiresAt: string | null;

    // Usage stats
    usedThisMonth: number;
    usedAllTime: number;
}
```

### 4.8 Pre-Execution Credit Validation

```typescript
// Workflow execution with credit reservation
async function executeWorkflow(input: WorkflowExecutionInput) {
    const { workspaceId, workflowId, inputs, userId } = input;

    // 1. Estimate credit cost
    const estimate = await creditService.estimateWorkflowCredits(workflowId, inputs);

    // 2. Check and reserve credits (atomic)
    await creditService.reserveCredits(workspaceId, estimate.totalCredits);

    try {
        // 3. Execute workflow
        const result = await runWorkflow(workflowId, inputs);

        // 4. Calculate actual cost (may differ from estimate)
        const actualCost = calculateActualCost(result);

        // 5. Finalize: convert reservation to deduction
        await creditService.finalizeCredits(
            workspaceId,
            userId,
            estimate.totalCredits, // reserved amount
            actualCost.totalCredits, // actual amount
            "workflow_execution",
            result.executionId
        );

        return result;
    } catch (error) {
        // 6. Release reservation on failure
        await creditService.releaseReservation(workspaceId, estimate.totalCredits);
        throw error;
    }
}
```

### 4.9 Monthly Credit Refresh

```typescript
// Triggered by Stripe webhook: invoice.paid (subscription renewal)
async function refreshMonthlyCredits(workspaceId: string, plan: "free" | "pro" | "team") {
    const monthlyCredits = WORKSPACE_LIMITS[plan].monthly_credits;

    // Calculate expiration (end of next billing cycle)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db.transaction(async (tx) => {
        const current = await creditRepo.findByWorkspaceId(tx, workspaceId);

        // Reset subscription credits (don't accumulate)
        await creditRepo.update(tx, workspaceId, {
            subscriptionBalance: monthlyCredits,
            subscriptionExpiresAt: expiresAt,
            lifetimeAllocated: current.lifetimeAllocated + monthlyCredits
        });

        await creditTransactionRepo.create(tx, {
            workspaceId,
            amount: monthlyCredits,
            transactionType: "subscription_refresh",
            description: `Monthly ${plan} plan credits`,
            metadata: {
                plan,
                previousBalance: current.subscriptionBalance,
                expiresAt: expiresAt.toISOString()
            }
        });
    });
}
```

### 4.10 Credit Service Implementation

```typescript
// backend/src/services/CreditService.ts
export class CreditService {
    // Calculate credits for LLM usage
    calculateLLMCredits(
        provider: string,
        model: string,
        inputTokens: number,
        outputTokens: number
    ): number {
        const pricing = getModelPricing(provider, model);

        const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputPricePer1M;
        const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputPricePer1M;
        const totalUSD = inputCostUSD + outputCostUSD;

        // Convert to credits: $0.01 per credit, with 20% margin
        const MARGIN = 1.2;
        return Math.ceil((totalUSD / 0.01) * MARGIN);
    }

    // Estimate workflow cost before execution
    async estimateWorkflowCredits(
        workflowId: string,
        inputs: Record<string, unknown>
    ): Promise<CreditEstimate> {
        const workflow = await workflowRepo.findById(workflowId);
        let totalCredits = 0;
        const breakdown: CreditBreakdownItem[] = [];

        for (const node of workflow.definition.nodes) {
            const nodeCost = this.estimateNodeCredits(node, inputs);
            totalCredits += nodeCost.credits;
            breakdown.push({
                nodeId: node.id,
                nodeType: node.type,
                credits: nodeCost.credits,
                description: nodeCost.description
            });
        }

        return {
            totalCredits,
            breakdown,
            confidence: "estimate" // vs "exact" after execution
        };
    }

    // Reserve credits before execution
    async reserveCredits(workspaceId: string, amount: number): Promise<void> {
        const credits = await creditRepo.findByWorkspaceId(workspaceId);
        const available =
            credits.subscriptionBalance +
            credits.purchasedBalance +
            credits.bonusBalance -
            credits.reserved;

        if (available < amount) {
            throw new InsufficientCreditsError({
                required: amount,
                available,
                workspaceId
            });
        }

        await creditRepo.addReservation(workspaceId, amount);
    }

    // Finalize after execution (reservation -> actual deduction)
    async finalizeCredits(
        workspaceId: string,
        userId: string,
        reservedAmount: number,
        actualAmount: number,
        operationType: string,
        operationId: string
    ): Promise<void> {
        await db.transaction(async (tx) => {
            // Release reservation
            await creditRepo.releaseReservation(tx, workspaceId, reservedAmount);

            // Deduct actual amount
            await this.deductCreditsInternal(tx, workspaceId, actualAmount);

            // Log transaction
            const credits = await creditRepo.findByWorkspaceId(tx, workspaceId);
            await creditTransactionRepo.create(tx, {
                workspaceId,
                userId,
                amount: -actualAmount,
                balanceAfter:
                    credits.subscriptionBalance + credits.purchasedBalance + credits.bonusBalance,
                transactionType: "usage",
                operationType,
                operationId,
                description: `${operationType} execution`,
                metadata: { reservedAmount, actualAmount }
            });
        });
    }
}
```

### 4.11 UI Components

#### Credit Balance Widget

```tsx
// frontend/src/components/workspace/CreditBalance.tsx
export const CreditBalance: React.FC = () => {
    const { currentWorkspace } = useWorkspaceStore();
    const { data: credits, isLoading } = useQuery({
        queryKey: ["credits", currentWorkspace?.id],
        queryFn: () => api.getCreditsBalance(currentWorkspace!.id),
        enabled: !!currentWorkspace
    });

    if (isLoading) return <Skeleton className="w-24 h-6" />;

    const isLow = credits && credits.available < 50;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md",
                            isLow ? "bg-red-500/10 text-red-500" : "bg-muted"
                        )}
                    >
                        <Coins className="h-4 w-4" />
                        <span className="font-medium">{credits?.available.toLocaleString()}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-sm space-y-1">
                        <p className="font-medium">Credit Balance</p>
                        <p>Monthly: {credits?.subscription.toLocaleString()}</p>
                        <p>Purchased: {credits?.purchased.toLocaleString()}</p>
                        {credits?.bonus > 0 && <p>Bonus: {credits?.bonus.toLocaleString()}</p>}
                        {credits?.reserved > 0 && (
                            <p className="text-muted-foreground">
                                Reserved: {credits?.reserved.toLocaleString()}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
```

#### Execution Cost Estimate

```tsx
// frontend/src/components/workflow/ExecuteButton.tsx
export const ExecuteButton: React.FC<{ workflowId: string }> = ({ workflowId }) => {
    const { data: estimate } = useQuery({
        queryKey: ["estimate", workflowId],
        queryFn: () => api.estimateWorkflowCredits(workflowId)
    });
    const { data: credits } = useCreditsBalance();

    const hasEnoughCredits = credits && estimate && credits.available >= estimate.totalCredits;

    return (
        <Button onClick={handleExecute} disabled={!hasEnoughCredits}>
            <Play className="h-4 w-4 mr-2" />
            Run
            {estimate && (
                <span className="ml-2 text-xs opacity-70">~{estimate.totalCredits} credits</span>
            )}
        </Button>
    );
};
```

#### Buy Credits Dialog

```tsx
// frontend/src/components/workspace/BuyCreditsDialog.tsx
const CREDIT_PACKS = [
    { id: "starter", credits: 500, price: 500, label: "Starter" },
    { id: "growth", credits: 2500, price: 2250, label: "Growth", badge: "10% off" },
    { id: "scale", credits: 10000, price: 8000, label: "Scale", badge: "20% off" },
    { id: "enterprise", credits: 50000, price: 35000, label: "Enterprise", badge: "30% off" }
];

export const BuyCreditsDialog: React.FC = () => {
    const [selectedPack, setSelectedPack] = useState<string>("growth");
    const { currentWorkspace, isOwner } = useWorkspaceStore();
    const purchaseMutation = useMutation({
        mutationFn: (packId: string) => api.purchaseCredits(currentWorkspace!.id, packId)
    });

    const handlePurchase = async () => {
        const { checkoutUrl } = await purchaseMutation.mutateAsync(selectedPack);
        window.location.href = checkoutUrl;
    };

    return (
        <Dialog>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Buy Credits</DialogTitle>
                    <DialogDescription>
                        Purchase additional credits for your workspace
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                    {CREDIT_PACKS.map((pack) => (
                        <div
                            key={pack.id}
                            onClick={() => setSelectedPack(pack.id)}
                            className={cn(
                                "p-4 rounded-lg border cursor-pointer",
                                selectedPack === pack.id && "border-primary bg-primary/5"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-medium">{pack.label}</span>
                                {pack.badge && <Badge variant="secondary">{pack.badge}</Badge>}
                            </div>
                            <p className="text-2xl font-bold mt-2">
                                {pack.credits.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">credits</p>
                            <p className="text-lg font-medium mt-2">
                                ${(pack.price / 100).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handlePurchase}
                        disabled={!isOwner || purchaseMutation.isPending}
                    >
                        {purchaseMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        Purchase Credits
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
```

---

## 5. Role Permissions Matrix

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

## 6. Backend Architecture

### 6.1 New Files

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

### 6.2 Workspace Context Middleware

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

### 6.3 Permission Middleware

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

### 6.4 API Routes

#### Workspace CRUD

| Method | Path                                           | Permission       | Description                      |
| ------ | ---------------------------------------------- | ---------------- | -------------------------------- |
| GET    | `/api/workspaces`                              | (auth only)      | List user's workspaces (grouped) |
| POST   | `/api/workspaces`                              | (auth only)      | Create workspace                 |
| GET    | `/api/workspaces/:workspaceId`                 | view             | Get workspace                    |
| GET    | `/api/workspaces/:workspaceId/membership`      | view             | Get user's membership            |
| PUT    | `/api/workspaces/:workspaceId`                 | edit_settings    | Update workspace                 |
| DELETE | `/api/workspaces/:workspaceId`                 | delete_workspace | Delete workspace                 |
| POST   | `/api/workspaces/:workspaceId/billing/upgrade` | (owner only)     | Upgrade plan                     |
| POST   | `/api/workspaces/:workspaceId/billing/portal`  | (owner only)     | Stripe billing portal            |

**GET /api/workspaces Response (grouped by ownership):**

```typescript
// Response groups workspaces by user's relationship
interface GetWorkspacesResponse {
    owned: Workspace[];   // User is owner (pays for these)
    member: Workspace[];  // User is member (invited, doesn't pay)
}

// Example response
{
    "owned": [
        {
            "id": "ws_123",
            "name": "Alice's Personal",
            "type": "free",
            "category": "personal",
            "memberCount": 1,
            "ownerId": "user_alice"  // Alice owns this
        },
        {
            "id": "ws_456",
            "name": "Alice's Agency",
            "type": "team",
            "category": "team",
            "memberCount": 5,
            "ownerId": "user_alice"  // Alice owns this
        }
    ],
    "member": [
        {
            "id": "ws_789",
            "name": "Acme Corp",
            "type": "team",
            "category": "team",
            "memberCount": 12,
            "ownerId": "user_bob"  // Bob owns this, Alice is member
        }
    ]
}
```

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

### 6.5 Modified Routes

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

## 7. Frontend Architecture

> **Note:** This codebase uses **Zustand exclusively** for state management (not React Context). All workspace state should be managed via a Zustand store.

### 7.1 New Files

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

### 7.2 Workspace Store (Zustand)

```typescript
// frontend/src/stores/workspaceStore.ts
import { create } from "zustand";
import type { Workspace, WorkspaceRole, WorkspaceMember, Permission } from "@flowmaestro/shared";
import * as api from "../lib/api";

interface WorkspaceStore {
    // State - grouped by ownership
    ownedWorkspaces: Workspace[]; // User is owner (pays for these)
    memberWorkspaces: Workspace[]; // User is member (doesn't pay)

    // Current selection
    currentWorkspace: Workspace | null;
    currentMembership: WorkspaceMember | null; // Includes user's role
    isLoading: boolean;

    // Computed getters
    isOwner: boolean;
    canManageBilling: boolean;

    // Actions
    fetchWorkspaces: () => Promise<void>;
    switchWorkspace: (workspaceId: string) => Promise<void>;
    createWorkspace: (data: CreateWorkspaceInput) => Promise<Workspace>;
    updateWorkspace: (id: string, data: UpdateWorkspaceInput) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;

    // Permission helpers
    hasPermission: (permission: Permission) => boolean;
    checkLimit: (resource: string) => { allowed: boolean; current: number; max: number };
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    ownedWorkspaces: [],
    memberWorkspaces: [],
    currentWorkspace: null,
    currentMembership: null,
    isLoading: false,

    // Computed: is current user the owner of current workspace?
    get isOwner() {
        const { currentWorkspace, currentMembership } = get();
        return currentMembership?.role === "owner";
    },

    // Computed: can user manage billing? (only owner)
    get canManageBilling() {
        return get().isOwner;
    },

    fetchWorkspaces: async () => {
        set({ isLoading: true });
        try {
            // API returns workspaces grouped by ownership
            const { owned, member } = await api.getWorkspaces();
            set({
                ownedWorkspaces: owned,
                memberWorkspaces: member,
                isLoading: false
            });

            // Auto-select last workspace or first owned workspace
            const lastWorkspaceId = localStorage.getItem("currentWorkspaceId");
            const allWorkspaces = [...owned, ...member];
            const lastWorkspace = allWorkspaces.find((w) => w.id === lastWorkspaceId);

            if (lastWorkspace) {
                await get().switchWorkspace(lastWorkspace.id);
            } else if (owned.length > 0) {
                await get().switchWorkspace(owned[0].id);
            }
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    switchWorkspace: async (workspaceId: string) => {
        const { ownedWorkspaces, memberWorkspaces } = get();
        const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];
        const workspace = allWorkspaces.find((w) => w.id === workspaceId);

        if (workspace) {
            localStorage.setItem("currentWorkspaceId", workspaceId);

            // Fetch membership details for current workspace
            const membership = await api.getWorkspaceMembership(workspaceId);

            set({
                currentWorkspace: workspace,
                currentMembership: membership
            });

            // Invalidate other stores that depend on workspace context
            // e.g., workflowStore.fetchWorkflows(), agentStore.fetchAgents()
        }
    },

    hasPermission: (permission: Permission) => {
        const { currentMembership } = get();
        if (!currentMembership) return false;

        const role = currentMembership.role;
        return ROLE_PERMISSIONS[role].includes("*") || ROLE_PERMISSIONS[role].includes(permission);
    },

    checkLimit: (resource: string) => {
        const workspace = get().currentWorkspace;
        if (!workspace) return { allowed: false, current: 0, max: 0 };

        const max = workspace[`max_${resource}` as keyof Workspace] as number;
        const current = workspace.stats?.[resource] || 0;

        return {
            allowed: max === -1 || current < max,
            current,
            max
        };
    }
}));
```

### 7.3 API Client Updates

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

### 7.4 App.tsx Updates

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

### 7.5 Sidebar Layout with WorkspaceSwitcher

The WorkspaceSwitcher is the **first element** in the sidebar, positioned above all navigation items:

```
┌─────────────────────────────────┐
│ [Workspace Switcher Dropdown]   │  ← NEW: Top of sidebar
├─────────────────────────────────┤
│ Workflows                       │
│ Agents                          │
│ Form Interfaces                 │
│ Chat Interfaces                 │
│ Connections                     │
│ Knowledge Bases                 │
│ Templates                       │
├─────────────────────────────────┤
│ FOLDERS                         │
│ • Sales Docs                    │
│ • Accounting                    │
├─────────────────────────────────┤
│ Settings                        │
│ Account                         │
└─────────────────────────────────┘
```

### 7.6 WorkspaceSwitcher Component

```tsx
// frontend/src/components/workspace/WorkspaceSwitcher.tsx
interface WorkspaceSwitcherProps {
    className?: string;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ className }) => {
    const {
        ownedWorkspaces, // Workspaces user owns (pays for)
        memberWorkspaces, // Workspaces user is member of (doesn't pay)
        currentWorkspace,
        switchWorkspace,
        isOwner // Is user owner of current workspace?
    } = useWorkspaceStore();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter both lists by search query
    const filteredOwned = ownedWorkspaces.filter((w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredMember = memberWorkspaces.filter((w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const WorkspaceItem = ({ workspace }: { workspace: Workspace }) => (
        <DropdownMenuItem
            key={workspace.id}
            onClick={() => switchWorkspace(workspace.id)}
            className="flex items-center gap-3 p-2"
        >
            <WorkspaceAvatar workspace={workspace} size="sm" />
            <div className="flex-1">
                <p className="font-medium">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">
                    {workspace.memberCount} members · {workspace.type}
                </p>
            </div>
            {workspace.id === currentWorkspace?.id && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger className={cn("w-full", className)}>
                {/* Current workspace display */}
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent">
                    <WorkspaceAvatar workspace={currentWorkspace} size="sm" />
                    <div className="flex-1 text-left">
                        <p className="font-medium truncate">{currentWorkspace?.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {currentWorkspace?.type} plan
                            {isOwner && " · Owner"}
                        </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-[280px]" align="start">
                {/* Search input */}
                <div className="p-2">
                    <Input
                        placeholder="Search workspaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8"
                    />
                </div>

                <DropdownMenuSeparator />

                <div className="max-h-[300px] overflow-y-auto">
                    {/* MY WORKSPACES (owned) */}
                    {filteredOwned.length > 0 && (
                        <>
                            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                                MY WORKSPACES
                            </DropdownMenuLabel>
                            {filteredOwned.map((workspace) => (
                                <WorkspaceItem key={workspace.id} workspace={workspace} />
                            ))}
                        </>
                    )}

                    {/* SHARED WITH ME (member) */}
                    {filteredMember.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                                SHARED WITH ME
                            </DropdownMenuLabel>
                            {filteredMember.map((workspace) => (
                                <WorkspaceItem key={workspace.id} workspace={workspace} />
                            ))}
                        </>
                    )}

                    {/* Empty state */}
                    {filteredOwned.length === 0 && filteredMember.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No workspaces found
                        </p>
                    )}
                </div>

                <DropdownMenuSeparator />

                {/* Actions */}
                <DropdownMenuItem onClick={() => openCreateWorkspaceDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create new workspace
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/workspace/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Workspace settings
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
```

### 7.7 Sidebar Integration

```tsx
// In AppSidebar.tsx
<aside className="w-64 border-r bg-background flex flex-col">
    {/* Workspace Switcher - FIRST element */}
    <div className="p-3 border-b">
        <WorkspaceSwitcher />
    </div>

    {/* Main Navigation */}
    <nav className="flex-1 p-3 space-y-1">
        <SidebarLink to="/workflows" icon={Grid3x3} label="Workflows" />
        <SidebarLink to="/agents" icon={Bot} label="Agents" />
        <SidebarLink to="/form-interfaces" icon={FileInput} label="Form Interfaces" />
        <SidebarLink to="/chat-interfaces" icon={MessageSquare} label="Chat Interfaces" />
        <SidebarLink to="/connections" icon={Link} label="Connections" />
        <SidebarLink to="/knowledge-bases" icon={Database} label="Knowledge Bases" />
        <SidebarLink to="/templates" icon={FileText} label="Templates" />
    </nav>

    {/* Folders Section */}
    <SidebarFolders />

    {/* Bottom Navigation */}
    <div className="p-3 border-t space-y-1">
        <SidebarLink to="/settings" icon={Settings} label="Settings" />
        <SidebarLink to="/account" icon={User} label="Account" />
    </div>
</aside>
```

### 7.8 WorkspaceSwitcher Features

| Feature                       | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| **Current Workspace Display** | Shows avatar, name, and plan type (Free/Pro/Team) |
| **Search**                    | Filter workspaces by name as user types           |
| **Workspace List**            | Scrollable list showing all accessible workspaces |
| **Visual Indicator**          | Checkmark on currently selected workspace         |
| **Member Count**              | Shows number of members in each workspace         |
| **Create New**                | Opens CreateWorkspaceDialog for new workspace     |
| **Settings Link**             | Quick access to current workspace settings        |
| **Keyboard Navigation**       | Arrow keys to navigate, Enter to select           |

---

## 8. Migration Strategy

### 8.1 Data Migration Script

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

### 8.2 Repository Updates

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

## 9. Implementation Phases

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

## 10. Critical Files Reference

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

## 11. Folder Integration

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

## 12. Infrastructure Status

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

## 13. Testing Checklist

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
