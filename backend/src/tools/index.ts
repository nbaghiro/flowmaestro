/**
 * FlowMaestro Tools Module
 *
 * This module provides a unified tool system for agents, personas, and workflows.
 *
 * Architecture:
 * - Built-in tools: Core functionality (web search, code execution, file operations, etc.)
 * - Integration tools: MCP-based tools from user's connected providers
 *
 * Usage patterns:
 * - Agents: Explicit tool assignment - only specified tools are available
 * - Personas: Automatic access to ALL tools (built-in + integrations)
 * - Workflows: Direct function import for programmatic use
 *
 * @example Agent usage (explicit tools)
 * ```typescript
 * import { getToolsForAgent, executeTool } from "../tools";
 *
 * const tools = await getToolsForAgent(agent.available_tools, userId, workspaceId);
 * const result = await executeTool("web_search", { query: "..." }, context);
 * ```
 *
 * @example Persona usage (all tools)
 * ```typescript
 * import { getAllToolsForUser, toLLMFormatArray } from "../tools";
 *
 * const collection = await getAllToolsForUser(userId, workspaceId);
 * const llmTools = toLLMFormatArray(collection.all());
 * ```
 *
 * @example Workflow usage (direct import)
 * ```typescript
 * import { webSearchTool, createTestContext } from "../tools";
 *
 * const result = await webSearchTool.execute(
 *   { query: "example" },
 *   createTestContext({ userId, workspaceId })
 * );
 * ```
 */

// Types
export type {
    ToolCategory,
    ToolRiskLevel,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolDefinition,
    BuiltInTool,
    IntegrationTool,
    AnyTool,
    ToolCollection,
    ToolRegistry,
    LLMToolFormat
} from "./types";

// Type utilities
export { toLLMFormat, toLLMFormatArray, isBuiltInTool, isIntegrationTool } from "./types";

// Built-in tools registry
export {
    builtInTools,
    getBuiltInTool,
    getAllBuiltInTools,
    getBuiltInToolsByCategory,
    getDefaultBuiltInTools,
    getBuiltInToolsByRiskLevel,
    isBuiltInToolName
} from "./builtin";

// Individual built-in tools (for workflow direct import)
export {
    webSearchTool,
    webBrowseTool,
    fileReadTool,
    fileWriteTool,
    imageGenerateTool,
    pdfGenerateTool
} from "./builtin";

// Input types for workflows
export type {
    WebSearchInput,
    WebBrowseInput,
    FileReadInput,
    FileWriteInput,
    ImageGenerateInput,
    PDFGenerateInput
} from "./builtin";

// Executor functions
export { executeTool, getAllToolsForUser, getToolsForAgent } from "./executor";

// Testing utilities
export {
    createTestContext,
    testTool,
    testToolValidation,
    assertions,
    assertSuccess,
    assertFailure,
    assertErrorCode,
    assertDataMatches,
    assertHasMetadata,
    assertCreditCost,
    createMockTool,
    createMockResult,
    createToolTestSuite,
    ToolTestSuite
} from "./testing";

export type { TestContextOptions } from "./testing";
