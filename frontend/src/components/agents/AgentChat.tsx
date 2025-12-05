import { Send, Loader2, Bot, User, Wrench, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { streamAgentExecution } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useAgentStore } from "../../stores/agentStore";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { AgentConnectionSelector } from "./AgentConnectionSelector";
import type { Agent, ThreadMessage, JsonObject } from "../../lib/api";

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

export function AgentChat({ agent }: AgentChatProps) {
    const {
        currentExecution,
        currentThread,
        executeAgent,
        sendMessage,
        updateExecutionStatus,
        selectedConnectionId,
        selectedModel
    } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ThreadMessage[]>([]);
    const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
    const [selectedToolError, setSelectedToolError] = useState<{
        toolName: string;
        error: string;
    } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sseCleanupRef = useRef<(() => void) | null>(null);
    const streamingContentRef = useRef<string>("");

    // Scroll to bottom when messages or tool calls change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, toolCalls]);

    // Track previous thread_id to preserve messages when continuing in same thread
    const prevThreadIdRef = useRef<string | undefined>(undefined);

    // Load thread messages when currentThread is set but no active execution
    useEffect(() => {
        if (currentThread && !currentExecution) {
            // Load messages for this thread from the API
            import("../../lib/api").then(({ getThreadMessages }) => {
                getThreadMessages(currentThread.id)
                    .then((response) => {
                        if (response.success && response.data) {
                            setMessages(response.data.messages || []);
                            prevThreadIdRef.current = currentThread.id;
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to load thread messages:", error);
                    });
            });
        }
    }, [currentThread?.id, currentExecution?.id]);

    // Sync messages from execution when execution ID changes
    // Preserve existing messages if we're continuing in the same thread
    useEffect(() => {
        if (currentExecution) {
            const currentThreadId = currentExecution.thread_id;
            const isSameThread = prevThreadIdRef.current === currentThreadId;
            const history = currentExecution.thread_history || [];

            // Update thread reference
            prevThreadIdRef.current = currentThreadId;

            setMessages((prev) => {
                // If same thread and we have existing messages, only add truly new messages
                if (isSameThread && prev.length > 0) {
                    // Find messages in history that are newer than what we have
                    // Compare by content + timestamp to avoid ID mismatch issues
                    const existingMessages = new Set(
                        prev.map((m) => `${m.role}:${m.content}:${m.timestamp}`)
                    );
                    const newMessages = history.filter((m) => {
                        const key = `${m.role}:${m.content}:${m.timestamp}`;
                        return !existingMessages.has(key);
                    });

                    // If we found new messages, add them
                    // Otherwise, keep existing messages (they might be more up-to-date with streaming)
                    if (newMessages.length > 0) {
                        // Only add the new messages, not the entire history
                        return [...prev, ...newMessages];
                    }
                    return prev;
                }

                // New thread or no previous messages - use execution history
                return history;
            });
        }
    }, [currentExecution?.id]);

    // Start SSE stream when execution starts
    useEffect(() => {
        if (!currentExecution) return;

        const executionId = currentExecution.id;
        const agentId = agent.id;

        // Clean up any previous stream
        if (sseCleanupRef.current) {
            sseCleanupRef.current();
            sseCleanupRef.current = null;
        }

        // Reset streaming content and tool calls
        streamingContentRef.current = "";
        setToolCalls([]);

        console.log(`[AgentChat] Starting SSE stream for execution ${executionId}`);

        // Start SSE stream
        const cleanup = streamAgentExecution(agentId, executionId, {
            onConnected: () => {
                console.log(`[AgentChat] SSE connected for execution ${executionId}`);
            },
            onToken: (token: string) => {
                // Accumulate token
                streamingContentRef.current += token;

                // Update streaming message
                setMessages((prev) => {
                    const streamingId = `streaming-${executionId}`;
                    const lastMessage = prev[prev.length - 1];

                    if (
                        lastMessage &&
                        lastMessage.role === "assistant" &&
                        lastMessage.id === streamingId
                    ) {
                        // Update existing streaming message
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMessage, content: streamingContentRef.current }
                        ];
                    } else {
                        // Create new streaming message
                        return [
                            ...prev,
                            {
                                id: streamingId,
                                role: "assistant" as const,
                                content: streamingContentRef.current,
                                timestamp: new Date().toISOString()
                            }
                        ];
                    }
                });

                if (isSending) {
                    setIsSending(false);
                }
            },
            onMessage: (message: ThreadMessage) => {
                console.log("[AgentChat] Received message:", message);
                // This receives non-streamed messages: tool results, system messages, etc.
                // Assistant responses are built from streaming tokens (onToken + onCompleted)
                const store = useAgentStore.getState();
                if (message.role !== "user") {
                    store.addMessageToExecution(executionId, message);
                }
            },
            onToolCallStarted: (data) => {
                console.log("[AgentChat] Tool call started:", data);
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
                console.log("[AgentChat] Tool call completed:", data);
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.toolName === data.toolName && tc.status === "running"
                            ? { ...tc, status: "success" as const, result: data.result }
                            : tc
                    )
                );
            },
            onToolCallFailed: (data) => {
                console.log("[AgentChat] Tool call failed:", data);
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.toolName === data.toolName && tc.status === "running"
                            ? { ...tc, status: "failed" as const, error: data.error }
                            : tc
                    )
                );
            },
            onCompleted: (data) => {
                console.log("[AgentChat] Execution completed:", data);

                // Finalize streaming message
                const finalContent = data.finalMessage || streamingContentRef.current;
                const streamingId = `streaming-${executionId}`;

                setMessages((prev) => {
                    const filtered = prev.filter((m) => m.id !== streamingId);
                    const finalMessage: ThreadMessage = {
                        id: `asst-${executionId}-${Date.now()}`,
                        role: "assistant",
                        content: finalContent,
                        timestamp: new Date().toISOString()
                    };
                    return [...filtered, finalMessage];
                });

                // Add to store
                const store = useAgentStore.getState();
                store.addMessageToExecution(executionId, {
                    id: `asst-${executionId}-${Date.now()}`,
                    role: "assistant",
                    content: finalContent,
                    timestamp: new Date().toISOString()
                });

                streamingContentRef.current = "";
                setIsSending(false);
                updateExecutionStatus(executionId, "completed");
            },
            onError: (error: string) => {
                console.error("[AgentChat] SSE error:", error);

                // Remove streaming message and show error
                setMessages((prev) => prev.filter((m) => m.id !== `streaming-${executionId}`));

                streamingContentRef.current = "";
                setIsSending(false);
                updateExecutionStatus(executionId, "failed");
            }
        });

        sseCleanupRef.current = cleanup;

        return () => {
            if (sseCleanupRef.current) {
                console.log(`[AgentChat] Cleaning up SSE stream for execution ${executionId}`);
                sseCleanupRef.current();
                sseCleanupRef.current = null;
            }
        };
    }, [currentExecution?.id, agent.id, isSending, updateExecutionStatus]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput("");
        setIsSending(true);

        try {
            const store = useAgentStore.getState();
            const exec = store.currentExecution;

            if (!exec || exec.status !== "running") {
                // Start new execution in current thread (or new thread if none exists)
                // Use currentThread if no execution, to continue in auto-loaded thread
                const threadId = exec?.thread_id || currentThread?.id;
                // Pass selected connection/model if available, otherwise agent will use defaults
                await executeAgent(
                    agent.id,
                    message,
                    threadId,
                    selectedConnectionId || undefined,
                    selectedModel || undefined
                );
            } else {
                // Try to continue existing execution
                // If it fails (execution completed), start new one in same thread
                try {
                    await sendMessage(message);
                } catch (error) {
                    // Any error from sendMessage means execution is not running anymore
                    // This is expected when execution completes between status check and send
                    // Silently handle it and start a new execution in the same thread
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    // Only log if it's not the expected "already completed" error
                    if (
                        !errorMessage.includes("already completed") &&
                        !errorMessage.includes("400")
                    ) {
                        console.warn("[AgentChat] Unexpected error sending message:", errorMessage);
                    }
                    await executeAgent(
                        agent.id,
                        message,
                        exec.thread_id,
                        selectedConnectionId || undefined,
                        selectedModel || undefined
                    );
                }
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

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
                            {currentExecution ? "Active thread" : "Ready to chat"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AgentConnectionSelector />
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
                            // Skip empty assistant messages that only had tool_calls (now shown separately)
                            if (message.role === "assistant" && !message.content?.trim()) {
                                return null;
                            }

                            // Render tool messages with special UI
                            if (message.role === "tool") {
                                const isError =
                                    message.content.includes('"error":true') ||
                                    message.content.includes("Validation errors") ||
                                    message.content.toLowerCase().includes('"error"');

                                // Extract tool name from content if not in tool_name field
                                let toolName = message.tool_name || "unknown";
                                if (toolName === "unknown") {
                                    try {
                                        const parsed = JSON.parse(message.content);
                                        toolName = parsed.toolName || parsed.tool || toolName;
                                    } catch {
                                        // Keep "unknown" if can't parse
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
                                                  : "bg-muted text-foreground"
                                        )}
                                    >
                                        <div className="whitespace-pre-wrap break-words">
                                            {message.content}
                                        </div>
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
                        {isSending && currentExecution && toolCalls.length === 0 && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                                <div className="bg-muted text-foreground rounded-lg px-4 py-3">
                                    <Loader2 className="w-4 h-4 animate-spin" />
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
                        <div className="bg-muted border border-border rounded-lg p-4">
                            <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto font-mono">
                                {(() => {
                                    try {
                                        const parsed = JSON.parse(selectedToolError.error);
                                        return JSON.stringify(parsed, null, 2);
                                    } catch {
                                        return selectedToolError.error;
                                    }
                                })()}
                            </pre>
                        </div>
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
