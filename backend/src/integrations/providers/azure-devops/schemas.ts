import { z } from "zod";

/**
 * Azure DevOps-specific Zod schemas for validation
 */

/**
 * Work item type schema
 */
export const WorkItemTypeSchema = z.enum([
    "Bug",
    "Task",
    "User Story",
    "Feature",
    "Epic",
    "Issue",
    "Test Case"
]);

/**
 * Work item state schema
 */
export const WorkItemStateSchema = z.enum([
    "New",
    "Active",
    "Resolved",
    "Closed",
    "Removed",
    "In Progress",
    "Done"
]);

/**
 * Pull request status schema
 */
export const PullRequestStatusSchema = z.enum(["active", "abandoned", "completed", "notSet"]);

/**
 * Pipeline result schema
 */
export const PipelineResultSchema = z.enum([
    "succeeded",
    "partiallySucceeded",
    "failed",
    "canceled"
]);

/**
 * Pipeline state schema
 */
export const PipelineStateSchema = z.enum(["inProgress", "completed", "canceling", "unknown"]);

/**
 * Release status schema
 */
export const ReleaseStatusSchema = z.enum(["active", "draft", "abandoned"]);

/**
 * Test outcome schema
 */
export const TestOutcomeSchema = z.enum([
    "Passed",
    "Failed",
    "Inconclusive",
    "None",
    "Unspecified",
    "Blocked",
    "NotExecuted"
]);
