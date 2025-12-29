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
