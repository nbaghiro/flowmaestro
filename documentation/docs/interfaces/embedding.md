---
sidebar_position: 4
title: Embedding Interfaces
---

# Embedding Interfaces

Deploy your chat and form interfaces anywhere with multiple embedding options.

## Chat Interface Embedding

### Script Tag (Recommended)

The simplest way to add a chat widget to your website:

```html
<script
  src="https://app.flowmaestro.com/widget/{your-slug}.js"
  async
></script>
```

The widget automatically:
- Loads configuration from your interface settings
- Appears as a floating button
- Handles sessions and persistence
- Streams responses in real-time

### Configuration Attributes

Customize behavior with data attributes:

```html
<script
  src="https://app.flowmaestro.com/widget/{your-slug}.js"
  data-auto-init="true"
  data-position="bottom-right"
  data-initial-state="collapsed"
  async
></script>
```

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-auto-init` | `true`, `false` | Auto-initialize on load |
| `data-position` | `bottom-right`, `bottom-left` | Widget position |
| `data-initial-state` | `collapsed`, `expanded` | Starting state |

### JavaScript API

Control the widget programmatically:

```javascript
// Wait for widget to load
window.addEventListener('flowmaestro:ready', () => {
  // Open chat
  FlowMaestroWidget.open();

  // Close chat
  FlowMaestroWidget.close();

  // Toggle visibility
  FlowMaestroWidget.toggle();

  // Check if open
  const isOpen = FlowMaestroWidget.isOpen();

  // Destroy widget
  FlowMaestroWidget.destroy();
});
```

### Event Listeners

Listen to widget events:

```javascript
window.addEventListener('flowmaestro:open', () => {
  console.log('Chat opened');
});

window.addEventListener('flowmaestro:close', () => {
  console.log('Chat closed');
});

window.addEventListener('flowmaestro:message', (event) => {
  console.log('New message:', event.detail);
});
```

### Manual Initialization

For more control, disable auto-init:

```html
<script
  src="https://app.flowmaestro.com/widget/{your-slug}.js"
  data-auto-init="false"
  async
></script>

<script>
  window.addEventListener('flowmaestro:loaded', () => {
    // Custom initialization logic
    if (userIsLoggedIn) {
      FlowMaestroWidget.init({
        position: 'bottom-left',
        initialState: 'expanded',
        // Pass user context
        metadata: {
          userId: currentUser.id,
          plan: currentUser.plan
        }
      });
    }
  });
</script>
```

## Iframe Embedding

### Full Page

Embed the full chat experience in an iframe:

```html
<iframe
  src="https://app.flowmaestro.com/embed/chat/{your-slug}"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
></iframe>
```

### Inline Container

Place the chat in a specific location:

```html
<div class="chat-container">
  <iframe
    src="https://app.flowmaestro.com/embed/chat/{your-slug}"
    style="width: 400px; height: 600px; border: 1px solid #e5e7eb; border-radius: 12px;"
    allow="clipboard-write"
  ></iframe>
</div>
```

### PostMessage Communication

Communicate with the embedded interface:

```javascript
const iframe = document.querySelector('iframe');

// Send message to iframe
iframe.contentWindow.postMessage({
  type: 'flowmaestro:sendMessage',
  payload: { message: 'Hello!' }
}, 'https://app.flowmaestro.com');

// Receive messages from iframe
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://app.flowmaestro.com') return;

  if (event.data.type === 'flowmaestro:newMessage') {
    console.log('New message:', event.data.payload);
  }
});
```

## React Integration

### Using the Widget SDK

Install the FlowMaestro widget package:

```bash
npm install @flowmaestro/widget
```

Use in your React app:

```tsx
import { FlowMaestroChatWidget } from '@flowmaestro/widget/react';

function App() {
  return (
    <div>
      <h1>My App</h1>

      <FlowMaestroChatWidget
        slug="your-slug"
        position="bottom-right"
        initialState="collapsed"
        onOpen={() => console.log('Opened')}
        onClose={() => console.log('Closed')}
        onMessage={(msg) => console.log('Message:', msg)}
      />
    </div>
  );
}
```

### Inline Chat Component

Embed chat directly in your layout:

```tsx
import { FlowMaestroChat } from '@flowmaestro/widget/react';

function SupportPage() {
  return (
    <div className="support-container">
      <h1>Contact Support</h1>

      <FlowMaestroChat
        slug="support-bot"
        style={{ height: '500px' }}
        className="chat-embed"
      />
    </div>
  );
}
```

### TypeScript Types

The package includes TypeScript definitions:

```tsx
import type {
  ChatWidgetProps,
  ChatMessage,
  WidgetConfig
} from '@flowmaestro/widget';
```

## Form Interface Embedding

### Direct Link

Share the form URL:

```
https://app.flowmaestro.com/form/{your-slug}
```

### Iframe

Embed forms in your website:

```html
<iframe
  src="https://app.flowmaestro.com/form/{your-slug}"
  width="100%"
  height="800"
  frameborder="0"
  style="border-radius: 8px;"
></iframe>
```

### Responsive Sizing

Make the iframe responsive:

```html
<div style="position: relative; padding-bottom: 75%; height: 0;">
  <iframe
    src="https://app.flowmaestro.com/form/{your-slug}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
  ></iframe>
</div>
```

## Custom Domains

Host interfaces on your own domain for white-label deployments.

### Setup

1. Add a CNAME record pointing to `custom.flowmaestro.com`
2. Configure the domain in your interface settings
3. FlowMaestro handles SSL certificates automatically

### DNS Configuration

```
Type: CNAME
Name: chat (or your subdomain)
Value: custom.flowmaestro.com
TTL: 300
```

### Verification

After DNS propagation, your interface will be available at:

```
https://chat.yourdomain.com
```

## Security Considerations

### Content Security Policy

If your site uses CSP, allow FlowMaestro:

```
Content-Security-Policy:
  frame-src https://app.flowmaestro.com;
  script-src https://app.flowmaestro.com;
```

### Allowed Origins

Configure allowed origins in your interface settings to restrict where the widget can be embedded.

### CORS

FlowMaestro APIs support CORS for browser-based requests from allowed origins.

## Mobile Considerations

### Responsive Widget

The chat widget is mobile-responsive by default:
- Full-screen on small devices
- Floating button positions adjust
- Touch-optimized interactions

### Mobile-Specific Options

```html
<script
  src="https://app.flowmaestro.com/widget/{your-slug}.js"
  data-mobile-fullscreen="true"
  data-mobile-position="bottom-center"
  async
></script>
```

## Performance

### Lazy Loading

Load the widget only when needed:

```javascript
// Load on user interaction
document.querySelector('.help-button').addEventListener('click', () => {
  const script = document.createElement('script');
  script.src = 'https://app.flowmaestro.com/widget/{your-slug}.js';
  document.body.appendChild(script);
});
```

### Preloading

Preload for faster initial display:

```html
<link
  rel="preload"
  href="https://app.flowmaestro.com/widget/{your-slug}.js"
  as="script"
>
```

## Troubleshooting

### Widget Not Appearing

1. Check the script URL is correct
2. Verify the interface is published
3. Check browser console for errors
4. Ensure no CSP blocking

### Session Issues

1. Check cookie settings
2. Verify local storage is enabled
3. Test in incognito mode

### Styling Conflicts

If your site's CSS conflicts with the widget:

```css
/* Reset styles for widget container */
#flowmaestro-widget {
  all: initial;
}
```
