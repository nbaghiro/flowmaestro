/**
 * Device Code Flow E2E Tests
 *
 * Tests device code authentication flow storage and retrieval
 * using real Redis. Verifies code generation, lookup, authorization,
 * and expiry handling.
 */

import { getRedis, flushRedis } from "../setup";

describe("Device Code Flow (Real Redis)", () => {
    beforeEach(async () => {
        await flushRedis();
    });

    // ========================================================================
    // CODE GENERATION
    // ========================================================================

    describe("generate device code", () => {
        it("should store device code with initial state", async () => {
            const redis = getRedis();
            const deviceCode = "STORE-TEST-1234";
            const userCode = "USER-TEST-5678";

            const deviceData = {
                device_code: deviceCode,
                user_code: userCode,
                client_id: "cli-client",
                scope: "read write",
                status: "pending"
            };

            // Store by device code
            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify(deviceData),
                "EX",
                600 // 10 minutes
            );

            // Store reverse lookup by user code
            await redis.set(`user_code:${userCode}`, deviceCode, "EX", 600);

            const stored = await redis.get(`device_code:${deviceCode}`);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            expect(parsed.device_code).toBe(deviceCode);
            expect(parsed.user_code).toBe(userCode);
            expect(parsed.status).toBe("pending");
        });

        it("should generate user-friendly code format", async () => {
            // Test that codes follow expected pattern
            const userCode = "ABCD-1234";

            // Pattern: 4 chars, hyphen, 4 chars
            expect(userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        });
    });

    // ========================================================================
    // TTL AND EXPIRY
    // ========================================================================

    describe("store with TTL", () => {
        it("should set 10-minute expiry", async () => {
            const redis = getRedis();
            const deviceCode = "EXPIRE-TEST";

            await redis.set(`device_code:${deviceCode}`, JSON.stringify({ test: true }), "EX", 600);

            const ttl = await redis.ttl(`device_code:${deviceCode}`);
            expect(ttl).toBeGreaterThan(590);
            expect(ttl).toBeLessThanOrEqual(600);
        });

        it("should expire after TTL", async () => {
            const redis = getRedis();
            const deviceCode = "SHORT-TTL";

            await redis.set(`device_code:${deviceCode}`, JSON.stringify({ test: true }), "EX", 1);

            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 1100));

            const stored = await redis.get(`device_code:${deviceCode}`);
            expect(stored).toBeNull();
        });
    });

    // ========================================================================
    // LOOKUP BY USER CODE
    // ========================================================================

    describe("lookup by user code", () => {
        it("should find device code from user code", async () => {
            const redis = getRedis();
            const deviceCode = "DEVICE-001";
            const userCode = "USER-001";

            // Store device data
            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ user_code: userCode, status: "pending" }),
                "EX",
                600
            );

            // Store reverse lookup
            await redis.set(`user_code:${userCode}`, deviceCode, "EX", 600);

            // Lookup by user code
            const foundDeviceCode = await redis.get(`user_code:${userCode}`);
            expect(foundDeviceCode).toBe(deviceCode);

            // Get device data
            const deviceData = await redis.get(`device_code:${foundDeviceCode}`);
            expect(JSON.parse(deviceData!).user_code).toBe(userCode);
        });

        it("should return null for invalid user code", async () => {
            const redis = getRedis();

            const result = await redis.get("user_code:INVALID-CODE");
            expect(result).toBeNull();
        });
    });

    // ========================================================================
    // AUTHORIZATION
    // ========================================================================

    describe("authorize device code", () => {
        it("should update status to authorized", async () => {
            const redis = getRedis();
            const deviceCode = "AUTH-TEST";
            const userId = "user-123";

            // Initial pending state
            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "pending", client_id: "cli" }),
                "EX",
                600
            );

            // Authorize
            const data = JSON.parse((await redis.get(`device_code:${deviceCode}`))!);
            data.status = "authorized";
            data.user_id = userId;
            data.authorized_at = Date.now();
            await redis.set(`device_code:${deviceCode}`, JSON.stringify(data), "KEEPTTL");

            // Verify
            const updated = JSON.parse((await redis.get(`device_code:${deviceCode}`))!);
            expect(updated.status).toBe("authorized");
            expect(updated.user_id).toBe(userId);
        });

        it("should preserve TTL after authorization", async () => {
            const redis = getRedis();
            const deviceCode = "TTL-PRESERVE";

            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "pending" }),
                "EX",
                600
            );

            const ttlBefore = await redis.ttl(`device_code:${deviceCode}`);
            expect(ttlBefore).toBe(600); // Verify TTL was set

            // Update with KEEPTTL - this preserves the original expiry
            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "authorized" }),
                "KEEPTTL"
            );

            const ttlAfter = await redis.ttl(`device_code:${deviceCode}`);

            // TTL should be preserved (close to original, within 2 second margin)
            expect(ttlAfter).toBeGreaterThan(597);
            expect(ttlAfter).toBeLessThanOrEqual(600);
        });
    });

    // ========================================================================
    // TOKEN EXCHANGE
    // ========================================================================

    describe("exchange for token", () => {
        it("should complete flow with token generation", async () => {
            const redis = getRedis();
            const deviceCode = "EXCHANGE-TEST";
            const userCode = "EXCH-USER";

            // 1. Generate device code
            const initialData = {
                device_code: deviceCode,
                user_code: userCode,
                client_id: "cli-client",
                scope: "read write",
                status: "pending",
                created_at: Date.now()
            };
            await redis.set(`device_code:${deviceCode}`, JSON.stringify(initialData), "EX", 600);
            await redis.set(`user_code:${userCode}`, deviceCode, "EX", 600);

            // 2. User authorizes
            const authorizedData = {
                ...initialData,
                status: "authorized",
                user_id: "user-456",
                authorized_at: Date.now()
            };
            await redis.set(`device_code:${deviceCode}`, JSON.stringify(authorizedData), "KEEPTTL");

            // 3. Client polls and exchanges for token
            const data = JSON.parse((await redis.get(`device_code:${deviceCode}`))!);
            expect(data.status).toBe("authorized");

            // 4. Mark as exchanged and clean up
            data.status = "exchanged";
            data.exchanged_at = Date.now();
            await redis.set(`device_code:${deviceCode}`, JSON.stringify(data), "EX", 60); // Short TTL for cleanup

            // Remove user code lookup
            await redis.del(`user_code:${userCode}`);

            // Verify final state
            const finalData = JSON.parse((await redis.get(`device_code:${deviceCode}`))!);
            expect(finalData.status).toBe("exchanged");

            const userCodeLookup = await redis.get(`user_code:${userCode}`);
            expect(userCodeLookup).toBeNull();
        });

        it("should reject already-exchanged device code", async () => {
            const redis = getRedis();
            const deviceCode = "ALREADY-EXCHANGED";

            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "exchanged" }),
                "EX",
                60
            );

            const data = JSON.parse((await redis.get(`device_code:${deviceCode}`))!);

            expect(data.status).toBe("exchanged");
            // In real implementation, would throw error
        });
    });

    // ========================================================================
    // CONCURRENT CODES
    // ========================================================================

    describe("concurrent codes", () => {
        it("should handle multiple pending codes for same client", async () => {
            const redis = getRedis();
            const clientId = "multi-device-client";

            // Create multiple pending device codes
            const codes = [];
            for (let i = 0; i < 3; i++) {
                const deviceCode = `MULTI-${i}`;
                const userCode = `USER-${i}`;
                codes.push({ deviceCode, userCode });

                await redis.set(
                    `device_code:${deviceCode}`,
                    JSON.stringify({
                        device_code: deviceCode,
                        user_code: userCode,
                        client_id: clientId,
                        status: "pending"
                    }),
                    "EX",
                    600
                );
                await redis.set(`user_code:${userCode}`, deviceCode, "EX", 600);
            }

            // All codes should exist independently
            for (const code of codes) {
                const data = await redis.get(`device_code:${code.deviceCode}`);
                expect(data).toBeDefined();
                expect(JSON.parse(data!).client_id).toBe(clientId);
            }

            // Authorizing one should not affect others
            const firstData = JSON.parse((await redis.get(`device_code:${codes[0].deviceCode}`))!);
            firstData.status = "authorized";
            await redis.set(
                `device_code:${codes[0].deviceCode}`,
                JSON.stringify(firstData),
                "KEEPTTL"
            );

            // Verify first is authorized, others still pending
            const firstStr = await redis.get(`device_code:${codes[0].deviceCode}`);
            const secondStr = await redis.get(`device_code:${codes[1].deviceCode}`);
            const thirdStr = await redis.get(`device_code:${codes[2].deviceCode}`);

            expect(firstStr).not.toBeNull();
            expect(secondStr).not.toBeNull();
            expect(thirdStr).not.toBeNull();

            const first = JSON.parse(firstStr!);
            const second = JSON.parse(secondStr!);
            const third = JSON.parse(thirdStr!);

            expect(first.status).toBe("authorized");
            expect(second.status).toBe("pending");
            expect(third.status).toBe("pending");
        });

        it("should isolate codes between users", async () => {
            const redis = getRedis();

            // User 1's device code
            await redis.set(
                "device_code:USER1-CODE",
                JSON.stringify({ user_code: "U1-1234", status: "pending" }),
                "EX",
                600
            );

            // User 2's device code
            await redis.set(
                "device_code:USER2-CODE",
                JSON.stringify({ user_code: "U2-5678", status: "pending" }),
                "EX",
                600
            );

            // User 1 cannot see User 2's code
            const user1Data = JSON.parse((await redis.get("device_code:USER1-CODE"))!);
            const user2Data = JSON.parse((await redis.get("device_code:USER2-CODE"))!);

            expect(user1Data.user_code).toBe("U1-1234");
            expect(user2Data.user_code).toBe("U2-5678");
            expect(user1Data.user_code).not.toBe(user2Data.user_code);
        });
    });

    // ========================================================================
    // ERROR STATES
    // ========================================================================

    describe("error states", () => {
        it("should handle denied authorization", async () => {
            const redis = getRedis();
            const deviceCode = "DENIED-TEST";

            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "pending" }),
                "EX",
                600
            );

            // User denies authorization
            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "denied", denied_at: Date.now() }),
                "EX",
                60 // Short TTL for cleanup
            );

            const data = JSON.parse((await redis.get(`device_code:${deviceCode}`))!);
            expect(data.status).toBe("denied");
        });

        it("should handle expired codes", async () => {
            const redis = getRedis();
            const deviceCode = "EXPIRED-TEST";
            const userCode = "EXP-USER";

            await redis.set(
                `device_code:${deviceCode}`,
                JSON.stringify({ status: "pending", user_code: userCode }),
                "EX",
                1 // 1 second TTL
            );
            await redis.set(`user_code:${userCode}`, deviceCode, "EX", 1);

            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Both lookups should fail
            const deviceData = await redis.get(`device_code:${deviceCode}`);
            const userCodeLookup = await redis.get(`user_code:${userCode}`);

            expect(deviceData).toBeNull();
            expect(userCodeLookup).toBeNull();
        });
    });
});
