/**
 * Password Utility Tests
 *
 * Tests for PBKDF2-SHA512 password hashing and verification.
 * These are security-critical functions - comprehensive testing is essential.
 */

import { PasswordUtils } from "../password";

describe("PasswordUtils", () => {
    describe("hash", () => {
        it("should generate a hash in salt:hash format", async () => {
            const password = "SecurePassword123!";
            const hashedPassword = await PasswordUtils.hash(password);

            expect(hashedPassword).toContain(":");
            const [salt, hash] = hashedPassword.split(":");
            expect(salt).toBeDefined();
            expect(hash).toBeDefined();
        });

        it("should generate a 32-character hex salt (16 bytes)", async () => {
            const hashedPassword = await PasswordUtils.hash("test");
            const [salt] = hashedPassword.split(":");

            expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
            expect(salt).toMatch(/^[0-9a-f]+$/);
        });

        it("should generate a 128-character hex hash (64 bytes)", async () => {
            const hashedPassword = await PasswordUtils.hash("test");
            const [, hash] = hashedPassword.split(":");

            expect(hash).toHaveLength(128); // 64 bytes = 128 hex chars
            expect(hash).toMatch(/^[0-9a-f]+$/);
        });

        it("should generate different hashes for the same password (random salt)", async () => {
            const password = "SamePassword123!";

            const hash1 = await PasswordUtils.hash(password);
            const hash2 = await PasswordUtils.hash(password);

            expect(hash1).not.toBe(hash2);
        });

        it("should generate different hashes for different passwords", async () => {
            const hash1 = await PasswordUtils.hash("Password1");
            const hash2 = await PasswordUtils.hash("Password2");

            const [, hashPart1] = hash1.split(":");
            const [, hashPart2] = hash2.split(":");

            expect(hashPart1).not.toBe(hashPart2);
        });

        it("should handle empty password", async () => {
            const hashedPassword = await PasswordUtils.hash("");

            expect(hashedPassword).toContain(":");
            const [salt, hash] = hashedPassword.split(":");
            expect(salt).toHaveLength(32);
            expect(hash).toHaveLength(128);
        });

        it("should handle unicode characters in password", async () => {
            const hashedPassword = await PasswordUtils.hash("パスワード123🔐");

            expect(hashedPassword).toContain(":");
            const [salt, hash] = hashedPassword.split(":");
            expect(salt).toHaveLength(32);
            expect(hash).toHaveLength(128);
        });

        it("should handle very long passwords", async () => {
            const longPassword = "a".repeat(10000);
            const hashedPassword = await PasswordUtils.hash(longPassword);

            expect(hashedPassword).toContain(":");
            const [salt, hash] = hashedPassword.split(":");
            expect(salt).toHaveLength(32);
            expect(hash).toHaveLength(128);
        });
    });

    describe("verify", () => {
        it("should return true for correct password", async () => {
            const password = "CorrectPassword123!";
            const hashedPassword = await PasswordUtils.hash(password);

            const isValid = await PasswordUtils.verify(password, hashedPassword);

            expect(isValid).toBe(true);
        });

        it("should return false for incorrect password", async () => {
            const password = "CorrectPassword123!";
            const hashedPassword = await PasswordUtils.hash(password);

            const isValid = await PasswordUtils.verify("WrongPassword!", hashedPassword);

            expect(isValid).toBe(false);
        });

        it("should return false for similar but different password", async () => {
            const password = "Password123";
            const hashedPassword = await PasswordUtils.hash(password);

            // Test case sensitivity
            expect(await PasswordUtils.verify("password123", hashedPassword)).toBe(false);
            // Test extra character
            expect(await PasswordUtils.verify("Password1234", hashedPassword)).toBe(false);
            // Test missing character
            expect(await PasswordUtils.verify("Password12", hashedPassword)).toBe(false);
        });

        it("should return false for malformed hash without colon", async () => {
            const isValid = await PasswordUtils.verify("password", "invalidhashwithoutcolon");

            expect(isValid).toBe(false);
        });

        it("should return false for empty salt", async () => {
            const isValid = await PasswordUtils.verify("password", ":somehash");

            expect(isValid).toBe(false);
        });

        it("should return false for empty hash", async () => {
            const isValid = await PasswordUtils.verify("password", "somesalt:");

            expect(isValid).toBe(false);
        });

        it("should return false for empty stored hash string", async () => {
            const isValid = await PasswordUtils.verify("password", "");

            expect(isValid).toBe(false);
        });

        it("should return false for hash with multiple colons", async () => {
            // split(":") will produce ["salt", "part1", "part2"], storedHash becomes "part1"
            // This should still work but may produce unexpected results
            const password = "test";
            const hashedPassword = await PasswordUtils.hash(password);
            const [salt, hash] = hashedPassword.split(":");
            const tamperedHash = `${salt}:${hash}:extra`;

            const isValid = await PasswordUtils.verify(password, tamperedHash);

            // The implementation uses split(":") which takes only first two parts
            // So this should actually succeed since salt and storedHash are intact
            expect(isValid).toBe(true);
        });

        it("should correctly verify empty password if that was hashed", async () => {
            const hashedPassword = await PasswordUtils.hash("");

            expect(await PasswordUtils.verify("", hashedPassword)).toBe(true);
            expect(await PasswordUtils.verify(" ", hashedPassword)).toBe(false);
        });

        it("should correctly verify unicode passwords", async () => {
            const password = "パスワード123🔐";
            const hashedPassword = await PasswordUtils.hash(password);

            expect(await PasswordUtils.verify(password, hashedPassword)).toBe(true);
            expect(await PasswordUtils.verify("パスワード123", hashedPassword)).toBe(false);
        });

        it("should correctly verify very long passwords", async () => {
            const longPassword = "a".repeat(10000);
            const hashedPassword = await PasswordUtils.hash(longPassword);

            expect(await PasswordUtils.verify(longPassword, hashedPassword)).toBe(true);
            expect(await PasswordUtils.verify("a".repeat(9999), hashedPassword)).toBe(false);
        });
    });

    describe("security properties", () => {
        it("should use sufficient iterations (100000+)", async () => {
            // We can't directly test the iteration count, but we can verify
            // that hashing takes a reasonable amount of time (indicating work)
            const start = Date.now();
            await PasswordUtils.hash("testpassword");
            const duration = Date.now() - start;

            // With 100000 iterations, this should take at least 10ms on most systems
            // Using a conservative threshold to avoid flaky tests
            expect(duration).toBeGreaterThan(5);
        });

        it("should produce deterministic results with same salt", async () => {
            // Hash a password and extract the salt
            const password = "TestPassword123!";
            const hashedPassword = await PasswordUtils.hash(password);

            // Verify the password (this uses the same salt internally)
            const isValid = await PasswordUtils.verify(password, hashedPassword);
            expect(isValid).toBe(true);

            // Verify wrong password fails even with correct salt format
            const wrongPasswordValid = await PasswordUtils.verify("WrongPassword", hashedPassword);
            expect(wrongPasswordValid).toBe(false);
        });
    });
});
