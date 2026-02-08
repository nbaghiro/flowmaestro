/**
 * useChatInput Hook
 *
 * Manages chat input state and keyboard handling.
 * Provides consistent input behavior across all chat interfaces.
 */

import { useState, useCallback, useRef, type KeyboardEvent } from "react";

interface UseChatInputOptions {
    /**
     * Callback when message should be sent
     */
    onSend: (message: string) => void | Promise<void>;
    /**
     * Whether sending is currently disabled (e.g., during streaming)
     * @default false
     */
    disabled?: boolean;
    /**
     * Clear input after sending
     * @default true
     */
    clearOnSend?: boolean;
}

interface UseChatInputReturn {
    /**
     * Current input value
     */
    value: string;
    /**
     * Set input value directly
     */
    setValue: (value: string) => void;
    /**
     * Handle input change event
     */
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    /**
     * Handle key press event (Enter to send)
     */
    onKeyPress: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    /**
     * Handle send action
     */
    handleSend: () => void;
    /**
     * Whether the send button should be disabled
     */
    canSend: boolean;
    /**
     * Ref to focus the input programmatically
     */
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    /**
     * Focus the input element
     */
    focus: () => void;
    /**
     * Clear the input value
     */
    clear: () => void;
}

/**
 * Hook that manages chat input state and behavior.
 *
 * @example
 * ```tsx
 * const { value, onChange, onKeyPress, handleSend, canSend, inputRef } = useChatInput({
 *   onSend: async (message) => {
 *     await sendMessage(message);
 *   },
 *   disabled: isStreaming
 * });
 *
 * return (
 *   <div className="flex gap-2">
 *     <input
 *       ref={inputRef as React.RefObject<HTMLInputElement>}
 *       value={value}
 *       onChange={onChange}
 *       onKeyPress={onKeyPress}
 *       disabled={!canSend}
 *     />
 *     <button onClick={handleSend} disabled={!canSend || !value.trim()}>
 *       Send
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useChatInput(options: UseChatInputOptions): UseChatInputReturn {
    const { onSend, disabled = false, clearOnSend = true } = options;

    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;

        if (clearOnSend) {
            setValue("");
        }

        onSend(trimmed);
    }, [value, disabled, clearOnSend, onSend]);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(e.target.value);
    }, []);

    const onKeyPress = useCallback(
        (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const clear = useCallback(() => {
        setValue("");
    }, []);

    const canSend = !disabled && value.trim().length > 0;

    return {
        value,
        setValue,
        onChange,
        onKeyPress,
        handleSend,
        canSend,
        inputRef,
        focus,
        clear
    };
}
