import { zodToJsonSchema } from "zod-to-json-schema";
import { getLogger } from "../../core/logging";
import type { JSONSchema } from "./types";
import type { z } from "zod";

const logger = getLogger();

/**
 * Convert Zod schema to JSON Schema
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
            { component: "SchemaUtils", err: error },
            "Failed to convert Zod schema to JSON Schema"
        );
        return {
            type: "object",
            properties: {},
            description: "Schema conversion failed"
        };
    }
}
