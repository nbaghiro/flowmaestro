/**
 * useSearch Hook Tests
 *
 * Tests for search/filter functionality using renderHook.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useSearch } from "../useSearch";

// Test data
interface TestItem {
    id: string;
    name: string;
    description: string;
    category: string;
    count: number;
}

const testItems: TestItem[] = [
    { id: "1", name: "Apple Pie", description: "Delicious dessert", category: "food", count: 10 },
    { id: "2", name: "Banana Bread", description: "Sweet breakfast", category: "food", count: 5 },
    { id: "3", name: "Carrot Cake", description: "Healthy treat", category: "dessert", count: 8 },
    {
        id: "4",
        name: "Data Analysis",
        description: "Analytics workflow",
        category: "work",
        count: 15
    },
    { id: "5", name: "Email Parser", description: "Parse apple mail", category: "work", count: 3 }
];

describe("useSearch", () => {
    // ===== Initial State =====
    describe("initial state", () => {
        it("starts with empty search query", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            expect(result.current.searchQuery).toBe("");
        });

        it("returns all items when search is empty", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            expect(result.current.filteredItems).toHaveLength(5);
        });

        it("isSearchActive is false initially", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            expect(result.current.isSearchActive).toBe(false);
        });
    });

    // ===== Search Functionality =====
    describe("search functionality", () => {
        it("filters items when search query is set", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("Apple");
            });

            expect(result.current.filteredItems).toHaveLength(1);
            expect(result.current.filteredItems[0].name).toBe("Apple Pie");
        });

        it("sets isSearchActive to true when query has content", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("test");
            });

            expect(result.current.isSearchActive).toBe(true);
        });

        it("filters case-insensitively", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("APPLE");
            });

            expect(result.current.filteredItems).toHaveLength(1);
            expect(result.current.filteredItems[0].name).toBe("Apple Pie");
        });

        it("matches partial strings", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("nana");
            });

            expect(result.current.filteredItems).toHaveLength(1);
            expect(result.current.filteredItems[0].name).toBe("Banana Bread");
        });

        it("trims search query whitespace", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("  Apple  ");
            });

            expect(result.current.filteredItems).toHaveLength(1);
        });

        it("returns all items for whitespace-only query", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("   ");
            });

            expect(result.current.filteredItems).toHaveLength(5);
        });
    });

    // ===== Multi-field Search =====
    describe("multi-field search", () => {
        it("searches across multiple fields", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name", "description"] })
            );

            act(() => {
                result.current.setSearchQuery("apple");
            });

            // "Apple Pie" and "Email Parser" (parse apple mail)
            expect(result.current.filteredItems).toHaveLength(2);
        });

        it("finds match in description field", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name", "description"] })
            );

            act(() => {
                result.current.setSearchQuery("dessert");
            });

            expect(result.current.filteredItems).toHaveLength(1);
            expect(result.current.filteredItems[0].name).toBe("Apple Pie");
        });

        it("finds match in category field", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["category"] })
            );

            act(() => {
                result.current.setSearchQuery("work");
            });

            expect(result.current.filteredItems).toHaveLength(2);
        });
    });

    // ===== Clear Search =====
    describe("clearSearch", () => {
        it("resets search query to empty", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("Apple");
            });

            expect(result.current.filteredItems).toHaveLength(1);

            act(() => {
                result.current.clearSearch();
            });

            expect(result.current.searchQuery).toBe("");
            expect(result.current.filteredItems).toHaveLength(5);
            expect(result.current.isSearchActive).toBe(false);
        });
    });

    // ===== Edge Cases =====
    describe("edge cases", () => {
        it("handles empty items array", () => {
            const { result } = renderHook(() =>
                useSearch({ items: [] as TestItem[], searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("test");
            });

            expect(result.current.filteredItems).toEqual([]);
        });

        it("returns empty when no matches", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["name"] })
            );

            act(() => {
                result.current.setSearchQuery("xyz123nonexistent");
            });

            expect(result.current.filteredItems).toHaveLength(0);
        });

        it("ignores non-string fields", () => {
            const { result } = renderHook(() =>
                useSearch({ items: testItems, searchFields: ["count" as keyof TestItem] })
            );

            act(() => {
                result.current.setSearchQuery("10");
            });

            // count is a number, should not match
            expect(result.current.filteredItems).toHaveLength(0);
        });

        it("handles special characters in query", () => {
            const items = [{ name: "Test (special)" }, { name: "Normal" }];
            const { result } = renderHook(() => useSearch({ items, searchFields: ["name"] }));

            act(() => {
                result.current.setSearchQuery("(special)");
            });

            expect(result.current.filteredItems).toHaveLength(1);
        });
    });

    // ===== Reactive Updates =====
    describe("reactive updates", () => {
        it("updates filtered items when source items change", () => {
            const { result, rerender } = renderHook(
                ({ items }) => useSearch({ items, searchFields: ["name"] }),
                { initialProps: { items: testItems } }
            );

            act(() => {
                result.current.setSearchQuery("Apple");
            });

            expect(result.current.filteredItems).toHaveLength(1);

            // Add another item with "Apple" in name
            const newItems = [
                ...testItems,
                {
                    id: "6",
                    name: "Apple Juice",
                    description: "Drink",
                    category: "beverage",
                    count: 20
                }
            ];
            rerender({ items: newItems });

            expect(result.current.filteredItems).toHaveLength(2);
        });
    });
});
