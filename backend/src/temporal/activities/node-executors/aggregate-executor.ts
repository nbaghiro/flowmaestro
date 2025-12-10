import type { JsonArray, JsonObject, JsonValue } from "@flowmaestro/shared";
import { getVariableValue } from "./utils";

export interface AggregateNodeConfig {
    inputArray: string;
    operation: "sum" | "count" | "avg" | "min" | "max" | "first" | "last" | "custom";
    field?: string;
    groupBy?: string;
    customExpression?: string;
    outputVariable: string;
}

function getNestedValue(value: JsonValue, path: string): JsonValue | undefined {
    const keys = path.split(".");
    let current: JsonValue = value;

    for (const key of keys) {
        if (current === null || typeof current !== "object" || Array.isArray(current)) {
            return undefined;
        }

        const obj = current as JsonObject;
        current = obj[key] as JsonValue;
    }

    return current;
}

function groupBy(items: JsonArray, field: string): Record<string, JsonArray> {
    const groups: Record<string, JsonArray> = {};

    for (const raw of items) {
        const item = raw as JsonObject;
        const val = getNestedValue(item, field);
        const key = val === undefined || val === null ? "" : String(val);

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(item);
    }

    return groups;
}

function computeAggregate(
    items: JsonArray,
    operation: AggregateNodeConfig["operation"],
    field?: string
): JsonValue {
    let values: JsonValue[] = items;

    if (field) {
        values = items
            .map((raw) => getNestedValue(raw as JsonObject, field))
            .filter((v): v is JsonValue => v !== undefined);
    }

    // Numbers only for sum, avg, min, max
    const numeric = values.filter((v): v is number => typeof v === "number");

    switch (operation) {
        case "count":
            return values.length;

        case "sum":
            return numeric.reduce((a, b) => a + b, 0);

        case "avg":
            return numeric.length > 0 ? numeric.reduce((a, b) => a + b, 0) / numeric.length : 0;

        case "min":
            return numeric.length > 0 ? Math.min(...numeric) : null;

        case "max":
            return numeric.length > 0 ? Math.max(...numeric) : null;

        case "first":
            return values.length > 0 ? (values[0] ?? null) : null;

        case "last":
            return values.length > 0 ? (values[values.length - 1] ?? null) : null;

        case "custom":
            // Placeholder — future JSONata support
            return null;

        default:
            throw new Error(`Unknown aggregate operation: ${operation}`);
    }
}

export async function executeAggregateNode(
    config: AggregateNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const array = getVariableValue<JsonArray>(config.inputArray, context);

    if (!Array.isArray(array)) {
        throw new Error("Aggregate node requires array input");
    }

    let result: JsonValue;

    if (config.groupBy) {
        const groups = groupBy(array, config.groupBy);

        result = Object.fromEntries(
            Object.entries(groups).map(([key, items]) => [
                key,
                computeAggregate(items, config.operation, config.field)
            ])
        );
    } else {
        result = computeAggregate(array, config.operation, config.field);
    }

    return {
        [config.outputVariable]: result
    };
}
