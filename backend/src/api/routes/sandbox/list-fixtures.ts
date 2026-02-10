/**
 * List Fixtures Handler
 *
 * Returns a summary of all fixtures for a given provider.
 */

import { createServiceLogger } from "../../../core/logging";
import { fixtureRegistry } from "../../../integrations/sandbox";
import { loadAllFixtures } from "../../../integrations/sandbox/fixtureLoader";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("SandboxListFixtures");

export interface FixtureSummary {
    operationId: string;
    validCaseCount: number;
    errorCaseCount: number;
    edgeCaseCount: number;
    hasFilterableData: boolean;
}

export async function listFixturesHandler(
    request: FastifyRequest<{ Params: { provider: string } }>,
    reply: FastifyReply
): Promise<void> {
    const { provider } = request.params;

    try {
        // Ensure fixtures are loaded
        await loadAllFixtures();

        // Get all fixtures for this provider
        const fixtures = fixtureRegistry.getByProvider(provider);

        if (fixtures.length === 0) {
            return reply.code(200).send({
                success: true,
                data: {
                    provider,
                    operations: [],
                    totalOperations: 0
                }
            });
        }

        // Map to summaries
        const operations: FixtureSummary[] = fixtures.map((fixture) => ({
            operationId: fixture.operationId,
            validCaseCount: fixture.validCases.length,
            errorCaseCount: fixture.errorCases.length,
            edgeCaseCount: fixture.edgeCases?.length || 0,
            hasFilterableData: !!fixture.filterableData
        }));

        // Sort by operation ID
        operations.sort((a, b) => a.operationId.localeCompare(b.operationId));

        reply.code(200).send({
            success: true,
            data: {
                provider,
                operations,
                totalOperations: operations.length
            }
        });
    } catch (error) {
        logger.error({ error, provider }, "Error listing fixtures");

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to list fixtures"
            }
        });
    }
}
