import { useEffect, useRef } from "react";
import { FlowMaestroWidget as WidgetClass } from "../widget";
import type { WidgetComponentProps } from "../types";

/**
 * React component for rendering the FlowMaestro chat widget.
 *
 * This component handles the full widget lifecycle - initializes on mount,
 * cleans up on unmount, and reinitializes when props change.
 *
 * @example Basic Usage
 * ```tsx
 * function App() {
 *     return (
 *         <FlowMaestroWidget
 *             slug="my-chat-slug"
 *             baseUrl="https://flowmaestro.ai"
 *         />
 *     );
 * }
 * ```
 *
 * @example With All Props
 * ```tsx
 * function App() {
 *     return (
 *         <FlowMaestroWidget
 *             slug="my-chat-slug"
 *             baseUrl="https://flowmaestro.ai"
 *             position="bottom-left"
 *             initialState="collapsed"
 *             onOpen={() => console.log("Widget opened")}
 *             onClose={() => console.log("Widget closed")}
 *             onReady={() => console.log("Widget ready")}
 *             onError={(error) => console.error("Widget error:", error)}
 *         />
 *     );
 * }
 * ```
 *
 * @example Conditional Rendering
 * ```tsx
 * function App() {
 *     const [showWidget, setShowWidget] = useState(true);
 *
 *     return (
 *         <>
 *             <button onClick={() => setShowWidget(!showWidget)}>
 *                 Toggle Widget
 *             </button>
 *             {showWidget && (
 *                 <FlowMaestroWidget
 *                     slug="my-chat-slug"
 *                     baseUrl="https://flowmaestro.ai"
 *                 />
 *             )}
 *         </>
 *     );
 * }
 * ```
 */
export function FlowMaestroWidget({
    slug,
    baseUrl,
    position = "bottom-right",
    initialState = "collapsed",
    onOpen,
    onClose,
    onError,
    onReady
}: WidgetComponentProps): null {
    const widgetRef = useRef<WidgetClass | null>(null);

    // Create a stable key for detecting prop changes
    const propsKey = JSON.stringify({ slug, baseUrl, position, initialState });

    useEffect(() => {
        // Clean up any existing widget
        if (widgetRef.current) {
            widgetRef.current.destroy();
            widgetRef.current = null;
        }

        // Create new widget instance
        const widget = new WidgetClass({
            slug,
            baseUrl,
            position,
            initialState,
            onOpen,
            onClose,
            onError,
            onReady
        });

        widgetRef.current = widget;

        // Initialize
        widget.init();

        // Cleanup on unmount or props change
        return () => {
            if (widgetRef.current) {
                widgetRef.current.destroy();
                widgetRef.current = null;
            }
        };
        // We use propsKey to detect changes in the core props
        // Callbacks are intentionally not in deps to avoid re-init on callback changes
    }, [propsKey]);

    // Update callbacks without re-initializing
    useEffect(() => {
        // Note: The widget stores callbacks at init time, so changing callbacks
        // after init won't have an effect without re-initialization.
        // This is intentional to avoid complexity.
    }, [onOpen, onClose, onError, onReady]);

    // This component doesn't render any visible UI
    // The widget is injected directly into document.body
    return null;
}
