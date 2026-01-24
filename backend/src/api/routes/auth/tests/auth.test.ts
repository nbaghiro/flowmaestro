/**
 * Auth Routes Integration Tests
 *
 * Tests for authentication endpoints including:
 * - Registration and Login
 * - Email Verification
 * - Password Reset
 * - Two-Factor Authentication
 * - Profile Management (me routes)
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock repositories
const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    updateEmailVerification: jest.fn()
};

const mockEmailVerificationTokenRepo = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    findPendingByUserId: jest.fn(),
    markAsVerified: jest.fn()
};

const mockPasswordResetTokenRepo = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn()
};

const mockTwoFactorTokenRepo = {
    saveCode: jest.fn(),
    findValidCode: jest.fn(),
    consumeCode: jest.fn(),
    deleteByUserId: jest.fn()
};

const mockTwoFactorBackupCodeRepo = {
    create: jest.fn(),
    consumeCode: jest.fn(),
    deleteByUserId: jest.fn()
};

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
    TwoFactorTokenRepository: jest.fn().mockImplementation(() => mockTwoFactorTokenRepo)
}));

jest.mock("../../../../storage/repositories/TwoFactorBackupCodeRepository", () => ({
    TwoFactorBackupCodeRepository: jest.fn().mockImplementation(() => mockTwoFactorBackupCodeRepo)
}));

// Mock password utilities
jest.mock("../../../../core/utils/password", () => ({
    PasswordUtils: {
        hash: jest.fn().mockResolvedValue("hashed_password"),
        verify: jest.fn()
    }
}));

// Mock token utilities
jest.mock("../../../../core/utils/token", () => ({
    TokenUtils: {
        generate: jest.fn().mockReturnValue("test_token_123"),
        hash: jest.fn().mockReturnValue("hashed_token"),
        generateExpiryDate: jest.fn().mockReturnValue(new Date(Date.now() + 3600000)),
        isExpired: jest.fn().mockReturnValue(false)
    }
}));

// Mock two-factor utilities
jest.mock("../../../../core/utils/two-factor", () => ({
    generateCode: jest.fn().mockReturnValue("123456"),
    hashCode: jest.fn().mockImplementation((code) => `hashed_${code}`),
    validatePhoneNumber: jest.fn().mockReturnValue(true),
    formatPhoneNumber: jest.fn().mockReturnValue("***-***-1234"),
    generateBackupCodes: jest.fn().mockReturnValue(["BACKUP-1", "BACKUP-2", "BACKUP-3"]),
    normalizeAndHashBackupCode: jest.fn().mockImplementation((code) => `hashed_backup_${code}`)
}));

// Mock email service
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

// Mock Twilio SMS service
jest.mock("../../../../services/TwilioService", () => ({
    sendSms: jest.fn().mockResolvedValue(undefined)
}));

// Mock rate limiter
jest.mock("../../../../core/utils/rate-limiter", () => ({
    rateLimiter: {
        isRateLimited: jest.fn().mockResolvedValue(false),
        getResetTime: jest.fn().mockResolvedValue(new Date(Date.now() + 3600000))
    }
}));

// Mock config
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

// Import mocked utilities after mocking
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../../../../tests/helpers/fastify-test-client";
import { PasswordUtils } from "../../../../core/utils/password";
import { rateLimiter } from "../../../../core/utils/rate-limiter";
import { TokenUtils } from "../../../../core/utils/token";
import { hashCode } from "../../../../core/utils/two-factor";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockDbUser(
    overrides: Partial<{
        id: string;
        email: string;
        name: string;
        password_hash: string | null;
        email_verified: boolean;
        auth_provider: string;
        google_id: string | null;
        microsoft_id: string | null;
        two_factor_enabled: boolean;
        two_factor_phone: string | null;
        two_factor_phone_verified: boolean;
        avatar_url: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || "user@example.com",
        name: overrides.name || "Test User",
        password_hash: "password_hash" in overrides ? overrides.password_hash : "hashed_password",
        email_verified: overrides.email_verified ?? false,
        auth_provider: overrides.auth_provider || "local",
        google_id: "google_id" in overrides ? overrides.google_id : null,
        microsoft_id: "microsoft_id" in overrides ? overrides.microsoft_id : null,
        two_factor_enabled: overrides.two_factor_enabled ?? false,
        two_factor_phone: "two_factor_phone" in overrides ? overrides.two_factor_phone : null,
        two_factor_phone_verified: overrides.two_factor_phone_verified ?? false,
        avatar_url: "avatar_url" in overrides ? overrides.avatar_url : null,
        created_at: new Date(),
        updated_at: new Date()
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset default behaviors
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.findById.mockResolvedValue(null);
    mockUserRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockDbUser({ ...data, id: uuidv4() }))
    );
    mockUserRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockDbUser({ id, ...data }))
    );

    (PasswordUtils.verify as jest.Mock).mockResolvedValue(true);
    (TokenUtils.isExpired as jest.Mock).mockReturnValue(false);
    // Reset rate limiter to not rate limited (important - clearAllMocks doesn't reset implementations)
    (rateLimiter.isRateLimited as jest.Mock).mockResolvedValue(false);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Auth Routes", () => {
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
