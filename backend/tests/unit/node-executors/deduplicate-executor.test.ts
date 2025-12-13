import { describe, it, expect } from "@jest/globals";
import { executeDeduplicateNode } from "../../../src/temporal/activities/node-executors/data-processing/deduplicate-executor";

describe("Deduplicate Executor", () => {
    it("removes duplicates by key (case-insensitive)", async () => {
        const config = {
            inputArray: "${users}",
            keyFields: ["email"],
            keep: "first" as const,
            caseSensitive: false,
            outputVariable: "unique",
            duplicatesVariable: "dups"
        };

        const context = {
            users: [{ email: "A@TEST.COM" }, { email: "a@test.com" }, { email: "b@test.com" }]
        };

        const result = await executeDeduplicateNode(config, context);

        expect(result.unique).toHaveLength(2);
        expect(result.dups).toHaveLength(1);
        expect(result.duplicateCount).toBe(1);
    });

    it("keeps last occurrence", async () => {
        const config = {
            inputArray: "${users}",
            keyFields: ["email"],
            keep: "last" as const,
            caseSensitive: true,
            outputVariable: "unique"
        };

        const context = {
            users: [
                { email: "a@test.com", v: 1 },
                { email: "a@test.com", v: 2 }
            ]
        };

        const result = await executeDeduplicateNode(config, context);

        expect(result.unique).toEqual([{ email: "a@test.com", v: 2 }]);
    });

    it("handles multiple key fields", async () => {
        const config = {
            inputArray: "${items}",
            keyFields: ["first", "last"],
            keep: "first" as const,
            caseSensitive: true,
            outputVariable: "unique"
        };

        const context = {
            items: [
                { first: "John", last: "Smith" },
                { first: "John", last: "Smith" },
                { first: "Jane", last: "Smith" }
            ]
        };

        const result = await executeDeduplicateNode(config, context);

        expect(result.unique).toHaveLength(2);
    });
});
