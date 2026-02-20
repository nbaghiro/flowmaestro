/**
 * Shared test setup for Extension route tests
 */

import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify, { FastifyInstance } from "fastify";
import {
    closeTestServer,
    InjectResponse
} from "../../../../../__tests__/helpers/fastify-test-client";

// Mock repositories
export const mockUserRepo = {
    findById: jest.fn(),
    findByEmailOrGoogleId: jest.fn(),
    findByEmailOrMicrosoftId: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

export const mockWorkspaceRepo = {
    findById: jest.fn(),
    create: jest.fn()
};

export const mockWorkspaceMemberRepo = {
    findByUserId: jest.fn(),
    create: jest.fn()
};

export const mockWorkflowRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn()
};

export const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkspaceId: jest.fn()
};

export const mockKnowledgeBaseRepo = {
    findByWorkspaceId: jest.fn()
};

export const mockExecutionRepo = {
    create: jest.fn(),
    update: jest.fn()
};

export const mockThreadRepo = {
    findByIdAndWorkspaceId: jest.fn(),
    create: jest.fn()
};

export const mockAgentExecutionRepo = {
    create: jest.fn(),
    update: jest.fn(),
    getMessagesByThread: jest.fn()
};

export const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
    }
};

// Mock global fetch for OAuth
export const mockFetch = jest.fn();

export const TEST_JWT_SECRET = "test-jwt-secret-for-extension-tests";

/**
 * Helper to wrap fastify.inject response to match InjectResponse type
 */
export function wrapResponse(
    response: Awaited<ReturnType<FastifyInstance["inject"]>>
): InjectResponse {
    return {
        statusCode: response.statusCode,
        headers: response.headers as Record<string, string>,
        payload: response.payload,
        json: <T = Record<string, unknown>>() => JSON.parse(response.payload) as T
    };
}

/**
 * Create a test server with extension routes registered
 */
export async function createExtensionTestServer(): Promise<FastifyInstance> {
    const fastify = Fastify({ logger: false });

    await fastify.register(cors, { origin: true });
    await fastify.register(jwt, {
        secret: TEST_JWT_SECRET,
        sign: { expiresIn: "1h" }
    });
    await fastify.register(multipart);

    // Import and register extension routes
    const { extensionRoutes } = await import("../index");
    const { errorHandler } = await import("../../../middleware");

    fastify.setErrorHandler(errorHandler);
    await fastify.register(extensionRoutes, { prefix: "/extension" });

    return fastify;
}

/**
 * Setup default mock behaviors
 */
export function setupDefaultMocks(): void {
    mockWorkspaceMemberRepo.findByUserId.mockResolvedValue([{ workspace_id: "test-workspace-id" }]);
    mockWorkspaceRepo.findById.mockResolvedValue({
        id: "test-workspace-id",
        name: "Test Workspace",
        deleted_at: null
    });
}

/**
 * Close test server helper
 */
export { closeTestServer };
