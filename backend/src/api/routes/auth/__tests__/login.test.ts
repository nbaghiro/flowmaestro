/**
 * Auth Login Route Tests
 *
 * Tests for user login flow including 2FA.
 */

import { FastifyInstance } from "fastify";

import {
    closeTestServer,
    createTestServer,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import { PasswordUtils } from "../../../../core/utils/password";
import { hashCode } from "../../../../core/utils/two-factor";
import {
    mockUserRepo,
    mockTwoFactorTokenRepo,
    mockTwoFactorBackupCodeRepo,
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
    TwoFactorTokenRepository: jest.fn().mockImplementation(() => mockTwoFactorTokenRepo)
}));

jest.mock("../../../../storage/repositories/TwoFactorBackupCodeRepository", () => ({
    TwoFactorBackupCodeRepository: jest.fn().mockImplementation(() => mockTwoFactorBackupCodeRepo)
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

describe("Auth Routes - Login", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
        (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);
    });

    // ========================================================================
    // LOGIN TESTS
    // ========================================================================

    describe("POST /auth/login", () => {
        it("should login with valid credentials", async () => {
            const user = createMockDbUser({
                email: "user@example.com",
                password_hash: "hashed_correct_password"
            });
            mockUserRepo.findByEmail.mockResolvedValue(user);
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "user@example.com",
                    password: "CorrectPassword123!"
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ user: { email: string }; token: string }>(
                response
            );
            expect(body.data.user.email).toBe("user@example.com");
            expect(body.data.token).toBeDefined();
        });

        it("should return 401 for wrong password", async () => {
            const user = createMockDbUser({ email: "user@example.com" });
            mockUserRepo.findByEmail.mockResolvedValue(user);
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(false);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "user@example.com",
                    password: "WrongPassword!"
                }
            });

            expectErrorResponse(response, 401);
        });

        it("should return 401 for non-existent user", async () => {
            mockUserRepo.findByEmail.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "nonexistent@example.com",
                    password: "AnyPassword123!"
                }
            });

            expectErrorResponse(response, 401);
        });

        it("should return 401 for OAuth-only user trying password login", async () => {
            const oauthUser = createMockDbUser({
                email: "oauth@example.com",
                password_hash: null,
                google_id: "google_123"
            });
            mockUserRepo.findByEmail.mockResolvedValue(oauthUser);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "oauth@example.com",
                    password: "AnyPassword123!"
                }
            });

            const { error } = expectErrorResponse(response, 401);
            expect(error).toContain("Google");
        });

        it("should require 2FA code when 2FA is enabled", async () => {
            const user = createMockDbUser({
                email: "2fa@example.com",
                two_factor_enabled: true,
                two_factor_phone: "+15551234567",
                two_factor_phone_verified: true
            });
            mockUserRepo.findByEmail.mockResolvedValue(user);
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "2fa@example.com",
                    password: "CorrectPassword123!"
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: { two_factor_required: boolean };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.two_factor_required).toBe(true);
        });

        it("should complete login with valid 2FA code", async () => {
            const user = createMockDbUser({
                email: "2fa@example.com",
                two_factor_enabled: true,
                two_factor_phone: "+15551234567",
                two_factor_phone_verified: true
            });
            mockUserRepo.findByEmail.mockResolvedValue(user);
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);

            mockTwoFactorTokenRepo.findValidCode.mockResolvedValue({
                id: "token_id",
                code_hash: "hashed_123456"
            });
            (hashCode as jest.Mock).mockReturnValue("hashed_123456");

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "2fa@example.com",
                    password: "CorrectPassword123!",
                    code: "123456"
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ user: { email: string }; token: string }>(
                response
            );
            expect(body.data.token).toBeDefined();
        });

        it("should return 401 for invalid 2FA code", async () => {
            const user = createMockDbUser({
                email: "2fa@example.com",
                two_factor_enabled: true,
                two_factor_phone: "+15551234567",
                two_factor_phone_verified: true
            });
            mockUserRepo.findByEmail.mockResolvedValue(user);
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);

            mockTwoFactorTokenRepo.findValidCode.mockResolvedValue({
                id: "token_id",
                code_hash: "hashed_correct_code"
            });
            (hashCode as jest.Mock).mockReturnValue("hashed_wrong_code");
            mockTwoFactorBackupCodeRepo.consumeCode.mockResolvedValue(false);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "2fa@example.com",
                    password: "CorrectPassword123!",
                    code: "000000"
                }
            });

            expectErrorResponse(response, 401);
        });
    });
});
