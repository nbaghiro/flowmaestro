import { useMemo } from "react";
import Flow, { Background, BackgroundVariant, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import AudioInputNode from "../../canvas/nodes/AudioInputNode";
import AudioOutputNode from "../../canvas/nodes/AudioOutputNode";
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
import SharedMemoryNode from "../../canvas/nodes/SharedMemoryNode";
import SwitchNode from "../../canvas/nodes/SwitchNode";
import TransformNode from "../../canvas/nodes/TransformNode";
import VisionNode from "../../canvas/nodes/VisionNode";
import WaitNode from "../../canvas/nodes/WaitNode";
import { cn } from "../../lib/utils";

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
    input: InputNode,
    transform: TransformNode,
    "shared-memory": SharedMemoryNode,
    output: OutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode
};

interface WorkflowDefinition {
    nodes?:
        | Record<
              string,
              {
                  type: string;
                  name?: string;
                  position?: { x: number; y: number };
                  config?: Record<string, unknown>;
              }
          >
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
}

interface WorkflowCanvasPreviewProps {
    definition?: WorkflowDefinition;
    height?: string;
    className?: string;
}

export function WorkflowCanvasPreview({
    definition,
    height = "h-40",
    className
}: WorkflowCanvasPreviewProps) {
    const { nodes, edges } = useMemo(() => {
        if (!definition) {
            return { nodes: [], edges: [] };
        }

        // Convert nodes - handle both Record and Array formats
        let nodeEntries: Array<{
            id: string;
            type: string;
            name?: string;
            position?: { x: number; y: number };
            data?: Record<string, unknown>;
            config?: Record<string, unknown>;
        }> = [];

        if (Array.isArray(definition.nodes)) {
            nodeEntries = definition.nodes;
        } else if (definition.nodes && typeof definition.nodes === "object") {
            nodeEntries = Object.entries(definition.nodes).map(([id, node]) => ({
                id,
                ...node
            }));
        }

        const flowNodes: Node[] = nodeEntries.map((node, index) => ({
            id: node.id,
            type: node.type,
            position: node.position || {
                x: 100 + (index % 4) * 250,
                y: 100 + Math.floor(index / 4) * 150
            },
            data: {
                label: node.data?.label || node.name || node.type,
                ...node.data,
                ...node.config,
                status: "idle"
            }
        }));

        const flowEdges: Edge[] = (definition.edges || []).map((edge) => ({
            id: edge.id || `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            animated: false
        }));

        return { nodes: flowNodes, edges: flowEdges };
    }, [definition]);

    // Don't render if no nodes
    if (nodes.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(height, "bg-muted/30 dark:bg-muted relative overflow-hidden", className)}
        >
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
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
            </Flow>
        </div>
    );
}
