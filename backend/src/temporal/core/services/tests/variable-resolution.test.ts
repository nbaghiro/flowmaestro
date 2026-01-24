/**
 * Variable Resolution Unit Tests
 *
 * Tests for variable resolution and interpolation including:
 * - Simple variable resolution
 * - Nested path resolution
 * - Loop and parallel context resolution
 * - Resolution priority order
 * - String interpolation
 * - Edge cases and security
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    createEmptyContext,
    createContextWithOutputs,
    createLoopState,
    createLoopStateWithResults,
    createParallelState
} from "../../../../../tests/fixtures/contexts";
import {
    resolveVariable,
    interpolateString,
    isVariableReference,
    extractVariableNames,
    createContext,
    storeNodeOutput,
    setVariable
} from "../context";
import type { LoopIterationState, ParallelBranchState } from "../../types";

describe("Variable Resolution", () => {
    describe("resolveVariable", () => {
        describe("simple variable resolution", () => {
            it("should resolve simple variable {{varName}}", () => {
                let context = createEmptyContext();
                context = setVariable(context, "myVar", "hello");

                const result = resolveVariable(context, "{{myVar}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("hello");
                expect(result!.source).toBe("workflowVariable");
            });

            it("should resolve variable without braces", () => {
                let context = createEmptyContext();
                context = setVariable(context, "count", 42);

                const result = resolveVariable(context, "count");

                expect(result).not.toBeNull();
                expect(result!.value).toBe(42);
            });

            it("should handle whitespace in variable path", () => {
                let context = createEmptyContext();
                context = setVariable(context, "spaced", "value");

                const result = resolveVariable(context, "{{  spaced  }}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("value");
            });
        });

        describe("node output resolution", () => {
            it("should resolve node output {{nodeId.field}}", () => {
                const context = createContextWithOutputs();

                const result = resolveVariable(context, "{{node1.result}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("first output");
                expect(result!.source).toBe("nodeOutput");
            });

            it("should resolve entire node output", () => {
                const context = createContextWithOutputs();

                const result = resolveVariable(context, "{{node1}}");

                expect(result).not.toBeNull();
                expect(result!.value).toEqual({ result: "first output", value: 42 });
            });
        });

        describe("nested path resolution", () => {
            it("should resolve nested paths {{nodeId.data.items[0].name}}", () => {
                let context = createEmptyContext();
                context = storeNodeOutput(context, "dataNode", {
                    data: {
                        items: [
                            { name: "first", id: 1 },
                            { name: "second", id: 2 }
                        ]
                    }
                });

                const result = resolveVariable(context, "{{dataNode.data.items[0].name}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("first");
            });

            it("should resolve deeply nested object paths", () => {
                const context = createContextWithOutputs();

                const result = resolveVariable(context, "{{node3.nested.deep.value}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("found");
            });

            it("should resolve array index with bracket notation", () => {
                let context = createEmptyContext();
                context = storeNodeOutput(context, "arrayNode", {
                    items: ["a", "b", "c"]
                });

                const result = resolveVariable(context, "{{arrayNode.items[1]}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("b");
            });

            it("should handle quoted string keys in brackets", () => {
                let context = createEmptyContext();
                context = storeNodeOutput(context, "obj", {
                    "key-with-dash": "value1",
                    key_with_underscore: "value2"
                });

                const result1 = resolveVariable(context, "{{obj['key-with-dash']}}");
                const result2 = resolveVariable(context, '{{obj["key_with_underscore"]}}');

                expect(result1?.value).toBe("value1");
                expect(result2?.value).toBe("value2");
            });

            it("should not support keys with dots (known limitation)", () => {
                // Note: Keys containing dots are split incorrectly by parsePath().
                // This is a known limitation of the current path parsing approach.
                let context = createEmptyContext();
                context = storeNodeOutput(context, "obj", {
                    "key.with.dots": "value"
                });

                // This won't work because "key.with.dots" gets split into ["obj", "key", "with", "dots"]
                const result = resolveVariable(context, "{{obj['key.with.dots']}}");
                expect(result).toBeNull();
            });
        });

        describe("loop context resolution", () => {
            it("should resolve loop.index", () => {
                const context = createEmptyContext();
                const loopState = createLoopState(3, 10);

                const result = resolveVariable(context, "{{loop.index}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toBe(3);
                expect(result!.source).toBe("loop");
            });

            it("should resolve loop.iteration (1-based)", () => {
                const context = createEmptyContext();
                const loopState = createLoopState(0, 5);

                const result = resolveVariable(context, "{{loop.iteration}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toBe(1); // 0-based index + 1
            });

            it("should resolve loop.item for forEach loops", () => {
                const context = createEmptyContext();
                const loopState: LoopIterationState = {
                    index: 1,
                    item: { name: "second item", value: 42 },
                    total: 3,
                    results: []
                };

                const result = resolveVariable(context, "{{loop.item}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toEqual({ name: "second item", value: 42 });
            });

            it("should resolve nested loop.item paths", () => {
                const context = createEmptyContext();
                const loopState: LoopIterationState = {
                    index: 0,
                    item: { name: "item", data: { nested: "value" } },
                    total: 1,
                    results: []
                };

                const result = resolveVariable(context, "{{loop.item.data.nested}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toBe("value");
            });

            it("should resolve loop.total", () => {
                const context = createEmptyContext();
                const loopState = createLoopState(2, 10);

                const result = resolveVariable(context, "{{loop.total}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toBe(10);
            });

            it("should resolve loop.results", () => {
                const context = createEmptyContext();
                // createLoopStateWithResults(index, total, item, results)
                const loopState = createLoopStateWithResults(3, 10, undefined, ["a", "b", "c"]);

                const result = resolveVariable(context, "{{loop.results}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toEqual(["a", "b", "c"]);
            });

            it("should resolve loop.results[index]", () => {
                const context = createEmptyContext();
                // createLoopStateWithResults(index, total, item, results)
                const loopState = createLoopStateWithResults(3, 10, undefined, [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 }
                ]);

                const result = resolveVariable(context, "{{loop.results[1].value}}", loopState);

                expect(result).not.toBeNull();
                expect(result!.value).toBe(2);
            });
        });

        describe("parallel context resolution", () => {
            it("should resolve parallel.index", () => {
                const context = createEmptyContext();
                const parallelState = createParallelState(2, "branch-2");

                const result = resolveVariable(
                    context,
                    "{{parallel.index}}",
                    undefined,
                    parallelState
                );

                expect(result).not.toBeNull();
                expect(result!.value).toBe(2);
                expect(result!.source).toBe("parallel");
            });

            it("should resolve parallel.branchId", () => {
                const context = createEmptyContext();
                const parallelState = createParallelState(0, "my-branch-id");

                const result = resolveVariable(
                    context,
                    "{{parallel.branchId}}",
                    undefined,
                    parallelState
                );

                expect(result).not.toBeNull();
                expect(result!.value).toBe("my-branch-id");
            });

            it("should resolve parallel.currentItem", () => {
                const context = createEmptyContext();
                const parallelState: ParallelBranchState = {
                    index: 1,
                    branchId: "branch-1",
                    currentItem: { id: 100, name: "parallel item" }
                };

                const result = resolveVariable(
                    context,
                    "{{parallel.currentItem}}",
                    undefined,
                    parallelState
                );

                expect(result).not.toBeNull();
                expect(result!.value).toEqual({ id: 100, name: "parallel item" });
            });

            it("should resolve nested parallel.currentItem paths", () => {
                const context = createEmptyContext();
                const parallelState: ParallelBranchState = {
                    index: 0,
                    branchId: "b0",
                    currentItem: { data: { nested: "found" } }
                };

                const result = resolveVariable(
                    context,
                    "{{parallel.currentItem.data.nested}}",
                    undefined,
                    parallelState
                );

                expect(result).not.toBeNull();
                expect(result!.value).toBe("found");
            });
        });

        describe("input resolution", () => {
            it("should resolve from inputs", () => {
                const context = createContext({ inputField: "input-value" });

                const result = resolveVariable(context, "{{inputField}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("input-value");
                expect(result!.source).toBe("input");
            });

            it("should resolve nested input paths", () => {
                const context = createContext({
                    user: { profile: { name: "John" } }
                });

                const result = resolveVariable(context, "{{user.profile.name}}");

                expect(result).not.toBeNull();
                expect(result!.value).toBe("John");
            });
        });

        describe("resolution priority", () => {
            it("should prioritize: loop > parallel > variables > outputs > inputs", () => {
                // Set up context with same key in multiple places
                let context = createContext({ sharedKey: "from-input" });
                context = storeNodeOutput(context, "sharedKey", { value: "from-output" });
                context = setVariable(context, "sharedKey", "from-variable");

                const loopState = createLoopState(0);
                const parallelState = createParallelState(0, "branch");

                // Loop context takes highest priority
                const loopResult = resolveVariable(
                    context,
                    "{{loop.index}}",
                    loopState,
                    parallelState
                );
                expect(loopResult!.source).toBe("loop");

                // Parallel context is next
                const parallelResult = resolveVariable(
                    context,
                    "{{parallel.index}}",
                    loopState,
                    parallelState
                );
                expect(parallelResult!.source).toBe("parallel");

                // Variables take precedence over outputs and inputs
                const varResult = resolveVariable(context, "{{sharedKey}}");
                expect(varResult!.source).toBe("workflowVariable");
                expect(varResult!.value).toBe("from-variable");
            });

            it("should not leak variables between scopes", () => {
                const context = createEmptyContext();

                // Without loop state, loop references should not resolve
                const loopResult = resolveVariable(context, "{{loop.index}}");
                expect(loopResult).toBeNull();

                // Without parallel state, parallel references should not resolve
                const parallelResult = resolveVariable(context, "{{parallel.index}}");
                expect(parallelResult).toBeNull();
            });
        });

        describe("missing variable handling", () => {
            it("should return null for missing variables", () => {
                const context = createEmptyContext();

                const result = resolveVariable(context, "{{nonexistent}}");

                expect(result).toBeNull();
            });

            it("should return null for invalid nested paths", () => {
                const context = createContextWithOutputs();

                const result = resolveVariable(context, "{{node1.nonexistent.path}}");

                expect(result).toBeNull();
            });

            it("should return null for out-of-bounds array access", () => {
                let context = createEmptyContext();
                context = storeNodeOutput(context, "arr", { items: [1, 2, 3] });

                const result = resolveVariable(context, "{{arr.items[10]}}");

                expect(result).toBeNull();
            });
        });

        describe("edge cases", () => {
            it("should handle circular references gracefully", () => {
                // Can't create true circular reference in JSON, but test deep nesting
                let context = createEmptyContext();
                let deepObj: Record<string, unknown> = { value: "end" };
                for (let i = 0; i < 100; i++) {
                    deepObj = { nested: deepObj };
                }
                context = storeNodeOutput(context, "deep", deepObj as JsonObject);

                // Should not hang or crash
                const result = resolveVariable(
                    context,
                    "{{deep.nested.nested.nested.nested.value}}"
                );
                expect(result).toBeNull(); // Path doesn't exist this deep
            });

            it("should not execute code injection attempts", () => {
                let context = createEmptyContext();
                context = setVariable(context, "safe", "value");

                // These should not be interpreted as code
                const attempts = [
                    "{{constructor.constructor('return this')()}}",
                    "{{__proto__}}",
                    "{{safe + safe}}",
                    "{{safe.toString()}}",
                    "${{safe}}",
                    "{{process.env.SECRET}}"
                ];

                for (const attempt of attempts) {
                    // Should either return null or the literal path, not execute
                    const result = resolveVariable(context, attempt);
                    // The important thing is no code execution happens
                    expect(typeof result?.value).not.toBe("function");
                }
            });

            it("should handle empty path", () => {
                const context = createEmptyContext();

                const result = resolveVariable(context, "{{}}");

                expect(result).toBeNull();
            });

            it("should handle null values in path", () => {
                let context = createEmptyContext();
                context = storeNodeOutput(context, "node", { value: null });

                const result = resolveVariable(context, "{{node.value.nested}}");

                expect(result).toBeNull();
            });
        });
    });

    describe("interpolateString", () => {
        it("should replace multiple variables in string", () => {
            let context = createEmptyContext();
            context = setVariable(context, "name", "World");
            context = setVariable(context, "greeting", "Hello");

            const result = interpolateString(context, "{{greeting}}, {{name}}!");

            expect(result).toBe("Hello, World!");
        });

        it("should JSON serialize object values", () => {
            let context = createEmptyContext();
            context = setVariable(context, "obj", { key: "value", num: 42 });

            const result = interpolateString(context, "Data: {{obj}}");

            expect(result).toBe('Data: {"key":"value","num":42}');
        });

        it("should preserve original string if no matches", () => {
            const context = createEmptyContext();

            const result = interpolateString(context, "No variables here");

            expect(result).toBe("No variables here");
        });

        it("should preserve unresolved variable references", () => {
            const context = createEmptyContext();

            const result = interpolateString(context, "Hello {{unknown}}!");

            expect(result).toBe("Hello {{unknown}}!");
        });

        it("should handle mixed resolved and unresolved", () => {
            let context = createEmptyContext();
            context = setVariable(context, "known", "world");

            const result = interpolateString(context, "Hello {{known}}, {{unknown}}!");

            expect(result).toBe("Hello world, {{unknown}}!");
        });

        it("should handle loop state in interpolation", () => {
            const context = createEmptyContext();
            const loopState = createLoopState(5, 10);

            const result = interpolateString(
                context,
                "Iteration {{loop.index}} of {{loop.total}}",
                loopState
            );

            expect(result).toBe("Iteration 5 of 10");
        });

        it("should handle parallel state in interpolation", () => {
            const context = createEmptyContext();
            const parallelState = createParallelState(2, "branch-2");

            const result = interpolateString(
                context,
                "Branch {{parallel.branchId}} at index {{parallel.index}}",
                undefined,
                parallelState
            );

            expect(result).toBe("Branch branch-2 at index 2");
        });

        it("should handle boolean values", () => {
            let context = createEmptyContext();
            context = setVariable(context, "enabled", true);
            context = setVariable(context, "disabled", false);

            const result = interpolateString(
                context,
                "Enabled: {{enabled}}, Disabled: {{disabled}}"
            );

            expect(result).toBe("Enabled: true, Disabled: false");
        });

        it("should handle numeric values", () => {
            let context = createEmptyContext();
            context = setVariable(context, "int", 42);
            context = setVariable(context, "float", 3.14);

            const result = interpolateString(context, "Int: {{int}}, Float: {{float}}");

            expect(result).toBe("Int: 42, Float: 3.14");
        });

        it("should handle null values", () => {
            let context = createEmptyContext();
            context = setVariable(context, "nullVar", null);

            const result = interpolateString(context, "Value: {{nullVar}}");

            expect(result).toBe("Value: null");
        });

        it("should handle arrays", () => {
            let context = createEmptyContext();
            context = setVariable(context, "arr", [1, 2, 3]);

            const result = interpolateString(context, "Array: {{arr}}");

            expect(result).toBe("Array: [1,2,3]");
        });
    });

    describe("isVariableReference", () => {
        it("should return true for variable references", () => {
            expect(isVariableReference("{{variable}}")).toBe(true);
            expect(isVariableReference("some {{var}} text")).toBe(true);
            expect(isVariableReference("{{a}} and {{b}}")).toBe(true);
        });

        it("should return false for non-references", () => {
            expect(isVariableReference("plain text")).toBe(false);
            expect(isVariableReference("{ not a var }")).toBe(false);
            expect(isVariableReference("")).toBe(false);
            expect(isVariableReference(123 as unknown as string)).toBe(false);
            expect(isVariableReference(null as unknown as string)).toBe(false);
        });
    });

    describe("extractVariableNames", () => {
        it("should extract variable names from template", () => {
            const names = extractVariableNames("Hello {{name}}, your score is {{score}}");

            expect(names).toEqual(["name", "score"]);
        });

        it("should handle nested paths", () => {
            const names = extractVariableNames("{{user.profile.name}} - {{data.items[0]}}");

            expect(names).toEqual(["user.profile.name", "data.items[0]"]);
        });

        it("should return empty array for no variables", () => {
            const names = extractVariableNames("No variables here");

            expect(names).toEqual([]);
        });

        it("should handle whitespace in references", () => {
            const names = extractVariableNames("{{  spaced  }}");

            expect(names).toEqual(["spaced"]);
        });

        it("should handle duplicate references", () => {
            const names = extractVariableNames("{{x}} and {{x}} again");

            expect(names).toEqual(["x", "x"]); // Does not deduplicate
        });
    });
});
