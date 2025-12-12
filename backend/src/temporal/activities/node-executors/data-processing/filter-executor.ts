import jsonata from "jsonata";
import type { JsonObject } from "@flowmaestro/shared";
import { getVariableValue } from "../../../utils/node-execution/utils";

export interface FilterNodeConfig {
    inputArray: string; // "${items}" - array to filter
    expression: string; // Boolean expression: "item.status = 'active'" for JSONata
    mode: "keep" | "remove";
    outputVariable: string;
    removedVariable?: string;
}

export async function executeFilterNode(
    config: FilterNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const array = getVariableValue(config.inputArray, context);

    if (!Array.isArray(array)) {
        throw new Error("Filter node requires array input");
    }

    // Evaluate the predicate per item, exposing fields directly and under $item for clarity
    const expr = jsonata(config.expression);
    const matchingIndices: number[] = [];

    for (let i = 0; i < array.length; i += 1) {
        const item = array[i];
        const isMatch = await expr.evaluate({ ...context, ...item, $item: item, $v: item });
        if (isMatch) {
            matchingIndices.push(i);
        }
    }

    const filtered =
        config.mode === "keep"
            ? matchingIndices.map((index) => array[index])
            : array.filter((_item, index) => !matchingIndices.includes(index));

    const removed =
        config.mode === "keep"
            ? array.filter((_item, index) => !matchingIndices.includes(index))
            : matchingIndices.map((index) => array[index]);

    const result: JsonObject = {
        [config.outputVariable]: filtered,
        [`${config.outputVariable}_count`]: filtered.length
    };

    if (config.removedVariable) {
        result[config.removedVariable] = removed;
    }

    return result;
}
