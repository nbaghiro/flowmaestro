import { Send, Bot, User, Loader2, Wrench, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import * as api from "../../lib/api";
import { streamAgentExecution } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useAgentStore } from "../../stores/agentStore";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { AgentConnectionSelector } from "./AgentConnectionSelector";
import type { Agent, Thread, ThreadMessage, JsonObject } from "../../lib/api";

interface ToolCallInfo {
    id: string;
    toolName: string;
    status: "running" | "success" | "failed";
    arguments?: JsonObject;
    result?: JsonObject;
    error?: string;
}

interface ThreadChatProps {
    agent: Agent;
    thread: Thread;
}

export function ThreadChat({ agent, thread }: ThreadChatProps) {
    const {
        currentExecution,
        executeAgent,
        sendMessage,
        updateExecutionStatus,
        addMessageToExecution,
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

    // Load messages from backend when thread changes
    useEffect(() => {
        const loadMessages = async () => {
            try {
                const response = await api.getThreadMessages(thread.id);
                if (response.success && response.data.messages) {
                    setMessages(response.data.messages);
                }
            } catch (error) {
                console.error("Failed to load thread messages:", error);
                setMessages([]);
            }
        };

        loadMessages();
    }, [thread.id]);

    // Update messages from execution when thread matches (for real-time updates)
    useEffect(() => {
        if (currentExecution && currentExecution.thread_id === thread.id) {
            setMessages(currentExecution.thread_history);
        }
    }, [currentExecution, thread.id]);

    // Start SSE stream when execution starts for this thread
    useEffect(() => {
        if (!currentExecution || currentExecution.thread_id !== thread.id) return;

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

        console.log(`[ThreadChat] Starting SSE stream for execution ${executionId}`);

        // Start SSE stream
        const cleanup = streamAgentExecution(agentId, executionId, {
            onConnected: () => {
                console.log(`[ThreadChat] SSE connected for execution ${executionId}`);
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
                console.log("[ThreadChat] Received message:", message);
                // This receives non-streamed messages: tool results, system messages, etc.
                // Assistant responses are built from streaming tokens (onToken + onCompleted)
                if (message.role !== "user") {
                    addMessageToExecution(executionId, message);
                }
            },
            onToolCallStarted: (data) => {
                console.log("[ThreadChat] Tool call started:", data);
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
                console.log("[ThreadChat] Tool call completed:", data);
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.toolName === data.toolName && tc.status === "running"
                            ? { ...tc, status: "success" as const, result: data.result }
                            : tc
                    )
                );
            },
            onToolCallFailed: (data) => {
                console.log("[ThreadChat] Tool call failed:", data);
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.toolName === data.toolName && tc.status === "running"
                            ? { ...tc, status: "failed" as const, error: data.error }
                            : tc
                    )
                );
            },
            onCompleted: (data) => {
                console.log("[ThreadChat] Execution completed:", data);

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
                addMessageToExecution(executionId, {
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
                console.error("[ThreadChat] SSE error:", error);

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
                console.log(`[ThreadChat] Cleaning up SSE stream for execution ${executionId}`);
                sseCleanupRef.current();
                sseCleanupRef.current = null;
            }
        };
    }, [
        currentExecution?.id,
        currentExecution?.thread_id,
        thread.id,
        agent.id,
        isSending,
        updateExecutionStatus,
        addMessageToExecution
    ]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput("");
        setIsSending(true);

        try {
            // Check if we have a running execution for this thread
            if (
                !currentExecution ||
                currentExecution.thread_id !== thread.id ||
                currentExecution.status !== "running"
            ) {
                // Start new execution in this thread
                // Pass selected connection/model if available, otherwise agent will use defaults
                await executeAgent(
                    agent.id,
                    message,
                    thread.id,
                    selectedConnectionId || undefined,
                    selectedModel || undefined
                );
            } else {
                // Continue existing execution
                await sendMessage(message);
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
                            {currentExecution && currentExecution.thread_id === thread.id
                                ? "Active conversation"
                                : "Ready to continue"}
                        </p>
                    </div>
                </div>
                <AgentConnectionSelector />
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
                                    <div className="flex items-center gap-2">
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
                                    </div>
                                    {toolCall.status === "failed" && toolCall.error && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 text-xs h-auto py-1"
                                            onClick={() =>
                                                setSelectedToolError({
                                                    toolName: toolCall.toolName,
                                                    error: toolCall.error!
                                                })
                                            }
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            View Error
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isSending && toolCalls.length === 0 && (
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

            {/* Input */}
            <div className="border-t border-border p-4 flex-shrink-0 bg-card">
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
