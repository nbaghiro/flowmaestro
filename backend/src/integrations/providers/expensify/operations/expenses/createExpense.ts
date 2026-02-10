import { z } from "zod";
import { ExpensifyClient } from "../../client/ExpensifyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Create Expense operation schema
 */
export const createExpenseSchema = z.object({
    employeeEmail: z.string().email().describe("Employee email to create expense for"),
    merchant: z.string().describe("Merchant name"),
    amount: z.number().positive().describe("Amount in cents"),
    currency: z.string().length(3).optional().default("USD"),
    created: z.string().describe("Transaction date (YYYY-MM-DD)"),
    category: z.string().optional(),
    tag: z.string().optional(),
    comment: z.string().optional(),
    billable: z.boolean().optional().default(false),
    reimbursable: z.boolean().optional().default(true),
    policyID: z.string().optional()
});

export type CreateExpenseParams = z.infer<typeof createExpenseSchema>;

/**
 * Create Expense operation definition
 */
export const createExpenseOperation: OperationDefinition = {
    id: "createExpense",
    name: "Create Expense",
    description: "Create a new expense in a user's account",
    category: "expenses",
    inputSchema: createExpenseSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create expense operation
 */
export async function executeCreateExpense(
    client: ExpensifyClient,
    params: CreateExpenseParams
): Promise<OperationResult> {
    try {
        const inputSettings = {
            type: "expenses",
            employeeEmail: params.employeeEmail,
            transactionList: [
                {
                    merchant: params.merchant,
                    amount: params.amount,
                    currency: params.currency,
                    created: params.created,
                    category: params.category,
                    tag: params.tag,
                    comment: params.comment,
                    billable: params.billable,
                    reimbursable: params.reimbursable,
                    policyID: params.policyID
                }
            ]
        };

        const response = await client.executeJob("create", inputSettings);

        return {
            success: true,
            data: {
                transactionID: response.transactionID,
                created: true
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create expense";

        if (message.includes("validation")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
