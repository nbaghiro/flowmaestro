/**
 * Types for image generation capability
 */

import type {
    AIProvider,
    ImageSize,
    AspectRatio,
    ImageQuality,
    ImageStyle,
    ImageOutputFormat,
    ImageOperation,
    ResponseMetadata
} from "../../types";

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
    /** Provider to use */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** Generation prompt */
    prompt: string;
    /** Negative prompt (for providers that support it) */
    negativePrompt?: string;
    /** Operation type */
    operation?: ImageOperation;
    /** Image size */
    size?: ImageSize;
    /** Aspect ratio (alternative to size) */
    aspectRatio?: AspectRatio;
    /** Quality level */
    quality?: ImageQuality;
    /** Style (DALL-E 3) */
    style?: ImageStyle;
    /** Number of images to generate */
    n?: number;
    /** Output format */
    outputFormat?: ImageOutputFormat;
    /** Source image for editing operations (URL or base64) */
    sourceImage?: string;
    /** Mask for inpainting (URL or base64) */
    mask?: string;
    /** Style reference image for style transfer */
    styleReference?: string;
    /** Upscale factor */
    scaleFactor?: 2 | 4;
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * Generated image
 */
export interface GeneratedImage {
    /** Image URL */
    url?: string;
    /** Base64 encoded image */
    base64?: string;
    /** Revised prompt (DALL-E 3) */
    revisedPrompt?: string;
    /** Seed used (if available) */
    seed?: number;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
    /** Generated images */
    images: GeneratedImage[];
    /** Operation performed */
    operation: ImageOperation;
    /** Response metadata */
    metadata: ResponseMetadata;
}
