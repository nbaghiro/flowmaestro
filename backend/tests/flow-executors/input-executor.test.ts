import { executeInputNode } from "../../src/temporal/activities/node-executors/input-executor";

describe("Input Executor", () => {
    it("should merge input data into context", async () => {
        const config = { inputType: "manual" as const };
        const context = { input: { a: 1, b: 2 } };

        const result = await executeInputNode(config, context);

        expect(result.a).toBe(1);
        expect(result.b).toBe(2);
    });

    it("should return context unchanged when no input", async () => {
        const config = { inputType: "manual" as const };
        const context = { existing: true };

        const result = await executeInputNode(config, context);

        expect(result).toEqual(context);
    });
});
