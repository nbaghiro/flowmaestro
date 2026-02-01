/**
 * Intercom Companies Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { IntercomClient } from "../client/IntercomClient";
import type { IntercomCompany, IntercomListResponse } from "../types";

// ============================================
// List Companies
// ============================================

export const listCompaniesSchema = z.object({
    per_page: z
        .number()
        .int()
        .min(1)
        .max(150)
        .optional()
        .describe("Number of results per page (max 150)"),
    starting_after: z.string().optional().describe("Cursor for pagination")
});

export type ListCompaniesParams = z.infer<typeof listCompaniesSchema>;

export const listCompaniesOperation: OperationDefinition = {
    id: "listCompanies",
    name: "List Companies",
    description: "List all companies",
    category: "data",
    inputSchema: listCompaniesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListCompanies(
    client: IntercomClient,
    params: ListCompaniesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listCompanies({
            per_page: params.per_page,
            starting_after: params.starting_after
        })) as IntercomListResponse<IntercomCompany>;

        return {
            success: true,
            data: {
                companies: response.data || [],
                total_count: response.total_count,
                pages: response.pages
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list companies",
                retryable: true
            }
        };
    }
}

// ============================================
// Get Company
// ============================================

export const getCompanySchema = z.object({
    companyId: z.string().min(1).describe("The unique identifier of the company")
});

export type GetCompanyParams = z.infer<typeof getCompanySchema>;

export const getCompanyOperation: OperationDefinition = {
    id: "getCompany",
    name: "Get Company",
    description: "Retrieve a specific company",
    category: "data",
    inputSchema: getCompanySchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetCompany(
    client: IntercomClient,
    params: GetCompanyParams
): Promise<OperationResult> {
    try {
        const company = (await client.getCompany(params.companyId)) as IntercomCompany;

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get company",
                retryable: true
            }
        };
    }
}

// ============================================
// Create or Update Company
// ============================================

export const createOrUpdateCompanySchema = z.object({
    company_id: z.string().min(1).describe("Your unique identifier for the company"),
    name: z.string().optional().describe("Company name"),
    plan: z.string().optional().describe("Plan or tier name"),
    monthly_spend: z.number().optional().describe("Monthly spend amount"),
    size: z.number().int().optional().describe("Number of employees"),
    website: z.string().url().optional().describe("Company website URL"),
    industry: z.string().optional().describe("Industry sector"),
    custom_attributes: z
        .record(z.unknown())
        .optional()
        .describe("Custom attributes for the company")
});

export type CreateOrUpdateCompanyParams = z.infer<typeof createOrUpdateCompanySchema>;

export const createOrUpdateCompanyOperation: OperationDefinition = {
    id: "createOrUpdateCompany",
    name: "Create or Update Company",
    description: "Create a new company or update if exists",
    category: "data",
    inputSchema: createOrUpdateCompanySchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateOrUpdateCompany(
    client: IntercomClient,
    params: CreateOrUpdateCompanyParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            company_id: params.company_id
        };

        if (params.name) data.name = params.name;
        if (params.plan) data.plan = params.plan;
        if (params.monthly_spend !== undefined) data.monthly_spend = params.monthly_spend;
        if (params.size !== undefined) data.size = params.size;
        if (params.website) data.website = params.website;
        if (params.industry) data.industry = params.industry;
        if (params.custom_attributes) data.custom_attributes = params.custom_attributes;

        const company = (await client.createOrUpdateCompany(data)) as IntercomCompany;

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create or update company",
                retryable: false
            }
        };
    }
}
