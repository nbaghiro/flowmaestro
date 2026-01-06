---
sidebar_position: 3
title: Widget SDK
---

# Widget SDK

Embed FlowMaestro chat interfaces into your website or application.

## Installation

```bash
npm install @flowmaestro/widget
```

Or include via CDN:

```html
<script src="https://cdn.flowmaestro.io/widget/v1/widget.min.js"></script>
```

## Quick Start

### JavaScript

```typescript
import { FlowMaestroWidget } from "@flowmaestro/widget";

const widget = new FlowMaestroWidget({
    slug: "my-chat-interface",
    baseUrl: "https://flowmaestro.io"
});

// Initialize and render
await widget.init();
```

### Script Tag (No Build Required)

Add your chat interface with a single script tag:

```html
<script src="https://flowmaestro.io/widget/my-chat-slug.js" async></script>
```

This automatically renders the chat widget on your page.

## React Integration

```tsx
import { useFlowMaestroWidget } from "@flowmaestro/widget/react";

function ChatInterface() {
    const { containerRef, isReady, error } = useFlowMaestroWidget({
        slug: "my-chat-interface",
        baseUrl: "https://flowmaestro.io"
    });

    if (error) {
        return <div>Error loading chat: {error.message}</div>;
    }

    return (
        <div>
            {!isReady && <div>Loading...</div>}
            <div ref={containerRef} style={{ height: "500px" }} />
        </div>
    );
}
```

## Configuration Options

```typescript
const widget = new FlowMaestroWidget({
    // Required: Your chat interface slug
    slug: "my-chat-interface",

    // Required: FlowMaestro base URL
    baseUrl: "https://flowmaestro.io",

    // Optional: Container element (default: document.body)
    container: document.getElementById("chat-container"),

    // Optional: Widget position for floating widget
    position: "bottom-right", // "bottom-left" | "bottom-right"

    // Optional: Initial open state
    initiallyOpen: false,

    // Optional: Custom theme
    theme: {
        primaryColor: "#007bff",
        backgroundColor: "#ffffff",
        textColor: "#333333"
    },

    // Optional: Custom greeting message
    greeting: "Hi! How can I help you today?",

    // Optional: Placeholder text
    placeholder: "Type your message...",

    // Optional: Event callbacks
    onOpen: () => console.log("Widget opened"),
    onClose: () => console.log("Widget closed"),
    onMessage: (message) => console.log("New message:", message)
});
```

## API Methods

### Open/Close Widget

```typescript
// Open the chat widget
widget.open();

// Close the chat widget
widget.close();

// Toggle open/close
widget.toggle();
```

### Send Messages Programmatically

```typescript
// Send a message on behalf of the user
widget.sendMessage("I need help with my order");
```

### Clear Conversation

```typescript
// Start a new conversation
widget.clearConversation();
```

### Destroy Widget

```typescript
// Remove the widget from the page
widget.destroy();
```

## Styling

### CSS Variables

Customize the widget appearance with CSS variables:

```css
:root {
    --fm-widget-primary: #007bff;
    --fm-widget-background: #ffffff;
    --fm-widget-text: #333333;
    --fm-widget-border-radius: 12px;
    --fm-widget-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Custom CSS Classes

```css
/* Widget container */
.fm-widget-container {
    /* your styles */
}

/* Chat messages */
.fm-widget-message {
    /* your styles */
}

/* User messages */
.fm-widget-message-user {
    /* your styles */
}

/* Assistant messages */
.fm-widget-message-assistant {
    /* your styles */
}

/* Input field */
.fm-widget-input {
    /* your styles */
}
```

## Events

```typescript
widget.on("open", () => {
    console.log("Widget opened");
});

widget.on("close", () => {
    console.log("Widget closed");
});

widget.on("message", (message) => {
    console.log("Message:", message.role, message.content);
});

widget.on("error", (error) => {
    console.error("Widget error:", error);
});
```

## Security

The widget automatically handles authentication using your published chat interface settings. No API keys are exposed in the browser.

:::tip
Create chat interfaces in the FlowMaestro dashboard under **Agents > Chat Interfaces**. Each interface has its own slug and can be customized with branding, allowed domains, and access controls.
:::
