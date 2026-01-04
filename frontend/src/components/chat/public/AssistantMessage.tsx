import type { PublicChatMessage } from "@flowmaestro/shared";

interface AssistantMessageProps {
    message: PublicChatMessage;
    borderRadius: number;
    iconUrl?: string | null;
}

export function AssistantMessage({ message, borderRadius, iconUrl }: AssistantMessageProps) {
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

            {/* Message bubble */}
            <div
                className="max-w-[85%] px-4 py-2.5 bg-muted"
                style={{
                    borderRadius: `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`
                }}
            >
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {message.content}
                </p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                            <a
                                key={index}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-2 py-1 bg-background/50 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                                <span className="truncate max-w-[150px]">
                                    {attachment.fileName}
                                </span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
