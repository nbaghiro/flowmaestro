import { Plus, FileText, Calendar, Loader2, LogOut, User, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkflowNode } from "@flowmaestro/shared";
import { AIGenerateDialog } from "../components/AIGenerateDialog";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";
import { useAuth } from "../contexts/AuthContext";
import {
    getWorkflows,
    createWorkflow,
    generateWorkflow,
    updateWorkflow,
    type WorkflowDefinition
} from "../lib/api";
import { logger } from "../lib/logger";
import { convertToReactFlowFormat } from "../lib/workflowLayout";

interface Workflow {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export function WorkflowLibrary() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            const response = await getWorkflows();
            if (response.success && response.data) {
                setWorkflows(response.data.items);
            }
        } catch (error) {
            logger.error("Failed to load workflows", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWorkflow = async (
        name: string,
        description?: string,
        definition?: WorkflowDefinition
    ) => {
        const response = await createWorkflow(name, description, definition);

        if (response.success && response.data) {
            const workflowId = response.data.id;
            navigate(`/builder/${workflowId}`);
        }
    };

    const handleGenerateWorkflow = async (prompt: string, connectionId: string, model: string) => {
        // Generate workflow using AI
        const generateResponse = await generateWorkflow({ prompt, connectionId, model });

        if (generateResponse.success && generateResponse.data) {
            const { nodes, edges, metadata } = generateResponse.data;

            // Convert generated workflow to React Flow format
            const { nodes: flowNodes, edges: flowEdges } = convertToReactFlowFormat(
                nodes,
                edges,
                metadata.entryNodeId
            );

            // Create a new workflow with the generated name
            const workflowName = metadata.name || "AI Generated Workflow";
            const createResponse = await createWorkflow(workflowName, metadata.description);

            if (createResponse.success && createResponse.data) {
                const workflowId = createResponse.data.id;

                // Convert React Flow format back to backend format for saving
                const nodesMap: Record<string, Record<string, unknown>> = {};
                flowNodes.forEach((node) => {
                    const { label, onError, ...config } = (node.data || {}) as Record<
                        string,
                        unknown
                    >;
                    const nodeEntry: Record<string, unknown> = {
                        type: node.type || "default",
                        name: label || node.id,
                        config: config,
                        position: node.position
                    };
                    if (onError && typeof onError === "object") {
                        nodeEntry.onError = onError;
                    }
                    nodesMap[node.id] = nodeEntry;
                });

                // Find entry point
                const inputNode = flowNodes.find((n) => n.type === "input");
                const entryPoint = inputNode?.id || (flowNodes.length > 0 ? flowNodes[0].id : "");

                const workflowDefinition = {
                    name: workflowName,
                    nodes: nodesMap as unknown as Record<string, WorkflowNode>,
                    edges: flowEdges.map((edge) => ({
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        sourceHandle: edge.sourceHandle
                    })),
                    entryPoint
                };

                // Update workflow with the generated definition
                await updateWorkflow(workflowId, {
                    name: workflowName,
                    definition: workflowDefinition
                });

                // Navigate to the builder with the new workflow
                navigate(`/builder/${workflowId}`);
            } else {
                throw new Error(createResponse.error || "Failed to create workflow");
            }
        } else {
            throw new Error(generateResponse.error || "Failed to generate workflow");
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                            FM
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">FlowMaestro</h1>
                            <p className="text-xs text-muted-foreground">Workflow Library</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {user && (
                            <>
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                                    <User className="w-4 h-4" />
                                    <span>{user.email}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Actions Bar */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">My Workflows</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {workflows.length} {workflows.length === 1 ? "workflow" : "workflows"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAIDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-background hover:bg-muted border border-border rounded-lg transition-colors shadow-sm"
                            title="Generate workflow with AI"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate with AI
                        </button>
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            New Workflow
                        </button>
                    </div>
                </div>

                {/* Workflow Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading workflows...</p>
                        </div>
                    </div>
                ) : workflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No workflows yet
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                            Get started by creating your first workflow. Build complex AI-powered
                            workflows with our drag-and-drop canvas.
                        </p>
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Your First Workflow
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workflows.map((workflow) => (
                            <div
                                key={workflow.id}
                                onClick={() => navigate(`/builder/${workflow.id}`)}
                                className="bg-white border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        Workflow
                                    </span>
                                </div>

                                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {workflow.name}
                                </h3>

                                {workflow.description && (
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {workflow.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Created {formatDate(workflow.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Workflow Dialog */}
            <CreateWorkflowDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onCreate={handleCreateWorkflow}
            />

            {/* AI Generate Dialog */}
            <AIGenerateDialog
                open={isAIDialogOpen}
                onOpenChange={setIsAIDialogOpen}
                onGenerate={handleGenerateWorkflow}
            />
        </div>
    );
}
