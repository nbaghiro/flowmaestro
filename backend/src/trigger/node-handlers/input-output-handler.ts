import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * InputOutputHandler - Handles workflow entry/exit and variable nodes.
 *
 * Supported node types:
 * - start: Workflow entry point
 * - input: Workflow input definition
 * - output: Workflow output definition
 * - variable: Variable get/set operations
 * - echo: Debug/logging output
 * - trigger: Trigger node (webhook, schedule, manual)
 */
export class InputOutputHandler extends BaseNodeHandler {
    protected nodeTypes = ["start", "input", "output", "variable", "echo", "trigger"];

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        try {
            let result: NodeHandlerOutput;

            switch (input.nodeType) {
                case "start":
                case "trigger":
                    result = await this.executeStart(input);
                    break;
                case "input":
                    result = await this.executeInput(input);
                    break;
                case "output":
                    result = await this.executeOutput(input);
                    break;
                case "variable":
                    result = await this.executeVariable(input);
                    break;
                case "echo":
                    result = await this.executeEcho(input);
                    break;
                default:
                    result = this.success({ passthrough: true });
            }

            // Add duration metadata
            if (result.metadata) {
                result.metadata.durationMs = Date.now() - startTime;
            } else {
                result.metadata = { durationMs: Date.now() - startTime };
            }

            return result;
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                { activateErrorPort: true }
            );
        }
    }

    /**
     * Execute start/trigger node.
     * Passes through workflow inputs and trigger metadata.
     */
    private async executeStart(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;

        // Pass through all workflow inputs
        const outputs: JsonObject = {
            ...context.inputs
        };

        // Add trigger metadata if available
        if (config.triggerType) {
            outputs.__trigger = {
                type: config.triggerType as JsonValue,
                timestamp: new Date().toISOString()
            };
        }

        // Add any default values from config
        if (config.defaults && typeof config.defaults === "object") {
            for (const [key, value] of Object.entries(config.defaults)) {
                if (outputs[key] === undefined) {
                    outputs[key] = value as JsonValue;
                }
            }
        }

        return this.success(outputs);
    }

    /**
     * Execute input node.
     * Extracts and validates specific inputs from workflow inputs.
     */
    private async executeInput(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const inputName = config.name as string;
        const inputType = config.type as string;
        const required = config.required !== false;
        const defaultValue = config.default;

        // Get the input value
        let value: JsonValue | undefined;

        if (inputName) {
            value = context.inputs[inputName] as JsonValue | undefined;
        } else {
            // If no specific input name, pass through all inputs
            return this.success({ ...context.inputs });
        }

        // Apply default if value is missing
        if (value === undefined && defaultValue !== undefined) {
            value = defaultValue as JsonValue;
        }

        // Check required
        if (required && value === undefined) {
            return this.failure(`Required input "${inputName}" is missing`, {
                code: "MISSING_INPUT",
                activateErrorPort: true
            });
        }

        // Basic type validation
        if (value !== undefined && inputType) {
            const isValid = this.validateType(value, inputType);
            if (!isValid) {
                return this.failure(
                    `Input "${inputName}" expected type "${inputType}" but got "${typeof value}"`,
                    {
                        code: "TYPE_MISMATCH",
                        activateErrorPort: true
                    }
                );
            }
        }

        return this.success({
            [inputName]: value as JsonValue,
            value: value as JsonValue
        });
    }

    /**
     * Execute output node.
     * Marks the workflow output and optionally transforms it.
     */
    private async executeOutput(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const outputName = config.name as string || "result";
        const sourceNode = config.source as string;
        const sourcePath = config.sourcePath as string;

        let outputValue: JsonValue;

        if (sourceNode) {
            // Get value from a specific node's output
            const nodeOutput = context.nodeOutputs[sourceNode];
            if (nodeOutput) {
                if (sourcePath) {
                    outputValue = this.getNestedValue(nodeOutput, sourcePath) as JsonValue;
                } else {
                    outputValue = nodeOutput as JsonValue;
                }
            } else {
                outputValue = null;
            }
        } else if (config.value !== undefined) {
            // Use explicit value from config
            outputValue = this.resolveValue(config.value, context) as JsonValue;
        } else {
            // Collect all node outputs
            outputValue = context.nodeOutputs as JsonValue;
        }

        return {
            success: true,
            data: {
                [outputName]: outputValue,
                __isOutput: true
            },
            signals: {
                isTerminal: true
            }
        };
    }

    /**
     * Execute variable node.
     * Gets or sets workflow variables.
     */
    private async executeVariable(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const operation = (config.operation as string) || "get";
        const variableName = config.name as string;

        if (!variableName) {
            return this.failure("Variable name is required", {
                code: "MISSING_VARIABLE_NAME",
                activateErrorPort: true
            });
        }

        switch (operation) {
            case "get": {
                const value = context.workflowVariables[variableName];
                return this.success({
                    name: variableName,
                    value: value as JsonValue,
                    exists: value !== undefined
                });
            }
            case "set": {
                const value = this.resolveValue(config.value, context);
                return {
                    success: true,
                    data: {
                        name: variableName,
                        value: value as JsonValue,
                        operation: "set"
                    },
                    signals: {
                        setVariables: {
                            [variableName]: value
                        }
                    }
                };
            }
            case "increment": {
                const current = (context.workflowVariables[variableName] as number) || 0;
                const step = (config.step as number) || 1;
                const newValue = current + step;
                return {
                    success: true,
                    data: {
                        name: variableName,
                        value: newValue,
                        previous: current,
                        operation: "increment"
                    },
                    signals: {
                        setVariables: {
                            [variableName]: newValue
                        }
                    }
                };
            }
            case "decrement": {
                const current = (context.workflowVariables[variableName] as number) || 0;
                const step = (config.step as number) || 1;
                const newValue = current - step;
                return {
                    success: true,
                    data: {
                        name: variableName,
                        value: newValue,
                        previous: current,
                        operation: "decrement"
                    },
                    signals: {
                        setVariables: {
                            [variableName]: newValue
                        }
                    }
                };
            }
            case "append": {
                const current = (context.workflowVariables[variableName] as JsonValue[]) || [];
                const valueToAppend = this.resolveValue(config.value, context);
                const newArray = [...(Array.isArray(current) ? current : []), valueToAppend];
                return {
                    success: true,
                    data: {
                        name: variableName,
                        value: newArray as JsonValue,
                        operation: "append"
                    },
                    signals: {
                        setVariables: {
                            [variableName]: newArray
                        }
                    }
                };
            }
            case "delete": {
                return {
                    success: true,
                    data: {
                        name: variableName,
                        operation: "delete"
                    },
                    signals: {
                        setVariables: {
                            [variableName]: undefined
                        }
                    }
                };
            }
            default:
                return this.failure(`Unknown variable operation: ${operation}`, {
                    code: "UNKNOWN_OPERATION",
                    activateErrorPort: true
                });
        }
    }

    /**
     * Execute echo node.
     * Logs/outputs data for debugging purposes.
     */
    private async executeEcho(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context, nodeId } = input;
        const message = config.message as string;
        const data = config.data;
        const logLevel = (config.level as string) || "info";

        // Resolve message with variables
        let resolvedMessage = message || "";
        if (resolvedMessage) {
            resolvedMessage = this.resolveVariables(resolvedMessage, context);
        }

        // Resolve data
        let resolvedData: JsonValue = null;
        if (data !== undefined) {
            resolvedData = this.resolveValue(data, context) as JsonValue;
        }

        // Log to console (in production, this would go to proper logging)
        const logOutput = {
            nodeId,
            level: logLevel,
            message: resolvedMessage,
            data: resolvedData,
            timestamp: new Date().toISOString()
        };

        // Console log based on level
        switch (logLevel) {
            case "error":
                console.error("[Echo]", logOutput);
                break;
            case "warn":
                console.warn("[Echo]", logOutput);
                break;
            case "debug":
                console.debug("[Echo]", logOutput);
                break;
            default:
                console.info("[Echo]", logOutput);
        }

        return this.success({
            echoed: true,
            message: resolvedMessage,
            data: resolvedData,
            level: logLevel
        });
    }

    /**
     * Validate value type.
     */
    private validateType(value: JsonValue, expectedType: string): boolean {
        switch (expectedType) {
            case "string":
                return typeof value === "string";
            case "number":
                return typeof value === "number";
            case "boolean":
                return typeof value === "boolean";
            case "array":
                return Array.isArray(value);
            case "object":
                return typeof value === "object" && value !== null && !Array.isArray(value);
            case "any":
                return true;
            default:
                return true;
        }
    }

    /**
     * Resolve a value from config or context.
     */
    private resolveValue(
        value: unknown,
        context: NodeHandlerInput["context"]
    ): unknown {
        if (typeof value !== "string") {
            return value;
        }

        // Check if it's a variable reference
        if (value.startsWith("{{") && value.endsWith("}}")) {
            const path = value.slice(2, -2).trim();
            return this.resolvePath(path, context);
        }

        return value;
    }

    /**
     * Resolve variables in a string.
     */
    private resolveVariables(
        text: string,
        context: NodeHandlerInput["context"]
    ): string {
        return text.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
            const value = this.resolvePath(path.trim(), context);
            if (value === undefined || value === null) {
                return "";
            }
            if (typeof value === "object") {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }

    /**
     * Resolve a dot-notation path to a value.
     */
    private resolvePath(
        path: string,
        context: NodeHandlerInput["context"]
    ): unknown {
        const parts = path.split(".");
        const root = parts[0];

        let value: unknown;

        if (root === "inputs") {
            value = context.inputs;
        } else if (root === "variables" || root === "var") {
            value = context.workflowVariables;
        } else if (root === "loop" && context.loopContext) {
            value = context.loopContext;
        } else if (root === "parallel" && context.parallelContext) {
            value = context.parallelContext;
        } else if (context.nodeOutputs[root]) {
            value = context.nodeOutputs[root];
        } else {
            return undefined;
        }

        // Navigate remaining path
        for (let i = 1; i < parts.length && value != null; i++) {
            value = (value as Record<string, unknown>)[parts[i]];
        }

        return value;
    }

    /**
     * Get nested value from object using dot notation.
     */
    private getNestedValue(obj: JsonObject, path: string): unknown {
        const parts = path.split(".");
        let value: unknown = obj;

        for (const part of parts) {
            if (value == null || typeof value !== "object") {
                return undefined;
            }
            value = (value as Record<string, unknown>)[part];
        }

        return value;
    }
}
