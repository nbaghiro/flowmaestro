import { describe, it, expect } from "vitest";
import { sanitizeLogData } from "../logger";

describe("sanitizeLogData (PII Redaction)", () => {
    describe("password variants", () => {
        it("should redact 'password' field", () => {
            const data = { password: "secret123", username: "john" };
            const result = sanitizeLogData(data);

            expect(result.password).toBe("[REDACTED]");
            expect(result.username).toBe("john");
        });

        it("should redact 'Password' field (case-insensitive)", () => {
            const data = { Password: "secret123" };
            const result = sanitizeLogData(data);

            expect(result.Password).toBe("[REDACTED]");
        });
    });

    describe("token variants", () => {
        it("should redact 'token' field", () => {
            const data = { token: "abc123" };
            const result = sanitizeLogData(data);

            expect(result.token).toBe("[REDACTED]");
        });

        it("should redact 'accessToken' field", () => {
            const data = { accessToken: "abc123" };
            const result = sanitizeLogData(data);

            expect(result.accessToken).toBe("[REDACTED]");
        });

        it("should redact 'access_token' field", () => {
            const data = { access_token: "abc123" };
            const result = sanitizeLogData(data);

            expect(result.access_token).toBe("[REDACTED]");
        });

        it("should redact 'refreshToken' field", () => {
            const data = { refreshToken: "xyz789" };
            const result = sanitizeLogData(data);

            expect(result.refreshToken).toBe("[REDACTED]");
        });

        it("should redact 'refresh_token' field", () => {
            const data = { refresh_token: "xyz789" };
            const result = sanitizeLogData(data);

            expect(result.refresh_token).toBe("[REDACTED]");
        });
    });

    describe("API key variants", () => {
        it("should redact 'apiKey' field", () => {
            const data = { apiKey: "sk-123456" };
            const result = sanitizeLogData(data);

            expect(result.apiKey).toBe("[REDACTED]");
        });

        it("should redact 'api_key' field", () => {
            const data = { api_key: "sk-123456" };
            const result = sanitizeLogData(data);

            expect(result.api_key).toBe("[REDACTED]");
        });

        it("should redact 'apikey' field (lowercase)", () => {
            const data = { apikey: "sk-123456" };
            const result = sanitizeLogData(data);

            expect(result.apikey).toBe("[REDACTED]");
        });
    });

    describe("secret variants", () => {
        it("should redact 'secret' field", () => {
            const data = { secret: "topsecret" };
            const result = sanitizeLogData(data);

            expect(result.secret).toBe("[REDACTED]");
        });

        it("should redact 'clientSecret' field", () => {
            const data = { clientSecret: "client-secret-value" };
            const result = sanitizeLogData(data);

            expect(result.clientSecret).toBe("[REDACTED]");
        });

        it("should redact 'client_secret' field", () => {
            const data = { client_secret: "client-secret-value" };
            const result = sanitizeLogData(data);

            expect(result.client_secret).toBe("[REDACTED]");
        });
    });

    describe("other sensitive fields", () => {
        it("should redact 'authorization' field", () => {
            const data = { authorization: "Bearer xyz" };
            const result = sanitizeLogData(data);

            expect(result.authorization).toBe("[REDACTED]");
        });

        it("should redact 'cookie' field", () => {
            const data = { cookie: "session=abc123" };
            const result = sanitizeLogData(data);

            expect(result.cookie).toBe("[REDACTED]");
        });

        it("should redact 'creditCard' field", () => {
            const data = { creditCard: "4111111111111111" };
            const result = sanitizeLogData(data);

            expect(result.creditCard).toBe("[REDACTED]");
        });

        it("should redact 'ssn' field", () => {
            const data = { ssn: "123-45-6789" };
            const result = sanitizeLogData(data);

            expect(result.ssn).toBe("[REDACTED]");
        });
    });

    describe("nested objects", () => {
        it("should redact sensitive fields in nested objects", () => {
            const data = {
                user: {
                    name: "John",
                    password: "secret123",
                    profile: {
                        email: "john@example.com",
                        apiKey: "sk-123"
                    }
                }
            };

            const result = sanitizeLogData(data);

            expect(result.user.name).toBe("John");
            expect(result.user.password).toBe("[REDACTED]");
            expect(result.user.profile.email).toBe("john@example.com");
            expect(result.user.profile.apiKey).toBe("[REDACTED]");
        });

        it("should handle deeply nested structures", () => {
            const data = {
                l1: {
                    l2: {
                        l3: {
                            l4: {
                                password: "deep-secret"
                            }
                        }
                    }
                }
            };

            const result = sanitizeLogData(data);

            expect(result.l1.l2.l3.l4.password).toBe("[REDACTED]");
        });
    });

    describe("arrays", () => {
        it("should redact sensitive fields in arrays of objects", () => {
            const data = {
                users: [
                    { name: "Alice", password: "alice123" },
                    { name: "Bob", password: "bob456" }
                ]
            };

            const result = sanitizeLogData(data);

            expect(result.users[0].name).toBe("Alice");
            expect(result.users[0].password).toBe("[REDACTED]");
            expect(result.users[1].name).toBe("Bob");
            expect(result.users[1].password).toBe("[REDACTED]");
        });

        it("should handle arrays of primitives", () => {
            const data = { items: [1, 2, 3] };
            const result = sanitizeLogData(data);

            expect(result.items).toEqual([1, 2, 3]);
        });
    });

    describe("edge cases", () => {
        it("should preserve non-sensitive fields", () => {
            const data = {
                id: "123",
                email: "user@example.com",
                name: "John Doe",
                timestamp: "2024-01-01T00:00:00Z"
            };

            const result = sanitizeLogData(data);

            expect(result).toEqual(data);
        });

        it("should handle null values", () => {
            const result = sanitizeLogData(null);
            expect(result).toBeNull();
        });

        it("should handle undefined values", () => {
            const result = sanitizeLogData(undefined);
            expect(result).toBeUndefined();
        });

        it("should handle primitives", () => {
            expect(sanitizeLogData("string")).toBe("string");
            expect(sanitizeLogData(42)).toBe(42);
            expect(sanitizeLogData(true)).toBe(true);
        });

        it("should handle empty object", () => {
            const result = sanitizeLogData({});
            expect(result).toEqual({});
        });

        it("should handle empty array", () => {
            const result = sanitizeLogData([]);
            expect(result).toEqual([]);
        });

        it("should stop at max depth (10 levels) to prevent infinite recursion", () => {
            // Create a deeply nested object (11 levels deep)
            type DeepObject = { nested?: DeepObject; password?: string };
            let deep: DeepObject = { password: "should-not-redact" };
            for (let i = 0; i < 11; i++) {
                deep = { nested: deep };
            }

            // Should not throw and should return the data
            const result = sanitizeLogData(deep);
            expect(result).toBeDefined();

            // The deepest password should NOT be redacted (beyond depth 10)
            // Navigate to the deepest level to verify
            let current: DeepObject | undefined = result as DeepObject;
            for (let i = 0; i < 11 && current?.nested; i++) {
                current = current.nested;
            }
            // At depth > 10, data is returned as-is
            expect(current?.password).toBe("should-not-redact");
        });

        it("should handle object with null property values", () => {
            const data = { password: null, name: "John" };
            const result = sanitizeLogData(data);

            // null password should still be redacted (key is sensitive)
            expect(result.password).toBe("[REDACTED]");
            expect(result.name).toBe("John");
        });
    });
});
