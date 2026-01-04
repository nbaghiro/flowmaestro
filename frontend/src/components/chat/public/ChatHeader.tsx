import { useState } from "react";
import type { PublicChatInterface } from "@flowmaestro/shared";

interface ChatHeaderProps {
    chatInterface: PublicChatInterface;
    onClose?: () => void;
    showCloseButton?: boolean;
}

// Check if string is a URL (vs emoji)
function isUrl(str: string | null | undefined): boolean {
    if (!str || typeof str !== "string") return false;
    const trimmed = str.trim();
    return trimmed.startsWith("http") || trimmed.startsWith("data:") || trimmed.startsWith("blob:");
}

// Check if string is a valid icon (emoji or URL)
function hasIcon(str: string | null | undefined): boolean {
    if (!str || typeof str !== "string") return false;
    return str.trim().length > 0;
}

export function ChatHeader({ chatInterface, onClose, showCloseButton = false }: ChatHeaderProps) {
    const { coverType, coverValue, iconUrl, title, description, primaryColor, borderRadius } =
        chatInterface;
    const [iconError, setIconError] = useState(false);

    const hasCustomIcon = hasIcon(iconUrl) && !iconError;
    const isImageUrl = isUrl(iconUrl);

    // Render cover based on type
    const renderCover = () => {
        switch (coverType) {
            case "image":
                return (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${coverValue})` }}
                    />
                );
            case "gradient":
                return <div className="absolute inset-0" style={{ background: coverValue }} />;
            case "color":
            default:
                return (
                    <div
                        className="absolute inset-0"
                        style={{ backgroundColor: coverValue || primaryColor }}
                    />
                );
        }
    };

    return (
        <header className="relative flex-shrink-0">
            {/* Cover area */}
            <div
                className="relative h-40 overflow-hidden"
                style={{ borderRadius: `${borderRadius}px ${borderRadius}px 0 0` }}
            >
                {renderCover()}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

                {/* Close button for widget mode */}
                {showCloseButton && onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                        aria-label="Close chat"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Icon (overlaps cover) */}
            {hasCustomIcon && (
                <div className="relative px-4 -mt-8">
                    <div
                        className="w-16 h-16 rounded-full border-4 border-background bg-background shadow-md overflow-hidden flex items-center justify-center"
                        style={{ borderRadius: `${borderRadius * 2}px` }}
                    >
                        {isImageUrl ? (
                            <img
                                src={iconUrl!}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={() => setIconError(true)}
                            />
                        ) : (
                            <span className="text-3xl">{iconUrl}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Title and description (below cover) */}
            <div className={`px-4 pb-4 ${hasCustomIcon ? "pt-3" : "pt-4"}`}>
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
                )}
            </div>
        </header>
    );
}
