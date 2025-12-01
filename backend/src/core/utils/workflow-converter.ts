/**
 * Workflow Definition Converter
 *
 * Converts between frontend workflow format (array-based with 'data' property)
 * and backend workflow format (Record-based with 'config' property)
 */

import { WorkflowDefinition, WorkflowNode } from "@flowmaestro/shared";

export interface FrontendWorkflowNode {
    id: string;
    type: string;
    data: Record<string, unknown>;
    position?: { x: number; y: number };
}

export interface FrontendWorkflowDefinition {
    nodes: FrontendWorkflowNode[];
    edges: Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle?: string;
    }>;
}

/**
 * Convert frontend workflow format to backend format
 */
export function convertFrontendToBackend(
    frontendWorkflow: FrontendWorkflowDefinition,
    workflowName: string = "Untitled Workflow"
): WorkflowDefinition {
    const executableNodes = frontendWorkflow.nodes.filter(
        (n) => (n.type || "").toLowerCase() !== "comment"
    );
    if (executableNodes.length === 0) {
        throw new Error(`No executable nodes found for workflow: ${workflowName}`);
    }
    const executableNodeIds = new Set(executableNodes.map((n) => n.id));
    const executableEdges = frontendWorkflow.edges.filter(
        (e) => executableNodeIds.has(e.source) && executableNodeIds.has(e.target)
    );

    const nodesRecord: Record<string, WorkflowNode> = {};
    for (const node of executableNodes) {
        const { id, type, data, position } = node;
        const nodeName =
            (data.label as string) ||
            (data.inputName as string) ||
            (data.outputName as string) ||
            type;

        nodesRecord[id] = {
            type,
            name: nodeName,
            config: JSON.parse(JSON.stringify(data)),
            position: position || { x: 0, y: 0 }
        };
    }

    const inputNode = executableNodes.find((n) => n.type === "input");
    const entryPoint = inputNode?.id || executableNodes[0]?.id;
    if (!entryPoint) {
        throw new Error(`No entry point found for workflow: ${workflowName}`);
    }

    return stripNonExecutableNodes({
        name: workflowName,
        nodes: nodesRecord,
        edges: executableEdges,
        entryPoint,
        settings: {
            timeout: 300000, // 5 minutes
            maxConcurrentNodes: 10,
            enableCache: false
        }
    });
}

/**
 * Convert backend workflow format to frontend format
 */
export function convertBackendToFrontend(
    backendWorkflow: WorkflowDefinition
): FrontendWorkflowDefinition {
    const nodesArray: FrontendWorkflowNode[] = [];

    // Convert nodes record to array
    for (const [id, node] of Object.entries(backendWorkflow.nodes)) {
        nodesArray.push({
            id,
            type: node.type,
            data: node.config,
            position: node.position
        });
    }

    return {
        nodes: nodesArray,
        edges: backendWorkflow.edges
    };
}

/**
 * Remove non-executable nodes (e.g., comments) from a backend workflow definition.
 */
export function stripNonExecutableNodes(
    workflow: WorkflowDefinition,
    workflowName: string = "Untitled Workflow"
): WorkflowDefinition {
    const executableEntries = Object.entries(workflow.nodes).filter(
        ([, node]) => (node.type || "").toLowerCase() !== "comment"
    );

    if (executableEntries.length === 0) {
        throw new Error(`No executable nodes found for workflow: ${workflowName}`);
    }

    const executableNodeIds = new Set(executableEntries.map(([id]) => id));
    const nodes: Record<string, WorkflowNode> = Object.fromEntries(executableEntries);

    const edges = workflow.edges.filter(
        (e) => executableNodeIds.has(e.source) && executableNodeIds.has(e.target)
    );

    let entryPoint = workflow.entryPoint;
    if (!executableNodeIds.has(entryPoint)) {
        entryPoint = executableEntries[0][0];
    }

    return {
        ...workflow,
        nodes,
        edges,
        entryPoint
    };
}
