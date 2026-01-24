/**
 * Persona Instance Connection Model
 * Tracks which connections/integrations a persona instance has been granted access to
 */

/**
 * Connection requirement for a persona definition
 */
export interface PersonaConnectionRequirement {
    provider: string; // 'github', 'slack', 'google', etc.
    required: boolean; // Must be connected to launch
    reason: string; // Shown to user: "For creating PRs"
    suggested_scopes: string[]; // Recommended permission scopes
}

/**
 * Persona instance connection model
 */
export interface PersonaInstanceConnectionModel {
    id: string;
    instance_id: string;
    connection_id: string;
    granted_scopes: string[];
    created_at: Date;
}

/**
 * Input for creating a new persona instance connection
 */
export interface CreatePersonaInstanceConnectionInput {
    instance_id: string;
    connection_id: string;
    granted_scopes?: string[];
}

/**
 * Input for granting a connection to an instance (from API)
 */
export interface GrantConnectionInput {
    connection_id: string;
    scopes?: string[];
}

/**
 * Connection with provider info for display
 */
export interface PersonaInstanceConnectionWithDetails {
    id: string;
    instance_id: string;
    connection_id: string;
    granted_scopes: string[];
    created_at: Date;
    // Connection details
    connection: {
        id: string;
        name: string;
        provider: string;
        connection_method: string;
    };
}
