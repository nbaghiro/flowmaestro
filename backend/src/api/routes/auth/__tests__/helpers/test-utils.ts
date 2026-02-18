/**
 * Auth Routes Test Utilities
 *
 * Shared mocks and helper functions for auth tests.
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCKS
// ============================================================================

export const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    updateEmailVerification: jest.fn()
};

export const mockEmailVerificationTokenRepo = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    findPendingByUserId: jest.fn(),
    markAsVerified: jest.fn()
};

export const mockPasswordResetTokenRepo = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn()
};

export const mockTwoFactorTokenRepo = {
    saveCode: jest.fn(),
    findValidCode: jest.fn(),
    consumeCode: jest.fn(),
    deleteByUserId: jest.fn()
};

export const mockTwoFactorBackupCodeRepo = {
    create: jest.fn(),
    consumeCode: jest.fn(),
    deleteByUserId: jest.fn()
};

// ============================================================================
// TEST HELPERS
// ============================================================================

export function createMockDbUser(
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

export function resetAllMocks(): void {
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
}

// ============================================================================
// MOCK SETUP HELPERS
// ============================================================================

export function setupRepositoryMocks(): void {
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
        TwoFactorBackupCodeRepository: jest
            .fn()
            .mockImplementation(() => mockTwoFactorBackupCodeRepo)
    }));
}

export function setupUtilityMocks(): void {
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
}
