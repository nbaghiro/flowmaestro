/**
 * Video Generation Models Registry
 * Single source of truth for all supported video generation models across providers
 */

export interface VideoGenerationModelDefinition {
    value: string;
    label: string;
    provider: string;
    maxDuration?: number; // seconds
    maxResolution?: string;
    supportsImageInput?: boolean;
    supportsAudio?: boolean;
}

export interface VideoGenerationProviderDefinition {
    value: string;
    label: string;
}

/**
 * Supported Video Generation Providers
 */
export const VIDEO_GENERATION_PROVIDERS: VideoGenerationProviderDefinition[] = [
    { value: "google", label: "Google Veo" },
    { value: "replicate", label: "Replicate" },
    { value: "runway", label: "Runway" },
    { value: "luma", label: "Luma AI" },
    { value: "stabilityai", label: "Stability AI" },
    { value: "fal", label: "FAL.ai" }
];

/**
 * Video Generation Models by Provider
 */
export const VIDEO_GENERATION_MODELS_BY_PROVIDER: Record<string, VideoGenerationModelDefinition[]> =
    {
        google: [
            {
                value: "veo-3",
                label: "Veo 3 (Best Quality)",
                provider: "google",
                maxDuration: 8,
                maxResolution: "1080p",
                supportsImageInput: true,
                supportsAudio: true
            },
            {
                value: "veo-3-fast",
                label: "Veo 3 Fast",
                provider: "google",
                maxDuration: 8,
                maxResolution: "1080p",
                supportsImageInput: true,
                supportsAudio: true
            },
            {
                value: "veo-2",
                label: "Veo 2",
                provider: "google",
                maxDuration: 8,
                maxResolution: "1080p",
                supportsImageInput: true,
                supportsAudio: false
            }
        ],
        replicate: [
            {
                value: "wan-video/wan-2.5-t2v-480p",
                label: "Wan 2.5 T2V (480p)",
                provider: "replicate",
                maxDuration: 5,
                maxResolution: "480p",
                supportsImageInput: false,
                supportsAudio: false
            },
            {
                value: "wan-video/wan-2.5-t2v-720p",
                label: "Wan 2.5 T2V (720p)",
                provider: "replicate",
                maxDuration: 5,
                maxResolution: "720p",
                supportsImageInput: false,
                supportsAudio: false
            },
            {
                value: "wan-video/wan-2.5-i2v-480p",
                label: "Wan 2.5 I2V (480p)",
                provider: "replicate",
                maxDuration: 5,
                maxResolution: "480p",
                supportsImageInput: true,
                supportsAudio: true
            },
            {
                value: "wan-video/wan-2.5-i2v-720p",
                label: "Wan 2.5 I2V (720p)",
                provider: "replicate",
                maxDuration: 5,
                maxResolution: "720p",
                supportsImageInput: true,
                supportsAudio: true
            },
            {
                value: "minimax/video-01",
                label: "MiniMax Video-01",
                provider: "replicate",
                maxDuration: 6,
                maxResolution: "720p",
                supportsImageInput: true,
                supportsAudio: false
            }
        ],
        runway: [
            {
                value: "gen3a_turbo",
                label: "Gen-3 Alpha Turbo (Fast)",
                provider: "runway",
                maxDuration: 10,
                maxResolution: "1280x768",
                supportsImageInput: true
            },
            {
                value: "gen3a",
                label: "Gen-3 Alpha",
                provider: "runway",
                maxDuration: 10,
                maxResolution: "1280x768",
                supportsImageInput: true
            }
        ],
        luma: [
            {
                value: "ray2",
                label: "Ray 2",
                provider: "luma",
                maxDuration: 9,
                supportsImageInput: true
            },
            {
                value: "ray2-flash",
                label: "Ray 2 Flash (Fast)",
                provider: "luma",
                maxDuration: 9,
                supportsImageInput: true
            }
        ],
        stabilityai: [
            {
                value: "stable-video-diffusion",
                label: "Stable Video Diffusion",
                provider: "stabilityai",
                maxDuration: 4,
                supportsImageInput: true
            }
        ],
        fal: [
            {
                value: "fal-ai/kling-video/v2/master/text-to-video",
                label: "Kling v2 T2V (Best Quality)",
                provider: "fal",
                maxDuration: 10,
                maxResolution: "1080p",
                supportsImageInput: false,
                supportsAudio: false
            },
            {
                value: "fal-ai/kling-video/v2/master/image-to-video",
                label: "Kling v2 I2V",
                provider: "fal",
                maxDuration: 10,
                maxResolution: "1080p",
                supportsImageInput: true,
                supportsAudio: false
            },
            {
                value: "fal-ai/minimax-video/video-01-live/text-to-video",
                label: "MiniMax Video-01 T2V",
                provider: "fal",
                maxDuration: 6,
                maxResolution: "720p",
                supportsImageInput: false,
                supportsAudio: false
            },
            {
                value: "fal-ai/minimax-video/video-01-live/image-to-video",
                label: "MiniMax Video-01 I2V",
                provider: "fal",
                maxDuration: 6,
                maxResolution: "720p",
                supportsImageInput: true,
                supportsAudio: false
            },
            {
                value: "fal-ai/mochi-v1",
                label: "Mochi v1 (Open Source)",
                provider: "fal",
                maxDuration: 5,
                maxResolution: "720p",
                supportsImageInput: false,
                supportsAudio: false
            },
            {
                value: "fal-ai/luma-dream-machine",
                label: "Luma Dream Machine",
                provider: "fal",
                maxDuration: 5,
                maxResolution: "1080p",
                supportsImageInput: true,
                supportsAudio: false
            },
            {
                value: "fal-ai/hunyuan-video",
                label: "Hunyuan Video",
                provider: "fal",
                maxDuration: 5,
                maxResolution: "720p",
                supportsImageInput: false,
                supportsAudio: false
            }
        ]
    };

/**
 * Get all video generation models for a specific provider
 */
export function getVideoGenerationModelsForProvider(
    provider: string
): VideoGenerationModelDefinition[] {
    return VIDEO_GENERATION_MODELS_BY_PROVIDER[provider] || [];
}

/**
 * Get default model for a provider
 */
export function getDefaultVideoGenerationModel(provider: string): string {
    const models = getVideoGenerationModelsForProvider(provider);
    return models.length > 0 ? models[0].value : "";
}

/**
 * Find a video generation model by its value
 */
export function findVideoGenerationModelByValue(
    modelValue: string
): VideoGenerationModelDefinition | undefined {
    for (const provider in VIDEO_GENERATION_MODELS_BY_PROVIDER) {
        const model = VIDEO_GENERATION_MODELS_BY_PROVIDER[provider].find(
            (m) => m.value === modelValue
        );
        if (model) return model;
    }
    return undefined;
}

/**
 * Check if a model supports image input (image-to-video)
 */
export function modelSupportsImageInput(modelValue: string): boolean {
    const model = findVideoGenerationModelByValue(modelValue);
    return model?.supportsImageInput ?? false;
}

/**
 * Video aspect ratio options
 */
export const VIDEO_ASPECT_RATIO_OPTIONS = [
    { value: "16:9", label: "16:9 (Landscape)" },
    { value: "9:16", label: "9:16 (Portrait/Vertical)" },
    { value: "1:1", label: "1:1 (Square)" },
    { value: "4:3", label: "4:3 (Standard)" },
    { value: "3:4", label: "3:4 (Portrait Standard)" },
    { value: "21:9", label: "21:9 (Cinematic)" }
];

/**
 * Video duration options
 */
export const VIDEO_DURATION_OPTIONS = [
    { value: 4, label: "4 seconds" },
    { value: 5, label: "5 seconds" },
    { value: 6, label: "6 seconds" },
    { value: 8, label: "8 seconds" },
    { value: 10, label: "10 seconds" }
];

/**
 * Get duration options for a specific provider
 */
export function getVideoDurationOptionsForProvider(
    provider: string
): Array<{ value: number; label: string }> {
    const models = VIDEO_GENERATION_MODELS_BY_PROVIDER[provider];
    if (!models || models.length === 0) return VIDEO_DURATION_OPTIONS;

    const maxDuration = Math.max(...models.map((m) => m.maxDuration || 10));

    return VIDEO_DURATION_OPTIONS.filter((opt) => opt.value <= maxDuration);
}

/**
 * Output format options
 */
export const VIDEO_OUTPUT_FORMAT_OPTIONS = [
    { value: "url", label: "URL" },
    { value: "base64", label: "Base64 (Embedded)" }
];
