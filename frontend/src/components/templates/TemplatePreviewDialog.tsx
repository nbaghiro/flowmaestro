import { Check, Copy, ExternalLink, Eye, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Flow, { Background, BackgroundVariant, Controls, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { ALL_PROVIDERS, TEMPLATE_CATEGORY_META, type Template } from "@flowmaestro/shared";
import AudioNode from "../../canvas/nodes/AudioNode";
import CodeNode from "../../canvas/nodes/CodeNode";
import ConditionalNode from "../../canvas/nodes/ConditionalNode";
import DatabaseNode from "../../canvas/nodes/DatabaseNode";
import EmbeddingsNode from "../../canvas/nodes/EmbeddingsNode";
import HTTPNode from "../../canvas/nodes/HTTPNode";
import InputNode from "../../canvas/nodes/InputNode";
import IntegrationNode from "../../canvas/nodes/IntegrationNode";
import KnowledgeBaseQueryNode from "../../canvas/nodes/KnowledgeBaseQueryNode";
import LLMNode from "../../canvas/nodes/LLMNode";
import LoopNode from "../../canvas/nodes/LoopNode";
import OutputNode from "../../canvas/nodes/OutputNode";
import SwitchNode from "../../canvas/nodes/SwitchNode";
import TransformNode from "../../canvas/nodes/TransformNode";
import VariableNode from "../../canvas/nodes/VariableNode";
import VisionNode from "../../canvas/nodes/VisionNode";
import WaitNode from "../../canvas/nodes/WaitNode";
import { cn } from "../../lib/utils";
import { Button } from "../common/Button";

// Register node types
const nodeTypes = {
    llm: LLMNode,
    vision: VisionNode,
    audio: AudioNode,
    embeddings: EmbeddingsNode,
    conditional: ConditionalNode,
    switch: SwitchNode,
    loop: LoopNode,
    code: CodeNode,
    wait: WaitNode,
    input: InputNode,
    transform: TransformNode,
    variable: VariableNode,
    output: OutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode
};

// Brandfetch Logo API - same as shared/providers.ts
const BRANDFETCH_CLIENT_ID = "1idCpJZqz6etuVweFEJ";
const getBrandLogo = (domain: string): string =>
    `https://cdn.brandfetch.io/${domain}?c=${BRANDFETCH_CLIENT_ID}`;

// Domain mapping for providers not in ALL_PROVIDERS or with different naming
const providerDomains: Record<string, string> = {
    google_sheets: "google.com",
    google_calendar: "google.com",
    gmail: "gmail.com"
};

// Get logo URL for an integration - uses shared providers or Brandfetch fallback
const getIntegrationLogo = (integration: string): string => {
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    if (providerDomains[integration]) {
        return getBrandLogo(providerDomains[integration]);
    }
    return getBrandLogo(`${integration}.com`);
};

interface TemplatePreviewDialogProps {
    template: Template | null;
    isOpen: boolean;
    onClose: () => void;
    onUse: (template: Template) => void;
    isUsing?: boolean;
}

export function TemplatePreviewDialog({
    template,
    isOpen,
    onClose,
    onUse,
    isUsing = false
}: TemplatePreviewDialogProps) {
    const [copied, setCopied] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Parse nodes and edges from definition
    // The definition may store nodes as a Record or array depending on source
    const { nodes, edges } = useMemo(() => {
        if (!template?.definition) {
            return { nodes: [], edges: [] };
        }

        const def = template.definition as {
            nodes?:
                | Record<string, unknown>
                | Array<{
                      id: string;
                      type: string;
                      position?: { x: number; y: number };
                      data?: Record<string, unknown>;
                  }>;
            edges?: Array<{
                id?: string;
                source: string;
                target: string;
                sourceHandle?: string;
                targetHandle?: string;
            }>;
        };

        // Convert nodes - handle both Record and Array formats
        let nodeEntries: Array<{
            id: string;
            type: string;
            position?: { x: number; y: number };
            data?: Record<string, unknown>;
        }> = [];

        if (Array.isArray(def.nodes)) {
            nodeEntries = def.nodes;
        } else if (def.nodes && typeof def.nodes === "object") {
            nodeEntries = Object.entries(def.nodes).map(([id, node]) => ({
                id,
                ...(node as object)
            })) as typeof nodeEntries;
        }

        const flowNodes: Node[] = nodeEntries.map((node, index) => ({
            id: node.id,
            type: node.type,
            position: node.position || {
                x: 100 + (index % 4) * 250,
                y: 100 + Math.floor(index / 4) * 150
            },
            data: {
                label: node.data?.label || node.type,
                ...node.data,
                status: "idle"
            }
        }));

        const flowEdges: Edge[] = (def.edges || []).map((edge) => ({
            id: edge.id || `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            animated: true
        }));

        return { nodes: flowNodes, edges: flowEdges };
    }, [template?.definition]);

    const handleCopyId = async () => {
        if (!template) return;
        await navigator.clipboard.writeText(template.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !template) return null;

    const categoryMeta = TEMPLATE_CATEGORY_META[template.category];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card rounded-2xl border border-border/50 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-border">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold text-foreground truncate">
                                {template.name}
                            </h2>
                            <span
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                    categoryMeta.color
                                )}
                            >
                                {categoryMeta.label}
                            </span>
                            {template.featured && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                    Featured
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {template.author_name && (
                                <span className="flex items-center gap-1.5">
                                    {template.author_avatar_url ? (
                                        <img
                                            src={template.author_avatar_url}
                                            alt={template.author_name}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    ) : (
                                        <User className="w-4 h-4" />
                                    )}
                                    {template.author_name}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {template.view_count.toLocaleString()} views
                            </span>
                            <span className="flex items-center gap-1">
                                <Copy className="w-4 h-4" />
                                {template.use_count.toLocaleString()} uses
                            </span>
                            <span className="text-xs">v{template.version}</span>
                        </div>
                    </div>
                    <Button variant="icon" onClick={onClose} className="ml-4">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content - Split view */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left - Preview canvas */}
                    <div className="flex-1 border-r border-border">
                        <div className="h-full w-full bg-muted/30">
                            <Flow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                fitView
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                panOnDrag={true}
                                zoomOnScroll={true}
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                                <Controls showInteractive={false} />
                            </Flow>
                        </div>
                    </div>

                    {/* Right - Details panel */}
                    <div className="w-80 flex-shrink-0 overflow-y-auto p-6 space-y-6">
                        {/* Description */}
                        {template.description && (
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-2">
                                    Description
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {template.description}
                                </p>
                            </div>
                        )}

                        {/* Required Integrations */}
                        {template.required_integrations.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3">
                                    Required Integrations
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {template.required_integrations.map((integration) => (
                                        <div
                                            key={integration}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg"
                                        >
                                            <img
                                                src={getIntegrationLogo(integration)}
                                                alt={integration}
                                                className="w-4 h-4 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display =
                                                        "none";
                                                }}
                                            />
                                            <span className="text-sm text-foreground capitalize">
                                                {integration}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {template.tags.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {template.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Workflow Stats */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3">
                                Workflow Details
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-muted/30 rounded-lg">
                                    <div className="text-2xl font-bold text-foreground">
                                        {nodes.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Nodes</div>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg">
                                    <div className="text-2xl font-bold text-foreground">
                                        {edges.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Connections</div>
                                </div>
                            </div>
                        </div>

                        {/* Template ID */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2">
                                Template ID
                            </h3>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-mono truncate">
                                    {template.id}
                                </code>
                                <button
                                    onClick={handleCopyId}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title="Copy template ID"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/30">
                    <div className="text-xs text-muted-foreground">
                        Updated {new Date(template.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => onUse(template)}
                            disabled={isUsing}
                            loading={isUsing}
                        >
                            <ExternalLink className="w-4 h-4" />
                            {isUsing ? "Creating..." : "Use Template"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
