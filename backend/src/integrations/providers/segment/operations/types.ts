/**
 * Segment API Response Types
 */

/**
 * Standard Segment API response
 * Segment returns a simple { success: true } for all successful operations
 */
export interface SegmentApiResponse {
    success: boolean;
}

/**
 * Track event response
 */
export type TrackEventResponse = SegmentApiResponse;

/**
 * Identify user response
 */
export type IdentifyUserResponse = SegmentApiResponse;

/**
 * Page view response
 */
export type PageViewResponse = SegmentApiResponse;

/**
 * Screen view response
 */
export type ScreenViewResponse = SegmentApiResponse;

/**
 * Group response
 */
export type GroupResponse = SegmentApiResponse;

/**
 * Alias response
 */
export type AliasResponse = SegmentApiResponse;

/**
 * Batch response
 */
export type BatchResponse = SegmentApiResponse;

/**
 * Batch event types
 */
export type BatchEventType = "track" | "identify" | "page" | "screen" | "group" | "alias";

/**
 * Base batch event structure
 */
export interface BaseBatchEvent {
    type: BatchEventType;
    userId?: string;
    anonymousId?: string;
    context?: Record<string, unknown>;
    integrations?: Record<string, boolean | Record<string, unknown>>;
    timestamp?: string;
    messageId?: string;
}

/**
 * Track event in batch
 */
export interface BatchTrackEvent extends BaseBatchEvent {
    type: "track";
    event: string;
    properties?: Record<string, unknown>;
}

/**
 * Identify event in batch
 */
export interface BatchIdentifyEvent extends BaseBatchEvent {
    type: "identify";
    traits?: Record<string, unknown>;
}

/**
 * Page event in batch
 */
export interface BatchPageEvent extends BaseBatchEvent {
    type: "page";
    name?: string;
    properties?: Record<string, unknown>;
}

/**
 * Screen event in batch
 */
export interface BatchScreenEvent extends BaseBatchEvent {
    type: "screen";
    name?: string;
    properties?: Record<string, unknown>;
}

/**
 * Group event in batch
 */
export interface BatchGroupEvent extends BaseBatchEvent {
    type: "group";
    groupId: string;
    traits?: Record<string, unknown>;
}

/**
 * Alias event in batch
 */
export interface BatchAliasEvent extends BaseBatchEvent {
    type: "alias";
    previousId: string;
}

/**
 * Any batch event type
 */
export type BatchEvent =
    | BatchTrackEvent
    | BatchIdentifyEvent
    | BatchPageEvent
    | BatchScreenEvent
    | BatchGroupEvent
    | BatchAliasEvent;
