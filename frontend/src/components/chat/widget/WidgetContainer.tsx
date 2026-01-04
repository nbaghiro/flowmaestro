import { useEffect } from "react";
import { usePublicChatStore } from "../../../stores/publicChatStore";
import { WidgetBubble } from "./WidgetBubble";
import { WidgetPanel } from "./WidgetPanel";

interface WidgetContainerProps {
    slug: string;
}

/**
 * WidgetContainer - Main widget component that manages the widget lifecycle
 *
 * This component:
 * - Loads the chat interface config
 * - Initializes the session
 * - Renders the bubble or panel based on state
 */
export function WidgetContainer({ slug }: WidgetContainerProps) {
    const {
        chatInterface,
        isLoadingInterface,
        isCreatingSession,
        messages,
        inputValue,
        isSending,
        isWidgetOpen,
        error,
        loadInterface,
        initSession,
        setInputValue,
        sendMessage,
        toggleWidget,
        closeWidget
    } = usePublicChatStore();

    // Load interface on mount
    useEffect(() => {
        const init = async () => {
            const loaded = await loadInterface(slug);
            if (loaded) {
                await initSession(slug);
            }
        };

        init();
    }, [slug, loadInterface, initSession]);

    // Don't render anything while loading or if no interface
    if (isLoadingInterface || isCreatingSession) {
        return null;
    }

    if (!chatInterface) {
        // Optionally show a minimal error indicator
        return null;
    }

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
        }
    };

    return (
        <>
            {/* Widget panel (when open) */}
            {isWidgetOpen && (
                <WidgetPanel
                    chatInterface={chatInterface}
                    messages={messages}
                    inputValue={inputValue}
                    isSending={isSending}
                    isTyping={false}
                    error={error}
                    onInputChange={setInputValue}
                    onSendMessage={handleSendMessage}
                    onClose={closeWidget}
                />
            )}

            {/* Widget bubble (always visible) */}
            <WidgetBubble chatInterface={chatInterface} onClick={toggleWidget} />
        </>
    );
}
