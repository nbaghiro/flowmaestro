# @flowmaestro/widget

Embeddable chat widget for FlowMaestro. Add AI-powered chat to any website with a single script tag or npm package.

## Installation

### Script Tag (Easiest)

Add this to your HTML:

```html
<script src="https://flowmaestro.ai/widget/YOUR_SLUG.js" async></script>
```

Replace `YOUR_SLUG` with your chat interface slug from FlowMaestro.

### npm Package

```bash
npm install @flowmaestro/widget
```

## Usage

### Script Tag

#### Basic

```html
<script src="https://flowmaestro.ai/widget/my-chat.js" async></script>
```

#### With Options

```html
<script
    src="https://flowmaestro.ai/widget/my-chat.js"
    data-position="bottom-left"
    data-initial="expanded"
    async
></script>
```

#### Programmatic Control

```javascript
// The widget is available globally after loading
window.FlowMaestroWidget.open();
window.FlowMaestroWidget.close();
window.FlowMaestroWidget.toggle();
window.FlowMaestroWidget.destroy();
```

### npm Package - Vanilla JavaScript/TypeScript

```typescript
import { FlowMaestroWidget } from "@flowmaestro/widget";

const widget = new FlowMaestroWidget({
    slug: "my-chat-slug",
    baseUrl: "https://flowmaestro.ai",
    position: "bottom-right", // or "bottom-left"
    initialState: "collapsed" // or "expanded"
});

// Initialize the widget
await widget.init();

// Programmatic control
widget.open();
widget.close();
widget.toggle();
widget.destroy();

// Check state
console.log(widget.isOpen); // boolean
console.log(widget.isReady); // boolean
```

### npm Package - React Component

```tsx
import { FlowMaestroWidget } from "@flowmaestro/widget/react";

function App() {
    return (
        <FlowMaestroWidget
            slug="my-chat-slug"
            baseUrl="https://flowmaestro.ai"
            position="bottom-right"
            initialState="collapsed"
            onOpen={() => console.log("Widget opened")}
            onClose={() => console.log("Widget closed")}
            onReady={() => console.log("Widget ready")}
            onError={(error) => console.error("Error:", error)}
        />
    );
}
```

### npm Package - React Hook

For more control, use the hook:

```tsx
import { useFlowMaestroWidget } from "@flowmaestro/widget/react";

function App() {
    const { open, close, toggle, destroy, isOpen, isReady, error } = useFlowMaestroWidget({
        slug: "my-chat-slug",
        baseUrl: "https://flowmaestro.ai",
        position: "bottom-right",
        initialState: "collapsed"
    });

    if (error) {
        return <div>Error loading chat: {error.message}</div>;
    }

    return (
        <div>
            <p>Widget is {isReady ? "ready" : "loading..."}</p>
            <button onClick={toggle}>{isOpen ? "Close" : "Open"} Chat</button>
        </div>
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

## Callbacks (npm only)

| Callback  | Type                     | Description                        |
| --------- | ------------------------ | ---------------------------------- |
| `onOpen`  | `() => void`             | Called when the chat window opens  |
| `onClose` | `() => void`             | Called when the chat window closes |
| `onReady` | `() => void`             | Called when the widget is ready    |
| `onError` | `(error: Error) => void` | Called when an error occurs        |

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
    WidgetOptions,
    WidgetCallbacks,
    WidgetComponentProps,
    UseWidgetReturn
} from "@flowmaestro/widget";
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT
