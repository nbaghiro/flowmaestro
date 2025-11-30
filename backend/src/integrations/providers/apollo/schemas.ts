import { z } from "zod";

// =============================================================================
// Common Schemas
// =============================================================================

export const PersonSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    email: z.string().email().optional(),
    phone_numbers: z.array(z.string()).optional(),
    linkedin_url: z.string().url().optional(),
    organization_id: z.string().optional(),
    organization_name: z.string().optional()
});

export const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    website_url: z.string().url().optional(),
    linkedin_url: z.string().url().optional(),
    phone_number: z.string().optional(),
    industry: z.string().optional(),
    revenue: z.number().optional(),
    employee_count: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
});

// =============================================================================
// Search Schemas
// =============================================================================

export const searchPeopleInputSchema = z.object({
    q_keywords: z.string().optional().describe("Search keywords"),
    person_titles: z.array(z.string()).optional().describe("Job titles to filter by"),
    person_seniorities: z.array(z.string()).optional().describe("Seniority levels"),
    organization_ids: z.array(z.string()).optional().describe("Filter by organization IDs"),
    page: z.number().int().min(1).default(1).describe("Page number"),
    per_page: z.number().int().min(1).max(100).default(25).describe("Results per page")
});

export const searchOrganizationsInputSchema = z.object({
    q_keywords: z.string().optional().describe("Search keywords"),
    organization_locations: z.array(z.string()).optional().describe("Locations to filter by"),
    organization_num_employees_ranges: z
        .array(z.string())
        .optional()
        .describe("Employee count ranges"),
    page: z.number().int().min(1).default(1).describe("Page number"),
    per_page: z.number().int().min(1).max(100).default(25).describe("Results per page")
});

// =============================================================================
// Enrichment Schemas
// =============================================================================

export const enrichPersonInputSchema = z
    .object({
        email: z.string().email().optional().describe("Email address to enrich"),
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
        organization_name: z.string().optional().describe("Organization name"),
        domain: z.string().optional().describe("Company domain")
    })
    .refine((data) => data.email || (data.first_name && data.last_name && data.domain), {
        message: "Must provide either email or (first_name + last_name + domain)"
    });

export const enrichOrganizationInputSchema = z
    .object({
        domain: z.string().optional().describe("Company domain"),
        name: z.string().optional().describe("Company name")
    })
    .refine((data) => data.domain || data.name, {
        message: "Must provide either domain or name"
    });

// =============================================================================
// Contact Management Schemas
// =============================================================================

export const createContactInputSchema = z.object({
    first_name: z.string().describe("First name"),
    last_name: z.string().describe("Last name"),
    email: z.string().email().optional().describe("Email address"),
    title: z.string().optional().describe("Job title"),
    organization_name: z.string().optional().describe("Organization name"),
    phone_numbers: z.array(z.string()).optional().describe("Phone numbers"),
    linkedin_url: z.string().url().optional().describe("LinkedIn profile URL")
});

export const updateContactInputSchema = z.object({
    contact_id: z.string().describe("Contact ID to update"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    email: z.string().email().optional().describe("Email address"),
    title: z.string().optional().describe("Job title"),
    organization_name: z.string().optional().describe("Organization name")
});

export const deleteContactInputSchema = z.object({
    contact_id: z.string().describe("Contact ID to delete")
});

export const getContactInputSchema = z.object({
    contact_id: z.string().describe("Contact ID to retrieve")
});

// =============================================================================
// Account Management Schemas
// =============================================================================

export const createAccountInputSchema = z.object({
    name: z.string().describe("Organization name"),
    domain: z.string().optional().describe("Company domain"),
    phone_number: z.string().optional().describe("Phone number"),
    website_url: z.string().url().optional().describe("Website URL")
});

export const updateAccountInputSchema = z.object({
    account_id: z.string().describe("Account ID to update"),
    name: z.string().optional().describe("Organization name"),
    domain: z.string().optional().describe("Company domain"),
    phone_number: z.string().optional().describe("Phone number")
});

export const deleteAccountInputSchema = z.object({
    account_id: z.string().describe("Account ID to delete")
});

export const getAccountInputSchema = z.object({
    account_id: z.string().describe("Account ID to retrieve")
});

// =============================================================================
// Type Exports
// =============================================================================

export type SearchPeopleInput = z.infer<typeof searchPeopleInputSchema>;
export type SearchOrganizationsInput = z.infer<typeof searchOrganizationsInputSchema>;
export type EnrichPersonInput = z.infer<typeof enrichPersonInputSchema>;
export type EnrichOrganizationInput = z.infer<typeof enrichOrganizationInputSchema>;
export type CreateContactInput = z.infer<typeof createContactInputSchema>;
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;
export type DeleteContactInput = z.infer<typeof deleteContactInputSchema>;
export type GetContactInput = z.infer<typeof getContactInputSchema>;
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
export type GetAccountInput = z.infer<typeof getAccountInputSchema>;
