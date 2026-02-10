/**
 * useChatScroll Hook
 *
 * Handles auto-scrolling to bottom when messages change.
 * Used across all chat interfaces for consistent scroll behavior.
 */

import { useEffect, useRef } from "react";

interface UseChatScrollOptions {
    /**
     * Scroll behavior: 'smooth' for animated, 'auto' for instant
     * @default 'smooth'
     */
    behavior?: ScrollBehavior;
    /**
     * Whether scrolling is enabled
     * @default true
     */
    enabled?: boolean;
}

/**
 * Hook that provides a ref and auto-scrolls to that ref when dependencies change.
 *
 * @example
 * ```tsx
 * const messagesEndRef = useChatScroll([messages, isStreaming]);
 *
 * return (
 *   <div>
 *     {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *     <div ref={messagesEndRef} />
 *   </div>
 * );
 * ```
 */
export function useChatScroll<T>(dependencies: T[], options: UseChatScrollOptions = {}) {
    const { behavior = "smooth", enabled = true } = options;
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (enabled && scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior });
        }
        // Dependencies intentionally passed as array - triggers scroll when any dependency changes
    }, dependencies);

    return scrollRef;
}
