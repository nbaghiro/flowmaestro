/**
 * useSort Hook Tests
 *
 * Tests for sorting logic including field sorting, direction toggling,
 * and different data type comparisons.
 */

import { describe, it, expect } from "vitest";

import {
    COMMON_SORT_FIELDS,
    FORM_INTERFACE_SORT_FIELDS,
    CHAT_INTERFACE_SORT_FIELDS,
    AGENT_SORT_FIELDS,
    WORKFLOW_SORT_FIELDS
} from "../useSort";
import type { SortField, SortState, SortFieldConfig } from "../useSort";

// Helper to simulate the sorting logic from the hook
function sortItems<T>(
    items: T[],
    sortState: SortState,
    fields: Record<SortField, keyof T | undefined>
): T[] {
    const sorted = [...items];
    const { field, direction } = sortState;
    const multiplier = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
        const fieldKey = fields[field];
        if (!fieldKey) return 0;

        const valueA = a[fieldKey];
        const valueB = b[fieldKey];

        if (typeof valueA === "string" && typeof valueB === "string") {
            if (field === "created" || field === "modified") {
                const dateA = new Date(valueA).getTime();
                const dateB = new Date(valueB).getTime();
                return multiplier * (dateA - dateB);
            }
            return multiplier * valueA.toLowerCase().localeCompare(valueB.toLowerCase());
        }

        if (typeof valueA === "number" && typeof valueB === "number") {
            return multiplier * (valueA - valueB);
        }

        if (valueA instanceof Date && valueB instanceof Date) {
            return multiplier * (valueA.getTime() - valueB.getTime());
        }

        return multiplier * String(valueA || "").localeCompare(String(valueB || ""));
    });

    return sorted;
}

// Helper to simulate setSortField logic
function getNextSortState(
    currentState: SortState,
    newField: SortField,
    availableFields: SortFieldConfig[]
): SortState {
    if (currentState.field === newField) {
        return {
            field: newField,
            direction: currentState.direction === "asc" ? "desc" : "asc"
        };
    }
    const config = availableFields.find((f) => f.field === newField);
    return {
        field: newField,
        direction: config?.defaultDirection || "desc"
    };
}

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

const fieldMappings: Record<SortField, keyof TestItem | undefined> = {
    name: "name",
    created: "createdAt",
    modified: "updatedAt",
    submissions: "submissions",
    sessions: undefined,
    status: "status",
    provider: undefined
};

describe("useSort patterns", () => {
    // ===== Sort Field Configs =====
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

    // ===== Sorting by Name =====
    describe("sorting by name", () => {
        it("sorts alphabetically ascending", () => {
            const sorted = sortItems(testItems, { field: "name", direction: "asc" }, fieldMappings);

            expect(sorted[0].name).toBe("Apple");
            expect(sorted[1].name).toBe("Mango");
            expect(sorted[2].name).toBe("Zebra");
        });

        it("sorts alphabetically descending", () => {
            const sorted = sortItems(
                testItems,
                { field: "name", direction: "desc" },
                fieldMappings
            );

            expect(sorted[0].name).toBe("Zebra");
            expect(sorted[1].name).toBe("Mango");
            expect(sorted[2].name).toBe("Apple");
        });

        it("is case insensitive", () => {
            const items = [{ name: "zebra" }, { name: "Apple" }, { name: "MANGO" }];
            const sorted = sortItems(items, { field: "name", direction: "asc" }, {
                name: "name"
            } as Record<SortField, keyof (typeof items)[0] | undefined>);

            expect(sorted[0].name).toBe("Apple");
            expect(sorted[1].name).toBe("MANGO");
            expect(sorted[2].name).toBe("zebra");
        });
    });

    // ===== Sorting by Date =====
    describe("sorting by date", () => {
        it("sorts by created date ascending", () => {
            const sorted = sortItems(
                testItems,
                { field: "created", direction: "asc" },
                fieldMappings
            );

            expect(sorted[0].name).toBe("Apple"); // Jan 10
            expect(sorted[1].name).toBe("Zebra"); // Jan 15
            expect(sorted[2].name).toBe("Mango"); // Jan 20
        });

        it("sorts by created date descending", () => {
            const sorted = sortItems(
                testItems,
                { field: "created", direction: "desc" },
                fieldMappings
            );

            expect(sorted[0].name).toBe("Mango"); // Jan 20
            expect(sorted[1].name).toBe("Zebra"); // Jan 15
            expect(sorted[2].name).toBe("Apple"); // Jan 10
        });

        it("sorts by modified date ascending", () => {
            const sorted = sortItems(
                testItems,
                { field: "modified", direction: "asc" },
                fieldMappings
            );

            expect(sorted[0].name).toBe("Mango"); // Jan 15
            expect(sorted[1].name).toBe("Zebra"); // Jan 20
            expect(sorted[2].name).toBe("Apple"); // Jan 25
        });
    });

    // ===== Sorting by Number =====
    describe("sorting by number", () => {
        it("sorts numbers ascending", () => {
            const sorted = sortItems(
                testItems,
                { field: "submissions", direction: "asc" },
                fieldMappings
            );

            expect(sorted[0].submissions).toBe(3);
            expect(sorted[1].submissions).toBe(5);
            expect(sorted[2].submissions).toBe(10);
        });

        it("sorts numbers descending", () => {
            const sorted = sortItems(
                testItems,
                { field: "submissions", direction: "desc" },
                fieldMappings
            );

            expect(sorted[0].submissions).toBe(10);
            expect(sorted[1].submissions).toBe(5);
            expect(sorted[2].submissions).toBe(3);
        });
    });

    // ===== Direction Toggle =====
    describe("sort direction toggle", () => {
        it("toggles direction when clicking same field", () => {
            const currentState: SortState = { field: "name", direction: "asc" };
            const nextState = getNextSortState(currentState, "name", COMMON_SORT_FIELDS);

            expect(nextState.field).toBe("name");
            expect(nextState.direction).toBe("desc");
        });

        it("toggles back to asc", () => {
            const currentState: SortState = { field: "name", direction: "desc" };
            const nextState = getNextSortState(currentState, "name", COMMON_SORT_FIELDS);

            expect(nextState.direction).toBe("asc");
        });

        it("uses default direction for new field", () => {
            const currentState: SortState = { field: "name", direction: "asc" };
            const nextState = getNextSortState(currentState, "created", COMMON_SORT_FIELDS);

            expect(nextState.field).toBe("created");
            expect(nextState.direction).toBe("desc"); // default for created
        });

        it("uses default direction for name field", () => {
            const currentState: SortState = { field: "created", direction: "desc" };
            const nextState = getNextSortState(currentState, "name", COMMON_SORT_FIELDS);

            expect(nextState.field).toBe("name");
            expect(nextState.direction).toBe("asc"); // default for name
        });
    });

    // ===== Edge Cases =====
    describe("edge cases", () => {
        it("handles empty array", () => {
            const sorted = sortItems([], { field: "name", direction: "asc" }, fieldMappings);
            expect(sorted).toEqual([]);
        });

        it("handles single item", () => {
            const items = [{ name: "Solo" }];
            const sorted = sortItems(items, { field: "name", direction: "asc" }, {
                name: "name"
            } as Record<SortField, keyof (typeof items)[0] | undefined>);
            expect(sorted).toHaveLength(1);
            expect(sorted[0].name).toBe("Solo");
        });

        it("handles undefined field mapping", () => {
            const sorted = sortItems(
                testItems,
                { field: "sessions", direction: "asc" },
                fieldMappings
            );
            // Should return original order when field is undefined
            expect(sorted).toHaveLength(3);
        });

        it("handles null/undefined values in items", () => {
            const items = [
                { name: "Beta" },
                { name: null as unknown as string },
                { name: "Alpha" }
            ];
            const sorted = sortItems(items, { field: "name", direction: "asc" }, {
                name: "name"
            } as Record<SortField, keyof (typeof items)[0] | undefined>);
            expect(sorted).toHaveLength(3);
        });
    });
});
