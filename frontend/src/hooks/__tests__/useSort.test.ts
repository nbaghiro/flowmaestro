/**
 * useSort Hook Tests
 *
 * Tests for sorting functionality using renderHook.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
    useSort,
    COMMON_SORT_FIELDS,
    FORM_INTERFACE_SORT_FIELDS,
    CHAT_INTERFACE_SORT_FIELDS,
    AGENT_SORT_FIELDS,
    WORKFLOW_SORT_FIELDS
} from "../useSort";
import type { SortField } from "../useSort";

// Test data
interface TestItem {
    name: string;
    createdAt: string;
    updatedAt: string;
    submissions?: number;
    status?: string;
}

const testItems: TestItem[] = [
    {
        name: "Zebra",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-20T10:00:00Z",
        submissions: 5
    },
    {
        name: "Apple",
        createdAt: "2024-01-10T10:00:00Z",
        updatedAt: "2024-01-25T10:00:00Z",
        submissions: 10
    },
    {
        name: "Mango",
        createdAt: "2024-01-20T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        submissions: 3
    }
];

const fieldMappings = {
    name: "name" as keyof TestItem,
    created: "createdAt" as keyof TestItem,
    modified: "updatedAt" as keyof TestItem,
    submissions: "submissions" as keyof TestItem,
    sessions: undefined,
    status: "status" as keyof TestItem,
    provider: undefined
};

describe("useSort", () => {
    // ===== Sort Field Configurations =====
    describe("sort field configurations", () => {
        it("COMMON_SORT_FIELDS has correct fields", () => {
            expect(COMMON_SORT_FIELDS).toHaveLength(3);
            expect(COMMON_SORT_FIELDS.map((f) => f.field)).toEqual(["name", "created", "modified"]);
        });

        it("name field defaults to ascending", () => {
            const nameField = COMMON_SORT_FIELDS.find((f) => f.field === "name");
            expect(nameField?.defaultDirection).toBe("asc");
        });

        it("date fields default to descending", () => {
            const createdField = COMMON_SORT_FIELDS.find((f) => f.field === "created");
            const modifiedField = COMMON_SORT_FIELDS.find((f) => f.field === "modified");
            expect(createdField?.defaultDirection).toBe("desc");
            expect(modifiedField?.defaultDirection).toBe("desc");
        });

        it("FORM_INTERFACE_SORT_FIELDS includes submissions", () => {
            const fields = FORM_INTERFACE_SORT_FIELDS.map((f) => f.field);
            expect(fields).toContain("submissions");
            expect(fields).toContain("status");
        });

        it("CHAT_INTERFACE_SORT_FIELDS includes sessions", () => {
            const fields = CHAT_INTERFACE_SORT_FIELDS.map((f) => f.field);
            expect(fields).toContain("sessions");
            expect(fields).toContain("status");
        });

        it("AGENT_SORT_FIELDS includes provider", () => {
            const fields = AGENT_SORT_FIELDS.map((f) => f.field);
            expect(fields).toContain("provider");
        });

        it("WORKFLOW_SORT_FIELDS equals common fields", () => {
            expect(WORKFLOW_SORT_FIELDS).toEqual(COMMON_SORT_FIELDS);
        });
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("uses default field and direction", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "created"
                })
            );

            expect(result.current.sortState.field).toBe("created");
            expect(result.current.sortState.direction).toBe("desc");
        });

        it("uses first available field when default not found", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "nonexistent" as SortField
                })
            );

            expect(result.current.sortState.field).toBe("name");
        });

        it("returns sorted items immediately", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "created"
                })
            );

            // Default is created desc, so Mango (Jan 20) should be first
            expect(result.current.sortedItems[0].name).toBe("Mango");
        });
    });

    // ===== Sorting by Name =====
    describe("sorting by name", () => {
        it("sorts alphabetically ascending", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "name"
                })
            );

            expect(result.current.sortedItems[0].name).toBe("Apple");
            expect(result.current.sortedItems[1].name).toBe("Mango");
            expect(result.current.sortedItems[2].name).toBe("Zebra");
        });

        it("sorts alphabetically descending after toggle", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "name"
                })
            );

            act(() => {
                result.current.setSortField("name"); // Toggle direction
            });

            expect(result.current.sortState.direction).toBe("desc");
            expect(result.current.sortedItems[0].name).toBe("Zebra");
            expect(result.current.sortedItems[1].name).toBe("Mango");
            expect(result.current.sortedItems[2].name).toBe("Apple");
        });

        it("is case insensitive", () => {
            const items = [{ name: "zebra" }, { name: "Apple" }, { name: "MANGO" }];
            const { result } = renderHook(() =>
                useSort({
                    items,
                    fields: { name: "name" } as typeof fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "name"
                })
            );

            expect(result.current.sortedItems[0].name).toBe("Apple");
            expect(result.current.sortedItems[1].name).toBe("MANGO");
            expect(result.current.sortedItems[2].name).toBe("zebra");
        });
    });

    // ===== Sorting by Date =====
    describe("sorting by date", () => {
        it("sorts by created date descending (default)", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "created"
                })
            );

            expect(result.current.sortedItems[0].name).toBe("Mango"); // Jan 20
            expect(result.current.sortedItems[1].name).toBe("Zebra"); // Jan 15
            expect(result.current.sortedItems[2].name).toBe("Apple"); // Jan 10
        });

        it("sorts by created date ascending after toggle", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "created"
                })
            );

            act(() => {
                result.current.setSortField("created"); // Toggle to asc
            });

            expect(result.current.sortedItems[0].name).toBe("Apple"); // Jan 10
            expect(result.current.sortedItems[1].name).toBe("Zebra"); // Jan 15
            expect(result.current.sortedItems[2].name).toBe("Mango"); // Jan 20
        });

        it("sorts by modified date", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "modified"
                })
            );

            expect(result.current.sortedItems[0].name).toBe("Apple"); // Jan 25
            expect(result.current.sortedItems[1].name).toBe("Zebra"); // Jan 20
            expect(result.current.sortedItems[2].name).toBe("Mango"); // Jan 15
        });
    });

    // ===== Sorting by Number =====
    describe("sorting by number", () => {
        it("sorts numbers descending (default for submissions)", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: FORM_INTERFACE_SORT_FIELDS,
                    defaultField: "submissions"
                })
            );

            expect(result.current.sortedItems[0].submissions).toBe(10);
            expect(result.current.sortedItems[1].submissions).toBe(5);
            expect(result.current.sortedItems[2].submissions).toBe(3);
        });

        it("sorts numbers ascending after toggle", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: FORM_INTERFACE_SORT_FIELDS,
                    defaultField: "submissions"
                })
            );

            act(() => {
                result.current.setSortField("submissions"); // Toggle to asc
            });

            expect(result.current.sortedItems[0].submissions).toBe(3);
            expect(result.current.sortedItems[1].submissions).toBe(5);
            expect(result.current.sortedItems[2].submissions).toBe(10);
        });
    });

    // ===== Field Switching =====
    describe("field switching", () => {
        it("uses default direction when switching to new field", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "created"
                })
            );

            expect(result.current.sortState.field).toBe("created");
            expect(result.current.sortState.direction).toBe("desc");

            act(() => {
                result.current.setSortField("name");
            });

            expect(result.current.sortState.field).toBe("name");
            expect(result.current.sortState.direction).toBe("asc"); // name defaults to asc
        });

        it("toggles direction when clicking same field", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "name"
                })
            );

            expect(result.current.sortState.direction).toBe("asc");

            act(() => {
                result.current.setSortField("name");
            });

            expect(result.current.sortState.direction).toBe("desc");

            act(() => {
                result.current.setSortField("name");
            });

            expect(result.current.sortState.direction).toBe("asc");
        });
    });

    // ===== Edge Cases =====
    describe("edge cases", () => {
        it("handles empty array", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: [],
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "name"
                })
            );

            expect(result.current.sortedItems).toEqual([]);
        });

        it("handles single item", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: [testItems[0]],
                    fields: fieldMappings,
                    availableFields: COMMON_SORT_FIELDS,
                    defaultField: "name"
                })
            );

            expect(result.current.sortedItems).toHaveLength(1);
        });

        it("handles undefined field mapping", () => {
            const { result } = renderHook(() =>
                useSort({
                    items: testItems,
                    fields: fieldMappings,
                    availableFields: CHAT_INTERFACE_SORT_FIELDS,
                    defaultField: "sessions"
                })
            );

            // sessions field is undefined in mappings, should maintain order
            expect(result.current.sortedItems).toHaveLength(3);
        });
    });

    // ===== Reactive Updates =====
    describe("reactive updates", () => {
        it("re-sorts when items change", () => {
            const { result, rerender } = renderHook(
                ({ items }) =>
                    useSort({
                        items,
                        fields: fieldMappings,
                        availableFields: COMMON_SORT_FIELDS,
                        defaultField: "name"
                    }),
                { initialProps: { items: testItems } }
            );

            expect(result.current.sortedItems[0].name).toBe("Apple");

            // Add item that should be first alphabetically
            const newItems = [
                ...testItems,
                {
                    name: "Aardvark",
                    createdAt: "2024-01-01",
                    updatedAt: "2024-01-01",
                    submissions: 1
                }
            ];
            rerender({ items: newItems });

            expect(result.current.sortedItems[0].name).toBe("Aardvark");
        });
    });
});
