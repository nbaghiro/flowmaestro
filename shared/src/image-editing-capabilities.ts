/**
 * Image Editing Capabilities Registry
 * Defines supported editing operations and provider capabilities
 */

/**
 * Image editing operation types
 */
export type ImageEditingOperation =
    | "generate"
    | "inpaint"
    | "outpaint"
    | "upscale"
    | "removeBackground"
    | "styleTransfer";

/**
 * Image editing operation definitions
 */
export interface ImageEditingOperationDefinition {
    value: ImageEditingOperation;
    label: string;
    description: string;
    requiresSourceImage: boolean;
    requiresMask: boolean;
    requiresStyleReference: boolean;
}

/**
 * Provider capability for image editing
 */
export interface ImageEditingCapabilities {
    generate: boolean;
    inpaint: boolean;
    outpaint: boolean;
    upscale: boolean;
    removeBackground: boolean;
    styleTransfer: boolean;
}

/**
 * All image editing operations with metadata
 */
export const IMAGE_EDITING_OPERATIONS: ImageEditingOperationDefinition[] = [
    {
        value: "generate",
        label: "Generate Image",
        description: "Create a new image from text prompt",
        requiresSourceImage: false,
        requiresMask: false,
        requiresStyleReference: false
    },
    {
        value: "inpaint",
        label: "Inpaint",
        description: "Edit specific areas of an image using a mask",
        requiresSourceImage: true,
        requiresMask: true,
        requiresStyleReference: false
    },
    {
        value: "outpaint",
        label: "Outpaint",
        description: "Extend image beyond its borders",
        requiresSourceImage: true,
        requiresMask: true,
        requiresStyleReference: false
    },
    {
        value: "upscale",
        label: "Upscale",
        description: "Increase image resolution (2x or 4x)",
        requiresSourceImage: true,
        requiresMask: false,
        requiresStyleReference: false
    },
    {
        value: "removeBackground",
        label: "Remove Background",
        description: "Remove background and create transparency",
        requiresSourceImage: true,
        requiresMask: false,
        requiresStyleReference: false
    },
    {
        value: "styleTransfer",
        label: "Style Transfer",
        description: "Apply artistic style from a reference image",
        requiresSourceImage: true,
        requiresMask: false,
        requiresStyleReference: true
    }
];

/**
 * Provider capabilities matrix
 */
export const PROVIDER_EDITING_CAPABILITIES: Record<string, ImageEditingCapabilities> = {
    openai: {
        generate: true,
        inpaint: true, // DALL-E 2 edit endpoint
        outpaint: false,
        upscale: false,
        removeBackground: false,
        styleTransfer: false
    },
    replicate: {
        generate: true,
        inpaint: true, // Flux Fill model
        outpaint: true, // Flux Fill with extended canvas
        upscale: true, // Real-ESRGAN, etc.
        removeBackground: true, // RemBG model
        styleTransfer: true // Flux Redux model
    },
    stabilityai: {
        generate: true,
        inpaint: true, // SD3 inpainting
        outpaint: true, // Outpainting via image-to-image
        upscale: true, // Creative/Conservative upscale endpoints
        removeBackground: true, // Remove Background API
        styleTransfer: true // Style transfer via img2img + reference
    },
    fal: {
        generate: true,
        inpaint: true, // Flux Fill
        outpaint: true, // Flux Fill
        upscale: true, // Various upscalers
        removeBackground: true, // Birefnet, etc.
        styleTransfer: true // Flux Redux
    }
};

/**
 * Get operations supported by a provider
 */
export function getOperationsForProvider(provider: string): ImageEditingOperationDefinition[] {
    const capabilities = PROVIDER_EDITING_CAPABILITIES[provider];
    if (!capabilities) {
        // Default to generate only for unknown providers
        return IMAGE_EDITING_OPERATIONS.filter((op) => op.value === "generate");
    }

    return IMAGE_EDITING_OPERATIONS.filter(
        (op) => capabilities[op.value as keyof ImageEditingCapabilities]
    );
}

/**
 * Check if a provider supports an operation
 */
export function providerSupportsEditingOperation(
    provider: string,
    operation: ImageEditingOperation
): boolean {
    const capabilities = PROVIDER_EDITING_CAPABILITIES[provider];
    if (!capabilities) return operation === "generate";
    return capabilities[operation] ?? false;
}

/**
 * Get editing operation metadata
 */
export function getOperationDefinition(
    operation: ImageEditingOperation
): ImageEditingOperationDefinition | undefined {
    return IMAGE_EDITING_OPERATIONS.find((op) => op.value === operation);
}

/**
 * Editing model mappings for providers
 * Maps operation + provider to specific model/endpoint
 */
export const EDITING_MODEL_MAPPINGS: Record<string, Record<string, string>> = {
    // FAL.ai editing models
    fal: {
        inpaint: "fal-ai/flux-pro/v1/fill",
        outpaint: "fal-ai/flux-pro/v1/fill",
        upscale: "fal-ai/clarity-upscaler",
        removeBackground: "fal-ai/birefnet",
        styleTransfer: "fal-ai/flux-pro/v1/redux"
    },
    // Replicate editing models
    replicate: {
        inpaint: "black-forest-labs/flux-fill-pro",
        outpaint: "black-forest-labs/flux-fill-pro",
        upscale: "nightmareai/real-esrgan",
        removeBackground: "cjwbw/rembg",
        styleTransfer: "black-forest-labs/flux-redux-dev"
    },
    // Stability AI endpoints
    stabilityai: {
        inpaint: "v2beta/stable-image/edit/inpaint",
        outpaint: "v2beta/stable-image/edit/outpaint",
        upscale: "v2beta/stable-image/upscale/creative",
        removeBackground: "v2beta/stable-image/edit/remove-background",
        styleTransfer: "v2beta/stable-image/control/style"
    },
    // OpenAI editing
    openai: {
        inpaint: "images/edits" // DALL-E 2 edit endpoint
    }
};

/**
 * Get the model/endpoint for an editing operation
 */
export function getEditingModel(
    provider: string,
    operation: ImageEditingOperation
): string | undefined {
    return EDITING_MODEL_MAPPINGS[provider]?.[operation];
}

/**
 * Upscale factor options
 */
export const UPSCALE_FACTOR_OPTIONS = [
    { value: 2, label: "2x" },
    { value: 4, label: "4x" }
];

/**
 * Outpaint direction options
 */
export const OUTPAINT_DIRECTION_OPTIONS = [
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "up", label: "Up" },
    { value: "down", label: "Down" },
    { value: "all", label: "All Directions" }
];
