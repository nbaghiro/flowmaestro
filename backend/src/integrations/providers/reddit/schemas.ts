import { z } from "zod";

/**
 * Reddit-specific Zod schemas for validation
 */

/**
 * Subreddit name schema (without r/ prefix)
 */
export const SubredditNameSchema = z
    .string()
    .min(1)
    .max(21)
    .regex(/^[a-zA-Z0-9_]+$/, "Subreddit name can only contain letters, numbers, and underscores")
    .describe("Subreddit name (without r/ prefix)");

/**
 * Post/Comment fullname schema (t3_xxx for posts, t1_xxx for comments)
 */
export const FullnameSchema = z
    .string()
    .regex(/^t[1-6]_[a-z0-9]+$/, "Invalid Reddit fullname format")
    .describe("Reddit fullname (e.g., t3_abc123 for posts, t1_xyz789 for comments)");

/**
 * Post ID schema (without t3_ prefix)
 */
export const PostIdSchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+$/, "Post ID must be alphanumeric")
    .describe("Reddit post ID (without t3_ prefix)");

/**
 * Post title schema
 */
export const PostTitleSchema = z
    .string()
    .min(1)
    .max(300)
    .describe("Post title (max 300 characters)");

/**
 * Post/Comment text schema
 */
export const PostTextSchema = z.string().min(1).max(40000).describe("Post or comment text content");

/**
 * Comment text schema
 */
export const CommentTextSchema = z
    .string()
    .min(1)
    .max(10000)
    .describe("Comment text (max 10000 characters)");

/**
 * URL schema for link posts
 */
export const LinkUrlSchema = z.string().url().describe("URL for link post");

/**
 * Post sort type schema
 */
export const PostSortSchema = z
    .enum(["hot", "new", "top", "rising", "controversial"])
    .default("hot")
    .describe("Sort order for posts");

/**
 * Time filter schema for top/controversial
 */
export const TimeFilterSchema = z
    .enum(["hour", "day", "week", "month", "year", "all"])
    .default("day")
    .describe("Time filter for top/controversial posts");

/**
 * Vote direction schema
 */
export const VoteDirectionSchema = z
    .enum(["up", "down", "none"])
    .describe("Vote direction: up (upvote), down (downvote), or none (remove vote)");

/**
 * Comment sort type schema
 */
export const CommentSortSchema = z
    .enum(["confidence", "top", "new", "controversial", "old", "qa"])
    .default("confidence")
    .describe("Sort order for comments");

/**
 * Limit schema for pagination
 */
export const LimitSchema = z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Number of items to return (max 100)");

/**
 * Pagination cursor schema
 */
export const PaginationCursorSchema = z
    .string()
    .optional()
    .describe("Pagination cursor from previous response");
