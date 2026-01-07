/**
 * Auto-initialization script for FlowMaestro widget via script tag.
 *
 * This file is built as an IIFE and can be served from any static host (CDN, cloud storage).
 * It automatically extracts the slug from the script URL and initializes the widget.
 *
 * Usage:
 * <script src="https://cdn.flowmaestro.ai/widget/my-slug.js" async></script>
 *
 * With options:
 * <script
 *   src="https://cdn.flowmaestro.ai/widget/my-slug.js"
 *   data-api-url="https://api.flowmaestro.ai"
 *   data-app-url="https://app.flowmaestro.ai"
 *   data-position="bottom-left"
 *   data-initial="expanded"
 *   async
 * ></script>
 *
 * Attributes:
 * - data-api-url: Backend API URL (required in dev, defaults to script origin in prod)
 * - data-app-url: Frontend app URL for embed iframe (defaults to data-api-url if not provided)
 * - data-position: "bottom-right" (default) or "bottom-left"
 * - data-initial: "collapsed" (default) or "expanded"
 */

import { FlowMaestroWidget } from "./widget";

// Extend window type for global widget instance
declare global {
    interface Window {
        FlowMaestroWidget?: FlowMaestroWidget;
    }
}

(function () {
    // Find the script tag that loaded this file
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
        // eslint-disable-next-line no-console
        console.error("[FlowMaestro] Could not find widget script tag");
        return;
    }

    // Extract slug from URL (e.g., /widget/my-slug.js -> my-slug)
    const src = currentScript.src;
    const match = src.match(/\/widget\/([^/]+)\.js/);

    if (!match) {
        // eslint-disable-next-line no-console
        console.error("[FlowMaestro] Invalid widget script URL:", src);
        return;
    }

    const slug = match[1];

    // Get API URL from data attribute, or fallback to script origin
    // In production: script and API are on same domain, so fallback works
    // In development: use data-api-url to point to backend (e.g., http://localhost:3001)
    const baseUrl = currentScript.dataset.apiUrl || src.replace(/\/widget\/[^/]+\.js.*$/, "");

    // Get app URL from data attribute (for embed iframe), defaults to baseUrl
    const appUrl = currentScript.dataset.appUrl || baseUrl;

    // Get options from data attributes
    const position =
        (currentScript.dataset.position as "bottom-right" | "bottom-left") || "bottom-right";
    const initialState = (currentScript.dataset.initial as "collapsed" | "expanded") || "collapsed";

    // Create widget instance
    const widget = new FlowMaestroWidget({
        slug,
        baseUrl,
        appUrl,
        position,
        initialState
    });

    // Make widget available globally for programmatic control
    window.FlowMaestroWidget = widget;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => widget.init());
    } else {
        widget.init();
    }
})();
