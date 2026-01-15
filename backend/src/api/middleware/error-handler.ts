import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JsonValue } from "@flowmaestro/shared";
import { config } from "../../core/config";

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public details?: JsonValue
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: JsonValue) {
        super(400, message, details);
        this.name = "ValidationError";
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(404, message);
        this.name = "NotFoundError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized") {
        super(401, message);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "Forbidden") {
        super(403, message);
        this.name = "ForbiddenError";
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = "Bad Request") {
        super(400, message);
        this.name = "BadRequestError";
    }
}

export class InsufficientCreditsError extends AppError {
    public required: number;
    public available: number;

    constructor(required: number, available: number) {
        super(402, `Insufficient credits: required ${required}, available ${available}`, {
            required,
            available,
            shortfall: required - available
        });
        this.name = "InsufficientCreditsError";
        this.required = required;
        this.available = available;
    }
}

export async function errorHandler(
    error: FastifyError | AppError | Error,
    request: FastifyRequest,
    reply: FastifyReply
) {
    // Log error
    request.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method
    });

    // Handle Zod validation errors first (use duck typing for compatibility)
    if (error.name === "ZodError" && "issues" in error) {
        const zodError = error as ZodError;
        return reply.status(400).send({
            success: false,
            error: "Validation error",
            details: zodError.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message
            }))
        });
    }

    // Handle known app errors
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            success: false,
            error: error.message,
            details: error.details
        });
    }

    // Handle Fastify validation errors
    if ((error as FastifyError).validation) {
        return reply.status(400).send({
            success: false,
            error: "Validation error",
            details: (error as FastifyError).validation
        });
    }

    // Handle JWT errors
    if (error.message === "No Authorization was found in request.headers") {
        return reply.status(401).send({
            success: false,
            error: "Missing authorization token"
        });
    }

    if (error.message.includes("Authorization token")) {
        return reply.status(401).send({
            success: false,
            error: "Invalid authorization token"
        });
    }

    // Check for pre-set statusCode (e.g., from content type parsers)
    const errorWithStatus = error as Error & { statusCode?: number };
    const statusCode = errorWithStatus.statusCode || 500;

    // Default error response
    return reply.status(statusCode).send({
        success: false,
        error: config.env === "production" ? "Internal server error" : error.message
    });
}
