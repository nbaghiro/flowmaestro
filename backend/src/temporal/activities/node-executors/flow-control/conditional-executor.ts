import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../../core/utils/interpolate-variables";
import { executeRouterNode } from "./router-executor";

export type ComparisonOperator =
    | "=="
    | "!="
    | ">"
    | "<"
    | ">="
    | "<="
    | "contains"
    | "startsWith"
    | "endsWith";

export interface ConditionalNodeConfig {
    mode?: "boolean" | "router";

    // boolean mode (existing)
    leftValue?: string;
    operator?: ComparisonOperator;
    rightValue?: string;

    // router mode (delegate)
    conditions?: Array<{
        name: string;
        expression: string;
        description?: string;
    }>;
    defaultOutput?: string;
    evaluationMode?: "first" | "all";
}

export interface ConditionalNodeResult {
    conditionMet: boolean;
    branch: "true" | "false";
    leftValue: JsonValue;
    rightValue: JsonValue;
    operator: ComparisonOperator;
}

/**
 * Execute Conditional node - evaluates a condition and returns which branch to take
 */
export async function executeConditionalNode(
    config: ConditionalNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // Interpolate variables in both values
    const mode = config.mode ?? "boolean";

    if (mode === "router") {
        return executeRouterNode(
            {
                conditions: config.conditions ?? [],
                defaultOutput: config.defaultOutput ?? "default",
                evaluationMode: config.evaluationMode ?? "first"
            },
            context
        );
    }

    const leftInterpolated = interpolateVariables(config.leftValue ?? "", context);
    const rightInterpolated = interpolateVariables(config.rightValue ?? "", context);

    // Try to parse as JSON if it looks like a JSON value
    const leftValue = parseValue(leftInterpolated);
    const rightValue = parseValue(rightInterpolated);

    console.log(
        `[Conditional] Evaluating: ${JSON.stringify(leftValue)} ${config.operator} ${JSON.stringify(rightValue)}`
    );

    // Evaluate the condition
    const operator = config.operator ?? "==";
    const conditionMet = evaluateCondition(leftValue, operator, rightValue);
    const branch = conditionMet ? "true" : "false";

    console.log(`[Conditional] Result: ${conditionMet} → taking '${branch}' branch`);

    return {
        conditionMet,
        branch,
        leftValue,
        rightValue,
        operator: config.operator
    } as unknown as JsonObject;
}

/**
 * Parse a string value into its appropriate type (number, boolean, null, or keep as string)
 */
function parseValue(value: string): JsonValue {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") {
        return num;
    }

    // Parse booleans
    const lower = value.toLowerCase().trim();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null" || lower === "undefined") return null;

    // Try to parse as JSON (for objects/arrays)
    if (
        (value.trim().startsWith("{") && value.trim().endsWith("}")) ||
        (value.trim().startsWith("[") && value.trim().endsWith("]"))
    ) {
        try {
            return JSON.parse(value);
        } catch {
            // Not valid JSON, return as string
        }
    }

    return value;
}

/**
 * Evaluate a condition based on operator
 */
function evaluateCondition(
    left: JsonValue,
    operator: ComparisonOperator,
    right: JsonValue
): boolean {
    switch (operator) {
        case "==":
            return equals(left, right);
        case "!=":
            return !equals(left, right);
        case ">":
            return compare(left, right) > 0;
        case "<":
            return compare(left, right) < 0;
        case ">=":
            return compare(left, right) >= 0;
        case "<=":
            return compare(left, right) <= 0;
        case "contains":
            return contains(left, right);
        case "startsWith":
            return startsWith(left, right);
        case "endsWith":
            return endsWith(left, right);
        default:
            throw new Error(`Unknown operator: ${operator}`);
    }
}

/**
 * Compare two values for equality with type coercion
 */
function equals(left: JsonValue, right: JsonValue): boolean {
    // Handle null
    if (left === null) {
        return right === null;
    }

    // Type coercion for numbers
    if (typeof left === "number" || typeof right === "number") {
        return Number(left) === Number(right);
    }

    // String comparison (case-insensitive)
    if (typeof left === "string" || typeof right === "string") {
        return String(left).toLowerCase() === String(right).toLowerCase();
    }

    // Boolean comparison
    if (typeof left === "boolean" || typeof right === "boolean") {
        return Boolean(left) === Boolean(right);
    }

    // Object/Array comparison (JSON stringify)
    return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Compare two values numerically or lexicographically
 */
function compare(left: JsonValue, right: JsonValue): number {
    const leftNum = Number(left);
    const rightNum = Number(right);

    if (isNaN(leftNum) || isNaN(rightNum)) {
        // Fall back to string comparison
        return String(left).localeCompare(String(right));
    }

    return leftNum - rightNum;
}

/**
 * Check if value contains searchValue (for strings and arrays)
 */
function contains(value: JsonValue, searchValue: JsonValue): boolean {
    if (typeof value === "string") {
        return value.toLowerCase().includes(String(searchValue).toLowerCase());
    }

    if (Array.isArray(value)) {
        return value.some((item) => equals(item, searchValue));
    }

    return false;
}

/**
 * Check if value starts with searchValue
 */
function startsWith(value: JsonValue, searchValue: JsonValue): boolean {
    const str = String(value);
    const search = String(searchValue);
    return str.toLowerCase().startsWith(search.toLowerCase());
}

/**
 * Check if value ends with searchValue
 */
function endsWith(value: JsonValue, searchValue: JsonValue): boolean {
    const str = String(value);
    const search = String(searchValue);
    return str.toLowerCase().endsWith(search.toLowerCase());
}
