/**
 * Mock for nanoid module
 * Provides deterministic IDs for testing
 */

let counter = 0;

export function nanoid(): string {
    return `test-id-${++counter}-${Date.now()}`;
}

export function customAlphabet(): () => string {
    return () => `custom-id-${++counter}`;
}
