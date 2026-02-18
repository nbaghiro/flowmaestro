/**
 * Auth Profile Route Tests
 *
 * Tests for profile management (me routes).
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

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

import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import { PasswordUtils } from "../../../../core/utils/password";
import { mockUserRepo, createMockDbUser, resetAllMocks } from "./helpers/test-utils";

// ============================================================================
// TESTS
// ============================================================================

describe("Auth Routes - Profile", () => {
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
    // ME ROUTES TESTS
    // ========================================================================

    describe("GET /auth/me", () => {
        it("should return current user data", async () => {
            const testUser = createTestUser({ id: uuidv4(), email: "me@example.com" });
            const dbUser = createMockDbUser({
                id: testUser.id,
                email: testUser.email,
                name: "Test User"
            });
            mockUserRepo.findById.mockResolvedValue(dbUser);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/auth/me"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ user: { id: string; email: string } }>(response);
            expect(body.data.user.id).toBe(testUser.id);
            expect(body.data.user.email).toBe("me@example.com");
        });

        it("should return 401 without token", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/auth/me"
            });

            expectErrorResponse(response, 401);
        });

        it("should return 404 if user not found in database", async () => {
            const testUser = createTestUser();
            mockUserRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/auth/me"
            });

            expectStatus(response, 404);
        });
    });

    describe("POST /auth/me/name", () => {
        it("should update user name", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({ id: testUser.id });
            mockUserRepo.update.mockResolvedValue({ ...dbUser, name: "Updated Name" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/me/name",
                payload: { name: "Updated Name" }
            });

            expectStatus(response, 200);
            expect(mockUserRepo.update).toHaveBeenCalledWith(testUser.id, { name: "Updated Name" });
        });
    });

    describe("POST /auth/me/password", () => {
        it("should change password with correct current password", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({
                id: testUser.id,
                password_hash: "current_hash"
            });
            mockUserRepo.findById
                .mockResolvedValueOnce(dbUser)
                .mockResolvedValueOnce({ ...dbUser, password_hash: "new_hash" });
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/me/password",
                payload: {
                    currentPassword: "OldPassword123!",
                    newPassword: "NewPassword456!"
                }
            });

            expectStatus(response, 200);
        });

        it("should return 400 for incorrect current password", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({ id: testUser.id });
            mockUserRepo.findById.mockResolvedValue(dbUser);
            (PasswordUtils.verify as jest.Mock).mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/me/password",
                payload: {
                    currentPassword: "WrongPassword!",
                    newPassword: "NewPassword456!"
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for short new password", async () => {
            const testUser = createTestUser();
            const dbUser = createMockDbUser({ id: testUser.id });
            mockUserRepo.findById.mockResolvedValue(dbUser);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/auth/me/password",
                payload: {
                    currentPassword: "OldPassword123!",
                    newPassword: "short"
                }
            });

            expectStatus(response, 400);
        });
    });
});
