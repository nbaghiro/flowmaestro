/**
 * CreditService Tests
 *
 * Tests for credit management and cost calculation service (CreditService.ts)
 */

import type { CreditBalance } from "@flowmaestro/shared";

// Mock the WorkspaceCreditRepository
jest.mock("../../../storage/repositories/WorkspaceCreditRepository");

// Mock the logger
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

import { WorkspaceCreditRepository } from "../../../storage/repositories/WorkspaceCreditRepository";
import { CreditService } from "../CreditService";

const MockedCreditRepository = WorkspaceCreditRepository as jest.MockedClass<
    typeof WorkspaceCreditRepository
>;

function createMockBalance(overrides: Partial<CreditBalance> = {}): CreditBalance {
    return {
        available: 1000,
        subscription: 500,
        purchased: 400,
        bonus: 100,
        reserved: 50,
        subscriptionExpiresAt: null,
        usedThisMonth: 200,
        usedAllTime: 5000,
        ...overrides
    };
}

describe("CreditService", () => {
    let service: CreditService;
    let mockRepo: jest.Mocked<WorkspaceCreditRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepo = {
            getBalance: jest.fn(),
            getAvailableCredits: jest.fn(),
            addReservation: jest.fn(),
            releaseReservation: jest.fn(),
            deductCredits: jest.fn(),
            createTransaction: jest.fn(),
            addSubscriptionCredits: jest.fn(),
            addPurchasedCredits: jest.fn(),
            addBonusCredits: jest.fn(),
            getTransactions: jest.fn(),
            transactionToShared: jest.fn().mockImplementation((t) => t)
        } as unknown as jest.Mocked<WorkspaceCreditRepository>;

        MockedCreditRepository.mockImplementation(() => mockRepo);
        service = new CreditService();
    });

    describe("getBalance", () => {
        it("should return balance from repository", async () => {
            const balance = createMockBalance();
            mockRepo.getBalance.mockResolvedValue(balance);

            const result = await service.getBalance("workspace-123");

            expect(mockRepo.getBalance).toHaveBeenCalledWith("workspace-123");
            expect(result).toEqual(balance);
        });

        it("should return null when workspace not found", async () => {
            mockRepo.getBalance.mockResolvedValue(null);

            const result = await service.getBalance("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("hasEnoughCredits", () => {
        it("should return true when enough credits available", async () => {
            mockRepo.getAvailableCredits.mockResolvedValue(1000);

            const result = await service.hasEnoughCredits("workspace-123", 500);

            expect(result).toBe(true);
        });

        it("should return false when not enough credits", async () => {
            mockRepo.getAvailableCredits.mockResolvedValue(100);

            const result = await service.hasEnoughCredits("workspace-123", 500);

            expect(result).toBe(false);
        });

        it("should return true when exact amount available", async () => {
            mockRepo.getAvailableCredits.mockResolvedValue(500);

            const result = await service.hasEnoughCredits("workspace-123", 500);

            expect(result).toBe(true);
        });
    });

    describe("reserveCredits", () => {
        it("should reserve credits when enough available", async () => {
            mockRepo.getAvailableCredits.mockResolvedValue(1000);

            const result = await service.reserveCredits("workspace-123", 500);

            expect(result).toBe(true);
            expect(mockRepo.addReservation).toHaveBeenCalledWith("workspace-123", 500);
        });

        it("should fail when not enough credits available", async () => {
            mockRepo.getAvailableCredits.mockResolvedValue(100);

            const result = await service.reserveCredits("workspace-123", 500);

            expect(result).toBe(false);
            expect(mockRepo.addReservation).not.toHaveBeenCalled();
        });
    });

    describe("releaseCredits", () => {
        it("should release reserved credits", async () => {
            await service.releaseCredits("workspace-123", 500);

            expect(mockRepo.releaseReservation).toHaveBeenCalledWith("workspace-123", 500);
        });
    });

    describe("finalizeCredits", () => {
        beforeEach(() => {
            mockRepo.getBalance
                .mockResolvedValueOnce(createMockBalance({ available: 1000, reserved: 500 }))
                .mockResolvedValueOnce(createMockBalance({ available: 700, reserved: 0 }));
        });

        it("should finalize credits and record transaction", async () => {
            await service.finalizeCredits(
                "workspace-123",
                "user-456",
                500, // reserved
                300, // actual
                "workflow_execution",
                "exec-789",
                "Workflow execution"
            );

            expect(mockRepo.releaseReservation).toHaveBeenCalledWith("workspace-123", 500);
            expect(mockRepo.deductCredits).toHaveBeenCalledWith("workspace-123", 300);
            expect(mockRepo.createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace_id: "workspace-123",
                    user_id: "user-456",
                    amount: -300,
                    transaction_type: "usage",
                    operation_type: "workflow_execution",
                    operation_id: "exec-789"
                })
            );
        });

        it("should throw when workspace not found", async () => {
            mockRepo.getBalance.mockReset();
            mockRepo.getBalance.mockResolvedValue(null);

            await expect(
                service.finalizeCredits("workspace-123", null, 500, 300, "test")
            ).rejects.toThrow("Workspace credits not found");
        });

        it("should handle null userId", async () => {
            await service.finalizeCredits("workspace-123", null, 500, 300, "system_operation");

            expect(mockRepo.createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: undefined
                })
            );
        });
    });

    describe("calculateLLMCredits", () => {
        it("should calculate credits for GPT-4o", () => {
            // GPT-4o: input $2.5/1M, output $10/1M
            // 1000 input tokens + 500 output tokens
            // Input cost: (1000/1M) * 2.5 = 0.0025
            // Output cost: (500/1M) * 10 = 0.005
            // Total: 0.0075 USD
            // Credits: ceil((0.0075 / 0.01) * 1.2) = ceil(0.9) = 1

            const credits = service.calculateLLMCredits("gpt-4o", 1000, 500);

            expect(credits).toBeGreaterThanOrEqual(1);
        });

        it("should calculate credits for GPT-4o-mini (cheaper)", () => {
            const creditsGpt4o = service.calculateLLMCredits("gpt-4o", 1000, 500);
            const creditsGpt4oMini = service.calculateLLMCredits("gpt-4o-mini", 1000, 500);

            // GPT-4o-mini should be cheaper
            expect(creditsGpt4oMini).toBeLessThanOrEqual(creditsGpt4o);
        });

        it("should calculate credits for Claude models", () => {
            const creditsSonnet = service.calculateLLMCredits(
                "claude-3-5-sonnet-20241022",
                1000,
                500
            );
            const creditsHaiku = service.calculateLLMCredits("claude-3-haiku-20240307", 1000, 500);

            // Haiku should be cheaper
            expect(creditsHaiku).toBeLessThanOrEqual(creditsSonnet);
            expect(creditsSonnet).toBeGreaterThanOrEqual(1);
            expect(creditsHaiku).toBeGreaterThanOrEqual(1);
        });

        it("should use default pricing for unknown models", () => {
            const credits = service.calculateLLMCredits("unknown-model-xyz", 1000, 500);

            expect(credits).toBeGreaterThanOrEqual(1);
        });

        it("should return minimum 1 credit", () => {
            // Very small token counts
            const credits = service.calculateLLMCredits("gpt-4o-mini", 1, 1);

            expect(credits).toBe(1);
        });

        it("should scale linearly with token count", () => {
            const credits1k = service.calculateLLMCredits("gpt-4o", 1000, 1000);
            const credits10k = service.calculateLLMCredits("gpt-4o", 10000, 10000);

            // 10x tokens should be roughly 10x credits
            expect(credits10k / credits1k).toBeGreaterThan(5);
        });

        it("should handle large token counts", () => {
            const credits = service.calculateLLMCredits("gpt-4o", 100000, 50000);

            // Should be a substantial amount for large token usage
            expect(credits).toBeGreaterThan(50);
        });
    });

    describe("calculateNodeCredits", () => {
        it("should return credits based on NODE_COSTS mapping", () => {
            // These should return their defined values or default
            // The actual values depend on the NODE_COSTS implementation

            // Test that the method returns reasonable values
            const triggerCost = service.calculateNodeCredits("trigger_manual");
            const httpCost = service.calculateNodeCredits("http_request");
            const unknownCost = service.calculateNodeCredits("some_unknown_type");

            // All costs should be non-negative integers
            expect(triggerCost).toBeGreaterThanOrEqual(0);
            expect(httpCost).toBeGreaterThanOrEqual(0);
            expect(unknownCost).toBeGreaterThanOrEqual(0);

            // Unknown types should fall back to default (1)
            expect(unknownCost).toBe(1);
        });

        it("should return correct credits for data processing nodes", () => {
            expect(service.calculateNodeCredits("data_transform")).toBe(1);
            expect(service.calculateNodeCredits("http_request")).toBe(2);
            expect(service.calculateNodeCredits("code_execution")).toBe(3);
            expect(service.calculateNodeCredits("database_query")).toBe(3);
        });

        it("should return correct credits for knowledge base nodes", () => {
            expect(service.calculateNodeCredits("knowledge_search")).toBe(5);
            expect(service.calculateNodeCredits("knowledge_index")).toBe(10);
        });

        it("should return correct credits for image generation nodes", () => {
            expect(service.calculateNodeCredits("image_generation_dalle")).toBe(50);
            expect(service.calculateNodeCredits("image_generation_midjourney")).toBe(100);
            expect(service.calculateNodeCredits("image_generation_stable")).toBe(30);
        });

        it("should return default credits for unknown nodes", () => {
            expect(service.calculateNodeCredits("unknown_node_type")).toBe(1);
        });
    });

    describe("estimateWorkflowCredits", () => {
        it("should estimate credits for simple workflow", async () => {
            const workflow = {
                nodes: [
                    { id: "1", type: "trigger_manual" },
                    { id: "2", type: "http_request" },
                    { id: "3", type: "data_transform" },
                    { id: "4", type: "output" }
                ]
            };

            const estimate = await service.estimateWorkflowCredits(workflow);

            // Verify the breakdown has correct structure
            expect(estimate.breakdown).toHaveLength(4);
            expect(estimate.confidence).toBe("estimate");

            // Total should be sum of individual node costs
            const expectedTotal = estimate.breakdown.reduce((sum, item) => sum + item.credits, 0);
            expect(estimate.totalCredits).toBe(expectedTotal);

            // Each breakdown item should have required fields
            for (const item of estimate.breakdown) {
                expect(item.nodeId).toBeDefined();
                expect(item.nodeType).toBeDefined();
                expect(typeof item.credits).toBe("number");
                expect(item.credits).toBeGreaterThanOrEqual(0);
                expect(item.description).toBeDefined();
            }
        });

        it("should estimate higher credits for LLM nodes", async () => {
            const workflow = {
                nodes: [
                    { id: "1", type: "trigger_manual" },
                    { id: "2", type: "llm", data: { model: "gpt-4o" } },
                    { id: "3", type: "output" }
                ]
            };

            const estimate = await service.estimateWorkflowCredits(workflow);

            // LLM node should contribute more credits
            const llmBreakdown = estimate.breakdown.find((b) => b.nodeId === "2");
            expect(llmBreakdown?.credits).toBeGreaterThan(0);
        });

        it("should estimate credits for agent nodes", async () => {
            const workflow = {
                nodes: [
                    { id: "1", type: "trigger_manual" },
                    { id: "2", type: "agent", data: { model: "gpt-4o-mini" } },
                    { id: "3", type: "output" }
                ]
            };

            const estimate = await service.estimateWorkflowCredits(workflow);

            const agentBreakdown = estimate.breakdown.find((b) => b.nodeId === "2");
            expect(agentBreakdown?.nodeType).toBe("agent");
            expect(agentBreakdown?.credits).toBeGreaterThan(0);
        });

        it("should include node IDs and types in breakdown", async () => {
            const workflow = {
                nodes: [
                    { id: "node-1", type: "http_request" },
                    { id: "node-2", type: "data_transform" }
                ]
            };

            const estimate = await service.estimateWorkflowCredits(workflow);

            expect(estimate.breakdown[0]).toEqual({
                nodeId: "node-1",
                nodeType: "http_request",
                credits: 2,
                description: "http_request execution"
            });
        });
    });

    describe("addSubscriptionCredits", () => {
        beforeEach(() => {
            mockRepo.getBalance.mockResolvedValue(createMockBalance({ available: 500 }));
        });

        it("should add subscription credits and record transaction", async () => {
            const expiresAt = new Date("2025-02-01");

            await service.addSubscriptionCredits("workspace-123", 1000, expiresAt);

            expect(mockRepo.addSubscriptionCredits).toHaveBeenCalledWith(
                "workspace-123",
                1000,
                expiresAt
            );
            expect(mockRepo.createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace_id: "workspace-123",
                    amount: 1000,
                    balance_before: 500,
                    balance_after: 1500,
                    transaction_type: "subscription"
                })
            );
        });

        it("should throw when workspace not found", async () => {
            mockRepo.getBalance.mockResolvedValue(null);

            await expect(
                service.addSubscriptionCredits("non-existent", 1000, new Date())
            ).rejects.toThrow("Workspace credits not found");
        });
    });

    describe("addPurchasedCredits", () => {
        beforeEach(() => {
            mockRepo.getBalance.mockResolvedValue(createMockBalance({ available: 500 }));
        });

        it("should add purchased credits and record transaction", async () => {
            await service.addPurchasedCredits("workspace-123", "user-456", 5000, "pack-premium");

            expect(mockRepo.addPurchasedCredits).toHaveBeenCalledWith("workspace-123", 5000);
            expect(mockRepo.createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace_id: "workspace-123",
                    user_id: "user-456",
                    amount: 5000,
                    transaction_type: "purchase",
                    metadata: { packId: "pack-premium" }
                })
            );
        });
    });

    describe("addBonusCredits", () => {
        beforeEach(() => {
            mockRepo.getBalance.mockResolvedValue(createMockBalance({ available: 500 }));
        });

        it("should add bonus credits and record transaction", async () => {
            await service.addBonusCredits("workspace-123", 100, "Referral bonus");

            expect(mockRepo.addBonusCredits).toHaveBeenCalledWith("workspace-123", 100);
            expect(mockRepo.createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace_id: "workspace-123",
                    amount: 100,
                    transaction_type: "bonus",
                    description: "Referral bonus"
                })
            );
        });
    });

    describe("getTransactions", () => {
        it("should return transactions with options", async () => {
            const transactions = [
                { id: "1", amount: -100, transaction_type: "usage" },
                { id: "2", amount: 1000, transaction_type: "purchase" }
            ];
            mockRepo.getTransactions.mockResolvedValue(transactions as never);

            const result = await service.getTransactions("workspace-123", {
                limit: 10,
                offset: 0
            });

            expect(mockRepo.getTransactions).toHaveBeenCalledWith("workspace-123", {
                limit: 10,
                offset: 0
            });
            expect(result).toHaveLength(2);
        });
    });
});
