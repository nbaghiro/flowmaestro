/**
 * ChatBubble Component
 *
 * Unified message bubble for user, assistant, and system messages.
 * Provides consistent styling and layout across all chat interfaces.
 */

import { Bot, User } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { MarkdownRenderer } from "../../common/MarkdownRenderer";
import { TypingDots } from "../../common/TypingDots";

type MessageRole = "user" | "assistant" | "system" | "tool";

type AssistantVariant = "default" | "muted" | "bordered";

interface ChatBubbleProps {
    /**
     * Message role determines styling and layout
     */
    role: MessageRole;
    /**
     * Message content (text or markdown)
     */
    content: string;
    /**
     * Whether this message is currently streaming
     * @default false
     */
    isStreaming?: boolean;
    /**
     * Whether to show typing indicator instead of content
     * @default false
     */
    showTypingIndicator?: boolean;
    /**
     * Custom avatar component (replaces default icon)
     */
    avatar?: ReactNode;
    /**
     * Whether to render content as markdown
     * @default true for assistant messages, false for user messages
     */
    useMarkdown?: boolean;
    /**
     * Additional content below the message (e.g., proposed changes, actions)
     */
    footer?: ReactNode;
    /**
     * Additional class name for the bubble
     */
    className?: string;
    /**
     * Custom icon for the avatar
     */
    icon?: ReactNode;
    /**
     * Whether to invert prose colors (for user messages with dark background)
     * @default false
     */
    invertProse?: boolean;
    /**
     * Styling variant for assistant messages
     * - "default": bg-card border border-border
     * - "muted": bg-muted (no border)
     * - "bordered": bg-card border border-border (same as default)
     * @default "default"
     */
    assistantVariant?: AssistantVariant;
}

/**
 * Default avatar for each role
 */
function DefaultAvatar({ role, icon }: { role: MessageRole; icon?: ReactNode }) {
    if (icon) {
        return <>{icon}</>;
    }

    switch (role) {
        case "user":
            return (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                </div>
            );
        case "assistant":
            return (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                </div>
            );
        default:
            return null;
    }
}

/**
 * Unified chat bubble component for all message types.
 *
 * @example
 * ```tsx
 * // User message
 * <ChatBubble role="user" content="Hello!" />
 *
 * // Assistant message with markdown
 * <ChatBubble role="assistant" content="# Hello\nHow can I help?" />
 *
 * // Streaming message
 * <ChatBubble role="assistant" content={streamingContent} isStreaming />
 *
 * // With custom footer
 * <ChatBubble
 *   role="assistant"
 *   content="Here are my changes..."
 *   footer={<ProposedChanges changes={changes} onApply={...} />}
 * />
 * ```
 */
export function ChatBubble({
    role,
    content,
    isStreaming = false,
    showTypingIndicator = false,
    avatar,
    useMarkdown,
    footer,
    className,
    icon,
    invertProse = false,
    assistantVariant = "default"
}: ChatBubbleProps) {
    // Default markdown behavior: true for assistant, false for user
    const shouldUseMarkdown = useMarkdown ?? role === "assistant";

    // System messages are centered and muted
    if (role === "system") {
        return (
            <div className="flex justify-center my-2">
                <p className="text-xs text-muted-foreground italic max-w-[80%] text-center">
                    {content}
                </p>
            </div>
        );
    }

    const isUser = role === "user";
    const avatarComponent = avatar || <DefaultAvatar role={role} icon={icon} />;

    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start", className)}>
            {/* Avatar - Left for assistant, right for user */}
            {!isUser && avatarComponent}

            <div className={cn("flex-1", isUser ? "flex justify-end" : "max-w-[80%]")}>
                {/* Message Bubble */}
                <div
                    className={cn(
                        "rounded-lg px-4 py-3",
                        isUser
                            ? "max-w-[80%] bg-primary text-primary-foreground"
                            : assistantVariant === "muted"
                              ? "bg-muted text-foreground"
                              : "bg-muted border border-border/50 text-foreground"
                    )}
                >
                    {showTypingIndicator || (isStreaming && !content) ? (
                        <TypingDots />
                    ) : shouldUseMarkdown ? (
                        <MarkdownRenderer
                            content={content}
                            className={invertProse || isUser ? "prose-invert" : undefined}
                        />
                    ) : (
                        <div className="whitespace-pre-wrap break-words text-sm">{content}</div>
                    )}
                </div>

                {/* Footer content (proposed changes, actions, etc.) */}
                {footer}
            </div>

            {/* User avatar on right */}
            {isUser && avatarComponent}
        </div>
    );
}
