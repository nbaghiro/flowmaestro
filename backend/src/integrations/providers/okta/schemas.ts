import { z } from "zod";

/**
 * Okta User ID Schema
 */
export const OktaUserIdSchema = z
    .string()
    .min(1)
    .describe("Okta user ID (e.g., 00ub0oNGTSWTBKOLGLNR)");

/**
 * Okta Group ID Schema
 */
export const OktaGroupIdSchema = z
    .string()
    .min(1)
    .describe("Okta group ID (e.g., 00g1emaKYZTWRYYRRTSK)");

/**
 * Okta Application ID Schema
 */
export const OktaAppIdSchema = z
    .string()
    .min(1)
    .describe("Okta application ID (e.g., 0oa1gjh63g214q0Hq0g4)");

/**
 * Okta Email Schema
 */
export const OktaEmailSchema = z.string().email().describe("Email address");

/**
 * Okta User Profile Schema
 */
export const OktaUserProfileSchema = z.object({
    login: z.string().min(1).describe("User login (typically email)"),
    email: z.string().email().describe("User email address"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    displayName: z.string().optional().describe("Display name"),
    mobilePhone: z.string().optional().describe("Mobile phone number"),
    secondEmail: z.string().email().optional().describe("Secondary email address")
});

/**
 * Pagination parameters
 */
export const OktaPaginationSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(20)
        .describe("Number of results to return (max 200)"),
    after: z.string().optional().describe("Pagination cursor for next page")
});

/**
 * Search/filter parameters
 */
export const OktaSearchSchema = z.object({
    q: z.string().optional().describe("Search query string"),
    filter: z.string().optional().describe("Filter expression (SCIM filter syntax)")
});
