/**
 * AIChatPanel Component
 *
 * Slide-out chat panel for AI-powered workflow editing assistance.
 * Refactored to use unified chat components for consistency.
 */

import { Bot } from "lucide-react";
import { useEffect, useCallback } from "react";
import type { JsonObject } from "@flowmaestro/shared";
import { modelSupportsThinking } from "@flowmaestro/shared";
import { useChatInput } from "../hooks/useChatInput";
import { chatWorkflow } from "../lib/api";
import { logger } from "../lib/logger";
import { streamChatResponse } from "../lib/sse";
import {
    useChatStore,
    type ActionType,
    type NodeChange,
    type ChatMessage as ChatMessageType
} from "../stores/chatStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { ChatMessage } from "./chat/ChatMessage";
import { ConnectionSelector } from "./chat/ConnectionSelector";
import {
    ResizablePanel,
    ChatMessageList,
    DefaultEmptyState,
    ChatInput,
    ClearChatButton
} from "./chat/core";
import { SuggestedQuestions } from "./chat/SuggestedQuestions";
import { ThinkingBlock } from "./chat/ThinkingBlock";
import type { Edge } from "reactflow";

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
    onClose?: () => void;
}

export function AIChatPanel({ workflowId, onClose }: AIChatPanelProps) {
    const {
        panelWidth,
        messages,
        isStreaming,
        isThinking,
        selectedConnectionId,
        selectedModel,
        enableThinking,
        thinkingBudget,
        setPanelWidth,
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

    // Handle send message
    const handleSendMessage = useCallback(
        async (message: string) => {
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
                const action = detectNodeAction(message, selectedNode !== null);

                // Check if connection is selected
                if (!selectedConnectionId) {
                    throw new Error(
                        "No LLM connection configured. Please create an LLM connection in the Connections page first (e.g., OpenAI API key, Claude API key, etc.), then select it from the dropdown in this panel."
                    );
                }

                // Initiate chat execution
                const response = await chatWorkflow({
                    workflowId,
                    action,
                    message,
                    context: {
                        nodes,
                        edges,
                        selectedNodeId: selectedNode
                    },
                    conversationHistory: messages,
                    connectionId: selectedConnectionId,
                    model: selectedModel || undefined,
                    enableThinking: currentModelSupportsThinking && enableThinking,
                    thinkingBudget: enableThinking ? thinkingBudget : undefined
                });

                if (!response.success || !response.data?.executionId) {
                    throw new Error(response.error || "Failed to initiate chat");
                }

                const { executionId } = response.data;

                // Open SSE stream
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
                        updateLastMessage((current) => current + token);
                    },
                    onComplete: (data) => {
                        setStreaming(false);

                        // If there are changes, update message with them
                        if (
                            data.changes &&
                            Array.isArray(data.changes) &&
                            data.changes.length > 0
                        ) {
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
        },
        [
            addMessage,
            setStreaming,
            selectedNode,
            selectedConnectionId,
            workflowId,
            nodes,
            edges,
            messages,
            selectedModel,
            currentModelSupportsThinking,
            enableThinking,
            thinkingBudget,
            appendToThinking,
            completeThinking,
            updateLastMessage
        ]
    );

    // Use the chat input hook
    const {
        value: inputValue,
        setValue: setInputValue,
        onChange: handleInputChange,
        onKeyPress: handleKeyPress,
        handleSend
    } = useChatInput({
        onSend: handleSendMessage,
        disabled: isStreaming
    });

    // Handle suggested question click
    const handleSuggestedQuestion = (question: string) => {
        setInputValue(question);
        // Auto-send after a brief delay to allow state to update
        setTimeout(() => {
            handleSendMessage(question);
        }, 50);
    };

    // Refresh workflow context
    const handleRefreshContext = useCallback(() => {
        setWorkflowContext({
            nodes,
            edges,
            selectedNodeId: selectedNode
        });
    }, [setWorkflowContext, nodes, edges, selectedNode]);

    // Update context when panel mounts or workflow changes
    useEffect(() => {
        handleRefreshContext();
    }, [nodes.length, edges.length, selectedNode, handleRefreshContext]);

    // Calculate smart position for new nodes
    const calculateNodePosition = (index: number): { x: number; y: number } => {
        if (nodes.length === 0) {
            return { x: 250, y: 200 };
        }

        const maxX = Math.max(...nodes.map((n) => n.position.x));
        const maxY = Math.max(...nodes.map((n) => n.position.y));

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
                const nodeId = `${change.nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const position = change.position || calculateNodePosition(index);

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

                if (change.connectTo) {
                    newEdges.push({
                        id: `edge-${change.connectTo}-${nodeId}`,
                        source: change.connectTo,
                        target: nodeId,
                        type: "default"
                    });
                }
            } else if (change.type === "modify" && change.nodeId) {
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
                deleteNode(change.nodeId);
            }
        });

        if (newEdges.length > 0) {
            const currentEdges = useWorkflowStore.getState().edges;
            setEdges([...currentEdges, ...newEdges]);
        }

        clearProposedChanges();

        const changeCount = changes.length;
        const edgeCount = newEdges.length;
        const successMessage =
            edgeCount > 0
                ? `Successfully applied ${changeCount} change${changeCount !== 1 ? "s" : ""} and ${edgeCount} connection${edgeCount !== 1 ? "s" : ""} to the workflow.`
                : `Successfully applied ${changeCount} change${changeCount !== 1 ? "s" : ""} to the workflow.`;

        addMessage({
            role: "assistant",
            content: successMessage
        });
    };

    // Handle reject changes
    const handleRejectChanges = () => {
        clearProposedChanges();
    };

    // Handle close
    const handleClose = () => {
        onClose?.();
    };

    return (
        <ResizablePanel
            header={
                <>
                    <Bot className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">AI Workflow Assistant</h3>
                </>
            }
            headerActions={
                <>
                    <ConnectionSelector />
                    <ClearChatButton
                        onClear={clearChat}
                        disabled={messages.length === 0 || isStreaming}
                    />
                </>
            }
            onClose={handleClose}
            width={panelWidth}
            onWidthChange={setPanelWidth}
            minWidth={400}
            maxWidth={800}
        >
            {/* Messages - Scrollable */}
            <ChatMessageList
                hasMessages={messages.length > 0}
                scrollDependencies={[messages]}
                emptyState={
                    <DefaultEmptyState
                        icon={<Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />}
                        title="Hey! I'm your AI Workflow Assistant."
                        description="Ask me to explain your workflow, add nodes, debug issues, or optimize your flow."
                    />
                }
            >
                {messages.map((message) => (
                    <MessageWithThinking
                        key={message.id}
                        message={message}
                        isStreaming={
                            isStreaming && message.id === messages[messages.length - 1]?.id
                        }
                        isThinking={isThinking && message.id === messages[messages.length - 1]?.id}
                        onToggleThinking={() => toggleThinkingExpanded(message.id)}
                        onApplyChanges={handleApplyChanges}
                        onRejectChanges={handleRejectChanges}
                    />
                ))}
            </ChatMessageList>

            {/* Suggested Questions - Above input */}
            <SuggestedQuestions
                onQuestionClick={handleSuggestedQuestion}
                hasNodes={nodes.length > 0}
                hasSelectedNode={selectedNode !== null}
                disabled={isStreaming}
            />

            {/* Input - Fixed at bottom */}
            <ChatInput
                value={inputValue}
                onChange={handleInputChange}
                onSend={handleSend}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your workflow..."
                disabled={isStreaming}
                isLoading={isStreaming}
                helperText="Press Enter to send"
            />
        </ResizablePanel>
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
