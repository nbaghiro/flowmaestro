/**
 * Connection Model
 * Represents stored connections for external services (API keys, OAuth tokens, etc.)
 */

import type {
    ConnectionMethod,
    ConnectionStatus,
    OAuth2TokenData,
    ApiKeyData,
    BasicAuthData,
    CustomHeaderData,
    TelnyxConnectionData,
    DatabaseConnectionData,
    ConnectionData,
    ConnectionMetadata,
    ConnectionCapabilities
} from "@flowmaestro/shared";
import {
    isOAuth2TokenData,
    isApiKeyData,
    isBasicAuthData,
    isTelnyxConnectionData,
    isDatabaseConnectionData
} from "@flowmaestro/shared";

export type {
    ConnectionMethod,
    ConnectionStatus,
    OAuth2TokenData,
    ApiKeyData,
    BasicAuthData,
    CustomHeaderData,
    TelnyxConnectionData,
    DatabaseConnectionData,
    ConnectionData,
    ConnectionMetadata,
    ConnectionCapabilities
};

export {
    isOAuth2TokenData,
    isApiKeyData,
    isBasicAuthData,
    isTelnyxConnectionData,
    isDatabaseConnectionData
};

/**
 * Connection model as stored in database
 */
export interface ConnectionModel {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    encrypted_data: string; // Encrypted JSON string
    metadata: ConnectionMetadata;
    status: ConnectionStatus;
    capabilities: ConnectionCapabilities;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Connection with decrypted data (only used in memory, never stored)
 */
export interface ConnectionWithData extends Omit<ConnectionModel, "encrypted_data"> {
    data: ConnectionData;
}

/**
 * Input for creating a new connection
 */
export interface CreateConnectionInput {
    user_id: string;
    workspace_id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    data: ConnectionData; // Will be encrypted before storage
    metadata?: ConnectionMetadata;
    status?: ConnectionStatus;
    capabilities?: ConnectionCapabilities;
}

/**
 * Input for updating a connection
 */
export interface UpdateConnectionInput {
    name?: string;
    data?: ConnectionData; // Will be encrypted before storage
    metadata?: ConnectionMetadata;
    status?: ConnectionStatus;
    capabilities?: ConnectionCapabilities;
}

/**
 * Connection summary (safe to send to frontend, no sensitive data)
 */
export interface ConnectionSummary {
    id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    status: ConnectionStatus;
    metadata: ConnectionMetadata;
    capabilities: ConnectionCapabilities;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
