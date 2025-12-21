import { z } from "zod";

// Connection method enum
export const connectionMethodSchema = z.enum(["api_key", "oauth2", "basic_auth", "custom"]);

// Connection status enum
export const connectionStatusSchema = z.enum(["active", "invalid", "expired", "revoked"]);

// API Key data schema
const apiKeyDataSchema = z.object({
    api_key: z.string(),
    api_secret: z.string().optional()
});

// OAuth2 token data schema
const oauth2TokenDataSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    token_type: z.string(),
    expires_in: z.number().optional(),
    scope: z.string().optional()
});

// Basic auth data schema
const basicAuthDataSchema = z.object({
    username: z.string(),
    password: z.string()
});

// Custom header data schema
const customHeaderDataSchema = z.object({
    headers: z.record(z.string())
});

// Union of all connection data types
const connectionDataSchema = z.union([
    apiKeyDataSchema,
    oauth2TokenDataSchema,
    basicAuthDataSchema,
    customHeaderDataSchema
]);

// Connection metadata schema
const connectionMetadataSchema = z
    .object({
        scopes: z.array(z.string()).optional(),
        expires_at: z.number().optional(),
        account_info: z
            .object({
                email: z.string().optional(),
                username: z.string().optional(),
                workspace: z.string().optional()
            })
            .catchall(z.any())
            .optional(),
        provider_config: z.record(z.any()).optional()
    })
    .optional();

// Connection capabilities schema
const connectionCapabilitiesSchema = z
    .object({
        permissions: z.array(z.string()).optional(),
        operations: z.array(z.string()).optional(),
        rate_limit: z
            .object({
                requests_per_second: z.number().optional(),
                requests_per_day: z.number().optional()
            })
            .optional()
    })
    .catchall(z.any())
    .optional();

// Create connection request
export const createConnectionSchema = z.object({
    name: z.string().min(1).max(255),
    connection_method: connectionMethodSchema,
    provider: z.string().min(1).max(100),
    data: connectionDataSchema,
    metadata: connectionMetadataSchema,
    status: connectionStatusSchema.optional(),
    capabilities: connectionCapabilitiesSchema
});

// Update connection request
export const updateConnectionSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    data: connectionDataSchema.optional(),
    metadata: connectionMetadataSchema,
    status: connectionStatusSchema.optional(),
    capabilities: connectionCapabilitiesSchema
});

// Query parameters for listing connections
export const listConnectionsQuerySchema = z.object({
    provider: z.string().optional(),
    connection_method: connectionMethodSchema.optional(),
    status: connectionStatusSchema.optional(),
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(100))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional()
});

// URL parameters
export const connectionIdParamSchema = z.object({
    id: z.string().uuid()
});

export type CreateConnectionRequest = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionRequest = z.infer<typeof updateConnectionSchema>;
export type ListConnectionsQuery = z.infer<typeof listConnectionsQuerySchema>;
export type ConnectionIdParam = z.infer<typeof connectionIdParamSchema>;
