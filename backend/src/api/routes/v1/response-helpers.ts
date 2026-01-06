import * as crypto from "crypto";
import { FastifyReply } from "fastify";
import type { PublicApiErrorCode } from "../../middleware/api-key-auth";

/**
 * Standard metadata included in all public API responses.
 */
export interface ResponseMeta {
    request_id: string;
    timestamp: string;
}

/**
 * Generate response metadata.
 */
export function generateMeta(): ResponseMeta {
    return {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
    };
}

/**
 * Standard success response format for single resources.
 */
export interface PublicApiResponse<T> {
    data: T;
    meta: ResponseMeta;
}

/**
 * Standard paginated response format.
 */
export interface PublicApiPaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        per_page: number;
        total_count: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
    meta: ResponseMeta;
}

/**
 * Standard error response format.
 */
export interface PublicApiErrorResponse {
    error: {
        code: PublicApiErrorCode;
        message: string;
        details?: Record<string, unknown>;
    };
    meta: ResponseMeta;
}

/**
 * Send a successful response with a single resource.
 */
export function sendSuccess<T>(
    reply: FastifyReply,
    data: T,
    statusCode: number = 200
): FastifyReply {
    const response: PublicApiResponse<T> = {
        data,
        meta: generateMeta()
    };
    return reply.status(statusCode).send(response);
}

/**
 * Send a successful response with paginated data.
 */
export function sendPaginated<T>(
    reply: FastifyReply,
    data: T[],
    options: {
        page: number;
        per_page: number;
        total_count: number;
    }
): FastifyReply {
    const totalPages = Math.ceil(options.total_count / options.per_page);

    const response: PublicApiPaginatedResponse<T> = {
        data,
        pagination: {
            page: options.page,
            per_page: options.per_page,
            total_count: options.total_count,
            total_pages: totalPages,
            has_next: options.page < totalPages,
            has_prev: options.page > 1
        },
        meta: generateMeta()
    };

    return reply.status(200).send(response);
}

/**
 * Send an error response.
 */
export function sendError(
    reply: FastifyReply,
    statusCode: number,
    code: PublicApiErrorCode,
    message: string,
    details?: Record<string, unknown>
): FastifyReply {
    const response: PublicApiErrorResponse = {
        error: {
            code,
            message,
            ...(details && { details })
        },
        meta: generateMeta()
    };

    return reply.status(statusCode).send(response);
}

/**
 * Send a 404 Not Found error.
 */
export function sendNotFound(reply: FastifyReply, resource: string, id?: string): FastifyReply {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;

    return sendError(reply, 404, "resource_not_found", message, { resource, id });
}

/**
 * Send a 400 Validation Error.
 */
export function sendValidationError(
    reply: FastifyReply,
    message: string,
    errors?: Array<{ field: string; message: string }>
): FastifyReply {
    return sendError(reply, 400, "validation_error", message, errors ? { errors } : undefined);
}

/**
 * Send a 500 Internal Server Error.
 */
export function sendInternalError(
    reply: FastifyReply,
    message: string = "An internal error occurred"
): FastifyReply {
    return sendError(reply, 500, "internal_error", message);
}

/**
 * Parse pagination query parameters with defaults.
 */
export function parsePaginationQuery(query: Record<string, unknown>): {
    page: number;
    per_page: number;
    offset: number;
} {
    const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1);
    const per_page = Math.min(100, Math.max(1, parseInt(String(query.per_page || "20"), 10) || 20));
    const offset = (page - 1) * per_page;

    return { page, per_page, offset };
}
