/**
 * WorkspaceCreditRepository Tests
 *
 * Tests for workspace credit operations including balance management,
 * credit deduction, reservations, and transaction logging.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { WorkspaceCreditRepository } from "../WorkspaceCreditRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateWorkspaceCreditsRow,
    generateCreditTransactionRow,
    generateId
} from "./setup";

describe("WorkspaceCreditRepository", () => {
    let repository: WorkspaceCreditRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WorkspaceCreditRepository();
    });

    describe("create", () => {
        it("should insert new workspace credits", async () => {
            const input = {
                workspace_id: generateId(),
                subscription_balance: 1000,
                purchased_balance: 500,
                bonus_balance: 100
            };

            const mockRow = generateWorkspaceCreditsRow(input);

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workspace_credits"),
                expect.arrayContaining([
                    input.workspace_id,
                    input.subscription_balance,
                    input.purchased_balance,
                    input.bonus_balance
                ])
            );
            expect(result.workspace_id).toBe(input.workspace_id);
        });

        it("should use default values when not specified", async () => {
            const input = {
                workspace_id: generateId()
            };

            const mockRow = generateWorkspaceCreditsRow({
                workspace_id: input.workspace_id,
                subscription_balance: 0,
                purchased_balance: 0,
                bonus_balance: 0
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.subscription_balance).toBe(0);
            expect(result.purchased_balance).toBe(0);
            expect(result.bonus_balance).toBe(0);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return credits when found", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({ workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1"),
                [workspaceId]
            );
            expect(result?.workspace_id).toBe(workspaceId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByWorkspaceId("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_balance: 2000
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(workspaceId, { subscription_balance: 2000 });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.workspace_credits"),
                expect.arrayContaining([2000, workspaceId])
            );
            expect(result?.subscription_balance).toBe(2000);
        });

        it("should update multiple balance fields", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({ workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(workspaceId, {
                subscription_balance: 500,
                purchased_balance: 200,
                bonus_balance: 50
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([500, 200, 50, workspaceId])
            );
        });

        it("should return existing credits when no updates provided", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({ workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(workspaceId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.workspace_credits"),
                [workspaceId]
            );
            expect(result?.workspace_id).toBe(workspaceId);
        });
    });

    describe("getAvailableCredits", () => {
        it("should calculate available credits correctly", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_balance: 1000,
                purchased_balance: 500,
                bonus_balance: 200,
                reserved: 100
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.getAvailableCredits(workspaceId);

            // 1000 + 500 + 200 - 100 = 1600
            expect(result).toBe(1600);
        });

        it("should return 0 when workspace not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getAvailableCredits("non-existent");

            expect(result).toBe(0);
        });

        it("should never return negative available credits", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_balance: 100,
                purchased_balance: 0,
                bonus_balance: 0,
                reserved: 200
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.getAvailableCredits(workspaceId);

            expect(result).toBe(0);
        });
    });

    describe("getBalance", () => {
        it("should return full balance information", async () => {
            const workspaceId = generateId();
            const mockCreditsRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_balance: 1000,
                purchased_balance: 500,
                bonus_balance: 200,
                reserved: 50,
                lifetime_used: 5000
            });

            // findByWorkspaceId
            mockQuery.mockResolvedValueOnce(mockRows([mockCreditsRow]));
            // getUsedThisMonth
            mockQuery.mockResolvedValueOnce(mockRows([{ total: "250" }]));

            const result = await repository.getBalance(workspaceId);

            expect(result).not.toBeNull();
            expect(result?.available).toBe(1650); // 1000 + 500 + 200 - 50
            expect(result?.subscription).toBe(1000);
            expect(result?.purchased).toBe(500);
            expect(result?.bonus).toBe(200);
            expect(result?.reserved).toBe(50);
            expect(result?.usedThisMonth).toBe(250);
            expect(result?.usedAllTime).toBe(5000);
        });

        it("should return null when workspace not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getBalance("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("addReservation", () => {
        it("should add to reserved amount", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.addReservation(workspaceId, 100);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("reserved = reserved + $2"),
                [workspaceId, 100]
            );
        });
    });

    describe("releaseReservation", () => {
        it("should release from reserved amount", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.releaseReservation(workspaceId, 50);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("reserved = GREATEST(0, reserved - $2)"),
                [workspaceId, 50]
            );
        });
    });

    describe("deductCredits", () => {
        it("should deduct from subscription first, then bonus, then purchased", async () => {
            const workspaceId = generateId();
            const mockCreditsRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_balance: 100,
                bonus_balance: 50,
                purchased_balance: 50
            });

            // findByWorkspaceId
            mockQuery.mockResolvedValueOnce(mockRows([mockCreditsRow]));
            // update
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.deductCredits(workspaceId, 150);

            // Should deduct: 100 from subscription, 50 from bonus, 0 from purchased
            expect(result.subscription).toBe(100);
            expect(result.bonus).toBe(50);
            expect(result.purchased).toBe(0);
        });

        it("should throw error when workspace credits not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await expect(repository.deductCredits(generateId(), 100)).rejects.toThrow(
                "Workspace credits not found"
            );
        });

        it("should throw error when insufficient credits", async () => {
            const workspaceId = generateId();
            const mockCreditsRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_balance: 50,
                bonus_balance: 0,
                purchased_balance: 0
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockCreditsRow]));

            await expect(repository.deductCredits(workspaceId, 100)).rejects.toThrow(
                "Insufficient credits"
            );
        });
    });

    describe("addSubscriptionCredits", () => {
        it("should set subscription balance and expiry", async () => {
            const workspaceId = generateId();
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.addSubscriptionCredits(workspaceId, 1000, expiresAt);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("subscription_balance = $2"),
                expect.arrayContaining([workspaceId, 1000, expiresAt])
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("subscription_expires_at = $3"),
                expect.anything()
            );
        });
    });

    describe("addPurchasedCredits", () => {
        it("should add to purchased balance", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.addPurchasedCredits(workspaceId, 500);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("purchased_balance = purchased_balance + $2"),
                [workspaceId, 500]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("lifetime_purchased = lifetime_purchased + $2"),
                [workspaceId, 500]
            );
        });
    });

    describe("addBonusCredits", () => {
        it("should add to bonus balance", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.addBonusCredits(workspaceId, 100);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("bonus_balance = bonus_balance + $2"),
                [workspaceId, 100]
            );
        });
    });

    describe("createTransaction", () => {
        it("should create transaction record", async () => {
            const input = {
                workspace_id: generateId(),
                user_id: generateId(),
                amount: -50,
                balance_before: 1000,
                balance_after: 950,
                transaction_type: "usage" as const,
                operation_type: "workflow_execution",
                operation_id: generateId(),
                description: "Executed workflow"
            };

            const mockRow = generateCreditTransactionRow(input);

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.createTransaction(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.credit_transactions"),
                expect.arrayContaining([
                    input.workspace_id,
                    input.user_id,
                    input.amount,
                    input.balance_before,
                    input.balance_after,
                    input.transaction_type
                ])
            );
            expect(result.workspace_id).toBe(input.workspace_id);
        });
    });

    describe("getTransactions", () => {
        it("should return paginated transactions", async () => {
            const workspaceId = generateId();
            const mockTransactions = [
                generateCreditTransactionRow({ workspace_id: workspaceId }),
                generateCreditTransactionRow({ workspace_id: workspaceId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTransactions));

            const result = await repository.getTransactions(workspaceId, {
                limit: 10,
                offset: 0
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1"),
                expect.arrayContaining([workspaceId, 10, 0])
            );
            expect(result).toHaveLength(2);
        });

        it("should filter by transaction type when provided", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([generateCreditTransactionRow()]));

            await repository.getTransactions(workspaceId, { type: "usage" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND transaction_type = $2"),
                expect.arrayContaining([workspaceId, "usage"])
            );
        });
    });

    describe("getUsedThisMonth", () => {
        it("should return total usage this month", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([{ total: "500" }]));

            const result = await repository.getUsedThisMonth(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("transaction_type = 'usage'"),
                [workspaceId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("date_trunc('month', CURRENT_TIMESTAMP)"),
                [workspaceId]
            );
            expect(result).toBe(500);
        });
    });

    describe("transactionToShared", () => {
        it("should convert transaction model to shared type", () => {
            const model = {
                id: generateId(),
                workspace_id: generateId(),
                user_id: generateId(),
                amount: -100,
                balance_before: 1000,
                balance_after: 900,
                transaction_type: "usage" as const,
                operation_type: "workflow_execution",
                operation_id: generateId(),
                description: "Test",
                metadata: { key: "value" },
                created_at: new Date()
            };

            const result = repository.transactionToShared(model);

            expect(result.id).toBe(model.id);
            expect(result.workspaceId).toBe(model.workspace_id);
            expect(result.amount).toBe(model.amount);
            expect(result.balanceBefore).toBe(model.balance_before);
            expect(result.balanceAfter).toBe(model.balance_after);
            expect(result.transactionType).toBe(model.transaction_type);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const workspaceId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_expires_at: now,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.subscription_expires_at).toBeInstanceOf(Date);
        });

        it("should handle null subscription_expires_at", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceCreditsRow({
                workspace_id: workspaceId,
                subscription_expires_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(result?.subscription_expires_at).toBeNull();
        });
    });
});
