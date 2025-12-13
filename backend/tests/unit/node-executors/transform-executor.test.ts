import { describe, it, expect } from "@jest/globals";
import { executeTransformNode } from "../../../src/temporal/activities/node-executors/data-processing/transform-executor";

describe("Transform Executor", () => {
    it("maps array items using JavaScript expression", async () => {
        const config = {
            operation: "map" as const,
            inputData: "${items}",
            expression: "item => ({ value: item * 2 })",
            outputVariable: "out"
        };

        const context = { items: [1, 2, 3] };

        const result = await executeTransformNode(config, context);

        expect(result.out).toEqual([{ value: 2 }, { value: 4 }, { value: 6 }]);
    });

    it("evaluates JSONata expression", async () => {
        const config = {
            operation: "custom" as const,
            inputData: "${items}",
            expression: "$sum(items)",
            outputVariable: "sum"
        };

        const context = { items: [5, 5, 10] };

        const result = await executeTransformNode(config, context);

        expect(result.sum).toBe(20);
    });

    it("parses JSON strings", async () => {
        const config = {
            operation: "parseJSON" as const,
            inputData: "${json}",
            expression: "",
            outputVariable: "parsed"
        };

        const context = { json: '{"user":{"name":"Alice"}}' };

        const result = await executeTransformNode(config, context);

        expect(result.parsed).toEqual({ user: { name: "Alice" } });
    });

    it("throws on invalid JS expression", async () => {
        const config = {
            operation: "map" as const,
            inputData: "${items}",
            expression: "item => item.", // invalid
            outputVariable: "out"
        };

        const context = { items: [1, 2] };

        await expect(executeTransformNode(config, context)).rejects.toThrow();
    });
});
