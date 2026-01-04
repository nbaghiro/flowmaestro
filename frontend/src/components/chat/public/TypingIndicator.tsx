interface TypingIndicatorProps {
    iconUrl?: string | null;
    borderRadius: number;
}

export function TypingIndicator({ iconUrl, borderRadius }: TypingIndicatorProps) {
    return (
        <div className="flex gap-2">
            {/* Avatar */}
            <div className="flex-shrink-0">
                {iconUrl ? (
                    <img src={iconUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
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
                            className="text-muted-foreground"
                        >
                            <path d="M12 8V4H8" />
                            <rect width="16" height="12" x="4" y="8" rx="2" />
                            <path d="M2 14h2" />
                            <path d="M20 14h2" />
                            <path d="M15 13v2" />
                            <path d="M9 13v2" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Typing bubble */}
            <div
                className="px-4 py-3 bg-muted"
                style={{
                    borderRadius: `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`
                }}
            >
                <div className="flex gap-1">
                    <span
                        className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                    />
                    <span
                        className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <span
                        className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
            </div>
        </div>
    );
}
