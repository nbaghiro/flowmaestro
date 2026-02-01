/**
 * Test Operation Handler
 *
 * Tests an operation with custom params and returns the sandbox response.
 */

import { createServiceLogger } from "../../../core/logging";
import { sandboxDataService } from "../../../integrations/sandbox";
import { loadAllFixtures } from "../../../integrations/sandbox/fixtureLoader";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("SandboxTestOperation");

export async function testOperationHandler(
    request: FastifyRequest<{
        Params: { provider: string };
        Body: { operationId: string; params: Record<string, unknown> };
    }>,
    reply: FastifyReply
): Promise<void> {
    const { provider } = request.params;
    const { operationId, params } = request.body;

    if (!operationId) {
        return reply.code(400).send({
            success: false,
            error: {
                message: "operationId is required"
            }
        });
    }

    try {
        // Ensure fixtures are loaded
        await loadAllFixtures();

        // Get sandbox response
        const response = await sandboxDataService.getSandboxResponse(
            provider,
            operationId,
            params || {}
        );

        if (!response) {
            return reply.code(404).send({
                success: false,
                error: {
                    message: `No sandbox data found for ${provider}:${operationId}`
                }
            });
        }

        reply.code(200).send({
            success: true,
            data: {
                operationId,
                provider,
                params: params || {},
                response
            }
        });
    } catch (error) {
        logger.error({ error, provider, operationId, params }, "Error testing operation");

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to test operation"
            }
        });
    }
}
