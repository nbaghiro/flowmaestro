/**
 * Two-Factor Authentication Utility Tests
 *
 * Tests for 2FA code generation, backup codes, and phone number validation.
 * These are security-critical functions - comprehensive testing is essential.
 */

import {
    generateCode,
    hashCode,
    generateBackupCodes,
    normalizeAndHashBackupCode,
    validatePhoneNumber,
    formatPhoneNumber
} from "../two-factor";

describe("Two-Factor Authentication Utils", () => {
    describe("generateCode", () => {
        it("should generate a 6-digit string", () => {
            const code = generateCode();

            expect(code).toHaveLength(6);
            expect(code).toMatch(/^\d{6}$/);
        });

        it("should pad with leading zeros when necessary", () => {
            // Generate many codes to statistically hit low numbers
            const codes: string[] = [];
            for (let i = 0; i < 1000; i++) {
                codes.push(generateCode());
            }

            // All codes should be exactly 6 characters
            codes.forEach((code) => {
                expect(code).toHaveLength(6);
            });

            // At least some codes should start with 0 (statistically likely with 1000 samples)
            const codesStartingWithZero = codes.filter((c) => c.startsWith("0"));
            expect(codesStartingWithZero.length).toBeGreaterThan(0);
        });

        it("should generate different codes on subsequent calls", () => {
            const codes = new Set<string>();
            for (let i = 0; i < 100; i++) {
                codes.add(generateCode());
            }

            // With cryptographic randomness, we should have many unique codes
            // Allow for some collisions but expect at least 90% unique
            expect(codes.size).toBeGreaterThan(90);
        });

        it("should generate codes within valid range (000000-999999)", () => {
            for (let i = 0; i < 100; i++) {
                const code = generateCode();
                const num = parseInt(code, 10);

                expect(num).toBeGreaterThanOrEqual(0);
                expect(num).toBeLessThanOrEqual(999999);
            }
        });
    });

    describe("hashCode", () => {
        it("should return a 64-character hex string (SHA-256)", () => {
            const hash = hashCode("123456");

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });

        it("should produce consistent hash for same input", () => {
            const code = "123456";

            const hash1 = hashCode(code);
            const hash2 = hashCode(code);

            expect(hash1).toBe(hash2);
        });

        it("should produce different hashes for different inputs", () => {
            const hash1 = hashCode("123456");
            const hash2 = hashCode("123457");

            expect(hash1).not.toBe(hash2);
        });

        it("should handle empty string", () => {
            const hash = hashCode("");

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });

        it("should be case-sensitive", () => {
            const hashLower = hashCode("abcdef");
            const hashUpper = hashCode("ABCDEF");

            expect(hashLower).not.toBe(hashUpper);
        });
    });

    describe("generateBackupCodes", () => {
        it("should generate exactly 8 backup codes", () => {
            const codes = generateBackupCodes();

            expect(codes).toHaveLength(8);
        });

        it("should generate codes in XXXX-XXXX-XXX(X) format with dashes", () => {
            const codes = generateBackupCodes();

            codes.forEach((code) => {
                // Format should have two dashes separating three groups
                expect(code.split("-")).toHaveLength(3);
                // Should only contain uppercase alphanumeric and dashes
                expect(code).toMatch(/^[A-Z0-9-]+$/);
            });
        });

        it("should generate uppercase alphanumeric characters only", () => {
            const codes = generateBackupCodes();

            codes.forEach((code) => {
                const withoutDashes = code.replace(/-/g, "");
                expect(withoutDashes).toMatch(/^[A-Z0-9]+$/);
            });
        });

        it("should generate unique codes within a set", () => {
            const codes = generateBackupCodes();
            const uniqueCodes = new Set(codes);

            expect(uniqueCodes.size).toBe(8);
        });

        it("should generate different code sets on each call", () => {
            const codes1 = generateBackupCodes();
            const codes2 = generateBackupCodes();

            // Very unlikely to have any overlap
            const set1 = new Set(codes1);
            const overlap = codes2.filter((code) => set1.has(code));

            expect(overlap.length).toBe(0);
        });

        it("should generate codes with 10-12 alphanumeric characters", () => {
            // Note: The implementation uses base64 encoding and filters non-alphanumeric chars,
            // which can occasionally produce slightly shorter codes (10-12 chars)
            const codes = generateBackupCodes();

            codes.forEach((code) => {
                const withoutDashes = code.replace(/-/g, "");
                expect(withoutDashes.length).toBeGreaterThanOrEqual(10);
                expect(withoutDashes.length).toBeLessThanOrEqual(12);
            });
        });
    });

    describe("normalizeAndHashBackupCode", () => {
        it("should remove dashes before hashing", () => {
            const codeWithDashes = "ABCD-EFGH-IJKL";
            const codeWithoutDashes = "ABCDEFGHIJKL";

            const hash1 = normalizeAndHashBackupCode(codeWithDashes);
            const hash2 = normalizeAndHashBackupCode(codeWithoutDashes);

            expect(hash1).toBe(hash2);
        });

        it("should convert to uppercase before hashing", () => {
            const codeLower = "abcd-efgh-ijkl";
            const codeUpper = "ABCD-EFGH-IJKL";

            const hash1 = normalizeAndHashBackupCode(codeLower);
            const hash2 = normalizeAndHashBackupCode(codeUpper);

            expect(hash1).toBe(hash2);
        });

        it("should return a 64-character hex string (SHA-256)", () => {
            const hash = normalizeAndHashBackupCode("ABCD-EFGH-IJKL");

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });

        it("should produce consistent hash for normalized equivalent inputs", () => {
            const variations = [
                "ABCD-EFGH-IJKL",
                "abcd-efgh-ijkl",
                "AbCd-EfGh-IjKl",
                "ABCDEFGHIJKL",
                "abcdefghijkl"
            ];

            const hashes = variations.map((v) => normalizeAndHashBackupCode(v));
            const uniqueHashes = new Set(hashes);

            expect(uniqueHashes.size).toBe(1);
        });

        it("should work with generated backup codes", () => {
            const codes = generateBackupCodes();

            codes.forEach((code) => {
                const hash = normalizeAndHashBackupCode(code);
                expect(hash).toHaveLength(64);
                expect(hash).toMatch(/^[0-9a-f]{64}$/);
            });
        });
    });

    describe("validatePhoneNumber", () => {
        describe("valid E.164 phone numbers", () => {
            it("should accept US phone numbers", () => {
                expect(validatePhoneNumber("+14155551234")).toBe(true);
                expect(validatePhoneNumber("+12025551234")).toBe(true);
            });

            it("should accept UK phone numbers", () => {
                expect(validatePhoneNumber("+447911123456")).toBe(true);
                expect(validatePhoneNumber("+442071234567")).toBe(true);
            });

            it("should accept international phone numbers", () => {
                expect(validatePhoneNumber("+81312345678")).toBe(true); // Japan
                expect(validatePhoneNumber("+4930123456789")).toBe(true); // Germany
                expect(validatePhoneNumber("+33123456789")).toBe(true); // France
                expect(validatePhoneNumber("+861012345678")).toBe(true); // China
            });

            it("should accept minimum length phone numbers", () => {
                expect(validatePhoneNumber("+11")).toBe(true); // Minimum valid
            });

            it("should accept maximum length phone numbers (15 digits)", () => {
                expect(validatePhoneNumber("+123456789012345")).toBe(true);
            });
        });

        describe("invalid phone numbers", () => {
            it("should reject numbers without + prefix", () => {
                expect(validatePhoneNumber("14155551234")).toBe(false);
                expect(validatePhoneNumber("4155551234")).toBe(false);
            });

            it("should reject numbers starting with +0", () => {
                expect(validatePhoneNumber("+0123456789")).toBe(false);
            });

            it("should reject numbers with only +", () => {
                expect(validatePhoneNumber("+")).toBe(false);
            });

            it("should reject empty string", () => {
                expect(validatePhoneNumber("")).toBe(false);
            });

            it("should reject numbers with spaces", () => {
                expect(validatePhoneNumber("+1 415 555 1234")).toBe(false);
            });

            it("should reject numbers with dashes", () => {
                expect(validatePhoneNumber("+1-415-555-1234")).toBe(false);
            });

            it("should reject numbers with parentheses", () => {
                expect(validatePhoneNumber("+1(415)5551234")).toBe(false);
            });

            it("should reject numbers exceeding 15 digits", () => {
                expect(validatePhoneNumber("+1234567890123456")).toBe(false);
            });

            it("should reject numbers with letters", () => {
                expect(validatePhoneNumber("+1415555ABCD")).toBe(false);
            });
        });
    });

    describe("formatPhoneNumber", () => {
        describe("US phone numbers (+1)", () => {
            it("should format US numbers with masked middle digits", () => {
                const formatted = formatPhoneNumber("+14155551234");

                expect(formatted).toBe("+1 (415) ***-1234");
            });

            it("should show area code and last 4 digits", () => {
                const formatted = formatPhoneNumber("+12025559876");

                expect(formatted).toContain("202"); // Area code visible
                expect(formatted).toContain("9876"); // Last 4 visible
                expect(formatted).toContain("***"); // Middle masked
            });
        });

        describe("international phone numbers", () => {
            it("should mask all but last 4 digits for non-US numbers", () => {
                const formatted = formatPhoneNumber("+447911123456");

                expect(formatted).toContain("3456"); // Last 4 visible
                expect(formatted).toMatch(/^\+\*+3456$/);
            });

            it("should preserve + prefix", () => {
                const formatted = formatPhoneNumber("+33123456789");

                expect(formatted.startsWith("+")).toBe(true);
            });

            it("should mask country code digits", () => {
                const formatted = formatPhoneNumber("+81312345678");

                // Should show ***...5678
                expect(formatted).toContain("5678");
                expect(formatted).not.toContain("81"); // Country code masked
            });
        });

        describe("edge cases", () => {
            it("should return original for very short numbers (< 8 chars total)", () => {
                // Numbers with total length < 8 are returned as-is
                expect(formatPhoneNumber("+12345")).toBe("+12345");
                expect(formatPhoneNumber("+123456")).toBe("+123456");
                expect(formatPhoneNumber("+1")).toBe("+1");
            });

            it("should format numbers with 8+ characters", () => {
                // Numbers with length >= 8 get formatted (last 4 visible, rest masked)
                const formatted = formatPhoneNumber("+1234567");
                expect(formatted).toBe("+***4567");
            });

            it("should return empty/null/undefined as-is", () => {
                expect(formatPhoneNumber("")).toBe("");
                expect(formatPhoneNumber(null as unknown as string)).toBe(null);
                expect(formatPhoneNumber(undefined as unknown as string)).toBe(undefined);
            });

            it("should format 8-character numbers by masking prefix", () => {
                const formatted = formatPhoneNumber("+1234567"); // 8 chars total
                // Implementation masks everything except last 4 digits
                expect(formatted).toBe("+***4567");
            });
        });
    });

    describe("integration: code generation and verification flow", () => {
        it("should allow verifying a generated code via hash comparison", () => {
            const code = generateCode();
            const hashedCode = hashCode(code);

            // Simulate verification by re-hashing and comparing
            const userInputCode = code; // User enters the same code
            const userInputHash = hashCode(userInputCode);

            expect(userInputHash).toBe(hashedCode);
        });

        it("should reject wrong code via hash comparison", () => {
            const code = generateCode();
            const hashedCode = hashCode(code);

            // User enters wrong code
            const wrongCode = code === "000000" ? "000001" : "000000";
            const wrongHash = hashCode(wrongCode);

            expect(wrongHash).not.toBe(hashedCode);
        });

        it("should allow verifying backup code with normalization", () => {
            const codes = generateBackupCodes();
            const firstCode = codes[0];
            const storedHash = normalizeAndHashBackupCode(firstCode);

            // User enters code in lowercase without dashes
            const userInput = firstCode.replace(/-/g, "").toLowerCase();
            const userInputHash = normalizeAndHashBackupCode(userInput);

            expect(userInputHash).toBe(storedHash);
        });
    });
});
