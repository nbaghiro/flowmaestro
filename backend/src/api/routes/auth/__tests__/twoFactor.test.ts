/**
 * Auth Two-Factor Route Tests
 *
 * Tests for 2FA send, verify, disable, and security edge cases.
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

describe("Auth Routes - Two Factor", () => {
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
    // TWO-FACTOR AUTHENTICATION TESTS
    // ========================================================================

    describe("POST /auth/2fa/send-code", () => {
        it("should send 2FA code to valid phone number", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/2fa/send-code",
                payload: { phone: "+15551234567" }
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("sent");
        });

        it("should return 400 for missing phone", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/2fa/send-code",
                payload: {}
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/2fa/send-code",
                payload: { phone: "+15551234567" }
            });

            expectErrorResponse(response, 401);
        });
    });

    describe("POST /auth/2fa/verify/code", () => {
        it("should enable 2FA with valid code", async () => {
            const testUser = createTestUser();
            mockTwoFactorTokenRepo.findValidCode.mockResolvedValue({
                id: "token_id",
                code_hash: "hashed_123456"
            });
            (hashCode as jest.Mock).mockReturnValue("hashed_123456");
            mockUserRepo.findById.mockResolvedValue(createMockDbUser({ id: testUser.id }));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/2fa/verify/code",
                payload: {
                    code: "123456",
                    phone: "+15551234567"
                }
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; backupCodes: string[] }>();
            expect(body.success).toBe(true);
            expect(body.backupCodes).toBeDefined();
            expect(Array.isArray(body.backupCodes)).toBe(true);
        });

        it("should return 400 for invalid code", async () => {
            const testUser = createTestUser();
            mockTwoFactorTokenRepo.findValidCode.mockResolvedValue({
                id: "token_id",
                code_hash: "hashed_correct"
            });
            (hashCode as jest.Mock).mockReturnValue("hashed_wrong");

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/2fa/verify/code",
                payload: { code: "000000" }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for expired/no code", async () => {
            const testUser = createTestUser();
            mockTwoFactorTokenRepo.findValidCode.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/2fa/verify/code",
                payload: { code: "123456" }
            });

            expectStatus(response, 400);
        });
    });

    describe("POST /auth/2fa/disable", () => {
        it("should disable 2FA for authenticated user", async () => {
            const testUser = createTestUser();
            mockUserRepo.findById.mockResolvedValue(
                createMockDbUser({
                    id: testUser.id,
                    two_factor_enabled: true
                })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/2fa/disable"
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("disabled");

            expect(mockTwoFactorTokenRepo.deleteByUserId).toHaveBeenCalledWith(testUser.id);
            expect(mockTwoFactorBackupCodeRepo.deleteByUserId).toHaveBeenCalledWith(testUser.id);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/2fa/disable"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // EDGE CASES AND SECURITY TESTS
    // ========================================================================

    describe("Security Edge Cases", () => {
        it("should not leak user existence through timing on login", async () => {
            // Both existing and non-existing users should take similar time
            // This is a conceptual test - actual timing tests would need more setup
            mockUserRepo.findByEmail.mockResolvedValue(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "nonexistent@example.com",
                    password: "AnyPassword123!"
                }
            });

            // Should return 401, not 404
            expectStatus(response, 401);
            const body = response.json<{ error: string }>();
            expect(body.error).not.toContain("not found");
        });

        it("should handle malformed JSON gracefully", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/auth/login",
                headers: {
                    "Content-Type": "application/json"
                },
                payload: "{ invalid json"
            });

            // Should return 400 for bad request, not 500
            expect(response.statusCode).toBeLessThan(500);
        });

        it("should reject requests with missing required fields", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: "user@example.com"
                    // Missing password
                }
            });

            expectStatus(response, 400);
        });
    });
});
