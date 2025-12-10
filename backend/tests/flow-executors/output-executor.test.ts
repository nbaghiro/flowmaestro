import { describe, it, expect } from "@jest/globals";
import { executeOutputNode } from "../../src/temporal/activities/node-executors/output-executor";

describe("Output Executor", () => {
    it("outputs full context when format=json and no fields provided", async () => {
        const config = {
            outputVariable: "result",
            format: "json" as const
        };

        const context = {
            user: "Perry",
            score: 95
        };

        const result = await executeOutputNode(config, context);

        expect(result.result).toEqual(context);
    });

    it("picks only specified fields in json mode", async () => {
        const config = {
            outputVariable: "result",
            format: "json" as const,
            fields: ["user"]
        };

        const context = {
            user: "Perry",
            score: 95
        };

        const result = await executeOutputNode(config, context);

        expect(result.result).toEqual({ user: "Perry" });
    });

    it("handles missing fields gracefully in json mode", async () => {
        const config = {
            outputVariable: "result",
            format: "json" as const,
            fields: ["missing", "user"]
        };

        const context = {
            user: "Perry"
        };

        const result = await executeOutputNode(config, context);

        expect(result.result).toEqual({
            missing: undefined,
            user: "Perry"
        });
    });

    it("renders template in text mode with interpolation", async () => {
        const config = {
            outputVariable: "result",
            format: "text" as const,
            template: "Hello ${user}, your score is ${score}"
        };

        const context = {
            user: "Perry",
            score: 95
        };

        const result = await executeOutputNode(config, context);

        expect(result.result).toBe("Hello Perry, your score is 95");
    });

    it("leaves missing variables intact in text templates", async () => {
        const config = {
            outputVariable: "result",
            format: "text" as const,
            template: "Hi ${unknown}"
        };

        const context = {
            user: "Perry"
        };

        const result = await executeOutputNode(config, context);

        // interpolateWithObjectSupport returns original placeholder if missing
        expect(result.result).toBe("Hi ${unknown}");
    });

    it("returns placeholder for file mode", async () => {
        const config = {
            outputVariable: "result",
            format: "file" as const
        };

        const context = { anything: 123 };

        const result = await executeOutputNode(config, context);

        expect(result.result).toBe("[file output not implemented]");
    });
});
