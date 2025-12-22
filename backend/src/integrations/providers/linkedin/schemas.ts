import { z } from "zod";

/**
 * Shared Zod schemas for LinkedIn operations
 */

export const PostContentSchema = z
    .string()
    .min(1)
    .max(3000)
    .describe("Post text content (max 3000 characters)");

export const PostIdSchema = z
    .string()
    .describe(
        "The unique identifier of a post (URN format: urn:li:share:xxx or urn:li:ugcPost:xxx)"
    );

export const AuthorUrnSchema = z
    .string()
    .regex(
        /^urn:li:(person|organization):[A-Za-z0-9_-]+$/,
        "Author must be a valid LinkedIn URN (urn:li:person:xxx or urn:li:organization:xxx)"
    )
    .describe("Author URN - person or organization");

export const PersonUrnSchema = z
    .string()
    .regex(/^urn:li:person:[A-Za-z0-9_-]+$/, "Must be a valid person URN (urn:li:person:xxx)")
    .describe("Person URN for the authenticated user");

export const OrganizationIdSchema = z
    .string()
    .regex(/^\d+$/, "Organization ID must be numeric")
    .describe("LinkedIn organization ID");

export const VisibilitySchema = z
    .enum(["PUBLIC", "CONNECTIONS", "LOGGED_IN"])
    .default("PUBLIC")
    .describe(
        "Post visibility: PUBLIC (anyone), CONNECTIONS (1st degree), or LOGGED_IN (members only)"
    );

export const ReactionTypeSchema = z
    .enum(["LIKE", "CELEBRATE", "SUPPORT", "LOVE", "INSIGHTFUL", "FUNNY"])
    .default("LIKE")
    .describe("Type of reaction to add");

export const CommentTextSchema = z
    .string()
    .min(1)
    .max(1250)
    .describe("Comment text (max 1250 characters)");

export const MaxResultsSchema = z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum number of results to return (1-100)");

export const PaginationStartSchema = z
    .number()
    .min(0)
    .default(0)
    .describe("Pagination start index");

export const ArticleUrlSchema = z.string().url().describe("URL of the article to share");

export const ArticleTitleSchema = z
    .string()
    .max(200)
    .describe("Title for the article (max 200 characters)");

export const ArticleDescriptionSchema = z
    .string()
    .max(256)
    .describe("Description for the article (max 256 characters)");

export const MediaUrlSchema = z.string().url().describe("URL of the media file to upload");

export const MediaTitleSchema = z
    .string()
    .max(200)
    .optional()
    .describe("Title for the media (max 200 characters)");

export const MediaDescriptionSchema = z
    .string()
    .max(1000)
    .optional()
    .describe("Description for the media (max 1000 characters)");
