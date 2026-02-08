/**
 * ChatMessageList Component
 *
 * Scrollable container for chat messages with auto-scroll behavior.
 * Provides consistent message list layout across all chat interfaces.
 */

import { Bot } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../lib/utils";

interface ChatMessageListProps {
    /**
     * Child message elements to render
     */
    children: ReactNode;
    /**
     * Empty state content when no messages exist
     */
    emptyState?: ReactNode;
    /**
     * Whether there are any messages
     */
    hasMessages: boolean;
    /**
     * Additional dependencies that should trigger auto-scroll
     */
    scrollDependencies?: unknown[];
    /**
     * Additional class name for the container
     */
    className?: string;
    /**
     * Whether to show typing indicator
     */
    isTyping?: boolean;
    /**
     * Custom typing indicator component
     */
    typingIndicator?: ReactNode;
}

interface DefaultEmptyStateProps {
    icon?: ReactNode;
    title?: string;
    description?: string;
}

/**
 * Default empty state component for when no messages exist
 */
export function DefaultEmptyState({
    icon,
    title = "No messages yet",
    description = "Send a message to start the conversation"
}: DefaultEmptyStateProps) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground max-w-sm">
                {icon || <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />}
                <p className="text-sm mb-2">{title}</p>
                <p className="text-xs">{description}</p>
            </div>
        </div>
    );
}

/**
 * Scrollable message list container with auto-scroll.
 *
 * @example
 * ```tsx
 * <ChatMessageList
 *   hasMessages={messages.length > 0}
 *   scrollDependencies={[messages, isStreaming]}
 *   emptyState={<DefaultEmptyState title="Hey! I'm your AI assistant" />}
 * >
 *   {messages.map(msg => <ChatMessage key={msg.id} {...msg} />)}
 * </ChatMessageList>
 * ```
 */
export function ChatMessageList({
    children,
    emptyState,
    hasMessages,
    scrollDependencies = [],
    className,
    isTyping = false,
    typingIndicator
}: ChatMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when dependencies change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        // Dependencies intentionally spread - scrollDependencies changes trigger scroll
    }, [hasMessages, isTyping, ...scrollDependencies]);

    if (!hasMessages) {
        return (
            <div className={cn("flex-1 overflow-y-auto p-4 bg-background", className)}>
                {emptyState || <DefaultEmptyState />}
            </div>
        );
    }

    return (
        <div className={cn("flex-1 overflow-y-auto p-4 space-y-4 bg-background", className)}>
            {children}
            {isTyping && typingIndicator}
            <div ref={messagesEndRef} />
        </div>
    );
}
