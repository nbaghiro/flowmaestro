---
sidebar_position: 2
title: Chat Interfaces
---

# Chat Interfaces

Chat interfaces turn your AI agents into embeddable chat widgets. Users can have natural conversations with your agents on any website.

<!-- Screenshot: Chat interface widget on a website -->

## Creating a Chat Interface

1. Navigate to **Interfaces** > **Chat Interfaces**
2. Click **New Chat Interface**
3. Enter a name and URL slug (e.g., `support-bot`)
4. Select the agent to power the chat
5. Configure branding and behavior
6. Publish and get your embed code

## Configuration

### Basic Settings

| Field      | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| **Name**   | Internal name for the interface                                             |
| **Slug**   | URL identifier (e.g., `my-chat` becomes `app.flowmaestro.com/chat/my-chat`) |
| **Agent**  | The AI agent that powers this chat                                          |
| **Status** | Published or draft                                                          |

### Branding

#### Cover

Choose how the header area appears:

```typescript
// Image cover
coverType: "image";
coverValue: "https://example.com/header.jpg";

// Solid color
coverType: "color";
coverValue: "#1a1a2e";

// Gradient
coverType: "gradient";
coverValue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
```

#### Icon

Upload a custom avatar or logo that appears in the chat header and widget button.

#### Theme

| Option            | Description                              |
| ----------------- | ---------------------------------------- |
| **Primary Color** | Accent color for buttons and links (hex) |
| **Font Family**   | Custom font for the interface            |
| **Border Radius** | Rounded corners in pixels                |

### Chat Configuration

#### Welcome Message

The initial message shown before the conversation starts:

```
Welcome to Acme Support! I'm here to help you with:
- Product questions
- Order tracking
- Returns and refunds

How can I assist you today?
```

#### Placeholder Text

Text shown in the input field:

```
Type your message...
```

#### Suggested Prompts

Pre-defined prompts shown as clickable buttons:

```json
[
    { "text": "Track my order", "emoji": "package" },
    { "text": "Return policy", "emoji": "refresh" },
    { "text": "Contact support", "emoji": "headphones" }
]
```

<!-- Screenshot: Suggested prompts in chat interface -->

### File Attachments

Enable users to upload files in their messages:

| Setting               | Default | Description            |
| --------------------- | ------- | ---------------------- |
| **Allow File Upload** | false   | Enable/disable uploads |
| **Max Files**         | 3       | Files per message      |
| **Max File Size**     | 10 MB   | Size limit per file    |
| **Allowed Types**     | All     | MIME type whitelist    |

Example configuration:

```typescript
{
  allowFileUpload: true,
  maxFiles: 5,
  maxFileSizeMb: 25,
  allowedFileTypes: [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "text/plain"
  ]
}
```

### Widget Settings

Configure the floating widget button:

| Setting           | Options                       | Description               |
| ----------------- | ----------------------------- | ------------------------- |
| **Position**      | `bottom-right`, `bottom-left` | Widget placement          |
| **Button Icon**   | Emoji or custom               | Icon on the widget button |
| **Button Text**   | Optional                      | Label next to the icon    |
| **Initial State** | `collapsed`, `expanded`       | Starting state            |

### Session Management

#### Persistence Type

| Type            | Behavior                              |
| --------------- | ------------------------------------- |
| `session`       | New session on each page visit        |
| `local_storage` | Persists across visits (same browser) |

#### Session Timeout

Configure how long sessions remain active:

```typescript
sessionTimeoutMinutes: 60; // Sessions expire after 1 hour of inactivity
```

#### Session Data

FlowMaestro automatically captures:

- Browser fingerprint
- IP address
- User agent
- Referrer URL
- Country code (from IP)

### Rate Limiting

Protect against abuse:

```typescript
{
  rateLimitMessages: 10,      // Max messages
  rateLimitWindowSeconds: 60  // Per minute
}
```

## Embedding

### Script Tag (Recommended)

Add this snippet to your website:

```html
<script src="https://app.flowmaestro.com/widget/your-slug.js" async></script>
```

The widget automatically initializes and appears in the configured position.

### JavaScript API

Control the widget programmatically:

```javascript
// Open the chat
FlowMaestroWidget.open();

// Close the chat
FlowMaestroWidget.close();

// Toggle visibility
FlowMaestroWidget.toggle();

// Remove the widget
FlowMaestroWidget.destroy();
```

### Custom Initialization

For more control, disable auto-init and initialize manually:

```html
<script src="https://app.flowmaestro.com/widget/your-slug.js" data-auto-init="false" async></script>

<script>
    // Initialize when ready
    FlowMaestroWidget.init({
        position: "bottom-left",
        initialState: "expanded"
    });
</script>
```

## Real-Time Streaming

Chat interfaces use Server-Sent Events (SSE) for real-time streaming:

```
GET /api/public/chat-interfaces/{slug}/stream/{sessionToken}
```

The stream delivers:

- Token-by-token responses
- Tool execution updates
- Completion signals

## Vector Search

Chat interfaces support semantic search over uploaded attachments:

```bash
POST /api/public/chat-interfaces/{slug}/query

{
  "sessionToken": "abc123",
  "query": "What does the contract say about termination?",
  "topK": 5
}
```

This enables RAG (Retrieval-Augmented Generation) for document Q&A.

## Best Practices

### System Prompt

Configure your agent's system prompt for chat:

```
You are a helpful customer support agent for [Company Name].

Guidelines:
- Be friendly and professional
- Answer questions using the provided knowledge base
- If you don't know something, say so
- For complex issues, offer to connect with a human

Available tools:
- Search knowledge base for product information
- Look up order status
- Create support tickets
```

### Suggested Prompts

Choose prompts that:

- Cover common questions
- Are action-oriented
- Help users get started quickly

### Welcome Message

Your welcome message should:

- Introduce the bot's capabilities
- Set expectations for response types
- Provide quick starting points

## API Reference

### Create Session

```bash
POST /api/public/chat-interfaces/{slug}/sessions

Response:
{
  "sessionToken": "abc123",
  "threadId": "thread_xyz"
}
```

### Send Message

```bash
POST /api/public/chat-interfaces/{slug}/messages

{
  "sessionToken": "abc123",
  "message": "What's your return policy?",
  "attachments": []
}
```

### Get History

```bash
GET /api/public/chat-interfaces/{slug}/sessions/{token}/messages
```

See the [API Reference](/api/introduction) for complete documentation.
