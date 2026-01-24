/**
 * DeviceCodeService Tests
 *
 * Tests for CLI device code authentication flow (DeviceCodeService.ts)
 */

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock config
jest.mock("../../../core/config", () => ({
    config: {
        redis: {
            host: "localhost",
            port: 6379
        },
        appUrl: "https://app.flowmaestro.ai"
    }
}));

// Mock Redis client
const mockSetEx = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();

jest.mock("redis", () => ({
    createClient: jest.fn().mockImplementation(() => ({
        setEx: mockSetEx,
        get: mockGet,
        del: mockDel,
        connect: mockConnect,
        disconnect: mockDisconnect,
        on: mockOn
    }))
}));

// Import after mocks
import { deviceCodeService } from "../DeviceCodeService";
import type { DeviceCode } from "../DeviceCodeService";

describe("DeviceCodeService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        mockSetEx.mockResolvedValue("OK");
        mockDel.mockResolvedValue(1);
        // Reset connection state for tests
        (deviceCodeService as unknown as { isConnected: boolean }).isConnected = false;
    });

    describe("generateDeviceCode", () => {
        it("should generate device code and user code", async () => {
            const result = await deviceCodeService.generateDeviceCode("cli-client");

            expect(result.device_code).toBeDefined();
            expect(result.device_code).toHaveLength(64); // 32 bytes hex
            expect(result.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
            expect(result.verification_uri).toBe("https://app.flowmaestro.ai/device");
            expect(result.verification_uri_complete).toContain("?code=");
            expect(result.expires_in).toBe(600);
            expect(result.interval).toBe(5);
        });

        it("should store device code in Redis", async () => {
            await deviceCodeService.generateDeviceCode("cli-client");

            expect(mockSetEx).toHaveBeenCalledTimes(2); // device code + user code lookup
            expect(mockSetEx).toHaveBeenCalledWith(
                expect.stringContaining("device_code:"),
                600,
                expect.any(String)
            );
        });

        it("should store user code reverse lookup", async () => {
            const result = await deviceCodeService.generateDeviceCode("cli-client");

            expect(mockSetEx).toHaveBeenCalledWith(
                expect.stringContaining("device_user_code:"),
                600,
                result.device_code
            );
        });

        it("should ensure Redis connection before operation", async () => {
            await deviceCodeService.generateDeviceCode("cli-client");

            expect(mockConnect).toHaveBeenCalled();
        });

        it("should generate user code with non-confusing characters", async () => {
            // Generate multiple codes to check character set
            for (let i = 0; i < 10; i++) {
                const result = await deviceCodeService.generateDeviceCode("cli-client");
                // Should not contain O (letter), 0 (zero), I (letter), 1 (one) which are confusing
                // Note: The implementation does include L, so we only check for O, 0, I, 1
                const code = result.user_code.replace("-", "");
                expect(code).not.toMatch(/[OI01]/);
            }
        });
    });

    describe("getDeviceCode", () => {
        it("should return device code data when exists", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 600000,
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.getDeviceCode("abc123");

            expect(result).toEqual(deviceCodeData);
            expect(mockGet).toHaveBeenCalledWith("device_code:abc123");
        });

        it("should return null when device code not found", async () => {
            mockGet.mockResolvedValue(null);

            const result = await deviceCodeService.getDeviceCode("nonexistent");

            expect(result).toBeNull();
        });
    });

    describe("getDeviceCodeByUserCode", () => {
        it("should return device code data by user code", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 600000,
                interval: 5,
                authorized: false
            };
            // First call gets device code from user code lookup
            mockGet.mockResolvedValueOnce("abc123");
            // Second call gets device code data
            mockGet.mockResolvedValueOnce(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.getDeviceCodeByUserCode("ABCD-1234");

            expect(result).toEqual(deviceCodeData);
        });

        it("should return null when user code not found", async () => {
            mockGet.mockResolvedValue(null);

            const result = await deviceCodeService.getDeviceCodeByUserCode("XXXX-0000");

            expect(result).toBeNull();
        });
    });

    describe("authorizeDeviceCode", () => {
        it("should authorize device code with user ID", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000, // 5 minutes left
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValueOnce("abc123"); // User code lookup
            mockGet.mockResolvedValueOnce(JSON.stringify(deviceCodeData)); // Device code data

            const result = await deviceCodeService.authorizeDeviceCode("ABCD-1234", "user-123");

            expect(result).toBe(true);
            expect(mockSetEx).toHaveBeenCalledWith(
                "device_code:abc123",
                expect.any(Number),
                expect.stringContaining('"authorized":true')
            );
            expect(mockSetEx).toHaveBeenCalledWith(
                "device_code:abc123",
                expect.any(Number),
                expect.stringContaining('"userId":"user-123"')
            );
        });

        it("should normalize user code format", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000,
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValueOnce("abc123");
            mockGet.mockResolvedValueOnce(JSON.stringify(deviceCodeData));

            // Pass code without dash and lowercase
            const result = await deviceCodeService.authorizeDeviceCode("abcd1234", "user-123");

            expect(result).toBe(true);
            expect(mockGet).toHaveBeenCalledWith("device_user_code:ABCD-1234");
        });

        it("should return false when user code not found", async () => {
            mockGet.mockResolvedValue(null);

            const result = await deviceCodeService.authorizeDeviceCode("XXXX-0000", "user-123");

            expect(result).toBe(false);
        });

        it("should return false when device code expired", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() - 1000, // Expired
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValueOnce("abc123");
            mockGet.mockResolvedValueOnce(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.authorizeDeviceCode("ABCD-1234", "user-123");

            expect(result).toBe(false);
        });
    });

    describe("denyDeviceCode", () => {
        it("should delete device code and user code lookup", async () => {
            mockGet.mockResolvedValueOnce("abc123"); // User code lookup

            const result = await deviceCodeService.denyDeviceCode("ABCD-1234");

            expect(result).toBe(true);
            expect(mockDel).toHaveBeenCalledWith("device_code:abc123");
            expect(mockDel).toHaveBeenCalledWith("device_user_code:ABCD-1234");
        });

        it("should normalize user code format", async () => {
            mockGet.mockResolvedValueOnce("abc123");

            await deviceCodeService.denyDeviceCode("abcd1234");

            expect(mockGet).toHaveBeenCalledWith("device_user_code:ABCD-1234");
        });

        it("should return false when user code not found", async () => {
            mockGet.mockResolvedValue(null);

            const result = await deviceCodeService.denyDeviceCode("XXXX-0000");

            expect(result).toBe(false);
            expect(mockDel).not.toHaveBeenCalled();
        });
    });

    describe("pollForToken", () => {
        it("should return authorization_pending when not yet authorized", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000,
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.pollForToken("abc123", "cli-client");

            expect(result).toEqual({ error: "authorization_pending" });
        });

        it("should return authorization_pending when authorized but no userId", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000,
                interval: 5,
                authorized: true
                // No userId
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.pollForToken("abc123", "cli-client");

            expect(result).toEqual({ error: "authorization_pending" });
        });

        it("should return userId when fully authorized", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000,
                interval: 5,
                authorized: true,
                userId: "user-123"
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.pollForToken("abc123", "cli-client");

            expect(result).toEqual({ userId: "user-123" });
        });

        it("should clean up after successful authorization", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000,
                interval: 5,
                authorized: true,
                userId: "user-123"
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            await deviceCodeService.pollForToken("abc123", "cli-client");

            expect(mockDel).toHaveBeenCalledWith("device_code:abc123");
            expect(mockDel).toHaveBeenCalledWith("device_user_code:ABCD-1234");
        });

        it("should return expired_token when device code not found", async () => {
            mockGet.mockResolvedValue(null);

            const result = await deviceCodeService.pollForToken("nonexistent", "cli-client");

            expect(result).toEqual({ error: "expired_token" });
        });

        it("should return invalid_request for wrong clientId", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() + 300000,
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.pollForToken("abc123", "wrong-client");

            expect(result).toEqual({ error: "invalid_request" });
        });

        it("should return expired_token and clean up when expired", async () => {
            const deviceCodeData: DeviceCode = {
                deviceCode: "abc123",
                userCode: "ABCD-1234",
                clientId: "cli-client",
                expiresAt: Date.now() - 1000, // Expired
                interval: 5,
                authorized: false
            };
            mockGet.mockResolvedValue(JSON.stringify(deviceCodeData));

            const result = await deviceCodeService.pollForToken("abc123", "cli-client");

            expect(result).toEqual({ error: "expired_token" });
            expect(mockDel).toHaveBeenCalledWith("device_code:abc123");
            expect(mockDel).toHaveBeenCalledWith("device_user_code:ABCD-1234");
        });
    });

    describe("disconnect", () => {
        it("should disconnect Redis when connected", async () => {
            // Trigger connection
            await deviceCodeService.generateDeviceCode("cli-client");

            await deviceCodeService.disconnect();

            expect(mockDisconnect).toHaveBeenCalled();
        });

        it("should not disconnect when not connected", async () => {
            // Don't trigger connection
            await deviceCodeService.disconnect();

            expect(mockDisconnect).not.toHaveBeenCalled();
        });
    });

    describe("Connection management", () => {
        it("should only connect once", async () => {
            await deviceCodeService.generateDeviceCode("client1");
            await deviceCodeService.generateDeviceCode("client2");
            await deviceCodeService.generateDeviceCode("client3");

            expect(mockConnect).toHaveBeenCalledTimes(1);
        });

        it("should handle Redis connection errors", async () => {
            mockConnect.mockRejectedValue(new Error("Connection refused"));

            await expect(deviceCodeService.generateDeviceCode("cli-client")).rejects.toThrow(
                "Connection refused"
            );
        });
    });
});
