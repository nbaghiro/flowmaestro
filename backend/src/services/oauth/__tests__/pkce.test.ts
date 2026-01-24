/**
 * PKCE (Proof Key for Code Exchange) Utilities Tests
 *
 * Tests for OAuth PKCE implementation (utils/pkce.ts)
 */

import { createHash } from "crypto";
import { generateCodeVerifier, generateCodeChallenge, generatePKCEPair } from "../utils/pkce";

describe("generateCodeVerifier", () => {
    it("should generate a string of correct length", () => {
        const verifier = generateCodeVerifier();

        // 64 bytes base64url encoded = 86 characters (no padding)
        expect(verifier).toHaveLength(86);
    });

    it("should generate URL-safe characters only", () => {
        const verifier = generateCodeVerifier();

        // Base64URL uses only alphanumeric, dash, and underscore
        expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should not contain standard base64 characters (+, /, =)", () => {
        // Generate multiple verifiers to increase confidence
        for (let i = 0; i < 10; i++) {
            const verifier = generateCodeVerifier();
            expect(verifier).not.toContain("+");
            expect(verifier).not.toContain("/");
            expect(verifier).not.toContain("=");
        }
    });

    it("should generate unique values", () => {
        const verifiers = new Set<string>();

        for (let i = 0; i < 100; i++) {
            verifiers.add(generateCodeVerifier());
        }

        // All 100 verifiers should be unique
        expect(verifiers.size).toBe(100);
    });

    it("should meet RFC 7636 length requirements (43-128 chars)", () => {
        const verifier = generateCodeVerifier();

        expect(verifier.length).toBeGreaterThanOrEqual(43);
        expect(verifier.length).toBeLessThanOrEqual(128);
    });
});

describe("generateCodeChallenge", () => {
    it("should generate SHA-256 hash of code verifier", () => {
        const verifier = "test-verifier-string";

        const challenge = generateCodeChallenge(verifier);

        // SHA-256 produces 32 bytes = 43 characters base64url (no padding)
        expect(challenge).toHaveLength(43);
    });

    it("should generate URL-safe characters only", () => {
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);

        expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should produce consistent results for same input", () => {
        const verifier = "consistent-verifier";

        const challenge1 = generateCodeChallenge(verifier);
        const challenge2 = generateCodeChallenge(verifier);

        expect(challenge1).toBe(challenge2);
    });

    it("should produce different results for different inputs", () => {
        const challenge1 = generateCodeChallenge("verifier1");
        const challenge2 = generateCodeChallenge("verifier2");

        expect(challenge1).not.toBe(challenge2);
    });

    it("should match manually computed SHA-256 hash", () => {
        const verifier = "test-verifier";

        // Manually compute the expected challenge
        const hash = createHash("sha256").update(verifier).digest();
        const expectedChallenge = hash
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");

        const challenge = generateCodeChallenge(verifier);

        expect(challenge).toBe(expectedChallenge);
    });

    it("should handle empty string", () => {
        const challenge = generateCodeChallenge("");

        // Should still produce a valid 43-character hash
        expect(challenge).toHaveLength(43);
        expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should handle unicode characters", () => {
        const verifier = "unicode-test-\u{1F600}-emoji";

        const challenge = generateCodeChallenge(verifier);

        expect(challenge).toHaveLength(43);
        expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });
});

describe("generatePKCEPair", () => {
    it("should return both codeVerifier and codeChallenge", () => {
        const pair = generatePKCEPair();

        expect(pair).toHaveProperty("codeVerifier");
        expect(pair).toHaveProperty("codeChallenge");
    });

    it("should generate valid code verifier", () => {
        const { codeVerifier } = generatePKCEPair();

        expect(codeVerifier).toHaveLength(86);
        expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate valid code challenge", () => {
        const { codeChallenge } = generatePKCEPair();

        expect(codeChallenge).toHaveLength(43);
        expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate matching verifier and challenge", () => {
        const { codeVerifier, codeChallenge } = generatePKCEPair();

        // Independently compute the challenge from the verifier
        const computedChallenge = generateCodeChallenge(codeVerifier);

        expect(codeChallenge).toBe(computedChallenge);
    });

    it("should generate unique pairs on each call", () => {
        const pair1 = generatePKCEPair();
        const pair2 = generatePKCEPair();

        expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
        expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });
});

describe("PKCE Security Properties", () => {
    it("should be computationally infeasible to derive verifier from challenge", () => {
        // This is a conceptual test - we can't prove cryptographic security
        // but we can verify the hash is irreversible in practice

        const { codeVerifier, codeChallenge } = generatePKCEPair();

        // The challenge should NOT contain the verifier
        expect(codeChallenge).not.toContain(codeVerifier);

        // The challenge should be much shorter than the verifier
        expect(codeChallenge.length).toBeLessThan(codeVerifier.length);
    });

    it("should have sufficient entropy in generated verifiers", () => {
        // 64 bytes = 512 bits of entropy
        // This is well above the RFC 7636 minimum of 256 bits

        const verifiers = [];
        for (let i = 0; i < 1000; i++) {
            verifiers.push(generateCodeVerifier());
        }

        // Check for no duplicates (would indicate weak RNG)
        const uniqueVerifiers = new Set(verifiers);
        expect(uniqueVerifiers.size).toBe(1000);

        // Check for no patterns (simple check - all should be different length prefixes)
        const prefixes = new Set(verifiers.map((v) => v.substring(0, 10)));
        expect(prefixes.size).toBe(1000);
    });
});
