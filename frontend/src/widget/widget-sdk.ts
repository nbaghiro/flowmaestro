/**
 * FlowMaestro Chat Widget SDK
 *
 * This SDK creates an iframe-based chat widget that can be embedded on any website.
 * It handles the widget lifecycle, positioning, and communication with the iframe.
 *
 * Usage:
 * <script src="https://your-domain.com/widget/my-chat-slug.js" async></script>
 *
 * Or with custom options:
 * <script
 *   src="https://your-domain.com/widget/my-chat-slug.js"
 *   data-position="bottom-left"
 *   data-initial="collapsed"
 *   async
 * ></script>
 */

import { logger } from "../lib/logger";

interface WidgetOptions {
    slug: string;
    baseUrl: string;
    position?: "bottom-right" | "bottom-left";
    initialState?: "collapsed" | "expanded";
}

interface WidgetState {
    isOpen: boolean;
    iframe: HTMLIFrameElement | null;
    bubble: HTMLButtonElement | null;
    container: HTMLDivElement | null;
}

class FlowMaestroWidget {
    private options: WidgetOptions;
    private state: WidgetState;
    private config: {
        primaryColor: string;
        borderRadius: number;
        buttonIcon: string;
        buttonText: string | null;
    } | null = null;

    constructor(options: WidgetOptions) {
        this.options = {
            position: "bottom-right",
            initialState: "collapsed",
            ...options
        };
        this.state = {
            isOpen: this.options.initialState === "expanded",
            iframe: null,
            bubble: null,
            container: null
        };
    }

    async init(): Promise<void> {
        // Fetch widget config
        try {
            const response = await fetch(
                `${this.options.baseUrl}/api/public/chat-interfaces/${this.options.slug}`
            );
            if (!response.ok) {
                logger.error("Failed to load chat interface config", { slug: this.options.slug });
                return;
            }
            const data = await response.json();
            if (data.success && data.data) {
                this.config = {
                    primaryColor: data.data.primaryColor,
                    borderRadius: data.data.borderRadius,
                    buttonIcon: data.data.widgetButtonIcon,
                    buttonText: data.data.widgetButtonText
                };
            } else {
                logger.error("Chat interface not found", { slug: this.options.slug });
                return;
            }
        } catch (error) {
            logger.error("Failed to initialize widget", error, { slug: this.options.slug });
            return;
        }

        this.createWidget();
        this.setupMessageListener();

        if (this.state.isOpen) {
            this.open();
        }
    }

    private createWidget(): void {
        // Create container
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

        // Create bubble button
        this.createBubble();
    }

    private createBubble(): void {
        if (!this.state.container || !this.config) return;

        const bubble = document.createElement("button");
        bubble.id = "flowmaestro-bubble";

        const hasText = this.config.buttonText && this.config.buttonText.length > 0;

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

        bubble.innerHTML = `
            <span style="font-size: 20px;">${this.config.buttonIcon}</span>
            ${hasText ? `<span>${this.config.buttonText}</span>` : ""}
        `;

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
        iframe.src = `${this.options.baseUrl}/embed/${this.options.slug}`;

        iframe.style.cssText = `
            position: absolute;
            bottom: 60px;
            ${this.options.position === "bottom-left" ? "left: 0;" : "right: 0;"}
            width: 380px;
            height: 550px;
            max-height: 80vh;
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
        window.addEventListener("message", (event) => {
            // Verify origin matches our baseUrl
            if (!event.origin.includes(new URL(this.options.baseUrl).host)) {
                return;
            }

            const { type, height } = event.data;

            if (type === "flowmaestro:resize" && this.state.iframe && height) {
                // Handle resize from iframe
                const newHeight = Math.min(height, window.innerHeight * 0.8);
                this.state.iframe.style.height = `${newHeight}px`;
            }

            if (type === "flowmaestro:close") {
                this.close();
            }
        });
    }

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
    }

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
    }

    toggle(): void {
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    destroy(): void {
        if (this.state.container) {
            this.state.container.remove();
        }
        this.state = {
            isOpen: false,
            iframe: null,
            bubble: null,
            container: null
        };
    }
}

// Auto-initialize from script tag
(function () {
    // Find the script tag
    const scripts = document.getElementsByTagName("script");
    let currentScript: HTMLScriptElement | null = null;

    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src;
        if (src && src.includes("/widget/") && src.endsWith(".js")) {
            currentScript = scripts[i];
            break;
        }
    }

    if (!currentScript) {
        logger.error("Could not find widget script tag");
        return;
    }

    // Extract slug from URL (e.g., /widget/my-slug.js -> my-slug)
    const src = currentScript.src;
    const match = src.match(/\/widget\/([^/]+)\.js/);
    if (!match) {
        logger.error("Invalid widget script URL", { src });
        return;
    }

    const slug = match[1];
    const baseUrl = src.replace(/\/widget\/[^/]+\.js.*$/, "");

    // Get options from data attributes
    const position =
        (currentScript.dataset.position as "bottom-right" | "bottom-left") || "bottom-right";
    const initialState = (currentScript.dataset.initial as "collapsed" | "expanded") || "collapsed";

    // Initialize widget
    const widget = new FlowMaestroWidget({
        slug,
        baseUrl,
        position,
        initialState
    });

    // Make widget available globally
    (window as unknown as { FlowMaestroWidget: FlowMaestroWidget }).FlowMaestroWidget = widget;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => widget.init());
    } else {
        widget.init();
    }
})();

export { FlowMaestroWidget };
