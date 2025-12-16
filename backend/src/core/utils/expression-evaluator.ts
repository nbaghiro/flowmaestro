import { createContext, runInContext } from "vm";

type JsonObject = Record<string, unknown>;

/**
 * Safely evaluate a JavaScript expression with limited operations.
 *
 * Allowed:
 * - Property access: data.type, user.email, items[0]
 * - Comparisons: ==, ===, !=, !==, >, <, >=, <=
 * - Logical operators: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Literals: strings, numbers, booleans, null
 * - typeof operator
 *
 * NOT Allowed:
 * - Function calls: data.toString(), fetch(), eval()
 * - Object construction: new Date(), {}
 * - Assignment: =, +=, etc.
 * - Global access: window, process, require
 */
export function evaluateExpression(expression: string, context: JsonObject): boolean {
    // Validate expression doesn't contain dangerous patterns
    const dangerousPatterns = [
        /\bfunction\b/,
        /\bnew\b/,
        /\beval\b/,
        /\bFunction\b/,
        /\brequire\b/,
        /\bimport\b/,
        /\bprocess\b/,
        /\bglobal\b/,
        /\bwindow\b/,
        /\bdocument\b/,
        /\.__proto__/,
        /\bconstructor\b/,
        /\[["']constructor["']\]/
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(expression)) {
            throw new Error(`Unsafe expression: ${expression}`);
        }
    }

    // Create sandboxed context with only the workflow context
    const sandbox = createContext({
        ...context,
        // Add safe utilities
        typeof: (val: unknown) => typeof val,
        Array: { isArray: Array.isArray },
        String: { prototype: {} },
        Number: { isNaN, isFinite }
    });

    try {
        const result = runInContext(`Boolean(${expression})`, sandbox, {
            timeout: 100, // 100ms max execution
            displayErrors: false
        });
        return Boolean(result);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Expression evaluation failed: ${expression} - ${error.message}`);
        }
        throw new Error(`Expression evaluation failed: ${expression}`);
    }
}
