/**
 * Router Node Handler
 *
 * LLM-based classification handler that routes workflow execution
 * to predefined branches based on content analysis.
 *
 * Uses the unified @flowmaestro/ai SDK for all provider integrations.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { getAIClient, type AIProvider } from "../../../../../services/llm";
import {
    withHeartbeat,
    RouterNodeConfigSchema,
    validateOrThrow,
    activityLogger,
    interpolateVariables
} from "../../../../core";
import { getExecutionContext } from "../../../../core/services/context";
import {
    BaseNodeHandler,
    type NodeHandlerInput,
    type NodeHandlerOutput,
    type TokenUsage
} from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface RouterNodeConfig {
    provider: "openai" | "anthropic" | "google";
    model: string;
    connectionId?: string;
    systemPrompt?: string;
    prompt: string;
    routes: Array<{
        value: string;
        label?: string;
        description?: string;
    }>;
    defaultRoute?: string;
    temperature?: number;
    outputVariable: string;
}

export interface RouterNodeResult {
    selectedRoute: string;
    routeLabel?: string;
    confidence: number;
    reasoning?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}

// ============================================================================
// CLASSIFICATION PROMPT BUILDER
// ============================================================================

function buildClassificationPrompt(config: RouterNodeConfig, interpolatedPrompt: string): string {
    const routeDescriptions = config.routes
        .map((route, index) => {
            const label = route.label || route.value;
            const desc = route.description ? `: ${route.description}` : "";
            return `${index + 1}. "${route.value}" - ${label}${desc}`;
        })
        .join("\n");

    return `You are a classification assistant. Your task is to analyze the given input and classify it into exactly one of the predefined categories.

INPUT TO CLASSIFY:
${interpolatedPrompt}

AVAILABLE CATEGORIES:
${routeDescriptions}

INSTRUCTIONS:
1. Analyze the input carefully
2. Select the most appropriate category from the list above
3. Respond with ONLY a JSON object in this exact format:
{
  "selectedRoute": "<exact value from the category list>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of your choice>"
}

IMPORTANT:
- The "selectedRoute" must be EXACTLY one of the values listed above: ${config.routes.map((r) => `"${r.value}"`).join(", ")}
- Do not include any text outside the JSON object
- Respond with valid JSON only`;
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

function parseClassificationResponse(
    response: string,
    config: RouterNodeConfig
): { selectedRoute: string; confidence: number; reasoning?: string } {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        activityLogger.warn("No JSON found in router response, using default route", {
            response: response.substring(0, 200)
        });
        return {
            selectedRoute: config.defaultRoute || config.routes[0].value,
            confidence: 0.5,
            reasoning: "Failed to parse LLM response"
        };
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]) as {
            selectedRoute?: string;
            confidence?: number;
            reasoning?: string;
        };

        // Validate selectedRoute is one of the valid routes
        const validRoutes = config.routes.map((r) => r.value);
        if (!parsed.selectedRoute || !validRoutes.includes(parsed.selectedRoute)) {
            activityLogger.warn("Invalid route in response, using default", {
                selectedRoute: parsed.selectedRoute,
                validRoutes
            });
            return {
                selectedRoute: config.defaultRoute || config.routes[0].value,
                confidence: parsed.confidence ?? 0.5,
                reasoning: parsed.reasoning || "LLM returned invalid route"
            };
        }

        return {
            selectedRoute: parsed.selectedRoute,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
            reasoning: parsed.reasoning
        };
    } catch (parseError) {
        activityLogger.warn("Failed to parse JSON from router response", {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            response: response.substring(0, 200)
        });
        return {
            selectedRoute: config.defaultRoute || config.routes[0].value,
            confidence: 0.5,
            reasoning: "Failed to parse LLM response JSON"
        };
    }
}

// ============================================================================
// CLASSIFICATION USING UNIFIED SDK
// ============================================================================

async function classifyWithUnifiedSDK(
    config: RouterNodeConfig,
    classificationPrompt: string
): Promise<RouterNodeResult> {
    const ai = getAIClient();
    const provider = config.provider as AIProvider;

    const response = await ai.text.complete({
        provider,
        model: config.model,
        systemPrompt: config.systemPrompt,
        prompt: classificationPrompt,
        temperature: config.temperature ?? 0,
        maxTokens: 500,
        connectionId: config.connectionId
    });

    const parsed = parseClassificationResponse(response.text, config);
    const route = config.routes.find((r) => r.value === parsed.selectedRoute);

    return {
        selectedRoute: parsed.selectedRoute,
        routeLabel: route?.label,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        usage: response.metadata.usage
            ? {
                  promptTokens: response.metadata.usage.promptTokens ?? 0,
                  completionTokens: response.metadata.usage.completionTokens ?? 0,
                  totalTokens: response.metadata.usage.totalTokens ?? 0
              }
            : undefined,
        model: config.model,
        provider: config.provider
    };
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Router node - classifies input into predefined routes using LLM.
 */
export async function executeRouterNode(
    config: unknown,
    context: JsonObject
): Promise<{ result: JsonObject; selectedRoute: string }> {
    const validatedConfig = validateOrThrow(RouterNodeConfigSchema, config, "Router");

    const interpolatedPrompt = interpolateVariables(validatedConfig.prompt, context);
    const classificationPrompt = buildClassificationPrompt(
        validatedConfig as RouterNodeConfig,
        interpolatedPrompt
    );

    activityLogger.info("Calling LLM for classification via unified AI SDK", {
        provider: validatedConfig.provider,
        model: validatedConfig.model,
        routeCount: validatedConfig.routes.length
    });

    const routerResult = await withHeartbeat(
        "router",
        async (heartbeat) => {
            heartbeat.update({
                step: "classifying",
                provider: validatedConfig.provider,
                model: validatedConfig.model
            });

            const result = await classifyWithUnifiedSDK(
                validatedConfig as RouterNodeConfig,
                classificationPrompt
            );

            heartbeat.update({
                step: "completed",
                percentComplete: 100,
                selectedRoute: result.selectedRoute
            });

            return result;
        },
        5000
    );

    activityLogger.info("Router classification completed", {
        selectedRoute: routerResult.selectedRoute,
        confidence: routerResult.confidence
    });

    return {
        result: {
            [validatedConfig.outputVariable]: routerResult.selectedRoute,
            _routerMetadata: {
                selectedRoute: routerResult.selectedRoute,
                routeLabel: routerResult.routeLabel,
                confidence: routerResult.confidence,
                reasoning: routerResult.reasoning,
                model: routerResult.model,
                provider: routerResult.provider
            }
        } as JsonObject,
        selectedRoute: routerResult.selectedRoute
    };
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Router node type.
 * Classifies input into predefined routes using LLM and signals workflow routing.
 */
export class RouterNodeHandler extends BaseNodeHandler {
    readonly name = "RouterNodeHandler";
    readonly supportedNodeTypes = ["router"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);
        const config = validateOrThrow(RouterNodeConfigSchema, input.nodeConfig, "Router");

        const { result, selectedRoute } = await executeRouterNode(input.nodeConfig, context);

        // Determine which routes to skip (all except selected)
        const branchesToSkip = config.routes
            .filter((r) => r.value !== selectedRoute)
            .map((r) => r.value);

        let tokenUsage: TokenUsage | undefined;

        const metadata = result._routerMetadata as
            | {
                  usage?: {
                      promptTokens?: number;
                      completionTokens?: number;
                      totalTokens?: number;
                  };
                  model?: string;
                  provider?: string;
              }
            | undefined;

        if (metadata?.usage) {
            tokenUsage = {
                promptTokens: metadata.usage.promptTokens,
                completionTokens: metadata.usage.completionTokens,
                totalTokens: metadata.usage.totalTokens,
                model: String(metadata.model || ""),
                provider: String(metadata.provider || "")
            };
        }

        return this.selectBranch(result, selectedRoute, branchesToSkip, {
            durationMs: Date.now() - startTime,
            tokenUsage
        });
    }
}

/**
 * Factory function for creating Router handler.
 */
export function createRouterNodeHandler(): RouterNodeHandler {
    return new RouterNodeHandler();
}
