import { z } from "zod";

/**
 * Shared Zod schemas for Trello operations
 */

export const TrelloBoardIdSchema = z.string().describe("Trello board ID");

export const TrelloListIdSchema = z.string().describe("Trello list ID");

export const TrelloCardIdSchema = z.string().describe("Trello card ID");

export const TrelloMemberIdSchema = z
    .string()
    .describe("Trello member ID (use 'me' for current user)");

export const TrelloLimitSchema = z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(50)
    .describe("Maximum number of items to return");

export const TrelloFilterSchema = z
    .enum(["all", "open", "closed", "starred"])
    .optional()
    .default("all")
    .describe("Filter for boards");

export const TrelloCardFieldsSchema = z
    .string()
    .optional()
    .describe("Comma-separated list of card fields to include");

export const TrelloBoardFieldsSchema = z
    .string()
    .optional()
    .describe("Comma-separated list of board fields to include");
