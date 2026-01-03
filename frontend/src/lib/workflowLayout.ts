/**
 * Auto-layout algorithm for positioning workflow nodes
 * Uses a level-based layout with special handling for conditional branches
 */

export interface LayoutNode {
    id: string;
    type: string;
}

export interface LayoutEdge {
    source: string;
    target: string;
    sourceHandle?: string;
}

export interface NodePosition {
    x: number;
    y: number;
}

const HORIZONTAL_SPACING = 250;
const VERTICAL_SPACING = 150;
const START_X = 100;
const START_Y = 300;

/**
 * Auto-layout nodes using a level-based algorithm
 */
export function autoLayoutNodes(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    entryNodeId: string
): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    // Build adjacency list for graph traversal
    const adjacencyList = buildAdjacencyList(nodes, edges);

    // Assign levels to nodes using BFS
    const levels = assignLevels(entryNodeId, adjacencyList);

    // Group nodes by level
    const nodesByLevel = groupNodesByLevel(nodes, levels);

    // Calculate positions for each level
    for (const [level, levelNodes] of nodesByLevel.entries()) {
        const x = START_X + level * HORIZONTAL_SPACING;

        // Check if any nodes in this level are branching targets
        const branchInfo = getBranchInfo(levelNodes, edges);

        levelNodes.forEach((node, index) => {
            let y = START_Y;

            if (branchInfo.has(node.id)) {
                // This is a branch target - offset based on branch type
                const branch = branchInfo.get(node.id)!;
                if (branch.handle === "true") {
                    y = START_Y - VERTICAL_SPACING;
                } else if (branch.handle === "false") {
                    y = START_Y + VERTICAL_SPACING;
                } else {
                    // Switch node or other multi-output
                    y = START_Y + (index - levelNodes.length / 2) * VERTICAL_SPACING;
                }
            } else {
                // Regular node - stack vertically if multiple at same level
                const offset = (index - Math.floor(levelNodes.length / 2)) * VERTICAL_SPACING;
                y = START_Y + offset;
            }

            positions.set(node.id, { x, y });
        });
    }

    return positions;
}

/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    // Initialize with all nodes
    nodes.forEach((node) => {
        adjacencyList.set(node.id, []);
    });

    // Add edges
    edges.forEach((edge) => {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
    });

    return adjacencyList;
}

/**
 * Assign level (depth) to each node using BFS
 */
function assignLevels(
    entryNodeId: string,
    adjacencyList: Map<string, string[]>
): Map<string, number> {
    const levels = new Map<string, number>();
    const queue: Array<{ nodeId: string; level: number }> = [{ nodeId: entryNodeId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const { nodeId, level } = queue.shift()!;

        if (visited.has(nodeId)) {
            continue;
        }

        visited.add(nodeId);
        levels.set(nodeId, level);

        const neighbors = adjacencyList.get(nodeId) || [];
        neighbors.forEach((neighbor) => {
            if (!visited.has(neighbor)) {
                queue.push({ nodeId: neighbor, level: level + 1 });
            }
        });
    }

    return levels;
}

/**
 * Group nodes by their level
 */
function groupNodesByLevel(
    nodes: LayoutNode[],
    levels: Map<string, number>
): Map<number, LayoutNode[]> {
    const nodesByLevel = new Map<number, LayoutNode[]>();

    nodes.forEach((node) => {
        const level = levels.get(node.id) ?? 0;
        const levelNodes = nodesByLevel.get(level) || [];
        levelNodes.push(node);
        nodesByLevel.set(level, levelNodes);
    });

    return nodesByLevel;
}

/**
 * Get branch information for nodes (which nodes are targets of conditional branches)
 */
function getBranchInfo(
    levelNodes: LayoutNode[],
    edges: LayoutEdge[]
): Map<string, { handle: string }> {
    const branchInfo = new Map<string, { handle: string }>();

    levelNodes.forEach((node) => {
        // Find edges that target this node
        const incomingEdges = edges.filter((edge) => edge.target === node.id);

        // Check if any incoming edge has a sourceHandle (indicating a branch)
        incomingEdges.forEach((edge) => {
            if (edge.sourceHandle && edge.sourceHandle !== "output") {
                branchInfo.set(node.id, { handle: edge.sourceHandle });
            }
        });
    });

    return branchInfo;
}

/**
 * Convert generated workflow to React Flow format with positions
 */
export interface GeneratedWorkflowNode {
    id: string;
    type: string;
    label: string;
    config: Record<string, unknown>;
}

export interface GeneratedWorkflowEdge {
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
}

export interface ReactFlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        status?: string;
        [key: string]: unknown; // Config fields are spread directly into data
    };
}

export interface ReactFlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export function convertToReactFlowFormat(
    generatedNodes: GeneratedWorkflowNode[],
    generatedEdges: GeneratedWorkflowEdge[],
    entryNodeId: string
): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    // Calculate positions using auto-layout
    const layoutNodes: LayoutNode[] = generatedNodes.map((n) => ({
        id: n.id,
        type: n.type
    }));

    const layoutEdges: LayoutEdge[] = generatedEdges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle
    }));

    const positions = autoLayoutNodes(layoutNodes, layoutEdges, entryNodeId);

    // Convert to React Flow format
    // Spread config directly into data (not nested) to match how nodes are saved
    const nodes: ReactFlowNode[] = generatedNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: positions.get(node.id) || { x: 0, y: 0 },
        data: {
            label: node.label,
            ...node.config,
            status: "idle"
        }
    }));

    const edges: ReactFlowEdge[] = generatedEdges.map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
    }));

    return { nodes, edges };
}
