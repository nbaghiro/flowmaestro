import { describe, it, expect } from "@jest/globals";
import { executeRouterNode } from "../../src/temporal/activities/node-executors/router-executor";

describe("Router Executor", () => {
    it("routes to the first matching condition", async () => {
        const config = {
            conditions: [
                { name: "A", expression: "x === 1" },
                { name: "B", expression: "x === 2" }
            ],
            defaultOutput: "default",
            evaluationMode: "first" as const
        };

        const context = { x: 1 };

        const result = await executeRouterNode(config, context);

        expect(result.__routeOutputs).toEqual(["A"]);
    });

    it("routes to all matching conditions in 'all' mode", async () => {
        const config = {
            conditions: [
                { name: "A", expression: "x > 0" },
                { name: "B", expression: "x === 1" }
            ],
            defaultOutput: "default",
            evaluationMode: "all" as const
        };

        const context = { x: 1 };

        const result = await executeRouterNode(config, context);

        expect(result.__routeOutputs).toEqual(["A", "B"]);
    });

    it("falls back to default output when no conditions match", async () => {
        const config = {
            conditions: [{ name: "A", expression: "x === 2" }],
            defaultOutput: "default",
            evaluationMode: "first" as const
        };

        const context = { x: 1 };

        const result = await executeRouterNode(config, context);

        expect(result.__routeOutputs).toEqual(["default"]);
    });

    it("throws on dangerous expression", async () => {
        const config = {
            conditions: [{ name: "A", expression: "process.exit()" }],
            defaultOutput: "default",
            evaluationMode: "first" as const
        };

        const context = {};

        await expect(executeRouterNode(config, context)).rejects.toThrow();
    });
});
