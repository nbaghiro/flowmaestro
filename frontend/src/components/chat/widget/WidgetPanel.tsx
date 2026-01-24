import type {
    PublicChatInterface,
    PublicChatMessage,
    ChatMessageAttachment
} from "@flowmaestro/shared";
import { ChatContainer } from "../public";

interface WidgetPanelProps {
    chatInterface: PublicChatInterface;
    messages: PublicChatMessage[];
    inputValue: string;
    isSending: boolean;
    isTyping?: boolean;
    error: string | null;
    onInputChange: (value: string) => void;
    onSendMessage: (message: string, attachments?: ChatMessageAttachment[]) => void;
    onClose: () => void;
}

export function WidgetPanel({
    chatInterface,
    messages,
    inputValue,
    isSending,
    isTyping = false,
    error,
    onInputChange,
    onSendMessage,
    onClose
}: WidgetPanelProps) {
    const { borderRadius, widgetPosition } = chatInterface;

    const positionClasses = widgetPosition === "bottom-left" ? "left-4" : "right-4";

    return (
        <div
            className={`fixed bottom-20 ${positionClasses} w-80 sm:w-96 h-[500px] max-h-[80vh] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200`}
            style={{ borderRadius: `${borderRadius}px` }}
        >
            <ChatContainer
                chatInterface={chatInterface}
                messages={messages}
                inputValue={inputValue}
                isSending={isSending}
                isTyping={isTyping}
                error={error}
                onInputChange={onInputChange}
                onSendMessage={onSendMessage}
                onClose={onClose}
                showCloseButton={true}
                variant="widget"
            />
        </div>
    );
}
