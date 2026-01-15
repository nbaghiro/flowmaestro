/**
 * MediaOutput Component
 *
 * Extracts and displays media (images/videos) from workflow execution output JSON.
 * Shows inline previews above the raw JSON output.
 */

import { cn } from "../../lib/utils";
import { MediaPreview } from "./MediaPreview";

export interface MediaOutputProps {
    /** The output data - could be JSON with images/video or direct URL */
    data: unknown;
    /** Show JSON below media preview (default: true) */
    showJson?: boolean;
    /** Max images to show in grid (default: 4) */
    maxImages?: number;
    /** Additional CSS classes */
    className?: string;
}

interface ExtractedMedia {
    images: string[];
    video: string | null;
}

/**
 * Recursively extracts media URLs from various output formats
 */
function extractMedia(data: unknown): ExtractedMedia {
    const images: string[] = [];
    let video: string | null = null;

    if (!data || typeof data !== "object") {
        return { images, video };
    }

    const obj = data as Record<string, unknown>;

    // Image generation output format: { images: [{ url, base64 }] }
    if (Array.isArray(obj.images)) {
        for (const img of obj.images) {
            if (typeof img === "object" && img !== null) {
                const imgObj = img as Record<string, unknown>;
                if (typeof imgObj.url === "string" && imgObj.url) {
                    images.push(imgObj.url);
                } else if (typeof imgObj.base64 === "string" && imgObj.base64) {
                    images.push(imgObj.base64);
                }
            } else if (typeof img === "string" && img) {
                images.push(img);
            }
        }
    }

    // Video generation output format: { video: { url, base64 } }
    if (typeof obj.video === "object" && obj.video !== null) {
        const videoObj = obj.video as Record<string, unknown>;
        if (typeof videoObj.url === "string" && videoObj.url) {
            video = videoObj.url;
        } else if (typeof videoObj.base64 === "string" && videoObj.base64) {
            video = videoObj.base64;
        }
    }

    // Direct URL/base64 fields (fallbacks)
    if (!images.length && !video) {
        if (typeof obj.url === "string" && obj.url) {
            // Determine if image or video from URL
            const url = obj.url.toLowerCase();
            if (url.includes(".mp4") || url.includes(".webm") || url.includes(".mov")) {
                video = obj.url;
            } else {
                images.push(obj.url);
            }
        }
        if (typeof obj.image_url === "string" && obj.image_url) {
            images.push(obj.image_url);
        }
        if (typeof obj.video_url === "string" && obj.video_url) {
            video = obj.video_url;
        }
    }

    // Check nested outputVariable wrapping (e.g., { myOutput: { images: [...] } })
    if (!images.length && !video) {
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === "object" && value !== null) {
                const nested = extractMedia(value);
                if (nested.images.length > 0 || nested.video) {
                    images.push(...nested.images);
                    if (nested.video) video = nested.video;
                    break;
                }
            }
        }
    }

    return { images, video };
}

/**
 * Check if data contains media
 */
export function hasMediaContent(data: unknown): boolean {
    const { images, video } = extractMedia(data);
    return images.length > 0 || video !== null;
}

export function MediaOutput({ data, showJson = true, maxImages = 4, className }: MediaOutputProps) {
    const { images, video } = extractMedia(data);
    const hasMedia = images.length > 0 || video !== null;

    if (!hasMedia && !showJson) {
        return null;
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Media Preview */}
            {hasMedia && (
                <div className="space-y-3">
                    {/* Video */}
                    {video && <MediaPreview src={video} type="video" maxHeight={400} />}

                    {/* Images Grid */}
                    {images.length > 0 && (
                        <div
                            className={cn(
                                "grid gap-2",
                                images.length === 1
                                    ? "grid-cols-1"
                                    : images.length === 2
                                      ? "grid-cols-2"
                                      : images.length <= 4
                                        ? "grid-cols-2"
                                        : "grid-cols-3"
                            )}
                        >
                            {images.slice(0, maxImages).map((src, idx) => (
                                <MediaPreview
                                    key={idx}
                                    src={src}
                                    type="image"
                                    maxHeight={images.length === 1 ? 400 : 200}
                                />
                            ))}
                        </div>
                    )}

                    {images.length > maxImages && (
                        <p className="text-xs text-muted-foreground text-center">
                            +{images.length - maxImages} more images
                        </p>
                    )}
                </div>
            )}

            {/* JSON Output */}
            {showJson && (
                <div className="bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
