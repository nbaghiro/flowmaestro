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

// Constants for layout calculations
const HORIZONTAL_SPACING = 380;
const VERTICAL_SPACING = 200;
const START_X = 100;
const START_Y = 100;
const COMPONENT_GAP = 350;

// Node types that should be prioritized as entry points (leftmost)
const ENTRY_NODE_TYPES = ["trigger", "input", "files", "url", "audioInput"];

// Node types that should be positioned last (rightmost)
const EXIT_NODE_TYPES = ["output", "templateOutput", "audioOutput"];

/**
 * Enhanced auto-layout for existing workflows
 * Handles: linear chains, branching, disconnected components, messy layouts
 */
export function autoLayoutWorkflow(
    nodes: Array<{ id: string; type?: string; position: { x: number; y: number } }>,
    edges: Array<{ source: string; target: string; sourceHandle?: string | null }>
): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    if (nodes.length === 0) return positions;

    // Filter out comment nodes (they should keep their positions)
    const workflowNodes = nodes.filter((n) => n.type !== "comment");
    const commentNodes = nodes.filter((n) => n.type === "comment");

    if (workflowNodes.length === 0) {
        // Only comments, keep their positions
        for (const comment of commentNodes) {
            positions.set(comment.id, comment.position);
        }
        return positions;
    }

    // Build graph structures
    const { adjacencyList, reverseAdjacencyList, inDegree } = buildGraphStructures(
        workflowNodes,
        edges
    );

    // Find connected components
    const components = findConnectedComponents(workflowNodes, adjacencyList, reverseAdjacencyList);

    // Layout each component
    let componentOffsetY = START_Y;

    for (const component of components) {
        const componentEdges = edges.filter(
            (e) =>
                component.some((n) => n.id === e.source) && component.some((n) => n.id === e.target)
        );

        const componentPositions = layoutComponent(
            component,
            componentEdges,
            inDegree,
            componentOffsetY
        );

        // Merge positions
        for (const [id, pos] of componentPositions) {
            positions.set(id, pos);
        }

        // Calculate next component offset
        if (componentPositions.size > 0) {
            const yValues = Array.from(componentPositions.values()).map((p) => p.y);
            const maxY = Math.max(...yValues);
            componentOffsetY = maxY + COMPONENT_GAP;
        }
    }

    // Keep comment nodes at their original positions
    for (const comment of commentNodes) {
        positions.set(comment.id, comment.position);
    }

    // Apply wave effect to linear sections to avoid boring straight lines
    applyWaveEffect(positions);

    // Normalize positions to ensure they start from a reasonable origin
    normalizePositions(positions);

    return positions;
}

/**
 * Apply a wave effect to linear sections of the workflow
 * This prevents boring straight-line layouts
 */
function applyWaveEffect(positions: Map<string, NodePosition>): void {
    if (positions.size < 3) return;

    const WAVE_AMPLITUDE = 40; // How much to offset nodes
    const WAVE_THRESHOLD = 20; // Max difference to consider nodes "on same line"

    const posArray = Array.from(positions.entries());

    // Check for horizontal lines (nodes with similar Y values)
    // Group nodes by their approximate Y position
    const yGroups = new Map<number, Array<{ id: string; pos: NodePosition }>>();
    for (const [id, pos] of posArray) {
        // Round Y to nearest threshold to group similar Y values
        const yKey = Math.round(pos.y / WAVE_THRESHOLD) * WAVE_THRESHOLD;
        const group = yGroups.get(yKey) || [];
        group.push({ id, pos });
        yGroups.set(yKey, group);
    }

    // Apply wave to horizontal groups with 3+ nodes
    for (const group of yGroups.values()) {
        if (group.length >= 3) {
            // Sort by X position
            group.sort((a, b) => a.pos.x - b.pos.x);
            // Apply sine wave pattern
            for (let i = 0; i < group.length; i++) {
                const waveOffset = Math.sin((i * Math.PI) / 2) * WAVE_AMPLITUDE;
                const currentPos = positions.get(group[i].id)!;
                positions.set(group[i].id, {
                    x: currentPos.x,
                    y: currentPos.y + waveOffset
                });
            }
        }
    }

    // Check for vertical lines (nodes with similar X values)
    // Group nodes by their approximate X position
    const xGroups = new Map<number, Array<{ id: string; pos: NodePosition }>>();
    for (const [id, pos] of positions.entries()) {
        // Round X to nearest threshold to group similar X values
        const xKey = Math.round(pos.x / WAVE_THRESHOLD) * WAVE_THRESHOLD;
        const group = xGroups.get(xKey) || [];
        group.push({ id, pos });
        xGroups.set(xKey, group);
    }

    // Apply wave to vertical groups with 4+ nodes (more strict for vertical)
    for (const group of xGroups.values()) {
        if (group.length >= 4) {
            // Sort by Y position
            group.sort((a, b) => a.pos.y - b.pos.y);
            // Apply sine wave pattern to X
            for (let i = 0; i < group.length; i++) {
                const waveOffset = Math.sin((i * Math.PI) / 2) * WAVE_AMPLITUDE;
                const currentPos = positions.get(group[i].id)!;
                positions.set(group[i].id, {
                    x: currentPos.x + waveOffset,
                    y: currentPos.y
                });
            }
        }
    }
}

/**
 * Normalize positions to ensure workflow starts from a reasonable origin
 * and all coordinates are valid
 */
function normalizePositions(positions: Map<string, NodePosition>): void {
    if (positions.size === 0) return;

    // Find min X and Y
    let minX = Infinity;
    let minY = Infinity;

    for (const pos of positions.values()) {
        // Skip invalid positions
        if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
            continue;
        }
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
    }

    // If all positions were invalid, reset to defaults
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    // Calculate offset to move workflow to start at (START_X, START_Y)
    const offsetX = START_X - minX;
    const offsetY = START_Y - minY;

    // Apply offset and validate all positions
    for (const [nodeId, pos] of positions) {
        let newX = pos.x + offsetX;
        let newY = pos.y + offsetY;

        // Ensure positions are valid numbers
        if (!Number.isFinite(newX)) newX = START_X;
        if (!Number.isFinite(newY)) newY = START_Y;

        positions.set(nodeId, { x: newX, y: newY });
    }
}

/**
 * Build adjacency lists and degree maps from nodes and edges
 */
function buildGraphStructures(
    nodes: Array<{ id: string; type?: string }>,
    edges: Array<{ source: string; target: string }>
): {
    adjacencyList: Map<string, string[]>;
    reverseAdjacencyList: Map<string, string[]>;
    inDegree: Map<string, number>;
    outDegree: Map<string, number>;
} {
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    // Initialize with all nodes
    for (const node of nodes) {
        adjacencyList.set(node.id, []);
        reverseAdjacencyList.set(node.id, []);
        inDegree.set(node.id, 0);
        outDegree.set(node.id, 0);
    }

    // Build from edges
    for (const edge of edges) {
        const forward = adjacencyList.get(edge.source);
        if (forward) {
            forward.push(edge.target);
            outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
        }

        const reverse = reverseAdjacencyList.get(edge.target);
        if (reverse) {
            reverse.push(edge.source);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }
    }

    return { adjacencyList, reverseAdjacencyList, inDegree, outDegree };
}

/**
 * Find connected components using DFS (treating graph as undirected)
 */
function findConnectedComponents(
    nodes: Array<{ id: string; type?: string }>,
    adjacencyList: Map<string, string[]>,
    reverseAdjacencyList: Map<string, string[]>
): Array<Array<{ id: string; type?: string }>> {
    const visited = new Set<string>();
    const components: Array<Array<{ id: string; type?: string }>> = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const node of nodes) {
        if (visited.has(node.id)) continue;

        const component: Array<{ id: string; type?: string }> = [];
        const stack = [node.id];

        while (stack.length > 0) {
            const nodeId = stack.pop()!;
            if (visited.has(nodeId)) continue;

            visited.add(nodeId);
            const nodeObj = nodeMap.get(nodeId);
            if (nodeObj) component.push(nodeObj);

            // Add neighbors (both directions for undirected connectivity)
            const forward = adjacencyList.get(nodeId) || [];
            const reverse = reverseAdjacencyList.get(nodeId) || [];
            const neighbors = [...forward, ...reverse];

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        if (component.length > 0) {
            components.push(component);
        }
    }

    return components;
}

/**
 * Layout a single connected component
 */
function layoutComponent(
    nodes: Array<{ id: string; type?: string }>,
    edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
    _globalInDegree: Map<string, number>,
    startY: number
): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    if (nodes.length === 0) return positions;

    // Single node case
    if (nodes.length === 1) {
        positions.set(nodes[0].id, { x: START_X, y: startY });
        return positions;
    }

    // Build local graph structures
    const { adjacencyList, inDegree } = buildGraphStructures(nodes, edges);

    // Find entry points (prioritize trigger/input nodes, then nodes with no incoming edges)
    const entryPoints = findEntryPoints(nodes, inDegree);

    // Assign levels using longest path from entry points
    const levels = assignLevelsLongestPath(nodes, adjacencyList, entryPoints);

    // Group nodes by level
    const nodesByLevel = groupByLevel(nodes, levels);

    // Order nodes within each level to minimize edge crossings
    const orderedNodesByLevel = minimizeEdgeCrossings(nodesByLevel, edges, adjacencyList);

    // Calculate positions
    calculatePositions(orderedNodesByLevel, edges, startY, positions);

    return positions;
}

/**
 * Find entry points for a component
 */
function findEntryPoints(
    nodes: Array<{ id: string; type?: string }>,
    inDegree: Map<string, number>
): string[] {
    // Find nodes with no incoming edges (true entry points)
    const noIncomingNodes = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);

    if (noIncomingNodes.length > 0) {
        // Prioritize entry-type nodes among those with no incoming edges
        const entryTypeNodes = noIncomingNodes.filter(
            (n) => n.type && ENTRY_NODE_TYPES.includes(n.type)
        );
        if (entryTypeNodes.length > 0) {
            return entryTypeNodes.map((n) => n.id);
        }
        return noIncomingNodes.map((n) => n.id);
    }

    // If all nodes have incoming edges (cycle), pick the first node
    // Prefer entry-type nodes if available
    const entryTypeNodes = nodes.filter((n) => n.type && ENTRY_NODE_TYPES.includes(n.type));
    if (entryTypeNodes.length > 0) {
        return [entryTypeNodes[0].id];
    }

    return [nodes[0].id];
}

/**
 * Assign levels using longest path algorithm (handles DAGs better than BFS)
 */
function assignLevelsLongestPath(
    nodes: Array<{ id: string; type?: string }>,
    adjacencyList: Map<string, string[]>,
    entryPoints: string[]
): Map<string, number> {
    const levels = new Map<string, number>();
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Initialize all entry points at level 0
    for (const entry of entryPoints) {
        levels.set(entry, 0);
    }

    // Use iterative approach to find longest path to each node
    let changed = true;
    let iterations = 0;
    const maxIterations = nodes.length * 2; // Prevent infinite loops in cyclic graphs

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        for (const node of nodes) {
            const neighbors = adjacencyList.get(node.id) || [];

            for (const neighbor of neighbors) {
                if (!nodeIds.has(neighbor)) continue;

                const currentLevel = levels.get(node.id);
                if (currentLevel === undefined) continue;

                const neighborLevel = levels.get(neighbor);
                const newLevel = currentLevel + 1;

                if (neighborLevel === undefined || newLevel > neighborLevel) {
                    levels.set(neighbor, newLevel);
                    changed = true;
                }
            }
        }
    }

    // Assign level 0 to any unvisited nodes (isolated or in cycles not reachable from entry)
    for (const node of nodes) {
        if (!levels.has(node.id)) {
            levels.set(node.id, 0);
        }
    }

    return levels;
}

/**
 * Group nodes by their assigned level
 */
function groupByLevel(
    nodes: Array<{ id: string; type?: string }>,
    levels: Map<string, number>
): Map<number, Array<{ id: string; type?: string }>> {
    const nodesByLevel = new Map<number, Array<{ id: string; type?: string }>>();

    for (const node of nodes) {
        const level = levels.get(node.id) || 0;
        const levelNodes = nodesByLevel.get(level) || [];
        levelNodes.push(node);
        nodesByLevel.set(level, levelNodes);
    }

    // Sort nodes within each level: input types first, output types last
    for (const levelNodes of nodesByLevel.values()) {
        levelNodes.sort((a, b) => {
            const aIsEntry = a.type && ENTRY_NODE_TYPES.includes(a.type);
            const bIsEntry = b.type && ENTRY_NODE_TYPES.includes(b.type);
            const aIsExit = a.type && EXIT_NODE_TYPES.includes(a.type);
            const bIsExit = b.type && EXIT_NODE_TYPES.includes(b.type);

            // Entry nodes come first
            if (aIsEntry && !bIsEntry) return -1;
            if (!aIsEntry && bIsEntry) return 1;

            // Exit nodes come last
            if (aIsExit && !bIsExit) return 1;
            if (!aIsExit && bIsExit) return -1;

            return 0;
        });
    }

    return nodesByLevel;
}

/**
 * Minimize edge crossings using barycenter heuristic
 */
function minimizeEdgeCrossings(
    nodesByLevel: Map<number, Array<{ id: string; type?: string }>>,
    edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
    _adjacencyList: Map<string, string[]>
): Map<number, Array<{ id: string; type?: string }>> {
    const result = new Map(nodesByLevel);
    const levels = Array.from(result.keys()).sort((a, b) => a - b);

    // Multiple passes for better results
    for (let pass = 0; pass < 3; pass++) {
        // Forward pass (left to right)
        for (let i = 1; i < levels.length; i++) {
            const currentLevel = levels[i];
            const prevLevel = levels[i - 1];
            orderLevelByBarycenter(result, currentLevel, prevLevel, edges, "forward");
        }

        // Backward pass (right to left)
        for (let i = levels.length - 2; i >= 0; i--) {
            const currentLevel = levels[i];
            const nextLevel = levels[i + 1];
            orderLevelByBarycenter(result, currentLevel, nextLevel, edges, "backward");
        }
    }

    return result;
}

/**
 * Order nodes in a level based on barycenter of connected nodes in adjacent level
 */
function orderLevelByBarycenter(
    nodesByLevel: Map<number, Array<{ id: string; type?: string }>>,
    currentLevel: number,
    adjacentLevel: number,
    edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
    direction: "forward" | "backward"
): void {
    const currentNodes = nodesByLevel.get(currentLevel);
    const adjacentNodes = nodesByLevel.get(adjacentLevel);

    if (!currentNodes || !adjacentNodes) return;

    // Create position map for adjacent level
    const adjacentPositions = new Map<string, number>();
    adjacentNodes.forEach((node, index) => {
        adjacentPositions.set(node.id, index);
    });

    // Calculate barycenter for each node in current level
    const barycenters: Array<{ node: { id: string; type?: string }; barycenter: number }> = [];

    for (const node of currentNodes) {
        let sum = 0;
        let count = 0;

        for (const edge of edges) {
            let connectedId: string | null = null;

            if (direction === "forward" && edge.target === node.id) {
                connectedId = edge.source;
            } else if (direction === "backward" && edge.source === node.id) {
                connectedId = edge.target;
            }

            if (connectedId && adjacentPositions.has(connectedId)) {
                sum += adjacentPositions.get(connectedId)!;
                count++;
            }
        }

        const barycenter = count > 0 ? sum / count : currentNodes.indexOf(node);
        barycenters.push({ node, barycenter });
    }

    // Sort by barycenter
    barycenters.sort((a, b) => a.barycenter - b.barycenter);

    // Update the level with sorted nodes
    nodesByLevel.set(
        currentLevel,
        barycenters.map((b) => b.node)
    );
}

/**
 * Calculate final positions for all nodes
 */
function calculatePositions(
    nodesByLevel: Map<number, Array<{ id: string; type?: string }>>,
    edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
    startY: number,
    positions: Map<string, NodePosition>
): void {
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

    // Build edge map for branch detection
    const edgesByTarget = new Map<
        string,
        Array<{ source: string; sourceHandle?: string | null }>
    >();
    for (const edge of edges) {
        const targetEdges = edgesByTarget.get(edge.target) || [];
        targetEdges.push({ source: edge.source, sourceHandle: edge.sourceHandle });
        edgesByTarget.set(edge.target, targetEdges);
    }

    for (const level of levels) {
        const levelNodes = nodesByLevel.get(level) || [];
        const x = START_X + level * HORIZONTAL_SPACING;

        // Calculate vertical positions
        const levelHeight = levelNodes.length * VERTICAL_SPACING;
        const levelStartY = startY - levelHeight / 2 + VERTICAL_SPACING / 2;

        for (let i = 0; i < levelNodes.length; i++) {
            const node = levelNodes[i];
            let y = levelStartY + i * VERTICAL_SPACING;

            // Check for branch offset (conditional true/false)
            const incomingEdges = edgesByTarget.get(node.id) || [];
            for (const inEdge of incomingEdges) {
                if (inEdge.sourceHandle === "true") {
                    // True branch - offset up
                    y = Math.min(y, startY - VERTICAL_SPACING / 2);
                } else if (inEdge.sourceHandle === "false") {
                    // False branch - offset down
                    y = Math.max(y, startY + VERTICAL_SPACING / 2);
                } else if (inEdge.sourceHandle && inEdge.sourceHandle.startsWith("case_")) {
                    // Switch case - spread vertically based on case number
                    const caseMatch = inEdge.sourceHandle.match(/case_(\d+)/);
                    if (caseMatch) {
                        const caseIndex = parseInt(caseMatch[1], 10);
                        y = startY + (caseIndex - 1) * VERTICAL_SPACING;
                    }
                }
            }

            positions.set(node.id, { x, y });
        }
    }

    // Second pass: adjust Y positions to avoid overlaps
    adjustForOverlaps(positions, nodesByLevel);
}

/**
 * Adjust positions to avoid overlapping nodes
 */
function adjustForOverlaps(
    positions: Map<string, NodePosition>,
    nodesByLevel: Map<number, Array<{ id: string; type?: string }>>
): void {
    const MIN_Y_GAP = VERTICAL_SPACING * 0.8;

    for (const [_level, levelNodes] of nodesByLevel) {
        // Sort nodes by Y position
        const nodesWithPos = levelNodes
            .map((n) => ({ node: n, pos: positions.get(n.id)! }))
            .filter((np) => np.pos)
            .sort((a, b) => a.pos.y - b.pos.y);

        // Adjust overlapping nodes
        for (let i = 1; i < nodesWithPos.length; i++) {
            const prev = nodesWithPos[i - 1];
            const curr = nodesWithPos[i];

            if (curr.pos.y - prev.pos.y < MIN_Y_GAP) {
                curr.pos.y = prev.pos.y + MIN_Y_GAP;
                positions.set(curr.node.id, curr.pos);
            }
        }
    }
}

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
