import type { PublicChatInterface } from "@flowmaestro/shared";

interface WidgetBubbleProps {
    chatInterface: PublicChatInterface;
    onClick: () => void;
    unreadCount?: number;
}

export function WidgetBubble({ chatInterface, onClick, unreadCount = 0 }: WidgetBubbleProps) {
    const { widgetButtonIcon, widgetButtonText, primaryColor, borderRadius, widgetPosition } =
        chatInterface;

    const positionClasses = widgetPosition === "bottom-left" ? "left-4" : "right-4";

    return (
        <button
            onClick={onClick}
            className={`fixed bottom-4 ${positionClasses} flex items-center gap-2 px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl z-50`}
            style={{
                backgroundColor: primaryColor,
                borderRadius: widgetButtonText ? `${borderRadius * 2}px` : "50%",
                padding: widgetButtonText ? undefined : "14px"
            }}
            aria-label="Open chat"
        >
            {/* Icon */}
            <span className="text-xl">{widgetButtonIcon}</span>

            {/* Text (optional) */}
            {widgetButtonText && <span className="font-medium">{widgetButtonText}</span>}

            {/* Unread badge */}
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center px-1.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </button>
    );
}
