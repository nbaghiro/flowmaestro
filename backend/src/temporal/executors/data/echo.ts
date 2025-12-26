import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateVariables } from "../../shared/utils";
import { createActivityLogger } from "../../shared/logger";

const logger = createActivityLogger({ nodeType: "Echo" });

export interface EchoNodeConfig {
    mode: "simple" | "transform" | "delay" | "error";

    // For simple mode
    message?: string;
    includeContext?: boolean;
    includeTimestamp?: boolean;

    // For transform mode
    transformation?: "uppercase" | "lowercase" | "reverse" | "json" | "base64";
    inputVariable?: string;

    // For delay mode (testing async)
    delayMs?: number;

    // For error mode (testing error handling)
    errorMessage?: string;
    errorType?: "throw" | "return";

    outputVariable?: string;
}

export interface EchoNodeResult {
    mode: string;
    output: JsonValue;
    context?: JsonObject;
    timestamp?: string;
    metadata?: {
        executionTime: number;
    };
}

/**
 * Execute Echo node - for testing and debugging workflows
 */
export async function executeEchoNode(
    config: EchoNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    logger.info("Echo node executing", { mode: config.mode });

    let output: JsonValue;

    switch (config.mode) {
        case "simple":
            output = {
                message: config.message ? interpolateVariables(config.message, context) : "Echo!",
                ...(config.includeContext ? { context } : {}),
                ...(config.includeTimestamp ? { timestamp: new Date().toISOString() } : {})
            };
            break;

        case "transform": {
            const inputValue = config.inputVariable
                ? context[config.inputVariable]
                : JSON.stringify(context);

            const inputString =
                typeof inputValue === "string" ? inputValue : JSON.stringify(inputValue);

            switch (config.transformation) {
                case "uppercase":
                    output = inputString.toUpperCase();
                    break;
                case "lowercase":
                    output = inputString.toLowerCase();
                    break;
                case "reverse":
                    output = inputString.split("").reverse().join("");
                    break;
                case "json":
                    output = JSON.stringify(inputValue, null, 2);
                    break;
                case "base64":
                    output = Buffer.from(inputString).toString("base64");
                    break;
                default:
                    output = inputValue;
            }
            break;
        }

        case "delay": {
            const delay = config.delayMs || 1000;
            logger.debug("Echo delay mode", { delayMs: delay });
            await new Promise((resolve) => setTimeout(resolve, delay));
            output = {
                message: "Delay completed",
                delayMs: delay
            };
            break;
        }

        case "error": {
            const errorMsg = config.errorMessage || "Test error from Echo node";
            if (config.errorType === "throw") {
                throw new Error(errorMsg);
            } else {
                output = {
                    error: true,
                    message: errorMsg
                };
            }
            break;
        }

        default:
            throw new Error(`Unsupported echo mode: ${config.mode}`);
    }

    logger.debug("Echo output", { outputType: typeof output });

    const result: EchoNodeResult = {
        mode: config.mode,
        output,
        metadata: {
            executionTime: Date.now() - startTime
        }
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}
