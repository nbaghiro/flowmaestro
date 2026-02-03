/**
 * Reusable Zod schemas for AWS operations
 */

import { z } from "zod";

/**
 * AWS ARN (Amazon Resource Name) schema
 */
export const AWSArnSchema = z
    .string()
    .regex(/^arn:aws:[\w-]+:[\w-]*:\d{12}:[\w/-]+$/)
    .describe("Amazon Resource Name (ARN)");

/**
 * AWS Lambda function name schema
 */
export const LambdaFunctionNameSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9-_]+$/)
    .describe("Lambda function name");

/**
 * Lambda invocation type schema
 */
export const LambdaInvocationTypeSchema = z
    .enum(["RequestResponse", "Event", "DryRun"])
    .describe("Invocation type: RequestResponse (sync), Event (async), or DryRun (validate only)");

/**
 * Lambda runtime schema
 */
export const LambdaRuntimeSchema = z
    .enum([
        "nodejs20.x",
        "nodejs18.x",
        "python3.12",
        "python3.11",
        "python3.10",
        "python3.9",
        "java21",
        "java17",
        "java11",
        "dotnet8",
        "dotnet6",
        "go1.x",
        "ruby3.2",
        "provided.al2023",
        "provided.al2"
    ])
    .describe("Lambda runtime environment");

/**
 * ECS cluster name schema
 */
export const ECSClusterNameSchema = z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9-_]+$/)
    .describe("ECS cluster name");

/**
 * ECS service name schema
 */
export const ECSServiceNameSchema = z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9-_]+$/)
    .describe("ECS service name");

/**
 * CloudWatch log group name schema
 */
export const LogGroupNameSchema = z.string().min(1).max(512).describe("CloudWatch log group name");

/**
 * CloudWatch metric namespace schema
 */
export const MetricNamespaceSchema = z
    .string()
    .min(1)
    .max(255)
    .describe("CloudWatch metric namespace (e.g., AWS/Lambda, AWS/ECS)");

/**
 * ISO 8601 timestamp schema
 */
export const ISO8601TimestampSchema = z.string().datetime().describe("ISO 8601 timestamp");

/**
 * Pagination marker schema
 */
export const PaginationMarkerSchema = z.string().optional().describe("Pagination token");

/**
 * Max results schema (for list operations)
 */
export const MaxResultsSchema = z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Maximum number of results to return");
