import { describe, it, expect } from "@jest/globals";
import { executeFilterNode } from "../../src/temporal/activities/node-executors/filter-executor";

describe("Filter Executor", () => {
    it("keeps matching items", async () => {
        const config = {
            inputArray: "${items}",
            expression: "x = 1",
            mode: "keep" as const,
            outputVariable: "filtered"
        };

        const context = {
            items: [{ x: 1 }, { x: 2 }, { x: 1 }]
        };

        const result = await executeFilterNode(config, context);

        expect(result.filtered).toEqual([{ x: 1 }, { x: 1 }]);
        expect(result.filtered_count).toBe(2);
    });

    it("removes matching items", async () => {
        const config = {
            inputArray: "${items}",
            expression: "x = 1",
            mode: "remove" as const,
            outputVariable: "remaining",
            removedVariable: "removed"
        };

        const context = {
            items: [{ x: 1 }, { x: 2 }, { x: 1 }]
        };

        const result = await executeFilterNode(config, context);

        expect(result.remaining).toEqual([{ x: 2 }]);
        expect(result.removed).toEqual([{ x: 1 }, { x: 1 }]);
        expect(result.remaining_count).toBe(1);
    });

    it("supports more complex expressions", async () => {
        const config = {
            inputArray: "${items}",
            expression: "active = true and score > 10",
            mode: "keep" as const,
            outputVariable: "filtered"
        };

        const context = {
            items: [
                { active: true, score: 20 },
                { active: false, score: 30 }
            ]
        };

        const result = await executeFilterNode(config, context);

        expect(result.filtered).toEqual([{ active: true, score: 20 }]);
    });
});
