/**
 * Types for video generation capability
 */

import type {
    AIProvider,
    AspectRatio,
    VideoOutputFormat,
    ResponseMetadata
} from "../../client/types";

/**
 * Video generation request
 */
export interface VideoGenerationRequest {
    /** Provider to use */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** Generation prompt */
    prompt: string;
    /** Input image for I2V models (URL or base64) */
    imageInput?: string;
    /** Duration in seconds */
    duration?: number;
    /** Aspect ratio */
    aspectRatio?: AspectRatio;
    /** Enable looping */
    loop?: boolean;
    /** Output format */
    outputFormat?: VideoOutputFormat;
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * Video generation response
 */
export interface VideoGenerationResponse {
    /** Video URL */
    url?: string;
    /** Base64 encoded video */
    base64?: string;
    /** Response metadata */
    metadata: ResponseMetadata & {
        /** Video duration in seconds */
        duration?: number;
        /** Task/operation ID for tracking */
        taskId?: string;
    };
}

/**
 * Video generation status (for polling)
 */
export interface VideoGenerationStatus {
    /** Current status */
    status: "pending" | "processing" | "completed" | "failed";
    /** Progress percentage (0-100) */
    progress?: number;
    /** Error message if failed */
    error?: string;
    /** Result if completed */
    result?: VideoGenerationResponse;
}
