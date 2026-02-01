/**
 * Sandbox Mode Configuration
 *
 * Configuration for sandbox execution mode, used for test connections
 * that return mock data instead of hitting real APIs.
 */

export interface SandboxConfig {
    /** Whether sandbox mode is enabled globally */
    enabled: boolean;
    /** What to do when no sandbox data is found */
    fallbackBehavior: "error" | "passthrough" | "empty";
    /** Per-provider overrides */
    providerOverrides: Record<
        string,
        { enabled: boolean; fallbackBehavior?: "error" | "passthrough" | "empty" }
    >;
    /** Per-operation overrides (format: "provider:operation") */
    operationOverrides: Record<
        string,
        { enabled: boolean; fallbackBehavior?: "error" | "passthrough" | "empty" }
    >;
}

type FallbackBehavior = "error" | "passthrough" | "empty";

/**
 * Parse a mode string into enabled flag and optional fallback behavior
 * Supported modes: "sandbox", "passthrough", "error", "empty", "disabled"
 */
function parseMode(mode: string): { enabled: boolean; fallbackBehavior?: FallbackBehavior } {
    switch (mode.toLowerCase()) {
        case "sandbox":
            return { enabled: true };
        case "passthrough":
            return { enabled: true, fallbackBehavior: "passthrough" };
        case "error":
            return { enabled: true, fallbackBehavior: "error" };
        case "empty":
            return { enabled: true, fallbackBehavior: "empty" };
        case "disabled":
        case "off":
            return { enabled: false };
        default:
            return { enabled: mode === "true" };
    }
}

/**
 * Get sandbox mode configuration from environment
 */
export function getSandboxConfig(): SandboxConfig {
    const enabled = process.env.SANDBOX_MODE_ENABLED === "true";
    const fallbackBehavior = (process.env.SANDBOX_MODE_FALLBACK as FallbackBehavior) || "error";

    // Parse provider overrides from SANDBOX_MODE_PROVIDERS
    // Format: "slack:sandbox,github:passthrough,stripe:disabled"
    const providerOverrides: SandboxConfig["providerOverrides"] = {};
    const providerConfig = process.env.SANDBOX_MODE_PROVIDERS || "";
    for (const part of providerConfig.split(",").filter(Boolean)) {
        const [provider, mode] = part.split(":");
        if (provider && mode) {
            providerOverrides[provider.trim()] = parseMode(mode.trim());
        }
    }

    // Parse operation overrides from SANDBOX_MODE_OPERATIONS
    // Format: "slack:sendMessage:sandbox,github:createIssue:passthrough"
    const operationOverrides: SandboxConfig["operationOverrides"] = {};
    const operationConfig = process.env.SANDBOX_MODE_OPERATIONS || "";
    for (const part of operationConfig.split(",").filter(Boolean)) {
        const parts = part.split(":");
        if (parts.length >= 3) {
            const [provider, operation, mode] = parts;
            const key = `${provider.trim()}:${operation.trim()}`;
            operationOverrides[key] = parseMode(mode.trim());
        }
    }

    return {
        enabled,
        fallbackBehavior,
        providerOverrides,
        operationOverrides
    };
}
