import React, { useMemo } from "react";

interface MapNode {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
}

interface MapEdge {
    source: string;
    target: string;
}

interface RawNode {
    id?: string;
    type: string;
    name?: string;
    position?: { x: number; y: number };
    data?: { label?: string; integrationProvider?: string; provider?: string };
    config?: { provider?: string; integrationProvider?: string };
}

export interface MapDefinition {
    nodes?: Record<string, RawNode> | RawNode[];
    edges?: MapEdge[];
}

interface TemplateMapProps {
    definition: MapDefinition;
    /** Seconds to offset the run so neighbouring maps do not move in step. */
    delay?: number;
}

const VIEW_W = 320;
const VIEW_H = 118;
const NODE_W = 50;
const NODE_H = 20;
const PAD = 8;

const TYPE_LABEL: Record<string, string> = {
    input: "input",
    trigger: "trigger",
    files: "files",
    url: "url",
    audioInput: "audio",
    llm: "llm",
    vision: "vision",
    embeddings: "embed",
    knowledgeBaseQuery: "knowledge",
    imageGeneration: "image",
    videoGeneration: "video",
    router: "router",
    conditional: "if",
    switch: "switch",
    loop: "loop",
    code: "code",
    wait: "wait",
    humanReview: "review",
    transform: "transform",
    http: "http",
    chartGeneration: "chart",
    spreadsheetGeneration: "sheet",
    audioTranscription: "transcribe",
    ocrExtraction: "ocr",
    pdfGeneration: "pdf",
    pdfExtract: "pdf",
    screenshotCapture: "screenshot",
    webSearch: "search",
    webBrowse: "browse",
    fileDownload: "download",
    fileRead: "read",
    fileWrite: "write",
    "shared-memory": "memory",
    database: "database",
    output: "output",
    templateOutput: "output",
    audioOutput: "audio",
    integration: "integration"
};

function nodeLabel(node: RawNode): string {
    const provider =
        node.data?.integrationProvider ??
        node.data?.provider ??
        node.config?.integrationProvider ??
        undefined;
    if (node.type === "integration" && provider) return provider.replace(/[-_]/g, " ");
    return TYPE_LABEL[node.type] ?? node.type.toLowerCase();
}

const MAX_COLS = 5;
const MAX_ROWS = 3;

/**
 * Lays the nodes out in columns by their distance from the entry node, at most six columns
 * of three, so the map stays legible at tile size. Anything beyond that is counted, not drawn.
 */
function layout(definition: MapDefinition): { nodes: MapNode[]; edges: MapEdge[]; hidden: number } {
    const raw: RawNode[] = Array.isArray(definition.nodes)
        ? definition.nodes
        : Object.entries(definition.nodes ?? {}).map(([key, node]) => ({ id: key, ...node }));
    const usable = raw.filter((node) => node.type !== "comment" && node.id);
    if (usable.length === 0) return { nodes: [], edges: [], hidden: 0 };

    const ids = new Set(usable.map((node) => node.id as string));
    const edges = (definition.edges ?? []).filter(
        (edge) => ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target
    );

    // Longest path from any entry node, relaxed a bounded number of times so loops cannot hang it
    const depth = new Map<string, number>();
    const hasIncoming = new Set(edges.map((edge) => edge.target));
    usable.forEach((node) =>
        depth.set(node.id as string, hasIncoming.has(node.id as string) ? -1 : 0)
    );
    if (![...depth.values()].some((d) => d === 0)) depth.set(usable[0].id as string, 0);
    for (let pass = 0; pass < usable.length; pass++) {
        let changed = false;
        for (const edge of edges) {
            const from = depth.get(edge.source) ?? -1;
            if (from < 0) continue;
            const next = Math.min(from + 1, MAX_COLS + 2);
            if ((depth.get(edge.target) ?? -1) < next) {
                depth.set(edge.target, next);
                changed = true;
            }
        }
        if (!changed) break;
    }
    usable.forEach((node) => {
        if ((depth.get(node.id as string) ?? -1) < 0) depth.set(node.id as string, 0);
    });

    const columns = new Map<number, RawNode[]>();
    usable.forEach((node) => {
        const d = depth.get(node.id as string) ?? 0;
        columns.set(d, [...(columns.get(d) ?? []), node]);
    });
    const colCount = Math.min(MAX_COLS, Math.max(...columns.keys()) + 1);
    const nodes: MapNode[] = [];
    for (let c = 0; c < colCount; c++) {
        const members = [...(columns.get(c) ?? [])]
            .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0))
            .slice(0, MAX_ROWS);
        const x =
            colCount === 1
                ? (VIEW_W - NODE_W) / 2
                : PAD + (c * (VIEW_W - PAD * 2 - NODE_W)) / (colCount - 1);
        members.forEach((node, r) => {
            const y = PAD + ((r + 0.5) * (VIEW_H - PAD * 2)) / members.length - NODE_H / 2;
            nodes.push({ id: node.id as string, type: node.type, label: nodeLabel(node), x, y });
        });
    }
    const shown = new Set(nodes.map((node) => node.id));
    return {
        nodes,
        edges: edges.filter((edge) => shown.has(edge.source) && shown.has(edge.target)),
        hidden: usable.length - nodes.length
    };
}

function edgePath(from: MapNode, to: MapNode): string {
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const dx = Math.max(14, Math.abs(x2 - x1) * 0.45);
    return `M${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/** A small map of a workflow template's real graph, with the run travelling its first path. */
export const TemplateMap: React.FC<TemplateMapProps> = ({ definition, delay = 0 }) => {
    const { nodes, edges, hidden } = useMemo(() => layout(definition), [definition]);
    const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

    // The run follows the first outgoing edge from each node, starting at the leftmost node
    const run = useMemo(() => {
        const sorted = [...nodes].sort((a, b) => a.x - b.x);
        const path: string[] = [];
        let current = sorted[0];
        const seen = new Set<string>();
        while (current && !seen.has(current.id)) {
            seen.add(current.id);
            const next = edges.find((edge) => edge.source === current.id);
            const target = next ? byId.get(next.target) : undefined;
            if (!target) break;
            path.push(edgePath(current, target));
            current = target;
        }
        return { d: path.join(" "), hops: path.length, hit: [...seen] };
    }, [nodes, edges, byId]);

    if (nodes.length === 0) return null;

    const hitIndex = new Map(run.hit.map((id, index) => [id, index]));
    const runSeconds = Math.max(1.2, run.hops * 0.7);
    const start = 1.4 / 7;
    const end = Math.min(0.9, (1.4 + runSeconds) / 7);

    return (
        <svg className="tmap" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" aria-hidden="true">
            {edges.map((edge) => {
                const from = byId.get(edge.source);
                const to = byId.get(edge.target);
                if (!from || !to) return null;
                return (
                    <path
                        key={`${edge.source}-${edge.target}`}
                        d={edgePath(from, to)}
                        fill="none"
                        stroke="#4a4a52"
                        strokeWidth="1.2"
                    />
                );
            })}
            {run.hops > 0 && (
                <circle r="3" fill="#fafafa">
                    <animateMotion
                        dur="7s"
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                        path={run.d}
                        keyPoints="0;0;1;1"
                        keyTimes={`0;${start};${end};1`}
                        calcMode="linear"
                    />
                    <animate
                        attributeName="opacity"
                        values="0;0;1;1;0;0"
                        keyTimes={`0;${start - 0.01};${start};${end};${end + 0.02};1`}
                        dur="7s"
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                    />
                </circle>
            )}
            {nodes.map((node) => {
                const index = hitIndex.get(node.id);
                const hitDelay =
                    index === undefined
                        ? undefined
                        : delay + 1.4 + (index / Math.max(1, run.hops)) * runSeconds;
                return (
                    <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                        <rect
                            width={NODE_W}
                            height={NODE_H}
                            rx="5"
                            fill="#121216"
                            stroke="#2a2a30"
                            strokeWidth="1"
                        />
                        <text x="8" y="13.5" fill="#c6c6cc" fontSize="8.5">
                            {node.label.length > 8 ? `${node.label.slice(0, 7)}…` : node.label}
                        </text>
                        <circle
                            cx={NODE_W - 7}
                            cy={NODE_H / 2}
                            r="2"
                            fill="#3a3a42"
                            className={hitDelay === undefined ? undefined : "tmhit"}
                            style={
                                hitDelay === undefined
                                    ? undefined
                                    : { animationDelay: `${hitDelay}s` }
                            }
                        />
                    </g>
                );
            })}
            {hidden > 0 && (
                <text x={VIEW_W - PAD} y={VIEW_H - 4} textAnchor="end" fill="#6f6f78" fontSize="8">
                    {`+${hidden} more`}
                </text>
            )}
        </svg>
    );
};
