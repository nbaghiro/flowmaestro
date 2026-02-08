/**
 * ThreadChat Component
 *
 * Chat interface for continuing conversations in existing agent threads.
 * Supports SSE streaming, tool call tracking, and voice mode.
 * Refactored to use unified chat components.
 */

import { Bot, Send } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useChatScroll } from "../../../hooks/useChatScroll";
import * as api from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { streamAgentExecution } from "../../../lib/sse";
import { cn } from "../../../lib/utils";
import { useAgentStore } from "../../../stores/agentStore";
import {
    ChatBubble,
    ToolCallList,
    ToolResultDialogContent,
    type ToolCallInfo
} from "../../chat/core";
import { Button } from "../../common/Button";
import { Dialog } from "../../common/Dialog";
import { Input } from "../../common/Input";
import { TypingDots } from "../../common/TypingDots";
import { AgentConnectionSelector } from "../controls/AgentConnectionSelector";
import { ToolMessageDisplay } from "./ToolMessageDisplay";
import { VoiceChat } from "./VoiceChat";
import { VoiceModeToggle } from "./VoiceModeToggle";
import type { Agent, Thread, ThreadMessage, ThreadTokenUsage } from "../../../lib/api";

interface ThreadChatProps {
    agent: Agent;
    thread: Thread;
}

const normalizeTokenUsage = (usage?: ThreadTokenUsage | null): ThreadTokenUsage | null => {
    if (
        !usage ||
        typeof usage.promptTokens !== "number" ||
        typeof usage.completionTokens !== "number" ||
        typeof usage.totalTokens !== "number" ||
        typeof usage.totalCost !== "number" ||
        typeof usage.lastUpdatedAt !== "string"
    ) {
        return null;
    }

    return {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        totalCost: usage.totalCost,
        lastUpdatedAt: usage.lastUpdatedAt,
        executionCount: usage.executionCount ?? 0
    };
};

export function ThreadChat({ agent, thread }: ThreadChatProps) {
    const {
        threadMessages,
        currentExecutionId,
        currentExecutionStatus,
        executeAgent,
        sendMessage,
        setExecutionStatus,
        addMessageToThread,
        updateThreadMessage,
        fetchThreadMessages,
        setThreadMessages,
        refreshThread
    } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [tokenUsage, setTokenUsage] = useState<ThreadTokenUsage | null>(
        normalizeTokenUsage(thread.metadata?.tokenUsage)
    );
    const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
    const [selectedToolCall, setSelectedToolCall] = useState<ToolCallInfo | null>(null);

    // Thread-level model override (doesn't save to agent)
    const [overrideConnectionId, setOverrideConnectionId] = useState<string | null>(null);
    const [overrideModel, setOverrideModel] = useState<string | null>(null);

    // Voice mode state
    const [isVoiceMode, setIsVoiceMode] = useState(false);

    const sseCleanupRef = useRef<(() => void) | null>(null);
    const streamingContentRef = useRef<string>("");

    // Get messages for this thread from store
    const messages = threadMessages[thread.id] || [];

    // Auto-scroll when messages or tool calls change
    const messagesEndRef = useChatScroll([messages, toolCalls]);

    const refreshTokenUsage = useCallback(async () => {
        try {
            const response = await api.getThread(thread.id);
            if (response.success) {
                const threadData = response.data as Thread;
                setTokenUsage(normalizeTokenUsage(threadData.metadata?.tokenUsage));
            }
        } catch (error) {
            logger.error("Failed to refresh thread token usage", error);
        }
    }, [thread.id]);

    // Load messages when thread changes
    useEffect(() => {
        if (!threadMessages[thread.id]) {
            fetchThreadMessages(thread.id);
        }
        // Refresh token usage when thread changes
        setTokenUsage(normalizeTokenUsage(thread.metadata?.tokenUsage));
        refreshTokenUsage();
    }, [
        thread.id,
        threadMessages,
        fetchThreadMessages,
        refreshTokenUsage,
        thread.metadata?.tokenUsage
    ]);

    // Start SSE stream when execution starts for this thread
    useEffect(() => {
        if (!currentExecutionId || currentExecutionStatus !== "running") return;

        const executionId = currentExecutionId;
        const threadId = thread.id;
        const agentId = agent.id;

        // Clean up any previous stream
        if (sseCleanupRef.current) {
            sseCleanupRef.current();
            sseCleanupRef.current = null;
        }

        // Reset streaming content and tool calls
        streamingContentRef.current = " ";
        setToolCalls([]);

        logger.debug("Starting SSE stream for execution", { executionId });

        const streamingMessageId = `streaming-${executionId}`;

        // Create streaming message IMMEDIATELY before starting stream
        addMessageToThread(threadId, {
            id: streamingMessageId,
            role: "assistant",
            content: " ", // Single space placeholder will be replaced by first token
            timestamp: new Date().toISOString()
        });

        // Start SSE stream
        const cleanup = streamAgentExecution(agentId, executionId, {
            onConnected: () => {
                logger.debug("SSE connected for execution", { executionId });
            },
            onToken: (token: string) => {
                updateThreadMessage(threadId, streamingMessageId, (current: string) => {
                    const cleanCurrent = current.trimStart() || "";
                    const newContent = cleanCurrent + token;
                    streamingContentRef.current = newContent;
                    return newContent;
                });

                if (isSending) {
                    setIsSending(false);
                }
            },
            onMessage: (message: ThreadMessage) => {
                logger.debug("Received message", { message });
                if (message.role === "user") {
                    addMessageToThread(threadId, message);
                }
            },
            onTokenUsageUpdated: (data) => {
                logger.debug("Token usage updated", { tokenUsage: data.tokenUsage });
                setTokenUsage(normalizeTokenUsage(data.tokenUsage));
            },
            onToolCallStarted: (data) => {
                logger.debug("Tool call started", { toolName: data.toolName });
                setToolCalls((prev) => [
                    ...prev,
                    {
                        id: `tool-${Date.now()}-${data.toolName}`,
                        toolName: data.toolName,
                        status: "running",
                        arguments: data.arguments
                    }
                ]);
            },
            onToolCallCompleted: (data) => {
                logger.debug("Tool call completed", { toolName: data.toolName });
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.toolName === data.toolName && tc.status === "running"
                            ? { ...tc, status: "success" as const, result: data.result }
                            : tc
                    )
                );
            },
            onToolCallFailed: (data) => {
                logger.warn("Tool call failed", { toolName: data.toolName, error: data.error });
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.toolName === data.toolName && tc.status === "running"
                            ? { ...tc, status: "failed" as const, error: data.error }
                            : tc
                    )
                );
            },
            onCompleted: (data) => {
                logger.info("Execution completed", { executionId });

                const finalContent = data.finalMessage || streamingContentRef.current;

                logger.info("Finalizing message", {
                    hasBackendFinalMessage: !!data.finalMessage,
                    backendLength: data.finalMessage?.length || 0,
                    accumulatedLength: streamingContentRef.current.length
                });

                const store = useAgentStore.getState();
                const currentMessages = store.threadMessages[threadId] || [];
                const streamingMsg = currentMessages.find((m) => m.id === streamingMessageId);

                if (streamingMsg) {
                    updateThreadMessage(threadId, streamingMessageId, finalContent);
                } else {
                    const filteredMessages = currentMessages.filter(
                        (m) => m.id !== streamingMessageId
                    );
                    const finalMessage: ThreadMessage = {
                        id: `asst-${executionId}-${Date.now()}`,
                        role: "assistant",
                        content: finalContent,
                        timestamp: new Date().toISOString()
                    };
                    setThreadMessages(threadId, [...filteredMessages, finalMessage]);
                }

                streamingContentRef.current = "";
                setIsSending(false);
                setExecutionStatus(null, null, null);
                refreshTokenUsage();
                refreshThread(threadId);
            },
            onError: (error: string) => {
                logger.error("SSE error", undefined, { error });

                const store = useAgentStore.getState();
                const currentMessages = store.threadMessages[threadId] || [];
                setThreadMessages(
                    threadId,
                    currentMessages.filter((m) => m.id !== streamingMessageId)
                );

                streamingContentRef.current = "";
                setIsSending(false);
                setExecutionStatus(null, null, null);
            }
        });

        sseCleanupRef.current = cleanup;

        return () => {
            if (sseCleanupRef.current) {
                logger.debug("Cleaning up SSE stream for execution", { executionId });
                sseCleanupRef.current();
                sseCleanupRef.current = null;
            }
        };
    }, [
        currentExecutionId,
        currentExecutionStatus,
        thread.id,
        agent.id,
        isSending,
        setExecutionStatus,
        addMessageToThread,
        updateThreadMessage,
        setThreadMessages,
        refreshTokenUsage,
        refreshThread
    ]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput("");
        setIsSending(true);

        try {
            const store = useAgentStore.getState();
            const execId = store.currentExecutionId;
            const execStatus = store.currentExecutionStatus;

            if (!execId || execStatus !== "running") {
                // Start new execution in this thread
                await executeAgent(
                    agent.id,
                    message,
                    thread.id,
                    overrideConnectionId || undefined,
                    overrideModel || undefined
                );
            } else {
                // Continue existing execution
                await sendMessage(message);
            }
        } catch (error) {
            logger.error("Failed to send message", error);
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Voice chat callbacks - message updates are now handled directly by useVoiceSession
    // These callbacks are kept for logging and additional side effects
    const handleVoiceExecutionStarted = useCallback(
        (data: { executionId: string; threadId: string; userMessage: string }) => {
            // Messages are now added directly by useVoiceSession hook
            // Just log for debugging purposes
            logger.info("Voice execution started (messages added by hook)", {
                ...data,
                currentThreadId: thread.id
            });
        },
        [thread.id]
    );

    const handleVoiceAgentToken = useCallback((_token: string) => {
        // Tokens are now handled directly by useVoiceSession hook
        // Keep callback for potential future analytics or UI updates
    }, []);

    const handleVoiceAgentDone = useCallback(() => {
        // Message finalization is now handled directly by useVoiceSession hook
        logger.info("Voice agent done");
        refreshTokenUsage();
    }, [refreshTokenUsage]);

    const usageLabel =
        tokenUsage && tokenUsage.totalTokens > 0
            ? `${tokenUsage.totalTokens.toLocaleString()} tokens${
                  tokenUsage.totalCost > 0 ? ` ($${tokenUsage.totalCost.toFixed(4)})` : ""
              }`
            : null;

    return (
        <div className="h-full flex flex-col">
            {/* Chat header */}
            <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0 bg-card">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            {thread.title || `Thread ${thread.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {currentExecutionId && currentExecutionStatus === "running"
                                ? "Active conversation"
                                : "Ready to continue"}
                            {usageLabel ? <> • {usageLabel}</> : null}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(agent.metadata as { voice?: { enabled?: boolean } } | null)?.voice
                        ?.enabled && (
                        <VoiceModeToggle
                            isVoiceMode={isVoiceMode}
                            onToggle={() => setIsVoiceMode(!isVoiceMode)}
                            disabled={isSending}
                        />
                    )}
                    <AgentConnectionSelector
                        agent={agent}
                        overrideConnectionId={overrideConnectionId}
                        overrideModel={overrideModel}
                        onOverrideChange={(connectionId, model) => {
                            setOverrideConnectionId(connectionId);
                            setOverrideModel(model);
                        }}
                    />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Continue your conversation with {agent.name}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => {
                            // Skip empty assistant messages
                            if (message.role === "assistant" && !message.content?.trim()) {
                                return null;
                            }

                            // Tool messages have special rendering
                            if (message.role === "tool") {
                                return (
                                    <ToolMessageDisplay
                                        key={message.id}
                                        message={message}
                                        onViewDetails={(content) =>
                                            setSelectedToolCall({
                                                id: message.id,
                                                toolName: message.tool_name || "unknown",
                                                status: content.includes('"error"')
                                                    ? "failed"
                                                    : "success",
                                                error: content.includes('"error"')
                                                    ? content
                                                    : undefined,
                                                result: !content.includes('"error"')
                                                    ? JSON.parse(content)
                                                    : undefined
                                            })
                                        }
                                    />
                                );
                            }

                            // System messages
                            if (message.role === "system") {
                                return (
                                    <ChatBubble
                                        key={message.id}
                                        role="system"
                                        content={message.content}
                                    />
                                );
                            }

                            // User and assistant messages
                            return (
                                <ChatBubble
                                    key={message.id}
                                    role={message.role}
                                    content={message.content}
                                    assistantVariant="muted"
                                />
                            );
                        })}

                        {/* Active tool calls */}
                        <ToolCallList
                            toolCalls={toolCalls}
                            onViewDetails={(tc) => setSelectedToolCall(tc)}
                        />

                        {/* Typing indicator */}
                        {isSending && toolCalls.length === 0 && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                                <div className="bg-muted text-foreground rounded-lg px-4 py-3">
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-4 flex-shrink-0 bg-card">
                {isVoiceMode ? (
                    <VoiceChat
                        agentId={agent.id}
                        threadId={thread.id}
                        onClose={() => {
                            setIsVoiceMode(false);
                            fetchThreadMessages(thread.id);
                        }}
                        compact={true}
                        onExecutionStarted={handleVoiceExecutionStarted}
                        onAgentToken={handleVoiceAgentToken}
                        onAgentDone={handleVoiceAgentDone}
                    />
                ) : (
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Continue the conversation..."
                            disabled={isSending}
                            className={cn("flex-1 px-4 py-3", "bg-muted")}
                        />
                        <Button
                            variant="primary"
                            onClick={handleSend}
                            disabled={!input.trim() || isSending}
                            className="px-4 py-3"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Tool result/error dialog */}
            {selectedToolCall && (
                <Dialog
                    isOpen={true}
                    onClose={() => setSelectedToolCall(null)}
                    title={`Tool Details - ${selectedToolCall.toolName}`}
                >
                    <div className="space-y-4">
                        <ToolResultDialogContent
                            content={
                                selectedToolCall.error ||
                                JSON.stringify(selectedToolCall.result, null, 2)
                            }
                            isError={selectedToolCall.status === "failed"}
                        />
                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedToolCall(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
