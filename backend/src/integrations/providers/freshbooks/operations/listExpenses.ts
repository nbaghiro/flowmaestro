import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { FreshBooksExpenseOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const listExpensesSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number (default 1)"),
    perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Results per page (max 100, default 25)")
});

export type ListExpensesParams = z.infer<typeof listExpensesSchema>;

export const listExpensesOperation: OperationDefinition = {
    id: "listExpenses",
    name: "List Expenses",
    description: "Get a list of expenses from FreshBooks",
    category: "expenses",
    inputSchema: listExpensesSchema,
    inputSchemaJSON: toJSONSchema(listExpensesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListExpenses(
    client: FreshBooksHttpClient,
    params: ListExpensesParams
): Promise<OperationResult> {
    try {
        const response = await client.listExpenses(params.page, params.perPage);
        const expenses = response.response.result.expenses || [];

        const formattedExpenses: FreshBooksExpenseOutput[] = expenses.map((exp) => ({
            id: exp.id,
            staffId: exp.staffid,
            categoryId: exp.categoryid,
            clientId: exp.clientid || undefined,
            projectId: exp.projectid || undefined,
            vendor: exp.vendor,
            date: exp.date,
            notes: exp.notes,
            amount: parseFloat(exp.amount.amount),
            currencyCode: exp.amount.code,
            status: exp.status,
            updatedAt: exp.updated
        }));

        return {
            success: true,
            data: {
                expenses: formattedExpenses,
                count: formattedExpenses.length,
                page: response.response.result.page,
                pages: response.response.result.pages,
                perPage: response.response.result.per_page,
                total: response.response.result.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list expenses",
                retryable: true
            }
        };
    }
}
