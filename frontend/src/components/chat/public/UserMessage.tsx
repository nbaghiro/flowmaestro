import type { PublicChatMessage } from "@flowmaestro/shared";

interface UserMessageProps {
    message: PublicChatMessage;
    primaryColor: string;
    borderRadius: number;
}

export function UserMessage({ message, primaryColor, borderRadius }: UserMessageProps) {
    return (
        <div className="flex justify-end">
            <div
                className="max-w-[85%] px-4 py-2.5 text-white"
                style={{
                    backgroundColor: primaryColor,
                    borderRadius: `${borderRadius}px ${borderRadius}px 4px ${borderRadius}px`
                }}
            >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                            <a
                                key={index}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
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
