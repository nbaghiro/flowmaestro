/**
 * Comprehensive LLM Model Registry
 * Single source of truth for all supported LLM models across providers
 */

export interface LLMModelDefinition {
    value: string;
    label: string;
    provider: string;
    contextWindow?: number;
    capabilities?: string[];
    deprecated?: boolean;
    pricing?: LLMModelPricing;
}

export interface LLMModelPricing {
    inputPricePerToken: number; // USD per input token
    outputPricePerToken: number; // USD per output token
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
        {
            value: "gpt-4o",
            label: "GPT-4o (Latest, Multimodal)",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.0000025,
                outputPricePerToken: 0.00001
            }
        },
        {
            value: "gpt-4o-mini",
            label: "GPT-4o Mini (Fast, Affordable)",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.00000015,
                outputPricePerToken: 0.0000006
            }
        },
        {
            value: "gpt-4-turbo",
            label: "GPT-4 Turbo",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.00001,
                outputPricePerToken: 0.00003
            }
        },
        {
            value: "gpt-4",
            label: "GPT-4",
            provider: "openai",
            contextWindow: 8192,
            capabilities: ["text", "function-calling"],
            pricing: {
                inputPricePerToken: 0.00003,
                outputPricePerToken: 0.00006
            }
        },
        {
            value: "gpt-3.5-turbo",
            label: "GPT-3.5 Turbo",
            provider: "openai",
            contextWindow: 16385,
            capabilities: ["text", "function-calling"],
            pricing: {
                inputPricePerToken: 0.0000005,
                outputPricePerToken: 0.0000015
            }
        },
        {
            value: "o1-preview",
            label: "o1 Preview (Reasoning)",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "reasoning"]
        },
        {
            value: "o1-mini",
            label: "o1 Mini (Reasoning, Fast)",
            provider: "openai",
            contextWindow: 128000,
            capabilities: ["text", "reasoning"]
        }
    ],
    anthropic: [
        {
            value: "claude-sonnet-4-5-20250929",
            label: "Claude Sonnet 4.5 (Latest)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.000003,
                outputPricePerToken: 0.000015
            }
        },
        {
            value: "claude-haiku-4-5-20251001",
            label: "Claude Haiku 4.5 (Fast)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.00000025,
                outputPricePerToken: 0.00000125
            }
        },
        {
            value: "claude-opus-4-1-20250805",
            label: "Claude Opus 4.1 (Most Capable)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.000015,
                outputPricePerToken: 0.000075
            }
        },
        {
            value: "claude-3-7-sonnet-20250219",
            label: "Claude 3.7 Sonnet (Legacy)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision", "function-calling"],
            pricing: {
                inputPricePerToken: 0.000003,
                outputPricePerToken: 0.000015
            }
        },
        {
            value: "claude-3-5-haiku-20241022",
            label: "Claude 3.5 Haiku (Legacy)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision"],
            pricing: {
                inputPricePerToken: 0.00000025,
                outputPricePerToken: 0.00000125
            }
        },
        {
            value: "claude-3-haiku-20240307",
            label: "Claude 3 Haiku (Legacy)",
            provider: "anthropic",
            contextWindow: 200000,
            capabilities: ["text", "vision"],
            pricing: {
                inputPricePerToken: 0.00000025,
                outputPricePerToken: 0.00000125
            }
        }
    ],
    google: [
        {
            value: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash (Latest, Fastest)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            pricing: {
                inputPricePerToken: 0.000000075,
                outputPricePerToken: 0.0000003
            }
        },
        {
            value: "gemini-2.5-pro",
            label: "Gemini 2.5 Pro (Latest, Most Capable)",
            provider: "google",
            contextWindow: 2000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            pricing: {
                inputPricePerToken: 0.00000125,
                outputPricePerToken: 0.000005
            }
        },
        {
            value: "gemini-2.0-flash",
            label: "Gemini 2.0 Flash (Stable)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            pricing: {
                inputPricePerToken: 0.000000075,
                outputPricePerToken: 0.0000003
            }
        },
        {
            value: "gemini-2.0-flash-exp",
            label: "Gemini 2.0 Flash (Experimental)",
            provider: "google",
            contextWindow: 1000000,
            capabilities: ["text", "vision", "audio", "function-calling"],
            pricing: {
                inputPricePerToken: 0.000000075,
                outputPricePerToken: 0.0000003
            }
        }
    ],
    cohere: [
        {
            value: "command-r-plus-08-2024",
            label: "Command R+ 08-2024 (Most Capable)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling"],
            pricing: {
                inputPricePerToken: 0.0000025,
                outputPricePerToken: 0.00001
            }
        },
        {
            value: "command-r-08-2024",
            label: "Command R 08-2024 (Balanced)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling"],
            pricing: {
                inputPricePerToken: 0.00000015,
                outputPricePerToken: 0.0000006
            }
        },
        {
            value: "command-r-plus",
            label: "Command R+ (Legacy)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling"],
            deprecated: true,
            pricing: {
                inputPricePerToken: 0.0000025,
                outputPricePerToken: 0.00001
            }
        },
        {
            value: "command-r",
            label: "Command R (Legacy)",
            provider: "cohere",
            contextWindow: 128000,
            capabilities: ["text", "function-calling"],
            deprecated: true,
            pricing: {
                inputPricePerToken: 0.00000015,
                outputPricePerToken: 0.0000006
            }
        }
    ],
    huggingface: [
        {
            value: "meta-llama/Llama-3.3-70B-Instruct",
            label: "Meta Llama 3.3 70B Instruct (Default)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "instruction-following"],
            pricing: {
                inputPricePerToken: 0.00000065,
                outputPricePerToken: 0.00000065
            }
        },
        {
            value: "meta-llama/Llama-3.1-8B-Instruct",
            label: "Meta Llama 3.1 8B Instruct (Fast)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "instruction-following"],
            pricing: {
                inputPricePerToken: 0.0000001,
                outputPricePerToken: 0.0000001
            }
        },
        {
            value: "Qwen/Qwen2.5-72B-Instruct",
            label: "Qwen 2.5 72B Instruct (Reasoning)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "reasoning", "code", "multilingual"],
            pricing: {
                inputPricePerToken: 0.00000065,
                outputPricePerToken: 0.00000065
            }
        },
        {
            value: "Qwen/Qwen2.5-7B-Instruct",
            label: "Qwen 2.5 7B Instruct (Multilingual)",
            provider: "huggingface",
            contextWindow: 128000,
            capabilities: ["text", "multilingual"],
            pricing: {
                inputPricePerToken: 0.0000001,
                outputPricePerToken: 0.0000001
            }
        },
        {
            value: "mistralai/Mistral-7B-Instruct-v0.3",
            label: "Mistral 7B Instruct v0.3 (European)",
            provider: "huggingface",
            contextWindow: 32768,
            capabilities: ["text", "instruction-following"],
            pricing: {
                inputPricePerToken: 0.0000001,
                outputPricePerToken: 0.0000001
            }
        },
        {
            value: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            label: "Mixtral 8x7B Instruct (MoE)",
            provider: "huggingface",
            contextWindow: 32768,
            capabilities: ["text", "instruction-following"],
            pricing: {
                inputPricePerToken: 0.00000027,
                outputPricePerToken: 0.00000027
            }
        },
        {
            value: "google/gemma-2-9b-it",
            label: "Gemma 2 9B IT",
            provider: "huggingface",
            contextWindow: 8192,
            capabilities: ["text", "instruction-following"],
            pricing: {
                inputPricePerToken: 0.0000001,
                outputPricePerToken: 0.0000001
            }
        },
        {
            value: "HuggingFaceH4/zephyr-7b-beta",
            label: "Zephyr 7B Beta (Helpful)",
            provider: "huggingface",
            contextWindow: 32768,
            capabilities: ["text", "instruction-following"],
            pricing: {
                inputPricePerToken: 0.0000001,
                outputPricePerToken: 0.0000001
            }
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
