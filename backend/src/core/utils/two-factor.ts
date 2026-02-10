import crypto from "crypto";

// Generate a cryptographically secure 6-digit code
export function generateCode(): string {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0) % 1000000;
    return num.toString().padStart(6, "0");
}

// Hash a 2FA code with SHA-256
export function hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
}

// Generate 8 backup codes in XXXX-XXXX-XXXX format
export function generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < 8; i++) {
        const buffer = crypto.randomBytes(16);
        const code = buffer
            .toString("base64")
            .replace(/[^A-Z0-9]/gi, "")
            .substring(0, 12)
            .toUpperCase();

        const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
        codes.push(formatted);
    }

    return codes;
}

export function normalizeAndHashBackupCode(code: string): string {
    const normalized = code.replace(/-/g, "").toUpperCase();
    return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function validatePhoneNumber(phone: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
}

export function formatPhoneNumber(phone: string): string {
    if (!phone || phone.length < 8) return phone;

    if (phone.startsWith("+1") && phone.length === 12) {
        const areaCode = phone.slice(2, 5);
        const lastFour = phone.slice(-4);
        return `+1 (${areaCode}) ***-${lastFour}`;
    }

    const lastFour = phone.slice(-4);
    const prefix = phone.slice(0, -4).replace(/\d/g, "*");
    return `${prefix}${lastFour}`;
}
