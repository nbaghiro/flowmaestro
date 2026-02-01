/**
 * Zod to JSON Schema Converter
 *
 * Converts Zod schemas to JSON Schema format for use in:
 * - MCP tool definitions
 * - API documentation
 * - Frontend schema display
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { getLogger } from "../logging";
import type { z } from "zod";

const logger = getLogger();

/**
 * JSON Schema type (JSON Schema 7)
 */
export interface JSONSchema {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    description?: string;
    [key: string]: unknown;
}

/**
 * Convert a Zod schema to JSON Schema format
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *     name: z.string(),
 *     age: z.number()
 * });
 *
 * const jsonSchema = toJSONSchema(userSchema);
 * // { type: "object", properties: { name: { type: "string" }, age: { type: "number" } }, required: ["name", "age"] }
 * ```
 */
export function toJSONSchema(zodSchema: z.ZodSchema): JSONSchema {
    try {
        const jsonSchema = zodToJsonSchema(zodSchema, {
            target: "jsonSchema7",
            $refStrategy: "none",
            strictUnions: false
        });

        // Remove $schema property as it's not needed
        const { $schema: _$schema, ...rest } = jsonSchema as {
            $schema?: string;
            [key: string]: unknown;
        };

        return rest as JSONSchema;
    } catch (error) {
        logger.error(
            { component: "ZodToJsonSchema", err: error },
            "Failed to convert Zod schema to JSON Schema"
        );
        return {
            type: "object",
            properties: {},
            description: "Schema conversion failed"
        };
    }
}
