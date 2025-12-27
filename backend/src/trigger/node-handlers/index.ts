/**
 * Node Handlers Module
 *
 * Pluggable handlers for all workflow node types.
 */

// Types
export type {
    NodeHandler,
    NodeHandlerInput,
    NodeHandlerOutput,
    NodeSignals,
    HandlerCategory
} from "./types";

export { BaseNodeHandler } from "./types";

// Registry
export { NodeHandlerRegistry, handlerRegistry } from "./registry";

// Handlers
export { TransformHandler } from "./transform-handler";
export { LogicHandler } from "./logic-handler";
export { LLMHandler } from "./llm-handler";
export { HTTPHandler } from "./http-handler";
export { ControlFlowHandler } from "./control-flow-handler";
export { InputOutputHandler } from "./input-output-handler";
export { AgentHandler } from "./agent-handler";
export { IntegrationHandler } from "./integration-handler";

// Register default handlers
import { handlerRegistry } from "./registry";
import { TransformHandler } from "./transform-handler";
import { LogicHandler } from "./logic-handler";
import { LLMHandler } from "./llm-handler";
import { HTTPHandler } from "./http-handler";
import { ControlFlowHandler } from "./control-flow-handler";
import { InputOutputHandler } from "./input-output-handler";
import { AgentHandler } from "./agent-handler";
import { IntegrationHandler } from "./integration-handler";

// Auto-register handlers (order matters - more specific handlers first)
handlerRegistry.register(new TransformHandler());
handlerRegistry.register(new LogicHandler());
handlerRegistry.register(new LLMHandler());
handlerRegistry.register(new HTTPHandler());
handlerRegistry.register(new ControlFlowHandler());
handlerRegistry.register(new InputOutputHandler());
handlerRegistry.register(new AgentHandler());
handlerRegistry.register(new IntegrationHandler()); // Last - handles many provider types
