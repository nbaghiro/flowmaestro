function About() {
    return (
        <div className="page">
            <h1>About This Demo</h1>
            <p className="subtitle">Learn more about the FlowMaestro widget integration.</p>

            <div className="info-box">
                <strong>Widget Persistence:</strong> Notice that the chat widget is still visible!
                It persists across route changes because it&apos;s rendered at the App level.
            </div>

            <h2>Widget Lifecycle</h2>
            <p>The widget goes through these stages:</p>
            <ol>
                <li>
                    <strong>Script Load</strong> - The widget script is injected into the page
                </li>
                <li>
                    <strong>Configuration Fetch</strong> - Widget fetches config from the
                    FlowMaestro API
                </li>
                <li>
                    <strong>Render</strong> - The floating bubble appears in the configured position
                </li>
                <li>
                    <strong>Interaction</strong> - User can open/close the chat window
                </li>
                <li>
                    <strong>Cleanup</strong> - When unmounted, the widget is destroyed
                </li>
            </ol>

            <h2>React Integration Tips</h2>
            <ul>
                <li>
                    <strong>Place at App Level</strong> - For persistent widgets, render the{" "}
                    <code>WidgetLoader</code> in your root App component
                </li>
                <li>
                    <strong>Use useEffect Cleanup</strong> - The component handles cleanup
                    automatically via useEffect
                </li>
                <li>
                    <strong>Avoid Multiple Instances</strong> - Only render one widget at a time to
                    prevent conflicts
                </li>
                <li>
                    <strong>Handle Slug Changes</strong> - The component automatically reinitializes
                    when the slug changes
                </li>
            </ul>

            <h2>Styling Considerations</h2>
            <p>
                The widget uses a very high z-index (2147483647) to ensure it appears above most
                content. If you have elements with similar z-index values, you may need to adjust
                your styles.
            </p>

            <h2>Communication</h2>
            <p>
                The widget iframe and the host page communicate via <code>postMessage</code>. This
                enables features like:
            </p>
            <ul>
                <li>Resize events when the chat content changes</li>
                <li>Close events triggered from within the chat</li>
                <li>Custom event handling (coming soon)</li>
            </ul>
        </div>
    );
}

export default About;
