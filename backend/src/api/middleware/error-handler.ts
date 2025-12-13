import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
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

export async function errorHandler(
    error: FastifyError | AppError,
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

    // Handle known app errors
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            success: false,
            error: error.message,
            details: error.details
        });
    }

    // Handle Fastify validation errors
    if (error.validation) {
        return reply.status(400).send({
            success: false,
            error: "Validation error",
            details: error.validation
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

    // Default 500 error
    return reply.status(500).send({
        success: false,
        error: config.env === "production" ? "Internal server error" : error.message
    });
}
