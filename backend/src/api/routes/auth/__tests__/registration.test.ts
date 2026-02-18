/**
 * Auth Registration Route Tests
 *
 * Tests for user registration flow.
 */

import { FastifyInstance } from "fastify";

import {
    closeTestServer,
    createTestServer,
    expectErrorResponse,
    expectStatus,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import { mockUserRepo, createMockDbUser, resetAllMocks } from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/EmailVerificationTokenRepository", () => ({
    EmailVerificationTokenRepository: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        findByTokenHash: jest.fn(),
        findPendingByUserId: jest.fn(),
        markAsVerified: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/PasswordResetTokenRepository", () => ({
    PasswordResetTokenRepository: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        findByTokenHash: jest.fn(),
        markAsUsed: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/TwoFactorTokenRepository", () => ({
    TwoFactorTokenRepository: jest.fn().mockImplementation(() => ({
        saveCode: jest.fn(),
        findValidCode: jest.fn(),
        consumeCode: jest.fn(),
        deleteByUserId: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/TwoFactorBackupCodeRepository", () => ({
    TwoFactorBackupCodeRepository: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        consumeCode: jest.fn(),
        deleteByUserId: jest.fn()
    }))
}));

jest.mock("../../../../core/utils/password", () => ({
    PasswordUtils: {
        hash: jest.fn().mockResolvedValue("hashed_password"),
        verify: jest.fn()
    }
}));

jest.mock("../../../../core/utils/token", () => ({
    TokenUtils: {
        generate: jest.fn().mockReturnValue("test_token_123"),
        hash: jest.fn().mockReturnValue("hashed_token"),
        generateExpiryDate: jest.fn().mockReturnValue(new Date(Date.now() + 3600000)),
        isExpired: jest.fn().mockReturnValue(false)
    }
}));

jest.mock("../../../../core/utils/two-factor", () => ({
    generateCode: jest.fn().mockReturnValue("123456"),
    hashCode: jest.fn().mockImplementation((code) => `hashed_${code}`),
    validatePhoneNumber: jest.fn().mockReturnValue(true),
    formatPhoneNumber: jest.fn().mockReturnValue("***-***-1234"),
    generateBackupCodes: jest.fn().mockReturnValue(["BACKUP-1", "BACKUP-2", "BACKUP-3"]),
    normalizeAndHashBackupCode: jest.fn().mockImplementation((code) => `hashed_backup_${code}`)
}));

jest.mock("../../../../services/email/EmailService", () => ({
    emailService: {
        sendEmailVerification: jest.fn().mockResolvedValue(undefined),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        sendPasswordChangedNotification: jest.fn().mockResolvedValue(undefined),
        sendEmailChangedNotification: jest.fn().mockResolvedValue(undefined),
        sendNameChangedNotification: jest.fn().mockResolvedValue(undefined),
        sendTwoFactorEnabledNotification: jest.fn().mockResolvedValue(undefined),
        sendTwoFactorDisabledNotification: jest.fn().mockResolvedValue(undefined)
    }
}));

jest.mock("../../../../services/TwilioService", () => ({
    sendSms: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../../core/utils/rate-limiter", () => ({
    rateLimiter: {
        isRateLimited: jest.fn().mockResolvedValue(false),
        getResetTime: jest.fn().mockResolvedValue(new Date(Date.now() + 3600000))
    }
}));

jest.mock("../../../../core/config", () => ({
    config: {
        jwt: {
            secret: "test-jwt-secret",
            expiresIn: "1h"
        },
        rateLimit: {
            passwordReset: { maxRequests: 3, windowMinutes: 60 },
            emailVerification: { maxRequests: 5, windowMinutes: 60 }
        }
    }
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Auth Routes - Registration", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // REGISTRATION TESTS
    // ========================================================================

    describe("POST /auth/register", () => {
        it("should register a new user with valid credentials", async () => {
            const newUser = createMockDbUser({
                email: "newuser@example.com",
                name: "New User"
            });
            mockUserRepo.findByEmail.mockResolvedValue(null);
            mockUserRepo.create.mockResolvedValue(newUser);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/register",
                payload: {
                    email: "newuser@example.com",
                    password: "SecurePass123!",
                    name: "New User"
                }
            });

            expectStatus(response, 201);
            const body = response.json<{
                success: boolean;
                data: { user: { email: string }; token: string };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.user.email).toBe("newuser@example.com");
            expect(body.data.token).toBeDefined();
        });

        it("should return 400 for duplicate email", async () => {
            const existingUser = createMockDbUser({
                email: "existing@example.com",
                password_hash: "existing_hash"
            });
            mockUserRepo.findByEmail.mockResolvedValue(existingUser);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/register",
                payload: {
                    email: "existing@example.com",
                    password: "SecurePass123!",
                    name: "Test User"
                }
            });

            const { error } = expectErrorResponse(response, 400);
            expect(error).toContain("already registered");
        });

        it("should link password to existing Google-only account", async () => {
            const googleUser = createMockDbUser({
                email: "google@example.com",
                password_hash: null,
                auth_provider: "google",
                google_id: "google_123"
            });
            mockUserRepo.findByEmail.mockResolvedValue(googleUser);
            mockUserRepo.update.mockResolvedValue({
                ...googleUser,
                password_hash: "hashed_password"
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/register",
                payload: {
                    email: "google@example.com",
                    password: "SecurePass123!"
                }
            });

            expectStatus(response, 201);
            const body = response.json<{
                success: boolean;
                data: { user: { has_password: boolean } };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.user.has_password).toBe(true);
        });

        it("should return 400 for invalid email format", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/register",
                payload: {
                    email: "invalid-email",
                    password: "SecurePass123!",
                    name: "Test User"
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for weak password", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/register",
                payload: {
                    email: "test@example.com",
                    password: "123",
                    name: "Test User"
                }
            });

            expectStatus(response, 400);
        });
    });
});
