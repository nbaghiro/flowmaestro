/**
 * Freshdesk Companies Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshdeskClient } from "../client/FreshdeskClient";
import type { FreshdeskCompany } from "../types";

// ============================================
// Create Company
// ============================================

export const createCompanySchema = z.object({
    name: z.string().min(1).describe("Company name"),
    description: z.string().optional().describe("Company description"),
    domains: z.array(z.string()).optional().describe("Company domains"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom fields")
});

export type CreateCompanyParams = z.infer<typeof createCompanySchema>;

export const createCompanyOperation: OperationDefinition = {
    id: "createCompany",
    name: "Create Company",
    description: "Create a new company",
    category: "data",
    inputSchema: createCompanySchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateCompany(
    client: FreshdeskClient,
    params: CreateCompanyParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            name: params.name
        };

        if (params.description) data.description = params.description;
        if (params.domains) data.domains = params.domains;
        if (params.custom_fields) data.custom_fields = params.custom_fields;

        const company = (await client.createCompany(data)) as FreshdeskCompany;

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create company",
                retryable: false
            }
        };
    }
}

// ============================================
// Get Company
// ============================================

export const getCompanySchema = z.object({
    companyId: z.number().int().describe("Company ID")
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
    client: FreshdeskClient,
    params: GetCompanyParams
): Promise<OperationResult> {
    try {
        const company = (await client.getCompany(params.companyId)) as FreshdeskCompany;

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
// Update Company
// ============================================

export const updateCompanySchema = z.object({
    companyId: z.number().int().describe("Company ID"),
    name: z.string().optional().describe("Company name"),
    description: z.string().optional().describe("Description"),
    domains: z.array(z.string()).optional().describe("Domains"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom fields")
});

export type UpdateCompanyParams = z.infer<typeof updateCompanySchema>;

export const updateCompanyOperation: OperationDefinition = {
    id: "updateCompany",
    name: "Update Company",
    description: "Update an existing company",
    category: "data",
    inputSchema: updateCompanySchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdateCompany(
    client: FreshdeskClient,
    params: UpdateCompanyParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.name) data.name = params.name;
        if (params.description) data.description = params.description;
        if (params.domains) data.domains = params.domains;
        if (params.custom_fields) data.custom_fields = params.custom_fields;

        const company = (await client.updateCompany(params.companyId, data)) as FreshdeskCompany;

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update company",
                retryable: false
            }
        };
    }
}

// ============================================
// List Companies
// ============================================

export const listCompaniesSchema = z.object({
    per_page: z.number().int().min(1).max(100).optional().describe("Results per page"),
    page: z.number().int().min(1).optional().describe("Page number")
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
    client: FreshdeskClient,
    params: ListCompaniesParams
): Promise<OperationResult> {
    try {
        const companies = (await client.listCompanies(params)) as FreshdeskCompany[];

        return {
            success: true,
            data: {
                companies
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
