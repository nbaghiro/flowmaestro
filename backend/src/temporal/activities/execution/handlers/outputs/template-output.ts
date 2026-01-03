/**
 * Template Output Node Execution
 *
 * Renders markdown templates with variable interpolation.
 * Supports output as raw markdown or converted HTML.
 */

import { marked } from "marked";
import type { JsonObject } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    TemplateOutputNodeConfigSchema,
    validateOrThrow,
    interpolateWithObjectSupport,
    getExecutionContext,
    type TemplateOutputNodeConfig
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "TemplateOutput" });

// ============================================================================
// TYPES
// ============================================================================

export type { TemplateOutputNodeConfig };

export interface TemplateOutputNodeResult {
    outputs: JsonObject;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Template Output node - renders markdown template with variable interpolation
 */
export async function executeTemplateOutputNode(
    config: unknown,
    context: JsonObject
): Promise<JsonObject> {
    const validatedConfig = validateOrThrow(
        TemplateOutputNodeConfigSchema,
        config,
        "TemplateOutput"
    );

    logger.debug("Executing template output node", {
        outputName: validatedConfig.outputName,
        outputFormat: validatedConfig.outputFormat,
        templateLength: validatedConfig.template.length,
        contextKeys: Object.keys(context)
    });

    // Interpolate variables in the template
    const interpolated = interpolateWithObjectSupport(validatedConfig.template, context);
    const interpolatedString =
        typeof interpolated === "string" ? interpolated : String(interpolated);

    let outputValue: string;

    if (validatedConfig.outputFormat === "html") {
        // Convert markdown to HTML
        outputValue = await marked.parse(interpolatedString);
    } else {
        // Return raw markdown
        outputValue = interpolatedString;
    }

    logger.info("Template output rendered", {
        outputName: validatedConfig.outputName,
        outputFormat: validatedConfig.outputFormat,
        outputLength: outputValue.length
    });

    return {
        [validatedConfig.outputName]: outputValue
    } as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Template Output node type.
 */
export class TemplateOutputNodeHandler extends BaseNodeHandler {
    readonly name = "TemplateOutputNodeHandler";
    readonly supportedNodeTypes = ["templateOutput"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeTemplateOutputNode(input.nodeConfig, context);

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Template Output handler.
 */
export function createTemplateOutputNodeHandler(): TemplateOutputNodeHandler {
    return new TemplateOutputNodeHandler();
}
