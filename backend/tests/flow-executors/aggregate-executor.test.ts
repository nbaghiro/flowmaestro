import { describe, it, expect } from "@jest/globals";
import { executeAggregateNode } from "../../src/temporal/activities/node-executors/aggregate-executor";

describe("Aggregate Executor", () => {
    it("computes sum", async () => {
        const config = {
            inputArray: "${items}",
            operation: "sum" as const,
            field: "price",
            outputVariable: "total"
        };

        const context = {
            items: [{ price: 10 }, { price: 15 }]
        };

        const result = await executeAggregateNode(config, context);

        expect(result.total).toBe(25);
    });

    it("computes count", async () => {
        const config = {
            inputArray: "${items}",
            operation: "count" as const,
            outputVariable: "count"
        };

        const context = {
            items: [1, 2, 3, 4]
        };

        const result = await executeAggregateNode(config, context);

        expect(result.count).toBe(4);
    });

    it("groups and aggregates", async () => {
        const config = {
            inputArray: "${items}",
            operation: "sum" as const,
            field: "amount",
            groupBy: "type",
            outputVariable: "out"
        };

        const context = {
            items: [
                { type: "A", amount: 10 },
                { type: "A", amount: 5 },
                { type: "B", amount: 3 }
            ]
        };

        const result = await executeAggregateNode(config, context);

        expect(result.out).toEqual({
            A: 15,
            B: 3
        });
    });
});
