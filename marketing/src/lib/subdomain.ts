/**
 * Subdomain Detection Utilities
 *
 * Helpers for detecting which subdomain the marketing site is being served from.
 * This enables different behavior for blog.flowmaestro.ai vs the main site.
 */

/**
 * Check if the current page is being served from the blog subdomain
 */
export function isOnBlogSubdomain(): boolean {
    if (typeof window === "undefined") return false;
    return window.location.hostname.startsWith("blog.");
}

/**
 * Get the current subdomain (if any)
 */
export function getCurrentSubdomain(): string | null {
    if (typeof window === "undefined") return null;

    const hostname = window.location.hostname;

    // For localhost, check for subdomain in path or port conventions
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return null;
    }

    // Extract subdomain from hostname (e.g., "blog" from "blog.flowmaestro.ai")
    const parts = hostname.split(".");

    // If we have at least 3 parts (e.g., blog.flowmaestro.ai), first part is subdomain
    if (parts.length >= 3) {
        const subdomain = parts[0];
        // Exclude "www" as it's not really a subdomain for our purposes
        if (subdomain !== "www") {
            return subdomain;
        }
    }

    return null;
}

/**
 * Check if we should show blog-first content
 * (either on blog subdomain or on /blog route)
 */
export function shouldShowBlogFirst(): boolean {
    if (isOnBlogSubdomain()) return true;

    if (typeof window === "undefined") return false;
    return window.location.pathname.startsWith("/blog");
}
