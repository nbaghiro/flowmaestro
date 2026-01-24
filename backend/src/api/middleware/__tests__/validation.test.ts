/**
 * Validation Middleware Tests
 *
 * Tests for Zod-based request validation middleware (validation.ts)
 */

import { z } from "zod";
import {
    createMockRequest,
    assertThrowsError
} from "../../../../__tests__/helpers/middleware-test-utils";
import { validateRequest, validateQuery, validateParams, validateBody } from "../validation";

interface ValidationErrorDetails {
    path: string;
    message: string;
    code: string;
}

interface ValidationError extends Error {
    name: string;
    details: ValidationErrorDetails[];
}

describe("validateRequest / validateBody", () => {
    const userSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0).optional()
    });

    it("should validate and parse valid request body", async () => {
        const middleware = validateRequest(userSchema);
        const request = createMockRequest({
            body: { name: "John Doe", email: "john@example.com", age: 30 }
        });

        await middleware(request);

        expect(request.body).toEqual({
            name: "John Doe",
            email: "john@example.com",
            age: 30
        });
    });

    it("should strip extra fields from request body", async () => {
        const strictSchema = z
            .object({
                name: z.string()
            })
            .strict();

        const middleware = validateRequest(strictSchema);
        const request = createMockRequest({
            body: { name: "John", extra: "field" }
        });

        await assertThrowsError(() => middleware(request), "ValidationError");
    });

    it("should throw ValidationError for invalid body", async () => {
        const middleware = validateRequest(userSchema);
        const request = createMockRequest({
            body: { name: "", email: "invalid-email" }
        });

        await assertThrowsError(() => middleware(request), "ValidationError", /Validation failed/);
    });

    it("should include all validation errors in details", async () => {
        const middleware = validateRequest(userSchema);
        const request = createMockRequest({
            body: { name: "", email: "invalid", age: -5 }
        });

        try {
            await middleware(request);
            fail("Should have thrown");
        } catch (error) {
            const validationError = error as ValidationError;
            expect(validationError.name).toBe("ValidationError");
            expect(validationError.details).toBeInstanceOf(Array);
            expect(validationError.details.length).toBeGreaterThan(0);

            // Check structure of error details
            const firstError = validationError.details[0];
            expect(firstError).toHaveProperty("path");
            expect(firstError).toHaveProperty("message");
            expect(firstError).toHaveProperty("code");
        }
    });

    it("should format nested path in errors", async () => {
        const nestedSchema = z.object({
            user: z.object({
                profile: z.object({
                    email: z.string().email()
                })
            })
        });

        const middleware = validateRequest(nestedSchema);
        const request = createMockRequest({
            body: { user: { profile: { email: "invalid" } } }
        });

        try {
            await middleware(request);
            fail("Should have thrown");
        } catch (error) {
            const validationError = error as ValidationError;
            const emailError = validationError.details.find((e) => e.path.includes("email"));
            expect(emailError?.path).toBe("user.profile.email");
        }
    });

    it("should re-throw non-Zod errors", async () => {
        const badSchema = {
            parse: () => {
                throw new Error("Custom error");
            }
        } as unknown as z.ZodSchema;

        const middleware = validateRequest(badSchema);
        const request = createMockRequest({ body: {} });

        await expect(middleware(request)).rejects.toThrow("Custom error");
    });

    it("should validate empty body when schema allows it", async () => {
        const optionalSchema = z
            .object({
                name: z.string().optional()
            })
            .optional();

        const middleware = validateRequest(optionalSchema);
        const request = createMockRequest({ body: undefined });

        await middleware(request);
        // Should not throw
    });

    it("validateBody should be an alias for validateRequest", () => {
        expect(validateBody).toBe(validateRequest);
    });
});

describe("validateQuery", () => {
    const querySchema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10),
        search: z.string().optional()
    });

    it("should validate and parse valid query parameters", async () => {
        const middleware = validateQuery(querySchema);
        const request = createMockRequest({
            query: { page: "2", limit: "25", search: "test" }
        });

        await middleware(request);

        expect(request.query).toEqual({
            page: 2,
            limit: 25,
            search: "test"
        });
    });

    it("should apply default values for missing optional params", async () => {
        const middleware = validateQuery(querySchema);
        const request = createMockRequest({
            query: {}
        });

        await middleware(request);

        expect(request.query).toEqual({
            page: 1,
            limit: 10
        });
    });

    it("should throw ValidationError for invalid query params", async () => {
        const middleware = validateQuery(querySchema);
        const request = createMockRequest({
            query: { page: "-1", limit: "200" }
        });

        await assertThrowsError(
            () => middleware(request),
            "ValidationError",
            /Query validation failed/
        );
    });

    it("should coerce string query values to numbers", async () => {
        const middleware = validateQuery(querySchema);
        const request = createMockRequest({
            query: { page: "10", limit: "50" }
        });

        await middleware(request);

        const parsedQuery = request.query as { page: number; limit: number };
        expect(typeof parsedQuery.page).toBe("number");
        expect(typeof parsedQuery.limit).toBe("number");
    });
});

describe("validateParams", () => {
    const paramsSchema = z.object({
        id: z.string().uuid(),
        workspaceId: z.string().uuid()
    });

    it("should validate and parse valid route params", async () => {
        const middleware = validateParams(paramsSchema);
        const validId = "550e8400-e29b-41d4-a716-446655440000";
        const validWorkspaceId = "660e8400-e29b-41d4-a716-446655440001";

        const request = createMockRequest({
            params: { id: validId, workspaceId: validWorkspaceId }
        });

        await middleware(request);

        expect(request.params).toEqual({
            id: validId,
            workspaceId: validWorkspaceId
        });
    });

    it("should throw ValidationError for invalid UUID", async () => {
        const middleware = validateParams(paramsSchema);
        const request = createMockRequest({
            params: { id: "not-a-uuid", workspaceId: "also-not-a-uuid" }
        });

        await assertThrowsError(
            () => middleware(request),
            "ValidationError",
            /Params validation failed/
        );
    });

    it("should throw ValidationError for missing required param", async () => {
        const middleware = validateParams(paramsSchema);
        const request = createMockRequest({
            params: { id: "550e8400-e29b-41d4-a716-446655440000" }
        });

        await assertThrowsError(
            () => middleware(request),
            "ValidationError",
            /Params validation failed/
        );
    });
});

describe("Error details format", () => {
    it("should include Zod error code in details", async () => {
        const schema = z.object({
            email: z.string().email()
        });

        const middleware = validateRequest(schema);
        const request = createMockRequest({
            body: { email: "not-an-email" }
        });

        try {
            await middleware(request);
            fail("Should have thrown");
        } catch (error) {
            const validationError = error as ValidationError;
            expect(validationError.details[0].code).toBe("invalid_string");
        }
    });

    it("should handle array validation errors", async () => {
        const schema = z.object({
            items: z.array(z.number())
        });

        const middleware = validateRequest(schema);
        const request = createMockRequest({
            body: { items: [1, "not a number", 3] }
        });

        try {
            await middleware(request);
            fail("Should have thrown");
        } catch (error) {
            const validationError = error as ValidationError;
            const arrayError = validationError.details.find((e) => e.path.includes("items"));
            expect(arrayError?.path).toBe("items.1");
        }
    });
});
