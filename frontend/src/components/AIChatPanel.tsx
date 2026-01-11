import { Send, X, Bot, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { JsonObject } from "@flowmaestro/shared";
import { modelSupportsThinking } from "@flowmaestro/shared";
import { chatWorkflow, streamChatResponse } from "../lib/api";
import { logger } from "../lib/logger";
import { cn } from "../lib/utils";
import {
    useChatStore,
    type ActionType,
    type NodeChange,
    type ChatMessage as ChatMessageType
} from "../stores/chatStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { ChatMessage } from "./chat/ChatMessage";
import { ConnectionSelector } from "./chat/ConnectionSelector";
import { SuggestedQuestions } from "./chat/SuggestedQuestions";
import { ThinkingBlock } from "./chat/ThinkingBlock";
import { Button } from "./common/Button";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { Input } from "./common/Input";
import type { Edge } from "reactflow";

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;

/**
 * Detect if the message is a node modification operation
 * Returns action type only for strong signals (add/modify/remove node)
 * Returns null for everything else (conversational mode)
 */
function detectNodeAction(message: string, hasSelectedNode: boolean): ActionType {
    const msg = message.toLowerCase().trim();

    // ONLY detect node modification operations with strong signals
    if (/(add|create|insert) (a |an |new |the )?node/i.test(msg)) {
        return "add";
    }

    if (/(modify|update|edit|change|configure) (the |a )?node/i.test(msg) && hasSelectedNode) {
        return "modify";
    }

    if (/(remove|delete) (the |a )?node/i.test(msg)) {
        return "remove";
    }

    // Everything else: return null (send message as-is for conversational handling)
    return null;
}

interface AIChatPanelProps {
    workflowId?: string;
}

export function AIChatPanel({ workflowId }: AIChatPanelProps) {
    const {
        isPanelOpen,
        panelWidth,
        messages,
        isStreaming,
        isThinking,
        selectedConnectionId,
        selectedModel,
        enableThinking,
        thinkingBudget,
        setPanelWidth,
        closePanel,
        addMessage,
        updateLastMessage,
        setStreaming,
        appendToThinking,
        completeThinking,
        toggleThinkingExpanded,
        clearProposedChanges,
        setWorkflowContext,
        clearChat
    } = useChatStore();

    // Check if current model supports thinking
    const currentModelSupportsThinking = selectedModel
        ? modelSupportsThinking(selectedModel)
        : false;

    const { nodes, edges, selectedNode } = useWorkflowStore();

    const [input, setInput] = useState("");
    const [isResizing, setIsResizing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(panelWidth);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = panelWidth;
    };

    // Handle resize
    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = resizeStartX.current - e.clientX;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, resizeStartWidth.current + deltaX)
            );

            setPanelWidth(newWidth);
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleResize);
            document.addEventListener("mouseup", handleResizeEnd);

            return () => {
                document.removeEventListener("mousemove", handleResize);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }

        return undefined;
    }, [isResizing, setPanelWidth]);

    // Handle send message
    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const message = input.trim();
        setInput("");

        // Add user message
        addMessage({
            role: "user",
            content: message
        });

        // Add empty assistant message for streaming
        addMessage({
            role: "assistant",
            content: ""
        });

        // Start streaming state
        setStreaming(true);

        try {
            // Detect if this is a node modification operation
            // Only detects strong signals for add/modify/remove node operations
            // Everything else returns null for conversational mode
            const action = detectNodeAction(message, selectedNode !== null);

            // Check if connection is selected
            if (!selectedConnectionId) {
                throw new Error(
                    "No LLM connection selected. Please select a connection from the dropdown."
                );
            }

            // Step 1: Initiate chat execution
            const response = await chatWorkflow({
                workflowId,
                action, // null for conversational, "add"/"modify"/"remove" for node ops
                message,
                context: {
                    nodes,
                    edges,
                    selectedNodeId: selectedNode
                },
                conversationHistory: messages, // Include conversation history for context
                connectionId: selectedConnectionId,
                model: selectedModel || undefined,
                enableThinking: currentModelSupportsThinking && enableThinking,
                thinkingBudget: enableThinking ? thinkingBudget : undefined
            });

            if (!response.success || !response.data?.executionId) {
                throw new Error(response.error || "Failed to initiate chat");
            }

            const { executionId } = response.data;

            // Step 2: Open SSE stream
            // TODO: Store cleanup function for cancellation
            streamChatResponse(executionId, {
                onThinkingStart: () => {
                    // Thinking started - state will be set by appendToThinking
                },
                onThinkingToken: (token: string) => {
                    appendToThinking(token);
                },
                onThinkingComplete: (content: string) => {
                    completeThinking(content);
                },
                onToken: (token: string) => {
                    // Append token to last message
                    updateLastMessage((current) => current + token);
                },
                onComplete: (data) => {
                    setStreaming(false);

                    // If there are changes, update message with them
                    if (data.changes && Array.isArray(data.changes) && data.changes.length > 0) {
                        const currentMessages = useChatStore.getState().messages;
                        const messagesWithoutLast = currentMessages.slice(0, -1);

                        useChatStore.setState({
                            messages: [
                                ...messagesWithoutLast,
                                {
                                    id: currentMessages[currentMessages.length - 1].id,
                                    role: "assistant" as const,
                                    content: data.response,
                                    timestamp: new Date(),
                                    proposedChanges: data.changes,
                                    thinking: data.thinking
                                }
                            ]
                        });
                    }
                },
                onError: (error: string) => {
                    updateLastMessage(`Error: ${error}`);
                    setStreaming(false);
                }
            });
        } catch (error) {
            logger.error("Chat error", error);
            updateLastMessage(
                `Error: ${error instanceof Error ? error.message : "Failed to get AI response. Please make sure you have an active LLM connection set up in the Connections page."}`
            );
            setStreaming(false);
        }
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Refresh workflow context
    const handleRefreshContext = () => {
        setWorkflowContext({
            nodes,
            edges,
            selectedNodeId: selectedNode
        });
    };

    // Handle suggested question click
    const handleSuggestedQuestion = (question: string) => {
        setInput(question);
        // Auto-send the message
        setTimeout(() => {
            const sendButton = document.querySelector(
                '[data-action="send-chat"]'
            ) as HTMLButtonElement;
            sendButton?.click();
        }, 100);
    };

    // Handle clear chat with confirmation
    const handleClearChat = () => {
        clearChat();
        setShowClearConfirm(false);
    };

    // Update context when panel opens or workflow changes
    useEffect(() => {
        if (isPanelOpen) {
            handleRefreshContext();
        }
    }, [isPanelOpen, nodes.length, edges.length, selectedNode]);

    // Calculate smart position for new nodes
    const calculateNodePosition = (index: number): { x: number; y: number } => {
        const currentNodes = nodes;

        // If no nodes exist, start at a nice position
        if (currentNodes.length === 0) {
            return { x: 250, y: 200 };
        }

        // Find the rightmost node position
        const maxX = Math.max(...currentNodes.map((n) => n.position.x));
        const maxY = Math.max(...currentNodes.map((n) => n.position.y));

        // Place new nodes to the right of existing workflow
        // Stagger vertically if multiple nodes being added
        return {
            x: maxX + 300,
            y: maxY + index * 100 - (index > 0 ? index * 50 : 0)
        };
    };

    // Handle apply changes
    const handleApplyChanges = (changes: NodeChange[]) => {
        const { addNode, updateNode, deleteNode, setEdges } = useWorkflowStore.getState();
        const newEdges: Edge[] = [];

        changes.forEach((change, index) => {
            if (change.type === "add") {
                // Generate unique node ID
                const nodeId = `${change.nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // Calculate smart position
                const position = change.position || calculateNodePosition(index);

                // Create React Flow node
                const newNode = {
                    id: nodeId,
                    type: change.nodeType,
                    position,
                    data: {
                        label: change.nodeLabel || `New ${change.nodeType}`,
                        config: change.config || {}
                    }
                };

                addNode(newNode);

                // Handle connection suggestion
                if (change.connectTo) {
                    newEdges.push({
                        id: `edge-${change.connectTo}-${nodeId}`,
                        source: change.connectTo,
                        target: nodeId,
                        type: "default"
                    });
                }
            } else if (change.type === "modify" && change.nodeId) {
                // Update existing node
                const updates: JsonObject = {};

                if (change.updates?.label) {
                    updates.label = change.updates.label;
                }

                if (change.updates?.config) {
                    const existingConfig =
                        (nodes.find((n) => n.id === change.nodeId)?.data?.config as JsonObject) ||
                        {};
                    updates.config = {
                        ...existingConfig,
                        ...(change.updates.config as JsonObject)
                    };
                }

                if (Object.keys(updates).length > 0) {
                    updateNode(change.nodeId, updates);
                }
            } else if (change.type === "remove" && change.nodeId) {
                // Delete node
                deleteNode(change.nodeId);
            }
        });

        // Add new edges if any were suggested
        if (newEdges.length > 0) {
            const currentEdges = useWorkflowStore.getState().edges;
            setEdges([...currentEdges, ...newEdges]);
        }

        clearProposedChanges();

        // Add success message
        const changeCount = changes.length;
        const edgeCount = newEdges.length;
        const message =
            edgeCount > 0
                ? `✓ Successfully applied ${changeCount} change${changeCount !== 1 ? "s" : ""} and ${edgeCount} connection${edgeCount !== 1 ? "s" : ""} to the workflow.`
                : `✓ Successfully applied ${changeCount} change${changeCount !== 1 ? "s" : ""} to the workflow.`;

        addMessage({
            role: "assistant",
            content: message
        });
    };

    // Handle reject changes
    const handleRejectChanges = () => {
        clearProposedChanges();
    };

    if (!isPanelOpen) return null;

    return (
        <div className="fixed top-0 right-0 bottom-0 z-50">
            <div
                className="h-full bg-card border-l border-border shadow-2xl flex flex-col"
                style={{ width: panelWidth }}
            >
                {/* Resize Handle */}
                <div
                    className={cn(
                        "absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors",
                        isResizing && "bg-primary/30"
                    )}
                    onMouseDown={handleResizeStart}
                >
                    <div className="absolute top-0 left-0 bottom-0 w-3 -translate-x-1/2" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">AI Workflow Assistant</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <ConnectionSelector />
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            disabled={messages.length === 0 || isStreaming}
                            className={cn(
                                "p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors",
                                "disabled:opacity-30 disabled:cursor-not-allowed"
                            )}
                            title="Clear chat history"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={closePanel}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center text-muted-foreground max-w-sm">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm mb-2">Hey! I'm your AI Workflow Assistant.</p>
                                <p className="text-xs">
                                    Ask me to explain your workflow, add nodes, debug issues, or
                                    optimize your flow.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <MessageWithThinking
                                    key={message.id}
                                    message={message}
                                    isStreaming={
                                        isStreaming &&
                                        message.id === messages[messages.length - 1]?.id
                                    }
                                    isThinking={
                                        isThinking &&
                                        message.id === messages[messages.length - 1]?.id
                                    }
                                    onToggleThinking={() => toggleThinkingExpanded(message.id)}
                                    onApplyChanges={handleApplyChanges}
                                    onRejectChanges={handleRejectChanges}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Suggested Questions - Above input */}
                <SuggestedQuestions
                    onQuestionClick={handleSuggestedQuestion}
                    hasNodes={nodes.length > 0}
                    hasSelectedNode={selectedNode !== null}
                    disabled={isStreaming}
                />

                {/* Input - Fixed at bottom */}
                <div className="border-t border-border p-4 flex-shrink-0">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your workflow..."
                            disabled={isStreaming}
                            className={cn(
                                "flex-1 px-4 py-3 rounded-lg",
                                "bg-muted border border-border",
                                "text-foreground placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary",
                                "disabled:opacity-50"
                            )}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming}
                            data-action="send-chat"
                            className={cn(
                                "px-4 py-3 rounded-lg",
                                "bg-primary text-primary-foreground",
                                "hover:bg-primary/90 transition-colors",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Press Enter to send • Shift+Enter for new line
                    </p>
                </div>
            </div>

            {/* Clear Chat Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearChat}
                title="Clear Chat History"
                message="Are you sure you want to clear all chat messages? This action cannot be undone."
                confirmText="Clear"
                cancelText="Cancel"
                variant="default"
            />
        </div>
    );
}

/**
 * Wrapper component that adds ThinkingBlock to assistant messages
 */
interface MessageWithThinkingProps {
    message: ChatMessageType;
    isStreaming: boolean;
    isThinking: boolean;
    onToggleThinking: () => void;
    onApplyChanges: (changes: NodeChange[]) => void;
    onRejectChanges: () => void;
}

function MessageWithThinking({
    message,
    isStreaming,
    isThinking,
    onToggleThinking,
    onApplyChanges,
    onRejectChanges
}: MessageWithThinkingProps) {
    // User messages don't have thinking
    if (message.role === "user") {
        return (
            <ChatMessage
                message={message}
                isStreaming={false}
                onApplyChanges={onApplyChanges}
                onRejectChanges={onRejectChanges}
            />
        );
    }

    // Assistant messages may have thinking
    return (
        <div className="space-y-2">
            {/* Thinking Block - shown above the response */}
            {(message.thinking || message.isThinkingStreaming) && (
                <ThinkingBlock
                    content={message.thinking || ""}
                    isExpanded={message.thinkingExpanded ?? false}
                    isStreaming={message.isThinkingStreaming ?? false}
                    onToggle={onToggleThinking}
                />
            )}

            {/* Response message */}
            <ChatMessage
                message={message}
                isStreaming={isStreaming && !isThinking}
                onApplyChanges={onApplyChanges}
                onRejectChanges={onRejectChanges}
            />
        </div>
    );
}
