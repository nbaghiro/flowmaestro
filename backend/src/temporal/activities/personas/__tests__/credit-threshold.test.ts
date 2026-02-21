/**
 * Credit Threshold Activities Tests
 *
 * Tests for credit threshold detection and notification activities.
 */

import {
    checkCreditThreshold,
    updateThresholdNotified,
    resetThresholdNotifications
} from "../credit-threshold";

// Mock the repository
const mockPersonaInstanceRepo = {
    findById: jest.fn(),
    update: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaInstanceRepository", () => ({
    PersonaInstanceRepository: jest.fn().mockImplementation(() => mockPersonaInstanceRepo)
}));

describe("checkCreditThreshold", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("unlimited cost (maxCost <= 0)", () => {
        it("should return no threshold crossed when maxCost is 0", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 100,
                maxCost: 0,
                creditThresholdConfig: {
                    thresholds: [50, 75, 90],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(false);
            expect(result.thresholdCrossed).toBeNull();
            expect(result.currentPercentage).toBe(0);
            expect(result.shouldPause).toBe(false);
            expect(result.limitExceeded).toBe(false);
        });

        it("should return no threshold crossed when maxCost is negative", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 50,
                maxCost: -1,
                creditThresholdConfig: {
                    thresholds: [50, 75, 90],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(false);
            expect(result.shouldPause).toBe(false);
        });
    });

    describe("threshold detection", () => {
        const baseConfig = {
            thresholds: [50, 75, 90],
            pause_at_limit: false,
            notified_thresholds: [] as number[]
        };

        it("should detect 50% threshold crossing", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 55,
                maxCost: 100,
                creditThresholdConfig: baseConfig,
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(true);
            expect(result.thresholdCrossed).toBe(50);
            expect(result.currentPercentage).toBe(55);
        });

        it("should detect 75% threshold when 50% already notified", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 80,
                maxCost: 100,
                creditThresholdConfig: baseConfig,
                lastNotifiedThreshold: 50
            });

            expect(result.crossedThreshold).toBe(true);
            expect(result.thresholdCrossed).toBe(75);
            expect(result.currentPercentage).toBe(80);
        });

        it("should detect highest applicable threshold when multiple crossed", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 95,
                maxCost: 100,
                creditThresholdConfig: baseConfig,
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(true);
            expect(result.thresholdCrossed).toBe(90);
        });

        it("should not cross threshold when current is below all thresholds", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 40,
                maxCost: 100,
                creditThresholdConfig: baseConfig,
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(false);
            expect(result.thresholdCrossed).toBeNull();
            expect(result.currentPercentage).toBe(40);
        });

        it("should not re-notify for already notified threshold", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 55,
                maxCost: 100,
                creditThresholdConfig: baseConfig,
                lastNotifiedThreshold: 50
            });

            expect(result.crossedThreshold).toBe(false);
            expect(result.thresholdCrossed).toBeNull();
        });
    });

    describe("limit exceeded and pause behavior", () => {
        it("should detect limit exceeded at 100%", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 100,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [50, 75, 90],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 90
            });

            expect(result.limitExceeded).toBe(true);
            expect(result.shouldPause).toBe(false);
            expect(result.currentPercentage).toBe(100);
        });

        it("should pause when limit exceeded and pause_at_limit is true", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 105,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [50, 75, 90],
                    pause_at_limit: true,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 90
            });

            expect(result.limitExceeded).toBe(true);
            expect(result.shouldPause).toBe(true);
            expect(result.currentPercentage).toBe(105);
        });

        it("should not pause when limit exceeded but pause_at_limit is false", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 150,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [50, 75, 90],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 90
            });

            expect(result.limitExceeded).toBe(true);
            expect(result.shouldPause).toBe(false);
        });
    });

    describe("custom thresholds", () => {
        it("should handle custom threshold values", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 35,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [25, 33, 66, 80],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(true);
            expect(result.thresholdCrossed).toBe(33);
        });

        it("should handle single threshold", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 85,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [80],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(true);
            expect(result.thresholdCrossed).toBe(80);
        });

        it("should handle empty thresholds array", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 50,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 0
            });

            expect(result.crossedThreshold).toBe(false);
            expect(result.thresholdCrossed).toBeNull();
        });
    });

    describe("percentage rounding", () => {
        it("should round percentage to one decimal place", async () => {
            const result = await checkCreditThreshold({
                instanceId: "test-instance",
                currentCost: 33.333,
                maxCost: 100,
                creditThresholdConfig: {
                    thresholds: [50],
                    pause_at_limit: false,
                    notified_thresholds: []
                },
                lastNotifiedThreshold: 0
            });

            expect(result.currentPercentage).toBe(33.3);
        });
    });
});

describe("updateThresholdNotified", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should update last notified threshold in database", async () => {
        mockPersonaInstanceRepo.update.mockResolvedValue({ id: "test-instance" });

        await updateThresholdNotified({
            instanceId: "test-instance",
            threshold: 75,
            creditThresholdConfig: {
                thresholds: [50, 75, 90],
                pause_at_limit: false,
                notified_thresholds: [50]
            }
        });

        expect(mockPersonaInstanceRepo.update).toHaveBeenCalledWith("test-instance", {
            last_credit_threshold_notified: 75,
            credit_threshold_config: {
                thresholds: [50, 75, 90],
                pause_at_limit: false,
                notified_thresholds: [50, 75]
            }
        });
    });

    it("should not duplicate threshold in notified_thresholds", async () => {
        mockPersonaInstanceRepo.update.mockResolvedValue({ id: "test-instance" });

        await updateThresholdNotified({
            instanceId: "test-instance",
            threshold: 50,
            creditThresholdConfig: {
                thresholds: [50, 75, 90],
                pause_at_limit: false,
                notified_thresholds: [50] // already notified
            }
        });

        expect(mockPersonaInstanceRepo.update).toHaveBeenCalledWith("test-instance", {
            last_credit_threshold_notified: 50,
            credit_threshold_config: {
                thresholds: [50, 75, 90],
                pause_at_limit: false,
                notified_thresholds: [50] // should not duplicate
            }
        });
    });
});

describe("resetThresholdNotifications", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should reset threshold notifications to initial state", async () => {
        mockPersonaInstanceRepo.findById.mockResolvedValue({
            id: "test-instance",
            credit_threshold_config: {
                thresholds: [50, 75, 90],
                pause_at_limit: true,
                notified_thresholds: [50, 75]
            }
        });
        mockPersonaInstanceRepo.update.mockResolvedValue({ id: "test-instance" });

        await resetThresholdNotifications("test-instance");

        expect(mockPersonaInstanceRepo.update).toHaveBeenCalledWith("test-instance", {
            last_credit_threshold_notified: 0,
            credit_threshold_config: {
                thresholds: [50, 75, 90],
                pause_at_limit: true,
                notified_thresholds: []
            }
        });
    });

    it("should handle non-existent instance", async () => {
        mockPersonaInstanceRepo.findById.mockResolvedValue(null);

        // Should not throw, just log a warning
        await resetThresholdNotifications("non-existent-instance");

        expect(mockPersonaInstanceRepo.update).not.toHaveBeenCalled();
    });
});
