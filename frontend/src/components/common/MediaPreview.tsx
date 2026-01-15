/**
 * MediaPreview Component
 *
 * A versatile component for displaying images and videos with support for:
 * - Auto-detection of media type from URL/data URI/base64
 * - Fullscreen viewing modal
 * - Download functionality
 * - External link opening
 */

import { Download, ExternalLink, Maximize2, X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "../../lib/utils";

export interface MediaPreviewProps {
    /** URL or base64 data source */
    src: string;
    /** Media type - auto-detected if not provided */
    type?: "image" | "video" | "auto";
    /** Alt text for images */
    alt?: string;
    /** Additional CSS classes */
    className?: string;
    /** Show download button */
    showDownload?: boolean;
    /** Show open in new tab button */
    showOpenExternal?: boolean;
    /** Show fullscreen button */
    showFullscreen?: boolean;
    /** Max height in pixels */
    maxHeight?: number;
    /** Thumbnail mode - smaller preview with minimal controls */
    thumbnail?: boolean;
}

/**
 * Detect media type from URL or data string
 */
function detectMediaType(src: string): "image" | "video" | "unknown" {
    const lowerSrc = src.toLowerCase();

    // Check data URI prefix
    if (src.startsWith("data:image/")) return "image";
    if (src.startsWith("data:video/")) return "video";

    // Check common file extensions in URL
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"];
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];

    for (const ext of imageExtensions) {
        if (lowerSrc.includes(ext)) return "image";
    }
    for (const ext of videoExtensions) {
        if (lowerSrc.includes(ext)) return "video";
    }

    return "unknown";
}

/**
 * Convert raw base64 to a displayable data URL
 */
function getDisplaySrc(src: string): string {
    // Already a valid URL or data URI
    if (
        src.startsWith("data:") ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("blob:")
    ) {
        return src;
    }

    // Raw base64 - detect image type from magic bytes
    const prefix = src.substring(0, 10);
    if (prefix.startsWith("/9j/")) {
        return `data:image/jpeg;base64,${src}`;
    } else if (prefix.startsWith("iVBOR")) {
        return `data:image/png;base64,${src}`;
    } else if (prefix.startsWith("R0lGO")) {
        return `data:image/gif;base64,${src}`;
    } else if (prefix.startsWith("UklGR")) {
        return `data:image/webp;base64,${src}`;
    } else if (prefix.startsWith("AAAA")) {
        // MP4 video magic bytes (ftyp)
        return `data:video/mp4;base64,${src}`;
    }

    // Default to PNG for unknown base64
    return `data:image/png;base64,${src}`;
}

export function MediaPreview({
    src,
    type = "auto",
    alt = "Generated media",
    className,
    showDownload = true,
    showOpenExternal = true,
    showFullscreen = true,
    maxHeight = 400,
    thumbnail = false
}: MediaPreviewProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fullscreenVideoRef = useRef<HTMLVideoElement>(null);

    const mediaType = type === "auto" ? detectMediaType(src) : type;
    const displaySrc = getDisplaySrc(src);
    const isExternalUrl = displaySrc.startsWith("http://") || displaySrc.startsWith("https://");

    const handleDownload = async () => {
        try {
            const response = await fetch(displaySrc);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `generated-${Date.now()}.${mediaType === "video" ? "mp4" : "png"}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            // Download failed silently - user can retry
        }
    };

    const handleOpenExternal = () => {
        window.open(displaySrc, "_blank");
    };

    const toggleVideoPlay = () => {
        if (videoRef.current) {
            if (isVideoPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsVideoPlaying(!isVideoPlaying);
        }
    };

    const toggleVideoMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isVideoMuted;
            setIsVideoMuted(!isVideoMuted);
        }
    };

    if (error) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center bg-muted/50 rounded-lg p-4 text-muted-foreground text-sm",
                    className
                )}
            >
                Failed to load media: {error}
            </div>
        );
    }

    const thumbnailStyles = thumbnail ? "max-w-[200px] max-h-[150px]" : "";

    return (
        <>
            <div
                className={cn(
                    "relative group rounded-lg overflow-hidden bg-muted/30 border border-border",
                    thumbnailStyles,
                    className
                )}
            >
                {/* Media Content */}
                {mediaType === "image" ? (
                    <img
                        src={displaySrc}
                        alt={alt}
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: thumbnail ? 150 : maxHeight }}
                        onError={() => setError("Failed to load image")}
                    />
                ) : mediaType === "video" ? (
                    <div className="relative">
                        <video
                            ref={videoRef}
                            src={displaySrc}
                            className="w-full h-auto"
                            style={{ maxHeight: thumbnail ? 150 : maxHeight }}
                            muted={isVideoMuted}
                            loop
                            playsInline
                            onError={() => setError("Failed to load video")}
                            onClick={toggleVideoPlay}
                        />
                        {/* Video Controls Overlay */}
                        {!thumbnail && (
                            <div className="absolute bottom-2 left-2 flex gap-1">
                                <button
                                    onClick={toggleVideoPlay}
                                    className="p-1.5 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                                    title={isVideoPlaying ? "Pause" : "Play"}
                                >
                                    {isVideoPlaying ? (
                                        <Pause className="w-4 h-4" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    onClick={toggleVideoMute}
                                    className="p-1.5 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                                    title={isVideoMuted ? "Unmute" : "Mute"}
                                >
                                    {isVideoMuted ? (
                                        <VolumeX className="w-4 h-4" />
                                    ) : (
                                        <Volume2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center text-muted-foreground">Unknown media type</div>
                )}

                {/* Action Buttons - appear on hover */}
                <div
                    className={cn(
                        "absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        thumbnail && "opacity-100"
                    )}
                >
                    {showFullscreen && !thumbnail && (
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="p-1.5 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                            title="Fullscreen"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    )}
                    {showOpenExternal && isExternalUrl && (
                        <button
                            onClick={handleOpenExternal}
                            className="p-1.5 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    )}
                    {showDownload && (
                        <button
                            onClick={handleDownload}
                            className="p-1.5 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Fullscreen Modal */}
            {isFullscreen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setIsFullscreen(false)}
                >
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {mediaType === "image" ? (
                        <img
                            src={displaySrc}
                            alt={alt}
                            className="max-w-[90vw] max-h-[90vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <video
                            ref={fullscreenVideoRef}
                            src={displaySrc}
                            className="max-w-[90vw] max-h-[90vh]"
                            controls
                            autoPlay
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            )}
        </>
    );
}
