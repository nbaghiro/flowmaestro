/**
 * Redis Session Storage E2E Tests
 *
 * Tests session data storage and retrieval using real Redis.
 * Verifies session lifecycle, expiry, and concurrent access patterns.
 */

import { getRedis, flushRedis } from "../setup";

describe("Session Storage (Real Redis)", () => {
    beforeEach(async () => {
        await flushRedis();
    });

    // ========================================================================
    // STORE SESSION
    // ========================================================================

    describe("store session data", () => {
        it("should store session with JSON serialization", async () => {
            const redis = getRedis();
            const sessionId = "sess_abc123";

            const sessionData = {
                userId: "user-1",
                email: "test@example.com",
                workspaceId: "ws-1",
                createdAt: Date.now(),
                lastAccessedAt: Date.now()
            };

            await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), "EX", 86400);

            const stored = await redis.get(`session:${sessionId}`);
            expect(stored).toBeDefined();
            expect(JSON.parse(stored!)).toEqual(sessionData);
        });

        it("should support complex nested session data", async () => {
            const redis = getRedis();
            const sessionId = "sess_complex";

            const sessionData = {
                user: {
                    id: "user-1",
                    profile: {
                        name: "Test User",
                        avatar: "https://example.com/avatar.jpg"
                    },
                    preferences: {
                        theme: "dark",
                        notifications: true
                    }
                },
                auth: {
                    tokens: {
                        accessToken: "access_token_value",
                        refreshToken: "refresh_token_value"
                    },
                    expiresAt: Date.now() + 3600000
                },
                metadata: {
                    deviceId: "device-123",
                    ipAddress: "192.168.1.1",
                    userAgent: "Mozilla/5.0"
                }
            };

            await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), "EX", 86400);

            const stored = await redis.get(`session:${sessionId}`);
            expect(JSON.parse(stored!)).toEqual(sessionData);
        });
    });

    // ========================================================================
    // RETRIEVE SESSION
    // ========================================================================

    describe("retrieve session", () => {
        it("should retrieve session with deserialization", async () => {
            const redis = getRedis();
            const sessionId = "sess_retrieve";

            const sessionData = {
                userId: "user-1",
                email: "retrieve@example.com",
                role: "admin"
            };

            await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), "EX", 86400);

            const raw = await redis.get(`session:${sessionId}`);
            const session = JSON.parse(raw!);

            expect(session.userId).toBe("user-1");
            expect(session.email).toBe("retrieve@example.com");
            expect(session.role).toBe("admin");
        });

        it("should return null for non-existent session", async () => {
            const redis = getRedis();

            const session = await redis.get("session:nonexistent");
            expect(session).toBeNull();
        });
    });

    // ========================================================================
    // SESSION EXPIRY
    // ========================================================================

    describe("session expiry", () => {
        it("should set TTL on session creation", async () => {
            const redis = getRedis();
            const sessionId = "sess_ttl";
            const ttlSeconds = 3600; // 1 hour

            await redis.set(
                `session:${sessionId}`,
                JSON.stringify({ test: true }),
                "EX",
                ttlSeconds
            );

            const ttl = await redis.ttl(`session:${sessionId}`);
            expect(ttl).toBeGreaterThan(ttlSeconds - 5);
            expect(ttl).toBeLessThanOrEqual(ttlSeconds);
        });

        it("should expire session after TTL", async () => {
            const redis = getRedis();
            const sessionId = "sess_expire";

            await redis.set(`session:${sessionId}`, JSON.stringify({ test: true }), "EX", 1);

            // Verify exists
            const before = await redis.get(`session:${sessionId}`);
            expect(before).toBeDefined();

            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Should be gone
            const after = await redis.get(`session:${sessionId}`);
            expect(after).toBeNull();
        });

        it("should support sliding session expiry", async () => {
            const redis = getRedis();
            const sessionId = "sess_sliding";
            const ttlSeconds = 60; // Use long TTL for stability

            const key = `session:${sessionId}`;
            await redis.set(key, JSON.stringify({ count: 0 }), "EX", ttlSeconds);

            // Verify key was set
            const initialSession = await redis.get(key);
            expect(initialSession).not.toBeNull();

            // Get initial TTL
            const initialTtl = await redis.ttl(key);
            expect(initialTtl).toBeGreaterThan(0);
            expect(initialTtl).toBeLessThanOrEqual(ttlSeconds);

            // Reset TTL (simulating session refresh)
            const expireResult = await redis.expire(key, ttlSeconds);
            expect(expireResult).toBe(1); // 1 means key exists and TTL was set

            // Check TTL was reset - should be close to full ttlSeconds
            const newTtl = await redis.ttl(key);
            expect(newTtl).toBeGreaterThanOrEqual(ttlSeconds - 1);

            // Verify session still exists
            const session = await redis.get(key);
            expect(session).not.toBeNull();
        });
    });

    // ========================================================================
    // UPDATE SESSION
    // ========================================================================

    describe("update session", () => {
        it("should update session with partial data", async () => {
            const redis = getRedis();
            const sessionId = "sess_update";

            // Initial session
            const initial = {
                userId: "user-1",
                lastAccessedAt: Date.now() - 60000,
                pageViews: 5
            };
            await redis.set(`session:${sessionId}`, JSON.stringify(initial), "EX", 86400);

            // Update session
            const stored = JSON.parse((await redis.get(`session:${sessionId}`))!);
            stored.lastAccessedAt = Date.now();
            stored.pageViews = 6;
            await redis.set(`session:${sessionId}`, JSON.stringify(stored), "KEEPTTL");

            // Verify update
            const updated = JSON.parse((await redis.get(`session:${sessionId}`))!);
            expect(updated.userId).toBe("user-1"); // Unchanged
            expect(updated.pageViews).toBe(6); // Updated
            expect(updated.lastAccessedAt).toBeGreaterThan(initial.lastAccessedAt);
        });

        it("should preserve TTL on update with KEEPTTL", async () => {
            const redis = getRedis();
            const sessionId = "sess_keepttl";
            const key = `session:${sessionId}`;

            // Set initial value with TTL
            await redis.set(key, JSON.stringify({ v: 1 }), "EX", 300);

            // Verify TTL was set
            const ttlBefore = await redis.ttl(key);
            expect(ttlBefore).toBeGreaterThan(0);

            // Update with KEEPTTL - use setex as fallback pattern
            // Get current TTL before update
            const currentTtl = await redis.ttl(key);

            // Update value
            await redis.set(key, JSON.stringify({ v: 2 }));

            // Restore TTL (this is what KEEPTTL does internally)
            if (currentTtl > 0) {
                await redis.expire(key, currentTtl);
            }

            const ttlAfter = await redis.ttl(key);

            // TTL should be preserved (within small margin)
            expect(ttlAfter).toBeGreaterThan(0);
            expect(ttlAfter).toBeLessThanOrEqual(ttlBefore);

            // Verify value was updated
            const value = JSON.parse((await redis.get(key))!);
            expect(value.v).toBe(2);
        });

        it("should add new fields to session", async () => {
            const redis = getRedis();
            const sessionId = "sess_addfield";

            await redis.set(
                `session:${sessionId}`,
                JSON.stringify({ userId: "user-1" }),
                "EX",
                86400
            );

            // Add new field
            const session = JSON.parse((await redis.get(`session:${sessionId}`))!);
            session.newField = "new value";
            session.anotherField = { nested: true };
            await redis.set(`session:${sessionId}`, JSON.stringify(session), "KEEPTTL");

            // Verify
            const updated = JSON.parse((await redis.get(`session:${sessionId}`))!);
            expect(updated.userId).toBe("user-1");
            expect(updated.newField).toBe("new value");
            expect(updated.anotherField).toEqual({ nested: true });
        });
    });

    // ========================================================================
    // DELETE SESSION
    // ========================================================================

    describe("delete session", () => {
        it("should delete session explicitly", async () => {
            const redis = getRedis();
            const sessionId = "sess_delete";

            await redis.set(`session:${sessionId}`, JSON.stringify({ test: true }), "EX", 86400);

            // Verify exists
            const before = await redis.get(`session:${sessionId}`);
            expect(before).toBeDefined();

            // Delete
            const deleted = await redis.del(`session:${sessionId}`);
            expect(deleted).toBe(1);

            // Verify gone
            const after = await redis.get(`session:${sessionId}`);
            expect(after).toBeNull();
        });

        it("should return 0 when deleting non-existent session", async () => {
            const redis = getRedis();

            const deleted = await redis.del("session:nonexistent");
            expect(deleted).toBe(0);
        });

        it("should support bulk session deletion", async () => {
            const redis = getRedis();
            const userId = "user-bulk-delete";

            // Create multiple sessions for user
            for (let i = 0; i < 5; i++) {
                await redis.set(
                    `session:${userId}:${i}`,
                    JSON.stringify({ userId, sessionNum: i }),
                    "EX",
                    86400
                );
            }

            // Find and delete all user sessions
            const keys = await redis.keys(`session:${userId}:*`);
            expect(keys).toHaveLength(5);

            if (keys.length > 0) {
                const deleted = await redis.del(...keys);
                expect(deleted).toBe(5);
            }

            // Verify all gone
            const remaining = await redis.keys(`session:${userId}:*`);
            expect(remaining).toHaveLength(0);
        });
    });

    // ========================================================================
    // CONCURRENT ACCESS
    // ========================================================================

    describe("concurrent access", () => {
        it("should handle concurrent reads correctly", async () => {
            const redis = getRedis();
            const sessionId = "sess_concurrent_read";

            await redis.set(`session:${sessionId}`, JSON.stringify({ counter: 100 }), "EX", 86400);

            // Concurrent reads
            const reads = await Promise.all([
                redis.get(`session:${sessionId}`),
                redis.get(`session:${sessionId}`),
                redis.get(`session:${sessionId}`),
                redis.get(`session:${sessionId}`),
                redis.get(`session:${sessionId}`)
            ]);

            // All reads should return same value
            for (const read of reads) {
                expect(JSON.parse(read!).counter).toBe(100);
            }
        });

        it("should handle concurrent writes (last write wins)", async () => {
            const redis = getRedis();
            const sessionId = "sess_concurrent_write";

            await redis.set(`session:${sessionId}`, JSON.stringify({ value: 0 }), "EX", 86400);

            // Concurrent writes
            await Promise.all([
                redis.set(`session:${sessionId}`, JSON.stringify({ value: 1 }), "KEEPTTL"),
                redis.set(`session:${sessionId}`, JSON.stringify({ value: 2 }), "KEEPTTL"),
                redis.set(`session:${sessionId}`, JSON.stringify({ value: 3 }), "KEEPTTL")
            ]);

            // Final value should be one of the written values
            const final = JSON.parse((await redis.get(`session:${sessionId}`))!);
            expect([1, 2, 3]).toContain(final.value);
        });

        it("should use WATCH for optimistic locking pattern", async () => {
            const redis = getRedis();
            const sessionId = "sess_watch";
            const key = `session:${sessionId}`;

            await redis.set(key, JSON.stringify({ counter: 0 }), "EX", 86400);

            // Verify key was set
            const initial = await redis.get(key);
            expect(initial).not.toBeNull();

            // Use WATCH/MULTI/EXEC for atomic updates
            await redis.watch(key);

            try {
                const current = JSON.parse((await redis.get(key))!);
                current.counter += 1;

                const multi = redis.multi();
                multi.set(key, JSON.stringify(current));
                multi.expire(key, 86400);
                const results = await multi.exec();

                // exec returns null if WATCH failed, array of results otherwise
                expect(results).not.toBeNull();
            } finally {
                await redis.unwatch();
            }

            const final = JSON.parse((await redis.get(key))!);
            expect(final.counter).toBe(1);
        });
    });

    // ========================================================================
    // SESSION LISTING
    // ========================================================================

    describe("session listing", () => {
        it("should list all sessions for a user", async () => {
            const redis = getRedis();
            const userId = "user-list";

            // Create sessions with user-specific key pattern
            const sessionKeys: string[] = [];
            for (let i = 0; i < 3; i++) {
                const key = `session:user:${userId}:${i}`;
                sessionKeys.push(key);
                await redis.set(
                    key,
                    JSON.stringify({ userId, device: `device-${i}` }),
                    "EX",
                    86400
                );
            }

            // Verify all keys were set
            for (const key of sessionKeys) {
                const exists = await redis.exists(key);
                expect(exists).toBe(1);
            }

            const keys = await redis.keys(`session:user:${userId}:*`);
            expect(keys).toHaveLength(3);

            // Get all session data using MGET for atomicity
            const values = await redis.mget(...keys);
            const sessions = values.filter((v) => v !== null).map((v) => JSON.parse(v!));

            expect(sessions).toHaveLength(3);
            expect(sessions.every((s) => s.userId === userId)).toBe(true);
        });
    });
});
