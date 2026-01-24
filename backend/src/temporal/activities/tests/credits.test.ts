/**
 * Credit Activities Unit Tests
 *
 * Tests the credit activities that wrap CreditService for Temporal workflows.
 * These tests mock the underlying CreditService to test activity logic in isolation.
 */

import { creditService } from "../../../services/workspace/CreditService";
import {
    checkCredits,
    shouldAllowExecution,
    reserveCredits,
    releaseCredits,
    finalizeCredits,
    calculateLLMCredits,
    calculateNodeCredits,
    estimateWorkflowCredits,
    getCreditsBalance
} from "../credits";

// Mock the CreditService
jest.mock("../../../services/workspace/CreditService", () => ({
    creditService: {
        hasEnoughCredits: jest.fn(),
        getBalance: jest.fn(),
        reserveCredits: jest.fn(),
        releaseCredits: jest.fn(),
        finalizeCredits: jest.fn(),
        calculateLLMCredits: jest.fn(),
        calculateNodeCredits: jest.fn(),
        estimateWorkflowCredits: jest.fn()
    }
}));

// Mock the logger
jest.mock("../../../core/logging", () => ({
    createServiceLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

describe("Credit Activities", () => {
    const mockCreditService = creditService as jest.Mocked<typeof creditService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =========================================================================
    // checkCredits
    // =========================================================================
    describe("checkCredits", () => {
        it("should return true when workspace has enough credits", async () => {
            mockCreditService.hasEnoughCredits.mockResolvedValue(true);

            const result = await checkCredits({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(true);
            expect(mockCreditService.hasEnoughCredits).toHaveBeenCalledWith("ws-123", 100);
        });

        it("should return false when workspace has insufficient credits", async () => {
            mockCreditService.hasEnoughCredits.mockResolvedValue(false);

            const result = await checkCredits({
                workspaceId: "ws-123",
                estimatedCredits: 1000
            });

            expect(result).toBe(false);
        });
    });

    // =========================================================================
    // shouldAllowExecution
    // =========================================================================
    describe("shouldAllowExecution", () => {
        it("should allow execution when sufficient credits available", async () => {
            mockCreditService.getBalance.mockResolvedValue({
                available: 500,
                subscription: 300,
                purchased: 200,
                bonus: 0,
                reserved: 0,
                subscriptionExpiresAt: null,
                usedThisMonth: 100,
                usedAllTime: 500
            });

            const result = await shouldAllowExecution({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(true);
        });

        it("should allow execution with small overdraft (< 10% shortfall)", async () => {
            mockCreditService.getBalance.mockResolvedValue({
                available: 95, // 5% shortfall from 100
                subscription: 95,
                purchased: 0,
                bonus: 0,
                reserved: 0,
                subscriptionExpiresAt: null,
                usedThisMonth: 5,
                usedAllTime: 5
            });

            const result = await shouldAllowExecution({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(true);
        });

        it("should deny execution with large shortfall (>= 10%)", async () => {
            mockCreditService.getBalance.mockResolvedValue({
                available: 80, // 20% shortfall from 100
                subscription: 80,
                purchased: 0,
                bonus: 0,
                reserved: 0,
                subscriptionExpiresAt: null,
                usedThisMonth: 20,
                usedAllTime: 20
            });

            const result = await shouldAllowExecution({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(false);
        });

        it("should deny execution when balance is null", async () => {
            mockCreditService.getBalance.mockResolvedValue(null);

            const result = await shouldAllowExecution({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(false);
        });

        it("should deny execution when balance is zero", async () => {
            mockCreditService.getBalance.mockResolvedValue({
                available: 0,
                subscription: 0,
                purchased: 0,
                bonus: 0,
                reserved: 0,
                subscriptionExpiresAt: null,
                usedThisMonth: 0,
                usedAllTime: 0
            });

            const result = await shouldAllowExecution({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(false);
        });

        it("should handle edge case at exactly 10% shortfall", async () => {
            mockCreditService.getBalance.mockResolvedValue({
                available: 90, // exactly 10% shortfall
                subscription: 90,
                purchased: 0,
                bonus: 0,
                reserved: 0,
                subscriptionExpiresAt: null,
                usedThisMonth: 10,
                usedAllTime: 10
            });

            const result = await shouldAllowExecution({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            // At exactly 10%, should NOT be allowed (< 10 check, not <=)
            expect(result).toBe(false);
        });
    });

    // =========================================================================
    // reserveCredits
    // =========================================================================
    describe("reserveCredits", () => {
        it("should return true when reservation succeeds", async () => {
            mockCreditService.reserveCredits.mockResolvedValue(true);

            const result = await reserveCredits({
                workspaceId: "ws-123",
                estimatedCredits: 100
            });

            expect(result).toBe(true);
            expect(mockCreditService.reserveCredits).toHaveBeenCalledWith("ws-123", 100);
        });

        it("should return false when reservation fails", async () => {
            mockCreditService.reserveCredits.mockResolvedValue(false);

            const result = await reserveCredits({
                workspaceId: "ws-123",
                estimatedCredits: 1000
            });

            expect(result).toBe(false);
        });
    });

    // =========================================================================
    // releaseCredits
    // =========================================================================
    describe("releaseCredits", () => {
        it("should call releaseCredits on the service", async () => {
            mockCreditService.releaseCredits.mockResolvedValue(undefined);

            await releaseCredits({
                workspaceId: "ws-123",
                amount: 50
            });

            expect(mockCreditService.releaseCredits).toHaveBeenCalledWith("ws-123", 50);
        });
    });

    // =========================================================================
    // finalizeCredits
    // =========================================================================
    describe("finalizeCredits", () => {
        it("should finalize credits with all parameters", async () => {
            mockCreditService.finalizeCredits.mockResolvedValue(undefined);

            await finalizeCredits({
                workspaceId: "ws-123",
                userId: "user-456",
                reservedAmount: 100,
                actualAmount: 75,
                operationType: "workflow_execution",
                operationId: "exec-789",
                description: "Test workflow",
                metadata: { nodeCount: 5 }
            });

            expect(mockCreditService.finalizeCredits).toHaveBeenCalledWith(
                "ws-123",
                "user-456",
                100,
                75,
                "workflow_execution",
                "exec-789",
                "Test workflow"
            );
        });

        it("should handle null userId", async () => {
            mockCreditService.finalizeCredits.mockResolvedValue(undefined);

            await finalizeCredits({
                workspaceId: "ws-123",
                userId: null,
                reservedAmount: 100,
                actualAmount: 75,
                operationType: "agent_execution",
                operationId: "exec-789",
                description: "Test agent"
            });

            expect(mockCreditService.finalizeCredits).toHaveBeenCalledWith(
                "ws-123",
                null,
                100,
                75,
                "agent_execution",
                "exec-789",
                "Test agent"
            );
        });
    });

    // =========================================================================
    // calculateLLMCredits
    // =========================================================================
    describe("calculateLLMCredits", () => {
        it("should calculate credits from token usage", async () => {
            mockCreditService.calculateLLMCredits.mockReturnValue(50);

            const result = await calculateLLMCredits({
                model: "gpt-4o",
                inputTokens: 1000,
                outputTokens: 500
            });

            expect(result).toBe(50);
            expect(mockCreditService.calculateLLMCredits).toHaveBeenCalledWith("gpt-4o", 1000, 500);
        });

        it("should handle zero tokens", async () => {
            mockCreditService.calculateLLMCredits.mockReturnValue(0);

            const result = await calculateLLMCredits({
                model: "gpt-4o-mini",
                inputTokens: 0,
                outputTokens: 0
            });

            expect(result).toBe(0);
        });
    });

    // =========================================================================
    // calculateNodeCredits
    // =========================================================================
    describe("calculateNodeCredits", () => {
        it("should return flat rate for node type", async () => {
            mockCreditService.calculateNodeCredits.mockReturnValue(5);

            const result = await calculateNodeCredits({
                nodeType: "http_request"
            });

            expect(result).toBe(5);
            expect(mockCreditService.calculateNodeCredits).toHaveBeenCalledWith("http_request");
        });

        it("should return 0 for free node types", async () => {
            mockCreditService.calculateNodeCredits.mockReturnValue(0);

            const result = await calculateNodeCredits({
                nodeType: "trigger_manual"
            });

            expect(result).toBe(0);
        });
    });

    // =========================================================================
    // estimateWorkflowCredits
    // =========================================================================
    describe("estimateWorkflowCredits", () => {
        it("should estimate credits for array-format nodes", async () => {
            mockCreditService.estimateWorkflowCredits.mockResolvedValue({
                totalCredits: 150,
                breakdown: [
                    { nodeId: "n1", nodeType: "llm", credits: 100, description: "LLM execution" },
                    {
                        nodeId: "n2",
                        nodeType: "http_request",
                        credits: 50,
                        description: "HTTP request"
                    }
                ],
                confidence: "estimate" as const
            });

            const result = await estimateWorkflowCredits({
                workflowDefinition: {
                    nodes: [
                        { id: "n1", type: "llm", data: { model: "gpt-4o" } },
                        { id: "n2", type: "http_request" }
                    ]
                }
            });

            expect(result.totalCredits).toBe(150);
            expect(result.breakdown).toHaveLength(2);
        });

        it("should convert Record-format nodes to array", async () => {
            mockCreditService.estimateWorkflowCredits.mockResolvedValue({
                totalCredits: 100,
                breakdown: [{ nodeId: "n1", nodeType: "llm", credits: 100, description: "LLM" }],
                confidence: "estimate" as const
            });

            const result = await estimateWorkflowCredits({
                workflowDefinition: {
                    nodes: {
                        n1: { type: "llm", data: { model: "gpt-4o" } },
                        n2: { type: "output" }
                    }
                }
            });

            expect(result.totalCredits).toBe(100);
            // Verify the service was called with array format
            expect(mockCreditService.estimateWorkflowCredits).toHaveBeenCalledWith({
                nodes: expect.arrayContaining([
                    expect.objectContaining({ id: "n1", type: "llm" }),
                    expect.objectContaining({ id: "n2", type: "output" })
                ])
            });
        });
    });

    // =========================================================================
    // getCreditsBalance
    // =========================================================================
    describe("getCreditsBalance", () => {
        it("should return balance from service", async () => {
            const mockBalance = {
                available: 500,
                subscription: 300,
                purchased: 200,
                bonus: 0,
                reserved: 0,
                subscriptionExpiresAt: null,
                usedThisMonth: 100,
                usedAllTime: 500
            };
            mockCreditService.getBalance.mockResolvedValue(mockBalance);

            const result = await getCreditsBalance({ workspaceId: "ws-123" });

            expect(result).toEqual(mockBalance);
        });

        it("should return null for non-existent workspace", async () => {
            mockCreditService.getBalance.mockResolvedValue(null);

            const result = await getCreditsBalance({ workspaceId: "non-existent" });

            expect(result).toBeNull();
        });
    });
});
