import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
    AgentSummary,
    AgentTemplate,
    ChatInterfaceSummary,
    FormInterfaceSummary,
    KnowledgeBaseSummary,
    PersonaDefinition,
    PersonaDefinitionSummary,
    Template,
    WorkflowSummary
} from "@flowmaestro/shared";
import { TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import { CreateChatInterfaceDialog } from "../components/chat/builder/CreateChatInterfaceDialog";
import { CreateAgentDialog } from "../components/CreateAgentDialog";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";
import { GetStartedPanel } from "../components/empty-states";
import { CreateFormInterfaceDialog } from "../components/forms/CreateFormInterfaceDialog";
import {
    HomePageSkeleton,
    MixedInterfaces,
    MixedTemplates,
    QuickCreateRow,
    RecentAgents,
    RecentKnowledgeBases,
    RecentPersonas,
    RecentWorkflows,
    SectionDivider,
    WelcomeSection
} from "../components/home";
import { CreateKnowledgeBaseModal } from "../components/knowledge-bases/modals/CreateKnowledgeBaseModal";
import { PersonaDetailModal } from "../components/personas/modals/PersonaDetailModal";
import { TaskLaunchDialog } from "../components/personas/modals/TaskLaunchDialog";
import { AgentTemplatePreviewDialog } from "../components/templates/dialogs/AgentTemplatePreviewDialog";
import { TemplatePreviewDialog } from "../components/templates/dialogs/TemplatePreviewDialog";
import {
    copyAgentTemplate,
    copyTemplate,
    createKnowledgeBase,
    getAgentTemplates,
    getAgents,
    getChatInterfaces,
    getFormInterfaces,
    getKnowledgeBases,
    getKnowledgeBaseStats,
    getPersona,
    getPersonas,
    getTemplates,
    getWorkflows
} from "../lib/api";
import type { KnowledgeBase, KnowledgeBaseStats } from "../lib/api";

// Convert API response to WorkflowSummary format
interface ApiWorkflow {
    id: string;
    name: string;
    description?: string | null;
    definition?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

function toWorkflowSummary(workflow: ApiWorkflow): WorkflowSummary {
    return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description ?? null,
        definition: workflow.definition as Record<string, unknown> | null,
        createdAt: new Date(workflow.created_at),
        updatedAt: new Date(workflow.updated_at)
    };
}

// Convert API Agent to AgentSummary format
function toAgentSummary(agent: {
    id: string;
    name: string;
    description?: string | null;
    provider: string;
    model: string;
    available_tools?: { id: string; name: string }[];
    system_prompt?: string;
    temperature?: number;
    created_at: string;
    updated_at: string;
}): AgentSummary {
    return {
        id: agent.id,
        name: agent.name,
        description: agent.description ?? null,
        provider: agent.provider,
        model: agent.model,
        availableTools: agent.available_tools?.map((t) => t.name),
        systemPrompt: agent.system_prompt,
        temperature: agent.temperature,
        createdAt: new Date(agent.created_at),
        updatedAt: new Date(agent.updated_at)
    };
}

// Convert KnowledgeBase + stats to KnowledgeBaseSummary for card components
function toKnowledgeBaseSummary(
    kb: KnowledgeBase,
    stats?: KnowledgeBaseStats
): KnowledgeBaseSummary {
    return {
        id: kb.id,
        name: kb.name,
        description: kb.description ?? null,
        category: kb.category ?? null,
        documentCount: stats?.document_count ?? 0,
        chunkCount: stats?.chunk_count,
        totalSizeBytes: stats?.total_size_bytes,
        embeddingModel: kb.config?.embeddingModel,
        createdAt: new Date(kb.created_at),
        updatedAt: new Date(kb.updated_at)
    };
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function Home() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
    const [previewAgentTemplate, setPreviewAgentTemplate] = useState<AgentTemplate | null>(null);
    const [selectedPersona, setSelectedPersona] = useState<PersonaDefinition | null>(null);
    const [isPersonaDetailOpen, setIsPersonaDetailOpen] = useState(false);
    const [isPersonaLaunchOpen, setIsPersonaLaunchOpen] = useState(false);

    // Get Started panel dialogs
    const [isCreateWorkflowOpen, setIsCreateWorkflowOpen] = useState(false);
    const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
    const [isCreateChatInterfaceOpen, setIsCreateChatInterfaceOpen] = useState(false);
    const [isCreateFormInterfaceOpen, setIsCreateFormInterfaceOpen] = useState(false);
    const [isCreateKnowledgeBaseOpen, setIsCreateKnowledgeBaseOpen] = useState(false);

    // Fetch recent workflows sorted by most recent activity (created or updated)
    const workflowsQuery = useQuery({
        queryKey: ["home", "workflows"],
        queryFn: async () => {
            const response = await getWorkflows({ limit: 10 });
            if (response.success && response.data) {
                // Sort by most recent activity (whichever is later: created_at or updated_at)
                const items = [...response.data.items].sort((a, b) => {
                    const aLatest = Math.max(
                        new Date(a.created_at).getTime(),
                        new Date(a.updated_at).getTime()
                    );
                    const bLatest = Math.max(
                        new Date(b.created_at).getTime(),
                        new Date(b.updated_at).getTime()
                    );
                    return bLatest - aLatest;
                });
                return items;
            }
            return [];
        }
    });

    // Fetch recent agents sorted by most recent activity (created or updated)
    const agentsQuery = useQuery({
        queryKey: ["home", "agents"],
        queryFn: async () => {
            const response = await getAgents({ limit: 10 });
            if (response.success && response.data) {
                // Sort by most recent activity (whichever is later: created_at or updated_at)
                const items = [...response.data.agents].sort((a, b) => {
                    const aLatest = Math.max(
                        new Date(a.created_at).getTime(),
                        new Date(a.updated_at).getTime()
                    );
                    const bLatest = Math.max(
                        new Date(b.created_at).getTime(),
                        new Date(b.updated_at).getTime()
                    );
                    return bLatest - aLatest;
                });
                return items;
            }
            return [];
        }
    });

    // Fetch form interfaces sorted by updated_at
    const formInterfacesQuery = useQuery({
        queryKey: ["home", "form-interfaces"],
        queryFn: async () => {
            const response = await getFormInterfaces({ limit: 10 });
            if (response.success && response.data?.items) {
                // Sort by updated_at descending
                return [...response.data.items].sort((a, b) => {
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                });
            }
            return [];
        }
    });

    // Fetch chat interfaces sorted by updated_at
    const chatInterfacesQuery = useQuery({
        queryKey: ["home", "chat-interfaces"],
        queryFn: async () => {
            const response = await getChatInterfaces({ limit: 10 });
            if (response.success && response.data?.items) {
                // Sort by updated_at descending
                return [...response.data.items].sort((a, b) => {
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                });
            }
            return [];
        }
    });

    // Fetch knowledge bases with stats sorted by updated_at
    const knowledgeBasesQuery = useQuery({
        queryKey: ["home", "knowledge-bases"],
        queryFn: async () => {
            const response = await getKnowledgeBases({ limit: 10 });
            if (response.success && response.data) {
                // Sort by updated_at descending
                const sortedKBs = [...response.data].sort((a, b) => {
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                });

                // Fetch stats for each knowledge base in parallel
                const statsPromises = sortedKBs.map(async (kb) => {
                    try {
                        const statsResponse = await getKnowledgeBaseStats(kb.id);
                        if (statsResponse.success && statsResponse.data) {
                            return { kb, stats: statsResponse.data };
                        }
                    } catch {
                        // Ignore stats fetch errors
                    }
                    return { kb, stats: undefined };
                });

                return Promise.all(statsPromises);
            }
            return [];
        }
    });

    // Fetch ALL personas and shuffle them for variety
    const personasQuery = useQuery({
        queryKey: ["home", "personas"],
        queryFn: async () => {
            const response = await getPersonas({ limit: 100 }); // Get all personas
            if (response.success && response.data?.personas) {
                // Shuffle to mix categories
                return shuffleArray(response.data.personas);
            }
            return [];
        }
    });

    // Fetch workflow templates
    const workflowTemplatesQuery = useQuery({
        queryKey: ["home", "workflow-templates"],
        queryFn: async () => {
            const response = await getTemplates({ limit: 20 });
            if (response.success && response.data?.items) {
                return response.data.items.filter(
                    (t: Template) => TEMPLATE_CATEGORY_META[t.category]
                );
            }
            return [];
        }
    });

    // Fetch agent templates
    const agentTemplatesQuery = useQuery({
        queryKey: ["home", "agent-templates"],
        queryFn: async () => {
            const response = await getAgentTemplates({ limit: 20 });
            if (response.success && response.data?.items) {
                return response.data.items.filter(
                    (t: AgentTemplate) => TEMPLATE_CATEGORY_META[t.category]
                );
            }
            return [];
        }
    });

    // Copy workflow template mutation
    const copyTemplateMutation = useMutation({
        mutationFn: (template: Template) => copyTemplate(template.id),
        onSuccess: (data) => {
            if (data.data?.workflowId) {
                navigate(`/builder/${data.data.workflowId}`);
            }
            queryClient.invalidateQueries({ queryKey: ["home", "workflows"] });
        }
    });

    // Copy agent template mutation
    const copyAgentTemplateMutation = useMutation({
        mutationFn: (template: AgentTemplate) => copyAgentTemplate(template.id),
        onSuccess: (data) => {
            if (data.data?.agentId) {
                navigate(`/agents/${data.data.agentId}`);
            }
            queryClient.invalidateQueries({ queryKey: ["home", "agents"] });
        }
    });

    // Convert workflows to WorkflowSummary format
    const recentWorkflows: WorkflowSummary[] = useMemo(() => {
        if (!workflowsQuery.data) return [];
        return workflowsQuery.data.map(toWorkflowSummary);
    }, [workflowsQuery.data]);

    // Convert agents to AgentSummary format
    const recentAgents: AgentSummary[] = useMemo(() => {
        if (!agentsQuery.data) return [];
        return agentsQuery.data.map(toAgentSummary);
    }, [agentsQuery.data]);

    // Convert knowledge bases to KnowledgeBaseSummary format
    const recentKnowledgeBases: KnowledgeBaseSummary[] = useMemo(() => {
        if (!knowledgeBasesQuery.data) return [];
        return knowledgeBasesQuery.data.map(({ kb, stats }) => toKnowledgeBaseSummary(kb, stats));
    }, [knowledgeBasesQuery.data]);

    // Mix form and chat interfaces
    const mixedInterfaces = useMemo(() => {
        const formInterfaces = formInterfacesQuery.data ?? [];
        const chatInterfaces = chatInterfacesQuery.data ?? [];

        // Interleave interfaces: form, chat, form, chat...
        const mixed: Array<
            | { type: "form"; interface: FormInterfaceSummary }
            | { type: "chat"; interface: ChatInterfaceSummary }
        > = [];
        const maxLen = Math.max(formInterfaces.length, chatInterfaces.length);

        for (let i = 0; i < maxLen; i++) {
            if (i < formInterfaces.length) {
                mixed.push({ type: "form", interface: formInterfaces[i] });
            }
            if (i < chatInterfaces.length) {
                mixed.push({ type: "chat", interface: chatInterfaces[i] });
            }
        }

        return mixed;
    }, [formInterfacesQuery.data, chatInterfacesQuery.data]);

    // All personas shuffled
    const allPersonas: PersonaDefinitionSummary[] = useMemo(() => {
        return personasQuery.data ?? [];
    }, [personasQuery.data]);

    // Mix workflow and agent templates
    const mixedTemplates = useMemo(() => {
        const workflowTemplates = workflowTemplatesQuery.data ?? [];
        const agentTemplates = agentTemplatesQuery.data ?? [];

        // Interleave templates: workflow, agent, workflow, agent...
        const mixed: Array<
            { type: "workflow"; template: Template } | { type: "agent"; template: AgentTemplate }
        > = [];
        const maxLen = Math.max(workflowTemplates.length, agentTemplates.length);

        for (let i = 0; i < maxLen; i++) {
            if (i < workflowTemplates.length) {
                mixed.push({ type: "workflow", template: workflowTemplates[i] });
            }
            if (i < agentTemplates.length) {
                mixed.push({ type: "agent", template: agentTemplates[i] });
            }
        }

        return mixed;
    }, [workflowTemplatesQuery.data, agentTemplatesQuery.data]);

    const isLoading =
        workflowsQuery.isLoading ||
        agentsQuery.isLoading ||
        knowledgeBasesQuery.isLoading ||
        formInterfacesQuery.isLoading ||
        chatInterfacesQuery.isLoading ||
        personasQuery.isLoading ||
        workflowTemplatesQuery.isLoading ||
        agentTemplatesQuery.isLoading;

    const handleWorkflowTemplateClick = (template: Template) => {
        setPreviewTemplate(template);
    };

    const handleAgentTemplateClick = (template: AgentTemplate) => {
        setPreviewAgentTemplate(template);
    };

    const handleUseWorkflowTemplate = async (template: Template) => {
        copyTemplateMutation.mutate(template);
    };

    const handleUseAgentTemplate = async (template: AgentTemplate) => {
        copyAgentTemplateMutation.mutate(template);
    };

    // Handle persona click - fetch full persona and open detail modal
    const handlePersonaClick = async (persona: PersonaDefinitionSummary) => {
        try {
            const response = await getPersona(persona.slug);
            if (response.success && response.data) {
                setSelectedPersona(response.data);
                setIsPersonaDetailOpen(true);
            }
        } catch (_error) {
            // Failed to load persona details
        }
    };

    // Handle persona launch from card (same as click - opens detail modal)
    const handlePersonaLaunch = async (persona: PersonaDefinitionSummary) => {
        handlePersonaClick(persona);
    };

    // Handle launch from detail modal - opens task launch dialog
    const handleLaunchFromDetail = () => {
        setIsPersonaDetailOpen(false);
        setIsPersonaLaunchOpen(true);
    };

    // Handle back from task launch dialog - returns to detail modal
    const handleBackToPersonaDetail = () => {
        setIsPersonaLaunchOpen(false);
        setIsPersonaDetailOpen(true);
    };

    const handleClosePersonaDetail = () => {
        setIsPersonaDetailOpen(false);
        setSelectedPersona(null);
    };

    // Get Started panel handlers
    const handleCreateWorkflow = useCallback(
        async (name: string, description?: string) => {
            // Navigate to builder with new workflow
            navigate("/builder/new", { state: { name, description } });
        },
        [navigate]
    );

    const handleCreateAgent = useCallback(
        (agentId: string) => {
            // Close dialog and navigate to the newly created agent
            setIsCreateAgentOpen(false);
            queryClient.invalidateQueries({ queryKey: ["home", "agents"] });
            navigate(`/agents/${agentId}`);
        },
        [navigate, queryClient]
    );

    const handleCreateChatInterface = useCallback(
        (chatInterface: { id: string; title: string }) => {
            // Close dialog and navigate to the newly created chat interface
            setIsCreateChatInterfaceOpen(false);
            queryClient.invalidateQueries({ queryKey: ["home", "chat-interfaces"] });
            navigate(`/chat-interfaces/${chatInterface.id}/edit`);
        },
        [navigate, queryClient]
    );

    const handleCreateFormInterface = useCallback(
        (formInterface: { id: string; title: string }) => {
            // Close dialog and navigate to the newly created form interface
            setIsCreateFormInterfaceOpen(false);
            queryClient.invalidateQueries({ queryKey: ["home", "form-interfaces"] });
            navigate(`/form-interfaces/${formInterface.id}/edit`);
        },
        [navigate, queryClient]
    );

    const handleCreateKnowledgeBase = useCallback(
        async (name: string, description?: string, category?: string) => {
            const response = await createKnowledgeBase({ name, description, category });
            if (response.success && response.data) {
                setIsCreateKnowledgeBaseOpen(false);
                queryClient.invalidateQueries({ queryKey: ["home", "knowledge-bases"] });
                navigate(`/knowledge-bases/${response.data.id}`);
            }
        },
        [navigate, queryClient]
    );

    // Check if all primary sections are empty
    const isAllEmpty = recentWorkflows.length === 0 && recentAgents.length === 0;

    const handleClosePersonaLaunch = () => {
        setIsPersonaLaunchOpen(false);
        setSelectedPersona(null);
    };

    if (isLoading) {
        return <HomePageSkeleton />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            <WelcomeSection />

            {isAllEmpty ? (
                <>
                    {/* Show GetStartedPanel when no workflows or agents */}
                    <GetStartedPanel
                        onCreateWorkflow={() => setIsCreateWorkflowOpen(true)}
                        onCreateAgent={() => setIsCreateAgentOpen(true)}
                        onCreateChatInterface={() => setIsCreateChatInterfaceOpen(true)}
                        onCreateFormInterface={() => setIsCreateFormInterfaceOpen(true)}
                        className="mb-8"
                    />

                    {/* Still show templates for inspiration */}
                    <MixedTemplates
                        templates={mixedTemplates}
                        onWorkflowTemplateClick={handleWorkflowTemplateClick}
                        onAgentTemplateClick={handleAgentTemplateClick}
                    />
                </>
            ) : (
                <>
                    {/* Quick Create CTAs */}
                    <QuickCreateRow
                        onCreateWorkflow={() => setIsCreateWorkflowOpen(true)}
                        onCreateAgent={() => setIsCreateAgentOpen(true)}
                        onCreateChat={() => setIsCreateChatInterfaceOpen(true)}
                        onCreateForm={() => setIsCreateFormInterfaceOpen(true)}
                        onCreateKnowledgeBase={() => setIsCreateKnowledgeBaseOpen(true)}
                    />

                    {/* Featured content for inspiration */}
                    <RecentPersonas
                        personas={allPersonas}
                        onPersonaClick={handlePersonaClick}
                        onPersonaLaunch={handlePersonaLaunch}
                    />

                    <MixedTemplates
                        templates={mixedTemplates}
                        onWorkflowTemplateClick={handleWorkflowTemplateClick}
                        onAgentTemplateClick={handleAgentTemplateClick}
                    />

                    {/* Divider between inspiration and user's work */}
                    <SectionDivider label="Your Recent Work" />

                    {/* User's recent items */}
                    <RecentWorkflows workflows={recentWorkflows} />

                    <RecentAgents agents={recentAgents} />

                    <MixedInterfaces interfaces={mixedInterfaces} />

                    <RecentKnowledgeBases knowledgeBases={recentKnowledgeBases} />
                </>
            )}

            {/* Create Workflow Dialog */}
            <CreateWorkflowDialog
                isOpen={isCreateWorkflowOpen}
                onClose={() => setIsCreateWorkflowOpen(false)}
                onCreate={handleCreateWorkflow}
            />

            {/* Create Agent Dialog */}
            <CreateAgentDialog
                isOpen={isCreateAgentOpen}
                onClose={() => setIsCreateAgentOpen(false)}
                onCreated={handleCreateAgent}
            />

            {/* Create Chat Interface Dialog */}
            <CreateChatInterfaceDialog
                isOpen={isCreateChatInterfaceOpen}
                onClose={() => setIsCreateChatInterfaceOpen(false)}
                onCreated={handleCreateChatInterface}
            />

            {/* Create Form Interface Dialog */}
            <CreateFormInterfaceDialog
                isOpen={isCreateFormInterfaceOpen}
                onClose={() => setIsCreateFormInterfaceOpen(false)}
                onCreated={handleCreateFormInterface}
            />

            {/* Create Knowledge Base Dialog */}
            <CreateKnowledgeBaseModal
                isOpen={isCreateKnowledgeBaseOpen}
                onClose={() => setIsCreateKnowledgeBaseOpen(false)}
                onSubmit={handleCreateKnowledgeBase}
            />

            {/* Workflow Template Preview Dialog */}
            <TemplatePreviewDialog
                template={previewTemplate}
                isOpen={previewTemplate !== null}
                onClose={() => setPreviewTemplate(null)}
                onUse={handleUseWorkflowTemplate}
                isUsing={copyTemplateMutation.isPending}
            />

            {/* Agent Template Preview Dialog */}
            <AgentTemplatePreviewDialog
                template={previewAgentTemplate}
                isOpen={previewAgentTemplate !== null}
                onClose={() => setPreviewAgentTemplate(null)}
                onUse={handleUseAgentTemplate}
                isUsing={copyAgentTemplateMutation.isPending}
            />

            {/* Persona Detail Modal */}
            {selectedPersona && (
                <PersonaDetailModal
                    persona={selectedPersona}
                    isOpen={isPersonaDetailOpen}
                    onClose={handleClosePersonaDetail}
                    onLaunch={handleLaunchFromDetail}
                />
            )}

            {/* Persona Launch Dialog */}
            {selectedPersona && (
                <TaskLaunchDialog
                    persona={selectedPersona}
                    isOpen={isPersonaLaunchOpen}
                    onClose={handleClosePersonaLaunch}
                    onBack={handleBackToPersonaDetail}
                />
            )}
        </div>
    );
}
