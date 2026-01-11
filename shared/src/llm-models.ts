/**
 * Comprehensive LLM Model Registry
 * Single source of truth for all supported LLM models across providers
 * Last updated: January 2026
 */

export interface LLMModelDefinition {
    value: string;
    label: string;
    provider: string;
    contextWindow?: number;
    capabilities?: string[];
    deprecated?: boolean;
    /** Whether this model supports extended thinking/reasoning mode */
    supportsThinking?: boolean;
    /** Default thinking budget in tokens (minimum 1024) */
    defaultThinkingBudget?: number;
}

export interface LLMProviderDefinition {
    value: string;
    label: string;
}

/**
 * Supported LLM Providers
 */
export const LLM_PROVIDERS: LLMProviderDefinition[] = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
    { value: "google", label: "Google" },
    { value: "cohere", label: "Cohere" },
    { value: "huggingface", label: "Hugging Face" }
];

/**
 * LLM Models by Provider
 * Includes latest models with proper version strings and metadata
 */
export const LLM_MODELS_BY_PROVIDER: Record<string, LLMModelDefinition[]> = {
    openai: [
        // GPT-4.1 Family (Latest flagship models - April 2025)
        {
            value: "gpt-4.1",
            label: "GPT-4.1 (Latest, Smartest)",
            provider: "openai",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "function-calling"]
        },
        {
            value: "gpt-4.1-mini",
            label: "GPT-4.1 Mini (Fast)",
            provider: "openai",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "function-calling"]
        },
        {
            value: "gpt-4.1-nano",
            label: "GPT-4.1 Nano (Fastest, Cheapest)",
            provider: "openai",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "function-calling"]
        },
        // GPT-4o Family (Still widely used)
        {
            value: "gpt-4o",
            label: "GPT-4o (Multimodal)",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "vision", "function-calling"]
        },
        {
            value: "gpt-4o-mini",
            label: "GPT-4o Mini (Affordable)",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "vision", "function-calling"]
        },
        // o-series Reasoning Models
        {
            value: "o4-mini",
            label: "o4-mini (Reasoning, Latest)",
            provider: "openai",
            contextWindow: 200000,
            capabilities: ["text", "vision", "reasoning"],
            supportsThinking: true,
            defaultThinkingBudget: 8192
        },
        {
            value: "o3",
            label: "o3 (Reasoning, Advanced)",
            provider: "openai",
            contextWindow: 200000,
            capabilities: ["text", "reasoning"],
            supportsThinking: true,
            defaultThinkingBudget: 16384
        },
        {
            value: "o3-mini",
            label: "o3-mini (Reasoning, Efficient)",
            provider: "openai",
            contextWindow: 200000,
            capabilities: ["text", "reasoning"],
            supportsThinking: true,
            defaultThinkingBudget: 8192
        }
    ],
    anthropic: [
        // Claude 4.5 Family (Latest - Fall 2025)
        {
            value: "claude-opus-4-5-20251101",
            label: "Claude Opus 4.5 (Most Capable)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 8192
        },
        {
            value: "claude-sonnet-4-5-20250929",
            label: "Claude Sonnet 4.5 (Balanced)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 4096
        },
        {
            value: "claude-haiku-4-5-20251001",
            label: "Claude Haiku 4.5 (Fastest)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 2048
        },
        // Claude 3 Haiku - kept for budget-conscious users (5x cheaper than Haiku 4.5)
        {
            value: "claude-3-haiku-20240307",
            label: "Claude 3 Haiku (Budget)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision"]
        }
    ],
    google: [
        // Gemini 3 Series (Preview - Latest)
        {
            value: "gemini-3-pro-preview",
            label: "Gemini 3 Pro (Preview, Advanced)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 16384
        },
        {
            value: "gemini-3-flash-preview",
            label: "Gemini 3 Flash (Preview, Fast)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 8192
        },
        // Gemini 2.5 Series (Stable)
        {
            value: "gemini-2.5-pro",
            label: "Gemini 2.5 Pro (Most Capable)",
            provider: "google",
            contextWindow: 2000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 8192
        },
        {
            value: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash (Best Value)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            supportsThinking: true,
            defaultThinkingBudget: 4096
        },
        {
            value: "gemini-2.5-flash-lite",
            label: "Gemini 2.5 Flash Lite (Cheapest)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "function-calling"]
        }
    ],
    cohere: [
        // Command A (Latest - March 2025)
        {
            value: "command-a-03-2025",
            label: "Command A (Most Capable)",
            provider: "cohere",
            contextWindow: 256000,
            capabilities: ["text", "function-calling", "rag"]
        },
        // Command R Family (August 2024 versions)
        {
            value: "command-r-plus-08-2024",
            label: "Command R+ (Powerful)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling", "rag"]
        },
        {
            value: "command-r-08-2024",
            label: "Command R (Balanced)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling", "rag"]
        },
        {
            value: "command-r7b-12-2024",
            label: "Command R7B (Small, Fast)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling"]
        }
    ],
    huggingface: [
        // Meta Llama 4 (Latest)
        {
            value: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
            label: "Llama 4 Scout (MoE, 17B)",
            provider: "huggingface",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "instruction-following"]
        },
        {
            value: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
            label: "Llama 4 Maverick (MoE, 17B)",
            provider: "huggingface",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "instruction-following"]
        },
        // Meta Llama 3.x
        {
            value: "meta-llama/Llama-3.3-70B-Instruct",
            label: "Llama 3.3 70B Instruct",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "instruction-following"]
        },
        {
            value: "meta-llama/Llama-3.1-8B-Instruct",
            label: "Llama 3.1 8B Instruct (Fast)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "instruction-following"]
        },
        // Qwen 3 (Most downloaded model family)
        {
            value: "Qwen/Qwen3-235B-A22B",
            label: "Qwen 3 235B (MoE, Most Capable)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "reasoning", "code", "multilingual"]
        },
        {
            value: "Qwen/Qwen3-32B",
            label: "Qwen 3 32B (Balanced)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "reasoning", "code", "multilingual"]
        },
        {
            value: "Qwen/Qwen2.5-72B-Instruct",
            label: "Qwen 2.5 72B Instruct",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "reasoning", "code", "multilingual"]
        },
        // Mistral (European)
        {
            value: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
            label: "Mistral Small 3.1 (24B, Multimodal)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "vision", "instruction-following"]
        },
        {
            value: "mistralai/Mixtral-8x22B-Instruct-v0.1",
            label: "Mixtral 8x22B (MoE)",
            provider: "huggingface",
            contextWindow: 65536,
            capabilities: ["text", "instruction-following"]
        },
        // DeepSeek (Open source reasoning)
        {
            value: "deepseek-ai/DeepSeek-R1",
            label: "DeepSeek R1 (Reasoning)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "reasoning", "code"],
            supportsThinking: true,
            defaultThinkingBudget: 8192
        },
        {
            value: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
            label: "DeepSeek R1 Distill 70B",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "reasoning", "code"],
            supportsThinking: true,
            defaultThinkingBudget: 4096
        }
    ]
};

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: string): LLMModelDefinition[] {
    return LLM_MODELS_BY_PROVIDER[provider] || [];
}

/**
 * Get default model for a provider
 */
export function getDefaultModelForProvider(provider: string): string {
    const models = getModelsForProvider(provider);
    return models.length > 0 ? models[0].value : "";
}

/**
 * Find model definition by value
 */
export function findModelByValue(modelValue: string): LLMModelDefinition | undefined {
    for (const provider in LLM_MODELS_BY_PROVIDER) {
        const model = LLM_MODELS_BY_PROVIDER[provider].find((m) => m.value === modelValue);
        if (model) return model;
    }
    return undefined;
}

/**
 * Check if a model supports extended thinking/reasoning
 */
export function modelSupportsThinking(modelValue: string): boolean {
    const model = findModelByValue(modelValue);
    return model?.supportsThinking ?? false;
}

/**
 * Get the default thinking budget for a model
 * Returns undefined if model doesn't support thinking
 */
export function getDefaultThinkingBudget(modelValue: string): number | undefined {
    const model = findModelByValue(modelValue);
    if (!model?.supportsThinking) return undefined;
    return model.defaultThinkingBudget ?? 4096;
}

/**
 * Get all models that support extended thinking
 */
export function getThinkingCapableModels(): LLMModelDefinition[] {
    const models: LLMModelDefinition[] = [];
    for (const provider in LLM_MODELS_BY_PROVIDER) {
        const providerModels = LLM_MODELS_BY_PROVIDER[provider].filter((m) => m.supportsThinking);
        models.push(...providerModels);
    }
    return models;
}

/**
 * Get active (non-deprecated) models for a provider
 */
export function getActiveModelsForProvider(provider: string): LLMModelDefinition[] {
    return getModelsForProvider(provider).filter((m) => !m.deprecated);
}

/**
 * Get a short display name for a model by removing parenthetical descriptions
 * Example: "GPT-4.1 (Latest, Smartest)" -> "GPT-4.1"
 */
export function getModelNickname(modelValue: string): string {
    if (!modelValue) return "";

    const model = findModelByValue(modelValue);
    if (model) {
        // Remove parenthetical descriptions: "GPT-4o (Latest, Multimodal)" -> "GPT-4o"
        return model.label.replace(/\s*\([^)]*\)/g, "").trim();
    }

    // Fallback to model value if not found
    return modelValue;
}
