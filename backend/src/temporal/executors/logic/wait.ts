import type { JsonObject } from "@flowmaestro/shared";
import { WaitNodeConfigSchema, validateOrThrow, type WaitNodeConfig } from "../../shared/schemas";
import { interpolateVariables } from "../../shared/utils";
import { createActivityLogger } from "../../shared/logger";

const logger = createActivityLogger({ nodeType: "Wait" });

// Re-export the Zod-inferred type for backwards compatibility
export type { WaitNodeConfig };

export interface WaitNodeResult {
    waitType: string;
    startTime: string;
    endTime: string;
    actualWaitDuration: number;
    skipped?: boolean;
    reason?: string;
}

/**
 * Execute Wait node - delays execution for a specified duration or until a timestamp
 * Note: For production with Temporal, consider using workflow-level sleep for durability
 */
export async function executeWaitNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    // Validate config with Zod schema
    const validatedConfig = validateOrThrow(WaitNodeConfigSchema, config, "Wait");

    const startTime = new Date();
    logger.info("Starting wait", { waitType: validatedConfig.waitType, startTime: startTime.toISOString() });

    let waitMs = 0;
    let skipped = false;
    let reason: string | undefined;

    switch (validatedConfig.waitType) {
        case "duration":
            waitMs = calculateDuration(validatedConfig);
            logger.debug("Waiting for duration", { waitMs });

            if (waitMs > 0) {
                await sleep(waitMs);
            } else {
                skipped = true;
                reason = "Duration is zero or negative";
            }
            break;

        case "until": {
            if (!validatedConfig.timestamp) {
                throw new Error('Timestamp is required for "until" wait type');
            }

            const targetTimeStr = interpolateVariables(validatedConfig.timestamp, context);
            const targetTime = new Date(targetTimeStr);

            if (isNaN(targetTime.getTime())) {
                throw new Error(`Invalid timestamp: ${targetTimeStr}`);
            }

            waitMs = targetTime.getTime() - startTime.getTime();

            if (waitMs > 0) {
                logger.debug("Waiting until target time", { targetTime: targetTime.toISOString(), waitMs });
                await sleep(waitMs);
            } else {
                logger.debug("Target time already passed, continuing immediately", {
                    targetTime: targetTime.toISOString()
                });
                skipped = true;
                reason = "Target time already passed";
                waitMs = 0;
            }
            break;
        }

        default:
            throw new Error(`Unsupported wait type: ${validatedConfig.waitType}`);
    }

    const endTime = new Date();
    const actualDuration = endTime.getTime() - startTime.getTime();

    logger.info("Wait completed", { actualDuration });

    const result: WaitNodeResult = {
        waitType: validatedConfig.waitType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        actualWaitDuration: actualDuration,
        ...(skipped ? { skipped, reason } : {})
    };

    if (validatedConfig.outputVariable) {
        return { [validatedConfig.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

/**
 * Calculate duration in milliseconds from config
 */
function calculateDuration(config: WaitNodeConfig): number {
    if (config.duration !== undefined) {
        return config.duration;
    }

    if (config.durationValue === undefined) {
        return 0;
    }

    const value = config.durationValue;
    const multipliers = {
        ms: 1,
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000
    };

    const multiplier = multipliers[config.durationUnit || "ms"];
    return value * multiplier;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
