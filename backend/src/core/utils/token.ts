import { randomBytes, createHash } from "crypto";

export class TokenUtils {
    private static readonly TOKEN_LENGTH = 32; // 48 bytes = 384 bits of entropy
    private static readonly TOKEN_EXPIRY_MINUTES = 15;

    /**
     * Generate a cryptographically secure random token
     * Returns 64-character URL-safe base64 string
     */
    static generate(): string {
        return randomBytes(this.TOKEN_LENGTH).toString("hex");
    }

    /**
     * Hash a token using SHA-256
     * Returns hex string
     */
    static hash(token: string): string {
        return createHash("sha256").update(token).digest("hex");
    }

    /**
     * Verify token matches stored hash
     */
    static verify(token: string, storedHash: string): boolean {
        const tokenHash = this.hash(token);
        return tokenHash === storedHash;
    }

    /**
     * Check if token has expired
     * Uses UTC time to ensure consistency with database timezone
     */
    static isExpired(expiresAt: Date): boolean {
        const now = new Date();
        return now > expiresAt;
    }

    /**
     * Generate expiry date (15 minutes from now)
     * Uses UTC to ensure consistency with database timezone
     */
    static generateExpiryDate(): Date {
        const now = Date.now(); // Milliseconds since epoch (timezone-independent)
        const expiryTime = now + this.TOKEN_EXPIRY_MINUTES * 60 * 1000;
        return new Date(expiryTime);
    }
}
