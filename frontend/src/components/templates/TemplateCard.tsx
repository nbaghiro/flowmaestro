import { Eye, Copy } from "lucide-react";
import { useMemo } from "react";
import Flow, { Background, BackgroundVariant, Edge, Node } from "reactflow";
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
import { VoiceGreetNode } from "../../canvas/nodes/VoiceGreetNode";
import { VoiceHangupNode } from "../../canvas/nodes/VoiceHangupNode";
import { VoiceListenNode } from "../../canvas/nodes/VoiceListenNode";
import { VoiceMenuNode } from "../../canvas/nodes/VoiceMenuNode";
import WaitNode from "../../canvas/nodes/WaitNode";
import { cn } from "../../lib/utils";

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
    knowledgeBaseQuery: KnowledgeBaseQueryNode,
    voice_greet: VoiceGreetNode,
    voice_listen: VoiceListenNode,
    voice_menu: VoiceMenuNode,
    voice_hangup: VoiceHangupNode
};

interface TemplateCardProps {
    template: Template;
    onClick: (template: Template) => void;
}

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
    // First check if it's in ALL_PROVIDERS
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    // Check custom domain mapping
    if (providerDomains[integration]) {
        return getBrandLogo(providerDomains[integration]);
    }
    // Fallback: try the integration name as domain
    return getBrandLogo(`${integration}.com`);
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
    const category = TEMPLATE_CATEGORY_META[template.category];

    // Parse nodes and edges for React Flow preview
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
            animated: false
        }));

        return { nodes: flowNodes, edges: flowEdges };
    }, [template?.definition]);

    if (!category) return null;

    return (
        <div
            onClick={() => onClick(template)}
            className={cn(
                "bg-card dark:bg-card rounded-xl border border-border dark:border-border",
                "hover:shadow-xl hover:border-border/60 dark:hover:border-border/60 hover:scale-[1.02]",
                "transition-all duration-200 cursor-pointer overflow-hidden group"
            )}
        >
            {/* React Flow Preview */}
            <div className="h-40 bg-muted/30 dark:bg-muted relative overflow-hidden">
                <Flow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.1 }}
                    minZoom={0.1}
                    maxZoom={1}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnDrag={false}
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    zoomOnDoubleClick={false}
                    preventScrolling={true}
                    proOptions={{ hideAttribution: true }}
                    className="pointer-events-none"
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={16}
                        size={1}
                        color="#e5e7eb"
                    />
                </Flow>
                {/* Category badge overlay */}
                <div className="absolute top-3 left-3">
                    <span
                        className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold",
                            category.color
                        )}
                    >
                        {category.label}
                    </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-card/5 transition-colors" />
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with integrations and stats */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {template.required_integrations.map((integration) => (
                            <img
                                key={integration}
                                src={getIntegrationLogo(integration)}
                                alt={integration}
                                title={integration}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {template.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {template.use_count}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground dark:text-foreground line-clamp-1 mb-1.5">
                    {template.name}
                </h3>

                {/* Description */}
                {template.description && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2">
                        {template.description}
                    </p>
                )}
            </div>
        </div>
    );
}
