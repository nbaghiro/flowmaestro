/**
 * Normalize various file input representations into a Uint8Array.
 * Keeps Input executor trigger-agnostic.
 */
export async function normalizeFileInput(value: unknown): Promise<Uint8Array> {
    if (value instanceof Uint8Array) {
        return value;
    }

    if (Buffer.isBuffer(value)) {
        return new Uint8Array(value);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (isBase64Like(trimmed)) {
            return decodeBase64(trimmed);
        }

        return new TextEncoder().encode(trimmed);
    }

    throw new Error("Unsupported file input type");
}

function isBase64Like(value: string): boolean {
    if (value.startsWith("data:")) {
        return true;
    }

    const normalized = value.replace(/\s+/g, "");
    return (
        normalized.length > 100 &&
        normalized.length % 4 === 0 &&
        /^[A-Za-z0-9+/=]+$/.test(normalized)
    );
}

function decodeBase64(value: string): Uint8Array {
    const normalized = value.startsWith("data:")
        ? value.substring(value.indexOf(",") + 1)
        : value.replace(/\s+/g, "");

    return Uint8Array.from(Buffer.from(normalized, "base64"));
}
