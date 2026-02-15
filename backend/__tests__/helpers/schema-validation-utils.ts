/**
 * Schema Validation Utilities
 *
 * Utilities for validating test fixture data against Zod schemas.
 * Used to ensure fixtures remain in sync with provider operation schemas.
 */

import type { z } from "zod";
import type { IProvider, OperationDefinition } from "../../src/integrations/core/types";
import type { TestFixture, TestCase } from "../../src/integrations/sandbox/types";

/**
 * Violation record for schema validation failures
 */
export interface SchemaViolation {
    operationId: string;
    caseName: string;
    caseType: "valid" | "error" | "edge";
    field: "input" | "output";
    message: string;
    zodError?: z.ZodError;
}

/**
 * Result of validating fixtures against schemas
 */
export interface ValidationResult {
    valid: boolean;
    violations: SchemaViolation[];
}

/**
 * Validate all fixtures for a provider against their operation schemas
 */
export function validateProviderFixtures(
    provider: IProvider,
    fixtures: TestFixture[]
): ValidationResult {
    const violations: SchemaViolation[] = [];
    const operations = provider.getOperations();
    const operationMap = new Map(operations.map((op) => [op.id, op]));

    for (const fixture of fixtures) {
        const operation = operationMap.get(fixture.operationId);

        if (!operation) {
            violations.push({
                operationId: fixture.operationId,
                caseName: "*",
                caseType: "valid",
                field: "input",
                message: `Operation "${fixture.operationId}" not found in provider "${provider.name}"`
            });
            continue;
        }

        // Validate valid cases
        for (const testCase of fixture.validCases) {
            validateTestCase(operation, testCase, "valid", violations);
        }

        // Validate error cases - inputs should still be schema-valid unless they're validation errors
        for (const testCase of fixture.errorCases) {
            validateErrorCaseInput(operation, testCase, violations);
        }

        // Validate edge cases if present
        if (fixture.edgeCases) {
            for (const testCase of fixture.edgeCases) {
                validateTestCase(operation, testCase, "edge", violations);
            }
        }
    }

    return {
        valid: violations.length === 0,
        violations
    };
}

/**
 * Validate a single test case against operation schemas
 */
function validateTestCase(
    operation: OperationDefinition,
    testCase: TestCase<unknown, unknown>,
    caseType: "valid" | "edge",
    violations: SchemaViolation[]
): void {
    // Validate input against input schema
    const inputResult = operation.inputSchema.safeParse(testCase.input);
    if (!inputResult.success) {
        violations.push({
            operationId: operation.id,
            caseName: testCase.name,
            caseType,
            field: "input",
            message: formatZodError(inputResult.error),
            zodError: inputResult.error
        });
    }

    // Validate output against output schema if both exist
    if (testCase.expectedOutput && operation.outputSchema) {
        const outputResult = operation.outputSchema.safeParse(testCase.expectedOutput);
        if (!outputResult.success) {
            violations.push({
                operationId: operation.id,
                caseName: testCase.name,
                caseType,
                field: "output",
                message: formatZodError(outputResult.error),
                zodError: outputResult.error
            });
        }
    }
}

/**
 * Validate error case input
 * Error cases should have valid inputs unless they're testing validation errors
 */
function validateErrorCaseInput(
    operation: OperationDefinition,
    testCase: TestCase<unknown, undefined>,
    violations: SchemaViolation[]
): void {
    const inputResult = operation.inputSchema.safeParse(testCase.input);

    // If input is invalid, it should only be for validation error test cases
    if (!inputResult.success) {
        const isValidationError = testCase.expectedError?.type === "validation";

        if (!isValidationError) {
            violations.push({
                operationId: operation.id,
                caseName: testCase.name,
                caseType: "error",
                field: "input",
                message: `Error case has invalid input but expectedError.type is not "validation". ` +
                    `Either fix the input or set expectedError.type to "validation". ` +
                    `Zod error: ${formatZodError(inputResult.error)}`,
                zodError: inputResult.error
            });
        }
    }
}

/**
 * Format Zod error for display
 */
export function formatZodError(error: z.ZodError): string {
    return error.errors
        .map((e) => {
            const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
            return `${path}${e.message}`;
        })
        .join("; ");
}

/**
 * Get required properties from a Zod schema
 */
export function getRequiredProperties(schema: z.ZodSchema): string[] {
    const required: string[] = [];

    // Try to get the shape if it's an object schema
    if ("shape" in schema && typeof schema.shape === "object") {
        const shape = schema.shape as Record<string, z.ZodSchema>;
        for (const [key, fieldSchema] of Object.entries(shape)) {
            if (!isOptionalSchema(fieldSchema)) {
                required.push(key);
            }
        }
    }

    return required;
}

/**
 * Check if a Zod schema is optional
 */
function isOptionalSchema(schema: z.ZodSchema): boolean {
    // Check for ZodOptional wrapper
    if ("_def" in schema && typeof schema._def === "object") {
        const def = schema._def as { typeName?: string };
        if (def.typeName === "ZodOptional") {
            return true;
        }
    }
    return false;
}

/**
 * Compare required properties between Zod schema and JSON schema
 */
export function compareRequiredProperties(
    zodSchema: z.ZodSchema,
    jsonSchemaRequired: string[] | undefined
): { match: boolean; zodRequired: string[]; jsonRequired: string[] } {
    const zodRequired = getRequiredProperties(zodSchema);
    const jsonRequired = jsonSchemaRequired || [];

    const zodSet = new Set(zodRequired);
    const jsonSet = new Set(jsonRequired);

    const match =
        zodSet.size === jsonSet.size &&
        [...zodSet].every((item) => jsonSet.has(item));

    return { match, zodRequired, jsonRequired };
}

/**
 * Validate that a fixture's filterableData records have consistent shapes
 */
export function validateFilterableDataConsistency(fixture: TestFixture): SchemaViolation[] {
    const violations: SchemaViolation[] = [];

    if (!fixture.filterableData) {
        return violations;
    }

    const { records } = fixture.filterableData;

    if (records.length === 0) {
        return violations;
    }

    // Get keys from first record (excluding internal _ prefixed fields)
    const firstRecordKeys = Object.keys(records[0]).filter((k) => !k.startsWith("_")).sort();

    // Check all records have the same shape
    for (let i = 1; i < records.length; i++) {
        const recordKeys = Object.keys(records[i]).filter((k) => !k.startsWith("_")).sort();

        if (JSON.stringify(firstRecordKeys) !== JSON.stringify(recordKeys)) {
            violations.push({
                operationId: fixture.operationId,
                caseName: `filterableData.records[${i}]`,
                caseType: "valid",
                field: "output",
                message: `Record at index ${i} has different keys than first record. ` +
                    `Expected: [${firstRecordKeys.join(", ")}], ` +
                    `Got: [${recordKeys.join(", ")}]`
            });
        }
    }

    return violations;
}

/**
 * Summarize violations by category
 */
export function summarizeViolations(violations: SchemaViolation[]): {
    total: number;
    byOperation: Record<string, number>;
    byCaseType: Record<string, number>;
    byField: Record<string, number>;
} {
    const byOperation: Record<string, number> = {};
    const byCaseType: Record<string, number> = {};
    const byField: Record<string, number> = {};

    for (const v of violations) {
        byOperation[v.operationId] = (byOperation[v.operationId] || 0) + 1;
        byCaseType[v.caseType] = (byCaseType[v.caseType] || 0) + 1;
        byField[v.field] = (byField[v.field] || 0) + 1;
    }

    return {
        total: violations.length,
        byOperation,
        byCaseType,
        byField
    };
}
