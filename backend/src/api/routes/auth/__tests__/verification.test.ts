/**
 * Auth Verification Route Tests
 *
 * Tests for email verification and password reset flows.
 */

import { FastifyInstance } from "fastify";

import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import { rateLimiter } from "../../../../core/utils/rate-limiter";
import { TokenUtils } from "../../../../core/utils/token";
import {
    mockUserRepo,
    mockEmailVerificationTokenRepo,
    mockPasswordResetTokenRepo,
    createMockDbUser,
    resetAllMocks
} from "./helpers/test-utils";

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
    EmailVerificationTokenRepository: jest
        .fn()
        .mockImplementation(() => mockEmailVerificationTokenRepo)
}));

jest.mock("../../../../storage/repositories/PasswordResetTokenRepository", () => ({
    PasswordResetTokenRepository: jest.fn().mockImplementation(() => mockPasswordResetTokenRepo)
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

describe("Auth Routes - Verification", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
        (TokenUtils.isExpired as jest.Mock).mockReturnValue(false);
        (rateLimiter.isRateLimited as jest.Mock).mockResolvedValue(false);
    });

    // ========================================================================
    // EMAIL VERIFICATION TESTS
    // ========================================================================

    describe("POST /auth/verify-email", () => {
        // Token must be exactly 64 characters per schema
        const validToken = "a".repeat(64);
        const invalidToken = "b".repeat(64);
        const expiredToken = "c".repeat(64);

        it("should verify email with valid token", async () => {
            const user = createMockDbUser({ email_verified: false });
            mockEmailVerificationTokenRepo.findByTokenHash.mockResolvedValue({
                id: "token_id",
                user_id: user.id,
                email: user.email,
                expires_at: new Date(Date.now() + 3600000),
                verified_at: null
            });
            mockUserRepo.findById.mockResolvedValue(user);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/verify-email",
                payload: { token: validToken }
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            expect(body.message).toContain("verified");
        });

        it("should return 401 for invalid token", async () => {
            mockEmailVerificationTokenRepo.findByTokenHash.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/verify-email",
                payload: { token: invalidToken }
            });

            expectErrorResponse(response, 401);
        });

        it("should return 401 for expired token", async () => {
            mockEmailVerificationTokenRepo.findByTokenHash.mockResolvedValue({
                id: "token_id",
                user_id: "user_id",
                email: "test@example.com",
                expires_at: new Date(Date.now() - 3600000),
                verified_at: null
            });
            (TokenUtils.isExpired as jest.Mock).mockReturnValue(true);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/verify-email",
                payload: { token: expiredToken }
            });

            expectErrorResponse(response, 401);
        });
    });

    describe("POST /auth/resend-verification", () => {
        it("should resend verification email for unverified user", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({
                id: testUser.id,
                email_verified: false,
                auth_provider: "local"
            });
            mockUserRepo.findById.mockResolvedValue(dbUser);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/resend-verification"
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("sent");
        });

        it("should return 400 if email already verified", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({
                id: testUser.id,
                email_verified: true,
                auth_provider: "local"
            });
            mockUserRepo.findById.mockResolvedValue(dbUser);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/resend-verification"
            });

            expectStatus(response, 400);
        });

        it("should return 429 when rate limited", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({
                id: testUser.id,
                email_verified: false,
                auth_provider: "local"
            });
            mockUserRepo.findById.mockResolvedValue(dbUser);
            (rateLimiter.isRateLimited as jest.Mock).mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/resend-verification"
            });

            expectStatus(response, 429);
        });
    });

    // ========================================================================
    // PASSWORD RESET TESTS
    // ========================================================================

    describe("POST /auth/forgot-password", () => {
        it("should send reset email for existing user", async () => {
            const user = createMockDbUser({ email: "user@example.com" });
            mockUserRepo.findByEmail.mockResolvedValue(user);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/forgot-password",
                payload: { email: "user@example.com" }
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            // Anti-enumeration: same message for existing and non-existing
            expect(body.message).toContain("If an account exists");
        });

        it("should return success for non-existent email (anti-enumeration)", async () => {
            mockUserRepo.findByEmail.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/forgot-password",
                payload: { email: "nonexistent@example.com" }
            });

            // Should still return success to prevent email enumeration
            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
        });

        it("should return 429 when rate limited", async () => {
            (rateLimiter.isRateLimited as jest.Mock).mockResolvedValue(true);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/forgot-password",
                payload: { email: "user@example.com" }
            });

            expectStatus(response, 429);
        });
    });

    describe("POST /auth/reset-password", () => {
        // Token must be exactly 64 characters per schema
        const validResetToken = "d".repeat(64);
        const invalidResetToken = "e".repeat(64);
        const expiredResetToken = "f".repeat(64);
        const usedResetToken = "g".repeat(64);

        it("should reset password with valid token", async () => {
            const user = createMockDbUser();
            mockPasswordResetTokenRepo.findByTokenHash.mockResolvedValue({
                id: "token_id",
                user_id: user.id,
                expires_at: new Date(Date.now() + 3600000),
                used_at: null
            });
            mockUserRepo.findById.mockResolvedValue(user);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/reset-password",
                payload: {
                    token: validResetToken,
                    password: "NewSecurePassword123!"
                }
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            expect(body.message).toContain("reset successfully");
        });

        it("should return 401 for invalid token", async () => {
            mockPasswordResetTokenRepo.findByTokenHash.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/reset-password",
                payload: {
                    token: invalidResetToken,
                    password: "NewPassword123!"
                }
            });

            expectErrorResponse(response, 401);
        });

        it("should return 401 for expired token", async () => {
            mockPasswordResetTokenRepo.findByTokenHash.mockResolvedValue({
                id: "token_id",
                user_id: "user_id",
                expires_at: new Date(Date.now() - 3600000),
                used_at: null
            });
            (TokenUtils.isExpired as jest.Mock).mockReturnValue(true);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/reset-password",
                payload: {
                    token: expiredResetToken,
                    password: "NewPassword123!"
                }
            });

            expectErrorResponse(response, 401);
        });

        it("should return 401 for already used token", async () => {
            mockPasswordResetTokenRepo.findByTokenHash.mockResolvedValue({
                id: "token_id",
                user_id: "user_id",
                expires_at: new Date(Date.now() + 3600000),
                used_at: new Date() // Already used
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/reset-password",
                payload: {
                    token: usedResetToken,
                    password: "NewPassword123!"
                }
            });

            expectErrorResponse(response, 401);
        });
    });
});
