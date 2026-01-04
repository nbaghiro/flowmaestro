import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChatContainer } from "../components/chat/public";
import { usePublicChatStore } from "../stores/publicChatStore";

/**
 * EmbedChatPage - Rendered inside an iframe on external websites
 *
 * This is a minimal version of PublicChatPage designed to be embedded:
 * - No padding or decorative wrapper
 * - Fills entire iframe
 * - Handles resize messages for responsive iframe
 */
export function EmbedChatPage() {
    const { slug } = useParams<{ slug: string }>();
    const {
        chatInterface,
        isLoadingInterface,
        isCreatingSession,
        messages,
        inputValue,
        isSending,
        error,
        loadInterface,
        initSession,
        setInputValue,
        sendMessage,
        reset
    } = usePublicChatStore();

    // Load interface and initialize session on mount
    useEffect(() => {
        if (!slug) return;

        const init = async () => {
            const loaded = await loadInterface(slug);
            if (loaded) {
                await initSession(slug);
            }
        };

        init();

        return () => {
            reset();
        };
    }, [slug, loadInterface, initSession, reset]);

    // Notify parent of resize (for responsive iframe embedding)
    useEffect(() => {
        const notifyParent = () => {
            const height = document.body.scrollHeight;
            window.parent.postMessage({ type: "flowmaestro:resize", height }, "*");
        };

        // Notify on mount and when messages change
        notifyParent();

        // Set up resize observer
        const observer = new ResizeObserver(notifyParent);
        observer.observe(document.body);

        return () => {
            observer.disconnect();
        };
    }, [messages]);

    // Loading state
    if (isLoadingInterface || isCreatingSession) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">
                        {isLoadingInterface ? "Loading..." : "Starting..."}
                    </p>
                </div>
            </div>
        );
    }

    // Error state - interface not found
    if (!chatInterface) {
        return (
            <div className="h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">{error || "Chat not found"}</p>
                </div>
            </div>
        );
    }

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
        }
    };

    return (
        <div className="h-screen bg-background">
            <ChatContainer
                chatInterface={chatInterface}
                messages={messages}
                inputValue={inputValue}
                isSending={isSending}
                isTyping={false}
                error={error}
                onInputChange={setInputValue}
                onSendMessage={handleSendMessage}
                variant="embed"
            />
        </div>
    );
}
