import { createServiceLogger } from "../../../core/logging";
import { getAllBuiltInTools, getBuiltInToolsByCategory } from "../../../services/tools";
import type { ToolCategory } from "../../../services/tools";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("ToolsAPI");

/**
 * Response format for built-in tools (API-facing, excludes execute function)
 */
interface BuiltInToolResponse {
    name: string;
    displayName: string;
    description: string;
    category: ToolCategory;
    riskLevel: "none" | "low" | "medium" | "high";
    inputSchema: Record<string, unknown>;
    enabledByDefault: boolean;
    creditCost: number;
    tags?: string[];
    requiresSandbox?: boolean;
}

interface ListBuiltInToolsQuery {
    category?: ToolCategory;
}

/**
 * GET /tools/builtin
 *
 * List all available built-in tools that can be added to agents.
 * Query params:
 *   - category: Filter by tool category (web, code, file, data, media)
 */
export async function listBuiltInToolsHandler(
    request: FastifyRequest<{ Querystring: ListBuiltInToolsQuery }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const { category } = request.query;

        // Get tools - either filtered by category or all
        const tools = category ? getBuiltInToolsByCategory(category) : getAllBuiltInTools();

        // Map to API response format (exclude execute function)
        const response: BuiltInToolResponse[] = tools.map((tool) => ({
            name: tool.name,
            displayName: tool.displayName,
            description: tool.description,
            category: tool.category,
            riskLevel: tool.riskLevel,
            inputSchema: tool.inputSchema as Record<string, unknown>,
            enabledByDefault: tool.enabledByDefault,
            creditCost: tool.creditCost,
            tags: tool.tags
        }));

        logger.debug(
            { count: response.length, category: category || "all" },
            "Listed built-in tools"
        );

        reply.code(200).send({
            success: true,
            data: response
        });
    } catch (error) {
        logger.error({ error }, "Error listing built-in tools");

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to list built-in tools"
            }
        });
    }
}
