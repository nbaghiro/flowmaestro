/**
 * Mock for uuid module
 * Provides deterministic UUIDs for testing
 */

let counter = 0;

export function v4(): string {
    counter++;
    // Generate a deterministic UUID-like string
    const hex = counter.toString(16).padStart(8, "0");
    return `${hex}-0000-4000-8000-000000000000`;
}

export function v1(): string {
    return v4();
}

export function v3(): string {
    return v4();
}

export function v5(): string {
    return v4();
}

export const NIL = "00000000-0000-0000-0000-000000000000";
export const MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";

export function validate(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function version(uuid: string): number {
    return parseInt(uuid.charAt(14), 16);
}

export default { v4, v1, v3, v5, NIL, MAX, validate, version };
