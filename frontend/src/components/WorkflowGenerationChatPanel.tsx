/**
 * WorkflowGenerationChatPanel Component
 *
 * Slide-out chat panel for AI-powered workflow generation.
 * Supports extended thinking/reasoning display and workflow plan previews.
 */

import {
    Bot,
    Brain,
    ChevronDown,
    ChevronRight,
    Loader2,
    RefreshCw,
    RotateCcw,
    Send,
    Settings,
    Sparkles,
    User,
    X
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import remarkGfm from "remark-gfm";
import {
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider,
    modelSupportsThinking,
    getDefaultThinkingBudget,
    getRandomExamplePrompts
} from "@flowmaestro/shared";
import {
    getConnections,
    initiateGenerationChat,
    streamGenerationChatResponse,
    createWorkflowFromPlan,
    type Connection
} from "../lib/api";
import { logger } from "../lib/logger";
import { cn } from "../lib/utils";
import {
    useWorkflowGenerationChatStore,
    type GenerationMessage
} from "../stores/workflowGenerationChatStore";
import { ThinkingBlock } from "./chat/ThinkingBlock";
import { WorkflowPlanPreview } from "./chat/WorkflowPlanPreview";
import { Button } from "./common/Button";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { Input } from "./common/Input";

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;

// Get list of provider values from the models registry
const LLM_PROVIDER_VALUES = Object.keys(LLM_MODELS_BY_PROVIDER);

// Define provider display order
const PROVIDER_ORDER = ["anthropic", "openai", "google", "cohere", "huggingface"];

export function WorkflowGenerationChatPanel() {
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
        currentPlan,
        isCreatingWorkflow,
        setPanelWidth,
        closePanel,
        addUserMessage,
        startAssistantMessage,
        appendToThinking,
        completeThinking,
        appendToResponse,
        completeAssistantMessage,
        setMessageError,
        toggleThinkingExpanded,
        setConnection,
        setEnableThinking,
        setThinkingBudget,
        setPlan,
        setCreatingWorkflow,
        clearChat
    } = useWorkflowGenerationChatStore();

    const navigate = useNavigate();

    // Local state
    const [input, setInput] = useState("");
    const [isResizing, setIsResizing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);
    const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);
    const [examplePrompts, setExamplePrompts] = useState<string[]>(() =>
        getRandomExamplePrompts(4)
    );
    const [isExamplesExpanded, setIsExamplesExpanded] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(panelWidth);
    const cleanupStreamRef = useRef<(() => void) | null>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    // Fetch connections on mount
    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const response = await getConnections({ status: "active" });
                if (response.success) {
                    const llmConnections = response.data
                        .filter((conn) => LLM_PROVIDER_VALUES.includes(conn.provider))
                        .sort((a, b) => {
                            const aIndex = PROVIDER_ORDER.indexOf(a.provider);
                            const bIndex = PROVIDER_ORDER.indexOf(b.provider);
                            if (aIndex !== bIndex) {
                                return aIndex - bIndex;
                            }
                            return a.name.localeCompare(b.name);
                        });
                    setConnections(llmConnections);

                    // Auto-select first connection if none selected
                    if (!selectedConnectionId && llmConnections.length > 0) {
                        const firstConn = llmConnections[0];
                        const defaultModel = getDefaultModelForProvider(firstConn.provider);
                        setConnection(firstConn.id, defaultModel);

                        // Check if model supports thinking
                        if (modelSupportsThinking(defaultModel)) {
                            setEnableThinking(true);
                            const thinkingBudgetValue = getDefaultThinkingBudget(defaultModel);
                            if (thinkingBudgetValue !== undefined) {
                                setThinkingBudget(thinkingBudgetValue);
                            }
                        }
                    }
                }
            } catch (error) {
                logger.error("Failed to fetch connections", error);
            } finally {
                setIsLoadingConnections(false);
            }
        };

        if (isPanelOpen) {
            fetchConnections();
        }
    }, [isPanelOpen]);

    // Handle resize
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = panelWidth;
    };

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

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (cleanupStreamRef.current) {
                cleanupStreamRef.current();
            }
        };
    }, []);

    // Get selected connection details
    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);
    const availableModels = selectedConnection
        ? LLM_MODELS_BY_PROVIDER[selectedConnection.provider] || []
        : [];

    // Check if current model supports thinking
    const currentModelSupportsThinking = selectedModel
        ? modelSupportsThinking(selectedModel)
        : false;

    // Get model display name
    const getModelNickname = (modelValue: string | null): string => {
        if (!modelValue) return "";
        const model = availableModels.find((m) => m.value === modelValue);
        if (model) {
            return model.label.replace(/\s*\([^)]*\)/g, "").trim();
        }
        return modelValue;
    };

    // Handle connection change
    const handleConnectionChange = (connectionId: string) => {
        const connection = connections.find((c) => c.id === connectionId);
        if (connection) {
            const defaultModel = getDefaultModelForProvider(connection.provider);
            setConnection(connectionId, defaultModel);

            // Update thinking settings based on model
            if (modelSupportsThinking(defaultModel)) {
                setEnableThinking(true);
                const thinkingBudgetValue = getDefaultThinkingBudget(defaultModel);
                if (thinkingBudgetValue !== undefined) {
                    setThinkingBudget(thinkingBudgetValue);
                }
            } else {
                setEnableThinking(false);
            }
        }
        setShowConnectionDropdown(false);
    };

    // Handle model change
    const handleModelChange = (model: string) => {
        if (selectedConnectionId && selectedConnection) {
            setConnection(selectedConnectionId, model);

            // Update thinking settings based on model
            if (modelSupportsThinking(model)) {
                setEnableThinking(true);
                const thinkingBudgetValue = getDefaultThinkingBudget(model);
                if (thinkingBudgetValue !== undefined) {
                    setThinkingBudget(thinkingBudgetValue);
                }
            } else {
                setEnableThinking(false);
            }
        }
        setShowConnectionDropdown(false);
    };

    // Handle send message
    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const message = input.trim();
        setInput("");

        // Check if connection is selected
        if (!selectedConnectionId || !selectedModel) {
            logger.error("No LLM connection selected");
            return;
        }

        // Add user message
        addUserMessage(message);

        // Add empty assistant message for streaming
        const messageId = startAssistantMessage();

        try {
            // Initiate chat execution
            const response = await initiateGenerationChat({
                message,
                conversationHistory: messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    thinking: m.thinking,
                    timestamp: m.timestamp
                })),
                connectionId: selectedConnectionId,
                model: selectedModel,
                enableThinking: currentModelSupportsThinking && enableThinking,
                thinkingBudget: enableThinking ? thinkingBudget : undefined
            });

            if (!response.success || !response.data?.executionId) {
                throw new Error("Failed to initiate generation chat");
            }

            const { executionId } = response.data;

            // Open SSE stream
            cleanupStreamRef.current = streamGenerationChatResponse(executionId, {
                onThinkingStart: () => {
                    // Already handled by appendToThinking
                },
                onThinkingToken: (token) => {
                    appendToThinking(token);
                },
                onThinkingComplete: (content) => {
                    completeThinking(content);
                },
                onToken: (token) => {
                    appendToResponse(token);
                },
                onPlanDetected: (plan) => {
                    setPlan(plan);
                },
                onComplete: (data) => {
                    completeAssistantMessage(data.response, data.thinking, data.workflowPlan);
                    cleanupStreamRef.current = null;
                },
                onError: (error) => {
                    setMessageError(messageId, error);
                    cleanupStreamRef.current = null;
                }
            });
        } catch (error) {
            logger.error("Generation chat error", error);
            setMessageError(
                messageId,
                error instanceof Error ? error.message : "Failed to get AI response"
            );
        }
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Handle create workflow from plan
    const handleCreateWorkflow = async () => {
        if (!currentPlan) return;

        setCreatingWorkflow(true);
        try {
            const response = await createWorkflowFromPlan(currentPlan);

            if (response.success && response.data) {
                // Clear chat history since we're navigating away
                clearChat();
                closePanel();
                // Navigate to the new workflow in builder
                navigate(`/builder/${response.data.workflowId}`);
            } else {
                logger.error("Failed to create workflow from plan");
            }
        } catch (error) {
            logger.error("Error creating workflow from plan", error);
        } finally {
            setCreatingWorkflow(false);
        }
    };

    // Handle refine plan
    const handleRefinePlan = (feedback: string) => {
        setInput(feedback);
        // Auto-send the feedback
        setTimeout(() => {
            handleSend();
        }, 100);
    };

    // Handle clear chat
    const handleClearChat = () => {
        clearChat();
        setShowClearConfirm(false);
    };

    // Handle refresh example prompts
    const handleRefreshExamples = () => {
        setExamplePrompts(getRandomExamplePrompts(4));
    };

    // Handle click on example prompt
    const handleExamplePromptClick = (prompt: string) => {
        setInput(prompt);
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
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Generate Workflow</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Connection Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowConnectionDropdown(!showConnectionDropdown)}
                                disabled={isLoadingConnections}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                                    "hover:bg-muted transition-colors",
                                    "text-muted-foreground"
                                )}
                            >
                                {isLoadingConnections ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Loading...</span>
                                    </>
                                ) : connections.length === 0 ? (
                                    <>
                                        <Settings className="w-3.5 h-3.5" />
                                        <span className="text-orange-600 dark:text-orange-400">
                                            No LLM
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Settings className="w-3.5 h-3.5" />
                                        <span className="font-medium">
                                            {getModelNickname(selectedModel) || "Select"}
                                        </span>
                                        <ChevronDown className="w-3 h-3" />
                                    </>
                                )}
                            </button>

                            {showConnectionDropdown && connections.length > 0 && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowConnectionDropdown(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-72 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                        {/* Connections */}
                                        <div className="p-2 border-b border-border">
                                            <p className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                                                Connection
                                            </p>
                                            <div className="space-y-0.5">
                                                {connections.map((conn) => (
                                                    <button
                                                        key={conn.id}
                                                        onClick={() =>
                                                            handleConnectionChange(conn.id)
                                                        }
                                                        className={cn(
                                                            "w-full text-left px-2 py-1.5 rounded text-xs",
                                                            "hover:bg-muted transition-colors",
                                                            selectedConnectionId === conn.id
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-foreground"
                                                        )}
                                                    >
                                                        <div className="font-medium">
                                                            {conn.name}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground capitalize">
                                                            {conn.provider}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Models */}
                                        {availableModels.length > 0 && (
                                            <div className="p-2 border-b border-border">
                                                <p className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                                                    Model
                                                </p>
                                                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                                    {availableModels.map((model) => (
                                                        <button
                                                            key={model.value}
                                                            onClick={() =>
                                                                handleModelChange(model.value)
                                                            }
                                                            className={cn(
                                                                "w-full text-left px-2 py-1.5 rounded text-xs",
                                                                "hover:bg-muted transition-colors",
                                                                selectedModel === model.value
                                                                    ? "bg-primary/10 text-primary"
                                                                    : "text-foreground"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {model.label}
                                                                {model.supportsThinking && (
                                                                    <Brain className="w-3 h-3 text-amber-500" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Thinking Toggle */}
                                        {currentModelSupportsThinking && (
                                            <div className="p-2">
                                                <label className="flex items-center gap-2 px-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={enableThinking}
                                                        onChange={(e) =>
                                                            setEnableThinking(e.target.checked)
                                                        }
                                                        className="rounded border-border"
                                                    />
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Brain className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>Enable Extended Thinking</span>
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Clear Chat */}
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

                        {/* Close */}
                        <button
                            onClick={closePanel}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            {/* Welcome Message */}
                            <div className="text-center text-muted-foreground max-w-sm mx-auto">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm mb-2">
                                    Describe the workflow you want to create
                                </p>
                                <p className="text-xs">
                                    I'll help you design the perfect automation workflow through
                                    conversation. Tell me what you want to automate!
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <MessageBubble
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
                                    onCreateWorkflow={handleCreateWorkflow}
                                    onRefinePlan={handleRefinePlan}
                                    isCreatingWorkflow={isCreatingWorkflow}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Example Prompts (shown at bottom when no messages) */}
                {messages.length === 0 && (
                    <div className="border-t border-border px-4 py-3 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <button
                                onClick={() => setIsExamplesExpanded(!isExamplesExpanded)}
                                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isExamplesExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                )}
                                Example prompts
                            </button>
                            {isExamplesExpanded && (
                                <button
                                    onClick={handleRefreshExamples}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Shuffle examples"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        {isExamplesExpanded && (
                            <div className="space-y-1.5">
                                {examplePrompts.map((prompt, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleExamplePromptClick(prompt)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs",
                                            "bg-muted/50 border border-border/50",
                                            "hover:bg-muted hover:border-border transition-colors",
                                            "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Input */}
                <div className="border-t border-border p-4 flex-shrink-0">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Describe your workflow idea..."
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
                        Press Enter to send
                    </p>
                </div>
            </div>

            {/* Clear Chat Confirmation */}
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

// Message Bubble Component
interface MessageBubbleProps {
    message: GenerationMessage;
    isStreaming: boolean;
    isThinking: boolean;
    onToggleThinking: () => void;
    onCreateWorkflow: () => void;
    onRefinePlan: (feedback: string) => void;
    isCreatingWorkflow: boolean;
}

/**
 * Strip JSON code blocks containing workflowPlan from content
 * This prevents showing raw JSON when we have a visual preview
 */
function stripWorkflowPlanJson(content: string): string {
    // Remove ```json blocks containing workflowPlan
    return content.replace(/```json\s*\{[\s\S]*?"workflowPlan"[\s\S]*?\}\s*```/g, "").trim();
}

function MessageBubble({
    message,
    isStreaming,
    isThinking,
    onToggleThinking,
    onCreateWorkflow,
    onRefinePlan,
    isCreatingWorkflow
}: MessageBubbleProps) {
    // Get display content - strip JSON if we have a workflow plan
    const displayContent = message.workflowPlan
        ? stripWorkflowPlanJson(message.content)
        : message.content;

    // User message
    if (message.role === "user") {
        return (
            <div className="flex gap-3 justify-end">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-primary text-primary-foreground">
                    <div className="text-sm">{message.content}</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                </div>
            </div>
        );
    }

    // Assistant message
    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 max-w-[85%]">
                {/* Thinking Block */}
                {(message.thinking || message.isThinkingStreaming) && (
                    <ThinkingBlock
                        content={message.thinking || ""}
                        isExpanded={message.thinkingExpanded ?? false}
                        isStreaming={message.isThinkingStreaming ?? false}
                        onToggle={onToggleThinking}
                    />
                )}

                {/* Response Content */}
                <div className="rounded-lg px-4 py-3 bg-muted text-foreground">
                    {isStreaming && !message.content && !isThinking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
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
                                        <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
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
                                    li: ({ children }) => <li className="ml-2">{children}</li>,
                                    p: ({ children }) => <p className="my-1.5">{children}</p>,
                                    strong: ({ children }) => (
                                        <strong className="font-semibold">{children}</strong>
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
                                {displayContent}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Workflow Plan Preview */}
                {message.workflowPlan && (
                    <WorkflowPlanPreview
                        plan={message.workflowPlan}
                        onCreateWorkflow={onCreateWorkflow}
                        onRefine={onRefinePlan}
                        isCreating={isCreatingWorkflow}
                    />
                )}
            </div>
        </div>
    );
}
