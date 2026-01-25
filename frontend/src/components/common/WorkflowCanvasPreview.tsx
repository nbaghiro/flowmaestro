import { useMemo } from "react";
import Flow, { Controls, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { ZoomCompensatedBackground } from "../../canvas/components/ZoomCompensatedBackground";
import { previewNodeTypes } from "../../canvas/nodeTypes";
import { cn } from "../../lib/utils";

export interface WorkflowDefinition {
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
    /** Workflow definition containing nodes and edges */
    definition?: WorkflowDefinition;
    /** Height class (Tailwind), e.g. "h-40", "h-52", "h-full" */
    height?: string;
    /** Additional CSS classes */
    className?: string;
    /** Enable pan and zoom interactions */
    interactive?: boolean;
    /** Show zoom controls (only visible when interactive) */
    showControls?: boolean;
    /** Animate edges */
    animateEdges?: boolean;
    /** Padding for fitView */
    fitViewPadding?: number;
    /** Gap between background dots */
    backgroundGap?: number;
    /** Render even if no nodes (shows empty canvas) */
    renderEmpty?: boolean;
}

/**
 * Shared workflow canvas preview component.
 * Used for workflow cards, template cards, template preview dialogs, and pattern pickers.
 */
export function WorkflowCanvasPreview({
    definition,
    height = "h-40",
    className,
    interactive = false,
    showControls = false,
    animateEdges = false,
    fitViewPadding = 0.1,
    backgroundGap = 16,
    renderEmpty = false
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
            animated: animateEdges
        }));

        return { nodes: flowNodes, edges: flowEdges };
    }, [definition, animateEdges]);

    // Don't render if no nodes (unless renderEmpty is true)
    if (nodes.length === 0 && !renderEmpty) {
        return null;
    }

    return (
        <div
            className={cn(
                height,
                "workflow-preview bg-muted dark:bg-muted relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
                className
            )}
        >
            <Flow
                nodes={nodes}
                edges={edges}
                nodeTypes={previewNodeTypes}
                fitView
                fitViewOptions={{ padding: fitViewPadding }}
                minZoom={0.1}
                maxZoom={interactive ? 1 : 1}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={interactive}
                zoomOnScroll={interactive}
                zoomOnPinch={interactive}
                zoomOnDoubleClick={false}
                preventScrolling={!interactive}
                proOptions={{ hideAttribution: true }}
                className={interactive ? "" : "pointer-events-none"}
            >
                <ZoomCompensatedBackground baseGap={backgroundGap} baseSize={1} />
                {showControls && interactive && <Controls showInteractive={false} />}
            </Flow>
        </div>
    );
}
