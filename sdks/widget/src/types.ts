/**
 * Options for initializing the FlowMaestro widget
 */
export interface WidgetOptions {
    /** The slug of the chat interface (from the published chat interface URL) */
    slug: string;
    /** The base URL of the FlowMaestro API server (for API calls) */
    baseUrl: string;
    /** The URL of the FlowMaestro app (for iframe embed). Defaults to baseUrl if not provided */
    appUrl?: string;
    /** Position of the widget bubble on the screen */
    position?: "bottom-right" | "bottom-left";
    /** Initial state of the widget when loaded */
    initialState?: "collapsed" | "expanded";
}

/**
 * Configuration fetched from the FlowMaestro API
 */
export interface WidgetConfig {
    /** Primary brand color for the widget */
    primaryColor: string;
    /** Border radius for the widget elements */
    borderRadius: number;
    /** Icon name for the widget bubble (fallback) */
    buttonIcon: string;
    /** Optional text displayed next to the icon */
    buttonText: string | null;
    /** URL of the chat interface icon (preferred for bubble) */
    iconUrl: string | null;
}

/**
 * Internal state of the widget
 */
export interface WidgetState {
    /** Whether the chat window is currently open */
    isOpen: boolean;
    /** Reference to the chat iframe element */
    iframe: HTMLIFrameElement | null;
    /** Reference to the bubble button element */
    bubble: HTMLButtonElement | null;
    /** Reference to the widget container element */
    container: HTMLDivElement | null;
}

/**
 * Callback functions for widget events
 */
export interface WidgetCallbacks {
    /** Called when the widget is opened */
    onOpen?: () => void;
    /** Called when the widget is closed */
    onClose?: () => void;
    /** Called when an error occurs */
    onError?: (error: Error) => void;
    /** Called when the widget is ready (config loaded, UI rendered) */
    onReady?: () => void;
}

/**
 * Full options including callbacks
 */
export interface WidgetOptionsWithCallbacks extends WidgetOptions, WidgetCallbacks {}

/**
 * Return type for the useFlowMaestroWidget React hook
 */
export interface UseWidgetReturn {
    /** Open the chat window */
    open: () => void;
    /** Close the chat window */
    close: () => void;
    /** Toggle the chat window open/closed */
    toggle: () => void;
    /** Destroy the widget and remove from DOM */
    destroy: () => void;
    /** Whether the chat window is currently open */
    isOpen: boolean;
    /** Whether the widget is ready (config loaded, UI rendered) */
    isReady: boolean;
    /** Error that occurred during initialization, if any */
    error: Error | null;
}

/**
 * Props for the FlowMaestroWidget React component
 */
export interface WidgetComponentProps extends WidgetOptions, WidgetCallbacks {}
