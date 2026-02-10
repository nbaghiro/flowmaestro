import { useRef } from "react";
import type { PublicChatMessage } from "@flowmaestro/shared";
import { useChatScroll } from "../../../hooks/useChatScroll";
import { AssistantMessage } from "./AssistantMessage";
import { TypingIndicator } from "./TypingIndicator";
import { UserMessage } from "./UserMessage";

interface MessageListProps {
    messages: PublicChatMessage[];
    isTyping: boolean;
    borderRadius: number;
    iconUrl?: string | null;
}

export function MessageList({ messages, isTyping, borderRadius, iconUrl }: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages or typing state changes
    const bottomRef = useChatScroll([messages, isTyping]);

    if (messages.length === 0 && !isTyping) {
        return null;
    }

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((message) =>
                message.role === "user" ? (
                    <UserMessage key={message.id} message={message} borderRadius={borderRadius} />
                ) : (
                    <AssistantMessage
                        key={message.id}
                        message={message}
                        borderRadius={borderRadius}
                        iconUrl={iconUrl}
                    />
                )
            )}

            {isTyping && <TypingIndicator iconUrl={iconUrl} borderRadius={borderRadius} />}

            <div ref={bottomRef} />
        </div>
    );
}
