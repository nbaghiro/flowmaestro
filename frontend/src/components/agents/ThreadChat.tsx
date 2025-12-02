import { Send, Bot, User, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import * as api from "../../lib/api";
import { cn } from "../../lib/utils";
import { wsClient } from "../../lib/websocket";
import { useAgentStore } from "../../stores/agentStore";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import type { Agent, Thread, ConversationMessage } from "../../lib/api";

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
        addMessageToExecution
    } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const tokenAccumulatorRef = useRef<Map<string, string>>(new Map());

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load messages from backend when thread changes
    useEffect(() => {
        const loadMessages = async () => {
            // Validate thread belongs to this agent
            if (thread.agent_id !== agent.id) {
                console.error(
                    `[ThreadChat] Thread ${thread.id} does not belong to agent ${agent.id}. ` +
                        `Thread belongs to agent ${thread.agent_id}.`
                );
                setMessages([]);
                return;
            }

            try {
                const response = await api.getThreadMessages(thread.id);
                if (response.success && response.data.messages) {
                    // Filter out tool messages (raw JSON responses) - keep "Using tools" indicators
                    const filteredMessages = response.data.messages.filter(
                        (m) => m.role !== "tool"
                    );
                    // Sort by timestamp to ensure correct chronological order (oldest first)
                    // This ensures user messages appear before agent responses
                    const sortedMessages = [...filteredMessages].sort((a, b) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        // If timestamps are equal, ensure user messages come before assistant
                        if (timeA === timeB) {
                            if (a.role === "user" && b.role === "assistant") return -1;
                            if (a.role === "assistant" && b.role === "user") return 1;
                        }
                        return timeA - timeB;
                    });
                    setMessages(sortedMessages);
                } else {
                    // New thread with no messages yet - ensure empty state
                    setMessages([]);
                }
            } catch (error) {
                console.error("Failed to load thread messages:", error);
                setMessages([]);
            }
        };

        loadMessages();
    }, [thread.id, thread.agent_id, agent.id]);

    // Update messages from execution when thread matches (for real-time updates)
    // Only add new messages, don't overwrite existing ones
    useEffect(() => {
        if (currentExecution && currentExecution.thread_id === thread.id) {
            setMessages((prev) => {
                const executionMessages = currentExecution.conversation_history || [];
                // Filter out tool messages (raw JSON responses) - keep "Using tools" indicators
                const filteredMessages = executionMessages.filter((m) => m.role !== "tool");
                const existingIds = new Set(prev.map((m) => m.id));
                const newMessages = filteredMessages.filter((m) => !existingIds.has(m.id));

                const combined = newMessages.length > 0 ? [...prev, ...newMessages] : prev;
                // Always sort by timestamp to ensure chronological order (oldest first)
                // If timestamps are equal, ensure user messages come before assistant
                return combined.sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    if (timeA === timeB) {
                        if (a.role === "user" && b.role === "assistant") return -1;
                        if (a.role === "assistant" && b.role === "user") return 1;
                    }
                    return timeA - timeB;
                });
            });
        }
    }, [currentExecution?.thread_id, thread.id]);

    // Subscribe/unsubscribe to current execution over WebSocket
    useEffect(() => {
        if (!currentExecution) return;

        const executionId = currentExecution.id;
        wsClient.subscribeToExecution(executionId);

        return () => {
            wsClient.unsubscribeFromExecution(executionId);
        };
    }, [currentExecution?.id]);

    // Listen for WebSocket events
    useEffect(() => {
        const handleToken = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string; token?: string };
            if (!data.executionId || !data.token || data.threadId !== thread.id) return;

            const executionId = data.executionId;
            const store = useAgentStore.getState();
            if (!store.currentExecution || executionId !== store.currentExecution.id) return;

            if (isSending) {
                setIsSending(false);
            }

            // Accumulate tokens
            const current = tokenAccumulatorRef.current.get(executionId) || "";
            tokenAccumulatorRef.current.set(executionId, current + data.token);

            // Update streaming message
            setMessages((prev) => {
                const accumulated = tokenAccumulatorRef.current.get(executionId) || "";
                const streamingId = `streaming-${executionId}`;
                const lastIndex = prev.length - 1;
                const lastMessage = prev[lastIndex];

                // If last message is our streaming message, update it in place
                if (
                    lastMessage &&
                    lastMessage.role === "assistant" &&
                    lastMessage.id === streamingId
                ) {
                    const updated = [...prev];
                    updated[lastIndex] = { ...lastMessage, content: accumulated };
                    return updated;
                } else {
                    // Add new streaming message at the end (no sorting needed)
                    return [
                        ...prev,
                        {
                            id: streamingId,
                            role: "assistant" as const,
                            content: accumulated,
                            timestamp: new Date().toISOString()
                        }
                    ];
                }
            });
        };

        const handleMessage = (event: unknown) => {
            const data = event as {
                executionId?: string;
                threadId?: string;
                message?: ConversationMessage;
            };
            // Only add messages that belong to this thread
            if (data.threadId === thread.id && data.message && data.executionId) {
                // Avoid duplicating user messages (we already add them locally)
                if (data.message.role === "user") {
                    return;
                }
                // Skip tool messages (raw JSON)
                if (data.message.role === "tool") {
                    return;
                }
                // Update store
                addMessageToExecution(data.executionId, data.message);
                // Also update local messages state directly, replacing streaming message with final
                setMessages((prev) => {
                    // Remove any streaming message for this execution
                    const filtered = prev.filter((m) => m.id !== `streaming-${data.executionId}`);

                    // Check if this message already exists (avoid duplicates)
                    const existingIds = new Set(filtered.map((m) => m.id));
                    if (existingIds.has(data.message!.id)) {
                        return filtered; // Already exists, just return filtered (streaming removed)
                    }

                    // Add the final message and sort by timestamp with tie-breaker
                    const updated = [...filtered, data.message!];
                    return updated.sort((a, b) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        if (timeA === timeB) {
                            if (a.role === "user" && b.role === "assistant") return -1;
                            if (a.role === "assistant" && b.role === "user") return 1;
                        }
                        return timeA - timeB;
                    });
                });
            }
        };

        const handleThinking = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string };
            if (data.threadId === thread.id) {
                console.log("Agent is thinking...");
            }
        };

        const handleCompleted = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string };
            if (data.threadId === thread.id && data.executionId) {
                // Remove streaming message if it still exists
                setMessages((prev) => prev.filter((m) => m.id !== `streaming-${data.executionId}`));
                tokenAccumulatorRef.current.delete(data.executionId);
                setIsSending(false);
                updateExecutionStatus(data.executionId, "completed");
            }
        };

        const handleFailed = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string; error?: unknown };
            if (data.threadId === thread.id && data.executionId) {
                // Remove streaming message on failure
                setMessages((prev) => prev.filter((m) => m.id !== `streaming-${data.executionId}`));
                tokenAccumulatorRef.current.delete(data.executionId);
                setIsSending(false);
                updateExecutionStatus(data.executionId, "failed");
                console.error("Agent failed:", data.error);
            }
        };

        wsClient.on("agent:token", handleToken);
        wsClient.on("agent:message:new", handleMessage);
        wsClient.on("agent:thinking", handleThinking);
        wsClient.on("agent:execution:completed", handleCompleted);
        wsClient.on("agent:execution:failed", handleFailed);

        return () => {
            wsClient.off("agent:token", handleToken);
            wsClient.off("agent:message:new", handleMessage);
            wsClient.off("agent:thinking", handleThinking);
            wsClient.off("agent:execution:completed", handleCompleted);
            wsClient.off("agent:execution:failed", handleFailed);

            // Clean up token accumulator on unmount
            if (currentExecution?.id) {
                tokenAccumulatorRef.current.delete(currentExecution.id);
            }
        };
    }, [thread.id, updateExecutionStatus, addMessageToExecution, isSending, currentExecution?.id]);

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
                await executeAgent(agent.id, message, thread.id);
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
                        console.warn(
                            "[ThreadChat] Unexpected error sending message:",
                            errorMessage
                        );
                    }
                    // Retry: start new execution in this thread
                    await executeAgent(agent.id, message, thread.id);
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>
                                {currentExecution && currentExecution.thread_id === thread.id
                                    ? "Agent is thinking..."
                                    : "Start a new conversation with " + agent.name}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages
                            .sort((a, b) => {
                                const timeA = new Date(a.timestamp).getTime();
                                const timeB = new Date(b.timestamp).getTime();
                                if (timeA === timeB) {
                                    if (a.role === "user" && b.role === "assistant") return -1;
                                    if (a.role === "assistant" && b.role === "user") return 1;
                                }
                                return timeA - timeB;
                            })
                            .map((message) => (
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
                                        {message.tool_calls && message.tool_calls.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                                <p className="text-xs text-muted-foreground mb-1">
                                                    Using tools:
                                                </p>
                                                {message.tool_calls.map((tool, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-xs bg-background/50 rounded px-2 py-1 mt-1"
                                                    >
                                                        {tool.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {message.role === "user" && (
                                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-secondary-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        {isSending && (
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
        </div>
    );
}
