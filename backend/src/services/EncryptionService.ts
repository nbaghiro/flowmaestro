import * as crypto from "crypto";
import { config } from "../core/config";

/**
 * EncryptionService - Handles encryption and decryption of sensitive data
 * Uses AES-256-GCM for symmetric encryption
 */
export class EncryptionService {
    private readonly algorithm = "aes-256-gcm";
    private readonly ivLength = 16; // 128 bits
    private readonly tagLength = 16;
    private readonly encryptionKey: Buffer;

    constructor() {
        const key = config.encryption.key;

        if (!key) {
            throw new Error(
                "ENCRYPTION_KEY environment variable is not set. " +
                    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
            );
        }

        // Ensure key is 32 bytes (256 bits)
        if (key.length !== 64) {
            throw new Error(
                "ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
                    `Current length: ${key.length}`
            );
        }

        this.encryptionKey = Buffer.from(key, "hex");
    }

    /**
     * Encrypt data using AES-256-GCM
     * Returns base64-encoded string: iv:tag:encrypted
     */
    encrypt(plaintext: string): string {
        try {
            // Generate random IV (initialization vector)
            const iv = crypto.randomBytes(this.ivLength);

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

            // Encrypt the data
            let encrypted = cipher.update(plaintext, "utf8", "hex");
            encrypted += cipher.final("hex");

            // Get the auth tag
            const tag = cipher.getAuthTag();

            // Combine iv:tag:encrypted and encode as base64
            const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, "hex")]);

            return combined.toString("base64");
        } catch (error) {
            throw new Error(
                `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Decrypt data encrypted with encrypt()
     * Expects base64-encoded string: iv:tag:encrypted
     */
    decrypt(encryptedData: string): string {
        try {
            // Decode from base64
            const combined = Buffer.from(encryptedData, "base64");

            // Extract components
            const iv = combined.subarray(0, this.ivLength);
            const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
            const encrypted = combined.subarray(this.ivLength + this.tagLength);

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

            // Set auth tag
            decipher.setAuthTag(tag);

            // Decrypt the data
            let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
            decrypted += decipher.final("utf8");

            return decrypted;
        } catch (error) {
            throw new Error(
                `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Encrypt an object (converts to JSON first)
     */
    encryptObject(obj: unknown): string {
        const json = JSON.stringify(obj);
        return this.encrypt(json);
    }

    /**
     * Decrypt and parse an object
     */
    decryptObject<T = unknown>(encryptedData: string): T {
        const json = this.decrypt(encryptedData);
        return JSON.parse(json) as T;
    }

    /**
     * Hash a value using SHA-256 (one-way, for comparisons)
     */
    hash(value: string): string {
        return crypto.createHash("sha256").update(value).digest("hex");
    }

    /**
     * Generate a random token (for OAuth state, etc.)
     */
    generateToken(length: number = 32): string {
        return crypto.randomBytes(length).toString("hex");
    }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
    if (!encryptionServiceInstance) {
        encryptionServiceInstance = new EncryptionService();
    }
    return encryptionServiceInstance;
}
