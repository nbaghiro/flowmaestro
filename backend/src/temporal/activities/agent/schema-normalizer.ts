import type { JsonObject } from "@flowmaestro/shared";

/**
 * Normalize JSON Schema for LLM provider compatibility
 * JSON Schema spec requires that array types have an 'items' property.
 * This ensures compatibility with OpenAI, Anthropic, and other providers.
 *
 * Note: Some providers (like Google Gemini) don't support additionalProperties
 * in array items, so we remove it for compatibility.
 */
export function normalizeSchemaForLLM(schema: JsonObject, provider?: string): JsonObject {
    if (typeof schema !== "object" || schema === null) {
        return schema;
    }

    const normalized: JsonObject = { ...schema };

    // If it's an array type, ensure it has items
    if (normalized.type === "array") {
        if (!normalized.items) {
            normalized.items = {
                type: "object"
                // Don't add additionalProperties for Google Gemini compatibility
            };
        } else if (typeof normalized.items === "object") {
            // Recursively normalize items
            const normalizedItems = normalizeSchemaForLLM(normalized.items as JsonObject, provider);
            // Remove additionalProperties from array items for Google Gemini
            if (provider === "google" && "additionalProperties" in normalizedItems) {
                const { additionalProperties: _additionalProperties, ...rest } = normalizedItems;
                normalized.items = rest;
            } else {
                normalized.items = normalizedItems;
            }
        }
    }

    // Recursively normalize nested properties
    if (normalized.properties && typeof normalized.properties === "object") {
        const normalizedProperties: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(normalized.properties)) {
            const normalizedValue = normalizeSchemaForLLM(value as JsonObject, provider);
            // Remove additionalProperties from nested array items for Google Gemini
            if (
                provider === "google" &&
                typeof normalizedValue === "object" &&
                normalizedValue !== null &&
                normalizedValue.type === "array" &&
                normalizedValue.items &&
                typeof normalizedValue.items === "object" &&
                "additionalProperties" in normalizedValue.items
            ) {
                const { additionalProperties: _additionalProperties, ...rest } =
                    normalizedValue.items as JsonObject;
                normalizedProperties[key] = {
                    ...normalizedValue,
                    items: rest
                };
            } else {
                normalizedProperties[key] = normalizedValue;
            }
        }
        normalized.properties = normalizedProperties as Record<string, JsonObject>;
    }

    return normalized;
}
