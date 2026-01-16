import type { PermissionLevel, PermissionDecision } from "@flowmaestro/shared";
import { getSettings, updateSettings } from "./storage";

/**
 * Check if a domain is blocked
 */
export function isDomainBlocked(domain: string, blockedDomains: string[]): boolean {
    return blockedDomains.some((blocked) => {
        if (blocked.startsWith("*.")) {
            // Wildcard match
            const suffix = blocked.slice(1); // Remove *
            return domain.endsWith(suffix) || domain === blocked.slice(2);
        }
        return domain === blocked || domain.endsWith(`.${blocked}`);
    });
}

/**
 * Get permission level for a domain
 */
export async function getPermissionLevel(domain: string): Promise<PermissionLevel> {
    const settings = await getSettings();

    // Check if blocked
    if (isDomainBlocked(domain, settings.permissions.blockedDomains)) {
        return "none";
    }

    // Check site-specific permission
    if (settings.permissions.sitePermissions[domain]) {
        return settings.permissions.sitePermissions[domain];
    }

    // Return default
    return settings.permissions.defaultLevel;
}

/**
 * Set permission level for a domain
 */
export async function setPermissionLevel(domain: string, level: PermissionLevel): Promise<void> {
    const settings = await getSettings();

    settings.permissions.sitePermissions[domain] = level;

    // Add to recent decisions
    const decision: PermissionDecision = {
        action: "read_page",
        domain,
        level,
        grantedAt: new Date().toISOString()
    };

    settings.permissions.recentDecisions = [
        decision,
        ...settings.permissions.recentDecisions.slice(0, 49) // Keep last 50
    ];

    await updateSettings(settings);
}

/**
 * Check if permission is needed for a domain
 */
export async function needsPermission(domain: string): Promise<boolean> {
    const level = await getPermissionLevel(domain);
    return level === "none";
}

/**
 * Grant one-time permission for a domain
 */
export async function grantOneTimePermission(domain: string): Promise<void> {
    const settings = await getSettings();

    const decision: PermissionDecision = {
        action: "read_page",
        domain,
        level: "once",
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    };

    settings.permissions.recentDecisions = [
        decision,
        ...settings.permissions.recentDecisions.slice(0, 49)
    ];

    await updateSettings(settings);
}

/**
 * Check if there's a valid one-time permission
 */
export async function hasValidOneTimePermission(domain: string): Promise<boolean> {
    const settings = await getSettings();

    const decision = settings.permissions.recentDecisions.find(
        (d) => d.domain === domain && d.level === "once"
    );

    if (!decision) return false;
    if (!decision.expiresAt) return false;

    return new Date(decision.expiresAt) > new Date();
}

/**
 * Clear expired one-time permissions
 */
export async function clearExpiredPermissions(): Promise<void> {
    const settings = await getSettings();
    const now = new Date();

    settings.permissions.recentDecisions = settings.permissions.recentDecisions.filter((d) => {
        if (d.level !== "once") return true;
        if (!d.expiresAt) return false;
        return new Date(d.expiresAt) > now;
    });

    await updateSettings(settings);
}

/**
 * Add domain to blocked list
 */
export async function blockDomain(domain: string): Promise<void> {
    const settings = await getSettings();

    if (!settings.permissions.blockedDomains.includes(domain)) {
        settings.permissions.blockedDomains.push(domain);
        await updateSettings(settings);
    }
}

/**
 * Remove domain from blocked list
 */
export async function unblockDomain(domain: string): Promise<void> {
    const settings = await getSettings();

    settings.permissions.blockedDomains = settings.permissions.blockedDomains.filter(
        (d) => d !== domain
    );

    await updateSettings(settings);
}

/**
 * Check if domain is a sensitive site (banking, auth, etc.)
 */
export function isSensitiveDomain(domain: string): boolean {
    const sensitivePatterns = [
        /bank/i,
        /banking/i,
        /financial/i,
        /paypal/i,
        /venmo/i,
        /stripe\.com$/i,
        /auth0\.com$/i,
        /okta\.com$/i,
        /accounts\.google\.com$/i,
        /login\.microsoftonline\.com$/i,
        /id\.apple\.com$/i
    ];

    return sensitivePatterns.some((pattern) => pattern.test(domain));
}
