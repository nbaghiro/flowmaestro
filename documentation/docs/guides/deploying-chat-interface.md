---
sidebar_position: 5
title: Deploying a Chat Interface
---

# Deploying a Chat Interface

Publish your agent as an embeddable chat widget for your website.

## What We're Building

A fully branded chat widget that:

- Connects to your AI agent
- Embeds on any website
- Maintains conversation history
- Matches your brand styling

## Prerequisites

- An existing agent (see [Your First Agent](./first-agent))
- A website where you can add JavaScript

## Step 1: Create the Interface

1. Navigate to **Interfaces** in the sidebar
2. Click **New Interface**
3. Select **Chat Interface**
4. Configure:
    - Name: "Website Support Chat"
    - Target: Select your agent

## Step 2: Configure Branding

Customize the appearance:

```typescript
{
  name: "Support Chat",
  branding: {
    primaryColor: "#4F46E5",      // Button and header color
    backgroundColor: "#FFFFFF",   // Chat background
    fontFamily: "Inter",          // Custom font
    borderRadius: "12px",         // Rounded corners
    iconUrl: "https://..."        // Your logo
  }
}
```

<!-- Screenshot: Branding configuration panel -->

## Step 3: Set Welcome Message

Create a compelling first impression:

```typescript
{
  welcomeMessage: "Hi! I'm here to help you with any questions.",
  suggestedPrompts: [
    "What are your business hours?",
    "How do I track my order?",
    "I need help with returns"
  ]
}
```

## Step 4: Configure Session Settings

Control conversation behavior:

| Setting         | Value      | Description                    |
| --------------- | ---------- | ------------------------------ |
| Session Timeout | 30 minutes | How long until session expires |
| Message Limit   | 100        | Max messages per session       |
| Rate Limit      | 20/minute  | Prevent spam                   |

## Step 5: Choose Embedding Method

### Option A: Script Tag (Recommended)

Add this snippet before `</body>`:

```html
<script
    src="https://cdn.flowmaestro.com/widget.js"
    data-interface-id="ci_abc123"
    data-position="bottom-right"
    async
></script>
```

### Option B: React Component

```tsx
import { ChatWidget } from "@flowmaestro/react";

function App() {
    return (
        <ChatWidget
            interfaceId="ci_abc123"
            position="bottom-right"
            onMessage={(msg) => console.log(msg)}
        />
    );
}
```

### Option C: Iframe

```html
<iframe
    src="https://chat.flowmaestro.com/ci_abc123"
    width="400"
    height="600"
    frameborder="0"
></iframe>
```

## Step 6: Publish

1. Click **Publish** in the interface editor
2. Copy the embed code
3. Add to your website
4. Test the widget

<!-- Screenshot: Published chat widget on sample website -->

## Step 7: Test Live

Visit your website and verify:

- [ ] Widget appears in correct position
- [ ] Branding matches your site
- [ ] Agent responds appropriately
- [ ] Conversations persist on refresh

## Customization Options

### Widget Position

```javascript
data-position="bottom-right"  // Default
data-position="bottom-left"
data-position="top-right"
data-position="top-left"
```

### Auto-Open

```javascript
data-auto-open="true"
data-open-delay="5000"  // 5 seconds
```

### Custom Trigger

Hide the default button and trigger programmatically:

```javascript
data-hide-button="true"
```

```javascript
// In your code
window.FlowMaestroChat.open();
window.FlowMaestroChat.close();
window.FlowMaestroChat.toggle();
```

## Monitoring

After deployment, monitor usage in the dashboard:

- Active sessions
- Message volume
- Response times
- User satisfaction ratings

## Troubleshooting

| Issue                 | Solution                                        |
| --------------------- | ----------------------------------------------- |
| Widget doesn't appear | Check interface is published, verify embed code |
| Styling looks wrong   | Clear browser cache, check CSS conflicts        |
| Agent not responding  | Verify agent is active, check API quota         |
| CORS errors           | Add your domain to allowed origins              |

## Next Steps

- [Customize appearance](../interfaces/customization) — Advanced branding options
- [Add knowledge bases](./building-rag-agent) — Ground responses in your docs
- [Chat interfaces](../interfaces/chat-interfaces) — Full configuration reference
