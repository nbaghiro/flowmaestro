import { useMemo } from "react";
import Flow, { Background, BackgroundVariant, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { previewNodeTypes } from "../../canvas/nodeTypes";
import { cn } from "../../lib/utils";

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
            },
            // Set fixed dimensions for preview - prevents content from expanding nodes
            style: { width: 260, height: 160 }
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
            className={cn(
                height,
                "bg-muted dark:bg-muted relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
                className
            )}
        >
            <Flow
                nodes={nodes}
                edges={edges}
                nodeTypes={previewNodeTypes}
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
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#9ca3af" />
            </Flow>
        </div>
    );
}
