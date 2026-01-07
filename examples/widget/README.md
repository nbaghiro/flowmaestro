# Chat Widget Examples

Examples demonstrating how to integrate the FlowMaestro chat widget into your website or application.

## Integration Methods

The widget can be integrated in two ways:

| Method          | Best For                                     | Installation                      |
| --------------- | -------------------------------------------- | --------------------------------- |
| **Script Tag**  | Static HTML sites, quick integration         | Add `<script>` tag                |
| **npm Package** | React/Vue/Node apps, full TypeScript support | `npm install @flowmaestro/widget` |

## Examples

### Script Tag Examples

Simple integration with just a `<script>` tag. No build tools required.

| Example                                                  | Description                                        |
| -------------------------------------------------------- | -------------------------------------------------- |
| [`script-tag/basic.html`](./script-tag/basic.html)       | Simplest integration - just add the script         |
| [`script-tag/advanced.html`](./script-tag/advanced.html) | All configuration options and programmatic control |

### npm Package Examples

Full integration with TypeScript support, React components, and hooks.

| Example                          | Description                              |
| -------------------------------- | ---------------------------------------- |
| [`npm-vanilla/`](./npm-vanilla/) | Vanilla JavaScript/TypeScript with Vite  |
| [`react-app/`](./react-app/)     | Full React app with components and hooks |

## Prerequisites

1. **Published Chat Interface** - You need a published chat interface slug from FlowMaestro
2. **FlowMaestro Server** - Either local dev server or production URL

## Quick Start

### Option 1: Script Tag

Add this to your HTML:

```html
<script src="https://flowmaestro.ai/widget/YOUR_SLUG.js" async></script>
```

### Option 2: npm Package

Install the package:

```bash
npm install @flowmaestro/widget
```

Use in your code:

```typescript
// Vanilla JavaScript/TypeScript
import { FlowMaestroWidget } from "@flowmaestro/widget";

const widget = new FlowMaestroWidget({
    slug: "my-chat-slug",
    baseUrl: "https://flowmaestro.ai"
});

await widget.init();
```

```tsx
// React Component
import { FlowMaestroWidget } from "@flowmaestro/widget/react";

function App() {
    return <FlowMaestroWidget slug="my-chat-slug" baseUrl="https://flowmaestro.ai" />;
}
```

```tsx
// React Hook (for more control)
import { useFlowMaestroWidget } from "@flowmaestro/widget/react";

function App() {
    const { open, close, toggle, isOpen, isReady } = useFlowMaestroWidget({
        slug: "my-chat-slug",
        baseUrl: "https://flowmaestro.ai"
    });

    return (
        <button onClick={toggle} disabled={!isReady}>
            {isOpen ? "Close" : "Open"} Chat
        </button>
    );
}
```

## Configuration Options

| Option         | Type                                | Default          | Description              |
| -------------- | ----------------------------------- | ---------------- | ------------------------ |
| `slug`         | `string`                            | (required)       | Your chat interface slug |
| `baseUrl`      | `string`                            | (required)       | FlowMaestro server URL   |
| `position`     | `"bottom-right"` \| `"bottom-left"` | `"bottom-right"` | Widget position          |
| `initialState` | `"collapsed"` \| `"expanded"`       | `"collapsed"`    | Initial widget state     |

### Script Tag Attributes

When using the script tag, pass options via `data-*` attributes:

```html
<script
    src="https://flowmaestro.ai/widget/my-slug.js"
    data-position="bottom-left"
    data-initial="expanded"
    async
></script>
```

## Callbacks (npm package only)

| Callback  | Type                     | Description                       |
| --------- | ------------------------ | --------------------------------- |
| `onOpen`  | `() => void`             | Called when widget opens          |
| `onClose` | `() => void`             | Called when widget closes         |
| `onReady` | `() => void`             | Called when widget is initialized |
| `onError` | `(error: Error) => void` | Called on initialization error    |

## Running Examples

### Script Tag Examples

```bash
cd script-tag
npx serve .
# Open http://localhost:3000/basic.html or /advanced.html
```

### npm Vanilla Example

```bash
cd npm-vanilla
npm install
npm run dev
# Open http://localhost:5173
```

### React App Example

```bash
cd react-app
npm install
npm run dev
# Open http://localhost:5174
```

## Programmatic Control

### Script Tag (Global Object)

```javascript
// After widget loads, control via global object
window.FlowMaestroWidget.open();
window.FlowMaestroWidget.close();
window.FlowMaestroWidget.toggle();
window.FlowMaestroWidget.destroy();
```

### npm Package (Instance Methods)

```typescript
const widget = new FlowMaestroWidget({ ... });
await widget.init();

widget.open();
widget.close();
widget.toggle();
widget.destroy();

// Check state
console.log(widget.isOpen);
console.log(widget.isReady);
```

### React Hook

```tsx
const { open, close, toggle, destroy, isOpen, isReady, error } = useFlowMaestroWidget({ ... });
```

## TypeScript Support

The npm package includes full TypeScript definitions:

```typescript
import type {
    WidgetOptions,
    WidgetCallbacks,
    WidgetComponentProps,
    UseWidgetReturn
} from "@flowmaestro/widget";
```

## Troubleshooting

### Widget Not Appearing

1. **Check Console** - Look for errors in browser dev tools
2. **Verify Slug** - Ensure the chat interface is published
3. **Check URL** - Verify the base URL matches your FlowMaestro server
4. **CORS** - Ensure CORS is configured for local development

### Widget Appears But Chat Fails

1. **Network Tab** - Check if `/api/public/chat-interfaces/{slug}` returns 200
2. **Published Status** - Verify the chat interface is published (not draft)
3. **Agent Configured** - Ensure an agent is assigned to the chat interface

### React: Widget Not Updating

If using the component, it reinitializes when `slug`, `baseUrl`, `position`, or `initialState` change. Callbacks (`onOpen`, `onClose`, etc.) can change without causing a reinit.

## Local Development

When testing against a local FlowMaestro instance:

```bash
# Start FlowMaestro dev server
cd /path/to/flowmaestro
npm run dev

# The widget URL will be: http://localhost:3000/widget/{slug}.js
# The base URL for npm package: http://localhost:3000
```
