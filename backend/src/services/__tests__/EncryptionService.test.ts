/**
 * EncryptionService Tests
 *
 * Tests for AES-256-GCM encryption/decryption service (EncryptionService.ts)
 */

import * as crypto from "crypto";

// Generate a valid 32-byte (64 hex character) encryption key for testing
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");

// Mock config module before importing the service
jest.mock("../../core/config", () => ({
    config: {
        encryption: {
            key: TEST_ENCRYPTION_KEY
        }
    }
}));

import { config } from "../../core/config";
import { EncryptionService, getEncryptionService } from "../EncryptionService";

// Type for mutable encryption config in tests
interface MutableEncryptionConfig {
    key: string | undefined;
}

describe("EncryptionService", () => {
    let service: EncryptionService;

    beforeAll(() => {
        service = new EncryptionService();
    });

    describe("Constructor validation", () => {
        it("should throw error when ENCRYPTION_KEY is not set", () => {
            const originalKey = config.encryption.key;
            (config.encryption as unknown as MutableEncryptionConfig).key = undefined;

            expect(() => new EncryptionService()).toThrow(
                /ENCRYPTION_KEY environment variable is not set/
            );

            // Restore
            (config.encryption as unknown as MutableEncryptionConfig).key = originalKey;
        });

        it("should throw error when ENCRYPTION_KEY is wrong length", () => {
            const originalKey = config.encryption.key;
            (config.encryption as unknown as MutableEncryptionConfig).key = "tooshort";

            expect(() => new EncryptionService()).toThrow(
                /ENCRYPTION_KEY must be 64 hex characters/
            );

            // Restore
            (config.encryption as unknown as MutableEncryptionConfig).key = originalKey;
        });

        it("should create service with valid 64-character hex key", () => {
            expect(() => new EncryptionService()).not.toThrow();
        });
    });

    describe("encrypt/decrypt", () => {
        it("should encrypt and decrypt a simple string", () => {
            const plaintext = "Hello, World!";

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it("should encrypt and decrypt an empty string", () => {
            const plaintext = "";

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it("should encrypt and decrypt a long string", () => {
            const plaintext = "a".repeat(10000);

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it("should encrypt and decrypt special characters", () => {
            const plaintext = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?`~\\n\\t";

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it("should encrypt and decrypt unicode characters", () => {
            const plaintext =
                "Unicode: \u{1F600} \u{1F389} \u4E2D\u6587 \u0420\u0443\u0441\u0441\u043A\u0438\u0439";

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it("should produce different ciphertext for same plaintext (random IV)", () => {
            const plaintext = "Same message";

            const encrypted1 = service.encrypt(plaintext);
            const encrypted2 = service.encrypt(plaintext);

            // Different encryptions of the same message should produce different ciphertext
            expect(encrypted1).not.toBe(encrypted2);

            // But both should decrypt to the same plaintext
            expect(service.decrypt(encrypted1)).toBe(plaintext);
            expect(service.decrypt(encrypted2)).toBe(plaintext);
        });

        it("should return base64-encoded ciphertext", () => {
            const plaintext = "Test message";
            const encrypted = service.encrypt(plaintext);

            // Should be valid base64
            expect(() => Buffer.from(encrypted, "base64")).not.toThrow();

            // Should not contain non-base64 characters
            expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });
    });

    describe("Tamper detection", () => {
        it("should fail to decrypt tampered ciphertext", () => {
            const plaintext = "Sensitive data";
            const encrypted = service.encrypt(plaintext);

            // Tamper with the encrypted data
            const buffer = Buffer.from(encrypted, "base64");
            buffer[buffer.length - 1] ^= 0xff; // Flip bits in last byte
            const tampered = buffer.toString("base64");

            expect(() => service.decrypt(tampered)).toThrow(/Decryption failed/);
        });

        it("should fail to decrypt truncated ciphertext", () => {
            const plaintext = "Sensitive data";
            const encrypted = service.encrypt(plaintext);

            // Truncate the encrypted data
            const truncated = encrypted.slice(0, encrypted.length - 10);

            expect(() => service.decrypt(truncated)).toThrow(/Decryption failed/);
        });

        it("should fail to decrypt invalid base64", () => {
            expect(() => service.decrypt("not-valid-base64!!!")).toThrow(/Decryption failed/);
        });

        it("should fail to decrypt data encrypted with different key", () => {
            const differentKey = crypto.randomBytes(32).toString("hex");
            const originalKey = config.encryption.key;
            (config.encryption as unknown as MutableEncryptionConfig).key = differentKey;

            const otherService = new EncryptionService();
            const encrypted = otherService.encrypt("secret");

            // Restore original key
            (config.encryption as unknown as MutableEncryptionConfig).key = originalKey;

            // Should fail to decrypt with different key
            expect(() => service.decrypt(encrypted)).toThrow(/Decryption failed/);
        });
    });

    describe("encryptObject/decryptObject", () => {
        it("should encrypt and decrypt a simple object", () => {
            const obj = { name: "John", age: 30 };

            const encrypted = service.encryptObject(obj);
            const decrypted = service.decryptObject(encrypted);

            expect(decrypted).toEqual(obj);
        });

        it("should encrypt and decrypt a nested object", () => {
            const obj = {
                user: {
                    profile: {
                        name: "Jane",
                        settings: {
                            theme: "dark",
                            notifications: true
                        }
                    }
                },
                metadata: {
                    created: "2024-01-01",
                    version: 2
                }
            };

            const encrypted = service.encryptObject(obj);
            const decrypted = service.decryptObject(encrypted);

            expect(decrypted).toEqual(obj);
        });

        it("should encrypt and decrypt an array", () => {
            const arr = [1, 2, 3, "four", { five: 5 }];

            const encrypted = service.encryptObject(arr);
            const decrypted = service.decryptObject(encrypted);

            expect(decrypted).toEqual(arr);
        });

        it("should encrypt and decrypt null", () => {
            const encrypted = service.encryptObject(null);
            const decrypted = service.decryptObject(encrypted);

            expect(decrypted).toBeNull();
        });

        it("should encrypt and decrypt primitive values", () => {
            const testValues = [true, false, 42, 3.14, "string"];

            for (const value of testValues) {
                const encrypted = service.encryptObject(value);
                const decrypted = service.decryptObject(encrypted);
                expect(decrypted).toEqual(value);
            }
        });

        it("should preserve type information with generics", () => {
            interface User {
                id: string;
                email: string;
            }

            const user: User = { id: "123", email: "test@example.com" };
            const encrypted = service.encryptObject(user);
            const decrypted = service.decryptObject<User>(encrypted);

            expect(decrypted.id).toBe("123");
            expect(decrypted.email).toBe("test@example.com");
        });

        it("should handle object with special characters in values", () => {
            const obj = {
                html: "<script>alert('xss')</script>",
                json: '{"nested": "value"}',
                newline: "line1\nline2",
                unicode: "\u{1F600}"
            };

            const encrypted = service.encryptObject(obj);
            const decrypted = service.decryptObject(encrypted);

            expect(decrypted).toEqual(obj);
        });
    });

    describe("hash", () => {
        it("should produce consistent hash for same input", () => {
            const value = "password123";

            const hash1 = service.hash(value);
            const hash2 = service.hash(value);

            expect(hash1).toBe(hash2);
        });

        it("should produce different hash for different inputs", () => {
            const hash1 = service.hash("password1");
            const hash2 = service.hash("password2");

            expect(hash1).not.toBe(hash2);
        });

        it("should produce 64-character hex string (SHA-256)", () => {
            const hash = service.hash("test");

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]+$/);
        });

        it("should hash empty string", () => {
            const hash = service.hash("");

            // SHA-256 of empty string
            expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        });

        it("should be irreversible (one-way)", () => {
            const original = "secret";
            const hash = service.hash(original);

            // Hash should not contain the original value
            expect(hash).not.toContain(original);
            // There's no way to decrypt a hash
            expect(() => service.decrypt(hash)).toThrow();
        });
    });

    describe("generateToken", () => {
        it("should generate token with default length (32 bytes = 64 hex chars)", () => {
            const token = service.generateToken();

            expect(token).toHaveLength(64);
            expect(token).toMatch(/^[a-f0-9]+$/);
        });

        it("should generate token with custom length", () => {
            const token16 = service.generateToken(16);
            const token64 = service.generateToken(64);

            expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
            expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
        });

        it("should generate unique tokens", () => {
            const tokens = new Set<string>();

            for (let i = 0; i < 100; i++) {
                tokens.add(service.generateToken());
            }

            // All 100 tokens should be unique
            expect(tokens.size).toBe(100);
        });

        it("should generate cryptographically random tokens", () => {
            const token = service.generateToken(32);

            // Should not be all zeros or all ones
            expect(token).not.toMatch(/^0+$/);
            expect(token).not.toMatch(/^f+$/);
        });
    });
});

describe("getEncryptionService", () => {
    it("should return singleton instance", () => {
        const instance1 = getEncryptionService();
        const instance2 = getEncryptionService();

        expect(instance1).toBe(instance2);
    });

    it("should return functional EncryptionService", () => {
        const service = getEncryptionService();

        expect(service.encrypt).toBeDefined();
        expect(service.decrypt).toBeDefined();
        expect(service.hash).toBeDefined();
        expect(service.generateToken).toBeDefined();

        // Test functionality
        const encrypted = service.encrypt("test");
        expect(service.decrypt(encrypted)).toBe("test");
    });
});
