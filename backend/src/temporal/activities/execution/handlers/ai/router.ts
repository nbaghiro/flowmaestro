/**
 * Router Node Handler
 *
 * LLM-based classification handler that routes workflow execution
 * to predefined branches based on content analysis.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { ConnectionRepository } from "../../../../../storage/repositories/ConnectionRepository";
import {
    ConfigurationError,
    NotFoundError,
    ValidationError,
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
import type { ApiKeyData } from "../../../../../storage/models/Connection";

const connectionRepository = new ConnectionRepository();

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
// RETRY LOGIC
// ============================================================================

const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

function isRetryableError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const err = error as Record<string, unknown>;
    const retryableStatusCodes = [429, 503, 529];

    if (typeof err.status === "number" && retryableStatusCodes.includes(err.status)) {
        return true;
    }

    if (
        typeof err.type === "string" &&
        ["overloaded_error", "rate_limit_error"].includes(err.type)
    ) {
        return true;
    }

    if (typeof err.message === "string") {
        const message = err.message.toLowerCase();
        if (
            message.includes("overloaded") ||
            message.includes("rate limit") ||
            message.includes("too many requests")
        ) {
            return true;
        }
    }

    return false;
}

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error;

            if (!isRetryableError(error)) {
                throw error;
            }

            if (attempt >= RETRY_CONFIG.maxRetries) {
                activityLogger.error(
                    "Max retries exceeded",
                    error instanceof Error ? error : new Error(String(error)),
                    { context, maxRetries: RETRY_CONFIG.maxRetries }
                );
                throw error;
            }

            const delay = Math.min(
                RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
                RETRY_CONFIG.maxDelayMs
            );

            activityLogger.warn("Retryable error, retrying", {
                context,
                delayMs: delay,
                attempt: attempt + 1,
                maxRetries: RETRY_CONFIG.maxRetries
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// ============================================================================
// API KEY HELPER
// ============================================================================

async function getApiKey(
    connectionId: string | undefined,
    provider: string,
    envVarName: string
): Promise<string> {
    if (connectionId) {
        const connection = await connectionRepository.findByIdWithData(connectionId);
        if (!connection) {
            throw new NotFoundError("Connection", connectionId);
        }
        if (connection.provider !== provider) {
            throw new ValidationError(
                `expected ${provider}, got ${connection.provider}`,
                "provider"
            );
        }
        if (connection.status !== "active") {
            throw new ValidationError(
                `Connection is not active (status: ${connection.status})`,
                "status"
            );
        }
        const data = connection.data as ApiKeyData;
        if (!data.api_key) {
            throw new ConfigurationError("API key not found in connection data", "api_key");
        }
        return data.api_key;
    }

    const apiKey = process.env[envVarName];
    if (!apiKey) {
        throw new ConfigurationError(
            `No connection provided and ${envVarName} environment variable is not set.`,
            envVarName
        );
    }
    return apiKey;
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
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function classifyWithOpenAI(
    config: RouterNodeConfig,
    classificationPrompt: string
): Promise<RouterNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "openai", "OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey });

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (config.systemPrompt) {
        messages.push({ role: "system", content: config.systemPrompt });
    }
    messages.push({ role: "user", content: classificationPrompt });

    return withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: config.model,
            messages,
            temperature: config.temperature ?? 0,
            max_tokens: 500,
            response_format: { type: "json_object" }
        });

        const text = response.choices[0]?.message?.content || "";
        const parsed = parseClassificationResponse(text, config);
        const usage = response.usage;

        const route = config.routes.find((r) => r.value === parsed.selectedRoute);

        return {
            selectedRoute: parsed.selectedRoute,
            routeLabel: route?.label,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            usage: usage
                ? {
                      promptTokens: usage.prompt_tokens,
                      completionTokens: usage.completion_tokens,
                      totalTokens: usage.total_tokens
                  }
                : undefined,
            model: config.model,
            provider: "openai"
        };
    }, `OpenAI Router ${config.model}`);
}

async function classifyWithAnthropic(
    config: RouterNodeConfig,
    classificationPrompt: string
): Promise<RouterNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "anthropic", "ANTHROPIC_API_KEY");
    const anthropic = new Anthropic({ apiKey });

    return withRetry(async () => {
        const response = await anthropic.messages.create({
            model: config.model,
            max_tokens: 500,
            temperature: config.temperature ?? 0,
            system: config.systemPrompt,
            messages: [{ role: "user", content: classificationPrompt }]
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const parsed = parseClassificationResponse(text, config);
        const usage = response.usage;

        const route = config.routes.find((r) => r.value === parsed.selectedRoute);

        return {
            selectedRoute: parsed.selectedRoute,
            routeLabel: route?.label,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            usage: {
                promptTokens: usage.input_tokens,
                completionTokens: usage.output_tokens,
                totalTokens: usage.input_tokens + usage.output_tokens
            },
            model: config.model,
            provider: "anthropic"
        };
    }, `Anthropic Router ${config.model}`);
}

async function classifyWithGoogle(
    config: RouterNodeConfig,
    classificationPrompt: string
): Promise<RouterNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "google", "GOOGLE_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model,
        generationConfig: {
            temperature: config.temperature ?? 0,
            maxOutputTokens: 500
        }
    });

    const fullPrompt = config.systemPrompt
        ? `${config.systemPrompt}\n\n${classificationPrompt}`
        : classificationPrompt;

    return withRetry(async () => {
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();
        const parsed = parseClassificationResponse(text, config);

        const route = config.routes.find((r) => r.value === parsed.selectedRoute);

        return {
            selectedRoute: parsed.selectedRoute,
            routeLabel: route?.label,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            model: config.model,
            provider: "google"
        };
    }, `Google Router ${config.model}`);
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

    activityLogger.info("Calling LLM for classification", {
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

            let result: RouterNodeResult;

            switch (validatedConfig.provider) {
                case "openai":
                    result = await classifyWithOpenAI(
                        validatedConfig as RouterNodeConfig,
                        classificationPrompt
                    );
                    break;
                case "anthropic":
                    result = await classifyWithAnthropic(
                        validatedConfig as RouterNodeConfig,
                        classificationPrompt
                    );
                    break;
                case "google":
                    result = await classifyWithGoogle(
                        validatedConfig as RouterNodeConfig,
                        classificationPrompt
                    );
                    break;
                default:
                    throw new ValidationError(
                        `Unsupported router provider: ${validatedConfig.provider}`,
                        "provider"
                    );
            }

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
