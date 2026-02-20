/**
 * Status Page Types
 *
 * Shared types for the FlowMaestro status page API and frontend.
 */

// ============================================================================
// Component Status Types
// ============================================================================

/**
 * Health status for a single component
 */
export type ComponentStatus = "operational" | "degraded" | "outage" | "unknown";

/**
 * Individual component health information
 */
export interface ComponentHealth {
    name: string;
    displayName: string;
    status: ComponentStatus;
    latencyMs?: number;
    message?: string;
    lastChecked: string;
}

/**
 * Component groups for organizing the status page
 */
export type ComponentGroup = "core" | "external";

/**
 * Component with group information
 */
export interface GroupedComponent extends ComponentHealth {
    group: ComponentGroup;
}

// ============================================================================
// Status API Response Types
// ============================================================================

/**
 * Overall system status
 */
export type OverallStatus = "operational" | "degraded" | "partial_outage" | "major_outage";

/**
 * Status API response
 */
export interface StatusResponse {
    status: OverallStatus;
    timestamp: string;
    components: ComponentHealth[];
    uptime: {
        last24Hours: number;
        last7Days: number;
        last30Days: number;
    };
}

// ============================================================================
// External Service Links
// ============================================================================

/**
 * External service status page link
 */
export interface ExternalServiceLink {
    name: string;
    statusUrl: string;
    category: "llm" | "payment" | "email" | "infrastructure";
}

/**
 * Default external services to display
 */
export const EXTERNAL_SERVICES: ExternalServiceLink[] = [
    { name: "OpenAI", statusUrl: "https://status.openai.com", category: "llm" },
    { name: "Anthropic", statusUrl: "https://status.anthropic.com", category: "llm" },
    { name: "Google AI", statusUrl: "https://status.cloud.google.com", category: "llm" },
    { name: "Stripe", statusUrl: "https://status.stripe.com", category: "payment" },
    { name: "Resend", statusUrl: "https://resend-status.com", category: "email" },
    {
        name: "Google Cloud",
        statusUrl: "https://status.cloud.google.com",
        category: "infrastructure"
    }
];
