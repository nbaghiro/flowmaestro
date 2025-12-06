# Slack Agent Threads Integration

Connect FlowMaestro agent threads to Slack, enabling users to tag `@flowmaestro @agent-alias` in channels to interact with agents. Each Slack thread maps to a FlowMaestro thread.

## Design Decisions

- **Agent Selection**: Users mention agent alias (e.g., `@flowmaestro @sales-agent help me`)
- **User Mapping**: Match Slack user email to FlowMaestro user email
- **Response Mode**: Post complete response (not streaming)
- **LLM Settings**: Use agent's configured model/connection

## OAuth Changes

Add `app_mentions:read` scope to existing Slack OAuth config in `OAuthProviderRegistry.ts`:

```typescript
slack: {
    scopes: [
        "chat:write",
        "channels:read",
        "channels:history",
        "files:write",
        "users:read",
        "users:read.email",
        "app_mentions:read"  // NEW: receive @mentions
    ],
    // ... rest unchanged
}
```

## Database Schema

### `slack_bot_installations`

Stores bot-specific data per workspace (separate from existing `connections` table which stores user OAuth).

```sql
CREATE TABLE flowmaestro.slack_bot_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,

    -- Slack workspace
    team_id VARCHAR(50) NOT NULL UNIQUE,
    team_name VARCHAR(255),

    -- Bot credentials (from OAuth response)
    bot_user_id VARCHAR(50) NOT NULL,
    bot_access_token_encrypted TEXT NOT NULL,

    -- Link to existing connection (optional, for shared token)
    connection_id UUID REFERENCES flowmaestro.connections(id) ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slack_bot_installations_user ON flowmaestro.slack_bot_installations(user_id);
```

### `slack_thread_mappings`

Maps Slack threads to FlowMaestro threads.

```sql
CREATE TABLE flowmaestro.slack_thread_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    thread_id UUID NOT NULL REFERENCES flowmaestro.threads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES flowmaestro.agents(id) ON DELETE CASCADE,
    installation_id UUID NOT NULL REFERENCES flowmaestro.slack_bot_installations(id) ON DELETE CASCADE,

    slack_channel_id VARCHAR(50) NOT NULL,
    slack_thread_ts VARCHAR(50) NOT NULL,
    slack_user_id VARCHAR(50) NOT NULL,
    mapped_user_id UUID REFERENCES flowmaestro.users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_slack_thread_unique ON flowmaestro.slack_thread_mappings(slack_channel_id, slack_thread_ts);
CREATE INDEX idx_slack_thread_mappings_thread ON flowmaestro.slack_thread_mappings(thread_id);
```

### `slack_agent_aliases`

Short names for agents in Slack.

```sql
CREATE TABLE flowmaestro.slack_agent_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    installation_id UUID NOT NULL REFERENCES flowmaestro.slack_bot_installations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES flowmaestro.agents(id) ON DELETE CASCADE,

    alias VARCHAR(50) NOT NULL,  -- e.g., "sales-agent"

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_slack_alias_unique ON flowmaestro.slack_agent_aliases(installation_id, alias);
```

## Event Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SLACK: "@flowmaestro @sales-agent help with pricing"                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Events API (HTTP)
┌─────────────────────────────────────────────────────────────────────────────┐
│ POST /api/slack/events                                                      │
│                                                                             │
│ 1. Verify signature (HMAC-SHA256)                                           │
│ 2. Return 200 OK immediately (<3s requirement)                              │
│ 3. Process event async                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SlackEventProcessor                                                         │
│                                                                             │
│ 1. Look up installation by team_id                                          │
│ 2. Parse message → extract @alias and user message                          │
│ 3. Resolve alias → agent_id                                                 │
│ 4. Map Slack user → FlowMaestro user (via email)                            │
│ 5. Find or create thread mapping                                            │
│ 6. Execute agent (reuse existing execute.ts logic)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Temporal: agentOrchestratorWorkflow                                         │
│                                                                             │
│ - Processes message through agent                                           │
│ - Emits thread:message:complete via Redis                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SlackResponseHandler                                                        │
│                                                                             │
│ 1. Subscribe to Redis for thread:message:complete                           │
│ 2. Post response via chat.postMessage with thread_ts                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SLACK: Agent reply in thread                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
backend/src/
├── api/routes/
│   ├── slack/
│   │   ├── index.ts              # Route registration
│   │   └── events.ts             # POST /api/slack/events (webhook)
│   │
│   └── slack-integrations/
│       ├── index.ts
│       ├── list.ts               # GET /api/slack-integrations
│       ├── get.ts                # GET /:id
│       ├── delete.ts             # DELETE /:id
│       ├── list-aliases.ts       # GET /:id/aliases
│       ├── create-alias.ts       # POST /:id/aliases
│       └── delete-alias.ts       # DELETE /:id/aliases/:aliasId
│
├── services/slack/
│   ├── SlackEventProcessor.ts
│   ├── SlackResponseHandler.ts
│   └── SlackUserMapper.ts
│
└── storage/
    ├── models/
    │   ├── SlackBotInstallation.ts
    │   ├── SlackThreadMapping.ts
    │   └── SlackAgentAlias.ts
    │
    └── repositories/
        ├── SlackBotInstallationRepository.ts
        ├── SlackThreadMappingRepository.ts
        └── SlackAgentAliasRepository.ts
```

## API Routes

### Slack Events Webhook

| Endpoint            | Method | Auth      | Description           |
| ------------------- | ------ | --------- | --------------------- |
| `/api/slack/events` | POST   | Signature | Receives Slack events |

### Integration Management

| Endpoint                                       | Method | Auth | Description         |
| ---------------------------------------------- | ------ | ---- | ------------------- |
| `/api/slack-integrations`                      | GET    | JWT  | List installations  |
| `/api/slack-integrations/:id`                  | GET    | JWT  | Get installation    |
| `/api/slack-integrations/:id`                  | DELETE | JWT  | Delete installation |
| `/api/slack-integrations/:id/aliases`          | GET    | JWT  | List aliases        |
| `/api/slack-integrations/:id/aliases`          | POST   | JWT  | Create alias        |
| `/api/slack-integrations/:id/aliases/:aliasId` | DELETE | JWT  | Delete alias        |

## Core Service Logic

### Event Handler (`events.ts`)

```typescript
// Signature verification
function verifySlackSignature(signature: string, timestamp: string, body: string): boolean {
    const baseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET!);
    const computed = `v0=${hmac.update(baseString).digest("hex")}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

// Handler
export async function slackEventsHandler(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as SlackEventPayload;

    // URL verification challenge
    if (body.type === "url_verification") {
        return reply.send({ challenge: body.challenge });
    }

    // Acknowledge immediately
    reply.send({ ok: true });

    // Process async
    if (body.event?.type === "app_mention") {
        setImmediate(() => slackEventProcessor.processAppMention(body.event, body.team_id));
    }
}
```

### Message Parser (`SlackEventProcessor.ts`)

```typescript
parseMessage(text: string): { agentAlias: string | null; message: string } {
    // Input: "<@U0BOT> @sales-agent help with pricing"
    const withoutBot = text.replace(/<@[A-Z0-9]+>/g, "").trim();

    const match = withoutBot.match(/^@([\w-]+)\s*/);
    if (match) {
        return {
            agentAlias: match[1].toLowerCase(),
            message: withoutBot.replace(match[0], "").trim()
        };
    }
    return { agentAlias: null, message: withoutBot };
}
```

### Response Handler (`SlackResponseHandler.ts`)

```typescript
async waitAndRespond(
    installation: SlackBotInstallation,
    threadId: string,
    executionId: string,
    slackChannel: string,
    slackThreadTs: string
): Promise<void> {
    const TIMEOUT_MS = 120000;

    return new Promise((resolve, reject) => {
        const handler = async (event: ThreadStreamingEvent) => {
            if (event.executionId !== executionId) return;

            if (event.type === "thread:message:complete") {
                cleanup();
                await this.postToSlack(installation, slackChannel, slackThreadTs, event.finalContent);
                resolve();
            }

            if (event.type === "thread:message:error") {
                cleanup();
                await this.postToSlack(installation, slackChannel, slackThreadTs, `Error: ${event.error}`);
                reject(new Error(event.error));
            }
        };

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout"));
        }, TIMEOUT_MS);

        const cleanup = () => {
            clearTimeout(timeout);
            redisEventBus.unsubscribeFromThread(threadId, handler);
        };

        redisEventBus.subscribeToThread(threadId, handler);
    });
}
```

## Slack App Configuration

Configure at https://api.slack.com/apps:

1. **OAuth & Permissions**
    - Bot Token Scopes: `app_mentions:read`, `chat:write`, `users:read`, `users:read.email`
    - Redirect URL: `https://app.flowmaestro.com/api/oauth/slack/callback`

2. **Event Subscriptions**
    - Request URL: `https://app.flowmaestro.com/api/slack/events`
    - Subscribe to bot events: `app_mention`

## Environment Variables

```bash
# Already exists
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# New
SLACK_SIGNING_SECRET=...  # From Slack app settings > Basic Information
```

## Key Files to Reference

| File                                                             | Purpose                   |
| ---------------------------------------------------------------- | ------------------------- |
| `backend/src/api/routes/agents/execute.ts`                       | Agent execution pattern   |
| `backend/src/services/events/RedisEventBus.ts`                   | Thread event subscription |
| `backend/src/integrations/providers/slack/client/SlackClient.ts` | Existing Slack client     |
| `backend/src/storage/repositories/ThreadRepository.ts`           | Repository patterns       |
| `backend/src/services/oauth/OAuthProviderRegistry.ts`            | OAuth config (add scope)  |
