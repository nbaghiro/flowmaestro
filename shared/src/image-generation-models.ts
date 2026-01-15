/**
 * Image Generation Models Registry
 * Single source of truth for all supported image generation models across providers
 */

export interface ImageGenerationModelDefinition {
    value: string;
    label: string;
    provider: string;
    maxResolution?: string;
    supportedSizes?: string[];
    supportsNegativePrompt?: boolean;
}

export interface ImageGenerationProviderDefinition {
    value: string;
    label: string;
}

/**
 * Supported Image Generation Providers
 */
export const IMAGE_GENERATION_PROVIDERS: ImageGenerationProviderDefinition[] = [
    { value: "openai", label: "OpenAI" },
    { value: "replicate", label: "Replicate" },
    { value: "stabilityai", label: "Stability AI" },
    { value: "fal", label: "FAL.ai" }
];

/**
 * Image Generation Models by Provider
 */
export const IMAGE_GENERATION_MODELS_BY_PROVIDER: Record<string, ImageGenerationModelDefinition[]> =
    {
        openai: [
            {
                value: "dall-e-3",
                label: "DALL-E 3",
                provider: "openai",
                maxResolution: "1792x1024",
                supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
                supportsNegativePrompt: false
            },
            {
                value: "dall-e-2",
                label: "DALL-E 2",
                provider: "openai",
                maxResolution: "1024x1024",
                supportedSizes: ["256x256", "512x512", "1024x1024"],
                supportsNegativePrompt: false
            }
        ],
        replicate: [
            {
                value: "black-forest-labs/flux-1.1-pro-ultra",
                label: "Flux 1.1 Pro Ultra (4MP)",
                provider: "replicate",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "black-forest-labs/flux-1.1-pro",
                label: "Flux 1.1 Pro",
                provider: "replicate",
                maxResolution: "1440x1440",
                supportsNegativePrompt: false
            },
            {
                value: "black-forest-labs/flux-pro",
                label: "Flux Pro",
                provider: "replicate",
                maxResolution: "1440x1440",
                supportsNegativePrompt: false
            },
            {
                value: "black-forest-labs/flux-dev",
                label: "Flux Dev (Open-weight)",
                provider: "replicate",
                maxResolution: "1440x1440",
                supportsNegativePrompt: false
            },
            {
                value: "black-forest-labs/flux-schnell",
                label: "Flux Schnell (Fast)",
                provider: "replicate",
                maxResolution: "1440x1440",
                supportsNegativePrompt: false
            }
        ],
        stabilityai: [
            {
                value: "sd3-large",
                label: "SD3 Large",
                provider: "stabilityai",
                supportsNegativePrompt: true
            },
            {
                value: "sd3-large-turbo",
                label: "SD3 Large Turbo (Fast)",
                provider: "stabilityai",
                supportsNegativePrompt: true
            },
            {
                value: "sd3-medium",
                label: "SD3 Medium",
                provider: "stabilityai",
                supportsNegativePrompt: true
            },
            {
                value: "stable-image-ultra",
                label: "Stable Image Ultra",
                provider: "stabilityai",
                supportsNegativePrompt: true
            },
            {
                value: "stable-image-core",
                label: "Stable Image Core",
                provider: "stabilityai",
                supportsNegativePrompt: true
            },
            {
                value: "stable-diffusion-xl-1024-v1-0",
                label: "SDXL 1.0",
                provider: "stabilityai",
                maxResolution: "1024x1024",
                supportsNegativePrompt: true
            }
        ],
        fal: [
            {
                value: "fal-ai/flux-pro/v1.1-ultra",
                label: "Flux 1.1 Pro Ultra (4MP)",
                provider: "fal",
                maxResolution: "4096x4096",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/flux-pro/v1.1",
                label: "Flux 1.1 Pro",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/flux-pro",
                label: "Flux Pro",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/flux/dev",
                label: "Flux Dev (Open-weight)",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/flux/schnell",
                label: "Flux Schnell (Fast)",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/flux-lora",
                label: "Flux LoRA",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/recraft-v3",
                label: "Recraft V3",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: false
            },
            {
                value: "fal-ai/ideogram/v2",
                label: "Ideogram V2 (Text-in-Image)",
                provider: "fal",
                maxResolution: "2048x2048",
                supportsNegativePrompt: true
            }
        ]
    };

/**
 * Get all image generation models for a specific provider
 */
export function getImageGenerationModelsForProvider(
    provider: string
): ImageGenerationModelDefinition[] {
    return IMAGE_GENERATION_MODELS_BY_PROVIDER[provider] || [];
}

/**
 * Get default model for a provider
 */
export function getDefaultImageGenerationModel(provider: string): string {
    const models = getImageGenerationModelsForProvider(provider);
    return models.length > 0 ? models[0].value : "";
}

/**
 * Find an image generation model by its value
 */
export function findImageGenerationModelByValue(
    modelValue: string
): ImageGenerationModelDefinition | undefined {
    for (const provider in IMAGE_GENERATION_MODELS_BY_PROVIDER) {
        const model = IMAGE_GENERATION_MODELS_BY_PROVIDER[provider].find(
            (m) => m.value === modelValue
        );
        if (model) return model;
    }
    return undefined;
}

/**
 * Image size options for generation
 */
export const IMAGE_SIZE_OPTIONS = [
    { value: "256x256", label: "256x256 (Small)" },
    { value: "512x512", label: "512x512 (Medium)" },
    { value: "1024x1024", label: "1024x1024 (Square)" },
    { value: "1792x1024", label: "1792x1024 (Landscape)" },
    { value: "1024x1792", label: "1024x1792 (Portrait)" }
];

/**
 * Get size options for a specific provider
 */
export function getImageSizeOptionsForProvider(
    provider: string
): Array<{ value: string; label: string }> {
    if (provider === "openai") {
        // DALL-E 3 sizes
        return [
            { value: "1024x1024", label: "1024x1024 (Square)" },
            { value: "1792x1024", label: "1792x1024 (Landscape)" },
            { value: "1024x1792", label: "1024x1792 (Portrait)" }
        ];
    }
    // Stability AI uses aspect ratios instead
    return IMAGE_SIZE_OPTIONS;
}

/**
 * Image quality options (OpenAI DALL-E 3)
 */
export const IMAGE_QUALITY_OPTIONS = [
    { value: "standard", label: "Standard" },
    { value: "hd", label: "HD (Higher detail)" }
];

/**
 * Image style options (OpenAI DALL-E 3)
 */
export const IMAGE_STYLE_OPTIONS = [
    { value: "vivid", label: "Vivid (Hyper-real, dramatic)" },
    { value: "natural", label: "Natural (Realistic)" }
];

/**
 * Aspect ratio options for Stability AI
 */
export const IMAGE_ASPECT_RATIO_OPTIONS = [
    { value: "1:1", label: "1:1 (Square)" },
    { value: "16:9", label: "16:9 (Landscape)" },
    { value: "9:16", label: "9:16 (Portrait)" },
    { value: "21:9", label: "21:9 (Cinematic)" },
    { value: "9:21", label: "9:21 (Tall)" },
    { value: "4:3", label: "4:3 (Standard)" },
    { value: "3:4", label: "3:4 (Portrait Standard)" },
    { value: "3:2", label: "3:2 (Classic)" },
    { value: "2:3", label: "2:3 (Portrait Classic)" }
];

/**
 * Output format options
 */
export const IMAGE_OUTPUT_FORMAT_OPTIONS = [
    { value: "url", label: "URL" },
    { value: "base64", label: "Base64 (Embedded)" }
];
