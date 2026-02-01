import { useEffect, useState, useRef } from "react";
import { PublicChatInterface, PublicChatMessage, ChatMessageAttachment } from "@flowmaestro/shared";
import { getChatInterfaceStreamUrl } from "../../../lib/api";
import { usePublicChatStore } from "../../../stores/publicChatStore";
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
    onSendMessage: (message: string, attachments?: ChatMessageAttachment[]) => void;
    onClose?: () => void;
    showCloseButton?: boolean;
    variant?: "full" | "embed" | "widget";
}

export function ChatContainer({
    chatInterface,
    messages,
    inputValue,
    isSending,
    isTyping: initialIsTyping = false,
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

    const { session, uploadFile, addLocalMessage, updateMessageContent } = usePublicChatStore();

    // Local state for pending attachments
    const [pendingAttachments, setPendingAttachments] = useState<ChatMessageAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Local typing state (overridden by props or stream)
    const [isStreamTyping, setIsStreamTyping] = useState(false);

    // SSE reconnection key - increment to force reconnect
    const [sseReconnectKey, setSseReconnectKey] = useState(0);

    // SSE connection ref
    const eventSourceRef = useRef<EventSource | null>(null);

    // Track current streaming message ID for token accumulation
    const streamingMessageIdRef = useRef<string | null>(null);

    // Track reconnection timeout to prevent multiple reconnects
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track if reconnection is in progress to prevent race conditions
    const isReconnectingRef = useRef(false);

    // Effect to handle SSE connection - only connect when threadId exists
    useEffect(() => {
        if (!session || !chatInterface || !session.threadId) return;

        // Cleanup previous connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const url = getChatInterfaceStreamUrl(chatInterface.slug, session.sessionToken);
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            // console.log("SSE Connected to thread:", session.threadId);
        };

        eventSource.onmessage = (event) => {
            try {
                // Backend emits agent:* events, handle those
                const parsed = JSON.parse(event.data);

                switch (parsed.type) {
                    case "connection:established":
                        // Connection confirmed
                        break;

                    case "agent:thinking":
                        setIsStreamTyping(true);
                        break;

                    case "agent:token":
                        // Token streaming - append to current assistant message
                        if (parsed.token) {
                            // If no streaming message yet, create one
                            if (!streamingMessageIdRef.current) {
                                const msgId = `stream-${Date.now()}`;
                                streamingMessageIdRef.current = msgId;
                                addLocalMessage({
                                    id: msgId,
                                    role: "assistant",
                                    content: parsed.token,
                                    timestamp: new Date().toISOString()
                                });
                            } else {
                                updateMessageContent(
                                    streamingMessageIdRef.current,
                                    parsed.token,
                                    true
                                );
                            }
                            setIsStreamTyping(false);
                        }
                        break;

                    case "agent:message:new":
                        // Full message received (user echo or finalized assistant)
                        if (parsed.message && parsed.message.role === "assistant") {
                            // If we were streaming, this is the final version
                            // Reset streaming message ID
                            streamingMessageIdRef.current = null;
                        }
                        setIsStreamTyping(false);
                        break;

                    case "agent:execution:completed":
                        setIsStreamTyping(false);
                        streamingMessageIdRef.current = null;
                        break;

                    case "agent:execution:failed":
                        setIsStreamTyping(false);
                        streamingMessageIdRef.current = null;
                        break;

                    case "agent:tool:call:started":
                        setIsStreamTyping(true);
                        break;

                    case "agent:tool:call:completed":
                    case "agent:tool:call:failed":
                        setIsStreamTyping(false);
                        break;

                    default:
                        // Handle unknown event types gracefully
                        break;
                }
            } catch (_e) {
                // console.error("Failed to parse SSE event", e);
            }
        };

        eventSource.onerror = (_err) => {
            // console.error("SSE Error", err);
            eventSource.close();
            eventSourceRef.current = null;

            // Prevent multiple simultaneous reconnection attempts
            if (isReconnectingRef.current) return;
            isReconnectingRef.current = true;

            // Clear any existing reconnect timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            // Reconnect after delay by incrementing the key
            reconnectTimeoutRef.current = setTimeout(() => {
                isReconnectingRef.current = false;
                if (session?.threadId) {
                    setSseReconnectKey((prev) => prev + 1);
                }
            }, 3000);
        };

        return () => {
            eventSource.close();
            eventSourceRef.current = null;
            streamingMessageIdRef.current = null;
            isReconnectingRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [session?.sessionToken, session?.threadId, chatInterface.slug, sseReconnectKey]); // Connect when threadId becomes available or reconnect triggered

    // Apply font family to container
    const containerStyle = {
        fontFamily: fontFamily !== "system" ? `"${fontFamily}", system-ui, sans-serif` : undefined,
        "--primary-color": primaryColor
    } as React.CSSProperties;

    // File handling
    const handleFileSelect = async (files: FileList) => {
        if (!files.length) return;

        setIsUploading(true);
        setUploadError(null); // Clear any previous error
        try {
            // Upload each file
            const uploadPromises = Array.from(files).map((file) => uploadFile(file));
            const results = await Promise.allSettled(uploadPromises);

            // Collect successful uploads and errors
            const attachments: ChatMessageAttachment[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                if (result.status === "fulfilled" && result.value.success && result.value.data) {
                    attachments.push(result.value.data);
                } else if (result.status === "rejected") {
                    const errorMsg =
                        result.reason instanceof Error ? result.reason.message : "Upload failed";
                    errors.push(`${files[index].name}: ${errorMsg}`);
                }
            });

            if (attachments.length > 0) {
                setPendingAttachments((prev) => [...prev, ...attachments]);
            }

            if (errors.length > 0) {
                setUploadError(errors.join("; "));
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Upload failed";
            setUploadError(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = (id: string) => {
        setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    // Wrapper for input change to clear upload error
    const handleInputChange = (value: string) => {
        if (uploadError) {
            setUploadError(null);
        }
        onInputChange(value);
    };

    // Wrapper for sending message to include attachments and clear them
    const handleSendMessage = () => {
        onSendMessage(inputValue, pendingAttachments);
        setPendingAttachments([]); // Clear pending attachments
        setUploadError(null); // Clear any upload error
    };

    // Handle prompt selection - set input value and trigger send
    const handlePromptSelect = (text: string) => {
        onInputChange(text);
        // Use setTimeout to ensure state is updated before sending
        setTimeout(() => {
            onSendMessage(text, []);
        }, 0);
    };

    const hasMessages = messages.length > 0;
    const effectiveIsTyping = initialIsTyping || isStreamTyping;

    // Determine container classes based on variant
    const containerClasses = (() => {
        switch (variant) {
            case "widget":
                return "flex flex-col h-full bg-card shadow-2xl overflow-hidden";
            case "embed":
                return "flex flex-col h-full bg-card";
            case "full":
            default:
                return "flex flex-col h-full bg-card";
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
                <div className="mx-4 my-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 flex-shrink-0">
                    {error}
                </div>
            )}

            {/* Scrollable content area - messages/welcome + suggested prompts */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {/* Messages or welcome screen */}
                {hasMessages ? (
                    <MessageList
                        messages={messages}
                        isTyping={effectiveIsTyping}
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
            </div>

            {/* Input - always visible at bottom */}
            <div className="flex-shrink-0">
                <MessageInput
                    value={inputValue}
                    onChange={handleInputChange}
                    onSend={handleSendMessage}
                    placeholder={placeholderText}
                    isSending={isSending || isUploading}
                    allowFileUpload={allowFileUpload}
                    onFileSelect={handleFileSelect}
                    attachments={pendingAttachments}
                    onRemoveAttachment={handleRemoveAttachment}
                    uploadError={uploadError}
                />
            </div>
        </div>
    );
}
