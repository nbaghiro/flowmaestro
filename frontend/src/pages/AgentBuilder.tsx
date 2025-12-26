import {
    ArrowLeft,
    Save,
    Loader2,
    Settings,
    MessageSquare,
    Slack,
    Wrench,
    Pencil
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getDefaultModelForProvider } from "@flowmaestro/shared";
import { AddCustomMCPDialog } from "../components/agents/AddCustomMCPDialog";
import { AddMCPIntegrationDialog } from "../components/agents/AddMCPIntegrationDialog";
import { AddWorkflowDialog } from "../components/agents/AddWorkflowDialog";
import { AgentBuilderConnectionSelector } from "../components/agents/AgentBuilderConnectionSelector";
import { AgentChat } from "../components/agents/AgentChat";
import { ThreadChat } from "../components/agents/ThreadChat";
import { ThreadList } from "../components/agents/ThreadList";
import { ToolsList } from "../components/agents/ToolsList";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Input } from "../components/common/Input";
import { Select } from "../components/common/Select";
import { Textarea } from "../components/common/Textarea";
import { logger } from "../lib/logger";
import { cn } from "../lib/utils";
import { useAgentStore } from "../stores/agentStore";
import { useConnectionStore } from "../stores/connectionStore";
import type { CreateAgentRequest, UpdateAgentRequest, AddToolRequest, Tool } from "../lib/api";

type AgentTab = "build" | "threads" | "slack" | "settings";

export function AgentBuilder() {
    const { agentId, threadId } = useParams<{ agentId: string; threadId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isNewAgent = agentId === "new";

    // Initialize tab from URL path
    const getTabFromPath = (): AgentTab => {
        const path = location.pathname;
        if (path.includes("/threads")) return "threads";
        if (path.includes("/settings")) return "settings";
        if (path.includes("/slack")) return "slack";
        if (path.includes("/build")) return "build";
        return "build"; // Default for /agents/:agentId
    };

    const [activeTab, setActiveTab] = useState<AgentTab>(getTabFromPath());
    const prevTabRef = useRef<AgentTab>(getTabFromPath());

    const {
        currentAgent,
        fetchAgent,
        createAgent,
        updateAgent,
        resetAgentState,
        addTool,
        removeTool,
        threads,
        currentThread,
        fetchThreads,
        setCurrentThread,
        createNewThread,
        updateThreadTitle,
        archiveThread,
        deleteThread
    } = useAgentStore();
    const { connections, fetchConnections } = useConnectionStore();

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [provider, setProvider] = useState<
        "openai" | "anthropic" | "google" | "cohere" | "huggingface"
    >("openai");
    const [model, setModel] = useState("");
    const [connectionId, setConnectionId] = useState<string>("");
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4096);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Inline editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Flag to prevent navigation during thread creation
    const isCreatingThreadRef = useRef(false);

    // Tools state
    const [tools, setTools] = useState<Tool[]>([]);
    const [removingToolId, setRemovingToolId] = useState<string | null>(null);
    const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
    const [isMCPDialogOpen, setIsMCPDialogOpen] = useState(false);
    const [isCustomMCPDialogOpen, setIsCustomMCPDialogOpen] = useState(false);

    // Thread management state
    const [threadToDelete, setThreadToDelete] = useState<{
        id: string;
        title: string;
    } | null>(null);

    // Load agent if editing - reset state first when switching agents
    useEffect(() => {
        // Reset all agent-specific state when agentId changes
        resetAgentState();

        if (!isNewAgent && agentId) {
            fetchAgent(agentId);
        }
        fetchConnections();

        return () => {
            // Also reset on unmount to ensure clean state
            resetAgentState();
        };
    }, [agentId, isNewAgent, fetchAgent, fetchConnections, resetAgentState]);

    // Populate form when agent loads
    useEffect(() => {
        if (currentAgent) {
            setName(currentAgent.name);
            setDescription(currentAgent.description || "");
            setProvider(currentAgent.provider);
            setModel(currentAgent.model);
            setConnectionId(currentAgent.connection_id || "");
            setSystemPrompt(currentAgent.system_prompt);
            setTemperature(currentAgent.temperature);
            setMaxTokens(currentAgent.max_tokens);
            // Parse tools from available_tools array
            setTools(currentAgent.available_tools || []);
        }
    }, [currentAgent]);

    // Load threads when agent loads and auto-select most recent for build tab
    useEffect(() => {
        if (currentAgent && !isNewAgent) {
            fetchThreads(currentAgent.id).then(() => {
                // Auto-select most recent thread if none is currently selected
                const store = useAgentStore.getState();
                if (!store.currentThread && store.threads.length > 0) {
                    // Threads are ordered by created_at DESC, so first is most recent
                    setCurrentThread(store.threads[0]);
                }
            });
        }
    }, [currentAgent, isNewAgent, fetchThreads, setCurrentThread]);

    // Auto-select most recent thread when switching to build tab
    useEffect(() => {
        const prevTab = prevTabRef.current;
        prevTabRef.current = activeTab;

        // When switching TO build tab from another tab, always select most recent thread
        if (activeTab === "build" && prevTab !== "build") {
            // Get latest threads from store to avoid having threads as dependency
            const store = useAgentStore.getState();
            if (store.threads.length > 0) {
                // Threads are ordered by created_at DESC, so first is most recent
                setCurrentThread(store.threads[0]);
            }
        }
    }, [activeTab, setCurrentThread]);

    // Update URL when tab changes
    useEffect(() => {
        const currentTabFromPath = getTabFromPath();
        if (currentTabFromPath !== activeTab) {
            // Navigate to the appropriate path for the tab
            const basePath = `/agents/${agentId}`;
            const tabPaths: Record<AgentTab, string> = {
                build: `${basePath}/build`,
                threads: `${basePath}/threads`,
                slack: `${basePath}/slack`,
                settings: `${basePath}/settings`
            };
            navigate(tabPaths[activeTab], { replace: true });
        }
    }, [activeTab, agentId, navigate, location.pathname]);

    // Load thread from URL params when threadId is present
    // Note: currentThread intentionally excluded from deps to prevent circular updates
    useEffect(() => {
        if (threadId && threads.length > 0) {
            const thread = threads.find((t) => t.id === threadId);
            if (thread && thread.id !== currentThread?.id) {
                setCurrentThread(thread);
            }
        }
    }, [threadId, threads, setCurrentThread]);

    // Update URL when current thread changes (on threads tab)
    // Use a ref to track the last navigation to prevent duplicate calls
    const lastNavigatedThreadIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Skip navigation during thread creation to prevent rapid navigation calls
        if (isCreatingThreadRef.current) {
            return;
        }

        if (activeTab === "threads") {
            const targetThreadId = currentThread?.id || null;

            // Only navigate if the URL actually needs to change
            if (
                targetThreadId !== threadId &&
                targetThreadId !== lastNavigatedThreadIdRef.current
            ) {
                lastNavigatedThreadIdRef.current = targetThreadId;

                if (targetThreadId) {
                    navigate(`/agents/${agentId}/threads/${targetThreadId}`, { replace: true });
                } else {
                    // Thread was deselected, navigate back to threads list
                    navigate(`/agents/${agentId}/threads`, { replace: true });
                }
            }
        }
    }, [currentThread, activeTab, agentId, threadId, navigate]);

    // Set default model when provider changes
    useEffect(() => {
        if (!model || !isNewAgent) {
            const defaultModel = getDefaultModelForProvider(provider);
            setModel(defaultModel);
        }
    }, [provider, isNewAgent]);

    // Filter connections by LLM providers
    const llmConnections = connections.filter(
        (conn) =>
            ["openai", "anthropic", "google", "cohere", "huggingface"].includes(
                conn.provider.toLowerCase()
            ) &&
            (conn.connection_method === "api_key" || conn.connection_method === "oauth2")
    );

    // Auto-select OpenAI connection when no connection is configured
    // This applies to both new agents and existing agents without a connection
    useEffect(() => {
        if (llmConnections.length > 0 && !connectionId) {
            // Prefer OpenAI connection if available
            const openAIConn = llmConnections.find(
                (conn) => conn.provider.toLowerCase() === "openai"
            );
            const defaultConn = openAIConn || llmConnections[0];
            setConnectionId(defaultConn.id);
            setProvider(
                defaultConn.provider as "openai" | "anthropic" | "google" | "cohere" | "huggingface"
            );
            const defaultModel = getDefaultModelForProvider(defaultConn.provider);
            setModel(defaultModel);
        }
    }, [llmConnections.length, connectionId]);

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Agent name is required");
            return;
        }

        if (!model) {
            setError("Model selection is required");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const agentData: CreateAgentRequest | UpdateAgentRequest = {
                name: name.trim(),
                description: description.trim() || undefined,
                model,
                provider,
                connection_id: connectionId || null,
                system_prompt: systemPrompt,
                temperature,
                max_tokens: maxTokens
            };

            if (isNewAgent) {
                const newAgent = await createAgent(agentData as CreateAgentRequest);
                navigate(`/agents/${newAgent.id}`);
            } else if (agentId) {
                await updateAgent(agentId, agentData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save agent");
        } finally {
            setIsSaving(false);
        }
    };

    // Inline name editing handlers
    const handleStartEditingName = () => {
        if (isNewAgent) return;
        setEditedName(name);
        setIsEditingName(true);
    };

    const handleSaveNameEdit = async () => {
        const trimmedName = editedName.trim();
        if (!trimmedName) {
            setEditedName(name);
            setIsEditingName(false);
            return;
        }

        if (trimmedName === name) {
            setIsEditingName(false);
            return;
        }

        setName(trimmedName);
        setIsEditingName(false);

        // Auto-save the name change
        if (!isNewAgent && agentId) {
            try {
                await updateAgent(agentId, { name: trimmedName });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update agent name");
                // Revert the name on error
                setName(name);
            }
        }
    };

    const handleCancelNameEdit = () => {
        setEditedName(name);
        setIsEditingName(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSaveNameEdit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            handleCancelNameEdit();
        }
    };

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    // Tool management handlers
    const handleRemoveTool = async (toolId: string) => {
        if (!currentAgent) return;

        setRemovingToolId(toolId);
        try {
            await removeTool(currentAgent.id, toolId);
            // Update local state from the store's updated agent
            const updatedAgent = useAgentStore.getState().currentAgent;
            if (updatedAgent) {
                setTools(updatedAgent.available_tools || []);
            }
        } catch (error) {
            logger.error("Failed to remove tool", error);
            setError(error instanceof Error ? error.message : "Failed to remove tool");
        } finally {
            setRemovingToolId(null);
        }
    };

    const handleAddWorkflows = async (
        workflows: Array<{ id: string; name: string; description?: string }>
    ) => {
        if (!currentAgent) return;

        try {
            // Add each workflow as a tool
            for (const workflow of workflows) {
                await addTool(currentAgent.id, {
                    type: "workflow",
                    name: workflow.name,
                    description: workflow.description || `Workflow: ${workflow.name}`,
                    schema: {}, // Empty schema for now
                    config: {
                        workflowId: workflow.id
                    }
                });
            }

            // Update local state from the store's updated agent
            const updatedAgent = useAgentStore.getState().currentAgent;
            if (updatedAgent) {
                setTools(updatedAgent.available_tools || []);
            }
        } catch (error) {
            logger.error("Failed to add workflows", error);
            setError(error instanceof Error ? error.message : "Failed to add workflows");
        }
    };

    const handleAddCustomMCP = async (server: { name: string; url: string; apiKey?: string }) => {
        if (!currentAgent) return;

        try {
            // Note: Using "function" type for custom MCP servers
            // This will need to be updated when we have proper MCP integration
            await addTool(currentAgent.id, {
                type: "function",
                name: server.name,
                description: `Custom MCP Server: ${server.name}`,
                schema: {
                    type: "mcp_server",
                    url: server.url
                },
                config: {
                    functionName: server.name
                }
            });

            // Update local state from the store's updated agent
            const updatedAgent = useAgentStore.getState().currentAgent;
            if (updatedAgent) {
                setTools(updatedAgent.available_tools || []);
            }
        } catch (error) {
            logger.error("Failed to add custom MCP", error);
            setError(error instanceof Error ? error.message : "Failed to add custom MCP");
        }
    };

    const handleAddMCPTools = async (toolsToAdd: AddToolRequest[]) => {
        if (!currentAgent) return;

        const results = {
            added: [] as string[],
            skipped: [] as string[],
            failed: [] as string[]
        };

        // Try to add each MCP tool individually
        for (const tool of toolsToAdd) {
            try {
                await addTool(currentAgent.id, tool);
                results.added.push(tool.name);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                // If tool already exists, skip it silently
                if (errorMessage.includes("already exists")) {
                    results.skipped.push(tool.name);
                    logger.debug("Skipped tool (already exists)", { toolName: tool.name });
                } else {
                    // Other errors are actual failures
                    results.failed.push(tool.name);
                    logger.error("Failed to add tool", error, { toolName: tool.name });
                }
            }
        }

        // Update local state from the store's updated agent
        const updatedAgent = useAgentStore.getState().currentAgent;
        if (updatedAgent) {
            setTools(updatedAgent.available_tools || []);
        }

        // Show appropriate message based on results
        if (results.added.length > 0) {
            logger.info("Successfully added tools", { count: results.added.length });
            if (results.skipped.length > 0) {
                logger.debug("Skipped tools (already exist)", { count: results.skipped.length });
            }
        } else if (results.skipped.length > 0) {
            // All tools were skipped
            logger.debug("All selected tools already exist");
        }

        // Only throw error if some tools actually failed (not just duplicates)
        if (results.failed.length > 0) {
            const errorMsg = `Failed to add ${results.failed.length} tool(s): ${results.failed.join(", ")}`;
            setError(errorMsg);
            throw new Error(errorMsg);
        }
    };

    // Thread management handlers
    const handleSelectThread = (thread: typeof currentThread) => {
        setCurrentThread(thread);
        // Note: URL update is handled by the useEffect that watches currentThread
        // to avoid duplicate navigation calls
    };

    const handleNewThread = async () => {
        if (!currentAgent) return;

        try {
            // Set flag to prevent navigation during thread creation
            isCreatingThreadRef.current = true;

            // Save the current thread so we can restore it after creation
            const previousThread = currentThread;

            await createNewThread(currentAgent.id);

            // Restore the previous thread so user stays on current thread
            // The new thread will appear in the list and user can manually switch to it
            if (previousThread) {
                setCurrentThread(previousThread);
            }

            // Clear flag after a brief delay to ensure all state updates complete
            setTimeout(() => {
                isCreatingThreadRef.current = false;
            }, 100);
        } catch (error) {
            logger.error("Failed to create new thread", error);
            setError(error instanceof Error ? error.message : "Failed to create new thread");
            isCreatingThreadRef.current = false;
        }
    };

    const handleArchiveThread = async (threadId: string) => {
        try {
            await archiveThread(threadId);
        } catch (error) {
            logger.error("Failed to archive thread", error);
            setError(error instanceof Error ? error.message : "Failed to archive thread");
        }
    };

    const handleDeleteThread = async () => {
        if (!threadToDelete) return;

        try {
            await deleteThread(threadToDelete.id);
            setThreadToDelete(null);
        } catch (error) {
            logger.error("Failed to delete thread", error);
            setError(error instanceof Error ? error.message : "Failed to delete thread");
        }
    };

    const tabs = [
        { id: "build" as AgentTab, label: "Build", icon: Wrench },
        { id: "threads" as AgentTab, label: "Threads", icon: MessageSquare },
        { id: "slack" as AgentTab, label: "Connect to Slack", icon: Slack, comingSoon: true },
        { id: "settings" as AgentTab, label: "Settings", icon: Settings }
    ];

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Header */}
            <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/agents")}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        {isEditingName ? (
                            <input
                                ref={nameInputRef}
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleSaveNameEdit}
                                onKeyDown={handleNameKeyDown}
                                className={cn(
                                    "text-lg font-semibold text-foreground",
                                    "bg-background border border-primary rounded px-2 py-1",
                                    "focus:outline-none focus:ring-2 focus:ring-primary"
                                )}
                            />
                        ) : (
                            <button
                                onClick={handleStartEditingName}
                                disabled={isNewAgent}
                                className={cn(
                                    "flex items-center gap-2 group",
                                    !isNewAgent &&
                                        "hover:bg-muted rounded px-2 py-1 transition-colors"
                                )}
                            >
                                <h1 className="text-lg font-semibold text-foreground">
                                    {isNewAgent ? "New Agent" : currentAgent?.name || "Loading..."}
                                </h1>
                                {!isNewAgent && (
                                    <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                        "bg-primary text-primary-foreground",
                        "hover:bg-primary/90 transition-colors",
                        "text-sm font-medium disabled:opacity-50"
                    )}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save
                        </>
                    )}
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex-shrink-0">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar navigation */}
                <div className="w-64 border-r border-border bg-card flex-shrink-0">
                    <nav className="p-4 space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
                                    disabled={tab.comingSoon}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        tab.comingSoon && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="flex-1 text-left">{tab.label}</span>
                                    {tab.comingSoon && (
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                            Soon
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Main content panel */}
                <div className="flex-1 flex overflow-hidden">
                    {activeTab === "build" && (
                        <>
                            {/* Left panel: Configuration (scrollable) */}
                            <div className="w-[500px] border-r border-border bg-card overflow-auto flex-shrink-0">
                                <div className="p-6 space-y-6">
                                    {/* AI Model Selection */}
                                    <AgentBuilderConnectionSelector
                                        connections={llmConnections}
                                        selectedConnectionId={connectionId}
                                        selectedModel={model}
                                        onConnectionChange={async (
                                            connId,
                                            connProvider,
                                            connModel
                                        ) => {
                                            setConnectionId(connId);
                                            setProvider(
                                                connProvider as
                                                    | "openai"
                                                    | "anthropic"
                                                    | "google"
                                                    | "cohere"
                                                    | "huggingface"
                                            );
                                            setModel(connModel);

                                            // Auto-save to agent if not a new agent
                                            if (!isNewAgent && agentId) {
                                                try {
                                                    await updateAgent(agentId, {
                                                        connection_id: connId,
                                                        provider: connProvider as
                                                            | "openai"
                                                            | "anthropic"
                                                            | "google"
                                                            | "cohere"
                                                            | "huggingface",
                                                        model: connModel
                                                    });
                                                } catch (err) {
                                                    logger.error(
                                                        "Failed to update agent model",
                                                        err
                                                    );
                                                }
                                            }
                                        }}
                                    />

                                    {/* Instructions */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Instructions
                                        </label>
                                        <Textarea
                                            value={systemPrompt}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                setSystemPrompt(e.target.value)
                                            }
                                            placeholder="Add instructions for the agent..."
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg",
                                                "bg-background border border-border",
                                                "text-foreground placeholder:text-muted-foreground",
                                                "focus:outline-none focus:ring-2 focus:ring-primary",
                                                "font-mono text-sm resize-y"
                                            )}
                                            style={{ minHeight: "300px" }}
                                        />
                                    </div>

                                    {/* Tools Section */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Tools
                                        </label>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Select the integrations and flows the agent can access
                                        </p>

                                        {/* Connected Tools List */}
                                        <ToolsList
                                            tools={tools}
                                            onRemove={handleRemoveTool}
                                            isRemoving={removingToolId}
                                        />

                                        {/* Add Tool Buttons */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setIsMCPDialogOpen(true)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border border-dashed border-border",
                                                    "text-sm text-muted-foreground text-left",
                                                    "hover:border-primary/50 hover:bg-muted transition-colors"
                                                )}
                                            >
                                                + Add an MCP integration
                                            </button>
                                            <button
                                                onClick={() => setIsWorkflowDialogOpen(true)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border border-dashed border-border",
                                                    "text-sm text-muted-foreground text-left",
                                                    "hover:border-primary/50 hover:bg-muted transition-colors"
                                                )}
                                            >
                                                + Add a workflow
                                            </button>
                                            <button
                                                onClick={() => setIsCustomMCPDialogOpen(true)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border border-dashed border-border",
                                                    "text-sm text-muted-foreground text-left",
                                                    "hover:border-primary/50 hover:bg-muted transition-colors"
                                                )}
                                            >
                                                + Connect your own MCP server
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right panel: Chat interface (fixed height, internal scroll) */}
                            <div className="flex-1 bg-background min-w-0">
                                {currentAgent && !isNewAgent ? (
                                    <AgentChat agent={currentAgent} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <p className="mb-2">Save your agent to start testing</p>
                                            <p className="text-sm">
                                                You'll be able to chat with your agent here
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === "threads" && (
                        <>
                            {/* Left panel: Thread List */}
                            <div className="w-80 flex-shrink-0 h-full">
                                <ThreadList
                                    threads={threads}
                                    currentThread={currentThread}
                                    onThreadSelect={handleSelectThread}
                                    onNewThread={handleNewThread}
                                    onUpdateTitle={updateThreadTitle}
                                    onArchiveThread={handleArchiveThread}
                                    onDeleteThread={async (threadId) => {
                                        const thread = threads.find((t) => t.id === threadId);
                                        setThreadToDelete({
                                            id: threadId,
                                            title: thread?.title || `Thread ${threadId.slice(0, 8)}`
                                        });
                                    }}
                                />
                            </div>

                            {/* Right panel: Thread Chat */}
                            <div className="flex-1 bg-background min-w-0">
                                {currentAgent && currentThread ? (
                                    <ThreadChat agent={currentAgent} thread={currentThread} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>
                                                {threads.length === 0
                                                    ? "Start a new thread"
                                                    : "Select a thread to continue"}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === "slack" && (
                        <div className="flex-1 flex items-center justify-center bg-card">
                            <div className="text-center text-muted-foreground">
                                <Slack className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Connect your agent to Slack</p>
                                <p className="text-xs mt-2">Coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="flex-1 bg-card overflow-auto">
                            <div className="max-w-3xl p-6 space-y-6">
                                {/* Agent Name */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Agent Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="My Assistant"
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg",
                                            "bg-background border border-border",
                                            "text-foreground placeholder:text-muted-foreground",
                                            "focus:outline-none focus:ring-2 focus:ring-primary"
                                        )}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Description (optional)
                                    </label>
                                    <Textarea
                                        value={description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                            setDescription(e.target.value)
                                        }
                                        placeholder="What does this agent do?"
                                        rows={2}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg",
                                            "bg-background border border-border",
                                            "text-foreground placeholder:text-muted-foreground",
                                            "focus:outline-none focus:ring-2 focus:ring-primary",
                                            "resize-y"
                                        )}
                                    />
                                </div>

                                {/* Connection (optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        API Connection (optional)
                                    </label>
                                    <Select
                                        value={connectionId}
                                        onChange={setConnectionId}
                                        placeholder="Use environment variables"
                                        options={llmConnections.map((conn) => ({
                                            value: conn.id,
                                            label: conn.name
                                        }))}
                                    />
                                </div>

                                {/* Advanced Settings */}
                                <div>
                                    <h3 className="text-base font-semibold text-foreground mb-4">
                                        Advanced Settings
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Temperature */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted-foreground">
                                                    Temperature
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {temperature}
                                                </span>
                                            </div>
                                            <Input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={temperature}
                                                onChange={(e) =>
                                                    setTemperature(parseFloat(e.target.value))
                                                }
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Max Tokens */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted-foreground">
                                                    Max Tokens
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {maxTokens}
                                                </span>
                                            </div>
                                            <Input
                                                type="number"
                                                min="100"
                                                max="100000"
                                                step="100"
                                                value={maxTokens}
                                                onChange={(e) =>
                                                    setMaxTokens(parseInt(e.target.value))
                                                }
                                                className={cn(
                                                    "w-full px-3 py-2 rounded-lg",
                                                    "bg-background border border-border",
                                                    "text-foreground",
                                                    "focus:outline-none focus:ring-2 focus:ring-primary"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tool Dialogs */}
            <AddWorkflowDialog
                isOpen={isWorkflowDialogOpen}
                onClose={() => setIsWorkflowDialogOpen(false)}
                onAdd={handleAddWorkflows}
                existingToolIds={tools.filter((t) => t.type === "workflow").map((t) => t.id)}
            />

            <AddMCPIntegrationDialog
                isOpen={isMCPDialogOpen}
                onClose={() => setIsMCPDialogOpen(false)}
                onAddTools={handleAddMCPTools}
                existingToolNames={tools.map((t) => t.name)}
            />

            <AddCustomMCPDialog
                isOpen={isCustomMCPDialogOpen}
                onClose={() => setIsCustomMCPDialogOpen(false)}
                onAdd={handleAddCustomMCP}
            />

            {/* Delete Thread Confirmation Dialog */}
            <ConfirmDialog
                isOpen={threadToDelete !== null}
                onClose={() => setThreadToDelete(null)}
                onConfirm={handleDeleteThread}
                title="Delete Thread"
                message={`Are you sure you want to delete "${threadToDelete?.title}"? This will permanently delete the thread and all its messages.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
