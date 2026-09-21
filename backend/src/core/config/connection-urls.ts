/**
 * Connection URL parsing for hosted platforms.
 *
 * Managed platforms (Render, Railway, Neon, Upstash, ...) hand out a single
 * DATABASE_URL / REDIS_URL. Self-managed deployments (GKE, local compose) use
 * the individual POSTGRES_* / REDIS_* variables. Both must keep working, so the
 * config layer resolves each field as: explicit individual variable, then the
 * URL, then the default.
 */

export type PostgresSslMode = "disable" | "require" | "verify-full";

export interface ParsedDatabaseUrl {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    sslMode?: PostgresSslMode;
}

export interface ParsedRedisUrl {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    tls?: boolean;
}

function decode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function parsePort(value: string): number | undefined {
    if (!value) {
        return undefined;
    }
    const port = parseInt(value, 10);
    return Number.isFinite(port) ? port : undefined;
}

/**
 * Map a libpq `sslmode` value onto the three modes the app supports.
 * Unknown or missing values return undefined so the caller can fall back.
 */
export function normalizePostgresSslMode(value: string | undefined): PostgresSslMode | undefined {
    switch ((value || "").trim().toLowerCase()) {
        case "disable":
        case "allow":
        case "prefer":
            return "disable";
        case "require":
            return "require";
        case "verify-ca":
        case "verify-full":
            return "verify-full";
        default:
            return undefined;
    }
}

/**
 * Parse `postgres://` or `postgresql://` URLs. Returns an empty object for an
 * empty or unparseable value rather than throwing, since config is evaluated at
 * import time and a bad URL should surface as a connection error with context.
 */
export function parseDatabaseUrl(url: string | undefined): ParsedDatabaseUrl {
    if (!url) {
        return {};
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return {};
    }

    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
        return {};
    }

    const database = parsed.pathname.replace(/^\//, "");

    return {
        host: parsed.hostname || undefined,
        port: parsePort(parsed.port),
        database: database ? decode(database) : undefined,
        user: parsed.username ? decode(parsed.username) : undefined,
        password: parsed.password ? decode(parsed.password) : undefined,
        sslMode: normalizePostgresSslMode(parsed.searchParams.get("sslmode") || undefined)
    };
}

/**
 * Parse `redis://` or `rediss://` URLs (the second form implies TLS).
 */
export function parseRedisUrl(url: string | undefined): ParsedRedisUrl {
    if (!url) {
        return {};
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return {};
    }

    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
        return {};
    }

    return {
        host: parsed.hostname || undefined,
        port: parsePort(parsed.port),
        username: parsed.username ? decode(parsed.username) : undefined,
        password: parsed.password ? decode(parsed.password) : undefined,
        tls: parsed.protocol === "rediss:"
    };
}

export interface RedisConnectionParts {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls: boolean;
}

/**
 * Build the effective URL from resolved parts, so clients that prefer a URL
 * (the `redis` package) and clients that prefer options (ioredis) agree.
 */
export function buildRedisUrl(parts: RedisConnectionParts): string {
    const scheme = parts.tls ? "rediss" : "redis";
    let auth = "";
    if (parts.username || parts.password) {
        auth = `${encodeURIComponent(parts.username || "")}:${encodeURIComponent(parts.password || "")}@`;
    }
    return `${scheme}://${auth}${parts.host}:${parts.port}`;
}

/**
 * Translate the app's ssl mode into the `ssl` option that `pg` expects.
 */
export function postgresSslOption(
    mode: PostgresSslMode | undefined
): boolean | { rejectUnauthorized: boolean } | undefined {
    switch (mode) {
        case "require":
            return { rejectUnauthorized: false };
        case "verify-full":
            return true;
        default:
            return undefined;
    }
}
