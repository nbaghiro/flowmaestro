/**
 * Cost Calculator - LLM cost calculation utilities
 * Calculates costs for LLM API calls based on token usage
 */

import { createServiceLogger } from "../logging";

const logger = createServiceLogger("CostCalculator");

export interface ModelPricing {
    provider: string;
    model: string;
    inputPricePerToken: number; // USD per input token
    outputPricePerToken: number; // USD per output token
    inputPricePer1M?: number; // USD per 1M input tokens (for reference)
    outputPricePer1M?: number; // USD per 1M output tokens (for reference)
}

/**
 * Model pricing database
 * Single source of truth for all LLM model pricing
 * Updated as of December 2025
 */
const MODEL_PRICING_DB: ModelPricing[] = [
    // ==================== OpenAI Models ====================
    {
        provider: "openai",
        model: "gpt-4o",
        inputPricePer1M: 2.5,
        outputPricePer1M: 10.0,
        inputPricePerToken: 0.0000025,
        outputPricePerToken: 0.00001
    },
    {
        provider: "openai",
        model: "gpt-4o-2024-11-20",
        inputPricePer1M: 2.5,
        outputPricePer1M: 10.0,
        inputPricePerToken: 0.0000025,
        outputPricePerToken: 0.00001
    },
    {
        provider: "openai",
        model: "gpt-4o-mini",
        inputPricePer1M: 0.15,
        outputPricePer1M: 0.6,
        inputPricePerToken: 0.00000015,
        outputPricePerToken: 0.0000006
    },
    {
        provider: "openai",
        model: "gpt-4o-mini-2024-07-18",
        inputPricePer1M: 0.15,
        outputPricePer1M: 0.6,
        inputPricePerToken: 0.00000015,
        outputPricePerToken: 0.0000006
    },
    {
        provider: "openai",
        model: "gpt-4-turbo",
        inputPricePer1M: 10.0,
        outputPricePer1M: 30.0,
        inputPricePerToken: 0.00001,
        outputPricePerToken: 0.00003
    },
    {
        provider: "openai",
        model: "gpt-4-turbo-2024-04-09",
        inputPricePer1M: 10.0,
        outputPricePer1M: 30.0,
        inputPricePerToken: 0.00001,
        outputPricePerToken: 0.00003
    },
    {
        provider: "openai",
        model: "gpt-4",
        inputPricePer1M: 30.0,
        outputPricePer1M: 60.0,
        inputPricePerToken: 0.00003,
        outputPricePerToken: 0.00006
    },
    {
        provider: "openai",
        model: "gpt-4-0613",
        inputPricePer1M: 30.0,
        outputPricePer1M: 60.0,
        inputPricePerToken: 0.00003,
        outputPricePerToken: 0.00006
    },
    {
        provider: "openai",
        model: "gpt-3.5-turbo",
        inputPricePer1M: 0.5,
        outputPricePer1M: 1.5,
        inputPricePerToken: 0.0000005,
        outputPricePerToken: 0.0000015
    },
    {
        provider: "openai",
        model: "gpt-3.5-turbo-0125",
        inputPricePer1M: 0.5,
        outputPricePer1M: 1.5,
        inputPricePerToken: 0.0000005,
        outputPricePerToken: 0.0000015
    },
    // OpenAI o1 Reasoning Models
    {
        provider: "openai",
        model: "o1-preview",
        inputPricePer1M: 15.0,
        outputPricePer1M: 60.0,
        inputPricePerToken: 0.000015,
        outputPricePerToken: 0.00006
    },
    {
        provider: "openai",
        model: "o1-mini",
        inputPricePer1M: 3.0,
        outputPricePer1M: 12.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000012
    },

    // ==================== Anthropic Models ====================
    // Claude 4.x Series (Latest)
    {
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
    },
    {
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        inputPricePer1M: 0.25,
        outputPricePer1M: 1.25,
        inputPricePerToken: 0.00000025,
        outputPricePerToken: 0.00000125
    },
    {
        provider: "anthropic",
        model: "claude-opus-4-1-20250805",
        inputPricePer1M: 15.0,
        outputPricePer1M: 75.0,
        inputPricePerToken: 0.000015,
        outputPricePerToken: 0.000075
    },
    // Claude 3.x Series (Legacy)
    {
        provider: "anthropic",
        model: "claude-3-7-sonnet-20250219",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
    },
    {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
    },
    {
        provider: "anthropic",
        model: "claude-3-5-sonnet-latest",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
    },
    {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20240620",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
    },
    {
        provider: "anthropic",
        model: "claude-3-5-haiku-20241022",
        inputPricePer1M: 0.25,
        outputPricePer1M: 1.25,
        inputPricePerToken: 0.00000025,
        outputPricePerToken: 0.00000125
    },
    {
        provider: "anthropic",
        model: "claude-3-5-haiku-latest",
        inputPricePer1M: 1.0,
        outputPricePer1M: 5.0,
        inputPricePerToken: 0.000001,
        outputPricePerToken: 0.000005
    },
    {
        provider: "anthropic",
        model: "claude-3-opus-20240229",
        inputPricePer1M: 15.0,
        outputPricePer1M: 75.0,
        inputPricePerToken: 0.000015,
        outputPricePerToken: 0.000075
    },
    {
        provider: "anthropic",
        model: "claude-3-sonnet-20240229",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
    },
    {
        provider: "anthropic",
        model: "claude-3-haiku-20240307",
        inputPricePer1M: 0.25,
        outputPricePer1M: 1.25,
        inputPricePerToken: 0.00000025,
        outputPricePerToken: 0.00000125
    },

    // ==================== Google Models (Gemini) ====================
    // Gemini 2.x Series (Latest)
    {
        provider: "google",
        model: "gemini-2.5-flash",
        inputPricePer1M: 0.075,
        outputPricePer1M: 0.3,
        inputPricePerToken: 0.000000075,
        outputPricePerToken: 0.0000003
    },
    {
        provider: "google",
        model: "gemini-2.5-pro",
        inputPricePer1M: 1.25,
        outputPricePer1M: 5.0,
        inputPricePerToken: 0.00000125,
        outputPricePerToken: 0.000005
    },
    {
        provider: "google",
        model: "gemini-2.0-flash",
        inputPricePer1M: 0.075,
        outputPricePer1M: 0.3,
        inputPricePerToken: 0.000000075,
        outputPricePerToken: 0.0000003
    },
    {
        provider: "google",
        model: "gemini-2.0-flash-exp",
        inputPricePer1M: 0.075,
        outputPricePer1M: 0.3,
        inputPricePerToken: 0.000000075,
        outputPricePerToken: 0.0000003
    },
    // Gemini 1.x Series (Legacy)
    {
        provider: "google",
        model: "gemini-1.5-pro",
        inputPricePer1M: 1.25,
        outputPricePer1M: 5.0,
        inputPricePerToken: 0.00000125,
        outputPricePerToken: 0.000005
    },
    {
        provider: "google",
        model: "gemini-1.5-flash",
        inputPricePer1M: 0.075,
        outputPricePer1M: 0.3,
        inputPricePerToken: 0.000000075,
        outputPricePerToken: 0.0000003
    },
    {
        provider: "google",
        model: "gemini-1.0-pro",
        inputPricePer1M: 0.5,
        outputPricePer1M: 1.5,
        inputPricePerToken: 0.0000005,
        outputPricePerToken: 0.0000015
    },

    // ==================== Cohere Models ====================
    {
        provider: "cohere",
        model: "command-r-plus-08-2024",
        inputPricePer1M: 2.5,
        outputPricePer1M: 10.0,
        inputPricePerToken: 0.0000025,
        outputPricePerToken: 0.00001
    },
    {
        provider: "cohere",
        model: "command-r-08-2024",
        inputPricePer1M: 0.15,
        outputPricePer1M: 0.6,
        inputPricePerToken: 0.00000015,
        outputPricePerToken: 0.0000006
    },
    {
        provider: "cohere",
        model: "command-r-plus",
        inputPricePer1M: 2.5,
        outputPricePer1M: 10.0,
        inputPricePerToken: 0.0000025,
        outputPricePerToken: 0.00001
    },
    {
        provider: "cohere",
        model: "command-r",
        inputPricePer1M: 0.15,
        outputPricePer1M: 0.6,
        inputPricePerToken: 0.00000015,
        outputPricePerToken: 0.0000006
    },

    // ==================== HuggingFace Models ====================
    // Note: HuggingFace pricing varies by provider, these are estimates for serverless inference
    {
        provider: "huggingface",
        model: "meta-llama/Llama-3.3-70B-Instruct",
        inputPricePer1M: 0.65,
        outputPricePer1M: 0.65,
        inputPricePerToken: 0.00000065,
        outputPricePerToken: 0.00000065
    },
    {
        provider: "huggingface",
        model: "meta-llama/Llama-3.1-8B-Instruct",
        inputPricePer1M: 0.1,
        outputPricePer1M: 0.1,
        inputPricePerToken: 0.0000001,
        outputPricePerToken: 0.0000001
    },
    {
        provider: "huggingface",
        model: "Qwen/Qwen2.5-72B-Instruct",
        inputPricePer1M: 0.65,
        outputPricePer1M: 0.65,
        inputPricePerToken: 0.00000065,
        outputPricePerToken: 0.00000065
    },
    {
        provider: "huggingface",
        model: "Qwen/Qwen2.5-7B-Instruct",
        inputPricePer1M: 0.1,
        outputPricePer1M: 0.1,
        inputPricePerToken: 0.0000001,
        outputPricePerToken: 0.0000001
    },
    {
        provider: "huggingface",
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        inputPricePer1M: 0.1,
        outputPricePer1M: 0.1,
        inputPricePerToken: 0.0000001,
        outputPricePerToken: 0.0000001
    },
    {
        provider: "huggingface",
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        inputPricePer1M: 0.27,
        outputPricePer1M: 0.27,
        inputPricePerToken: 0.00000027,
        outputPricePerToken: 0.00000027
    },
    {
        provider: "huggingface",
        model: "google/gemma-2-9b-it",
        inputPricePer1M: 0.1,
        outputPricePer1M: 0.1,
        inputPricePerToken: 0.0000001,
        outputPricePerToken: 0.0000001
    },
    {
        provider: "huggingface",
        model: "HuggingFaceH4/zephyr-7b-beta",
        inputPricePer1M: 0.1,
        outputPricePer1M: 0.1,
        inputPricePerToken: 0.0000001,
        outputPricePerToken: 0.0000001
    }
];

/**
 * Get pricing for a specific model
 */
export function getModelPricing(provider: string, model: string): ModelPricing | null {
    // Normalize provider and model names for matching
    const normalizedProvider = provider.toLowerCase();
    const normalizedModel = model.toLowerCase();

    // First, try exact match
    const exactMatch = MODEL_PRICING_DB.find(
        (p) => p.provider === normalizedProvider && p.model.toLowerCase() === normalizedModel
    );

    if (exactMatch) {
        return exactMatch;
    }

    // Try prefix match (e.g., "gpt-4o-2024-08-06" matches "gpt-4o")
    const prefixMatch = MODEL_PRICING_DB.find((p) => {
        if (p.provider !== normalizedProvider) return false;
        return normalizedModel.startsWith(p.model.toLowerCase());
    });

    if (prefixMatch) {
        return prefixMatch;
    }

    // Try reverse prefix match (e.g., "claude-3-5-sonnet" matches "claude-3-5-sonnet-20241022")
    const reverseMatch = MODEL_PRICING_DB.find((p) => {
        if (p.provider !== normalizedProvider) return false;
        return p.model.toLowerCase().startsWith(normalizedModel);
    });

    return reverseMatch || null;
}

/**
 * Calculate cost for a model call
 */
export interface CostCalculationInput {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
}

export interface CostCalculationResult {
    inputCost: number; // USD
    outputCost: number; // USD
    totalCost: number; // USD
    pricing: ModelPricing | null;
    found: boolean;
}

export function calculateCost(input: CostCalculationInput): CostCalculationResult {
    const pricing = getModelPricing(input.provider, input.model);

    if (!pricing) {
        logger.warn(
            {
                provider: input.provider,
                model: input.model
            },
            "No pricing found for model"
        );
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            pricing: null,
            found: false
        };
    }

    const inputCost = input.promptTokens * pricing.inputPricePerToken;
    const outputCost = input.completionTokens * pricing.outputPricePerToken;
    const totalCost = inputCost + outputCost;

    return {
        inputCost,
        outputCost,
        totalCost,
        pricing,
        found: true
    };
}

/**
 * Format cost as currency
 */
export function formatCost(cost: number): string {
    if (cost < 0.01) {
        // Show in cents for very small amounts
        return `$${(cost * 100).toFixed(4)}¢`;
    }
    return `$${cost.toFixed(4)}`;
}

/**
 * Estimate cost for a given token count before making a call
 */
export function estimateCost(
    provider: string,
    model: string,
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number
): CostCalculationResult {
    return calculateCost({
        provider,
        model,
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens
    });
}
