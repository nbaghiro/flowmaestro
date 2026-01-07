import type { WidgetOptions, WidgetConfig, WidgetState, WidgetCallbacks } from "./types";

/**
 * FlowMaestro Chat Widget
 *
 * Creates an iframe-based chat widget that can be embedded on any website.
 * Handles the widget lifecycle, positioning, and communication with the iframe.
 *
 * @example
 * ```typescript
 * import { FlowMaestroWidget } from "@flowmaestro/widget";
 *
 * const widget = new FlowMaestroWidget({
 *     slug: "my-chat-slug",
 *     baseUrl: "https://flowmaestro.ai",
 *     position: "bottom-right",
 *     initialState: "collapsed"
 * });
 *
 * await widget.init();
 *
 * // Programmatic control
 * widget.open();
 * widget.close();
 * widget.toggle();
 * widget.destroy();
 * ```
 */
export class FlowMaestroWidget {
    private options: Required<WidgetOptions>;
    private callbacks: WidgetCallbacks;
    private state: WidgetState;
    private config: WidgetConfig | null = null;
    private messageHandler: ((event: MessageEvent) => void) | null = null;

    constructor(options: WidgetOptions & WidgetCallbacks) {
        const { onOpen, onClose, onError, onReady, ...widgetOptions } = options;

        this.options = {
            position: "bottom-right",
            initialState: "collapsed",
            appUrl: widgetOptions.baseUrl, // Default appUrl to baseUrl if not provided
            ...widgetOptions
        };

        this.callbacks = {
            onOpen,
            onClose,
            onError,
            onReady
        };

        this.state = {
            isOpen: this.options.initialState === "expanded",
            iframe: null,
            bubble: null,
            container: null
        };
    }

    /**
     * Initialize the widget by fetching config and rendering UI
     */
    async init(): Promise<void> {
        try {
            const response = await fetch(
                `${this.options.baseUrl}/public/chat-interfaces/${this.options.slug}`
            );

            if (!response.ok) {
                const error = new Error(
                    `Failed to load chat interface config: ${response.status} ${response.statusText}`
                );
                this.callbacks.onError?.(error);
                return;
            }

            const data = await response.json();

            if (data.success && data.data) {
                this.config = {
                    primaryColor: data.data.primaryColor,
                    borderRadius: data.data.borderRadius,
                    buttonIcon: data.data.widgetButtonIcon,
                    buttonText: data.data.widgetButtonText,
                    iconUrl: data.data.iconUrl
                };
            } else {
                const error = new Error(`Chat interface not found: ${this.options.slug}`);
                this.callbacks.onError?.(error);
                return;
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to initialize widget");
            this.callbacks.onError?.(error);
            return;
        }

        this.createWidget();
        this.setupMessageListener();

        if (this.state.isOpen) {
            this.open();
        }

        this.callbacks.onReady?.();
    }

    private createWidget(): void {
        const container = document.createElement("div");
        container.id = "flowmaestro-widget";
        container.style.cssText = `
            position: fixed;
            ${this.options.position === "bottom-left" ? "left: 16px;" : "right: 16px;"}
            bottom: 16px;
            z-index: 2147483647;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        document.body.appendChild(container);
        this.state.container = container;

        this.createBubble();
    }

    private createBubble(): void {
        if (!this.state.container || !this.config) return;

        const bubble = document.createElement("button");
        bubble.id = "flowmaestro-bubble";

        const hasText = this.config.buttonText && this.config.buttonText.length > 0;
        const hasIconUrl = !!this.config.iconUrl;

        // When we have an icon URL and no text, show just the icon (no background)
        // Otherwise, show the colored bubble with icon/text
        if (hasIconUrl && !hasText) {
            bubble.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                background: transparent;
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-radius: ${this.config.borderRadius}px;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            bubble.innerHTML = `<img src="${this.config.iconUrl}" alt="" style="width: 56px; height: 56px; border-radius: ${this.config.borderRadius}px; object-fit: cover;" />`;
        } else {
            bubble.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: ${hasText ? "12px 20px" : "14px"};
                background-color: ${this.config.primaryColor};
                color: white;
                border: none;
                border-radius: ${hasText ? this.config.borderRadius * 2 + "px" : "50%"};
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: transform 0.2s, box-shadow 0.2s;
            `;

            const iconHtml = hasIconUrl
                ? `<img src="${this.config.iconUrl}" alt="" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;" />`
                : `<span style="font-size: 20px;">${this.config.buttonIcon}</span>`;

            bubble.innerHTML = `
                ${iconHtml}
                ${hasText ? `<span>${this.config.buttonText}</span>` : ""}
            `;
        }

        bubble.onmouseenter = () => {
            bubble.style.transform = "scale(1.05)";
            bubble.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
        };
        bubble.onmouseleave = () => {
            bubble.style.transform = "scale(1)";
            bubble.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        };

        bubble.onclick = () => this.toggle();

        this.state.container.appendChild(bubble);
        this.state.bubble = bubble;
    }

    private createIframe(): void {
        if (!this.state.container || !this.config) return;

        const iframe = document.createElement("iframe");
        iframe.id = "flowmaestro-iframe";
        iframe.src = `${this.options.appUrl}/embed/${this.options.slug}`;

        iframe.style.cssText = `
            position: absolute;
            bottom: 70px;
            ${this.options.position === "bottom-left" ? "left: 0;" : "right: 0;"}
            width: 420px;
            height: 750px;
            max-height: 90vh;
            border: none;
            border-radius: ${this.config.borderRadius}px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            background: white;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.2s, transform 0.2s;
        `;

        iframe.allow = "clipboard-write";

        this.state.container.appendChild(iframe);
        this.state.iframe = iframe;

        // Animate in
        requestAnimationFrame(() => {
            if (iframe) {
                iframe.style.opacity = "1";
                iframe.style.transform = "translateY(0)";
            }
        });
    }

    private setupMessageListener(): void {
        this.messageHandler = (event: MessageEvent) => {
            // Verify origin matches our baseUrl
            try {
                const baseUrlHost = new URL(this.options.baseUrl).host;
                if (!event.origin.includes(baseUrlHost)) {
                    return;
                }
            } catch {
                return;
            }

            const { type, height } = event.data || {};

            if (type === "flowmaestro:resize" && this.state.iframe && height) {
                const newHeight = Math.min(height, window.innerHeight * 0.8);
                this.state.iframe.style.height = `${newHeight}px`;
            }

            if (type === "flowmaestro:close") {
                this.close();
            }
        };

        window.addEventListener("message", this.messageHandler);
    }

    /**
     * Open the chat window
     */
    open(): void {
        if (this.state.isOpen) return;
        this.state.isOpen = true;

        if (!this.state.iframe) {
            this.createIframe();
        } else {
            this.state.iframe.style.display = "block";
            requestAnimationFrame(() => {
                if (this.state.iframe) {
                    this.state.iframe.style.opacity = "1";
                    this.state.iframe.style.transform = "translateY(0)";
                }
            });
        }

        this.callbacks.onOpen?.();
    }

    /**
     * Close the chat window
     */
    close(): void {
        if (!this.state.isOpen) return;
        this.state.isOpen = false;

        if (this.state.iframe) {
            this.state.iframe.style.opacity = "0";
            this.state.iframe.style.transform = "translateY(10px)";
            setTimeout(() => {
                if (this.state.iframe) {
                    this.state.iframe.style.display = "none";
                }
            }, 200);
        }

        this.callbacks.onClose?.();
    }

    /**
     * Toggle the chat window open/closed
     */
    toggle(): void {
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Destroy the widget and remove from DOM
     */
    destroy(): void {
        // Remove message listener
        if (this.messageHandler) {
            window.removeEventListener("message", this.messageHandler);
            this.messageHandler = null;
        }

        // Remove DOM elements
        if (this.state.container) {
            this.state.container.remove();
        }

        // Reset state
        this.state = {
            isOpen: false,
            iframe: null,
            bubble: null,
            container: null
        };

        this.config = null;
    }

    /**
     * Check if the widget is currently open
     */
    get isOpen(): boolean {
        return this.state.isOpen;
    }

    /**
     * Check if the widget is initialized and ready
     */
    get isReady(): boolean {
        return this.config !== null && this.state.container !== null;
    }
}
