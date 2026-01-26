import { describe, it, expect } from "vitest";
import { deepEqual, generateId } from "../utils";

describe("deepEqual", () => {
    describe("primitives", () => {
        it("should return true for identical strings", () => {
            expect(deepEqual("hello", "hello")).toBe(true);
        });

        it("should return false for different strings", () => {
            expect(deepEqual("hello", "world")).toBe(false);
        });

        it("should return true for identical numbers", () => {
            expect(deepEqual(42, 42)).toBe(true);
        });

        it("should return false for different numbers", () => {
            expect(deepEqual(42, 43)).toBe(false);
        });

        it("should return true for identical booleans", () => {
            expect(deepEqual(true, true)).toBe(true);
            expect(deepEqual(false, false)).toBe(true);
        });

        it("should return false for different booleans", () => {
            expect(deepEqual(true, false)).toBe(false);
        });

        it("should return true for both null", () => {
            expect(deepEqual(null, null)).toBe(true);
        });

        it("should return true for both undefined", () => {
            expect(deepEqual(undefined, undefined)).toBe(true);
        });

        it("should return false for null vs undefined", () => {
            expect(deepEqual(null, undefined)).toBe(false);
        });
    });

    describe("arrays", () => {
        it("should return true for empty arrays", () => {
            expect(deepEqual([], [])).toBe(true);
        });

        it("should return true for arrays with same elements", () => {
            expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        });

        it("should return false for arrays with different lengths", () => {
            expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
        });

        it("should return false for arrays with different elements", () => {
            expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
        });

        it("should return true for nested arrays", () => {
            expect(
                deepEqual(
                    [
                        [1, 2],
                        [3, 4]
                    ],
                    [
                        [1, 2],
                        [3, 4]
                    ]
                )
            ).toBe(true);
        });

        it("should return false for different nested arrays", () => {
            expect(
                deepEqual(
                    [
                        [1, 2],
                        [3, 4]
                    ],
                    [
                        [1, 2],
                        [3, 5]
                    ]
                )
            ).toBe(false);
        });
    });

    describe("objects", () => {
        it("should return true for empty objects", () => {
            expect(deepEqual({}, {})).toBe(true);
        });

        it("should return true for objects with same keys and values", () => {
            expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
        });

        it("should return false for objects with different keys", () => {
            expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
        });

        it("should return false for objects with different values", () => {
            expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
        });

        it("should return false for objects with different number of keys", () => {
            expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        });

        it("should return true for nested objects", () => {
            expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
        });

        it("should return false for different nested objects", () => {
            expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
        });
    });

    describe("mixed types", () => {
        it("should return true for arrays inside objects", () => {
            expect(deepEqual({ items: [1, 2, 3] }, { items: [1, 2, 3] })).toBe(true);
        });

        it("should return true for objects inside arrays", () => {
            expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
        });

        it("should return true for array vs object with same keys (implementation detail)", () => {
            // Note: deepEqual treats arrays as objects, so [1, 2] equals {0: 1, 1: 2}
            // This is the actual behavior - arrays are objects in JS
            expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(true);
        });

        it("should return false for different primitive types", () => {
            expect(deepEqual("1", 1)).toBe(false);
            expect(deepEqual(null, {})).toBe(false);
        });

        it("should return true for empty array vs empty object (implementation detail)", () => {
            // Note: Both [] and {} are empty objects from deepEqual's perspective
            expect(deepEqual([], {})).toBe(true);
        });
    });

    describe("edge cases", () => {
        it("should handle same reference", () => {
            const obj = { a: 1 };
            expect(deepEqual(obj, obj)).toBe(true);
        });

        it("should handle deeply nested structures", () => {
            const deep1 = { l1: { l2: { l3: { l4: { l5: "value" } } } } };
            const deep2 = { l1: { l2: { l3: { l4: { l5: "value" } } } } };
            expect(deepEqual(deep1, deep2)).toBe(true);
        });

        it("should handle objects with null values", () => {
            expect(deepEqual({ a: null }, { a: null })).toBe(true);
            expect(deepEqual({ a: null }, { a: undefined })).toBe(false);
        });
    });
});

describe("generateId", () => {
    it("should return a string", () => {
        const id = generateId();
        expect(typeof id).toBe("string");
    });

    it("should start with node_ prefix", () => {
        const id = generateId();
        expect(id.startsWith("node_")).toBe(true);
    });

    it("should contain a timestamp", () => {
        const before = Date.now();
        const id = generateId();
        const after = Date.now();

        // Extract timestamp from id (format: node_<timestamp>_<random>)
        const parts = id.split("_");
        const timestamp = parseInt(parts[1], 10);

        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("should generate unique IDs on consecutive calls", () => {
        const ids = new Set<string>();
        for (let i = 0; i < 100; i++) {
            ids.add(generateId());
        }
        expect(ids.size).toBe(100);
    });

    it("should have a random suffix", () => {
        const id = generateId();
        const parts = id.split("_");
        expect(parts.length).toBe(3);
        expect(parts[2].length).toBe(9); // 9 character random string
    });
});
