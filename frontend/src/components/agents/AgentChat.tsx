import { Send, Loader2, Bot, User, Wrench, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as api from "../../lib/api";
import { logger } from "../../lib/logger";
import { streamAgentExecution } from "../../lib/sse";
import { cn } from "../../lib/utils";
import { useAgentStore } from "../../stores/agentStore";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { MediaOutput, hasMediaContent } from "../common/MediaOutput";
import { TypingDots } from "../common/TypingDots";
import { AgentConnectionSelector } from "./AgentConnectionSelector";
import type { Agent, ThreadMessage, JsonObject, ThreadTokenUsage } from "../../lib/api";

interface ToolCallInfo {
    id: string;
    toolName: string;
    status: "running" | "success" | "failed";
    arguments?: JsonObject;
    result?: JsonObject;
    error?: string;
}

interface AgentChatProps {
    agent: Agent;
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

export function AgentChat({ agent }: AgentChatProps) {
    const {
        currentThread,
        threadMessages,
        currentExecutionId,
        currentExecutionThreadId,
        executeAgent,
        sendMessage,
        setExecutionStatus,
        addMessageToThread,
        updateThreadMessage,
        fetchThreadMessages
    } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [tokenUsage, setTokenUsage] = useState<ThreadTokenUsage | null>(
        normalizeTokenUsage(currentThread?.metadata?.tokenUsage || null)
    );
    const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
    const [selectedToolError, setSelectedToolError] = useState<{
        toolName: string;
        error: string;
    } | null>(null);

    // Thread-level model override (doesn't save to agent)
    const [overrideConnectionId, setOverrideConnectionId] = useState<string | null>(null);
    const [overrideModel, setOverrideModel] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sseCleanupRef = useRef<(() => void) | null>(null);
    const streamingContentRef = useRef<string>("");

    // Get messages for current thread from store
    // Use currentExecutionThreadId as fallback for timing issues during new thread creation
    const activeThreadId = currentThread?.id || currentExecutionThreadId;
    const messages = activeThreadId ? threadMessages[activeThreadId] || [] : [];

    const refreshTokenUsage = useCallback(async () => {
        const threadId = currentThread?.id;
        if (!threadId) return;

        try {
            const response = await api.getThread(threadId);
            if (response.success) {
                const threadData = response.data as {
                    metadata?: { tokenUsage?: ThreadTokenUsage };
                };
                setTokenUsage(normalizeTokenUsage(threadData.metadata?.tokenUsage || null));
            }
        } catch (error) {
            logger.error("Failed to refresh token usage", error);
        }
    }, [currentThread?.id]);

    // Load messages when thread changes
    useEffect(() => {
        if (currentThread && !threadMessages[currentThread.id]) {
            fetchThreadMessages(currentThread.id);
        }
    }, [currentThread?.id, threadMessages, fetchThreadMessages]);

    // Keep token usage fresh when thread changes
    useEffect(() => {
        if (currentThread) {
            setTokenUsage(normalizeTokenUsage(currentThread.metadata?.tokenUsage || null));
            void refreshTokenUsage();
        }
    }, [currentThread?.id, refreshTokenUsage, currentThread?.metadata?.tokenUsage]);

    // Scroll to bottom when messages or tool calls change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, toolCalls]);

    // Start SSE stream when execution starts
    useEffect(() => {
        if (!currentExecutionId || !currentExecutionThreadId) return;

        const executionId = currentExecutionId;
        const threadId = currentExecutionThreadId;
        const agentId = agent.id;

        // Clean up any previous stream
        if (sseCleanupRef.current) {
            sseCleanupRef.current();
            sseCleanupRef.current = null;
        }

        // Reset streaming content and tool calls
        // Initialize with space to match the placeholder message
        streamingContentRef.current = " ";
        setToolCalls([]);

        logger.debug("Starting SSE stream for execution", { executionId });

        const streamingMessageId = `streaming-${executionId}`;

        // CRITICAL: Create streaming message IMMEDIATELY before starting stream
        // This prevents race condition where first tokens arrive before message exists
        // Use a single space to ensure message renders empty messages are filtered out
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
                // Use function updater pattern for atomic updates like AIChatPanel
                // This ensures we always append to the current state, not accumulated ref
                updateThreadMessage(threadId, streamingMessageId, (current: string) => {
                    // Remove leading space placeholder on first real token
                    const cleanCurrent = current.trimStart() || "";
                    const newContent = cleanCurrent + token;
                    // Also update ref for onCompleted fallback
                    streamingContentRef.current = newContent;
                    return newContent;
                });

                if (isSending) {
                    setIsSending(false);
                }
            },
            onMessage: (message: ThreadMessage) => {
                logger.debug("Received message", { message });
                // Ignore assistant messages during streaming they're handled via onToken
                // Adding them here would create duplicate/incomplete messages
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

                // ALWAYS use backend finalMessage it's guaranteed complete
                // The accumulated content may be missing initial tokens
                const finalContent = data.finalMessage || streamingContentRef.current;

                logger.info("Finalizing message", {
                    hasBackendFinalMessage: !!data.finalMessage,
                    backendLength: data.finalMessage?.length || 0,
                    accumulatedLength: streamingContentRef.current.length,
                    accumulatedPreview: streamingContentRef.current.substring(0, 100),
                    backendPreview: data.finalMessage?.substring(0, 100)
                });

                const store = useAgentStore.getState();
                const currentMessages = store.threadMessages[threadId] || [];
                const streamingMsg = currentMessages.find((m) => m.id === streamingMessageId);

                // Update streaming message in place with final content (don't replace)
                // This prevents the message from disappearing/reappearing
                if (streamingMsg) {
                    updateThreadMessage(threadId, streamingMessageId, finalContent);
                } else {
                    // Message doesn't exist - create final message
                    const filteredMessages = currentMessages.filter(
                        (m) => m.id !== streamingMessageId
                    );
                    const finalMessage: ThreadMessage = {
                        id: `asst-${executionId}-${Date.now()}`,
                        role: "assistant",
                        content: finalContent,
                        timestamp: new Date().toISOString()
                    };
                    store.setThreadMessages(threadId, [...filteredMessages, finalMessage]);
                }

                streamingContentRef.current = "";
                setIsSending(false);
                setExecutionStatus(null, null, null);
                void refreshTokenUsage();
            },
            onError: (error: string) => {
                logger.error("SSE error", undefined, { error });

                // Remove streaming message
                const store = useAgentStore.getState();
                const currentMessages = store.threadMessages[threadId] || [];
                store.setThreadMessages(
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
        currentExecutionThreadId,
        agent.id,
        isSending,
        setExecutionStatus,
        addMessageToThread,
        updateThreadMessage,
        refreshTokenUsage
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
                // Start new execution in current thread (or new thread if none exists)
                const threadId = currentThread?.id;
                await executeAgent(
                    agent.id,
                    message,
                    threadId,
                    overrideConnectionId || undefined,
                    overrideModel || undefined
                );
            } else {
                // Try to continue existing execution
                try {
                    await sendMessage(message);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (
                        !errorMessage.includes("already completed") &&
                        !errorMessage.includes("400")
                    ) {
                        logger.warn("Unexpected error sending message", { error: errorMessage });
                    }
                    // Start new execution in same thread
                    await executeAgent(
                        agent.id,
                        message,
                        currentThread?.id,
                        overrideConnectionId || undefined,
                        overrideModel || undefined
                    );
                }
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

    const usageLabel =
        tokenUsage && tokenUsage.totalTokens > 0
            ? `${tokenUsage.totalTokens.toLocaleString()} tokens${
                  tokenUsage.totalCost > 0 ? ` ($${tokenUsage.totalCost.toFixed(4)})` : ""
              }`
            : null;

    return (
        <div className="h-full flex flex-col">
            {/* Chat header - Fixed */}
            <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0 bg-card">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {currentExecutionId ? "Active thread" : "Ready to chat"}
                            {usageLabel ? <> • {usageLabel}</> : null}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
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

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Hey, I'm your custom Agent! Let me know how I can assist.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => {
                            // Skip empty assistant messages that only had tool_calls
                            if (message.role === "assistant" && !message.content?.trim()) {
                                return null;
                            }

                            // Render tool messages with special UI
                            if (message.role === "tool") {
                                const isError =
                                    message.content.includes('"error":true') ||
                                    message.content.includes("Validation errors") ||
                                    message.content.toLowerCase().includes('"error"');

                                let toolName = message.tool_name || "unknown";
                                if (toolName === "unknown") {
                                    try {
                                        const parsed = JSON.parse(message.content);
                                        toolName = parsed.toolName || parsed.tool || toolName;
                                    } catch {
                                        // Keep "unknown"
                                    }
                                }

                                return (
                                    <div key={message.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                            <Wrench className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">
                                                    Using tool - {toolName}
                                                </span>
                                                {isError ? (
                                                    <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                                                        <XCircle className="w-3 h-3" />
                                                        Failed
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Success
                                                    </span>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs h-auto py-0.5 px-2"
                                                    onClick={() =>
                                                        setSelectedToolError({
                                                            toolName: toolName,
                                                            error: message.content
                                                        })
                                                    }
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    {isError ? "View Error" : "View Result"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Render regular messages
                            return (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-3",
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {message.role !== "user" && message.role !== "system" && (
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-4 h-4 text-primary" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-lg px-4 py-3",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : message.role === "system"
                                                  ? "bg-muted/50 text-muted-foreground text-sm italic"
                                                  : "bg-card border border-border text-foreground"
                                        )}
                                    >
                                        {message.role === "assistant" ? (
                                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({ children }) => (
                                                            <h1 className="text-lg font-bold mt-4 mb-2 pb-2 border-b border-border">
                                                                {children}
                                                            </h1>
                                                        ),
                                                        h2: ({ children }) => (
                                                            <h2 className="text-base font-bold mt-3 mb-2 pb-1 border-b border-border">
                                                                {children}
                                                            </h2>
                                                        ),
                                                        h3: ({ children }) => (
                                                            <h3 className="text-sm font-bold mt-2 mb-1">
                                                                {children}
                                                            </h3>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-disc list-inside my-2 space-y-1">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="list-decimal list-inside my-2 space-y-1">
                                                                {children}
                                                            </ol>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="ml-2">{children}</li>
                                                        ),
                                                        p: ({ children }) => (
                                                            <p className="my-1.5">{children}</p>
                                                        ),
                                                        strong: ({ children }) => (
                                                            <strong className="font-semibold">
                                                                {children}
                                                            </strong>
                                                        ),
                                                        code: ({ children, className }) => {
                                                            const isInline = !className;
                                                            return isInline ? (
                                                                <code className="px-1.5 py-0.5 rounded bg-muted-foreground/10 text-foreground font-mono text-xs">
                                                                    {children}
                                                                </code>
                                                            ) : (
                                                                <code className="block px-3 py-2 rounded bg-muted-foreground/10 text-foreground font-mono text-xs overflow-x-auto">
                                                                    {children}
                                                                </code>
                                                            );
                                                        },
                                                        blockquote: ({ children }) => (
                                                            <blockquote className="border-l-2 border-primary pl-3 italic my-2">
                                                                {children}
                                                            </blockquote>
                                                        )
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap break-words">
                                                {message.content}
                                            </div>
                                        )}
                                    </div>
                                    {message.role === "user" && (
                                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-secondary-foreground" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {/* Tool calls */}
                        {toolCalls.map((toolCall) => (
                            <div key={toolCall.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                    <Wrench className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted/50 border border-border">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium">
                                            Using tool - {toolCall.toolName}
                                        </span>
                                        {toolCall.status === "running" && (
                                            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                        )}
                                        {toolCall.status === "success" && (
                                            <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Success
                                            </span>
                                        )}
                                        {toolCall.status === "failed" && (
                                            <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                                                <XCircle className="w-3 h-3" />
                                                Failed
                                            </span>
                                        )}
                                        {(toolCall.status === "success" ||
                                            toolCall.status === "failed") && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-auto py-0.5 px-2"
                                                onClick={() =>
                                                    setSelectedToolError({
                                                        toolName: toolCall.toolName,
                                                        error:
                                                            toolCall.status === "failed"
                                                                ? toolCall.error || "Unknown error"
                                                                : JSON.stringify(
                                                                      toolCall.result,
                                                                      null,
                                                                      2
                                                                  )
                                                    })
                                                }
                                            >
                                                <Eye className="w-3 h-3 mr-1" />
                                                {toolCall.status === "failed"
                                                    ? "View Error"
                                                    : "View Result"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isSending && currentExecutionId && toolCalls.length === 0 && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                                <div className="bg-card border border-border text-foreground rounded-lg px-4 py-3">
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input - Fixed at bottom */}
            <div className="border-t border-border p-4 flex-shrink-0 bg-card">
                <div className="flex gap-2">
                    <Input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="What can your Agent do for you today?"
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
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Having trouble? Report your issue to our team
                </p>
            </div>

            {/* Tool result/error dialog */}
            {selectedToolError && (
                <Dialog
                    isOpen={true}
                    onClose={() => setSelectedToolError(null)}
                    title={`Tool Details - ${selectedToolError.toolName}`}
                >
                    <div className="space-y-4">
                        {(() => {
                            try {
                                const parsed = JSON.parse(selectedToolError.error);
                                // Check if the parsed result contains media
                                if (hasMediaContent(parsed)) {
                                    return (
                                        <MediaOutput data={parsed} showJson={true} maxImages={4} />
                                    );
                                }
                                // No media - show as JSON
                                return (
                                    <div className="bg-muted border border-border rounded-lg p-4">
                                        <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto font-mono">
                                            {JSON.stringify(parsed, null, 2)}
                                        </pre>
                                    </div>
                                );
                            } catch {
                                // Not JSON - show as plain text
                                return (
                                    <div className="bg-muted border border-border rounded-lg p-4">
                                        <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto font-mono">
                                            {selectedToolError.error}
                                        </pre>
                                    </div>
                                );
                            }
                        })()}
                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedToolError(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
