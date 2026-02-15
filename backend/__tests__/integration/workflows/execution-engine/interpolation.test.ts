/**
 * Variable Interpolation Integration Tests
 *
 * Tests for variable interpolation and expression evaluation:
 * - Basic variable resolution
 * - Expression operators (||, &&, !, comparisons, ternary)
 * - Context priority
 * - Loop/parallel context
 * - String interpolation
 */

import {
    createContext,
    storeNodeOutput,
    setVariable,
    resolveVariable,
    interpolateString,
    setSharedMemoryValue
} from "../../../../src/temporal/core/services/context";
import type {
    ContextSnapshot,
    JsonObject,
    LoopIterationState,
    ParallelBranchState
} from "../../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestContext(inputs: JsonObject = {}): ContextSnapshot {
    return createContext(inputs);
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Variable Interpolation", () => {
    describe("Basic Variable Resolution", () => {
        it("should resolve simple variable reference", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { value: "test" });

            const result = resolveVariable(context, "node1.value");
            expect(result?.value).toBe("test");
            expect(result?.source).toBe("nodeOutput");
        });

        it("should resolve nested object path", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", {
                data: { nested: { deep: "value" } }
            });

            const result = resolveVariable(context, "node1.data.nested.deep");
            expect(result?.value).toBe("value");
        });

        it("should resolve array index access", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", {
                items: ["first", "second", "third"]
            });

            const result = resolveVariable(context, "node1.items[1]");
            expect(result?.value).toBe("second");
        });

        it("should resolve deep nested with array access", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "search", {
                results: [{ title: "First Result" }, { title: "Second Result" }]
            });

            const result = resolveVariable(context, "search.results[0].title");
            expect(result?.value).toBe("First Result");
        });

        it("should resolve from workflow inputs", () => {
            const context = createTestContext({ userEmail: "test@example.com" });

            const result = resolveVariable(context, "userEmail");
            expect(result?.value).toBe("test@example.com");
            expect(result?.source).toBe("input");
        });

        it("should resolve from workflow variables", () => {
            let context = createTestContext({});
            context = setVariable(context, "counter", 42);

            const result = resolveVariable(context, "counter");
            expect(result?.value).toBe(42);
            expect(result?.source).toBe("workflowVariable");
        });
    });

    describe("Missing/Invalid Variables", () => {
        it("should return null for missing variable", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "nonexistent");
            expect(result).toBeNull();
        });

        it("should return null for out-of-bounds array access", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { items: [1, 2, 3] });

            const result = resolveVariable(context, "node1.items[999]");
            expect(result).toBeNull();
        });

        it("should return null for path through null", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { data: null });

            const result = resolveVariable(context, "node1.data.nested");
            expect(result).toBeNull();
        });

        it("should return null for empty path", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "");
            expect(result).toBeNull();
        });
    });

    describe("Quoted Keys (Special Characters)", () => {
        it("should resolve bracket notation with single quotes", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "headers", {
                "content-type": "application/json"
            });

            const result = resolveVariable(context, "headers['content-type']");
            expect(result?.value).toBe("application/json");
        });

        it("should resolve bracket notation with double quotes", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "data", {
                my_custom_field: "custom value"
            });

            const result = resolveVariable(context, 'data["my_custom_field"]');
            expect(result?.value).toBe("custom value");
        });
    });

    describe("Fallback/Coalesce Expressions (||)", () => {
        it("should return first non-null value", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "input", { id: "123" });

            const result = resolveVariable(context, "input.id || input.entityId");
            expect(result?.value).toBe("123");
        });

        it("should fall back when first value is missing", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "input", { entityId: "456" });

            const result = resolveVariable(context, "input.id || input.entityId");
            expect(result?.value).toBe("456");
        });

        it("should chain multiple fallbacks", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", {});

            const result = resolveVariable(context, 'node1.a || node1.b || node1.c || "default"');
            expect(result?.value).toBe("default");
        });

        it("should NOT fall back for 0 (defined but falsy)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { count: 0 });

            const result = resolveVariable(context, 'node1.count || "fallback"');
            expect(result?.value).toBe(0);
        });

        it("should NOT fall back for empty string", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { text: "" });

            const result = resolveVariable(context, 'node1.text || "fallback"');
            expect(result?.value).toBe("");
        });

        it("should NOT fall back for false", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { flag: false });

            const result = resolveVariable(context, 'node1.flag || "fallback"');
            expect(result?.value).toBe(false);
        });

        it("should fall back for null", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { value: null });

            const result = resolveVariable(context, 'node1.value || "fallback"');
            expect(result?.value).toBe("fallback");
        });
    });

    describe("Logical Expressions (&&, !)", () => {
        it("should return right when left is truthy (&&)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", {
                verified: true,
                email: "test@example.com"
            });

            const result = resolveVariable(context, "user.verified && user.email");
            expect(result?.value).toBe("test@example.com");
        });

        it("should return left when left is falsy (&&)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", {
                verified: false,
                email: "test@example.com"
            });

            const result = resolveVariable(context, "user.verified && user.email");
            expect(result?.value).toBe(false);
        });

        it("should negate true to false (!)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { active: true });

            const result = resolveVariable(context, "!node1.active");
            expect(result?.value).toBe(false);
        });

        it("should negate null to true (!)", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "!nonexistent");
            expect(result?.value).toBe(true);
        });
    });

    describe("Comparison Expressions", () => {
        it("should compare equality (==)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "order", { status: "active" });

            const result = resolveVariable(context, 'order.status == "active"');
            expect(result?.value).toBe(true);
        });

        it("should compare inequality (!=)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "cart", { itemCount: 5 });

            const result = resolveVariable(context, "cart.itemCount != 0");
            expect(result?.value).toBe(true);
        });

        it("should compare greater than (>)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "order", { total: 150 });

            const result = resolveVariable(context, "order.total > 100");
            expect(result?.value).toBe(true);
        });

        it("should compare greater than or equal (>=)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", { age: 18 });

            const result = resolveVariable(context, "user.age >= 18");
            expect(result?.value).toBe(true);
        });

        it("should compare less than (<)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "inventory", { quantity: 5 });

            const result = resolveVariable(context, "inventory.quantity < 10");
            expect(result?.value).toBe(true);
        });

        it("should compare less than or equal (<=)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "inventory", { quantity: 5, reorderPoint: 5 });

            const result = resolveVariable(context, "inventory.quantity <= inventory.reorderPoint");
            expect(result?.value).toBe(true);
        });

        it("should handle type coercion (string == number)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { stringNum: "5" });

            const result = resolveVariable(context, "node1.stringNum == 5");
            expect(result?.value).toBe(true);
        });
    });

    describe("Ternary Expressions", () => {
        it("should return consequent when true", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { active: true });

            const result = resolveVariable(context, 'node1.active ? "Active" : "Inactive"');
            expect(result?.value).toBe("Active");
        });

        it("should return alternate when false", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { active: false });

            const result = resolveVariable(context, 'node1.active ? "Active" : "Inactive"');
            expect(result?.value).toBe("Inactive");
        });

        it("should work with comparison in condition", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "order", { total: 150 });

            const result = resolveVariable(context, "order.total > 100 ? 0.1 : 0");
            expect(result?.value).toBe(0.1);
        });

        it("should handle nested ternary", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "score", { value: 85 });

            const result = resolveVariable(
                context,
                'score.value >= 90 ? "gold" : score.value >= 70 ? "silver" : "bronze"'
            );
            expect(result?.value).toBe("silver");
        });

        it("should use variable paths in branches", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", { name: "John", isGuest: false });

            const result = resolveVariable(context, 'user.isGuest ? "Guest" : user.name');
            expect(result?.value).toBe("John");
        });
    });

    describe("Combined Expressions", () => {
        it("should handle || with && (proper precedence)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", {
                admin: true,
                moderator: true
            });

            // admin && moderator || user.guest -> (admin && moderator) || guest
            // true && true = true, so result is true (short-circuits)
            const result = resolveVariable(context, "user.admin && user.moderator || user.guest");
            expect(result?.value).toBe(true);
        });

        it("should handle ternary with fallback in branches", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { hasError: true });

            const result = resolveVariable(
                context,
                'node1.hasError ? node1.errorMessage || "Unknown error" : "Success"'
            );
            expect(result?.value).toBe("Unknown error");
        });

        it("should handle complex condition in ternary", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "order", { status: "paid", amount: 100 });

            const result = resolveVariable(
                context,
                'order.status == "paid" && order.amount > 0 ? "process" : "hold"'
            );
            expect(result?.value).toBe("process");
        });
    });

    describe("Context Priority Order", () => {
        it("should prioritize loop context over node outputs", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "loop", { index: 999 });

            const loopState: LoopIterationState = {
                index: 5,
                total: 10,
                results: []
            };

            const result = resolveVariable(context, "loop.index", loopState);
            expect(result?.value).toBe(5);
            expect(result?.source).toBe("loop");
        });

        it("should prioritize parallel context", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "parallel", { branchId: "wrong" });

            const parallelState: ParallelBranchState = {
                index: 2,
                branchId: "branch-2"
            };

            const result = resolveVariable(context, "parallel.branchId", undefined, parallelState);
            expect(result?.value).toBe("branch-2");
            expect(result?.source).toBe("parallel");
        });

        it("should prioritize workflow variables over inputs", () => {
            let context = createTestContext({ value: "from-input" });
            context = setVariable(context, "value", "from-variable");

            const result = resolveVariable(context, "value");
            expect(result?.value).toBe("from-variable");
            expect(result?.source).toBe("workflowVariable");
        });
    });

    describe("Loop Context Variables", () => {
        it("should resolve loop.index", () => {
            const context = createTestContext({});
            const loopState: LoopIterationState = {
                index: 3,
                total: 10,
                results: []
            };

            const result = resolveVariable(context, "loop.index", loopState);
            expect(result?.value).toBe(3);
        });

        it("should resolve loop.item", () => {
            const context = createTestContext({});
            const loopState: LoopIterationState = {
                index: 0,
                item: { name: "Item 1", price: 29.99 },
                total: 3,
                results: []
            };

            const result = resolveVariable(context, "loop.item.name", loopState);
            expect(result?.value).toBe("Item 1");
        });

        it("should resolve loop.total", () => {
            const context = createTestContext({});
            const loopState: LoopIterationState = {
                index: 0,
                total: 5,
                results: []
            };

            const result = resolveVariable(context, "loop.total", loopState);
            expect(result?.value).toBe(5);
        });

        it("should use loop variables in expressions", () => {
            const context = createTestContext({});
            const loopState: LoopIterationState = {
                index: 0,
                total: 5,
                results: []
            };

            const result = resolveVariable(
                context,
                'loop.index == 0 ? "first" : "other"',
                loopState
            );
            expect(result?.value).toBe("first");
        });
    });

    describe("Parallel Context Variables", () => {
        it("should resolve parallel.index", () => {
            const context = createTestContext({});
            const parallelState: ParallelBranchState = {
                index: 2,
                branchId: "branch-2"
            };

            const result = resolveVariable(context, "parallel.index", undefined, parallelState);
            expect(result?.value).toBe(2);
        });

        it("should resolve parallel.branchId", () => {
            const context = createTestContext({});
            const parallelState: ParallelBranchState = {
                index: 1,
                branchId: "branch-1"
            };

            const result = resolveVariable(context, "parallel.branchId", undefined, parallelState);
            expect(result?.value).toBe("branch-1");
        });

        it("should resolve parallel.currentItem", () => {
            const context = createTestContext({});
            const parallelState: ParallelBranchState = {
                index: 0,
                branchId: "branch-0",
                currentItem: { id: "item-0", value: 100 }
            };

            const result = resolveVariable(
                context,
                "parallel.currentItem.id",
                undefined,
                parallelState
            );
            expect(result?.value).toBe("item-0");
        });
    });

    describe("Shared Memory Variables", () => {
        it("should resolve shared memory value", () => {
            let context = createTestContext({});
            context = setSharedMemoryValue(context, "runningTotal", 500, "testNode");

            const result = resolveVariable(context, "shared.runningTotal");
            expect(result?.value).toBe(500);
            expect(result?.source).toBe("shared");
        });

        it("should resolve nested path in shared memory", () => {
            let context = createTestContext({});
            context = setSharedMemoryValue(
                context,
                "userCache",
                {
                    user123: { name: "John", email: "john@example.com" }
                },
                "testNode"
            );

            const result = resolveVariable(context, "shared.userCache.user123.email");
            expect(result?.value).toBe("john@example.com");
        });
    });

    describe("String Interpolation", () => {
        it("should interpolate simple variables", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", { name: "John" });

            const result = interpolateString(context, "Hello {{user.name}}!");
            expect(result).toBe("Hello John!");
        });

        it("should interpolate multiple variables", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", { firstName: "John", lastName: "Doe" });
            context = storeNodeOutput(context, "company", { name: "Acme Inc" });

            const result = interpolateString(
                context,
                "Hello {{user.firstName}} {{user.lastName}}, welcome to {{company.name}}!"
            );
            expect(result).toBe("Hello John Doe, welcome to Acme Inc!");
        });

        it("should interpolate expression results", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "order", { status: "shipped" });

            const result = interpolateString(
                context,
                'Order status: {{order.status == "shipped" ? "On its way!" : "Processing"}}'
            );
            expect(result).toBe("Order status: On its way!");
        });

        it("should handle mixed variables and expressions", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "user", { name: "John", premium: true });

            const result = interpolateString(
                context,
                'Hello {{user.name}}, you are {{user.premium ? "premium" : "free"}} tier'
            );
            expect(result).toBe("Hello John, you are premium tier");
        });

        it("should preserve unresolved variables", () => {
            const context = createTestContext({});
            const result = interpolateString(context, "Hello {{user.name}}!");
            expect(result).toBe("Hello {{user.name}}!");
        });

        it("should stringify objects in interpolation", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "data", { obj: { a: 1, b: 2 } });

            const result = interpolateString(context, "Data: {{data.obj}}");
            expect(result).toBe('Data: {"a":1,"b":2}');
        });
    });

    describe("Security (No Code Injection)", () => {
        it("should not execute constructor tricks", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "constructor.constructor('return this')()");
            expect(result).toBeNull();
        });

        it("should treat __proto__ as regular property access (not pollution)", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "obj", { value: "test" });

            // __proto__ is treated as a regular property name, not prototype access
            // This returns {} (the object's prototype) but doesn't allow modification
            const result = resolveVariable(context, "obj.__proto__");
            // The value is an empty object (the prototype), which is safe
            expect(result?.value).toEqual({});
        });

        it("should not access process.env", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "process.env.SECRET");
            expect(result).toBeNull();
        });
    });

    describe("Edge Cases", () => {
        it("should handle whitespace in variable path", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { value: "test" });

            const result = resolveVariable(context, "  node1.value  ");
            expect(result?.value).toBe("test");
        });

        it("should return expression source for expressions", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { a: 1 });

            const result = resolveVariable(context, "node1.a || 0");
            expect(result?.source).toBe("expression");
        });

        it("should handle number literals in expressions", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "missing || 42");
            expect(result?.value).toBe(42);
        });

        it("should handle negative numbers", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { value: -5 });

            const result = resolveVariable(context, "node1.value < 0");
            expect(result?.value).toBe(true);
        });

        it("should handle decimal numbers", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { price: 19.99 });

            const result = resolveVariable(context, "node1.price > 10.50");
            expect(result?.value).toBe(true);
        });

        it("should handle boolean literals", () => {
            const context = createTestContext({});
            const result = resolveVariable(context, "missing || true");
            expect(result?.value).toBe(true);
        });

        it("should handle null literal", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { val: null });

            const result = resolveVariable(context, "node1.val == null");
            expect(result?.value).toBe(true);
        });

        it("should handle parentheses for grouping", () => {
            let context = createTestContext({});
            context = storeNodeOutput(context, "node1", { a: true, b: false, c: true });

            const result = resolveVariable(context, "(node1.a || node1.b) && node1.c");
            expect(result?.value).toBe(true);
        });
    });
});
