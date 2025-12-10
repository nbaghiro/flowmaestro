import type { JsonArray, JsonObject, JsonValue } from "@flowmaestro/shared";
import { getVariableValue } from "./utils";

export interface DeduplicateNodeConfig {
    inputArray: string;
    keyFields: string[];
    keep: "first" | "last";
    caseSensitive: boolean;
    outputVariable: string;
    duplicatesVariable?: string;
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

export async function executeDeduplicateNode(
    config: DeduplicateNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const array = getVariableValue(config.inputArray, context);

    if (!Array.isArray(array)) {
        throw new Error("Deduplicate node requires array input");
    }

    const seen = new Map<string, number>();
    const unique: JsonValue[] = [];
    const duplicates: JsonValue[] = [];

    const makeKey = (item: JsonObject): string => {
        return config.keyFields
            .map((field) => {
                let val = getNestedValue(item, field);
                if (typeof val === "string" && !config.caseSensitive) {
                    val = val.toLowerCase();
                }
                return String(val);
            })
            .join("|");
    };

    const items: JsonArray = config.keep === "last" ? [...array].reverse() : array;

    for (const item of items) {
        const key = makeKey(item as JsonObject);

        if (!seen.has(key)) {
            seen.set(key, unique.length);
            unique.push(item);
        } else {
            duplicates.push(item);
        }
    }

    const resultArray = config.keep === "last" ? unique.reverse() : unique;

    const result: JsonObject = {
        [config.outputVariable]: resultArray,
        [`${config.outputVariable}_count`]: resultArray.length,
        duplicateCount: duplicates.length
    };

    if (config.duplicatesVariable) {
        result[config.duplicatesVariable] = duplicates;
    }

    return result;
}
