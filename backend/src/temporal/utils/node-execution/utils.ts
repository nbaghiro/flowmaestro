/**
 * Shared utility functions for node executors
 */

/**
 * Interpolate variables in a string using ${varName} syntax
 * Supports nested object paths and array indices:
 * - Simple: ${username}
 * - Nested: ${user.profile.name}
 * - Array indices: ${users[0].name}
 * - Complex: ${paper.link[0].$.href}
 *
 * @param str - String containing ${...} placeholders
 * @param context - Object with variable values
 * @param options - Optional configuration
 * @returns String with variables replaced
 */
export function interpolateVariables(
    str: string,
    context: Record<string, unknown>,
    options?: { stringifyObjects?: boolean }
): string {
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        // Split path handling array indices like: firstPaper.link[0].$.href
        // Results in: ['firstPaper', 'link', '0', '$', 'href']
        const keys = varName
            .replace(/\[(\w+)\]/g, ".$1") // Convert [0] to .0
            .replace(/\['([^']+)'\]/g, ".$1") // Convert ['key'] to .key
            .replace(/\["([^"]+)"\]/g, ".$1") // Convert ["key"] to .key
            .split(".")
            .filter((k: string) => k !== ""); // Remove empty strings

        let value: unknown = context;

        for (const key of keys) {
            if (value === null || value === undefined) {
                return match; // Return original if path is invalid
            }
            value = (value as Record<string, unknown>)[key];
        }

        if (value === undefined) {
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
 * Advanced interpolation that supports object merging and complex expressions
 * Primarily used by output nodes that need to construct complex JSON
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
            } catch (_e) {
                // If JSON parsing fails, return the interpolated string
                return interpolated;
            }
        }
    }

    return interpolated;
}

/**
 * Deep clone an object to avoid mutation
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

/**
 * Resolve a ${variable} reference against the context without stringifying.
 * Supports nested paths and array indices like interpolateVariables.
 */
export function getVariableValue<T = unknown>(
    varRef: string,
    context: Record<string, unknown>
): T | undefined {
    // Strip ${ and } if present
    const varName = varRef.replace(/^\$\{/, "").replace(/\}$/, "");

    // Same path parsing rules as interpolateVariables
    const keys = varName
        .replace(/\[(\w+)\]/g, ".$1") // [0] -> .0
        .replace(/\['([^']+)'\]/g, ".$1") // ['key'] -> .key
        .replace(/\["([^"]+)"\]/g, ".$1") // ["key"] -> .key
        .split(".")
        .filter((k) => k !== "");

    let value: unknown = context;

    for (const key of keys) {
        if (value === null || value === undefined || typeof value !== "object") {
            return undefined;
        }
        value = (value as Record<string, unknown>)[key];
    }

    return value as T | undefined;
}
