/**
 * Core Utilities Tests
 *
 * Comprehensive tests for interpolation, cloning, parsing, and condition evaluation.
 * These utilities are foundational - used by virtually all handlers.
 */

import { InterpolationError } from "../errors";
import {
    interpolateVariables,
    interpolateWithObjectSupport,
    deepClone,
    resolveArrayPath,
    parseValue,
    evaluateCondition
} from "../utils";

// ============================================================================
// INTERPOLATE VARIABLES
// ============================================================================

describe("interpolateVariables", () => {
    describe("simple variable replacement", () => {
        it("should replace a simple variable", () => {
            const result = interpolateVariables("Hello, {{name}}!", { name: "World" });
            expect(result).toBe("Hello, World!");
        });

        it("should replace multiple variables", () => {
            const result = interpolateVariables("{{greeting}}, {{name}}!", {
                greeting: "Hello",
                name: "World"
            });
            expect(result).toBe("Hello, World!");
        });

        it("should replace same variable multiple times", () => {
            const result = interpolateVariables("{{x}} + {{x}} = {{x}}{{x}}", { x: "1" });
            expect(result).toBe("1 + 1 = 11");
        });

        it("should handle variables with whitespace", () => {
            const result = interpolateVariables("{{ name }}", { name: "World" });
            expect(result).toBe("World");
        });

        it("should handle empty string variable", () => {
            const result = interpolateVariables("Value: {{empty}}", { empty: "" });
            expect(result).toBe("Value: ");
        });

        it("should convert numbers to strings", () => {
            const result = interpolateVariables("Count: {{count}}", { count: 42 });
            expect(result).toBe("Count: 42");
        });

        it("should convert booleans to strings", () => {
            const result = interpolateVariables("Active: {{active}}", { active: true });
            expect(result).toBe("Active: true");
        });

        it("should handle null values", () => {
            const result = interpolateVariables("Value: {{val}}", { val: null });
            expect(result).toBe("Value: null");
        });
    });

    describe("nested object paths", () => {
        it("should resolve nested object paths", () => {
            const context = { user: { profile: { name: "Alice" } } };
            const result = interpolateVariables("Name: {{user.profile.name}}", context);
            expect(result).toBe("Name: Alice");
        });

        it("should resolve deeply nested paths", () => {
            const context = { a: { b: { c: { d: { e: "deep" } } } } };
            const result = interpolateVariables("{{a.b.c.d.e}}", context);
            expect(result).toBe("deep");
        });

        it("should return original placeholder for missing nested path", () => {
            const context = { user: { profile: {} } };
            const result = interpolateVariables("{{user.profile.name}}", context);
            expect(result).toBe("{{user.profile.name}}");
        });

        it("should return original placeholder when intermediate is null", () => {
            const context = { user: null };
            const result = interpolateVariables(
                "{{user.profile.name}}",
                context as Record<string, unknown>
            );
            expect(result).toBe("{{user.profile.name}}");
        });
    });

    describe("array indices", () => {
        it("should resolve array indices with bracket notation", () => {
            const context = { items: ["a", "b", "c"] };
            const result = interpolateVariables("{{items[1]}}", context);
            expect(result).toBe("b");
        });

        it("should resolve nested arrays", () => {
            const context = {
                matrix: [
                    ["a", "b"],
                    ["c", "d"]
                ]
            };
            const result = interpolateVariables("{{matrix[1][0]}}", context);
            expect(result).toBe("c");
        });

        it("should resolve object in array", () => {
            const context = { users: [{ name: "Alice" }, { name: "Bob" }] };
            const result = interpolateVariables("{{users[1].name}}", context);
            expect(result).toBe("Bob");
        });

        it("should handle complex paths like paper.link[0].$.href", () => {
            const context = {
                paper: {
                    link: [{ $: { href: "https://example.com" } }]
                }
            };
            const result = interpolateVariables("{{paper.link[0].$.href}}", context);
            expect(result).toBe("https://example.com");
        });
    });

    describe("quoted key notation", () => {
        it("should handle single-quoted keys", () => {
            const context = { data: { "special-key": "value" } };
            const result = interpolateVariables("{{data['special-key']}}", context);
            expect(result).toBe("value");
        });

        it("should handle double-quoted keys", () => {
            const context = { data: { "another-key": "value2" } };
            const result = interpolateVariables('{{data["another-key"]}}', context);
            expect(result).toBe("value2");
        });
    });

    describe("strict mode", () => {
        it("should throw in strict mode for missing variable", () => {
            expect(() => {
                interpolateVariables("{{missing}}", {}, { strict: true });
            }).toThrow(InterpolationError);
        });

        it("should throw in strict mode for null path segment", () => {
            expect(() => {
                interpolateVariables("{{a.b.c}}", { a: null } as Record<string, unknown>, {
                    strict: true
                });
            }).toThrow(InterpolationError);
        });

        it("should include variable name in error", () => {
            try {
                interpolateVariables("{{myVar}}", {}, { strict: true });
                fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(InterpolationError);
                expect((error as InterpolationError).message).toContain("myVar");
            }
        });
    });

    describe("stringifyObjects option", () => {
        it("should stringify objects when enabled", () => {
            const context = { data: { key: "value" } };
            const result = interpolateVariables("{{data}}", context, { stringifyObjects: true });
            expect(result).toBe('{"key":"value"}');
        });

        it("should stringify arrays when enabled", () => {
            const context = { items: [1, 2, 3] };
            const result = interpolateVariables("{{items}}", context, { stringifyObjects: true });
            expect(result).toBe("[1,2,3]");
        });

        it("should return [object Object] when stringifyObjects is disabled", () => {
            const context = { data: { key: "value" } };
            const result = interpolateVariables("{{data}}", context);
            expect(result).toBe("[object Object]");
        });
    });

    describe("edge cases", () => {
        it("should handle string with no placeholders", () => {
            const result = interpolateVariables("No variables here", { foo: "bar" });
            expect(result).toBe("No variables here");
        });

        it("should handle empty string", () => {
            const result = interpolateVariables("", { foo: "bar" });
            expect(result).toBe("");
        });

        it("should handle empty context", () => {
            const result = interpolateVariables("{{missing}}", {});
            expect(result).toBe("{{missing}}");
        });

        it("should not match incomplete braces", () => {
            const result = interpolateVariables("{name}", { name: "test" });
            expect(result).toBe("{name}");
        });

        it("should handle adjacent placeholders", () => {
            const result = interpolateVariables("{{a}}{{b}}{{c}}", { a: "1", b: "2", c: "3" });
            expect(result).toBe("123");
        });
    });
});

// ============================================================================
// INTERPOLATE WITH OBJECT SUPPORT
// ============================================================================

describe("interpolateWithObjectSupport", () => {
    it("should return parsed JSON object", () => {
        const context = { data: '{"key": "value"}' };
        const result = interpolateWithObjectSupport("{{data}}", context);
        expect(result).toEqual({ key: "value" });
    });

    it("should return parsed JSON array", () => {
        const context = { items: "[1, 2, 3]" };
        const result = interpolateWithObjectSupport("{{items}}", context);
        expect(result).toEqual([1, 2, 3]);
    });

    it("should return string if not valid JSON", () => {
        const context = { text: "Hello, World!" };
        const result = interpolateWithObjectSupport("{{text}}", context);
        expect(result).toBe("Hello, World!");
    });

    it("should handle interpolated JSON with variables", () => {
        const context = { name: "Alice", age: 30 };
        const result = interpolateWithObjectSupport(
            '{"name": "{{name}}", "age": "{{age}}"}',
            context
        );
        expect(result).toEqual({ name: "Alice", age: "30" });
    });

    it("should return string for invalid JSON-like string", () => {
        const context = { data: "{not valid json" };
        const result = interpolateWithObjectSupport("{{data}}", context);
        expect(result).toBe("{not valid json");
    });

    it("should handle nested object stringification", () => {
        const context = { nested: { inner: { value: 42 } } };
        // This produces a JSON string of the nested object
        const result = interpolateWithObjectSupport("{{nested}}", context);
        expect(result).toEqual({ inner: { value: 42 } });
    });
});

// ============================================================================
// DEEP CLONE
// ============================================================================

describe("deepClone", () => {
    it("should clone primitive values", () => {
        expect(deepClone(42)).toBe(42);
        expect(deepClone("hello")).toBe("hello");
        expect(deepClone(true)).toBe(true);
        expect(deepClone(null)).toBe(null);
        expect(deepClone(undefined)).toBe(undefined);
    });

    it("should clone simple objects", () => {
        const original = { a: 1, b: "two" };
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
    });

    it("should clone nested objects", () => {
        const original = { outer: { inner: { value: 42 } } };
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned.outer).not.toBe(original.outer);
        expect(cloned.outer.inner).not.toBe(original.outer.inner);
    });

    it("should clone arrays", () => {
        const original = [1, 2, 3];
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
    });

    it("should clone arrays with objects", () => {
        const original = [{ a: 1 }, { b: 2 }];
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned[0]).not.toBe(original[0]);
    });

    it("should clone Date objects", () => {
        const original = new Date("2024-01-15T12:00:00Z");
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.getTime()).toBe(original.getTime());
    });

    it("should handle mixed structures", () => {
        const original = {
            name: "test",
            items: [1, 2, 3],
            metadata: {
                created: new Date("2024-01-01"),
                tags: ["a", "b"]
            }
        };
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned.items).not.toBe(original.items);
        expect(cloned.metadata).not.toBe(original.metadata);
        expect(cloned.metadata.created).not.toBe(original.metadata.created);
    });

    it("should not affect original when modifying clone", () => {
        const original = { nested: { value: 1 } };
        const cloned = deepClone(original);
        cloned.nested.value = 999;
        expect(original.nested.value).toBe(1);
    });
});

// ============================================================================
// RESOLVE ARRAY PATH
// ============================================================================

describe("resolveArrayPath", () => {
    it("should resolve simple array path", () => {
        const context = { items: [1, 2, 3] };
        const result = resolveArrayPath("items", context);
        expect(result).toEqual([1, 2, 3]);
    });

    it("should resolve nested array path", () => {
        const context = { data: { results: ["a", "b", "c"] } };
        const result = resolveArrayPath("data.results", context);
        expect(result).toEqual(["a", "b", "c"]);
    });

    it("should resolve array with bracket notation", () => {
        const context = { nested: { list: [1, 2, 3] } };
        const result = resolveArrayPath("nested.list", context);
        expect(result).toEqual([1, 2, 3]);
    });

    it("should return undefined for non-array value", () => {
        const context = { notAnArray: { key: "value" } };
        const result = resolveArrayPath("notAnArray", context);
        expect(result).toBeUndefined();
    });

    it("should return undefined for missing path", () => {
        const context = { data: {} };
        const result = resolveArrayPath("data.missing.path", context);
        expect(result).toBeUndefined();
    });

    it("should return undefined for null in path", () => {
        const context = { data: null } as Record<string, unknown>;
        const result = resolveArrayPath("data.items", context);
        expect(result).toBeUndefined();
    });

    it("should handle array index in path", () => {
        const context = { nested: [{ items: [1, 2] }, { items: [3, 4] }] };
        const result = resolveArrayPath("nested[1].items", context);
        expect(result).toEqual([3, 4]);
    });
});

// ============================================================================
// PARSE VALUE
// ============================================================================

describe("parseValue", () => {
    describe("numbers", () => {
        it("should parse integers", () => {
            expect(parseValue("42")).toBe(42);
            expect(parseValue("-17")).toBe(-17);
            expect(parseValue("0")).toBe(0);
        });

        it("should parse floats", () => {
            expect(parseValue("3.14")).toBe(3.14);
            expect(parseValue("-0.5")).toBe(-0.5);
        });

        it("should not parse empty string as zero", () => {
            expect(parseValue("")).toBe("");
            expect(parseValue("   ")).toBe("   ");
        });
    });

    describe("booleans", () => {
        it("should parse true", () => {
            expect(parseValue("true")).toBe(true);
            expect(parseValue("TRUE")).toBe(true);
            expect(parseValue("True")).toBe(true);
        });

        it("should parse false", () => {
            expect(parseValue("false")).toBe(false);
            expect(parseValue("FALSE")).toBe(false);
            expect(parseValue("False")).toBe(false);
        });
    });

    describe("null", () => {
        it("should parse null", () => {
            expect(parseValue("null")).toBe(null);
            expect(parseValue("NULL")).toBe(null);
            expect(parseValue("Null")).toBe(null);
        });
    });

    describe("JSON", () => {
        it("should parse JSON objects", () => {
            expect(parseValue('{"key": "value"}')).toEqual({ key: "value" });
        });

        it("should parse JSON arrays", () => {
            expect(parseValue("[1, 2, 3]")).toEqual([1, 2, 3]);
        });

        it("should parse nested JSON", () => {
            const result = parseValue('{"a": {"b": [1, 2]}}');
            expect(result).toEqual({ a: { b: [1, 2] } });
        });
    });

    describe("strings", () => {
        it("should return plain strings as-is", () => {
            expect(parseValue("hello world")).toBe("hello world");
        });

        it("should not parse partial numbers", () => {
            expect(parseValue("123abc")).toBe("123abc");
        });

        it("should return invalid JSON as string", () => {
            expect(parseValue("{invalid}")).toBe("{invalid}");
        });
    });
});

// ============================================================================
// EVALUATE CONDITION
// ============================================================================

describe("evaluateCondition", () => {
    describe("equality operators", () => {
        it("should evaluate == (loose equality)", () => {
            expect(evaluateCondition("5", "==", 5)).toBe(true);
            expect(evaluateCondition("5", "==", "5")).toBe(true);
            expect(evaluateCondition(null, "==", undefined)).toBe(true);
            expect(evaluateCondition("5", "==", 6)).toBe(false);
        });

        it("should evaluate equals alias", () => {
            expect(evaluateCondition("test", "equals", "test")).toBe(true);
        });

        it("should evaluate === (strict equality)", () => {
            expect(evaluateCondition(5, "===", 5)).toBe(true);
            expect(evaluateCondition("5", "===", 5)).toBe(false);
            expect(evaluateCondition(null, "===", undefined)).toBe(false);
        });

        it("should evaluate strictEquals alias", () => {
            expect(evaluateCondition(5, "strictEquals", 5)).toBe(true);
        });

        it("should evaluate != (loose inequality)", () => {
            expect(evaluateCondition("5", "!=", 6)).toBe(true);
            expect(evaluateCondition("5", "!=", 5)).toBe(false);
        });

        it("should evaluate notEquals alias", () => {
            expect(evaluateCondition("a", "notEquals", "b")).toBe(true);
        });

        it("should evaluate !== (strict inequality)", () => {
            expect(evaluateCondition("5", "!==", 5)).toBe(true);
            expect(evaluateCondition(5, "!==", 5)).toBe(false);
        });

        it("should evaluate strictNotEquals alias", () => {
            expect(evaluateCondition("5", "strictNotEquals", 5)).toBe(true);
        });
    });

    describe("comparison operators", () => {
        it("should evaluate > (greater than)", () => {
            expect(evaluateCondition(10, ">", 5)).toBe(true);
            expect(evaluateCondition(5, ">", 10)).toBe(false);
            expect(evaluateCondition(5, ">", 5)).toBe(false);
        });

        it("should evaluate greaterThan alias", () => {
            expect(evaluateCondition(10, "greaterThan", 5)).toBe(true);
        });

        it("should evaluate >= (greater than or equal)", () => {
            expect(evaluateCondition(10, ">=", 5)).toBe(true);
            expect(evaluateCondition(5, ">=", 5)).toBe(true);
            expect(evaluateCondition(4, ">=", 5)).toBe(false);
        });

        it("should evaluate greaterThanOrEqual alias", () => {
            expect(evaluateCondition(5, "greaterThanOrEqual", 5)).toBe(true);
        });

        it("should evaluate < (less than)", () => {
            expect(evaluateCondition(5, "<", 10)).toBe(true);
            expect(evaluateCondition(10, "<", 5)).toBe(false);
            expect(evaluateCondition(5, "<", 5)).toBe(false);
        });

        it("should evaluate lessThan alias", () => {
            expect(evaluateCondition(5, "lessThan", 10)).toBe(true);
        });

        it("should evaluate <= (less than or equal)", () => {
            expect(evaluateCondition(5, "<=", 10)).toBe(true);
            expect(evaluateCondition(5, "<=", 5)).toBe(true);
            expect(evaluateCondition(10, "<=", 5)).toBe(false);
        });

        it("should evaluate lessThanOrEqual alias", () => {
            expect(evaluateCondition(5, "lessThanOrEqual", 5)).toBe(true);
        });

        it("should coerce strings to numbers for comparisons", () => {
            expect(evaluateCondition("10", ">", "5")).toBe(true);
            expect(evaluateCondition("10", ">", 5)).toBe(true);
        });
    });

    describe("string operators", () => {
        it("should evaluate contains", () => {
            expect(evaluateCondition("hello world", "contains", "world")).toBe(true);
            expect(evaluateCondition("hello world", "contains", "foo")).toBe(false);
        });

        it("should evaluate startsWith", () => {
            expect(evaluateCondition("hello world", "startsWith", "hello")).toBe(true);
            expect(evaluateCondition("hello world", "startsWith", "world")).toBe(false);
        });

        it("should evaluate endsWith", () => {
            expect(evaluateCondition("hello world", "endsWith", "world")).toBe(true);
            expect(evaluateCondition("hello world", "endsWith", "hello")).toBe(false);
        });

        it("should evaluate matches (regex)", () => {
            expect(evaluateCondition("test123", "matches", "^test\\d+$")).toBe(true);
            expect(evaluateCondition("test123", "matches", "^\\d+$")).toBe(false);
        });

        it("should coerce non-strings", () => {
            expect(evaluateCondition(12345, "contains", "234")).toBe(true);
        });
    });

    describe("null/empty operators", () => {
        it("should evaluate isEmpty", () => {
            expect(evaluateCondition(null, "isEmpty", null)).toBe(true);
            expect(evaluateCondition(undefined, "isEmpty", null)).toBe(true);
            expect(evaluateCondition("", "isEmpty", null)).toBe(true);
            expect(evaluateCondition([], "isEmpty", null)).toBe(true);
            expect(evaluateCondition("hello", "isEmpty", null)).toBe(false);
            expect(evaluateCondition([1], "isEmpty", null)).toBe(false);
        });

        it("should evaluate isNotEmpty", () => {
            expect(evaluateCondition("hello", "isNotEmpty", null)).toBe(true);
            expect(evaluateCondition([1, 2], "isNotEmpty", null)).toBe(true);
            expect(evaluateCondition(null, "isNotEmpty", null)).toBe(false);
            expect(evaluateCondition("", "isNotEmpty", null)).toBe(false);
        });

        it("should evaluate isNull", () => {
            expect(evaluateCondition(null, "isNull", null)).toBe(true);
            expect(evaluateCondition(undefined, "isNull", null)).toBe(true);
            expect(evaluateCondition("", "isNull", null)).toBe(false);
            expect(evaluateCondition(0, "isNull", null)).toBe(false);
        });

        it("should evaluate isNotNull", () => {
            expect(evaluateCondition("hello", "isNotNull", null)).toBe(true);
            expect(evaluateCondition(0, "isNotNull", null)).toBe(true);
            expect(evaluateCondition(null, "isNotNull", null)).toBe(false);
            expect(evaluateCondition(undefined, "isNotNull", null)).toBe(false);
        });
    });

    describe("unknown operators", () => {
        it("should return false for unknown operators", () => {
            expect(evaluateCondition("a", "unknownOp", "b")).toBe(false);
        });
    });
});
