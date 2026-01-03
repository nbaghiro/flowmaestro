/**
 * Node Validation System
 *
 * Types and utilities for validating workflow node configurations.
 * Used by the frontend to show validation errors in the canvas and config panels.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single validation error for a node field.
 */
export interface ValidationError {
    /** The field name that has the error */
    field: string;
    /** Human-readable error message */
    message: string;
    /** Severity level - errors block execution, warnings are informational */
    severity: "error" | "warning";
}

/**
 * Result of validating a node's configuration.
 */
export interface ValidationResult {
    /** True if no errors (warnings are allowed) */
    isValid: boolean;
    /** List of validation errors/warnings */
    errors: ValidationError[];
}

/**
 * A validation rule for a specific field.
 */
export interface NodeValidationRule {
    /** The field name to validate */
    field: string;
    /** Validation function - returns error message or null if valid */
    validate: (value: unknown, config: Record<string, unknown>) => string | null;
    /** Severity if validation fails (default: "error") */
    severity?: "error" | "warning";
}

/**
 * Map of node types to their validation rules.
 */
export type NodeValidationRulesMap = Record<string, NodeValidationRule[]>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a value is empty (null, undefined, or empty string).
 */
export function isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === "";
}

/**
 * Check if a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check if a value is a valid UUID.
 */
export function isValidUUID(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * Check if a value is a valid identifier (variable name).
 */
export function isValidIdentifier(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return identifierRegex.test(value);
}

/**
 * Check if an array has at least N items.
 */
export function hasMinItems(value: unknown, min: number): boolean {
    return Array.isArray(value) && value.length >= min;
}

// ============================================================================
// RULE FACTORY HELPERS
// ============================================================================

/**
 * Create a rule that requires a field to have a non-empty value.
 */
export function requiredField(
    field: string,
    message?: string,
    severity: "error" | "warning" = "error"
): NodeValidationRule {
    return {
        field,
        severity,
        validate: (value) => {
            if (isEmpty(value)) {
                return message || `${formatFieldName(field)} is required`;
            }
            return null;
        }
    };
}

/**
 * Create a rule that requires a valid UUID.
 */
export function requiredUUID(
    field: string,
    message?: string,
    severity: "error" | "warning" = "error"
): NodeValidationRule {
    return {
        field,
        severity,
        validate: (value) => {
            if (isEmpty(value)) {
                return message || `${formatFieldName(field)} is required`;
            }
            if (!isValidUUID(value)) {
                return `${formatFieldName(field)} must be a valid ID`;
            }
            return null;
        }
    };
}

/**
 * Create a rule that requires a valid identifier.
 */
export function requiredIdentifier(
    field: string,
    message?: string,
    severity: "error" | "warning" = "error"
): NodeValidationRule {
    return {
        field,
        severity,
        validate: (value) => {
            if (isEmpty(value)) {
                return message || `${formatFieldName(field)} is required`;
            }
            if (!isValidIdentifier(value)) {
                return `${formatFieldName(field)} must be a valid variable name (letters, numbers, underscores)`;
            }
            return null;
        }
    };
}

/**
 * Create a rule that requires an array with minimum items.
 */
export function requiredArray(
    field: string,
    minItems: number,
    message?: string,
    severity: "error" | "warning" = "error"
): NodeValidationRule {
    return {
        field,
        severity,
        validate: (value) => {
            if (!hasMinItems(value, minItems)) {
                return (
                    message ||
                    `${formatFieldName(field)} requires at least ${minItems} item${minItems > 1 ? "s" : ""}`
                );
            }
            return null;
        }
    };
}

/**
 * Create a conditional rule that only applies when a condition is met.
 */
export function conditionalRule(
    field: string,
    condition: (config: Record<string, unknown>) => boolean,
    message: string,
    severity: "error" | "warning" = "error"
): NodeValidationRule {
    return {
        field,
        severity,
        validate: (value, config) => {
            if (condition(config) && isEmpty(value)) {
                return message;
            }
            return null;
        }
    };
}

/**
 * Create a rule that requires one of multiple fields to have a value.
 */
export function requireOneOf(
    fields: string[],
    message?: string,
    severity: "error" | "warning" = "error"
): NodeValidationRule {
    return {
        field: fields[0], // Primary field for error display
        severity,
        validate: (_value, config) => {
            const hasValue = fields.some((f) => !isEmpty(config[f]));
            if (!hasValue) {
                return message || `One of ${fields.map(formatFieldName).join(", ")} is required`;
            }
            return null;
        }
    };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format a field name for display (camelCase to Title Case).
 */
function formatFieldName(field: string): string {
    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}

/**
 * Validate a node configuration against its rules.
 */
export function validateNodeConfig(
    nodeType: string,
    config: Record<string, unknown>,
    rules: NodeValidationRulesMap
): ValidationResult {
    const nodeRules = rules[nodeType];
    if (!nodeRules || nodeRules.length === 0) {
        return { isValid: true, errors: [] };
    }

    const errors: ValidationError[] = [];

    for (const rule of nodeRules) {
        const errorMessage = rule.validate(config[rule.field], config);
        if (errorMessage) {
            errors.push({
                field: rule.field,
                message: errorMessage,
                severity: rule.severity || "error"
            });
        }
    }

    // isValid is true if there are no errors (warnings don't affect validity)
    const isValid = errors.filter((e) => e.severity === "error").length === 0;

    return { isValid, errors };
}
