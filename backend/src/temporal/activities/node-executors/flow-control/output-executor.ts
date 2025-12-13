import type { JsonObject } from "@flowmaestro/shared";
import { interpolateWithObjectSupport } from "../../../../core/utils/interpolate-variables";

export interface OutputNodeConfig {
    outputVariable: string;
    format: "json" | "text" | "file";
    template?: string;
    fields?: string[];
    description?: string;
}

export async function executeOutputNode(
    config: OutputNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // JSON mode
    if (config.format === "json") {
        const result =
            config.fields && config.fields.length > 0
                ? Object.fromEntries(config.fields.map((f) => [f, context[f]]))
                : context;

        return { [config.outputVariable]: result } as JsonObject;
    }

    // TEXT mode
    if (config.format === "text") {
        const rendered = interpolateWithObjectSupport(config.template || "", context);
        return { [config.outputVariable]: rendered } as JsonObject;
    }

    // FILE mode (placeholder)
    return {
        [config.outputVariable]: "[file output not implemented]"
    } as JsonObject;
}
