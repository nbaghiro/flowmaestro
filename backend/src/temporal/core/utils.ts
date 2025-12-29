/**
 * Utility Helpers
 *
 * Common utility functions for interpolation, cloning, parsing, and condition evaluation.
 */

import { InterpolationError } from "./errors";

// ============================================================================
// INTERPOLATION
// ============================================================================

export interface InterpolateOptions {
    /** Whether to stringify object values (default: false) */
    stringifyObjects?: boolean;
    /** Whether to throw on missing variables (default: false) */
    strict?: boolean;
}

/**
 * Interpolate variables in a string using {{varName}} syntax.
 *
 * Supports nested object paths and array indices:
 * - Simple: {{username}}
 * - Nested: {{user.profile.name}}
 * - Array indices: {{users[0].name}}
 * - Complex: {{paper.link[0].$.href}}
 *
 * @param str - String containing {{...}} placeholders
 * @param context - Object with variable values
 * @param options - Optional configuration
 * @returns String with variables replaced
 * @throws InterpolationError if strict mode is enabled and variable is not found
 */
export function interpolateVariables(
    str: string,
    context: Record<string, unknown>,
    options?: InterpolateOptions
): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        // Split path handling array indices like: firstPaper.link[0].$.href
        // Results in: ['firstPaper', 'link', '0', '$', 'href']
        const keys = varName
            .trim()
            .replace(/\[(\w+)\]/g, ".$1") // Convert [0] to .0
            .replace(/\['([^']+)'\]/g, ".$1") // Convert ['key'] to .key
            .replace(/\["([^"]+)"\]/g, ".$1") // Convert ["key"] to .key
            .split(".")
            .filter((k: string) => k !== ""); // Remove empty strings

        let value: unknown = context;

        for (const key of keys) {
            if (value === null || value === undefined) {
                if (options?.strict) {
                    throw new InterpolationError(
                        `Path '${varName}' contains null/undefined segment`,
                        varName
                    );
                }
                return match; // Return original if path is invalid
            }
            value = (value as Record<string, unknown>)[key];
        }

        if (value === undefined) {
            if (options?.strict) {
                throw new InterpolationError(`Variable '${varName}' not found in context`, varName);
            }
            return match;
        }

        // Handle object values
        if (typeof value === "object" && options?.stringifyObjects) {
            return JSON.stringify(value);
        }

        return String(value);
    });
}

/**
 * Advanced interpolation that supports object merging and complex expressions.
 * Primarily used by output nodes that need to construct complex JSON.
 */
export function interpolateWithObjectSupport(
    str: string,
    context: Record<string, unknown>
): unknown {
    // First, always interpolate variables in the string
    const interpolated = interpolateVariables(str, context, { stringifyObjects: true });

    // If the result looks like a JSON object/array, try to parse it
    if (typeof interpolated === "string") {
        const trimmed = interpolated.trim();
        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return JSON.parse(interpolated);
            } catch {
                // If JSON parsing fails, return the interpolated string
                return interpolated;
            }
        }
    }

    return interpolated;
}

// ============================================================================
// CLONING
// ============================================================================

/**
 * Deep clone an object to avoid mutation.
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T;
    }
    if (obj instanceof Array) {
        return obj.map((item) => deepClone(item)) as T;
    }
    if (obj instanceof Object) {
        const cloned = {} as Record<string, unknown>;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
            }
        }
        return cloned as T;
    }
    return obj;
}

// ============================================================================
// PATH RESOLUTION
// ============================================================================

/**
 * Resolve an array from a context path string.
 * Used by loop executor to get the array to iterate over.
 *
 * @param path - Path to the array (e.g., "items" or "data.results")
 * @param context - Context object containing the array
 * @returns The resolved array or undefined if not found
 */
export function resolveArrayPath(
    path: string,
    context: Record<string, unknown>
): unknown[] | undefined {
    const keys = path
        .replace(/\[(\w+)\]/g, ".$1")
        .replace(/\['([^']+)'\]/g, ".$1")
        .replace(/\["([^"]+)"\]/g, ".$1")
        .split(".")
        .filter((k) => k !== "");

    let value: unknown = context;

    for (const key of keys) {
        if (value === null || value === undefined) {
            return undefined;
        }
        value = (value as Record<string, unknown>)[key];
    }

    if (Array.isArray(value)) {
        return value;
    }

    return undefined;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse a value string into its appropriate type.
 * Used for parsing node configuration values.
 */
export function parseValue(value: string): unknown {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") {
        return num;
    }

    // Try to parse as boolean
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    // Try to parse as null
    if (value.toLowerCase() === "null") return null;

    // Try to parse as JSON
    try {
        return JSON.parse(value);
    } catch {
        // Return as string
        return value;
    }
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a condition expression.
 * Used by conditional and switch executors.
 */
export function evaluateCondition(left: unknown, operator: string, right: unknown): boolean {
    switch (operator) {
        case "==":
        case "equals":
            return left == right;
        case "===":
        case "strictEquals":
            return left === right;
        case "!=":
        case "notEquals":
            return left != right;
        case "!==":
        case "strictNotEquals":
            return left !== right;
        case ">":
        case "greaterThan":
            return Number(left) > Number(right);
        case ">=":
        case "greaterThanOrEqual":
            return Number(left) >= Number(right);
        case "<":
        case "lessThan":
            return Number(left) < Number(right);
        case "<=":
        case "lessThanOrEqual":
            return Number(left) <= Number(right);
        case "contains":
            return String(left).includes(String(right));
        case "startsWith":
            return String(left).startsWith(String(right));
        case "endsWith":
            return String(left).endsWith(String(right));
        case "matches":
            return new RegExp(String(right)).test(String(left));
        case "isEmpty":
            return (
                left === null ||
                left === undefined ||
                left === "" ||
                (Array.isArray(left) && left.length === 0)
            );
        case "isNotEmpty":
            return (
                left !== null &&
                left !== undefined &&
                left !== "" &&
                !(Array.isArray(left) && left.length === 0)
            );
        case "isNull":
            return left === null || left === undefined;
        case "isNotNull":
            return left !== null && left !== undefined;
        default:
            return false;
    }
}
