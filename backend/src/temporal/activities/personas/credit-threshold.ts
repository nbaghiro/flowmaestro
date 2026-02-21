/**
 * Credit Threshold Activities
 *
 * Activities for detecting credit threshold crossings and managing
 * credit-based pausing during persona execution.
 */

import type { PersonaCreditThresholdConfig } from "@flowmaestro/shared";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { activityLogger } from "../../core";

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CheckCreditThresholdInput {
    instanceId: string;
    currentCost: number;
    maxCost: number;
    creditThresholdConfig: PersonaCreditThresholdConfig;
    lastNotifiedThreshold: number;
}

export interface CheckCreditThresholdResult {
    /** Whether a new threshold was crossed */
    crossedThreshold: boolean;
    /** The threshold percentage that was crossed (e.g., 50, 75, 90) */
    thresholdCrossed: number | null;
    /** Current usage percentage */
    currentPercentage: number;
    /** Whether execution should pause (limit reached and pause_at_limit is true) */
    shouldPause: boolean;
    /** Whether the cost limit has been exceeded */
    limitExceeded: boolean;
}

export interface UpdateThresholdNotifiedInput {
    instanceId: string;
    threshold: number;
    creditThresholdConfig: PersonaCreditThresholdConfig;
}

// ============================================================================
// Activities
// ============================================================================

/**
 * Check if a credit threshold has been crossed
 *
 * This activity checks the current cost against configured thresholds
 * and determines if any new thresholds have been crossed since the last check.
 */
export async function checkCreditThreshold(
    input: CheckCreditThresholdInput
): Promise<CheckCreditThresholdResult> {
    const { instanceId, currentCost, maxCost, creditThresholdConfig, lastNotifiedThreshold } =
        input;

    // Handle edge case of no max cost (unlimited)
    if (maxCost <= 0) {
        return {
            crossedThreshold: false,
            thresholdCrossed: null,
            currentPercentage: 0,
            shouldPause: false,
            limitExceeded: false
        };
    }

    const currentPercentage = (currentCost / maxCost) * 100;
    const limitExceeded = currentPercentage >= 100;

    // Check if we should pause at limit
    const shouldPause = limitExceeded && creditThresholdConfig.pause_at_limit;

    // Sort thresholds in ascending order
    const sortedThresholds = [...creditThresholdConfig.thresholds].sort((a, b) => a - b);

    // Find the highest threshold that has been crossed but not yet notified
    let thresholdCrossed: number | null = null;
    for (const threshold of sortedThresholds) {
        if (currentPercentage >= threshold && threshold > lastNotifiedThreshold) {
            thresholdCrossed = threshold;
        }
    }

    const crossedThreshold = thresholdCrossed !== null;

    if (crossedThreshold) {
        activityLogger.info("Credit threshold crossed", {
            instanceId,
            threshold: thresholdCrossed,
            currentPercentage: Math.round(currentPercentage),
            currentCost,
            maxCost
        });
    }

    return {
        crossedThreshold,
        thresholdCrossed,
        currentPercentage: Math.round(currentPercentage * 10) / 10, // Round to 1 decimal
        shouldPause,
        limitExceeded
    };
}

/**
 * Update the threshold notification state in the database
 *
 * This activity updates both the last_credit_threshold_notified column
 * and adds the threshold to the notified_thresholds array in credit_threshold_config.
 */
export async function updateThresholdNotified(input: UpdateThresholdNotifiedInput): Promise<void> {
    const { instanceId, threshold, creditThresholdConfig } = input;

    const repo = new PersonaInstanceRepository();

    // Add threshold to notified list if not already present
    const updatedNotifiedThresholds = creditThresholdConfig.notified_thresholds.includes(threshold)
        ? creditThresholdConfig.notified_thresholds
        : [...creditThresholdConfig.notified_thresholds, threshold];

    await repo.update(instanceId, {
        last_credit_threshold_notified: threshold,
        credit_threshold_config: {
            ...creditThresholdConfig,
            notified_thresholds: updatedNotifiedThresholds
        }
    });

    activityLogger.debug("Updated threshold notification state", {
        instanceId,
        threshold,
        updatedNotifiedThresholds
    });
}

/**
 * Reset threshold notifications (e.g., when resuming after a pause)
 *
 * This can be used when the user adds more credits or increases the limit.
 */
export async function resetThresholdNotifications(instanceId: string): Promise<void> {
    const repo = new PersonaInstanceRepository();
    const instance = await repo.findById(instanceId);

    if (!instance) {
        activityLogger.warn("Instance not found for threshold reset", { instanceId });
        return;
    }

    await repo.update(instanceId, {
        last_credit_threshold_notified: 0,
        credit_threshold_config: {
            ...instance.credit_threshold_config,
            notified_thresholds: []
        }
    });

    activityLogger.info("Reset threshold notifications", { instanceId });
}
