// Re-export workflow layout functions from shared package
// This maintains backwards compatibility with existing imports

export {
    // Types
    type LayoutNode,
    type LayoutEdge,
    type NodePosition,
    type GeneratedWorkflowNode,
    type GeneratedWorkflowEdge,
    type ReactFlowNode,
    type ReactFlowEdge,
    // Constants
    HORIZONTAL_SPACING,
    VERTICAL_SPACING,
    START_X,
    START_Y,
    COMPONENT_GAP,
    ENTRY_NODE_TYPES,
    EXIT_NODE_TYPES,
    // Functions
    autoLayoutWorkflow,
    autoLayoutNodes,
    convertToReactFlowFormat
} from "@flowmaestro/shared";
