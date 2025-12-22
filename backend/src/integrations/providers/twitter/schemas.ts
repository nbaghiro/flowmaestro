import { z } from "zod";

/**
 * Shared Zod schemas for X (Twitter) operations
 */

export const TweetTextSchema = z
    .string()
    .min(1)
    .max(280)
    .describe("Tweet text content (max 280 characters)");

export const TweetIdSchema = z
    .string()
    .regex(/^\d+$/, "Tweet ID must be a numeric string")
    .describe("The unique identifier of a tweet");

export const UserIdSchema = z
    .string()
    .regex(/^\d+$/, "User ID must be a numeric string")
    .describe("The unique identifier of a user");

export const UsernameSchema = z
    .string()
    .regex(/^[A-Za-z0-9_]{1,15}$/, "Username must be 1-15 alphanumeric characters or underscores")
    .describe("Twitter/X username without the @ symbol");

export const MaxResultsSchema = z
    .number()
    .min(5)
    .max(100)
    .default(10)
    .describe("Maximum number of results to return (5-100)");

export const PaginationTokenSchema = z
    .string()
    .optional()
    .describe("Token for paginating through results");

export const SearchQuerySchema = z
    .string()
    .min(1)
    .max(512)
    .describe("Search query string (max 512 characters)");
