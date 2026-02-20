/**
 * Shared test utilities for API key route tests.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    closeTestServer,
    createTestUser as baseCreateTestUser,
    authenticatedRequest as baseAuthenticatedRequest,
    unauthenticatedRequest as baseUnauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID,
    mockApiKeyRepo
} from "../../../../../../__tests__/helpers/fastify-test-client";
import type { ApiKeyScope } from "../../../../../storage/models/ApiKey";

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    name?: string;
}

export interface MockApiKey {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: Date | null;
    last_used_at: Date | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    revoked_at: Date | null;
}

export interface MockApiKeyWithSecret extends MockApiKey {
    key: string;
}

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

export { DEFAULT_TEST_WORKSPACE_ID, uuidv4 };

export function createMockApiKey(overrides: Partial<MockApiKey> = {}): MockApiKey {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test API Key",
        key_prefix: overrides.key_prefix || "fm_live_abc",
        key_hash: overrides.key_hash || "hashed_key_value",
        scopes: overrides.scopes || ["workflows:read", "workflows:execute"],
        rate_limit_per_minute: overrides.rate_limit_per_minute ?? 60,
        rate_limit_per_day: overrides.rate_limit_per_day ?? 1000,
        expires_at: overrides.expires_at ?? null,
        last_used_at: overrides.last_used_at ?? null,
        last_used_ip: overrides.last_used_ip ?? null,
        is_active: overrides.is_active ?? true,
        created_at: overrides.created_at || new Date(),
        updated_at: overrides.updated_at || new Date(),
        revoked_at: overrides.revoked_at ?? null
    };
}

export function createMockApiKeyWithSecret(
    overrides: Partial<MockApiKeyWithSecret> = {}
): MockApiKeyWithSecret {
    return {
        ...createMockApiKey(overrides),
        key: overrides.key || "fm_live_abc123def456ghi789jkl012mno345"
    };
}

// ============================================================================
// RESET HELPERS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();
}

// ============================================================================
// SERVER HELPERS
// ============================================================================

export async function createApiKeyTestServer(): Promise<FastifyInstance> {
    return createTestServer();
}

export async function closeApiKeyTestServer(fastify: FastifyInstance): Promise<void> {
    return closeTestServer(fastify);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { mockApiKeyRepo };
export const createTestUser = baseCreateTestUser;
export const authenticatedRequest = baseAuthenticatedRequest;
export const unauthenticatedRequest = baseUnauthenticatedRequest;
