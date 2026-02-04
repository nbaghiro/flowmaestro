import { z } from "zod";

/**
 * Shared Zod schemas for Hotjar operations
 */

/**
 * Site ID - required for survey operations
 */
export const HotjarSiteIdSchema = z.string().min(1).describe("The Hotjar site ID");

/**
 * Survey ID - required for response operations
 */
export const HotjarSurveyIdSchema = z.string().min(1).describe("The Hotjar survey ID");

/**
 * Organization ID - required for user lookup
 */
export const HotjarOrganizationIdSchema = z.string().min(1).describe("The Hotjar organization ID");

/**
 * Pagination limit
 */
export const HotjarLimitSchema = z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum number of results to return");

/**
 * Pagination cursor
 */
export const HotjarCursorSchema = z
    .string()
    .optional()
    .describe("Cursor for pagination (from next_cursor in previous response)");
