/**
 * Auth0 operation types and interfaces
 */

export interface Auth0UserResponse {
    user_id: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    nickname?: string;
    picture?: string;
    created_at: string;
    updated_at: string;
    identities?: Array<{
        connection: string;
        provider: string;
        user_id: string;
        isSocial: boolean;
    }>;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    blocked?: boolean;
}

export interface Auth0UsersListResponse {
    users: Auth0UserResponse[];
    total?: number;
    start?: number;
    limit?: number;
}

export interface Auth0RoleResponse {
    id: string;
    name: string;
    description?: string;
}

export interface Auth0RolesListResponse {
    roles: Auth0RoleResponse[];
    total?: number;
}

export interface Auth0ConnectionResponse {
    id: string;
    name: string;
    strategy: string;
    enabled_clients?: string[];
}

export interface Auth0ConnectionsListResponse {
    connections: Auth0ConnectionResponse[];
    total?: number;
}
