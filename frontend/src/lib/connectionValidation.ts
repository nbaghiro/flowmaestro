/**
 * API Key validation utilities
 * Provides provider-specific validation rules for API keys
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

interface ProviderValidationRules {
    minLength: number;
    maxLength?: number;
    startsWith?: string[];
    noSpaces?: boolean;
    customValidator?: (key: string) => ValidationResult;
}

// Validation rules for different providers

const PROVIDER_RULES: Record<string, ProviderValidationRules> = {
    openai: {
        minLength: 20,
        // OpenAI supports multiple key formats:
        // - sk-proj- (new project-based keys, can be up to 164 chars)
        // - sk- (legacy keys, ~48 chars)
        // - sk-None- (user profile keys)
        // - sk-svcacct- (service account keys)
        startsWith: ["sk-proj-", "sk-", "sk-none-", "sk-svcacct-"],
        noSpaces: true
    },
    anthropic: {
        minLength: 50,
        // Anthropic keys start with sk-ant-api03- followed by 48 chars (total 60+)
        startsWith: ["sk-ant-api03-"],
        noSpaces: true
    },
    google: {
        minLength: 35,
        // Google API keys start with AIzaSy and are typically 39 characters
        startsWith: ["AIzaSy"],
        noSpaces: true
    },
    huggingface: {
        minLength: 10,
        // Hugging Face tokens start with hf_
        startsWith: ["hf_"],
        noSpaces: true
    },
    cohere: {
        minLength: 40,
        maxLength: 45,
        noSpaces: true
    },
    github: {
        minLength: 20,
        // GitHub tokens typically start with ghp_, gho_, ghu_, ghs_, or ghr_
        startsWith: ["ghp_", "gho_", "ghu_", "ghs_", "ghr_"],
        noSpaces: true
    },
    coda: {
        minLength: 20,
        // Coda API tokens don't have a specific prefix pattern
        noSpaces: true
    },
    fal: {
        minLength: 20,
        // FAL.ai API keys - no specific prefix pattern found
        noSpaces: true
    },
    // Default rules for unknown providers
    default: {
        minLength: 10,
        noSpaces: true
    }
};

// Validate an API key based on provider-specific rules

export function validateApiKey(apiKey: string, provider: string): ValidationResult {
    const keyLabel = getApiKeyLabel(provider);

    if (!apiKey || !apiKey.trim()) {
        return {
            valid: false,
            error: `${keyLabel} is required`
        };
    }

    const trimmedKey = apiKey.trim();
    const providerKey = provider.toLowerCase();
    const rules = PROVIDER_RULES[providerKey] || PROVIDER_RULES.default;

    if (rules.noSpaces !== false && /\s/.test(trimmedKey)) {
        return {
            valid: false,
            error: `${keyLabel} cannot contain spaces. Please remove any spaces from your ${keyLabel.toLowerCase()}.`
        };
    }

    if (trimmedKey.length < rules.minLength) {
        return {
            valid: false,
            error: `${keyLabel} is too short. It must be at least ${rules.minLength} characters long.`
        };
    }

    if (rules.maxLength && trimmedKey.length > rules.maxLength) {
        return {
            valid: false,
            error: `${keyLabel} is too long. It must be between ${rules.minLength} and ${rules.maxLength} characters long.`
        };
    }

    if (rules.startsWith && rules.startsWith.length > 0) {
        const hasValidPrefix = rules.startsWith.some((prefix) =>
            trimmedKey.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if (!hasValidPrefix) {
            const prefixList = rules.startsWith.map((p) => `"${p}"`).join(" or ");
            return {
                valid: false,
                error: `${keyLabel} should start with ${prefixList}. Please check your ${keyLabel.toLowerCase()}.`
            };
        }
    }

    // Run custom validator if provided
    if (rules.customValidator) {
        const customResult = rules.customValidator(trimmedKey);
        if (!customResult.valid) {
            return customResult;
        }
    }

    return { valid: true };
}

/**
 * Validate API key in real-time as user types for less strict validation
 * This is useful for showing warnings without blocking input
 */
export function validateApiKeySoft(apiKey: string, provider: string): ValidationResult {
    if (!apiKey || !apiKey.trim()) {
        return { valid: true };
    }

    const keyLabel = getApiKeyLabel(provider);
    const trimmedKey = apiKey.trim();
    const providerKey = provider.toLowerCase();
    const rules = PROVIDER_RULES[providerKey] || PROVIDER_RULES.default;

    if (/\s/.test(trimmedKey)) {
        return {
            valid: false,
            error: `${keyLabel} contains spaces. Please remove them.`
        };
    }

    if (trimmedKey.length > 0 && trimmedKey.length < rules.minLength) {
        return {
            valid: false,
            error: `${keyLabel} should be at least ${rules.minLength} characters long`
        };
    }

    // Check prefix if the key is long enough only for prefix validation, not blocking
    // This gives real-time feedback about prefix issues
    if (rules.startsWith && rules.startsWith.length > 0 && trimmedKey.length >= 3) {
        const hasValidPrefix = rules.startsWith.some((prefix) =>
            trimmedKey.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if (!hasValidPrefix) {
            // Only show prefix error if the key is getting long enough to have a prefix
            // This prevents premature errors while user is still typing
            if (trimmedKey.length >= Math.min(...rules.startsWith.map((p) => p.length))) {
                const prefixList = rules.startsWith.map((p) => `"${p}"`).join(" or ");
                return {
                    valid: false,
                    error: `${keyLabel} should start with ${prefixList}`
                };
            }
        }
    }

    return { valid: true };
}

/**
 * Get provider display name for error messages
 */
export function getProviderDisplayName(provider: string): string {
    const providerMap: Record<string, string> = {
        openai: "OpenAI",
        anthropic: "Anthropic",
        google: "Google AI",
        huggingface: "Hugging Face",
        cohere: "Cohere",
        github: "GitHub",
        coda: "Coda",
        fal: "FAL.ai"
    };

    return providerMap[provider.toLowerCase()] || provider;
}

// Get API key label for a provider (e.g., "OpenAI key", "GitHub token")
function getApiKeyLabel(provider: string): string {
    const providerKey = provider.toLowerCase();

    // Providers that use "token" instead of "key"
    const tokenProviders = ["github"];

    const displayName = getProviderDisplayName(provider);

    if (tokenProviders.includes(providerKey)) {
        return `${displayName} token`;
    }

    return `${displayName} key`;
}
