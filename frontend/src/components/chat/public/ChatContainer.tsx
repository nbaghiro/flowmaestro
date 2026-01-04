import type { PublicChatInterface, PublicChatMessage } from "@flowmaestro/shared";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { WelcomeScreen } from "./WelcomeScreen";

interface ChatContainerProps {
    chatInterface: PublicChatInterface;
    messages: PublicChatMessage[];
    inputValue: string;
    isSending: boolean;
    isTyping?: boolean;
    error: string | null;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    onClose?: () => void;
    showCloseButton?: boolean;
    variant?: "full" | "embed" | "widget";
}

export function ChatContainer({
    chatInterface,
    messages,
    inputValue,
    isSending,
    isTyping = false,
    error,
    onInputChange,
    onSendMessage,
    onClose,
    showCloseButton = false,
    variant = "full"
}: ChatContainerProps) {
    const {
        primaryColor,
        fontFamily,
        borderRadius,
        placeholderText,
        allowFileUpload,
        iconUrl,
        suggestedPrompts
    } = chatInterface;

    // Apply font family to container
    const containerStyle = {
        fontFamily: fontFamily !== "system" ? `"${fontFamily}", system-ui, sans-serif` : undefined,
        "--primary-color": primaryColor
    } as React.CSSProperties;

    // Handle prompt selection - set input value and trigger send
    const handlePromptSelect = (text: string) => {
        onInputChange(text);
        // Use setTimeout to ensure state is updated before sending
        setTimeout(() => {
            onSendMessage();
        }, 0);
    };

    const hasMessages = messages.length > 0;

    // Determine container classes based on variant
    const containerClasses = (() => {
        switch (variant) {
            case "widget":
                return "flex flex-col bg-background shadow-2xl overflow-hidden";
            case "embed":
                return "flex flex-col h-full bg-background";
            case "full":
            default:
                return "flex flex-col h-full bg-background";
        }
    })();

    return (
        <div className={containerClasses} style={containerStyle}>
            {/* Header */}
            <ChatHeader
                chatInterface={chatInterface}
                onClose={onClose}
                showCloseButton={showCloseButton}
            />

            {/* Error message */}
            {error && (
                <div className="mx-4 my-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {/* Messages or welcome screen */}
            {hasMessages ? (
                <MessageList
                    messages={messages}
                    isTyping={isTyping}
                    primaryColor={primaryColor}
                    borderRadius={borderRadius}
                    iconUrl={iconUrl}
                />
            ) : (
                <WelcomeScreen chatInterface={chatInterface} />
            )}

            {/* Suggested prompts above input */}
            {!hasMessages && suggestedPrompts.length > 0 && (
                <SuggestedPrompts prompts={suggestedPrompts} onSelect={handlePromptSelect} />
            )}

            {/* Input */}
            <MessageInput
                value={inputValue}
                onChange={onInputChange}
                onSend={onSendMessage}
                placeholder={placeholderText}
                isSending={isSending}
                allowFileUpload={allowFileUpload}
            />
        </div>
    );
}
