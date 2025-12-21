/**
 * Connection Types for FlowMaestro
 * These types are shared between frontend and backend for external service connections
 */

import type { JsonValue } from "./types";

export type ConnectionMethod = "api_key" | "oauth2" | "basic_auth" | "custom";
export type ConnectionStatus = "active" | "invalid" | "expired" | "revoked";

/**
 * Well-known provider names
 */
export type ConnectionProvider =
    | "openai"
    | "anthropic"
    | "google"
    | "slack"
    | "github"
    | "telnyx"
    | "deepgram"
    | "elevenlabs"
    | string; // Allow custom providers

/**
 * OAuth 2.0 token data
 */
export interface OAuth2TokenData {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
}

/**
 * API key connection data
 */
export interface ApiKeyData {
    api_key: string;
    api_secret?: string; // For providers that need both key and secret
}

/**
 * Basic auth connection data
 */
export interface BasicAuthData {
    username: string;
    password: string;
}

/**
 * Custom header connection data
 */
export interface CustomHeaderData {
    headers: Record<string, string>;
}

/**
 * Telnyx SIP provider connection data
 */
export interface TelnyxConnectionData {
    api_key: string;
    api_secret?: string;
    public_key?: string; // For webhook signature verification
    sip_connection_id?: string;
    messaging_profile_id?: string;
}

/**
 * Database connection data (PostgreSQL, MySQL, MongoDB, etc.)
 */
export interface DatabaseConnectionData {
    // Option 1: Connection string (simplest)
    connection_string?: string;

    // Option 2: Individual credentials (more flexible)
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;

    // SSL/TLS configuration
    ssl_enabled?: boolean;
    ssl_cert?: string;
    ssl_key?: string;
    ssl_ca?: string;

    // Connection options
    connection_timeout?: number;
    pool_size?: number;
    max_connections?: number;

    // Provider-specific options stored as JSON
    options?: Record<string, unknown>;
}

/**
 * Union of all connection data types
 */
export type ConnectionData =
    | ApiKeyData
    | OAuth2TokenData
    | BasicAuthData
    | CustomHeaderData
    | TelnyxConnectionData
    | DatabaseConnectionData;

/**
 * Connection metadata (non-sensitive)
 */
export interface ConnectionMetadata {
    scopes?: string[];
    expires_at?: number; // Unix timestamp for OAuth tokens
    account_info?: {
        email?: string;
        username?: string;
        workspace?: string;
        [key: string]: JsonValue | undefined;
    };
    provider_config?: Record<string, JsonValue>;
}

/**
 * Connection capabilities - what this connection can do
 */
export interface ConnectionCapabilities {
    permissions?: string[]; // List of permissions/scopes
    operations?: string[]; // Available operations (e.g., "read", "write", "execute")
    rate_limit?: {
        requests_per_second?: number;
        requests_per_day?: number;
    };
    [key: string]: JsonValue | undefined; // Provider-specific capabilities
}

/**
 * Connection summary (safe to send to frontend, no sensitive data)
 */
export interface ConnectionSummary {
    id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: ConnectionProvider;
    status: ConnectionStatus;
    metadata: ConnectionMetadata;
    capabilities: ConnectionCapabilities;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Type guard to check if connection data is OAuth2
 */
export function isOAuth2TokenData(data: ConnectionData): data is OAuth2TokenData {
    return "access_token" in data && "token_type" in data;
}

/**
 * Type guard to check if connection data is API key
 */
export function isApiKeyData(data: ConnectionData): data is ApiKeyData {
    return "api_key" in data && !("access_token" in data);
}

/**
 * Type guard to check if connection data is Basic Auth
 */
export function isBasicAuthData(data: ConnectionData): data is BasicAuthData {
    return "username" in data && "password" in data && !("server_url" in data);
}

/**
 * Type guard to check if connection data is Telnyx
 */
export function isTelnyxConnectionData(data: ConnectionData): data is TelnyxConnectionData {
    return "api_key" in data && ("sip_connection_id" in data || "messaging_profile_id" in data);
}

/**
 * Type guard to check if connection data is Database
 */
export function isDatabaseConnectionData(data: ConnectionData): data is DatabaseConnectionData {
    return (
        "connection_string" in data ||
        ("host" in data && "database" in data) ||
        ("username" in data && "database" in data)
    );
}
