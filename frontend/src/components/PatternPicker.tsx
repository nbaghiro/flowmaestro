import {
    MessageSquare,
    Link,
    GitBranch,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    Shield,
    ListTodo,
    Plus,
    type LucideIcon
} from "lucide-react";
import { useMemo } from "react";
import Flow, { Background, BackgroundVariant, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import AudioInputNode from "../canvas/nodes/AudioInputNode";
import AudioOutputNode from "../canvas/nodes/AudioOutputNode";
import CodeNode from "../canvas/nodes/CodeNode";
import ConditionalNode from "../canvas/nodes/ConditionalNode";
import DatabaseNode from "../canvas/nodes/DatabaseNode";
import EmbeddingsNode from "../canvas/nodes/EmbeddingsNode";
import HTTPNode from "../canvas/nodes/HTTPNode";
import InputNode from "../canvas/nodes/InputNode";
import IntegrationNode from "../canvas/nodes/IntegrationNode";
import KnowledgeBaseQueryNode from "../canvas/nodes/KnowledgeBaseQueryNode";
import LLMNode from "../canvas/nodes/LLMNode";
import LoopNode from "../canvas/nodes/LoopNode";
import OutputNode from "../canvas/nodes/OutputNode";
import RouterNode from "../canvas/nodes/RouterNode";
import SharedMemoryNode from "../canvas/nodes/SharedMemoryNode";
import SwitchNode from "../canvas/nodes/SwitchNode";
import TransformNode from "../canvas/nodes/TransformNode";
import VisionNode from "../canvas/nodes/VisionNode";
import WaitForUserNode from "../canvas/nodes/WaitForUserNode";
import WaitNode from "../canvas/nodes/WaitNode";
import { cn } from "../lib/utils";
import { type WorkflowPattern, getAllPatterns } from "../lib/workflowPatterns";

// Register node types for preview
const nodeTypes = {
    llm: LLMNode,
    vision: VisionNode,
    audioInput: AudioInputNode,
    audioOutput: AudioOutputNode,
    embeddings: EmbeddingsNode,
    conditional: ConditionalNode,
    switch: SwitchNode,
    loop: LoopNode,
    code: CodeNode,
    wait: WaitNode,
    "wait-for-user": WaitForUserNode,
    input: InputNode,
    transform: TransformNode,
    "shared-memory": SharedMemoryNode,
    output: OutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode,
    router: RouterNode
};

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
    MessageSquare,
    Link,
    GitBranch,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    Shield,
    ListTodo,
    Plus
};

interface PatternPickerProps {
    selectedPatternId: string | null;
    onSelect: (pattern: WorkflowPattern) => void;
}

interface PatternCardProps {
    pattern: WorkflowPattern;
    isSelected: boolean;
    onClick: () => void;
}

function PatternCard({ pattern, isSelected, onClick }: PatternCardProps) {
    const Icon = iconMap[pattern.icon] || Plus;

    // Parse nodes and edges for React Flow preview
    const { nodes, edges } = useMemo(() => {
        if (!pattern?.definition) {
            return { nodes: [], edges: [] };
        }

        const def = pattern.definition;

        // Convert nodes
        const nodeEntries = Object.entries(def.nodes || {});
        const flowNodes: Node[] = nodeEntries.map(([id, node]) => ({
            id,
            type: (node as { type: string }).type,
            position: (node as { position: { x: number; y: number } }).position || { x: 0, y: 0 },
            data: {
                label: (node as { name: string }).name || (node as { type: string }).type,
                ...(node as { config?: Record<string, unknown> }).config,
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
    }, [pattern?.definition]);

    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-card rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group",
                isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-border hover:border-border/60 hover:shadow-md"
            )}
        >
            {/* React Flow Preview */}
            <div className="h-52 bg-muted/30 relative overflow-hidden">
                <Flow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.1, maxZoom: 1.5 }}
                    minZoom={0.1}
                    maxZoom={1.5}
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

                {/* Selection indicator */}
                {isSelected && (
                    <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with icon */}
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isSelected ? "bg-primary/10" : "bg-muted"
                        )}
                    >
                        <Icon
                            className={cn(
                                "w-4 h-4",
                                isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                        />
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-1">{pattern.name}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {pattern.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded-full">
                        {pattern.nodeCount} nodes
                    </span>
                    <span>{pattern.useCase}</span>
                </div>
            </div>
        </div>
    );
}

export function PatternPicker({ selectedPatternId, onSelect }: PatternPickerProps) {
    const patterns = getAllPatterns();

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                    Choose a starting point
                </h3>
                <p className="text-sm text-muted-foreground">
                    Select a pattern to start with, or create a blank workflow
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[70vh] overflow-y-scroll pr-2">
                {patterns.map((pattern) => (
                    <PatternCard
                        key={pattern.id}
                        pattern={pattern}
                        isSelected={selectedPatternId === pattern.id}
                        onClick={() => onSelect(pattern)}
                    />
                ))}
            </div>
        </div>
    );
}
