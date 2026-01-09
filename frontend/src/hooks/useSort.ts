import { useState, useMemo, useCallback } from "react";

export type SortField =
    | "name"
    | "created"
    | "modified"
    | "submissions"
    | "sessions"
    | "status"
    | "provider";

export type SortDirection = "asc" | "desc";

export interface SortState {
    field: SortField;
    direction: SortDirection;
}

export interface SortFieldConfig {
    field: SortField;
    label: string;
    defaultDirection: SortDirection;
}

// Common field configs that can be reused
export const COMMON_SORT_FIELDS: SortFieldConfig[] = [
    { field: "name", label: "Name", defaultDirection: "asc" },
    { field: "created", label: "Date created", defaultDirection: "desc" },
    { field: "modified", label: "Date modified", defaultDirection: "desc" }
];

export const FORM_INTERFACE_SORT_FIELDS: SortFieldConfig[] = [
    ...COMMON_SORT_FIELDS,
    { field: "submissions", label: "Submissions", defaultDirection: "desc" },
    { field: "status", label: "Status", defaultDirection: "desc" }
];

export const CHAT_INTERFACE_SORT_FIELDS: SortFieldConfig[] = [
    ...COMMON_SORT_FIELDS,
    { field: "sessions", label: "Sessions", defaultDirection: "desc" },
    { field: "status", label: "Status", defaultDirection: "desc" }
];

export const AGENT_SORT_FIELDS: SortFieldConfig[] = [
    ...COMMON_SORT_FIELDS,
    { field: "provider", label: "Provider", defaultDirection: "asc" }
];

export const WORKFLOW_SORT_FIELDS: SortFieldConfig[] = [...COMMON_SORT_FIELDS];

interface FieldMappings<T> {
    name: keyof T;
    created: keyof T;
    modified: keyof T;
    submissions?: keyof T;
    sessions?: keyof T;
    status?: keyof T;
    provider?: keyof T;
}

interface UseSortOptions<T> {
    items: T[];
    fields: FieldMappings<T>;
    availableFields: SortFieldConfig[];
    defaultField?: SortField;
}

interface UseSortResult<T> {
    sortState: SortState;
    setSortField: (field: SortField) => void;
    sortedItems: T[];
    availableFields: SortFieldConfig[];
}

export function useSort<T>({
    items,
    fields,
    availableFields,
    defaultField = "created"
}: UseSortOptions<T>): UseSortResult<T> {
    const defaultConfig =
        availableFields.find((f) => f.field === defaultField) || availableFields[0];

    const [sortState, setSortState] = useState<SortState>({
        field: defaultConfig.field,
        direction: defaultConfig.defaultDirection
    });

    const setSortField = useCallback(
        (field: SortField) => {
            setSortState((prev) => {
                if (prev.field === field) {
                    // Toggle direction if same field
                    return {
                        field,
                        direction: prev.direction === "asc" ? "desc" : "asc"
                    };
                }
                // New field - use default direction for that field
                const config = availableFields.find((f) => f.field === field);
                return {
                    field,
                    direction: config?.defaultDirection || "desc"
                };
            });
        },
        [availableFields]
    );

    const sortedItems = useMemo(() => {
        const sorted = [...items];
        const { field, direction } = sortState;
        const multiplier = direction === "asc" ? 1 : -1;

        sorted.sort((a, b) => {
            const fieldKey = fields[field];
            if (!fieldKey) return 0;

            const valueA = a[fieldKey];
            const valueB = b[fieldKey];

            // Handle different value types
            if (typeof valueA === "string" && typeof valueB === "string") {
                // Check if it's a date string
                if (field === "created" || field === "modified") {
                    const dateA = new Date(valueA).getTime();
                    const dateB = new Date(valueB).getTime();
                    return multiplier * (dateA - dateB);
                }
                // Regular string comparison
                return multiplier * valueA.toLowerCase().localeCompare(valueB.toLowerCase());
            }

            if (typeof valueA === "number" && typeof valueB === "number") {
                return multiplier * (valueA - valueB);
            }

            // Handle Date objects
            if (valueA instanceof Date && valueB instanceof Date) {
                return multiplier * (valueA.getTime() - valueB.getTime());
            }

            // Fallback for other types
            return multiplier * String(valueA || "").localeCompare(String(valueB || ""));
        });

        return sorted;
    }, [items, sortState, fields]);

    return {
        sortState,
        setSortField,
        sortedItems,
        availableFields
    };
}
