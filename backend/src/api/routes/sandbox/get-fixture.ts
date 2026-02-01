/**
 * Get Fixture Handler
 *
 * Returns the full fixture details for a specific operation.
 */

import { createServiceLogger } from "../../../core/logging";
import { fixtureRegistry } from "../../../integrations/sandbox";
import { loadAllFixtures } from "../../../integrations/sandbox/fixtureLoader";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("SandboxGetFixture");

export async function getFixtureHandler(
    request: FastifyRequest<{ Params: { provider: string; operationId: string } }>,
    reply: FastifyReply
): Promise<void> {
    const { provider, operationId } = request.params;

    try {
        // Ensure fixtures are loaded
        await loadAllFixtures();

        // Get the fixture
        const fixture = fixtureRegistry.get(provider, operationId);

        if (!fixture) {
            return reply.code(404).send({
                success: false,
                error: {
                    message: `No fixture found for ${provider}:${operationId}`
                }
            });
        }

        // Return fixture with safe serialization
        // Strip internal metadata fields (prefixed with _) from filterable records
        const sanitizedFixture = {
            operationId: fixture.operationId,
            provider: fixture.provider,
            validCases: fixture.validCases.map((c) => ({
                name: c.name,
                description: c.description,
                input: c.input,
                expectedOutput: c.expectedOutput
            })),
            errorCases: fixture.errorCases.map((c) => ({
                name: c.name,
                description: c.description,
                input: c.input,
                expectedError: c.expectedError
            })),
            edgeCases: fixture.edgeCases?.map((c) => ({
                name: c.name,
                description: c.description,
                input: c.input,
                expectedOutput: c.expectedOutput
            })),
            filterableData: fixture.filterableData
                ? {
                      recordsField: fixture.filterableData.recordsField,
                      offsetField: fixture.filterableData.offsetField,
                      defaultPageSize: fixture.filterableData.defaultPageSize,
                      maxPageSize: fixture.filterableData.maxPageSize,
                      pageSizeParam: fixture.filterableData.pageSizeParam,
                      offsetParam: fixture.filterableData.offsetParam,
                      filterConfig: fixture.filterableData.filterConfig,
                      recordCount: fixture.filterableData.records.length,
                      // Include sample records (first 5) for preview
                      sampleRecords: fixture.filterableData.records.slice(0, 5).map((record) => {
                          // Strip internal fields
                          const clean: Record<string, unknown> = {};
                          for (const [key, value] of Object.entries(record)) {
                              if (!key.startsWith("_")) {
                                  clean[key] = value;
                              }
                          }
                          return clean;
                      })
                  }
                : null
        };

        reply.code(200).send({
            success: true,
            data: sanitizedFixture
        });
    } catch (error) {
        logger.error({ error, provider, operationId }, "Error getting fixture");

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to get fixture"
            }
        });
    }
}
