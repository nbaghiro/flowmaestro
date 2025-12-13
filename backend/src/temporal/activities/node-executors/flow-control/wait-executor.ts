import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../../core/utils/interpolate-variables";

export interface WaitNodeConfig {
    waitType: "duration" | "until";

    // For duration
    duration?: number; // Milliseconds
    durationUnit?: "ms" | "seconds" | "minutes" | "hours" | "days";
    durationValue?: number; // e.g., 5 (minutes)

    // For until
    timestamp?: string; // ISO 8601 timestamp
    timezone?: string; // IANA timezone (e.g., 'America/New_York')

    outputVariable?: string;
}

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
export async function executeWaitNode(
    config: WaitNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = new Date();
    console.log(`[Wait] Type: ${config.waitType}, Start: ${startTime.toISOString()}`);

    let waitMs = 0;
    let skipped = false;
    let reason: string | undefined;

    switch (config.waitType) {
        case "duration":
            waitMs = calculateDuration(config);
            console.log(`[Wait] Waiting for ${waitMs}ms`);

            if (waitMs > 0) {
                await sleep(waitMs);
            } else {
                skipped = true;
                reason = "Duration is zero or negative";
            }
            break;

        case "until": {
            if (!config.timestamp) {
                throw new Error('Timestamp is required for "until" wait type');
            }

            const targetTimeStr = interpolateVariables(config.timestamp, context);
            const targetTime = new Date(targetTimeStr);

            if (isNaN(targetTime.getTime())) {
                throw new Error(`Invalid timestamp: ${targetTimeStr}`);
            }

            waitMs = targetTime.getTime() - startTime.getTime();

            if (waitMs > 0) {
                console.log(`[Wait] Waiting until ${targetTime.toISOString()} (${waitMs}ms)`);
                await sleep(waitMs);
            } else {
                console.log(
                    `[Wait] Target time ${targetTime.toISOString()} already passed, continuing immediately`
                );
                skipped = true;
                reason = "Target time already passed";
                waitMs = 0;
            }
            break;
        }

        default:
            throw new Error(`Unsupported wait type: ${config.waitType}`);
    }

    const endTime = new Date();
    const actualDuration = endTime.getTime() - startTime.getTime();

    console.log(`[Wait] Completed after ${actualDuration}ms`);

    const result: WaitNodeResult = {
        waitType: config.waitType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        actualWaitDuration: actualDuration,
        ...(skipped ? { skipped, reason } : {})
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
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
