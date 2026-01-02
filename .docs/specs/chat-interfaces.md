# Chat Interfaces - Implementation Plan

## Overview

Chat Interfaces allow users to create public-facing, embeddable conversational interfaces that connect to FlowMaestro agents. Unlike Form Interfaces (single input/output), Chat Interfaces enable **multi-turn conversational interactions** with persistent thread history.

**Core Value Proposition**: Turn any FlowMaestro agent into an embeddable chatbot with widget, iframe, or full-page hosting options.

---

## Key Differences from Form Interfaces

| Aspect            | Form Interfaces              | Chat Interfaces                   |
| ----------------- | ---------------------------- | --------------------------------- |
| Interaction Model | Single input → single output | Multi-turn conversation           |
| Target            | Workflows OR Agents          | Agents only                       |
| Output Display    | Final response only          | Full conversation history         |
| Persistence       | Optional per submission      | Persistent threads (configurable) |
| Real-time         | Optional streaming           | Required token streaming          |
| Embedding         | iframe, full-page            | Widget bubble, iframe, full-page  |
| User Identity     | Anonymous IP/session         | Anonymous session/fingerprint     |

---

## User Decisions

| Decision            | Choice                                                          |
| ------------------- | --------------------------------------------------------------- |
| Chat Interface URLs | Path-based (`/c/{slug}`) for pages, `/widget/{slug}` for widget |
| Target Type         | Agents only (no workflows)                                      |
| Embedding Options   | Widget bubble, iframe embed, full-page hosted                   |
| Streaming           | Token-by-token SSE streaming (required)                         |
| User Identity       | Anonymous (browser fingerprint + session ID)                    |
| Persistence         | Configurable (session-only OR localStorage)                     |
| Branding            | Full customization (colors, logo, fonts, welcome message)       |
| File Attachments    | Supported in conversation                                       |
| Suggested Prompts   | Clickable conversation starters                                 |
| Admin Visibility    | Full (sessions, messages, analytics)                            |
| Rate Limiting       | 10 messages/min/session (configurable)                          |

---

## Architecture Overview

```
                                    CHAT INTERFACE ARCHITECTURE

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           EMBEDDING OPTIONS                                 │
    │                                                                             │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
    │  │    WIDGET    │    │    IFRAME    │    │        FULL PAGE             │   │
    │  │    BUBBLE    │    │    EMBED     │    │        /c/{slug}             │   │
    │  │              │    │              │    │                              │   │
    │  │  ┌────────┐  │    │ ┌──────────┐ │    │ ┌──────────────────────────┐ │   │
    │  │  │   💬   │  │    │ │          │ │    │ │      Chat Interface      │ │   │
    │  │  └────────┘  │    │ │  Chat    │ │    │ │      Full Screen         │ │   │
    │  │    Click     │    │ │  Window  │ │    │ │                          │ │   │
    │  │      ↓       │    │ │          │ │    │ │                          │ │   │
    │  │  ┌────────┐  │    │ └──────────┘ │    │ └──────────────────────────┘ │   │
    │  │  │ Chat   │  │    │              │    │                              │   │
    │  │  │ Panel  │  │    │              │    │                              │   │
    │  │  └────────┘  │    │              │    │                              │   │
    │  └──────────────┘    └──────────────┘    └──────────────────────────────┘   │
    │          │                  │                         │                     │
    └──────────┼──────────────────┼─────────────────────────┼─────────────────────┘
               │                  │                         │
               └──────────────────┼─────────────────────────┘
                                  │
                                  ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         PUBLIC API LAYER                                    │
    │                                                                             │
    │   ┌──────────────────────────────────────────────────────────────────────┐  │
    │   │  GET /api/public/chat-interfaces/:slug    - Get interface config     │  │
    │   │  POST /api/public/chat-interfaces/:slug/sessions - Create session    │  │
    │   │  POST /api/public/chat-interfaces/:slug/messages - Send message      │  │
    │   │  GET /api/public/chat-interfaces/:slug/messages  - Get history       │  │
    │   │  GET /api/public/chat-interfaces/:slug/stream    - SSE streaming     │  │
    │   └──────────────────────────────────────────────────────────────────────┘  │
    │                                  │                                          │
    │   ┌──────────────────────────────┼───────────────────────────────────────┐  │
    │   │                    RATE LIMITING                                     │  │
    │   │         10 messages/min/session (configurable per interface)         │  │
    │   └──────────────────────────────────────────────────────────────────────┘  │
    └──────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                        SESSION MANAGEMENT                                   │
    │                                                                             │
    │   ┌───────────────────────────────────────────────────────────────────┐     │
    │   │  chat_interface_sessions                                          │     │
    │   │  - session_id (browser fingerprint + interface)                   │     │
    │   │  - thread_id (links to existing threads table)                    │     │
    │   │  - visitor metadata (IP, user agent, fingerprint)                 │     │
    │   └───────────────────────────────────────────────────────────────────┘     │
    │                                  │                                          │
    └──────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                      AGENT EXECUTION LAYER                                  │
    │                                                                             │
    │   ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐    │
    │   │   Temporal       │    │   Redis Event    │    │    SSE Stream      │    │
    │   │   Workflow       │───▶│      Bus         │───▶│    to Client       │    │
    │   │   (existing)     │    │   (existing)     │    │                    │    │
    │   └──────────────────┘    └──────────────────┘    └────────────────────┘    │
    │                                                                             │
    │   Leverages existing:                                                       │
    │   - agentOrchestratorWorkflow                                               │
    │   - threads table                                                           │
    │   - agent_messages table                                                    │
    │   - agent_executions table                                                  │
    │   - RedisEventBus for streaming                                             │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Chat Interface Sections

### 1. Branding Header

Options for chat interface creator:

| Option        | Description                            |
| ------------- | -------------------------------------- |
| Cover Photo   | Upload image, solid color, or gradient |
| Icon          | Upload custom avatar/logo              |
| Title         | Main heading for the chat              |
| Description   | Optional explanatory text              |
| Primary Color | Theme color for buttons, accents       |
| Font Family   | Custom font selection                  |
| Border Radius | Rounded corners customization          |

**Storage**: Assets uploaded to GCS at `users/{userId}/chat-interfaces/{chatInterfaceId}/`

### 2. Welcome Screen

- **Welcome Message**: Initial greeting shown before conversation starts
- **Suggested Prompts**: Clickable conversation starters (e.g., "What can you help me with?")
- Supports emoji/icon prefixes for prompts

### 3. Message Input

- Textarea for user messages
- Configurable placeholder text
- Optional file attachment button
- Send button with loading state

### 4. File Attachments

- Drag-and-drop or click to upload
- Configurable: enabled/disabled per interface
- Max files (default: 3)
- Max file size (default: 10MB)
- Allowed MIME types

### 5. Conversation Display

- Scrolling message list
- User messages (right-aligned)
- Assistant messages (left-aligned) with streaming support
- Typing indicator during response generation
- Timestamp display

### 6. Widget Configuration

- Position: bottom-right or bottom-left
- Button icon: chat, message, help, or custom URL
- Button text: optional label
- Initial state: collapsed or expanded

---

## Testing & Preview

### Built-in Preview Page

Add a dedicated preview page accessible from the builder to test all embed types:

**Route**: `/chat-interfaces/:id/preview`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Preview: Customer Support Bot                           [← Back to Editor] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Full Page]  [Iframe]  [Widget]                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │                     (Selected embed preview)                        │    │
│  │                                                                     │    │
│  │   Full Page: Renders the chat directly                              │    │
│  │   Iframe: Shows iframe in a simulated webpage container             │    │
│  │   Widget: Shows floating bubble on a blank "webpage"                │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Embed Code                                            [Copy]       │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │  <script src="https://app.flowmaestro.com/widget/slug.js"></script> │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Preview Tab Behaviors

| Tab           | What it shows                                                  |
| ------------- | -------------------------------------------------------------- |
| **Full Page** | Direct render of `/c/:slug` content (no iframe needed)         |
| **Iframe**    | Gray "webpage" background with iframe embedded in center       |
| **Widget**    | White "webpage" background with floating chat bubble in corner |

### Preview Components

- `ChatInterfacePreviewPage.tsx` - Main preview page with tab navigation
- `PreviewFullPage.tsx` - Direct chat render
- `PreviewIframe.tsx` - Iframe in simulated webpage container
- `PreviewWidget.tsx` - Widget on simulated white webpage
- `EmbedCodeDisplay.tsx` - Copy-able embed code snippets

### Routes

```
/chat-interfaces/:id/preview        → ChatInterfacePreviewPage.tsx
/chat-interfaces/:id/preview/:type  → Same page with type pre-selected (full-page|iframe|widget)
```

### Embed Code Snippets

**Widget (JavaScript)**:

```html
<script src="https://app.flowmaestro.com/widget/{slug}.js"></script>
```

**Iframe**:

```html
<iframe
    src="https://app.flowmaestro.com/embed/{slug}"
    width="400"
    height="600"
    frameborder="0"
></iframe>
```

**Full Page Link**:

```
https://app.flowmaestro.com/c/{slug}
```

---

## Two-Phase Implementation

---

# Phase 1: Chat Interface Builder & Public Embedding

Build the complete chat interface editor and public rendering infrastructure **without** agent execution. Chat interfaces render but messages are stored without processing.

---

## 1.1 Database Schema

### Migration: `XXXXXX_create-chat-interfaces.sql`

```sql
SET search_path TO flowmaestro, public;

-- Chat Interface definitions
CREATE TABLE IF NOT EXISTS chat_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,

    -- Target (REQUIRED - agents only)
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Branding - Header
    cover_type VARCHAR(20) DEFAULT 'color',  -- 'image' | 'color' | 'gradient'
    cover_value TEXT DEFAULT '#6366f1',      -- URL, hex color, or gradient CSS
    icon_url TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Branding - Theme
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    font_family VARCHAR(100) DEFAULT 'Inter',
    border_radius INTEGER DEFAULT 12,  -- px

    -- Chat Configuration
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    placeholder_text TEXT DEFAULT 'Type your message...',
    suggested_prompts JSONB DEFAULT '[]'::jsonb,  -- [{text: "...", icon?: "..."}]

    -- File Upload Configuration
    allow_file_upload BOOLEAN DEFAULT false,
    max_files INTEGER DEFAULT 3,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/*', 'text/*'],

    -- Session Configuration
    persistence_type VARCHAR(20) DEFAULT 'session',  -- 'session' | 'local_storage'
    session_timeout_minutes INTEGER DEFAULT 60,  -- 0 = no timeout

    -- Widget Configuration
    widget_position VARCHAR(20) DEFAULT 'bottom-right',  -- 'bottom-right' | 'bottom-left'
    widget_button_icon VARCHAR(50) DEFAULT 'chat',  -- 'chat' | 'message' | 'help' | custom URL
    widget_button_text VARCHAR(100),  -- Optional text next to icon
    widget_initial_state VARCHAR(20) DEFAULT 'collapsed',  -- 'collapsed' | 'expanded'

    -- Visibility & Access
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
    published_at TIMESTAMPTZ,

    -- Rate Limiting
    rate_limit_messages INTEGER DEFAULT 10,  -- per minute
    rate_limit_window_seconds INTEGER DEFAULT 60,

    -- Stats
    session_count BIGINT DEFAULT 0,
    message_count BIGINT DEFAULT 0,
    last_activity_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_chat_interface_user_slug UNIQUE (user_id, slug)
);

-- Chat Interface Sessions (anonymous visitors)
CREATE TABLE IF NOT EXISTS chat_interface_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interface_id UUID NOT NULL REFERENCES chat_interfaces(id) ON DELETE CASCADE,

    -- Session Identity (anonymous)
    session_token VARCHAR(255) NOT NULL,  -- Generated on first visit
    browser_fingerprint VARCHAR(255),  -- For session continuity

    -- Link to existing thread system
    thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,

    -- Visitor Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country_code VARCHAR(2),

    -- Session State
    status VARCHAR(20) DEFAULT 'active',  -- 'active' | 'ended' | 'expired'
    message_count INTEGER DEFAULT 0,

    -- Local storage persistence token (if enabled)
    persistence_token VARCHAR(255),

    -- Timestamps
    first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_session_token UNIQUE (interface_id, session_token)
);

-- Indexes for chat_interfaces
CREATE INDEX idx_chat_interfaces_user_id ON chat_interfaces(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_interfaces_slug ON chat_interfaces(slug) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_chat_interfaces_agent ON chat_interfaces(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_interfaces_status ON chat_interfaces(status) WHERE deleted_at IS NULL;

-- Indexes for chat_interface_sessions
CREATE INDEX idx_chat_sessions_interface_id ON chat_interface_sessions(interface_id, last_activity_at DESC);
CREATE INDEX idx_chat_sessions_session_token ON chat_interface_sessions(session_token);
CREATE INDEX idx_chat_sessions_thread ON chat_interface_sessions(thread_id);
CREATE INDEX idx_chat_sessions_fingerprint ON chat_interface_sessions(interface_id, browser_fingerprint);

-- Function to update session stats
CREATE OR REPLACE FUNCTION update_chat_interface_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_interfaces
        SET session_count = session_count + 1,
            last_activity_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.interface_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_interface_session_stats
    AFTER INSERT ON chat_interface_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_interface_session_stats();

-- Function to update message count
CREATE OR REPLACE FUNCTION update_chat_interface_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.message_count > OLD.message_count THEN
        UPDATE chat_interfaces
        SET message_count = message_count + (NEW.message_count - OLD.message_count),
            last_activity_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.interface_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_interface_message_count
    AFTER UPDATE ON chat_interface_sessions
    FOR EACH ROW
    WHEN (NEW.message_count > OLD.message_count)
    EXECUTE FUNCTION update_chat_interface_message_count();

-- Trigger for updated_at
CREATE TRIGGER update_chat_interfaces_updated_at
    BEFORE UPDATE ON chat_interfaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 1.2 Shared Types

### File: `shared/src/types/chat-interface.ts`

```typescript
// Cover types
export type ChatInterfaceCoverType = "image" | "color" | "gradient";

// Widget position options
export type ChatInterfaceWidgetPosition = "bottom-right" | "bottom-left";

// Persistence type
export type ChatInterfacePersistenceType = "session" | "local_storage";

// Session status
export type ChatInterfaceSessionStatus = "active" | "ended" | "expired";

// Suggested prompt configuration
export interface ChatInterfaceSuggestedPrompt {
    text: string;
    icon?: string; // Emoji or icon name
}

// Main chat interface configuration
export interface ChatInterface {
    id: string;
    userId: string;

    // Identity
    name: string;
    slug: string;

    // Target
    agentId: string;

    // Branding - Header
    coverType: ChatInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;

    // Branding - Theme
    primaryColor: string;
    fontFamily: string;
    borderRadius: number;

    // Chat Configuration
    welcomeMessage: string;
    placeholderText: string;
    suggestedPrompts: ChatInterfaceSuggestedPrompt[];

    // File Upload Configuration
    allowFileUpload: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];

    // Session Configuration
    persistenceType: ChatInterfacePersistenceType;
    sessionTimeoutMinutes: number;

    // Widget Configuration
    widgetPosition: ChatInterfaceWidgetPosition;
    widgetButtonIcon: string;
    widgetButtonText: string | null;
    widgetInitialState: "collapsed" | "expanded";

    // Rate Limiting
    rateLimitMessages: number;
    rateLimitWindowSeconds: number;

    // State
    status: "draft" | "published";
    publishedAt: Date | null;

    // Stats
    sessionCount: number;
    messageCount: number;
    lastActivityAt: Date | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Chat interface session (visitor)
export interface ChatInterfaceSession {
    id: string;
    interfaceId: string;
    sessionToken: string;
    browserFingerprint: string | null;
    threadId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    referrer: string | null;
    countryCode: string | null;
    status: ChatInterfaceSessionStatus;
    messageCount: number;
    persistenceToken: string | null;
    firstSeenAt: Date;
    lastActivityAt: Date;
    endedAt: Date | null;
}

// Create/Update DTOs
export interface CreateChatInterfaceInput {
    name: string;
    slug: string;
    agentId: string;
    title: string;
    description?: string;
    coverType?: ChatInterfaceCoverType;
    coverValue?: string;
    primaryColor?: string;
    welcomeMessage?: string;
    suggestedPrompts?: ChatInterfaceSuggestedPrompt[];
}

export interface UpdateChatInterfaceInput {
    name?: string;
    slug?: string;
    title?: string;
    description?: string;
    coverType?: ChatInterfaceCoverType;
    coverValue?: string;
    iconUrl?: string;
    primaryColor?: string;
    fontFamily?: string;
    borderRadius?: number;
    welcomeMessage?: string;
    placeholderText?: string;
    suggestedPrompts?: ChatInterfaceSuggestedPrompt[];
    allowFileUpload?: boolean;
    maxFiles?: number;
    maxFileSizeMb?: number;
    allowedFileTypes?: string[];
    persistenceType?: ChatInterfacePersistenceType;
    sessionTimeoutMinutes?: number;
    widgetPosition?: ChatInterfaceWidgetPosition;
    widgetButtonIcon?: string;
    widgetButtonText?: string;
    widgetInitialState?: "collapsed" | "expanded";
    rateLimitMessages?: number;
    rateLimitWindowSeconds?: number;
}

// Public chat interface (for rendering - excludes sensitive data)
export interface PublicChatInterface {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverType: ChatInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    primaryColor: string;
    fontFamily: string;
    borderRadius: number;
    welcomeMessage: string;
    placeholderText: string;
    suggestedPrompts: ChatInterfaceSuggestedPrompt[];
    allowFileUpload: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    persistenceType: ChatInterfacePersistenceType;
    widgetPosition: ChatInterfaceWidgetPosition;
    widgetButtonIcon: string;
    widgetButtonText: string | null;
    widgetInitialState: "collapsed" | "expanded";
}

// Session creation input (from widget/embed)
export interface CreateChatSessionInput {
    browserFingerprint?: string;
    referrer?: string;
    persistenceToken?: string; // For resuming localStorage sessions
}

// Session response
export interface ChatSessionResponse {
    sessionId: string;
    sessionToken: string;
    threadId: string;
    persistenceToken?: string; // For localStorage persistence
    existingMessages?: ChatMessage[]; // If resuming session
}

// Chat message (simplified view for public interface)
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    attachments?: ChatMessageAttachment[];
}

export interface ChatMessageAttachment {
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string; // Signed download URL
}

// Send message input
export interface SendChatMessageInput {
    sessionToken: string;
    message: string;
    attachments?: File[];
}

// SSE streaming events
export interface ChatStreamingEvent {
    type:
        | "chat:message:start"
        | "chat:message:token"
        | "chat:message:complete"
        | "chat:message:error"
        | "chat:thinking"
        | "chat:tool:started"
        | "chat:tool:completed"
        | "chat:tool:failed";
    sessionId: string;
    threadId: string;
    data: Record<string, unknown>;
}

// Admin analytics
export interface ChatInterfaceAnalytics {
    interfaceId: string;
    period: "day" | "week" | "month";
    totalSessions: number;
    uniqueVisitors: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    avgSessionDuration: number;
    topReferrers: Array<{ referrer: string; count: number }>;
    messagesByHour: Array<{ hour: number; count: number }>;
}
```

---

## 1.3 Backend Implementation

### Repository: `ChatInterfaceRepository.ts`

```typescript
// backend/src/storage/repositories/ChatInterfaceRepository.ts
import { pool } from "../database";
import type {
    ChatInterface,
    CreateChatInterfaceInput,
    UpdateChatInterfaceInput,
    PublicChatInterface
} from "@flowmaestro/shared";

export class ChatInterfaceRepository {
    async create(userId: string, input: CreateChatInterfaceInput): Promise<ChatInterface> {
        const result = await pool.query<ChatInterface>(
            `INSERT INTO chat_interfaces (
                user_id, name, slug, agent_id, title, description,
                cover_type, cover_value, primary_color, welcome_message, suggested_prompts
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                userId,
                input.name,
                input.slug,
                input.agentId,
                input.title,
                input.description || null,
                input.coverType || "color",
                input.coverValue || "#6366f1",
                input.primaryColor || "#6366f1",
                input.welcomeMessage || "Hello! How can I help you today?",
                JSON.stringify(input.suggestedPrompts || [])
            ]
        );
        return this.mapToInterface(result.rows[0]);
    }

    async findById(id: string, userId: string): Promise<ChatInterface | null> {
        const result = await pool.query(
            `SELECT * FROM chat_interfaces
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async findBySlugPublic(slug: string): Promise<PublicChatInterface | null> {
        const result = await pool.query(
            `SELECT * FROM chat_interfaces
             WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
            [slug]
        );
        return result.rows[0] ? this.mapToPublicInterface(result.rows[0]) : null;
    }

    async findByUserId(userId: string): Promise<ChatInterface[]> {
        const result = await pool.query(
            `SELECT * FROM chat_interfaces
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
            [userId]
        );
        return result.rows.map(this.mapToInterface);
    }

    async findByAgentId(agentId: string, userId: string): Promise<ChatInterface[]> {
        const result = await pool.query(
            `SELECT * FROM chat_interfaces
             WHERE agent_id = $1 AND user_id = $2 AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
            [agentId, userId]
        );
        return result.rows.map(this.mapToInterface);
    }

    async update(
        id: string,
        userId: string,
        input: UpdateChatInterfaceInput
    ): Promise<ChatInterface | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 3;

        Object.entries(input).forEach(([key, value]) => {
            if (value !== undefined) {
                const snakeKey = this.toSnakeCase(key);
                if (key === "suggestedPrompts") {
                    fields.push(`${snakeKey} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${snakeKey} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        });

        if (fields.length === 0) return this.findById(id, userId);

        const query = `
            UPDATE chat_interfaces
            SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await pool.query(query, [id, userId, ...values]);
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async publish(id: string, userId: string): Promise<ChatInterface | null> {
        const result = await pool.query(
            `UPDATE chat_interfaces
             SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING *`,
            [id, userId]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async unpublish(id: string, userId: string): Promise<ChatInterface | null> {
        const result = await pool.query(
            `UPDATE chat_interfaces
             SET status = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING *`,
            [id, userId]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async softDelete(id: string, userId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE chat_interfaces
             SET deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    async isSlugAvailable(slug: string, userId: string, excludeId?: string): Promise<boolean> {
        const query = excludeId
            ? `SELECT 1 FROM chat_interfaces WHERE slug = $1 AND user_id = $2 AND id != $3 AND deleted_at IS NULL`
            : `SELECT 1 FROM chat_interfaces WHERE slug = $1 AND user_id = $2 AND deleted_at IS NULL`;

        const params = excludeId ? [slug, userId, excludeId] : [slug, userId];
        const result = await pool.query(query, params);
        return result.rowCount === 0;
    }

    async getAgentIdBySlug(slug: string): Promise<string | null> {
        const result = await pool.query(
            `SELECT agent_id FROM chat_interfaces
             WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
            [slug]
        );
        return result.rows[0]?.agent_id || null;
    }

    async getOwnerUserIdBySlug(slug: string): Promise<string | null> {
        const result = await pool.query(
            `SELECT user_id FROM chat_interfaces
             WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
            [slug]
        );
        return result.rows[0]?.user_id || null;
    }

    private mapToInterface(row: Record<string, unknown>): ChatInterface {
        return {
            id: row.id as string,
            userId: row.user_id as string,
            name: row.name as string,
            slug: row.slug as string,
            agentId: row.agent_id as string,
            coverType: row.cover_type as ChatInterface["coverType"],
            coverValue: row.cover_value as string,
            iconUrl: row.icon_url as string | null,
            title: row.title as string,
            description: row.description as string | null,
            primaryColor: row.primary_color as string,
            fontFamily: row.font_family as string,
            borderRadius: row.border_radius as number,
            welcomeMessage: row.welcome_message as string,
            placeholderText: row.placeholder_text as string,
            suggestedPrompts: row.suggested_prompts as ChatInterface["suggestedPrompts"],
            allowFileUpload: row.allow_file_upload as boolean,
            maxFiles: row.max_files as number,
            maxFileSizeMb: row.max_file_size_mb as number,
            allowedFileTypes: row.allowed_file_types as string[],
            persistenceType: row.persistence_type as ChatInterface["persistenceType"],
            sessionTimeoutMinutes: row.session_timeout_minutes as number,
            widgetPosition: row.widget_position as ChatInterface["widgetPosition"],
            widgetButtonIcon: row.widget_button_icon as string,
            widgetButtonText: row.widget_button_text as string | null,
            widgetInitialState: row.widget_initial_state as "collapsed" | "expanded",
            rateLimitMessages: row.rate_limit_messages as number,
            rateLimitWindowSeconds: row.rate_limit_window_seconds as number,
            status: row.status as "draft" | "published",
            publishedAt: row.published_at ? new Date(row.published_at as string) : null,
            sessionCount: Number(row.session_count),
            messageCount: Number(row.message_count),
            lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at as string) : null,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }

    private mapToPublicInterface(row: Record<string, unknown>): PublicChatInterface {
        return {
            id: row.id as string,
            slug: row.slug as string,
            title: row.title as string,
            description: row.description as string | null,
            coverType: row.cover_type as PublicChatInterface["coverType"],
            coverValue: row.cover_value as string,
            iconUrl: row.icon_url as string | null,
            primaryColor: row.primary_color as string,
            fontFamily: row.font_family as string,
            borderRadius: row.border_radius as number,
            welcomeMessage: row.welcome_message as string,
            placeholderText: row.placeholder_text as string,
            suggestedPrompts: row.suggested_prompts as PublicChatInterface["suggestedPrompts"],
            allowFileUpload: row.allow_file_upload as boolean,
            maxFiles: row.max_files as number,
            maxFileSizeMb: row.max_file_size_mb as number,
            allowedFileTypes: row.allowed_file_types as string[],
            persistenceType: row.persistence_type as PublicChatInterface["persistenceType"],
            widgetPosition: row.widget_position as PublicChatInterface["widgetPosition"],
            widgetButtonIcon: row.widget_button_icon as string,
            widgetButtonText: row.widget_button_text as string | null,
            widgetInitialState: row.widget_initial_state as "collapsed" | "expanded"
        };
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }
}
```

### Repository: `ChatInterfaceSessionRepository.ts`

```typescript
// backend/src/storage/repositories/ChatInterfaceSessionRepository.ts
import crypto from "crypto";
import { pool } from "../database";
import type { ChatInterfaceSession, CreateChatSessionInput } from "@flowmaestro/shared";

export class ChatInterfaceSessionRepository {
    async create(
        interfaceId: string,
        input: CreateChatSessionInput,
        metadata: { ipAddress?: string; userAgent?: string }
    ): Promise<ChatInterfaceSession> {
        const sessionToken = this.generateSessionToken();
        const persistenceToken = input.persistenceToken || this.generatePersistenceToken();

        const result = await pool.query(
            `INSERT INTO chat_interface_sessions (
                interface_id, session_token, browser_fingerprint,
                ip_address, user_agent, referrer, persistence_token
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                interfaceId,
                sessionToken,
                input.browserFingerprint || null,
                metadata.ipAddress || null,
                metadata.userAgent || null,
                input.referrer || null,
                persistenceToken
            ]
        );
        return this.mapToSession(result.rows[0]);
    }

    async findBySessionToken(
        interfaceId: string,
        sessionToken: string
    ): Promise<ChatInterfaceSession | null> {
        const result = await pool.query(
            `SELECT * FROM chat_interface_sessions
             WHERE interface_id = $1 AND session_token = $2`,
            [interfaceId, sessionToken]
        );
        return result.rows[0] ? this.mapToSession(result.rows[0]) : null;
    }

    async findByPersistenceToken(
        interfaceId: string,
        persistenceToken: string
    ): Promise<ChatInterfaceSession | null> {
        const result = await pool.query(
            `SELECT * FROM chat_interface_sessions
             WHERE interface_id = $1 AND persistence_token = $2 AND status = 'active'
             ORDER BY last_activity_at DESC
             LIMIT 1`,
            [interfaceId, persistenceToken]
        );
        return result.rows[0] ? this.mapToSession(result.rows[0]) : null;
    }

    async updateThreadId(sessionId: string, threadId: string): Promise<void> {
        await pool.query(
            `UPDATE chat_interface_sessions
             SET thread_id = $2, last_activity_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [sessionId, threadId]
        );
    }

    async incrementMessageCount(sessionId: string): Promise<void> {
        await pool.query(
            `UPDATE chat_interface_sessions
             SET message_count = message_count + 1, last_activity_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [sessionId]
        );
    }

    async findByInterfaceId(
        interfaceId: string,
        options: { limit?: number; offset?: number; status?: string } = {}
    ): Promise<{ sessions: ChatInterfaceSession[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let whereClause = "interface_id = $1";
        const params: unknown[] = [interfaceId];

        if (options.status) {
            whereClause += " AND status = $2";
            params.push(options.status);
        }

        const countQuery = `SELECT COUNT(*) as count FROM chat_interface_sessions WHERE ${whereClause}`;
        const dataQuery = `
            SELECT * FROM chat_interface_sessions
            WHERE ${whereClause}
            ORDER BY last_activity_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(dataQuery, [...params, limit, offset])
        ]);

        return {
            sessions: dataResult.rows.map(this.mapToSession),
            total: parseInt(countResult.rows[0].count)
        };
    }

    private generateSessionToken(): string {
        return `sess_${crypto.randomBytes(24).toString("hex")}`;
    }

    private generatePersistenceToken(): string {
        return `pers_${crypto.randomBytes(32).toString("hex")}`;
    }

    private mapToSession(row: Record<string, unknown>): ChatInterfaceSession {
        return {
            id: row.id as string,
            interfaceId: row.interface_id as string,
            sessionToken: row.session_token as string,
            browserFingerprint: row.browser_fingerprint as string | null,
            threadId: row.thread_id as string | null,
            ipAddress: row.ip_address as string | null,
            userAgent: row.user_agent as string | null,
            referrer: row.referrer as string | null,
            countryCode: row.country_code as string | null,
            status: row.status as ChatInterfaceSession["status"],
            messageCount: row.message_count as number,
            persistenceToken: row.persistence_token as string | null,
            firstSeenAt: new Date(row.first_seen_at as string),
            lastActivityAt: new Date(row.last_activity_at as string),
            endedAt: row.ended_at ? new Date(row.ended_at as string) : null
        };
    }
}
```

### API Routes

```
# Authenticated Routes (Admin)
POST   /api/chat-interfaces                     # Create chat interface
GET    /api/chat-interfaces                     # List user's chat interfaces
GET    /api/chat-interfaces/:id                 # Get chat interface details
PUT    /api/chat-interfaces/:id                 # Update chat interface
DELETE /api/chat-interfaces/:id                 # Delete chat interface
POST   /api/chat-interfaces/:id/publish         # Publish chat interface
POST   /api/chat-interfaces/:id/unpublish       # Unpublish chat interface
POST   /api/chat-interfaces/:id/duplicate       # Duplicate chat interface
POST   /api/chat-interfaces/:id/assets          # Upload cover/icon
GET    /api/chat-interfaces/:id/sessions        # List sessions
GET    /api/chat-interfaces/:id/sessions/:sessionId           # Get session details
GET    /api/chat-interfaces/:id/sessions/:sessionId/messages  # Get session messages
GET    /api/chat-interfaces/:id/analytics       # Get analytics

# Lookup by Agent (for agent builder)
GET    /api/chat-interfaces?agentId=x           # Get chat interfaces linked to agent

# Public Routes (No Auth, Rate Limited)
GET    /api/public/chat-interfaces/:slug                       # Get interface config
POST   /api/public/chat-interfaces/:slug/sessions              # Create/resume session
GET    /api/public/chat-interfaces/:slug/sessions/:token/messages  # Get message history
POST   /api/public/chat-interfaces/:slug/messages              # Send message
GET    /api/public/chat-interfaces/:slug/stream/:sessionToken  # SSE streaming

# Embed Routes
GET    /widget/:slug                            # Widget JavaScript bundle
GET    /embed/:slug                             # Iframe embed page
GET    /c/:slug                                 # Full-page chat interface
```

### Rate Limiting Middleware

```typescript
// backend/src/api/middleware/chatInterfaceRateLimiter.ts
import type { FastifyRequest, FastifyReply } from "fastify";

const sessionLimits = new Map<string, { count: number; resetAt: number }>();

export function createChatInterfaceRateLimiter(defaultLimit: number = 10) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const sessionToken = request.headers["x-session-token"] as string;
        if (!sessionToken) {
            reply.status(401).send({
                success: false,
                error: "Session token required"
            });
            return;
        }

        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute

        const entry = sessionLimits.get(sessionToken);

        if (entry && entry.resetAt > now) {
            if (entry.count >= defaultLimit) {
                reply.status(429).send({
                    success: false,
                    error: "Too many messages. Please wait a moment."
                });
                return;
            }
            entry.count++;
        } else {
            sessionLimits.set(sessionToken, { count: 1, resetAt: now + windowMs });
        }
    };
}
```

---

## 1.4 Frontend Implementation

### Entry Points

Users can create Chat Interfaces from two locations:

#### 1. Chat Interfaces List Page (Primary)

```
/chat-interfaces → [+ Create Chat Interface] → Agent Selection Dialog → /chat-interfaces/new?agentId=x
```

Since a chat interface must link to an agent, clicking "Create Chat Interface" opens an **Agent Selection Dialog** first:

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Chat Interface                                      [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select an agent to power this chat interface                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🤖 Customer Support Bot                                │    │
│  │     Handles customer inquiries and support tickets      │    │
│  │     Last updated: 2 days ago                            │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  🤖 Sales Assistant                                     │    │
│  │     Helps qualify leads and answer product questions    │    │
│  │     Last updated: 1 week ago                            │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  🤖 Research Helper                                     │    │
│  │     Assists with research and information gathering     │    │
│  │     Last updated: 3 days ago                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                                    [Cancel]  [Continue →]       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Agent Builder

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent: Customer Support Bot                       [Save] [Test]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  System Prompt: You are a helpful customer support agent...     │
│                                                                 │
│  Tools: [Knowledge Base] [Create Ticket] [Send Email]           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Chat Interfaces                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  No chat interfaces linked to this agent                 │   │
│  │  [+ Create Chat Interface]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Pages

| Route                            | Component                       | Description                     |
| -------------------------------- | ------------------------------- | ------------------------------- |
| `/chat-interfaces`               | `ChatInterfacesPage.tsx`        | List of user's chat interfaces  |
| `/chat-interfaces/new`           | `ChatInterfaceEditorPage.tsx`   | Create new chat interface       |
| `/chat-interfaces/new?agentId=x` | `ChatInterfaceEditorPage.tsx`   | Create with agent pre-linked    |
| `/chat-interfaces/:id/edit`      | `ChatInterfaceEditorPage.tsx`   | Edit existing chat interface    |
| `/chat-interfaces/:id/sessions`  | `ChatInterfaceSessionsPage.tsx` | View sessions & conversations   |
| `/c/:slug`                       | `PublicChatPage.tsx`            | Public chat interface (no auth) |
| `/embed/:slug`                   | `EmbedChatPage.tsx`             | Iframe embed (no auth)          |

### Component Tree

```
frontend/src/
├── pages/
│   ├── ChatInterfacesPage.tsx              # List all chat interfaces
│   ├── ChatInterfaceEditorPage.tsx         # Create/edit chat interface
│   ├── ChatInterfaceSessionsPage.tsx       # View sessions & conversations
│   └── PublicChatPage.tsx                  # Public full-page chat (/c/:slug)
│
├── components/chat-interface-builder/
│   ├── AgentSelectionDialog.tsx            # Agent selection (shown on create)
│   ├── ChatInterfaceEditorLayout.tsx       # Main editor layout
│   ├── ChatInterfacePreview.tsx            # Live preview panel
│   │
│   ├── BrandingEditor.tsx                  # Cover, icon, colors, fonts
│   │   ├── CoverEditor.tsx                 # Cover photo/color/gradient
│   │   ├── IconUploader.tsx                # Profile icon upload
│   │   ├── ColorPicker.tsx                 # Theme color picker
│   │   └── FontSelector.tsx                # Font family selector
│   │
│   ├── ChatConfigEditor.tsx                # Welcome message, placeholder
│   ├── SuggestedPromptsEditor.tsx          # Suggested prompts list
│   ├── FileUploadConfigEditor.tsx          # File upload settings
│   ├── SessionConfigEditor.tsx             # Persistence, timeout
│   ├── WidgetConfigEditor.tsx              # Widget position, icon, state
│   └── RateLimitingEditor.tsx              # Rate limiting settings
│
├── components/public-chat/
│   ├── ChatContainer.tsx                   # Main chat container
│   ├── ChatHeader.tsx                      # Cover + icon + title
│   ├── MessageList.tsx                     # Scrolling message list
│   │   ├── UserMessage.tsx                 # User message bubble
│   │   ├── AssistantMessage.tsx            # Assistant message with streaming
│   │   └── TypingIndicator.tsx             # "Agent is typing..."
│   ├── SuggestedPrompts.tsx                # Clickable prompt buttons
│   ├── MessageInput.tsx                    # Input textarea
│   │   ├── FileUploadButton.tsx            # File attachment trigger
│   │   └── SendButton.tsx                  # Send message button
│   └── WelcomeScreen.tsx                   # Initial state with welcome message
│
├── components/chat-widget/
│   ├── WidgetBubble.tsx                    # Floating chat bubble
│   ├── WidgetPanel.tsx                     # Expanded chat panel
│   └── WidgetContainer.tsx                 # Widget wrapper
│
├── components/chat-admin/
│   ├── SessionsList.tsx                    # Admin sessions list
│   ├── SessionDetail.tsx                   # Single session view
│   ├── ConversationViewer.tsx              # Read-only conversation
│   └── AnalyticsDashboard.tsx              # Chat analytics
│
└── stores/
    ├── chatInterfaceBuilderStore.ts        # Builder state
    └── publicChatStore.ts                  # Public chat session state
```

### Zustand Store

```typescript
// frontend/src/stores/chatInterfaceBuilderStore.ts
import { create } from "zustand";
import type { ChatInterface, UpdateChatInterfaceInput } from "@flowmaestro/shared";

interface ChatInterfaceBuilderStore {
    // State
    interface: ChatInterface | null;
    isDirty: boolean;
    isSaving: boolean;
    isPublishing: boolean;
    activeTab: "branding" | "chat" | "widget" | "session" | "settings";

    // Actions
    setInterface: (iface: ChatInterface) => void;
    updateInterface: (updates: UpdateChatInterfaceInput) => void;
    setActiveTab: (tab: ChatInterfaceBuilderStore["activeTab"]) => void;
    save: () => Promise<void>;
    publish: () => Promise<void>;
    unpublish: () => Promise<void>;
    reset: () => void;
}

export const useChatInterfaceBuilderStore = create<ChatInterfaceBuilderStore>((set, get) => ({
    interface: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    activeTab: "branding",

    setInterface: (iface) => set({ interface: iface, isDirty: false }),

    updateInterface: (updates) => {
        const { interface: current } = get();
        if (!current) return;

        set({
            interface: { ...current, ...updates },
            isDirty: true
        });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    save: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        set({ isSaving: true });
        try {
            await api.updateChatInterface(iface.id, {
                name: iface.name,
                slug: iface.slug,
                title: iface.title,
                description: iface.description,
                coverType: iface.coverType,
                coverValue: iface.coverValue,
                iconUrl: iface.iconUrl,
                primaryColor: iface.primaryColor,
                fontFamily: iface.fontFamily,
                borderRadius: iface.borderRadius,
                welcomeMessage: iface.welcomeMessage,
                placeholderText: iface.placeholderText,
                suggestedPrompts: iface.suggestedPrompts,
                allowFileUpload: iface.allowFileUpload,
                maxFiles: iface.maxFiles,
                persistenceType: iface.persistenceType,
                sessionTimeoutMinutes: iface.sessionTimeoutMinutes,
                widgetPosition: iface.widgetPosition,
                widgetButtonIcon: iface.widgetButtonIcon,
                widgetButtonText: iface.widgetButtonText,
                widgetInitialState: iface.widgetInitialState,
                rateLimitMessages: iface.rateLimitMessages
            });
            set({ isDirty: false });
        } finally {
            set({ isSaving: false });
        }
    },

    publish: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        set({ isPublishing: true });
        try {
            const updated = await api.publishChatInterface(iface.id);
            set({ interface: updated, isDirty: false });
        } finally {
            set({ isPublishing: false });
        }
    },

    unpublish: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        const updated = await api.unpublishChatInterface(iface.id);
        set({ interface: updated });
    },

    reset: () =>
        set({
            interface: null,
            isDirty: false,
            isSaving: false,
            isPublishing: false,
            activeTab: "branding"
        })
}));
```

---

## 1.5 Phase 1 Deliverables

- [ ] Database migrations for chat_interfaces and chat_interface_sessions
- [ ] Shared TypeScript types
- [ ] ChatInterfaceRepository and ChatInterfaceSessionRepository
- [ ] Authenticated CRUD routes for chat interfaces
- [ ] Agent selection dialog (mandatory before creating)
- [ ] Full branding editor (cover, icon, colors, fonts)
- [ ] Chat configuration editor (welcome message, prompts)
- [ ] Widget configuration editor
- [ ] Session configuration editor
- [ ] Live preview in builder
- [ ] Publish/unpublish functionality
- [ ] Public routes for getting interface config
- [ ] Public session creation endpoint
- [ ] Widget JavaScript SDK (loads config, creates bubble, displays messages)
- [ ] Iframe embed page
- [ ] Full-page chat page (/c/:slug)
- [ ] Preview page with all 3 embed types (/chat-interfaces/:id/preview)
- [ ] Embed code display with copy functionality
- [ ] Message display (stored but not processed)
- [ ] Rate limiting on public endpoints
- [ ] Admin sessions list view

---

# Phase 2: Agent Execution & Streaming

Connect chat interfaces to agent execution with real-time token streaming.

---

## 2.1 Backend Services

### ChatInterfaceExecutionService

```typescript
// backend/src/services/ChatInterfaceExecutionService.ts
import type { ChatInterface, ChatInterfaceSession, ChatMessage } from "@flowmaestro/shared";

export class ChatInterfaceExecutionService {
    constructor(
        private threadRepo: ThreadRepository,
        private agentService: AgentService,
        private sessionRepo: ChatInterfaceSessionRepository
    ) {}

    async sendMessage(
        chatInterface: ChatInterface,
        session: ChatInterfaceSession,
        message: string,
        attachments?: File[]
    ): Promise<{ executionId: string; threadId: string }> {
        // Get or create thread for this session
        let threadId = session.threadId;

        if (!threadId) {
            const thread = await this.threadRepo.create({
                agentId: chatInterface.agentId,
                userId: chatInterface.userId, // Owner's userId for agent access
                title: `${chatInterface.title} - ${new Date().toLocaleDateString()}`,
                metadata: {
                    chatInterfaceId: chatInterface.id,
                    sessionId: session.id
                }
            });
            threadId = thread.id;
            await this.sessionRepo.updateThreadId(session.id, threadId);
        }

        // Build message with attachments
        const contextMessage = this.buildContextMessage(message, attachments);

        // Start agent execution
        const execution = await this.agentService.executeAgent({
            agentId: chatInterface.agentId,
            threadId,
            message: contextMessage,
            userId: chatInterface.userId
        });

        // Increment session message count
        await this.sessionRepo.incrementMessageCount(session.id);

        return {
            executionId: execution.id,
            threadId
        };
    }

    private buildContextMessage(message: string, attachments?: File[]): string {
        if (!attachments || attachments.length === 0) {
            return message;
        }

        let contextMessage = message;
        contextMessage += "\n\n**Attached Files:**\n";
        attachments.forEach((file) => {
            contextMessage += `- ${file.name} (${file.type})\n`;
        });

        return contextMessage;
    }
}
```

### SSE Streaming Endpoint

```typescript
// backend/src/api/routes/public/chat-stream.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { RedisEventBus } from "../../../services/events/RedisEventBus";

export async function chatStreamHandler(
    request: FastifyRequest<{ Params: { slug: string; sessionToken: string } }>,
    reply: FastifyReply
) {
    const { slug, sessionToken } = request.params;

    // Verify session
    const chatInterface = await chatInterfaceRepo.findBySlugPublic(slug);
    if (!chatInterface) {
        reply.status(404).send({ error: "Chat interface not found" });
        return;
    }

    const session = await sessionRepo.findBySessionToken(chatInterface.id, sessionToken);
    if (!session || !session.threadId) {
        reply.status(404).send({ error: "Session not found" });
        return;
    }

    // Set up SSE
    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
    });

    // Subscribe to thread events
    const channel = `thread:${session.threadId}`;
    const eventBus = new RedisEventBus();

    const unsubscribe = await eventBus.subscribe(channel, (event) => {
        const sseEvent = mapToSSEEvent(event);
        reply.raw.write(`data: ${JSON.stringify(sseEvent)}\n\n`);
    });

    // Clean up on disconnect
    request.raw.on("close", () => {
        unsubscribe();
    });
}
```

---

## 2.2 Data Flow Diagram

```
User opens chat interface (/c/:slug or widget)
         │
         ▼
GET /api/public/chat-interfaces/:slug
         │
         ├─► Load interface config
         ├─► Check for persistence token (localStorage)
         │
         ▼
POST /api/public/chat-interfaces/:slug/sessions
         │
         ├─► Create or resume session
         ├─► Return sessionToken, threadId, existingMessages
         │
         ▼
User types message → [Send]
         │
         ▼
POST /api/public/chat-interfaces/:slug/messages
         │
         ├─► Validate rate limit
         ├─► Store user message
         ├─► Return messageId
         │
         ▼
ChatInterfaceExecutionService.sendMessage()
         │
         ├─► Get or create thread
         ├─► Build context message
         ├─► Start agentOrchestratorWorkflow
         │
         ▼
Temporal Workflow Executes
         │
         ├─► LLM streaming via RedisEventBus
         │
         ▼
GET /api/public/chat-interfaces/:slug/stream/:sessionToken
         │
         ├─► Subscribe to Redis channel for thread
         ├─► Forward events as SSE
         │
         ▼
Client receives token events
         │
         ├─► Update UI with streaming message
         │
         ▼
Workflow completes
         │
         ├─► Final message saved to agent_messages
         ├─► Stream complete event
         │
         ▼
Client displays final message
User can send another message...
```

---

## 2.3 Phase 2 Deliverables

- [ ] ChatInterfaceExecutionService to trigger agent
- [ ] Thread creation linked to sessions
- [ ] Integration with agentOrchestratorWorkflow
- [ ] SSE streaming endpoint
- [ ] Token-by-token streaming in widget/embed/page
- [ ] File upload handling and context building
- [ ] Message persistence to agent_messages
- [ ] Conversation history loading
- [ ] Session timeout handling
- [ ] Admin conversation viewer
- [ ] Analytics dashboard

---

## Security Considerations

### Rate Limiting

- Default: 10 messages per minute per session
- Configurable per chat interface
- Uses session token for tracking
- Redis-backed sliding window

### Session Security

- Session tokens are cryptographically random
- Persistence tokens separate from session tokens
- Session expiration configurable
- IP and user agent logged for abuse detection

### File Upload Security

- Configurable MIME type whitelist
- Max file size enforcement (default 10MB)
- Max file count enforcement (default 3)
- Files scanned for malware (future)
- Signed URLs for file access

### CORS & Embedding

- Widget allows cross-origin requests
- CSP headers for iframe embed
- Origin validation for sensitive operations

### Slug Validation

```typescript
const RESERVED_SLUGS = [
    "api",
    "admin",
    "widget",
    "embed",
    "c",
    "chat",
    "login",
    "logout",
    "signup",
    "settings",
    "dashboard"
];

function validateSlug(slug: string): boolean {
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) return false;
    return /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/.test(slug);
}
```

---

## Key Files to Create

### Backend

```
backend/migrations/XXXXXX_create-chat-interfaces.sql
backend/src/storage/models/ChatInterface.ts
backend/src/storage/repositories/ChatInterfaceRepository.ts
backend/src/storage/repositories/ChatInterfaceSessionRepository.ts
backend/src/api/routes/chat-interfaces/index.ts
backend/src/api/routes/chat-interfaces/create.ts
backend/src/api/routes/chat-interfaces/list.ts
backend/src/api/routes/chat-interfaces/get.ts
backend/src/api/routes/chat-interfaces/update.ts
backend/src/api/routes/chat-interfaces/delete.ts
backend/src/api/routes/chat-interfaces/publish.ts
backend/src/api/routes/chat-interfaces/sessions.ts
backend/src/api/routes/chat-interfaces/analytics.ts
backend/src/api/routes/public/chat-interfaces.ts
backend/src/api/routes/public/chat-sessions.ts
backend/src/api/routes/public/chat-messages.ts
backend/src/api/routes/public/chat-stream.ts
backend/src/api/middleware/chatInterfaceRateLimiter.ts
backend/src/services/ChatInterfaceExecutionService.ts
```

### Shared

```
shared/src/types/chat-interface.ts
```

### Frontend

```
frontend/src/pages/ChatInterfacesPage.tsx
frontend/src/pages/ChatInterfaceEditorPage.tsx
frontend/src/pages/ChatInterfacePreviewPage.tsx      # Preview all embed types
frontend/src/pages/ChatInterfaceSessionsPage.tsx
frontend/src/pages/PublicChatPage.tsx
frontend/src/stores/chatInterfaceBuilderStore.ts
frontend/src/stores/publicChatStore.ts
frontend/src/components/chat-interface-builder/*.tsx
frontend/src/components/chat-interface-preview/       # Preview components
    PreviewFullPage.tsx
    PreviewIframe.tsx
    PreviewWidget.tsx
    EmbedCodeDisplay.tsx
frontend/src/components/public-chat/*.tsx
frontend/src/components/chat-widget/*.tsx
frontend/src/components/chat-admin/*.tsx
frontend/src/lib/chatInterfaceApi.ts
frontend/public/widget-sdk.ts  (bundled separately)
```

---

## Reference Files

| Pattern                 | Reference File                                              |
| ----------------------- | ----------------------------------------------------------- |
| Repository pattern      | `backend/src/storage/repositories/ThreadRepository.ts`      |
| Agent execution         | `backend/src/api/routes/agents/execute.ts`                  |
| SSE streaming           | `backend/src/api/routes/agents/stream.ts`                   |
| Redis event bus         | `backend/src/services/events/RedisEventBus.ts`              |
| Public routes (no auth) | `backend/src/api/routes/triggers/webhook.ts`                |
| Zustand store pattern   | `frontend/src/stores/agentStore.ts`                         |
| Form interfaces spec    | `.docs/specs/form-interfaces.md`                            |
| Thread schema           | `backend/migrations/1730000000014_create-threads-table.sql` |
| Agent orchestrator      | `backend/src/temporal/workflows/agent-orchestrator.ts`      |
| Streaming events        | `shared/src/streaming-events.ts`                            |
