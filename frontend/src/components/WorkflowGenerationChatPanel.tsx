/**
 * WorkflowGenerationChatPanel Component
 *
 * Slide-out chat panel for AI-powered workflow generation.
 * Supports extended thinking/reasoning display and workflow plan previews.
 * Refactored to use unified chat components.
 */

import { Bot, ChevronDown, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    modelSupportsThinking,
    getDefaultThinkingBudget,
    getRandomExamplePrompts
} from "@flowmaestro/shared";
import { useChatInput } from "../hooks/useChatInput";
import { initiateGenerationChat, createWorkflowFromPlan } from "../lib/api";
import { logger } from "../lib/logger";
import { streamGenerationChatResponse } from "../lib/sse";
import { cn } from "../lib/utils";
import {
    useWorkflowGenerationChatStore,
    type GenerationMessage
} from "../stores/workflowGenerationChatStore";
import {
    ResizablePanel,
    ChatMessageList,
    DefaultEmptyState,
    ChatInput,
    ClearChatButton,
    ChatBubble
} from "./chat/core";
import { ThinkingBlock } from "./chat/ThinkingBlock";
import { WorkflowPlanPreview } from "./chat/WorkflowPlanPreview";
import { LLMConnectionDropdown } from "./common/LLMConnectionDropdown";
import { MarkdownRenderer } from "./common/MarkdownRenderer";
import { TypingDots } from "./common/TypingDots";

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

    // Local state for example prompts
    const [examplePrompts, setExamplePrompts] = useState<string[]>(() =>
        getRandomExamplePrompts(4)
    );
    const [isExamplesExpanded, setIsExamplesExpanded] = useState(true);

    // Stream cleanup ref
    const cleanupStreamRef = useRef<(() => void) | null>(null);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (cleanupStreamRef.current) {
                cleanupStreamRef.current();
            }
        };
    }, []);

    // Handle connection/model selection from dropdown
    const handleConnectionModelSelect = (connectionId: string, model: string) => {
        setConnection(connectionId, model);

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
    };

    // Check if current model supports thinking
    const currentModelSupportsThinking = selectedModel
        ? modelSupportsThinking(selectedModel)
        : false;

    // Handle send message
    const handleSendMessage = useCallback(
        async (message: string) => {
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
        },
        [
            selectedConnectionId,
            selectedModel,
            addUserMessage,
            startAssistantMessage,
            messages,
            currentModelSupportsThinking,
            enableThinking,
            thinkingBudget,
            appendToThinking,
            completeThinking,
            appendToResponse,
            setPlan,
            completeAssistantMessage,
            setMessageError
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
        setInputValue(feedback);
        // Auto-send the feedback
        setTimeout(() => {
            handleSendMessage(feedback);
        }, 50);
    };

    // Handle refresh example prompts
    const handleRefreshExamples = () => {
        setExamplePrompts(getRandomExamplePrompts(4));
    };

    // Handle click on example prompt
    const handleExamplePromptClick = (prompt: string) => {
        setInputValue(prompt);
    };

    if (!isPanelOpen) return null;

    return (
        <ResizablePanel
            header={
                <>
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Generate Workflow</h3>
                </>
            }
            headerActions={
                <>
                    <LLMConnectionDropdown
                        connectionId={selectedConnectionId || ""}
                        model={selectedModel || ""}
                        onSelect={(connId, model) => handleConnectionModelSelect(connId, model)}
                        variant="compact"
                        autoSelectFirst={true}
                        showThinkingBadges={true}
                        thinkingConfig={{
                            enabled: enableThinking,
                            onEnabledChange: setEnableThinking
                        }}
                    />
                    <ClearChatButton
                        onClear={clearChat}
                        disabled={messages.length === 0 || isStreaming}
                    />
                </>
            }
            onClose={closePanel}
            width={panelWidth}
            onWidthChange={setPanelWidth}
            minWidth={400}
            maxWidth={800}
            fixed={false}
            className="flex-shrink-0"
        >
            {/* Messages */}
            <ChatMessageList
                hasMessages={messages.length > 0}
                scrollDependencies={[messages, isThinking]}
                emptyState={
                    <DefaultEmptyState
                        icon={<Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />}
                        title="Describe the workflow you want to create"
                        description="I'll help you design the perfect automation workflow through conversation. Tell me what you want to automate!"
                    />
                }
            >
                {messages.map((message) => (
                    <GenerationMessageBubble
                        key={message.id}
                        message={message}
                        isStreaming={
                            isStreaming && message.id === messages[messages.length - 1]?.id
                        }
                        isThinking={isThinking && message.id === messages[messages.length - 1]?.id}
                        onToggleThinking={() => toggleThinkingExpanded(message.id)}
                        onCreateWorkflow={handleCreateWorkflow}
                        onRefinePlan={handleRefinePlan}
                        isCreatingWorkflow={isCreatingWorkflow}
                    />
                ))}
            </ChatMessageList>

            {/* Example Prompts (shown at bottom when no messages) */}
            {messages.length === 0 && (
                <ExamplePrompts
                    prompts={examplePrompts}
                    isExpanded={isExamplesExpanded}
                    onToggleExpanded={() => setIsExamplesExpanded(!isExamplesExpanded)}
                    onRefresh={handleRefreshExamples}
                    onPromptClick={handleExamplePromptClick}
                />
            )}

            {/* Input */}
            <ChatInput
                value={inputValue}
                onChange={handleInputChange}
                onSend={handleSend}
                onKeyPress={handleKeyPress}
                placeholder="Describe your workflow idea..."
                disabled={isStreaming}
                isLoading={isStreaming}
                helperText="Press Enter to send"
            />
        </ResizablePanel>
    );
}

/**
 * Example prompts section component
 */
interface ExamplePromptsProps {
    prompts: string[];
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onRefresh: () => void;
    onPromptClick: (prompt: string) => void;
}

function ExamplePrompts({
    prompts,
    isExpanded,
    onToggleExpanded,
    onRefresh,
    onPromptClick
}: ExamplePromptsProps) {
    return (
        <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={onToggleExpanded}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    Example prompts
                </button>
                {isExpanded && (
                    <button
                        onClick={onRefresh}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Shuffle examples"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            {isExpanded && (
                <div className="space-y-1.5">
                    {prompts.map((prompt, index) => (
                        <button
                            key={index}
                            onClick={() => onPromptClick(prompt)}
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
    );
}

/**
 * Generation message bubble with thinking and workflow plan support
 */
interface GenerationMessageBubbleProps {
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
    return content.replace(/```json\s*\{[\s\S]*?"workflowPlan"[\s\S]*?\}\s*```/g, "").trim();
}

function GenerationMessageBubble({
    message,
    isStreaming,
    isThinking,
    onToggleThinking,
    onCreateWorkflow,
    onRefinePlan,
    isCreatingWorkflow
}: GenerationMessageBubbleProps) {
    // Get display content - strip JSON if we have a workflow plan
    const displayContent = message.workflowPlan
        ? stripWorkflowPlanJson(message.content)
        : message.content;

    // User message - use ChatBubble
    if (message.role === "user") {
        return <ChatBubble role="user" content={message.content} useMarkdown={false} />;
    }

    // Show compact typing indicator when streaming but no content yet
    const showTypingIndicator = isStreaming && !message.content && !isThinking;

    // Assistant message with thinking and workflow plan
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

                {/* Typing Indicator - compact bubble when no content yet */}
                {showTypingIndicator ? (
                    <div className="rounded-lg px-4 py-3 bg-muted text-foreground w-fit">
                        <TypingDots />
                    </div>
                ) : (
                    /* Response Content - full width once content starts */
                    <div className="rounded-lg px-4 py-3 bg-muted text-foreground">
                        <MarkdownRenderer content={displayContent} />
                    </div>
                )}

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
