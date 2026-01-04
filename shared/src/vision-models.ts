/**
 * Vision Models Registry
 * Single source of truth for all supported vision models across providers
 */

export interface VisionModelDefinition {
    value: string;
    label: string;
    provider: string;
    capabilities: VisionCapability[];
    maxImageSize?: number;
    supportedFormats?: string[];
}

export type VisionCapability = "analyze" | "generate" | "ocr";

export interface VisionProviderDefinition {
    value: string;
    label: string;
    supportedOperations: VisionCapability[];
}

/**
 * Supported Vision Providers
 */
export const VISION_PROVIDERS: VisionProviderDefinition[] = [
    { value: "openai", label: "OpenAI", supportedOperations: ["analyze", "generate", "ocr"] },
    { value: "anthropic", label: "Anthropic", supportedOperations: ["analyze", "ocr"] },
    { value: "google", label: "Google", supportedOperations: ["analyze", "ocr"] },
    { value: "stabilityai", label: "Stability AI", supportedOperations: ["generate"] },
    { value: "google-cloud-vision", label: "Google Cloud Vision", supportedOperations: ["ocr"] }
];

/**
 * Vision Models by Provider
 */
export const VISION_MODELS_BY_PROVIDER: Record<string, VisionModelDefinition[]> = {
    openai: [
        {
            value: "gpt-4o",
            label: "GPT-4o (Vision)",
            provider: "openai",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "gpt-4o-mini",
            label: "GPT-4o Mini (Vision)",
            provider: "openai",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "gpt-4-turbo",
            label: "GPT-4 Turbo (Vision)",
            provider: "openai",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "dall-e-3",
            label: "DALL-E 3",
            provider: "openai",
            capabilities: ["generate"]
        },
        {
            value: "dall-e-2",
            label: "DALL-E 2",
            provider: "openai",
            capabilities: ["generate"]
        }
    ],
    anthropic: [
        {
            value: "claude-sonnet-4-5-20250929",
            label: "Claude Sonnet 4.5 (Vision)",
            provider: "anthropic",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "claude-haiku-4-5-20251001",
            label: "Claude Haiku 4.5 (Vision)",
            provider: "anthropic",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "claude-opus-4-1-20250805",
            label: "Claude Opus 4.1 (Vision)",
            provider: "anthropic",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "claude-3-7-sonnet-20250219",
            label: "Claude 3.7 Sonnet (Vision)",
            provider: "anthropic",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        }
    ],
    google: [
        {
            value: "gemini-2.5-pro",
            label: "Gemini 2.5 Pro (Vision)",
            provider: "google",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash (Vision)",
            provider: "google",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        },
        {
            value: "gemini-2.0-flash",
            label: "Gemini 2.0 Flash (Vision)",
            provider: "google",
            capabilities: ["analyze", "ocr"],
            supportedFormats: ["jpeg", "png", "gif", "webp"]
        }
    ],
    stabilityai: [
        {
            value: "sd3-large",
            label: "SD3 Large",
            provider: "stabilityai",
            capabilities: ["generate"]
        },
        {
            value: "sd3-large-turbo",
            label: "SD3 Large Turbo (Fast)",
            provider: "stabilityai",
            capabilities: ["generate"]
        },
        {
            value: "sd3-medium",
            label: "SD3 Medium",
            provider: "stabilityai",
            capabilities: ["generate"]
        },
        {
            value: "stable-diffusion-xl-1024-v1-0",
            label: "SDXL 1.0",
            provider: "stabilityai",
            capabilities: ["generate"]
        },
        {
            value: "stable-image-ultra",
            label: "Stable Image Ultra",
            provider: "stabilityai",
            capabilities: ["generate"]
        },
        {
            value: "stable-image-core",
            label: "Stable Image Core",
            provider: "stabilityai",
            capabilities: ["generate"]
        }
    ],
    "google-cloud-vision": [
        {
            value: "document_text_detection",
            label: "Document OCR (Best for documents)",
            provider: "google-cloud-vision",
            capabilities: ["ocr"],
            supportedFormats: ["jpeg", "png", "gif", "bmp", "pdf", "tiff"]
        },
        {
            value: "text_detection",
            label: "Text Detection (General text)",
            provider: "google-cloud-vision",
            capabilities: ["ocr"],
            supportedFormats: ["jpeg", "png", "gif", "bmp"]
        }
    ]
};

/**
 * Get all vision models for a specific provider
 */
export function getVisionModelsForProvider(provider: string): VisionModelDefinition[] {
    return VISION_MODELS_BY_PROVIDER[provider] || [];
}

/**
 * Get vision models filtered by capability
 */
export function getVisionModelsForCapability(
    provider: string,
    capability: VisionCapability
): VisionModelDefinition[] {
    const models = VISION_MODELS_BY_PROVIDER[provider] || [];
    return models.filter((model) => model.capabilities.includes(capability));
}

/**
 * Get all providers that support a specific operation
 */
export function getProvidersForOperation(operation: VisionCapability): VisionProviderDefinition[] {
    return VISION_PROVIDERS.filter((provider) => provider.supportedOperations.includes(operation));
}

/**
 * Get default model for a provider and operation
 */
export function getDefaultVisionModel(provider: string, operation?: VisionCapability): string {
    const models = operation
        ? getVisionModelsForCapability(provider, operation)
        : getVisionModelsForProvider(provider);

    return models.length > 0 ? models[0].value : "";
}

/**
 * Find a vision model by its value
 */
export function findVisionModelByValue(modelValue: string): VisionModelDefinition | undefined {
    for (const provider in VISION_MODELS_BY_PROVIDER) {
        const model = VISION_MODELS_BY_PROVIDER[provider].find((m) => m.value === modelValue);
        if (model) return model;
    }
    return undefined;
}

/**
 * Check if a provider supports a specific operation
 */
export function providerSupportsOperation(provider: string, operation: VisionCapability): boolean {
    const providerDef = VISION_PROVIDERS.find((p) => p.value === provider);
    return providerDef?.supportedOperations.includes(operation) ?? false;
}

/**
 * Detail level options for analysis
 */
export const IMAGE_DETAIL_OPTIONS = [
    { value: "auto", label: "Auto (Recommended)" },
    { value: "low", label: "Low (Faster, less detail)" },
    { value: "high", label: "High (More detail, more tokens)" }
];

/**
 * Output format options
 */
export const OUTPUT_FORMAT_OPTIONS = [
    { value: "url", label: "URL" },
    { value: "base64", label: "Base64 (Embedded)" },
    { value: "text", label: "Text (OCR only)" }
];
