import { FastifyInstance } from "fastify";
import { apiKeyAuthMiddleware } from "../../middleware/api-key-auth";
import { publicApiRateLimiterMiddleware } from "../../middleware/public-api-rate-limiter";

// Import route modules
import { agentsV1Routes } from "./agents";
import { executionsV1Routes } from "./executions";
import { knowledgeBasesV1Routes } from "./knowledge-bases";
import { threadsV1Routes } from "./threads";
import { triggersV1Routes } from "./triggers";
import { webhooksV1Routes } from "./webhooks";
import { workflowsV1Routes } from "./workflows";

/**
 * Public API v1 routes.
 *
 * All routes require API key authentication and are subject to rate limiting.
 * Individual routes may require specific scopes.
 */
export async function publicApiV1Routes(fastify: FastifyInstance): Promise<void> {
    // Apply API key authentication to all v1 routes
    fastify.addHook("preHandler", apiKeyAuthMiddleware);

    // Apply rate limiting after authentication
    fastify.addHook("preHandler", publicApiRateLimiterMiddleware);

    // Register resource routes
    await fastify.register(workflowsV1Routes, { prefix: "/workflows" });
    await fastify.register(executionsV1Routes, { prefix: "/executions" });
    await fastify.register(agentsV1Routes, { prefix: "/agents" });
    await fastify.register(threadsV1Routes, { prefix: "/threads" });
    await fastify.register(triggersV1Routes, { prefix: "/triggers" });
    await fastify.register(knowledgeBasesV1Routes, { prefix: "/knowledge-bases" });
    await fastify.register(webhooksV1Routes, { prefix: "/webhooks" });
}
