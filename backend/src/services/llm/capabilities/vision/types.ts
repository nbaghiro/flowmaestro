/**
 * Types for vision analysis capability
 */

import type { AIProvider, VisionDetail, ResponseMetadata } from "../../client/types";

/**
 * Vision analysis request
 */
export interface VisionAnalysisRequest {
    /** Provider to use */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** Image URL or base64 */
    imageInput: string;
    /** Analysis prompt */
    prompt?: string;
    /** Detail level */
    detail?: VisionDetail;
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * Vision analysis response
 */
export interface VisionAnalysisResponse {
    /** Analysis text */
    analysis: string;
    /** Response metadata */
    metadata: ResponseMetadata;
}
