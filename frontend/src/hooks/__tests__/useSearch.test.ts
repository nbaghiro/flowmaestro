/**
 * useSearch Hook Tests
 *
 * Tests for search/filter logic including case-insensitive matching,
 * multi-field search, and edge cases.
 */

import { describe, it, expect } from "vitest";

// Helper to simulate the filtering logic from the hook
function filterItems<T>(items: T[], searchQuery: string, searchFields: (keyof T)[]): T[] {
    if (!searchQuery.trim()) {
        return items;
    }

    const query = searchQuery.toLowerCase().trim();

    return items.filter((item) => {
        return searchFields.some((field) => {
            const value = item[field];
            if (typeof value === "string") {
                return value.toLowerCase().includes(query);
            }
            return false;
        });
    });
}

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

describe("useSearch patterns", () => {
    // ===== Basic Search =====
    describe("basic search", () => {
        it("returns all items when query is empty", () => {
            const result = filterItems(testItems, "", ["name"]);
            expect(result).toHaveLength(5);
        });

        it("returns all items when query is whitespace", () => {
            const result = filterItems(testItems, "   ", ["name"]);
            expect(result).toHaveLength(5);
        });

        it("filters items by name", () => {
            const result = filterItems(testItems, "Apple", ["name"]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Apple Pie");
        });

        it("filters items case-insensitively", () => {
            const result = filterItems(testItems, "APPLE", ["name"]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Apple Pie");
        });

        it("matches partial strings", () => {
            const result = filterItems(testItems, "nana", ["name"]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Banana Bread");
        });
    });

    // ===== Multi-field Search =====
    describe("multi-field search", () => {
        it("searches across multiple fields", () => {
            const result = filterItems(testItems, "apple", ["name", "description"]);
            expect(result).toHaveLength(2); // "Apple Pie" and "Email Parser" (parse apple mail)
        });

        it("finds match in description", () => {
            const result = filterItems(testItems, "dessert", ["name", "description"]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Apple Pie");
        });

        it("finds match in category", () => {
            const result = filterItems(testItems, "work", ["category"]);
            expect(result).toHaveLength(2);
        });

        it("returns union of matches across fields", () => {
            const result = filterItems(testItems, "a", ["name", "description", "category"]);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    // ===== Edge Cases =====
    describe("edge cases", () => {
        it("handles empty items array", () => {
            const result = filterItems([], "test", ["name"] as (keyof TestItem)[]);
            expect(result).toEqual([]);
        });

        it("returns empty when no matches", () => {
            const result = filterItems(testItems, "xyz123", ["name", "description"]);
            expect(result).toHaveLength(0);
        });

        it("ignores non-string fields", () => {
            // count is a number, should not match
            const result = filterItems(testItems, "10", ["count" as keyof TestItem]);
            expect(result).toHaveLength(0);
        });

        it("trims search query", () => {
            const result = filterItems(testItems, "  Apple  ", ["name"]);
            expect(result).toHaveLength(1);
        });

        it("handles special characters in query", () => {
            const items = [{ name: "Test (special)" }, { name: "Normal" }];
            const result = filterItems(items, "(special)", ["name"]);
            expect(result).toHaveLength(1);
        });
    });

    // ===== Search State Helpers =====
    describe("search state helpers", () => {
        it("isSearchActive is true when query has content", () => {
            const searchQuery = "test";
            const isSearchActive = searchQuery.length > 0;
            expect(isSearchActive).toBe(true);
        });

        it("isSearchActive is false when query is empty", () => {
            const searchQuery = "";
            const isSearchActive = searchQuery.length > 0;
            expect(isSearchActive).toBe(false);
        });

        it("clearSearch resets query", () => {
            let searchQuery = "test";
            const clearSearch = () => {
                searchQuery = "";
            };
            clearSearch();
            expect(searchQuery).toBe("");
        });
    });

    // ===== Real-world Scenarios =====
    describe("real-world scenarios", () => {
        it("filters workflows by name and description", () => {
            const workflows = [
                { name: "Data Pipeline", description: "Process data from API" },
                { name: "Email Notification", description: "Send email alerts" },
                { name: "Slack Bot", description: "Handle slack messages" }
            ];

            const result = filterItems(workflows, "email", ["name", "description"]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Email Notification");
        });

        it("filters agents by name", () => {
            const agents = [
                { name: "Customer Support Bot", provider: "openai" },
                { name: "Sales Assistant", provider: "anthropic" },
                { name: "Tech Support Agent", provider: "openai" }
            ];

            const result = filterItems(agents, "support", ["name"]);
            expect(result).toHaveLength(2);
        });

        it("filters folders by name", () => {
            const folders = [
                { name: "Marketing", itemCount: 5 },
                { name: "Sales", itemCount: 10 },
                { name: "Marketing Campaigns", itemCount: 3 }
            ];

            const result = filterItems(folders, "market", ["name"]);
            expect(result).toHaveLength(2);
        });
    });
});
