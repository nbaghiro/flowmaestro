function Home() {
    return (
        <div className="page">
            <h1>Welcome to FlowMaestro Widget Demo</h1>
            <p className="subtitle">
                This React app demonstrates how to integrate the FlowMaestro chat widget in a
                single-page application.
            </p>

            <div className="info-box">
                <strong>Try it!</strong> Look at the bottom-right corner of your screen to see the
                chat widget. It persists as you navigate between pages.
            </div>

            <h2>Features Demonstrated</h2>
            <ul>
                <li>
                    <strong>Persistent Widget</strong> - The widget stays open as you navigate
                    between routes
                </li>
                <li>
                    <strong>React Router Integration</strong> - Works seamlessly with client-side
                    routing
                </li>
                <li>
                    <strong>Dynamic Slug Loading</strong> - Visit <code>/chat/:slug</code> to load
                    different chat interfaces
                </li>
                <li>
                    <strong>Reusable Component</strong> - The <code>WidgetLoader</code> component
                    can be used anywhere
                </li>
            </ul>

            <h2>How It Works</h2>
            <p>
                The <code>WidgetLoader</code> component injects the widget script into the page and
                manages its lifecycle. When the component unmounts or the slug changes, it cleans up
                the previous widget instance.
            </p>

            <pre>
                <code>{`import WidgetLoader from "./components/WidgetLoader";

<WidgetLoader
    slug="your-chat-slug"
    baseUrl="https://api.flowmaestro.ai"
    position="bottom-right"
/>`}</code>
            </pre>

            <h2>Navigation</h2>
            <p>Use the navigation bar above to explore different pages:</p>
            <ul>
                <li>
                    <strong>Home</strong> - This page, with the default widget
                </li>
                <li>
                    <strong>About</strong> - Another page showing widget persistence
                </li>
                <li>
                    <strong>Dynamic Chat</strong> - Load widgets dynamically from URL parameters
                </li>
            </ul>
        </div>
    );
}

export default Home;
