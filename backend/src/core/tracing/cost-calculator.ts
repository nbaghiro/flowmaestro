/**
 * Cost Calculator - LLM cost calculation utilities
 * Calculates costs for LLM API calls based on token usage
 */

export interface ModelPricing {
    provider: string;
    model: string;
    inputPricePerToken: number; // USD per input token
    outputPricePerToken: number; // USD per output token
    inputPricePer1M?: number; // USD per 1M input tokens
    outputPricePer1M?: number; // USD per 1M output tokens
}

/**
 * Model pricing database
 * Updated as of January 2025
 * Sources: OpenAI, Anthropic, Google pricing pages
 */
const MODEL_PRICING_DB: ModelPricing[] = [
    // OpenAI Models
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

    // Anthropic Models
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
        model: "claude-3-5-sonnet-20240620",
        inputPricePer1M: 3.0,
        outputPricePer1M: 15.0,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015
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

    // Google Models (Gemini)
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
        (p) => p.provider === normalizedProvider && p.model === normalizedModel
    );

    if (exactMatch) {
        return exactMatch;
    }

    // Try prefix match (e.g., "gpt-4o-2024-08-06" matches "gpt-4o")
    const prefixMatch = MODEL_PRICING_DB.find((p) => {
        if (p.provider !== normalizedProvider) return false;
        return normalizedModel.startsWith(p.model);
    });

    return prefixMatch || null;
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
