import { ArrowLeft, Save, Loader2, Settings, MessageSquare, Slack, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getModelsForProvider, getDefaultModelForProvider } from "@flowmaestro/shared";
import { AddCustomMCPDialog } from "../components/agents/AddCustomMCPDialog";
import { AddMCPIntegrationDialog } from "../components/agents/AddMCPIntegrationDialog";
import { AddWorkflowDialog } from "../components/agents/AddWorkflowDialog";
import { AgentChat } from "../components/agents/AgentChat";
import { ThreadChat } from "../components/agents/ThreadChat";
import { ThreadList } from "../components/agents/ThreadList";
import { ToolsList } from "../components/agents/ToolsList";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Input } from "../components/common/Input";
import { Select } from "../components/common/Select";
import { Textarea } from "../components/common/Textarea";
import { cn } from "../lib/utils";
import { useAgentStore } from "../stores/agentStore";
import { useConnectionStore } from "../stores/connectionStore";
import type { CreateAgentRequest, UpdateAgentRequest, AddToolRequest, Tool } from "../lib/api";

type AgentTab = "build" | "conversations" | "slack" | "settings";

export function AgentBuilder() {
    const { agentId } = useParams<{ agentId: string }>();
    const navigate = useNavigate();
    const isNewAgent = agentId === "new";
    const [activeTab, setActiveTab] = useState<AgentTab>("build");

    const {
        currentAgent,
        fetchAgent,
        createAgent,
        updateAgent,
        setCurrentAgent,
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
    const [provider, setProvider] = useState<"openai" | "anthropic" | "google" | "cohere">(
        "openai"
    );
    const [model, setModel] = useState("");
    const [connectionId, setConnectionId] = useState<string>("");
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4096);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Load agent if editing
    useEffect(() => {
        if (!isNewAgent && agentId) {
            fetchAgent(agentId);
        }
        fetchConnections();

        return () => {
            setCurrentAgent(null);
        };
    }, [agentId, isNewAgent, fetchAgent, fetchConnections, setCurrentAgent]);

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

    // Load threads when agent loads or when switching to conversations tab
    useEffect(() => {
        if (currentAgent && activeTab === "conversations") {
            fetchThreads(currentAgent.id);
        }
    }, [currentAgent, activeTab, fetchThreads]);

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
            ["openai", "anthropic", "google", "cohere"].includes(conn.provider.toLowerCase()) &&
            (conn.connection_method === "api_key" || conn.connection_method === "oauth2")
    );

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

    // Tool management handlers
    const handleRemoveTool = async (toolId: string) => {
        if (!currentAgent) return;

        setRemovingToolId(toolId);
        try {
            await removeTool(currentAgent.id, toolId);
            // Update local state from the updated agent (handled by store)
            if (currentAgent) {
                setTools(currentAgent.available_tools || []);
            }
        } catch (error) {
            console.error("Failed to remove tool:", error);
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

            // Update local state from the updated agent
            if (currentAgent) {
                setTools(currentAgent.available_tools || []);
            }
        } catch (error) {
            console.error("Failed to add workflows:", error);
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

            // Update local state from the updated agent
            if (currentAgent) {
                setTools(currentAgent.available_tools || []);
            }
        } catch (error) {
            console.error("Failed to add custom MCP:", error);
            setError(error instanceof Error ? error.message : "Failed to add custom MCP");
        }
    };

    const handleAddMCPTools = async (toolsToAdd: AddToolRequest[]) => {
        if (!currentAgent) return;

        try {
            // Add each MCP tool
            for (const tool of toolsToAdd) {
                await addTool(currentAgent.id, tool);
            }

            // Update local state from the updated agent
            if (currentAgent) {
                setTools(currentAgent.available_tools || []);
            }
        } catch (error) {
            console.error("Failed to add MCP tools:", error);
            setError(error instanceof Error ? error.message : "Failed to add MCP tools");
            throw error; // Re-throw so the dialog can handle it
        }
    };

    // Thread management handlers
    const handleNewThread = () => {
        createNewThread();
    };

    const handleArchiveThread = async (threadId: string) => {
        try {
            await archiveThread(threadId);
        } catch (error) {
            console.error("Failed to archive thread:", error);
            setError(error instanceof Error ? error.message : "Failed to archive thread");
        }
    };

    const handleDeleteThread = async () => {
        if (!threadToDelete) return;

        try {
            await deleteThread(threadToDelete.id);
            setThreadToDelete(null);
        } catch (error) {
            console.error("Failed to delete thread:", error);
            setError(error instanceof Error ? error.message : "Failed to delete thread");
        }
    };

    const tabs = [
        { id: "build" as AgentTab, label: "Build", icon: Wrench },
        { id: "conversations" as AgentTab, label: "Conversations", icon: MessageSquare },
        { id: "slack" as AgentTab, label: "Connect to Slack", icon: Slack, comingSoon: true },
        { id: "settings" as AgentTab, label: "Settings", icon: Settings }
    ];

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Header */}
            <div className="h-16 border-b border-border bg-white flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/agents")}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">
                            {isNewAgent ? "New Agent" : currentAgent?.name || "Loading..."}
                        </h1>
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
                <div className="w-64 border-r border-border bg-white flex-shrink-0">
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
                            <div className="w-[500px] border-r border-border bg-white overflow-auto flex-shrink-0">
                                <div className="p-6 space-y-6">
                                    {/* AI Model Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            AI Model Selection
                                        </label>
                                        <Select
                                            value={`${provider}:${model}`}
                                            onChange={(value) => {
                                                const [newProvider, newModel] = value.split(":");
                                                setProvider(
                                                    newProvider as
                                                        | "openai"
                                                        | "anthropic"
                                                        | "google"
                                                        | "cohere"
                                                );
                                                setModel(newModel);
                                            }}
                                            options={[
                                                ...getModelsForProvider("openai").map((m) => ({
                                                    value: `openai:${m.value}`,
                                                    label: `OpenAI - ${m.label}`
                                                })),
                                                ...getModelsForProvider("anthropic").map((m) => ({
                                                    value: `anthropic:${m.value}`,
                                                    label: `Anthropic - ${m.label}`
                                                })),
                                                ...getModelsForProvider("google").map((m) => ({
                                                    value: `google:${m.value}`,
                                                    label: `Google - ${m.label}`
                                                })),
                                                ...getModelsForProvider("cohere").map((m) => ({
                                                    value: `cohere:${m.value}`,
                                                    label: `Cohere - ${m.label}`
                                                }))
                                            ]}
                                        />
                                    </div>

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

                    {activeTab === "conversations" && (
                        <>
                            {/* Left panel: Thread List */}
                            <div className="w-80 flex-shrink-0 h-full">
                                <ThreadList
                                    threads={threads}
                                    currentThread={currentThread}
                                    onThreadSelect={setCurrentThread}
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
                                                    ? "Start a new conversation"
                                                    : "Select a conversation to continue"}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === "slack" && (
                        <div className="flex-1 flex items-center justify-center bg-white">
                            <div className="text-center text-muted-foreground">
                                <Slack className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Connect your agent to Slack</p>
                                <p className="text-xs mt-2">Coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="flex-1 bg-white overflow-auto">
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
                title="Delete Conversation"
                message={`Are you sure you want to delete "${threadToDelete?.title}"? This will permanently delete the conversation and all its messages.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
