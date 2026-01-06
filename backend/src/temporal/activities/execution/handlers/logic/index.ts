/**
 * Logic Execution Module
 *
 * Barrel exports for all logic node executors and handlers.
 */

// Conditional
export {
    executeConditionalNode,
    ConditionalNodeHandler,
    createConditionalNodeHandler,
    type ConditionalNodeConfig,
    type ConditionalNodeResult,
    type ComparisonOperator
} from "./conditional";

// Switch
export {
    executeSwitchNode,
    SwitchNodeHandler,
    createSwitchNodeHandler,
    type SwitchNodeConfig,
    type SwitchNodeResult
} from "./switch";

// Loop
export {
    executeLoopNode,
    LoopNodeHandler,
    createLoopNodeHandler,
    type LoopNodeConfig,
    type LoopNodeResult
} from "./loop";

// Wait
export {
    executeWaitNode,
    WaitNodeHandler,
    createWaitNodeHandler,
    type WaitNodeConfig,
    type WaitNodeResult
} from "./wait";

// Wait for User (human-in-the-loop)
export {
    WaitForUserNodeHandler,
    createWaitForUserNodeHandler,
    type WaitForUserNodeConfig,
    type WaitForUserNodeResult
} from "./wait-for-user";

// Transform
export {
    executeTransformNode,
    TransformNodeHandler,
    createTransformNodeHandler,
    type TransformNodeConfig,
    type TransformNodeResult
} from "./transform";

// Shared Memory
export {
    executeSharedMemoryWithContext,
    SharedMemoryNodeHandler,
    createSharedMemoryNodeHandler,
    type SharedMemoryNodeConfig,
    type SharedMemoryNodeResult
} from "./shared-memory";

// Code
export {
    executeCodeNode,
    CodeNodeHandler,
    createCodeNodeHandler,
    type CodeNodeConfig,
    type CodeNodeResult
} from "./code";
