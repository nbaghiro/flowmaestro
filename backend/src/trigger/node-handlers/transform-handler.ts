import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * TransformHandler - Handles data transformation nodes.
 *
 * Supported node types:
 * - transform: General data transformation
 * - code: JavaScript code execution
 * - jsonata: JSONata expression evaluation
 * - template: Template string interpolation
 * - extract: Extract data from objects
 */
export class TransformHandler extends BaseNodeHandler {
    protected nodeTypes = ["transform", "code", "jsonata", "template", "extract"];

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        try {
            let result: JsonObject;

            switch (input.nodeType) {
                case "transform":
                    result = await this.executeTransform(input);
                    break;
                case "code":
                    result = await this.executeCode(input);
                    break;
                case "jsonata":
                    result = await this.executeJsonata(input);
                    break;
                case "template":
                    result = await this.executeTemplate(input);
                    break;
                case "extract":
                    result = await this.executeExtract(input);
                    break;
                default:
                    result = { passthrough: input.config };
            }

            return this.success(result, { durationMs: Date.now() - startTime });
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                { activateErrorPort: true }
            );
        }
    }

    private async executeTransform(input: NodeHandlerInput): Promise<JsonObject> {
        const { config, context } = input;
        const transformType = config.transformType as string || "passthrough";

        switch (transformType) {
            case "map":
                return this.mapTransform(config, context.nodeOutputs);
            case "filter":
                return this.filterTransform(config, context.nodeOutputs);
            case "reduce":
                return this.reduceTransform(config, context.nodeOutputs);
            case "merge":
                return this.mergeTransform(config, context.nodeOutputs);
            default:
                return { result: config.input || context.inputs };
        }
    }

    private async executeCode(input: NodeHandlerInput): Promise<JsonObject> {
        const { config, context } = input;
        const code = config.code as string;

        if (!code) {
            throw new Error("Code is required for code node");
        }

        // Create a safe execution context
        const safeContext = {
            inputs: context.inputs,
            outputs: context.nodeOutputs,
            variables: context.workflowVariables,
            loop: context.loopContext
        };

        // Execute code in a sandboxed environment
        // Note: In production, use a proper sandbox like vm2
        const fn = new Function("ctx", `
            const { inputs, outputs, variables, loop } = ctx;
            ${code}
        `);

        const result = fn(safeContext);
        return { result: result as JsonValue };
    }

    private async executeJsonata(input: NodeHandlerInput): Promise<JsonObject> {
        const { config, context } = input;
        const expression = config.expression as string;
        const inputData = config.input || context.inputs;

        if (!expression) {
            throw new Error("JSONata expression is required");
        }

        // Dynamic import of jsonata
        const jsonata = await import("jsonata");
        const compiled = jsonata.default(expression);
        const result = await compiled.evaluate(inputData);

        return { result: result as JsonValue };
    }

    private async executeTemplate(input: NodeHandlerInput): Promise<JsonObject> {
        const { config, context } = input;
        const template = config.template as string;

        if (!template) {
            throw new Error("Template string is required");
        }

        // Simple variable interpolation: {{variable}} or {{nodeId.path}}
        const result = template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
            const resolved = this.resolvePath(path.trim(), context);
            return resolved != null ? String(resolved) : "";
        });

        return { result };
    }

    private async executeExtract(input: NodeHandlerInput): Promise<JsonObject> {
        const { config, context } = input;
        const source = (config.source as string) || "";
        const paths = (config.paths as string[]) || [];

        // Get source data
        const sourceData = this.resolvePath(source, context);

        if (!sourceData || typeof sourceData !== "object") {
            return { extracted: {} };
        }

        // Extract specified paths
        const extracted: JsonObject = {};
        for (const path of paths) {
            const value = this.getNestedValue(sourceData as JsonObject, path);
            extracted[path] = value as JsonValue;
        }

        return { extracted };
    }

    private mapTransform(
        config: JsonObject,
        outputs: Record<string, JsonObject>
    ): JsonObject {
        const sourceArray = this.resolveArrayInput(config, outputs);
        const mapExpression = config.mapExpression as string;

        if (!Array.isArray(sourceArray)) {
            return { result: [] };
        }

        const mapped = sourceArray.map((item, index) => {
            if (mapExpression) {
                // Simple expression evaluation
                return this.evaluateMapExpression(mapExpression, item, index);
            }
            return item;
        });

        return { result: mapped as JsonValue };
    }

    private filterTransform(
        config: JsonObject,
        outputs: Record<string, JsonObject>
    ): JsonObject {
        const sourceArray = this.resolveArrayInput(config, outputs);
        const filterExpression = config.filterExpression as string;

        if (!Array.isArray(sourceArray)) {
            return { result: [] };
        }

        const filtered = sourceArray.filter((item) => {
            if (filterExpression) {
                return this.evaluateFilterExpression(filterExpression, item);
            }
            return Boolean(item);
        });

        return { result: filtered as JsonValue };
    }

    private reduceTransform(
        config: JsonObject,
        outputs: Record<string, JsonObject>
    ): JsonObject {
        const sourceArray = this.resolveArrayInput(config, outputs);
        const initialValue = config.initialValue;
        const reduceExpression = config.reduceExpression as string;

        if (!Array.isArray(sourceArray)) {
            return { result: initialValue as JsonValue };
        }

        const reduced = sourceArray.reduce((acc, item) => {
            if (reduceExpression) {
                return this.evaluateReduceExpression(reduceExpression, acc, item);
            }
            return item;
        }, initialValue);

        return { result: reduced as JsonValue };
    }

    private mergeTransform(
        config: JsonObject,
        outputs: Record<string, JsonObject>
    ): JsonObject {
        const sources = (config.sources as string[]) || [];
        const merged: JsonObject = {};

        for (const source of sources) {
            const data = outputs[source];
            if (data && typeof data === "object") {
                Object.assign(merged, data);
            }
        }

        return { merged };
    }

    private resolveArrayInput(
        config: JsonObject,
        outputs: Record<string, JsonObject>
    ): unknown[] {
        const sourceNode = config.sourceNode as string;
        const sourcePath = config.sourcePath as string;

        if (sourceNode && outputs[sourceNode]) {
            const nodeOutput = outputs[sourceNode];
            if (sourcePath) {
                return this.getNestedValue(nodeOutput, sourcePath) as unknown[];
            }
            return Object.values(nodeOutput);
        }

        return (config.input as unknown[]) || [];
    }

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
        } else if (root === "loop") {
            value = context.loopContext;
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

    private evaluateMapExpression(
        expr: string,
        item: unknown,
        index: number
    ): unknown {
        try {
            const fn = new Function("item", "index", `return ${expr}`);
            return fn(item, index);
        } catch {
            return item;
        }
    }

    private evaluateFilterExpression(expr: string, item: unknown): boolean {
        try {
            const fn = new Function("item", `return ${expr}`);
            return Boolean(fn(item));
        } catch {
            return true;
        }
    }

    private evaluateReduceExpression(
        expr: string,
        acc: unknown,
        item: unknown
    ): unknown {
        try {
            const fn = new Function("acc", "item", `return ${expr}`);
            return fn(acc, item);
        } catch {
            return item;
        }
    }
}
