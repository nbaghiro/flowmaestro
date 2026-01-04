import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChatContainer } from "../components/chat/public";
import { usePublicChatStore } from "../stores/publicChatStore";

export function PublicChatPage() {
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

    // Loading state
    if (isLoadingInterface || isCreatingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                        {isLoadingInterface ? "Loading chat..." : "Starting session..."}
                    </p>
                </div>
            </div>
        );
    }

    // Error state - interface not found
    if (!chatInterface) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-semibold text-foreground mb-2">Chat Not Found</h1>
                    <p className="text-sm text-muted-foreground">
                        {error || "This chat interface doesn't exist or has been removed."}
                    </p>
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
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div
                className="w-full max-w-2xl h-[90vh] max-h-[800px] rounded-xl shadow-lg overflow-hidden border border-border"
                style={{ borderRadius: `${chatInterface.borderRadius}px` }}
            >
                <ChatContainer
                    chatInterface={chatInterface}
                    messages={messages}
                    inputValue={inputValue}
                    isSending={isSending}
                    isTyping={false} // Phase 2 will add streaming support
                    error={error}
                    onInputChange={setInputValue}
                    onSendMessage={handleSendMessage}
                    variant="full"
                />
            </div>
        </div>
    );
}
