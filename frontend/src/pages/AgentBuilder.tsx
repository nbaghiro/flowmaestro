import { ArrowLeft, Save, Loader2, MessageSquare, Slack, Pencil, FileText } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    getDefaultModelForProvider,
    getTemperatureMaxForProvider,
    LLM_PROVIDERS,
    ELEVENLABS_VOICES,
    DEFAULT_VOICE_CONFIG
} from "@flowmaestro/shared";
import type { AgentVoiceConfig, WorkflowSummary } from "@flowmaestro/shared";
import {
    AgentBuilderLayout,
    NavigationPanel,
    ConfigPanel,
    ChatPanel,
    ModelSection,
    InstructionsSection,
    ToolsSection,
    AddBuiltinToolDialog,
    AddKnowledgeBaseDialog,
    AddMCPIntegrationDialog,
    AddWorkflowDialog,
    AgentChat,
    ThreadChat,
    ThreadList
} from "../components/agent";
import { CreateChatInterfaceDialog } from "../components/chat/builder/CreateChatInterfaceDialog";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Dialog } from "../components/common/Dialog";
import { Input } from "../components/common/Input";
import { MobileBuilderGuard } from "../components/common/MobileBuilderGuard";
import { Select } from "../components/common/Select";
import { Textarea } from "../components/common/Textarea";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { Tooltip } from "../components/common/Tooltip";
import { CreateFormInterfaceDialog } from "../components/forms/CreateFormInterfaceDialog";
import { AgentEvents } from "../lib/analytics";
import { logger } from "../lib/logger";
import { cn } from "../lib/utils";
import { useAgentStore } from "../stores/agentStore";
import { useConnectionStore } from "../stores/connectionStore";
import type { AgentTab } from "../components/agent";
import type {
    UpdateAgentRequest,
    AddToolRequest,
    Tool,
    KnowledgeBase,
    Agent,
    JsonObject,
    MemoryConfig
} from "../lib/api";

export function AgentBuilder() {
    const { agentId, threadId } = useParams<{ agentId: string; threadId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const fromFolderId = (location.state as { fromFolderId?: string } | null)?.fromFolderId;

    // Determine where to navigate back to
    const getBackUrl = useCallback(() => {
        if (fromFolderId) {
            return `/folders/${fromFolderId}`;
        }
        return "/agents";
    }, [fromFolderId]);

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
        updateAgent,
        resetAgentState,
        addTool,
        addToolsBatch,
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
    const [provider, setProvider] = useState<Agent["provider"]>("openai");
    const [model, setModel] = useState("");
    const [connectionId, setConnectionId] = useState<string>("");
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4096);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [isFormInterfaceDialogOpen, setIsFormInterfaceDialogOpen] = useState(false);
    const [isChatInterfaceDialogOpen, setIsChatInterfaceDialogOpen] = useState(false);

    // Voice settings state
    const [voiceConfig, setVoiceConfig] = useState<AgentVoiceConfig>(DEFAULT_VOICE_CONFIG);

    // Memory settings state (simplified architecture - all features enabled by default)
    const [memoryConfig, setMemoryConfig] = useState<MemoryConfig>({
        max_messages: 30,
        embeddings_enabled: true,
        working_memory_enabled: true
    });

    const temperatureMax = useMemo(() => getTemperatureMaxForProvider(provider), [provider]);

    // Track original values to detect changes
    const [originalValues, setOriginalValues] = useState<{
        name: string;
        description: string;
        provider: string;
        model: string;
        connectionId: string;
        systemPrompt: string;
        temperature: number;
        maxTokens: number;
        memoryConfig: MemoryConfig;
    } | null>(null);

    // Inline editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Flag to prevent navigation during thread creation
    const isCreatingThreadRef = useRef(false);

    // Track builder session for analytics
    const builderSessionStartRef = useRef<number | null>(null);
    const hasTrackedBuilderOpened = useRef(false);

    // Tools state
    const [tools, setTools] = useState<Tool[]>([]);
    const [removingToolId, setRemovingToolId] = useState<string | null>(null);
    const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
    const [isMCPDialogOpen, setIsMCPDialogOpen] = useState(false);
    const [isKnowledgeBaseDialogOpen, setIsKnowledgeBaseDialogOpen] = useState(false);
    const [isBuiltinToolDialogOpen, setIsBuiltinToolDialogOpen] = useState(false);

    // Thread management state
    const [threadToDelete, setThreadToDelete] = useState<{
        id: string;
        title: string;
    } | null>(null);

    // Redirect if agentId is "new" - agents should be created before reaching AgentBuilder
    useEffect(() => {
        if (agentId === "new") {
            navigate("/agents", { replace: true });
            return;
        }
    }, [agentId, navigate]);

    // Load agent and populate form when agentId changes (not on currentAgent changes)
    // This prevents resetting form fields when currentAgent updates due to tool additions
    useEffect(() => {
        // Reset all agent-specific state when agentId changes
        resetAgentState();

        if (agentId && agentId !== "new") {
            // Track builder opened
            if (!hasTrackedBuilderOpened.current) {
                builderSessionStartRef.current = Date.now();
                AgentEvents.builderOpened({ agentId });
                hasTrackedBuilderOpened.current = true;
            }

            fetchAgent(agentId).then(() => {
                // After fetching, populate form from the agent
                const agent = useAgentStore.getState().currentAgent;
                if (agent && agent.id === agentId) {
                    setName(agent.name);
                    setDescription(agent.description || "");
                    setProvider(agent.provider);
                    setModel(agent.model);
                    setConnectionId(agent.connection_id || "");
                    setSystemPrompt(agent.system_prompt);
                    setTemperature(agent.temperature);
                    setMaxTokens(agent.max_tokens);
                    // Parse tools from available_tools array
                    setTools(agent.available_tools || []);

                    // Load voice config from metadata
                    const agentVoiceConfig = (agent as { metadata?: { voice?: AgentVoiceConfig } })
                        .metadata?.voice;
                    if (agentVoiceConfig) {
                        setVoiceConfig({ ...DEFAULT_VOICE_CONFIG, ...agentVoiceConfig });
                    } else {
                        setVoiceConfig(DEFAULT_VOICE_CONFIG);
                    }

                    // Load memory config from agent (with backward compatibility)
                    if (agent.memory_config) {
                        setMemoryConfig({
                            max_messages: agent.memory_config.max_messages || 30,
                            embeddings_enabled: agent.memory_config.embeddings_enabled !== false,
                            working_memory_enabled:
                                agent.memory_config.working_memory_enabled !== false
                        });
                    } else {
                        setMemoryConfig({
                            max_messages: 30,
                            embeddings_enabled: true,
                            working_memory_enabled: true
                        });
                    }

                    // Store original values for change detection
                    setOriginalValues({
                        name: agent.name,
                        description: agent.description || "",
                        provider: agent.provider,
                        model: agent.model,
                        connectionId: agent.connection_id || "",
                        systemPrompt: agent.system_prompt,
                        temperature: agent.temperature,
                        maxTokens: agent.max_tokens,
                        memoryConfig: agent.memory_config || {
                            max_messages: 30,
                            embeddings_enabled: true,
                            working_memory_enabled: true
                        }
                    });
                }
            });
        }
        fetchConnections();

        return () => {
            // Track builder closed
            if (agentId && hasTrackedBuilderOpened.current) {
                AgentEvents.builderClosed({ agentId });
            }
            // Also reset on unmount to ensure clean state
            resetAgentState();
        };
    }, [agentId, fetchAgent, fetchConnections, resetAgentState]);

    // Load threads when agent loads and restore or auto-select thread
    useEffect(() => {
        if (currentAgent) {
            fetchThreads(currentAgent.id).then(() => {
                const store = useAgentStore.getState();

                // Try to restore thread selection from localStorage
                const storageKey = `flowmaestro:selectedThread:${currentAgent.id}`;
                const savedThreadId = localStorage.getItem(storageKey);

                if (savedThreadId && store.threads.length > 0) {
                    // Try to restore the saved thread if it exists
                    const savedThread = store.threads.find((t) => t.id === savedThreadId);
                    if (savedThread) {
                        setCurrentThread(savedThread);
                        return;
                    }
                }

                // If no saved thread or saved thread not found, auto-select most recent
                if (!store.currentThread && store.threads.length > 0) {
                    // Threads are ordered by created_at DESC, so first is most recent
                    // Note: Persistence to localStorage is handled by the useEffect that watches currentThread
                    setCurrentThread(store.threads[0]);
                }
            });
        }
    }, [currentAgent, fetchThreads, setCurrentThread]);

    // Auto-select most recent thread when switching to build tab (only if no thread is selected)
    useEffect(() => {
        const prevTab = prevTabRef.current;
        prevTabRef.current = activeTab;

        // When switching TO build tab from another tab, restore saved thread or select most recent
        if (activeTab === "build" && prevTab !== "build") {
            const store = useAgentStore.getState();

            // If a thread is already selected, keep it
            if (store.currentThread) {
                return;
            }

            // Try to restore from localStorage
            if (currentAgent && store.threads.length > 0) {
                const storageKey = `flowmaestro:selectedThread:${currentAgent.id}`;
                const savedThreadId = localStorage.getItem(storageKey);

                if (savedThreadId) {
                    const savedThread = store.threads.find((t) => t.id === savedThreadId);
                    if (savedThread) {
                        setCurrentThread(savedThread);
                        return;
                    }
                }

                // Fallback to most recent thread
                // Threads are ordered by created_at DESC, so first is most recent
                // Note: Persistence to localStorage is handled by the useEffect that watches currentThread
                setCurrentThread(store.threads[0]);
            }
        }
    }, [activeTab, setCurrentThread, currentAgent]);

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

    // Persist thread selection to localStorage whenever it changes
    useEffect(() => {
        if (currentThread && currentAgent) {
            const storageKey = `flowmaestro:selectedThread:${currentAgent.id}`;
            localStorage.setItem(storageKey, currentThread.id);
        }
    }, [currentThread, currentAgent]);

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
        if (!model) {
            const defaultModel = getDefaultModelForProvider(provider);
            setModel(defaultModel);
        }
    }, [provider]);

    // Clamp temperature when provider changes (if it exceeds the new max)
    // Note: intentionally only depends on provider, not temperature, to avoid re-clamping on every temp change
    useEffect(() => {
        // Use functional update to get current temperature value
        setTemperature((currentTemp) =>
            currentTemp > temperatureMax ? temperatureMax : currentTemp
        );
    }, [provider, temperatureMax]);

    // Filter connections by LLM providers
    const validLLMProviderValues = LLM_PROVIDERS.map((p) => p.value.toLowerCase());
    const llmConnections = connections.filter(
        (conn) =>
            validLLMProviderValues.includes(conn.provider.toLowerCase()) &&
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
            setProvider(defaultConn.provider.toLowerCase() as Agent["provider"]);
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
            // Merge voice config into existing metadata
            const existingMetadata =
                (currentAgent as { metadata?: Record<string, unknown> })?.metadata || {};
            const agentData: UpdateAgentRequest = {
                name: name.trim(),
                description: description.trim() || undefined,
                model,
                provider,
                connection_id: connectionId || null,
                system_prompt: systemPrompt,
                temperature,
                max_tokens: maxTokens,
                memory_config: memoryConfig,
                metadata: {
                    ...existingMetadata,
                    voice: voiceConfig as unknown as JsonObject
                }
            };

            // Agent should always exist at this point (created before reaching AgentBuilder)
            if (!agentId) {
                setError("Agent ID is required");
                setIsSaving(false);
                return;
            }

            const savedAgent = await updateAgent(agentId, agentData);

            // Update originalValues to match what was just saved
            // This ensures hasUnsavedChanges is false after save
            if (savedAgent) {
                setOriginalValues({
                    name: savedAgent.name,
                    description: savedAgent.description || "",
                    provider: savedAgent.provider,
                    model: savedAgent.model,
                    connectionId: savedAgent.connection_id || "",
                    systemPrompt: savedAgent.system_prompt,
                    temperature: savedAgent.temperature,
                    maxTokens: savedAgent.max_tokens,
                    memoryConfig: savedAgent.memory_config || {
                        max_messages: 30,
                        embeddings_enabled: true,
                        working_memory_enabled: true
                    }
                });
            } else {
                // Fallback: update originalValues from form values if agent not available
                setOriginalValues({
                    name: name.trim(),
                    description: description.trim() || "",
                    provider,
                    model,
                    connectionId: connectionId || "",
                    systemPrompt,
                    temperature,
                    maxTokens,
                    memoryConfig
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save agent");
        } finally {
            setIsSaving(false);
        }
    };

    // Detect unsaved changes
    // Compare form fields against originalValues
    const hasUnsavedChanges =
        originalValues !== null &&
        currentAgent &&
        (name !== originalValues.name ||
            description !== originalValues.description ||
            provider !== originalValues.provider ||
            model !== originalValues.model ||
            connectionId !== originalValues.connectionId ||
            systemPrompt !== originalValues.systemPrompt ||
            temperature !== originalValues.temperature ||
            maxTokens !== originalValues.maxTokens ||
            memoryConfig.max_messages !== originalValues.memoryConfig.max_messages ||
            memoryConfig.embeddings_enabled !== originalValues.memoryConfig.embeddings_enabled ||
            memoryConfig.working_memory_enabled !==
                originalValues.memoryConfig.working_memory_enabled);

    // Warn user about unsaved changes when closing/refreshing browser
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleBack = useCallback(() => {
        if (hasUnsavedChanges) {
            setShowUnsavedDialog(true);
        } else {
            // Use browser back if no specific folder, otherwise go to folder
            if (fromFolderId) {
                navigate(`/folders/${fromFolderId}`);
            } else {
                navigate(-1);
            }
        }
    }, [hasUnsavedChanges, navigate, fromFolderId]);

    const handleDiscardChanges = useCallback(() => {
        setShowUnsavedDialog(false);
        resetAgentState();
        // Use browser back if no specific folder, otherwise go to folder
        if (fromFolderId) {
            navigate(`/folders/${fromFolderId}`);
        } else {
            navigate(-1);
        }
    }, [navigate, resetAgentState, fromFolderId]);

    const handleSaveAndLeave = useCallback(async () => {
        if (!name.trim() || !model) return;

        setIsSaving(true);

        try {
            // Merge voice config into existing metadata
            const existingMetadata =
                (currentAgent as { metadata?: Record<string, unknown> })?.metadata || {};
            const agentData: UpdateAgentRequest = {
                name: name.trim(),
                description: description.trim() || undefined,
                model,
                provider,
                connection_id: connectionId || null,
                system_prompt: systemPrompt,
                temperature,
                max_tokens: maxTokens,
                memory_config: memoryConfig,
                metadata: {
                    ...existingMetadata,
                    voice: voiceConfig as unknown as JsonObject
                }
            };

            // Agent should always exist at this point (created before reaching AgentBuilder)
            if (!agentId) {
                setError("Agent ID is required");
                setIsSaving(false);
                return;
            }

            const savedAgent = await updateAgent(agentId, agentData);

            // Update originalValues to match what was just saved
            if (savedAgent) {
                setOriginalValues({
                    name: savedAgent.name,
                    description: savedAgent.description || "",
                    provider: savedAgent.provider,
                    model: savedAgent.model,
                    connectionId: savedAgent.connection_id || "",
                    systemPrompt: savedAgent.system_prompt,
                    temperature: savedAgent.temperature,
                    maxTokens: savedAgent.max_tokens,
                    memoryConfig: savedAgent.memory_config || {
                        max_messages: 30,
                        embeddings_enabled: true,
                        working_memory_enabled: true
                    }
                });
            } else {
                // Fallback: update originalValues from form values
                setOriginalValues({
                    name: name.trim(),
                    description: description.trim() || "",
                    provider,
                    model,
                    connectionId: connectionId || "",
                    systemPrompt,
                    temperature,
                    maxTokens,
                    memoryConfig
                });
            }

            setShowUnsavedDialog(false);
            // Use browser back if no specific folder, otherwise go to folder
            if (fromFolderId) {
                navigate(`/folders/${fromFolderId}`);
            } else {
                navigate(-1);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save agent");
            setIsSaving(false);
        }
    }, [
        name,
        description,
        model,
        provider,
        connectionId,
        systemPrompt,
        temperature,
        maxTokens,
        memoryConfig,
        voiceConfig,
        agentId,
        currentAgent,
        updateAgent,
        navigate,
        fromFolderId
    ]);

    // Inline name editing handlers
    const handleStartEditingName = () => {
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
        if (agentId) {
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

    const handleAddWorkflows = async (workflows: WorkflowSummary[]) => {
        if (!currentAgent) return;

        try {
            // Add each workflow as a tool
            for (const workflow of workflows) {
                // Generate a valid tool name from the workflow name
                // Tool names must match pattern ^[a-zA-Z0-9_-]+$ for LLM function calling
                let toolName = workflow.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "_")
                    .replace(/^_+|_+$/g, "");

                if (!/^[a-z]/.test(toolName)) {
                    toolName = `workflow_${toolName}`;
                }

                await addTool(currentAgent.id, {
                    type: "workflow",
                    name: toolName,
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
            // Generate a valid tool name from the server name
            // Tool names must match pattern ^[a-zA-Z0-9_-]+$ for LLM function calling
            let toolName = server.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");

            if (!/^[a-z]/.test(toolName)) {
                toolName = `mcp_${toolName}`;
            }

            // Note: Using "function" type for custom MCP servers
            // This will need to be updated when we have proper MCP integration
            await addTool(currentAgent.id, {
                type: "function",
                name: toolName,
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

        try {
            // Use batch endpoint to add all tools atomically
            const response = await addToolsBatch(currentAgent.id, toolsToAdd);

            // Update local state from the store's updated agent
            const updatedAgent = useAgentStore.getState().currentAgent;
            if (updatedAgent) {
                setTools(updatedAgent.available_tools || []);
            }

            // Log results
            if (response.data.added.length > 0) {
                logger.info("Successfully added tools", { count: response.data.added.length });
            }
            if (response.data.skipped.length > 0) {
                logger.debug("Skipped tools", {
                    count: response.data.skipped.length,
                    tools: response.data.skipped
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to add tools";
            setError(errorMsg);
            throw error;
        }
    };

    const handleAddBuiltinTools = async (toolsToAdd: AddToolRequest[]) => {
        if (!currentAgent) return;

        try {
            // Use batch endpoint to add all tools atomically
            const response = await addToolsBatch(currentAgent.id, toolsToAdd);

            // Update local state from the store's updated agent
            const updatedAgent = useAgentStore.getState().currentAgent;
            if (updatedAgent) {
                setTools(updatedAgent.available_tools || []);
            }

            // Log results
            if (response.data.added.length > 0) {
                logger.info("Successfully added builtin tools", {
                    count: response.data.added.length
                });
            }
            if (response.data.skipped.length > 0) {
                logger.debug("Skipped builtin tools", {
                    count: response.data.skipped.length,
                    tools: response.data.skipped
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to add builtin tools";
            setError(errorMsg);
            throw error;
        }
    };

    const handleAddKnowledgeBases = async (knowledgeBases: KnowledgeBase[]) => {
        if (!currentAgent) return;

        try {
            for (const kb of knowledgeBases) {
                // Generate a valid tool name from the knowledge base name
                let toolName = kb.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "_")
                    .replace(/^_+|_+$/g, "");

                if (!/^[a-z]/.test(toolName)) {
                    toolName = `kb_${toolName}`;
                }

                await addTool(currentAgent.id, {
                    type: "knowledge_base",
                    name: `search_${toolName}`,
                    description: `Search the "${kb.name}" knowledge base for relevant information. ${kb.description || ""}`,
                    schema: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description:
                                    "The search query to find relevant information in the knowledge base"
                            },
                            topK: {
                                type: "number",
                                description: "Number of results to return (default: 10)"
                            },
                            minScore: {
                                type: "number",
                                description: "Minimum similarity score threshold 0-1 (default: 0.3)"
                            }
                        },
                        required: ["query"],
                        additionalProperties: false
                    },
                    config: {
                        knowledgeBaseId: kb.id
                    }
                });
            }

            // Update local state from the store's updated agent
            const updatedAgent = useAgentStore.getState().currentAgent;
            if (updatedAgent) {
                setTools(updatedAgent.available_tools || []);
            }
        } catch (error) {
            logger.error("Failed to add knowledge bases", error);
            setError(error instanceof Error ? error.message : "Failed to add knowledge bases");
        }
    };

    // Thread management handlers
    const handleSelectThread = (thread: typeof currentThread) => {
        setCurrentThread(thread);
        // Note: Persistence to localStorage is handled by the useEffect that watches currentThread
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

            // Clear localStorage if the archived thread was the selected one
            if (currentThread?.id === threadId && currentAgent) {
                const storageKey = `flowmaestro:selectedThread:${currentAgent.id}`;
                localStorage.removeItem(storageKey);
            }
        } catch (error) {
            logger.error("Failed to archive thread", error);
            setError(error instanceof Error ? error.message : "Failed to archive thread");
        }
    };

    const handleDeleteThread = async () => {
        if (!threadToDelete) return;

        try {
            await deleteThread(threadToDelete.id);

            // Clear localStorage if the deleted thread was the selected one
            if (currentThread?.id === threadToDelete.id && currentAgent) {
                const storageKey = `flowmaestro:selectedThread:${currentAgent.id}`;
                localStorage.removeItem(storageKey);
            }

            setThreadToDelete(null);
        } catch (error) {
            logger.error("Failed to delete thread", error);
            setError(error instanceof Error ? error.message : "Failed to delete thread");
        }
    };

    return (
        <MobileBuilderGuard
            title="Agent Builder"
            description="The agent builder requires a larger screen. Please continue on a desktop or laptop computer to configure your agents."
            backUrl={getBackUrl()}
        >
            <div className="h-screen flex flex-col bg-background">
                {/* Top Header */}
                <div className="h-16 border-b border-border bg-card flex items-center px-6 flex-shrink-0 relative">
                    {/* Left section */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
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
                                    className={cn(
                                        "flex items-center gap-2 group hover:bg-muted rounded px-2 py-1 transition-colors"
                                    )}
                                >
                                    <h1 className="text-lg font-semibold text-foreground">
                                        {currentAgent?.name || "Loading..."}
                                    </h1>
                                    <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-2 ml-auto">
                        <ThemeToggle />
                        {agentId && (
                            <>
                                <Tooltip content="Form Interface" position="bottom">
                                    <button
                                        onClick={() => setIsFormInterfaceDialogOpen(true)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg",
                                            "text-sm font-medium text-foreground",
                                            "border border-border hover:bg-muted transition-colors"
                                        )}
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Chat Interface" position="bottom">
                                    <button
                                        onClick={() => setIsChatInterfaceDialogOpen(true)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg",
                                            "text-sm font-medium text-foreground",
                                            "border border-border hover:bg-muted transition-colors"
                                        )}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </>
                        )}
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
                </div>

                {/* Main content area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Build tab uses the new flexible panel layout */}
                    {activeTab === "build" && (
                        <AgentBuilderLayout
                            navigationPanel={
                                <NavigationPanel activeTab={activeTab} onTabChange={setActiveTab} />
                            }
                            configPanel={
                                <ConfigPanel error={error} onDismissError={() => setError(null)}>
                                    <ModelSection
                                        connections={llmConnections}
                                        selectedConnectionId={connectionId}
                                        selectedModel={model}
                                        onConnectionChange={async (
                                            connId,
                                            connProvider,
                                            connModel
                                        ) => {
                                            const previousProvider = provider;
                                            const previousModel = model;

                                            setConnectionId(connId);
                                            const newProvider =
                                                connProvider.toLowerCase() as Agent["provider"];
                                            setProvider(newProvider);
                                            setModel(connModel);

                                            // Track model/provider changes
                                            if (agentId) {
                                                if (newProvider !== previousProvider) {
                                                    AgentEvents.providerChanged({
                                                        agentId,
                                                        newProvider,
                                                        previousProvider
                                                    });
                                                }
                                                if (connModel !== previousModel) {
                                                    AgentEvents.modelChanged({
                                                        agentId,
                                                        newModel: connModel,
                                                        previousModel
                                                    });
                                                }
                                            }

                                            // Clamp temperature if it exceeds the new provider's max
                                            const maxTemp =
                                                getTemperatureMaxForProvider(newProvider);
                                            if (temperature > maxTemp) {
                                                setTemperature(maxTemp);
                                            }

                                            // Auto-save connection change to agent
                                            if (agentId) {
                                                try {
                                                    await updateAgent(agentId, {
                                                        connection_id: connId,
                                                        provider: newProvider,
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
                                    <InstructionsSection
                                        value={systemPrompt}
                                        onChange={setSystemPrompt}
                                    />
                                    <ToolsSection
                                        tools={tools}
                                        onRemoveTool={handleRemoveTool}
                                        removingToolId={removingToolId}
                                        onAddWorkflow={() => setIsWorkflowDialogOpen(true)}
                                        onAddKnowledgeBase={() =>
                                            setIsKnowledgeBaseDialogOpen(true)
                                        }
                                        onAddMCP={() => setIsMCPDialogOpen(true)}
                                        onAddBuiltinTool={() => setIsBuiltinToolDialogOpen(true)}
                                    />
                                </ConfigPanel>
                            }
                            chatPanel={
                                <ChatPanel>
                                    {currentAgent ? (
                                        <AgentChat agent={currentAgent} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground">
                                            <div className="text-center">
                                                <p className="mb-2">
                                                    Save your agent to start testing
                                                </p>
                                                <p className="text-sm">
                                                    You'll be able to chat with your agent here
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </ChatPanel>
                            }
                        />
                    )}

                    {/* Other tabs use traditional fixed layout with navigation sidebar */}
                    {activeTab !== "build" && (
                        <>
                            {/* Left sidebar navigation for non-build tabs */}
                            <NavigationPanel activeTab={activeTab} onTabChange={setActiveTab} />

                            {/* Main content panel for non-build tabs */}
                            <div
                                className={cn(
                                    "flex-1 flex overflow-hidden",
                                    (activeTab === "settings" || activeTab === "slack") &&
                                        "border-l border-border"
                                )}
                            >
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
                                                    const thread = threads.find(
                                                        (t) => t.id === threadId
                                                    );
                                                    setThreadToDelete({
                                                        id: threadId,
                                                        title:
                                                            thread?.title ||
                                                            `Thread ${threadId.slice(0, 8)}`
                                                    });
                                                }}
                                            />
                                        </div>

                                        {/* Right panel: Thread Chat */}
                                        <div className="flex-1 bg-background min-w-0">
                                            {currentAgent && currentThread ? (
                                                <ThreadChat
                                                    agent={currentAgent}
                                                    thread={currentThread}
                                                />
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
                                        <div className="max-w-6xl mx-auto p-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Left Column */}
                                                <div className="space-y-6">
                                                    {/* Basic Settings Card */}
                                                    <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
                                                        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                                            <svg
                                                                className="w-4 h-4 text-muted-foreground"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            Basic Information
                                                        </h3>
                                                        <div className="space-y-4">
                                                            {/* Agent Name */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                                    Agent Name
                                                                </label>
                                                                <Input
                                                                    type="text"
                                                                    value={name}
                                                                    onChange={(e) =>
                                                                        setName(e.target.value)
                                                                    }
                                                                    placeholder="My Assistant"
                                                                    className={cn(
                                                                        "w-full px-3 py-2 rounded-lg",
                                                                        "bg-muted border border-border",
                                                                        "text-foreground placeholder:text-muted-foreground",
                                                                        "focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    )}
                                                                />
                                                            </div>

                                                            {/* Description */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                                    Description
                                                                </label>
                                                                <Textarea
                                                                    value={description}
                                                                    onChange={(
                                                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                                                    ) =>
                                                                        setDescription(
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="What does this agent do?"
                                                                    rows={2}
                                                                    className={cn(
                                                                        "w-full px-3 py-2 rounded-lg",
                                                                        "bg-muted border border-border",
                                                                        "text-foreground placeholder:text-muted-foreground",
                                                                        "focus:outline-none focus:ring-2 focus:ring-primary",
                                                                        "resize-y"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* API Connection Card */}
                                                    <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
                                                        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                                            <svg
                                                                className="w-4 h-4 text-muted-foreground"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                                                />
                                                            </svg>
                                                            API Connection
                                                        </h3>
                                                        <div>
                                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                                LLM Connection
                                                            </label>
                                                            <Select
                                                                value={connectionId}
                                                                onChange={(connId) => {
                                                                    setConnectionId(connId);
                                                                    const selectedConnection =
                                                                        llmConnections.find(
                                                                            (conn) =>
                                                                                conn.id === connId
                                                                        );
                                                                    if (selectedConnection) {
                                                                        const newProvider =
                                                                            selectedConnection.provider.toLowerCase() as Agent["provider"];
                                                                        setProvider(newProvider);
                                                                        const defaultModel =
                                                                            getDefaultModelForProvider(
                                                                                newProvider
                                                                            );
                                                                        setModel(defaultModel);
                                                                    }
                                                                }}
                                                                placeholder="Use environment variables"
                                                                options={llmConnections.map(
                                                                    (conn) => ({
                                                                        value: conn.id,
                                                                        label: conn.name
                                                                    })
                                                                )}
                                                            />
                                                            <p className="mt-2 text-xs text-muted-foreground">
                                                                Leave empty to use server-side API
                                                                keys
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Advanced Settings Card */}
                                                    <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
                                                        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                                            <svg
                                                                className="w-4 h-4 text-muted-foreground"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                                                />
                                                            </svg>
                                                            Model Parameters
                                                        </h3>
                                                        <div className="space-y-4">
                                                            {/* Temperature */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm text-muted-foreground">
                                                                        Temperature
                                                                    </span>
                                                                    <span className="text-sm font-medium tabular-nums">
                                                                        {temperature}
                                                                    </span>
                                                                </div>
                                                                <Input
                                                                    type="range"
                                                                    min="0"
                                                                    max={temperatureMax.toString()}
                                                                    step="0.1"
                                                                    value={temperature}
                                                                    onChange={(e) =>
                                                                        setTemperature(
                                                                            parseFloat(
                                                                                e.target.value
                                                                            )
                                                                        )
                                                                    }
                                                                    className="w-full"
                                                                />
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    Controls randomness. Lower =
                                                                    more focused, higher = more
                                                                    creative
                                                                </p>
                                                            </div>

                                                            {/* Max Tokens */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm text-muted-foreground">
                                                                        Max Output Tokens
                                                                    </span>
                                                                    <span className="text-sm font-medium tabular-nums">
                                                                        {maxTokens.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <Input
                                                                    type="number"
                                                                    min="100"
                                                                    max="100000"
                                                                    step="100"
                                                                    value={maxTokens}
                                                                    onChange={(e) =>
                                                                        setMaxTokens(
                                                                            parseInt(e.target.value)
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        "w-full px-3 py-2 rounded-lg",
                                                                        "bg-muted border border-border",
                                                                        "text-foreground",
                                                                        "focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column */}
                                                <div className="space-y-6">
                                                    {/* Voice Settings Card */}
                                                    <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
                                                        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                                            <svg
                                                                className="w-4 h-4 text-muted-foreground"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                                                />
                                                            </svg>
                                                            Voice Settings
                                                        </h3>
                                                        <div className="space-y-4">
                                                            {/* Voice Enabled Toggle */}
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        Enable Voice Chat
                                                                    </span>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Allow users to interact with
                                                                        voice
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setVoiceConfig((prev) => ({
                                                                            ...prev,
                                                                            enabled: !prev.enabled
                                                                        }))
                                                                    }
                                                                    className={cn(
                                                                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                                                        voiceConfig.enabled
                                                                            ? "bg-primary"
                                                                            : "bg-muted"
                                                                    )}
                                                                >
                                                                    <span
                                                                        className={cn(
                                                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                                            voiceConfig.enabled
                                                                                ? "translate-x-5"
                                                                                : "translate-x-0"
                                                                        )}
                                                                    />
                                                                </button>
                                                            </div>

                                                            {/* Voice Selection */}
                                                            {voiceConfig.enabled && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                                        Agent Voice
                                                                    </label>
                                                                    <Select
                                                                        value={voiceConfig.voiceId}
                                                                        onChange={(voiceId) => {
                                                                            const voice =
                                                                                ELEVENLABS_VOICES.find(
                                                                                    (v) =>
                                                                                        v.voiceId ===
                                                                                        voiceId
                                                                                );
                                                                            setVoiceConfig(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    voiceId,
                                                                                    voiceName:
                                                                                        voice?.name
                                                                                })
                                                                            );
                                                                        }}
                                                                        options={ELEVENLABS_VOICES.map(
                                                                            (voice) => ({
                                                                                value: voice.voiceId,
                                                                                label: `${voice.name} - ${voice.description}`
                                                                            })
                                                                        )}
                                                                    />
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        Selected:{" "}
                                                                        {voiceConfig.voiceName ||
                                                                            "Rachel"}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Memory Settings Card */}
                                                    <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
                                                        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                                            <svg
                                                                className="w-4 h-4 text-muted-foreground"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                                                                />
                                                            </svg>
                                                            Memory Settings
                                                        </h3>
                                                        <div className="space-y-4">
                                                            {/* Cross-thread recall toggle */}
                                                            <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                                                                <div>
                                                                    <p className="text-sm font-medium text-foreground">
                                                                        Cross-thread Recall
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        Search previous
                                                                        conversations
                                                                    </p>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={
                                                                            memoryConfig.embeddings_enabled !==
                                                                            false
                                                                        }
                                                                        onChange={(e) =>
                                                                            setMemoryConfig(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    embeddings_enabled:
                                                                                        e.target
                                                                                            .checked
                                                                                })
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                                </label>
                                                            </div>

                                                            {/* Working memory toggle */}
                                                            <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                                                                <div>
                                                                    <p className="text-sm font-medium text-foreground">
                                                                        Working Memory
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        Remember facts about users
                                                                    </p>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={
                                                                            memoryConfig.working_memory_enabled !==
                                                                            false
                                                                        }
                                                                        onChange={(e) =>
                                                                            setMemoryConfig(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    working_memory_enabled:
                                                                                        e.target
                                                                                            .checked
                                                                                })
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                                </label>
                                                            </div>

                                                            {/* Max Messages Slider */}
                                                            <div className="pt-2">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        Context Window
                                                                    </span>
                                                                    <span className="text-sm text-muted-foreground tabular-nums">
                                                                        {memoryConfig.max_messages}{" "}
                                                                        messages
                                                                    </span>
                                                                </div>
                                                                <Input
                                                                    type="range"
                                                                    min="10"
                                                                    max="100"
                                                                    step="5"
                                                                    value={
                                                                        memoryConfig.max_messages
                                                                    }
                                                                    onChange={(e) =>
                                                                        setMemoryConfig((prev) => ({
                                                                            ...prev,
                                                                            max_messages: parseInt(
                                                                                e.target.value,
                                                                                10
                                                                            )
                                                                        }))
                                                                    }
                                                                    className="w-full"
                                                                />
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    Recent messages kept in context
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
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
                    onAddCustomMCP={handleAddCustomMCP}
                    existingToolNames={tools.map((t) => t.name)}
                />

                <AddKnowledgeBaseDialog
                    isOpen={isKnowledgeBaseDialogOpen}
                    onClose={() => setIsKnowledgeBaseDialogOpen(false)}
                    onAdd={handleAddKnowledgeBases}
                    existingKnowledgeBaseIds={tools
                        .filter((t) => t.type === "knowledge_base")
                        .map((t) => t.config.knowledgeBaseId as string)}
                />

                <AddBuiltinToolDialog
                    isOpen={isBuiltinToolDialogOpen}
                    onClose={() => setIsBuiltinToolDialogOpen(false)}
                    onAddTools={handleAddBuiltinTools}
                    existingToolNames={tools.map((t) => t.name)}
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

                {/* Unsaved Changes Dialog */}
                <Dialog
                    isOpen={showUnsavedDialog}
                    onClose={() => setShowUnsavedDialog(false)}
                    title="Unsaved Changes"
                >
                    <p className="text-muted-foreground mb-6">
                        You have unsaved changes. Would you like to save them before leaving?
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowUnsavedDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDiscardChanges}>
                            Discard Changes
                        </Button>
                        <Button variant="primary" onClick={handleSaveAndLeave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save & Leave
                                </>
                            )}
                        </Button>
                    </div>
                </Dialog>

                {/* Create Form Interface Dialog */}
                <CreateFormInterfaceDialog
                    isOpen={isFormInterfaceDialogOpen}
                    onClose={() => setIsFormInterfaceDialogOpen(false)}
                    onCreated={(formInterface) => {
                        setIsFormInterfaceDialogOpen(false);
                        navigate(`/form-interfaces/${formInterface.id}/edit`);
                    }}
                    initialAgentId={agentId || undefined}
                />

                {/* Create Chat Interface Dialog */}
                <CreateChatInterfaceDialog
                    isOpen={isChatInterfaceDialogOpen}
                    onClose={() => setIsChatInterfaceDialogOpen(false)}
                    onCreated={(chatInterface) => {
                        setIsChatInterfaceDialogOpen(false);
                        navigate(`/chat-interfaces/${chatInterface.id}/edit`);
                    }}
                    initialAgentId={agentId || undefined}
                />
            </div>
        </MobileBuilderGuard>
    );
}
