import { Send, X, Loader2, Bot, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import * as api from "../../lib/api";
import { cn } from "../../lib/utils";
import { wsClient } from "../../lib/websocket";
import { useAgentStore } from "../../stores/agentStore";
import { Button } from "../common/Button";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Input } from "../common/Input";
import type { Agent, ConversationMessage } from "../../lib/api";

interface AgentChatProps {
    agent: Agent;
}

export function AgentChat({ agent }: AgentChatProps) {
    const {
        currentExecution,
        executeAgent,
        sendMessage,
        createNewThread,
        updateExecutionStatus,
        currentThread,
        setCurrentThread
    } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const tokenAccumulatorRef = useRef<Map<string, string>>(new Map());

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Track previous thread_id to preserve messages when continuing in same thread
    const prevThreadIdRef = useRef<string | undefined>(undefined);

    // Always check for the most recent thread and switch to it if it's newer
    // This ensures we show the latest conversation when reopening the chat
    useEffect(() => {
        // Skip if there's an active execution (don't interrupt ongoing conversation)
        const store = useAgentStore.getState();
        if (store.currentExecution && store.currentExecution.status === "running") {
            return;
        }

        const checkAndUpdateMostRecentThread = async () => {
            try {
                // Fetch the most recent thread for this agent
                const response = await api.getThreads({
                    agent_id: agent.id,
                    status: "active",
                    limit: 1
                });

                if (response.success && response.data.threads.length > 0) {
                    const mostRecentThread = response.data.threads[0];
                    const currentThreadState = useAgentStore.getState().currentThread;

                    // If no current thread, or if the most recent thread is newer, switch to it
                    if (!currentThreadState) {
                        setCurrentThread(mostRecentThread);
                    } else {
                        const currentThreadCreatedAt = new Date(
                            currentThreadState.created_at
                        ).getTime();
                        const mostRecentThreadCreatedAt = new Date(
                            mostRecentThread.created_at
                        ).getTime();

                        // Switch to most recent thread if it's newer (or if it's a different thread)
                        if (
                            mostRecentThreadCreatedAt > currentThreadCreatedAt ||
                            mostRecentThread.id !== currentThreadState.id
                        ) {
                            setCurrentThread(mostRecentThread);
                        }
                    }
                } else {
                    const currentThreadState = useAgentStore.getState().currentThread;
                    if (currentThreadState) {
                        // No threads exist, clear current thread
                        setCurrentThread(null);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch most recent thread:", error);
            }
        };

        checkAndUpdateMostRecentThread();
    }, [agent.id, setCurrentThread]);

    // Load all messages from thread when component mounts or thread changes (for reopening chat)
    useEffect(() => {
        const loadThreadMessages = async () => {
            if (currentThread && currentThread.id) {
                try {
                    const response = await api.getThreadMessages(currentThread.id);
                    if (response.success && response.data.messages) {
                        // Filter out tool messages (raw JSON responses) - keep "Using tools" indicators
                        const filteredMessages = response.data.messages.filter(
                            (m) => m.role !== "tool"
                        );
                        // Sort by timestamp with tie-breaker (same as conversations pane)
                        const sortedMessages = [...filteredMessages].sort((a, b) => {
                            const timeA = new Date(a.timestamp).getTime();
                            const timeB = new Date(b.timestamp).getTime();
                            if (timeA === timeB) {
                                if (a.role === "user" && b.role === "assistant") return -1;
                                if (a.role === "assistant" && b.role === "user") return 1;
                            }
                            return timeA - timeB;
                        });
                        setMessages(sortedMessages);
                    } else {
                        // No messages in thread, ensure empty state
                        setMessages([]);
                    }
                } catch (error) {
                    console.error("Failed to load thread messages:", error);
                    setMessages([]);
                }
            } else {
                // No thread means empty state (user explicitly cleared or new agent)
                setMessages([]);
            }
        };

        // Load messages when we have a thread but no active execution (reopening scenario)
        // Only use execution history when execution is actively running
        // When execution is completed or doesn't exist, load full conversation from thread
        const hasActiveExecution = currentExecution && currentExecution.status === "running";

        if (currentThread && !hasActiveExecution) {
            // Reopening chat or execution completed - load full conversation from thread
            loadThreadMessages();
        } else if (!currentThread && !currentExecution) {
            // No thread and no execution = empty state
            setMessages([]);
        }
    }, [currentThread?.id, currentExecution?.id, currentExecution?.status]);

    // Sync messages from execution when execution ID changes
    // Only update messages when execution is actively running
    // When execution completes, the first useEffect will reload full conversation from thread
    useEffect(() => {
        // Only sync from execution if it's actively running
        // Completed executions should not overwrite full thread messages
        if (currentExecution && currentExecution.status === "running") {
            const currentThreadId = currentExecution.thread_id;
            const isSameThread = prevThreadIdRef.current === currentThreadId;
            const isSameThreadAsCurrent = currentThread?.id === currentThreadId;
            const history = currentExecution.conversation_history || [];
            // Filter out tool messages (raw JSON responses) - keep "Using tools" indicators
            const filteredHistory = history.filter((m) => m.role !== "tool");

            // Update thread reference
            prevThreadIdRef.current = currentThreadId;

            setMessages((prev) => {
                // If this execution is in the same thread as currentThread, preserve existing messages
                // This handles the case where we loaded full thread messages and then start a new execution
                if (isSameThreadAsCurrent && prev.length > 0) {
                    const existingMessageIds = new Set(prev.map((m) => m.id));
                    const newMessages = filteredHistory.filter(
                        (m) => !existingMessageIds.has(m.id)
                    );
                    // Add new messages from the execution (typically just the new user message)
                    const combined = newMessages.length > 0 ? [...prev, ...newMessages] : prev;
                    // Sort by timestamp with tie-breaker (same as conversations pane)
                    return combined.sort((a, b) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        if (timeA === timeB) {
                            if (a.role === "user" && b.role === "assistant") return -1;
                            if (a.role === "assistant" && b.role === "user") return 1;
                        }
                        return timeA - timeB;
                    });
                }

                // If same thread as previous execution and we have existing messages, preserve them
                if (isSameThread && prev.length > 0) {
                    const existingMessageIds = new Set(prev.map((m) => m.id));
                    const newMessages = filteredHistory.filter(
                        (m) => !existingMessageIds.has(m.id)
                    );
                    // Add new messages from the execution (typically just the new user message)
                    const combined = newMessages.length > 0 ? [...prev, ...newMessages] : prev;
                    // Sort by timestamp with tie-breaker (same as conversations pane)
                    return combined.sort((a, b) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        if (timeA === timeB) {
                            if (a.role === "user" && b.role === "assistant") return -1;
                            if (a.role === "assistant" && b.role === "user") return 1;
                        }
                        return timeA - timeB;
                    });
                }

                // New thread or no previous messages - use execution history, sorted with tie-breaker
                return filteredHistory.sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    if (timeA === timeB) {
                        if (a.role === "user" && b.role === "assistant") return -1;
                        if (a.role === "assistant" && b.role === "user") return 1;
                    }
                    return timeA - timeB;
                });
            });
        } else {
            prevThreadIdRef.current = undefined;
            // Don't clear messages if we have a thread (they're loaded from thread in first useEffect)
            // Only clear if there's no thread and no execution
            if (!currentThread && !currentExecution) {
                setMessages([]);
            }
        }
    }, [currentExecution?.id, currentExecution?.status, currentThread]);

    // Subscribe to execution WebSocket events
    useEffect(() => {
        if (!currentExecution) return;

        const executionId = currentExecution.id;
        wsClient.subscribeToExecution(executionId);

        return () => {
            wsClient.unsubscribeFromExecution(executionId);
        };
    }, [currentExecution?.id]);

    // Handle WebSocket events
    useEffect(() => {
        const handleToken = (event: unknown) => {
            const data = event as { executionId?: string; token?: string };
            if (!data.executionId || !data.token) return;

            const executionId = data.executionId; // TypeScript now knows it's defined
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
                const lastMessage = prev[prev.length - 1];
                const accumulated = tokenAccumulatorRef.current.get(executionId) || "";
                const streamingId = `streaming-${executionId}`;

                if (
                    lastMessage &&
                    lastMessage.role === "assistant" &&
                    lastMessage.id === streamingId
                ) {
                    return [...prev.slice(0, -1), { ...lastMessage, content: accumulated }];
                } else {
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
            const data = event as { executionId?: string; message?: ConversationMessage };
            if (!data.executionId || !data.message) return;

            const store = useAgentStore.getState();
            if (!store.currentExecution || data.executionId !== store.currentExecution.id) return;
            if (data.message.role === "user") return; // Skip user messages
            if (data.message.role === "tool") return; // Skip tool messages (raw JSON)

            store.addMessageToExecution(data.executionId, data.message);

            // Update local messages state, replacing streaming message with final message
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
        };

        const handleCompleted = (event: unknown) => {
            const data = event as { executionId?: string; finalMessage?: string };
            const store = useAgentStore.getState();
            if (
                !store.currentExecution ||
                !data.executionId ||
                data.executionId !== store.currentExecution.id
            )
                return;

            // Just clear streaming state - the final message will come from handleMessage WebSocket event
            // Remove streaming message if it still exists
            setMessages((prev) => prev.filter((m) => m.id !== `streaming-${data.executionId}`));
            tokenAccumulatorRef.current.delete(data.executionId);

            setIsSending(false);
            updateExecutionStatus(data.executionId, "completed");
        };

        const handleFailed = (event: unknown) => {
            const data = event as { executionId?: string; error?: unknown };
            const store = useAgentStore.getState();
            if (!store.currentExecution || data.executionId !== store.currentExecution.id) return;

            if (data.executionId) {
                setMessages((prev) => prev.filter((m) => m.id !== `streaming-${data.executionId}`));
                tokenAccumulatorRef.current.delete(data.executionId);
            }

            setIsSending(false);
            updateExecutionStatus(store.currentExecution.id, "failed");
        };

        wsClient.on("agent:token", handleToken);
        wsClient.on("agent:message:new", handleMessage);
        wsClient.on("agent:execution:completed", handleCompleted);
        wsClient.on("agent:execution:failed", handleFailed);

        return () => {
            wsClient.off("agent:token", handleToken);
            wsClient.off("agent:message:new", handleMessage);
            wsClient.off("agent:execution:completed", handleCompleted);
            wsClient.off("agent:execution:failed", handleFailed);

            if (currentExecution?.id) {
                tokenAccumulatorRef.current.delete(currentExecution.id);
            }
        };
    }, [currentExecution?.id, isSending, updateExecutionStatus]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput("");
        setIsSending(true);

        try {
            const store = useAgentStore.getState();
            const exec = store.currentExecution;

            if (!exec || exec.status !== "running") {
                // Start new execution (or new one in same thread if previous completed)
                await executeAgent(agent.id, message, exec?.thread_id);
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
                    await executeAgent(agent.id, message, exec.thread_id);
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

    const handleClear = () => {
        // If already empty, just return
        if (messages.length === 0 && !currentExecution) {
            setShowClearConfirm(false);
            return;
        }

        // Start a brand new conversation for this agent and clear remembered thread
        createNewThread();
        setMessages([]);
        setShowClearConfirm(false);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Chat header - Fixed */}
            <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {currentExecution ? "Active conversation" : "Ready to chat"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        // If empty, just clear without confirmation
                        if (messages.length === 0 && !currentExecution) {
                            handleClear();
                        } else {
                            setShowClearConfirm(true);
                        }
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Start new conversation"
                >
                    <X className="w-4 h-4" />
                </button>
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
                        {isSending &&
                            currentExecution &&
                            !messages.some((m) => m.id === `streaming-${currentExecution.id}`) && (
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
            <div className="border-t border-border p-4 flex-shrink-0 bg-white">
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

            {/* Clear Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClear}
                title="Start New Conversation"
                message="This will clear the current chat. Are you sure you want to continue?"
                confirmText="Yes, start new"
                cancelText="Cancel"
                variant="default"
            />
        </div>
    );
}
