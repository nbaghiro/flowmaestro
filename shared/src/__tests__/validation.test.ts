/**
 * Validation Tests
 *
 * Tests for the node validation system including:
 * - Validation helpers (isEmpty, isNonEmptyString, etc.)
 * - Rule factory functions (requiredField, requiredUUID, etc.)
 * - Node configuration validation
 */

import { describe, it, expect } from "vitest";
import {
    isEmpty,
    isNonEmptyString,
    isValidUUID,
    isValidIdentifier,
    hasMinItems,
    requiredField,
    requiredUUID,
    requiredIdentifier,
    requiredArray,
    conditionalRule,
    requireOneOf,
    validateNodeConfig,
    type NodeValidationRulesMap
} from "../validation";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

describe("isEmpty", () => {
    it("returns true for null", () => {
        expect(isEmpty(null)).toBe(true);
    });

    it("returns true for undefined", () => {
        expect(isEmpty(undefined)).toBe(true);
    });

    it("returns true for empty string", () => {
        expect(isEmpty("")).toBe(true);
    });

    it("returns false for non-empty string", () => {
        expect(isEmpty("hello")).toBe(false);
    });

    it("returns false for zero", () => {
        expect(isEmpty(0)).toBe(false);
    });

    it("returns false for false boolean", () => {
        expect(isEmpty(false)).toBe(false);
    });

    it("returns false for empty array", () => {
        expect(isEmpty([])).toBe(false);
    });

    it("returns false for empty object", () => {
        expect(isEmpty({})).toBe(false);
    });
});

describe("isNonEmptyString", () => {
    it("returns true for non-empty string", () => {
        expect(isNonEmptyString("hello")).toBe(true);
    });

    it("returns true for string with leading/trailing spaces", () => {
        expect(isNonEmptyString("  hello  ")).toBe(true);
    });

    it("returns false for empty string", () => {
        expect(isNonEmptyString("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
        expect(isNonEmptyString("   ")).toBe(false);
    });

    it("returns false for null", () => {
        expect(isNonEmptyString(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isNonEmptyString(undefined)).toBe(false);
    });

    it("returns false for number", () => {
        expect(isNonEmptyString(123)).toBe(false);
    });

    it("returns false for object", () => {
        expect(isNonEmptyString({})).toBe(false);
    });
});

describe("isValidUUID", () => {
    it("returns true for valid UUID", () => {
        expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("returns true for lowercase UUID", () => {
        expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("returns true for uppercase UUID", () => {
        expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
    });

    it("returns true for mixed case UUID", () => {
        expect(isValidUUID("550E8400-e29b-41D4-a716-446655440000")).toBe(true);
    });

    it("returns false for invalid UUID format", () => {
        expect(isValidUUID("not-a-uuid")).toBe(false);
    });

    it("returns false for UUID without dashes", () => {
        expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false);
    });

    it("returns false for non-string", () => {
        expect(isValidUUID(123)).toBe(false);
    });

    it("returns false for null", () => {
        expect(isValidUUID(null)).toBe(false);
    });
});

describe("isValidIdentifier", () => {
    it("returns true for simple variable name", () => {
        expect(isValidIdentifier("myVar")).toBe(true);
    });

    it("returns true for name starting with underscore", () => {
        expect(isValidIdentifier("_private")).toBe(true);
    });

    it("returns true for name with numbers", () => {
        expect(isValidIdentifier("var123")).toBe(true);
    });

    it("returns true for all uppercase", () => {
        expect(isValidIdentifier("CONSTANT")).toBe(true);
    });

    it("returns true for underscore only", () => {
        expect(isValidIdentifier("_")).toBe(true);
    });

    it("returns false for name starting with number", () => {
        expect(isValidIdentifier("123var")).toBe(false);
    });

    it("returns false for name with special characters", () => {
        expect(isValidIdentifier("my-var")).toBe(false);
    });

    it("returns false for name with spaces", () => {
        expect(isValidIdentifier("my var")).toBe(false);
    });

    it("returns false for empty string", () => {
        expect(isValidIdentifier("")).toBe(false);
    });

    it("returns false for non-string", () => {
        expect(isValidIdentifier(123)).toBe(false);
    });
});

describe("hasMinItems", () => {
    it("returns true when array has enough items", () => {
        expect(hasMinItems([1, 2, 3], 2)).toBe(true);
    });

    it("returns true when array has exactly min items", () => {
        expect(hasMinItems([1, 2], 2)).toBe(true);
    });

    it("returns false when array has too few items", () => {
        expect(hasMinItems([1], 2)).toBe(false);
    });

    it("returns false for empty array when min is 1", () => {
        expect(hasMinItems([], 1)).toBe(false);
    });

    it("returns true for empty array when min is 0", () => {
        expect(hasMinItems([], 0)).toBe(true);
    });

    it("returns false for non-array", () => {
        expect(hasMinItems("string", 1)).toBe(false);
    });

    it("returns false for null", () => {
        expect(hasMinItems(null, 1)).toBe(false);
    });
});

// ============================================================================
// RULE FACTORY FUNCTIONS
// ============================================================================

describe("requiredField", () => {
    it("returns error for empty value", () => {
        const rule = requiredField("name");
        expect(rule.validate("", {})).not.toBeNull();
    });

    it("returns error for null value", () => {
        const rule = requiredField("name");
        expect(rule.validate(null, {})).not.toBeNull();
    });

    it("returns null for non-empty value", () => {
        const rule = requiredField("name");
        expect(rule.validate("John", {})).toBeNull();
    });

    it("uses custom error message", () => {
        const rule = requiredField("name", "Please enter a name");
        expect(rule.validate("", {})).toBe("Please enter a name");
    });

    it("generates default error message with formatted field name", () => {
        const rule = requiredField("connectionId");
        expect(rule.validate("", {})).toContain("Connection Id");
    });

    it("supports warning severity", () => {
        const rule = requiredField("name", undefined, "warning");
        expect(rule.severity).toBe("warning");
    });
});

describe("requiredUUID", () => {
    it("returns error for empty value", () => {
        const rule = requiredUUID("connectionId");
        expect(rule.validate("", {})).not.toBeNull();
    });

    it("returns error for invalid UUID", () => {
        const rule = requiredUUID("connectionId");
        expect(rule.validate("not-a-uuid", {})).toContain("valid ID");
    });

    it("returns null for valid UUID", () => {
        const rule = requiredUUID("connectionId");
        expect(rule.validate("550e8400-e29b-41d4-a716-446655440000", {})).toBeNull();
    });
});

describe("requiredIdentifier", () => {
    it("returns error for empty value", () => {
        const rule = requiredIdentifier("variableName");
        expect(rule.validate("", {})).not.toBeNull();
    });

    it("returns error for invalid identifier", () => {
        const rule = requiredIdentifier("variableName");
        expect(rule.validate("invalid-name", {})).toContain("variable name");
    });

    it("returns null for valid identifier", () => {
        const rule = requiredIdentifier("variableName");
        expect(rule.validate("myVariable", {})).toBeNull();
    });
});

describe("requiredArray", () => {
    it("returns error when array is too small", () => {
        const rule = requiredArray("items", 2);
        expect(rule.validate([1], {})).not.toBeNull();
    });

    it("returns null when array has enough items", () => {
        const rule = requiredArray("items", 2);
        expect(rule.validate([1, 2], {})).toBeNull();
    });

    it("returns error for non-array", () => {
        const rule = requiredArray("items", 1);
        expect(rule.validate("not-array", {})).not.toBeNull();
    });

    it("generates correct message for single item", () => {
        const rule = requiredArray("items", 1);
        const error = rule.validate([], {});
        expect(error).toContain("at least 1 item");
        expect(error).not.toContain("items");
    });

    it("generates correct message for multiple items", () => {
        const rule = requiredArray("items", 3);
        const error = rule.validate([], {});
        expect(error).toContain("at least 3 items");
    });
});

describe("conditionalRule", () => {
    it("returns error when condition is true and value is empty", () => {
        const rule = conditionalRule(
            "webhookUrl",
            (config) => config.enableWebhook === true,
            "Webhook URL is required when webhooks are enabled"
        );
        expect(rule.validate("", { enableWebhook: true })).toBe(
            "Webhook URL is required when webhooks are enabled"
        );
    });

    it("returns null when condition is false", () => {
        const rule = conditionalRule(
            "webhookUrl",
            (config) => config.enableWebhook === true,
            "Webhook URL required"
        );
        expect(rule.validate("", { enableWebhook: false })).toBeNull();
    });

    it("returns null when condition is true but value is present", () => {
        const rule = conditionalRule(
            "webhookUrl",
            (config) => config.enableWebhook === true,
            "Webhook URL required"
        );
        expect(rule.validate("https://example.com/webhook", { enableWebhook: true })).toBeNull();
    });
});

describe("requireOneOf", () => {
    it("returns error when none of the fields have values", () => {
        const rule = requireOneOf(["email", "phone"]);
        expect(rule.validate("", { email: "", phone: "" })).not.toBeNull();
    });

    it("returns null when first field has value", () => {
        const rule = requireOneOf(["email", "phone"]);
        expect(rule.validate("", { email: "test@example.com", phone: "" })).toBeNull();
    });

    it("returns null when second field has value", () => {
        const rule = requireOneOf(["email", "phone"]);
        expect(rule.validate("", { email: "", phone: "123-456-7890" })).toBeNull();
    });

    it("uses custom error message", () => {
        const rule = requireOneOf(["email", "phone"], "Contact info required");
        expect(rule.validate("", { email: "", phone: "" })).toBe("Contact info required");
    });

    it("assigns to first field for error display", () => {
        const rule = requireOneOf(["email", "phone"]);
        expect(rule.field).toBe("email");
    });
});

// ============================================================================
// NODE CONFIGURATION VALIDATION
// ============================================================================

describe("validateNodeConfig", () => {
    const testRules: NodeValidationRulesMap = {
        llm: [requiredField("prompt"), requiredUUID("connectionId")],
        http: [requiredField("url", "URL is required"), requiredField("method")]
    };

    it("returns valid result for empty config when no rules exist", () => {
        const result = validateNodeConfig("unknown", {}, testRules);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("returns errors for missing required fields", () => {
        const result = validateNodeConfig("llm", {}, testRules);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns valid result when all rules pass", () => {
        const result = validateNodeConfig(
            "llm",
            {
                prompt: "Hello world",
                connectionId: "550e8400-e29b-41d4-a716-446655440000"
            },
            testRules
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("returns multiple errors when multiple rules fail", () => {
        const result = validateNodeConfig("llm", {}, testRules);
        expect(result.errors.length).toBe(2);
    });

    it("returns custom error messages", () => {
        const result = validateNodeConfig("http", {}, testRules);
        expect(result.errors.find((e) => e.message === "URL is required")).toBeDefined();
    });

    it("considers only errors for validity (not warnings)", () => {
        const rulesWithWarning: NodeValidationRulesMap = {
            test: [{ field: "name", severity: "warning", validate: () => "This is a warning" }]
        };
        const result = validateNodeConfig("test", {}, rulesWithWarning);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].severity).toBe("warning");
    });

    it("includes error field name in result", () => {
        const result = validateNodeConfig("llm", {}, testRules);
        expect(result.errors.map((e) => e.field)).toContain("prompt");
        expect(result.errors.map((e) => e.field)).toContain("connectionId");
    });

    it("passes config to rule validators", () => {
        const conditionalRules: NodeValidationRulesMap = {
            conditional: [
                conditionalRule(
                    "value",
                    (config) => config.enabled === true,
                    "Value required when enabled"
                )
            ]
        };

        const enabledResult = validateNodeConfig(
            "conditional",
            { enabled: true, value: "" },
            conditionalRules
        );
        expect(enabledResult.isValid).toBe(false);

        const disabledResult = validateNodeConfig(
            "conditional",
            { enabled: false, value: "" },
            conditionalRules
        );
        expect(disabledResult.isValid).toBe(true);
    });
});
