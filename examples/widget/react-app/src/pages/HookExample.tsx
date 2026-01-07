import { useFlowMaestroWidget } from "@flowmaestro/widget/react";

const baseUrl = import.meta.env.VITE_API_URL || "https://api.flowmaestro.ai";
const defaultSlug = import.meta.env.VITE_WIDGET_SLUG || "customer-support-agent-chat";

function HookExample() {
    const { open, close, toggle, destroy, isOpen, isReady, error } = useFlowMaestroWidget({
        slug: defaultSlug,
        baseUrl: baseUrl,
        position: "bottom-right",
        initialState: "collapsed"
    });

    return (
        <div className="page">
            <h1>React Hook Example</h1>
            <p className="subtitle">
                Using the <code>useFlowMaestroWidget</code> hook for programmatic control.
            </p>

            <div className="info-box">
                <strong>This page uses the hook instead of the component.</strong> The hook gives
                you full control over the widget while still managing the lifecycle automatically.
            </div>

            <h2>Widget Status</h2>
            <div className="status-grid">
                <div className="status-item">
                    <span className="status-label">Ready:</span>
                    <span className={`status-value ${isReady ? "ready" : "loading"}`}>
                        {isReady ? "Yes" : "Loading..."}
                    </span>
                </div>
                <div className="status-item">
                    <span className="status-label">Open:</span>
                    <span className="status-value">{isOpen ? "Yes" : "No"}</span>
                </div>
                {error && (
                    <div className="status-item">
                        <span className="status-label">Error:</span>
                        <span className="status-value error">{error.message}</span>
                    </div>
                )}
            </div>

            <h2>Controls</h2>
            <div className="button-group">
                <button className="button" onClick={open} disabled={!isReady || isOpen}>
                    Open
                </button>
                <button className="button secondary" onClick={close} disabled={!isReady || !isOpen}>
                    Close
                </button>
                <button className="button secondary" onClick={toggle} disabled={!isReady}>
                    Toggle
                </button>
                <button className="button danger" onClick={destroy}>
                    Destroy
                </button>
            </div>

            <h2>Hook Usage</h2>
            <pre>
                <code>{`import { useFlowMaestroWidget } from "@flowmaestro/widget/react";

function MyComponent() {
    const {
        open,      // () => void - Opens the widget
        close,     // () => void - Closes the widget
        toggle,    // () => void - Toggles open/closed
        destroy,   // () => void - Removes widget from DOM
        isOpen,    // boolean - Whether widget is open
        isReady,   // boolean - Whether widget is initialized
        error      // Error | null - Any initialization error
    } = useFlowMaestroWidget({
        slug: "my-chat-slug",
        baseUrl: "https://api.flowmaestro.ai",
        position: "bottom-right",
        initialState: "collapsed"
    });

    return (
        <button onClick={toggle} disabled={!isReady}>
            {isOpen ? "Close" : "Open"} Chat
        </button>
    );
}`}</code>
            </pre>

            <h2>When to Use the Hook vs Component</h2>
            <table>
                <thead>
                    <tr>
                        <th>Use Case</th>
                        <th>Recommended</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Simple integration, no controls needed</td>
                        <td>
                            <code>{"<FlowMaestroWidget />"}</code>
                        </td>
                    </tr>
                    <tr>
                        <td>Custom open/close buttons</td>
                        <td>
                            <code>useFlowMaestroWidget()</code>
                        </td>
                    </tr>
                    <tr>
                        <td>Track open/closed state</td>
                        <td>
                            <code>useFlowMaestroWidget()</code>
                        </td>
                    </tr>
                    <tr>
                        <td>Handle loading/error states</td>
                        <td>
                            <code>useFlowMaestroWidget()</code>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default HookExample;
