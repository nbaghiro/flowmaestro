import { useEffect, useRef, useState, useCallback } from "react";
import { FlowMaestroWidget } from "../widget";
import type { WidgetOptions, UseWidgetReturn } from "../types";

/**
 * React hook for integrating the FlowMaestro chat widget.
 *
 * Handles the widget lifecycle automatically - initializes on mount,
 * cleans up on unmount, and reinitializes when options change.
 *
 * @example Basic Usage
 * ```tsx
 * function App() {
 *     const { open, close, toggle, isOpen } = useFlowMaestroWidget({
 *         slug: "my-chat-slug",
 *         baseUrl: "https://flowmaestro.ai"
 *     });
 *
 *     return (
 *         <button onClick={toggle}>
 *             {isOpen ? "Close Chat" : "Open Chat"}
 *         </button>
 *     );
 * }
 * ```
 *
 * @example With All Options
 * ```tsx
 * function App() {
 *     const { isReady, error } = useFlowMaestroWidget({
 *         slug: "my-chat-slug",
 *         baseUrl: "https://flowmaestro.ai",
 *         position: "bottom-left",
 *         initialState: "expanded"
 *     });
 *
 *     if (error) return <div>Error: {error.message}</div>;
 *     if (!isReady) return <div>Loading widget...</div>;
 *
 *     return <div>Widget is ready!</div>;
 * }
 * ```
 */
export function useFlowMaestroWidget(options: WidgetOptions): UseWidgetReturn {
    const widgetRef = useRef<FlowMaestroWidget | null>(null);
    const [isOpen, setIsOpen] = useState(options.initialState === "expanded");
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Memoize options to prevent unnecessary re-renders
    const optionsKey = JSON.stringify(options);

    useEffect(() => {
        // Clean up any existing widget
        if (widgetRef.current) {
            widgetRef.current.destroy();
            widgetRef.current = null;
        }

        setIsReady(false);
        setError(null);

        // Create new widget instance
        const widget = new FlowMaestroWidget({
            ...options,
            onOpen: () => setIsOpen(true),
            onClose: () => setIsOpen(false),
            onReady: () => setIsReady(true),
            onError: (err) => setError(err)
        });

        widgetRef.current = widget;

        // Initialize
        widget.init();

        // Cleanup on unmount or options change
        return () => {
            if (widgetRef.current) {
                widgetRef.current.destroy();
                widgetRef.current = null;
            }
        };
    }, [optionsKey]);

    const open = useCallback(() => {
        widgetRef.current?.open();
    }, []);

    const close = useCallback(() => {
        widgetRef.current?.close();
    }, []);

    const toggle = useCallback(() => {
        widgetRef.current?.toggle();
    }, []);

    const destroy = useCallback(() => {
        if (widgetRef.current) {
            widgetRef.current.destroy();
            widgetRef.current = null;
            setIsOpen(false);
            setIsReady(false);
        }
    }, []);

    return {
        open,
        close,
        toggle,
        destroy,
        isOpen,
        isReady,
        error
    };
}
