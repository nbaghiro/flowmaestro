/**
 * Tests for Tool Schema Validation
 *
 * Tests the critical gap fix for validating JSON Schema structure
 * before coercion to prevent validation bypass attacks.
 */

import { validateToolSchema } from "../validation";

describe("validateToolSchema", () => {
    describe("valid schemas", () => {
        it("should validate a simple object schema", () => {
            const schema = {
                type: "object",
                properties: {
                    name: { type: "string" },
                    age: { type: "number" }
                },
                required: ["name"]
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should validate nested object schemas", () => {
            const schema = {
                type: "object",
                properties: {
                    user: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            email: { type: "string" }
                        }
                    }
                }
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });

        it("should validate array schemas", () => {
            const schema = {
                type: "array",
                items: {
                    type: "string"
                },
                minItems: 1,
                maxItems: 10
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });

        it("should validate string schemas with constraints", () => {
            const schema = {
                type: "string",
                minLength: 1,
                maxLength: 100,
                pattern: "^[a-z]+$"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });

        it("should validate number schemas with constraints", () => {
            const schema = {
                type: "number",
                minimum: 0,
                maximum: 100
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });

        it("should validate integer schemas", () => {
            const schema = {
                type: "integer",
                minimum: 1,
                maximum: 1000
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });

        it("should validate enum schemas", () => {
            const schema = {
                type: "string",
                enum: ["low", "medium", "high"]
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });

        it("should validate boolean schemas", () => {
            const schema = {
                type: "boolean"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });
    });

    describe("invalid schemas", () => {
        it("should reject null schema", () => {
            const result = validateToolSchema(null);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Schema must be a non-null object");
        });

        it("should reject non-object schema", () => {
            const result = validateToolSchema("string");

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Schema must be a non-null object");
        });

        it("should reject array as schema", () => {
            const result = validateToolSchema([]);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Schema must be a non-null object");
        });

        it("should reject schema without type or composite", () => {
            const schema = {
                properties: {
                    name: { type: "string" }
                }
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasTypeError = result.errors.some(function (e) {
                return e.includes("must have a 'type' property");
            });
            expect(hasTypeError).toBe(true);
        });

        it("should reject invalid type value", () => {
            const schema = {
                type: "invalid_type"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("Invalid schema type");
            });
            expect(hasError).toBe(true);
        });

        it("should reject non-array required field", () => {
            const schema = {
                type: "object",
                properties: {
                    name: { type: "string" }
                },
                required: "name"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("'required' must be an array");
            });
            expect(hasError).toBe(true);
        });

        it("should reject invalid nested schema", () => {
            const schema = {
                type: "object",
                properties: {
                    nested: {
                        type: "invalid"
                    }
                }
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("Invalid schema type");
            });
            expect(hasError).toBe(true);
        });

        it("should reject minimum > maximum", () => {
            const schema = {
                type: "number",
                minimum: 100,
                maximum: 50
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("'minimum' cannot be greater than 'maximum'");
            });
            expect(hasError).toBe(true);
        });

        it("should reject empty enum", () => {
            const schema = {
                type: "string",
                enum: []
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("'enum' must have at least one value");
            });
            expect(hasError).toBe(true);
        });

        it("should reject invalid regex pattern", () => {
            const schema = {
                type: "string",
                pattern: "[invalid(regex"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("Invalid regex pattern");
            });
            expect(hasError).toBe(true);
        });
    });

    describe("security checks", () => {
        it("should reject external $ref URLs", () => {
            const schema = {
                $ref: "https://malicious.com/schema.json"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("External $ref URLs are not allowed");
            });
            expect(hasError).toBe(true);
        });

        it("should reject http $ref URLs", () => {
            const schema = {
                $ref: "http://malicious.com/schema.json"
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("External $ref URLs are not allowed");
            });
            expect(hasError).toBe(true);
        });

        it("should warn about __proto__ property names", () => {
            // Use Object.defineProperty to create a property that includes __proto__
            // Normal JS assignment to __proto__ won't work due to special handling
            const properties: Record<string, unknown> = {};
            Object.defineProperty(properties, "__proto__", {
                value: { type: "string" },
                enumerable: true,
                configurable: true,
                writable: true
            });

            const schema = {
                type: "object",
                properties
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("Potentially dangerous property name");
            });
            expect(hasError).toBe(true);
        });

        it("should warn about constructor property names", () => {
            const schema = {
                type: "object",
                properties: {
                    constructor: { type: "string" }
                }
            };

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("Potentially dangerous property name");
            });
            expect(hasError).toBe(true);
        });
    });

    describe("depth protection", () => {
        it("should reject deeply nested schemas", () => {
            // Create schema nested 15 levels deep
            let schema: Record<string, unknown> = { type: "string" };
            for (let i = 0; i < 15; i++) {
                schema = {
                    type: "object",
                    properties: {
                        nested: schema
                    }
                };
            }

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(false);
            const hasError = result.errors.some(function (e) {
                return e.includes("exceeds maximum depth");
            });
            expect(hasError).toBe(true);
        });

        it("should allow moderately nested schemas", () => {
            // Create schema nested 5 levels deep (under limit)
            let schema: Record<string, unknown> = { type: "string" };
            for (let i = 0; i < 5; i++) {
                schema = {
                    type: "object",
                    properties: {
                        nested: schema
                    }
                };
            }

            const result = validateToolSchema(schema);

            expect(result.valid).toBe(true);
        });
    });

    describe("composite schemas", () => {
        it("should allow oneOf without type", () => {
            const schema = {
                oneOf: [{ type: "string" }, { type: "number" }]
            };

            const result = validateToolSchema(schema);

            // Should not complain about missing type
            const hasTypeError = result.errors.some(function (e) {
                return e.includes("must have a 'type' property");
            });
            expect(hasTypeError).toBe(false);
        });

        it("should allow anyOf without type", () => {
            const schema = {
                anyOf: [{ type: "string" }, { type: "number" }]
            };

            const result = validateToolSchema(schema);

            const hasTypeError = result.errors.some(function (e) {
                return e.includes("must have a 'type' property");
            });
            expect(hasTypeError).toBe(false);
        });

        it("should allow allOf without type", () => {
            const schema = {
                allOf: [
                    { type: "object", properties: { name: { type: "string" } } },
                    { type: "object", properties: { age: { type: "number" } } }
                ]
            };

            const result = validateToolSchema(schema);

            const hasTypeError = result.errors.some(function (e) {
                return e.includes("must have a 'type' property");
            });
            expect(hasTypeError).toBe(false);
        });
    });
});
