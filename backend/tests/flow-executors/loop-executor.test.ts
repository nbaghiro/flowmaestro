import { describe, it, expect } from "@jest/globals";
import { executeLoopNode } from "../../src/temporal/activities/node-executors/loop-executor";

describe("Loop Executor", () => {
    it("passes context through when arrayPath exists (baseline test)", async () => {
        const config = {
            loopType: "forEach" as const,
            arrayPath: "items",
            itemVariable: "item",
            indexVariable: "index"
        };

        const context = { items: ["a", "b", "c"] };

        const result = await executeLoopNode(config, context);

        expect(result).toBeTruthy();
        expect(result.items).toEqual(["a", "b", "c"]);
    });

    it("does not crash on empty arrays", async () => {
        const config = {
            loopType: "forEach" as const,
            arrayPath: "items",
            itemVariable: "item"
        };

        const context = { items: [] };

        const result = await executeLoopNode(config, context);

        expect(result.items).toEqual([]);
    });

    it("throws an error when arrayPath does not exist", async () => {
        const config = {
            loopType: "forEach" as const,
            arrayPath: "missing",
            itemVariable: "item"
        };

        const context = {};

        await expect(executeLoopNode(config, context)).rejects.toThrow();
    });
});
