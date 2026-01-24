/**
 * TokenRefreshService Tests
 *
 * Tests for OAuth token refresh service (TokenRefreshService.ts)
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

// Create mock functions that will be used by all tests
const mockFindByIdWithData = jest.fn();
const mockFindById = jest.fn();
const mockIsExpired = jest.fn();
const mockUpdateTokens = jest.fn();
const mockMarkAsUsed = jest.fn();
const mockUpdateStatus = jest.fn();
const mockFindExpiringSoon = jest.fn();

// Mock the ConnectionRepository with prototype methods
jest.mock("../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData,
        findById: mockFindById,
        isExpired: mockIsExpired,
        updateTokens: mockUpdateTokens,
        markAsUsed: mockMarkAsUsed,
        updateStatus: mockUpdateStatus,
        findExpiringSoon: mockFindExpiringSoon
    }))
}));

// Mock the OAuthService
jest.mock("../OAuthService", () => ({
    oauthService: {
        refreshAccessToken: jest.fn()
    }
}));

import { oauthService } from "../OAuthService";
import {
    getAccessToken,
    getTokenData,
    checkIfNeedsRefresh,
    forceRefreshToken,
    refreshExpiringTokens
} from "../TokenRefreshService";

function createMockConnection(overrides: Record<string, unknown> = {}) {
    return {
        id: "conn-123",
        user_id: "user-123",
        workspace_id: "ws-123",
        provider: "google",
        connection_method: "oauth2",
        status: "active",
        data: {
            access_token: "valid-access-token",
            refresh_token: "valid-refresh-token",
            expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        },
        metadata: {
            account_info: { email: "user@example.com" }
        },
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides
    };
}

describe("getAccessToken", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsExpired.mockReturnValue(false);
    });

    describe("Valid token cases", () => {
        it("should return access token when token is valid", async () => {
            const connection = createMockConnection();
            mockFindByIdWithData.mockResolvedValue(connection);
            mockIsExpired.mockReturnValue(false);

            const token = await getAccessToken("conn-123");

            expect(token).toBe("valid-access-token");
            expect(mockMarkAsUsed).toHaveBeenCalledWith("conn-123");
        });

        it("should not refresh when token is not expiring", async () => {
            const connection = createMockConnection();
            mockFindByIdWithData.mockResolvedValue(connection);
            mockIsExpired.mockReturnValue(false);

            await getAccessToken("conn-123");

            expect(oauthService.refreshAccessToken).not.toHaveBeenCalled();
        });
    });

    describe("Token refresh cases", () => {
        it("should refresh token when expiring soon", async () => {
            const connection = createMockConnection();
            mockFindByIdWithData.mockResolvedValue(connection);
            mockIsExpired.mockReturnValue(true);

            (oauthService.refreshAccessToken as jest.Mock).mockResolvedValue({
                access_token: "new-access-token",
                refresh_token: "new-refresh-token",
                token_type: "Bearer",
                expires_in: 3600
            });

            const token = await getAccessToken("conn-123");

            expect(token).toBe("new-access-token");
            expect(oauthService.refreshAccessToken).toHaveBeenCalledWith(
                "google",
                "valid-refresh-token"
            );
            expect(mockUpdateTokens).toHaveBeenCalledWith("conn-123", {
                access_token: "new-access-token",
                refresh_token: "new-refresh-token",
                token_type: "Bearer",
                expires_in: 3600
            });
        });

        it("should mark connection as expired when refresh fails", async () => {
            const connection = createMockConnection();
            mockFindByIdWithData.mockResolvedValue(connection);
            mockIsExpired.mockReturnValue(true);

            (oauthService.refreshAccessToken as jest.Mock).mockRejectedValue(
                new Error("Refresh token expired")
            );

            await expect(getAccessToken("conn-123")).rejects.toThrow(
                /Failed to refresh OAuth token/
            );

            expect(mockUpdateStatus).toHaveBeenCalledWith("conn-123", "expired");
        });

        it("should use existing token when no refresh token available", async () => {
            const connection = createMockConnection({
                data: {
                    access_token: "valid-access-token",
                    refresh_token: undefined,
                    expires_at: new Date(Date.now() + 3600000).toISOString()
                }
            });
            mockFindByIdWithData.mockResolvedValue(connection);
            mockIsExpired.mockReturnValue(true);

            const token = await getAccessToken("conn-123");

            expect(token).toBe("valid-access-token");
            expect(oauthService.refreshAccessToken).not.toHaveBeenCalled();
        });
    });

    describe("Error cases", () => {
        it("should throw when connection not found", async () => {
            mockFindByIdWithData.mockResolvedValue(null);

            await expect(getAccessToken("non-existent")).rejects.toThrow(/Connection not found/);
        });

        it("should throw when connection is not OAuth2", async () => {
            const connection = createMockConnection({ connection_method: "api_key" });
            mockFindByIdWithData.mockResolvedValue(connection);

            await expect(getAccessToken("conn-123")).rejects.toThrow(/not an OAuth token/);
        });

        it("should throw when access token is missing", async () => {
            const connection = createMockConnection({
                data: { refresh_token: "some-token" }
            });
            mockFindByIdWithData.mockResolvedValue(connection);

            await expect(getAccessToken("conn-123")).rejects.toThrow(/missing access_token/);
        });
    });
});

describe("getTokenData", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsExpired.mockReturnValue(false);
    });

    it("should return token data with provider info", async () => {
        const connection = createMockConnection();
        mockFindByIdWithData.mockResolvedValue(connection);
        mockFindById.mockResolvedValue(connection);

        const data = await getTokenData("conn-123");

        expect(data).toEqual({
            accessToken: "valid-access-token",
            provider: "google",
            accountInfo: { email: "user@example.com" }
        });
    });
});

describe("checkIfNeedsRefresh", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return true when token is expiring", async () => {
        const connection = createMockConnection();
        mockFindById.mockResolvedValue(connection);
        mockIsExpired.mockReturnValue(true);

        const needsRefresh = await checkIfNeedsRefresh("conn-123");

        expect(needsRefresh).toBe(true);
    });

    it("should return false when token is not expiring", async () => {
        const connection = createMockConnection();
        mockFindById.mockResolvedValue(connection);
        mockIsExpired.mockReturnValue(false);

        const needsRefresh = await checkIfNeedsRefresh("conn-123");

        expect(needsRefresh).toBe(false);
    });

    it("should return false when connection not found", async () => {
        mockFindById.mockResolvedValue(null);

        const needsRefresh = await checkIfNeedsRefresh("non-existent");

        expect(needsRefresh).toBe(false);
    });

    it("should return false when connection is not OAuth2", async () => {
        const connection = createMockConnection({ connection_method: "api_key" });
        mockFindById.mockResolvedValue(connection);

        const needsRefresh = await checkIfNeedsRefresh("conn-123");

        expect(needsRefresh).toBe(false);
    });
});

describe("forceRefreshToken", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should force refresh token regardless of expiry", async () => {
        const connection = createMockConnection();
        mockFindByIdWithData.mockResolvedValue(connection);

        (oauthService.refreshAccessToken as jest.Mock).mockResolvedValue({
            access_token: "forced-new-token",
            refresh_token: "forced-new-refresh",
            token_type: "Bearer"
        });

        await forceRefreshToken("conn-123");

        expect(oauthService.refreshAccessToken).toHaveBeenCalledWith(
            "google",
            "valid-refresh-token"
        );
        expect(mockUpdateTokens).toHaveBeenCalledWith("conn-123", {
            access_token: "forced-new-token",
            refresh_token: "forced-new-refresh",
            token_type: "Bearer"
        });
    });

    it("should throw when connection not found", async () => {
        mockFindByIdWithData.mockResolvedValue(null);

        await expect(forceRefreshToken("non-existent")).rejects.toThrow(/Connection not found/);
    });

    it("should throw when connection is not OAuth2", async () => {
        const connection = createMockConnection({ connection_method: "api_key" });
        mockFindByIdWithData.mockResolvedValue(connection);

        await expect(forceRefreshToken("conn-123")).rejects.toThrow(/not an OAuth token/);
    });

    it("should throw when no refresh token available", async () => {
        const connection = createMockConnection({
            data: { access_token: "token" }
        });
        mockFindByIdWithData.mockResolvedValue(connection);

        await expect(forceRefreshToken("conn-123")).rejects.toThrow(
            /does not have a refresh token/
        );
    });
});

describe("refreshExpiringTokens", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsExpired.mockReturnValue(true);
    });

    it("should skip when no userId provided", async () => {
        const results = await refreshExpiringTokens();

        expect(results).toEqual({
            refreshed: 0,
            failed: 0,
            errors: []
        });
    });

    it("should refresh all expiring connections", async () => {
        const connections = [
            createMockConnection({ id: "conn-1" }),
            createMockConnection({ id: "conn-2" })
        ];
        mockFindExpiringSoon.mockResolvedValue(connections);
        mockFindByIdWithData
            .mockResolvedValueOnce(connections[0])
            .mockResolvedValueOnce(connections[1]);

        (oauthService.refreshAccessToken as jest.Mock).mockResolvedValue({
            access_token: "new-token",
            token_type: "Bearer"
        });

        const results = await refreshExpiringTokens("user-123");

        expect(results.refreshed).toBe(2);
        expect(results.failed).toBe(0);
        expect(results.errors).toHaveLength(0);
    });

    it("should handle partial failures", async () => {
        const connections = [
            createMockConnection({ id: "conn-1" }),
            createMockConnection({ id: "conn-2" })
        ];
        mockFindExpiringSoon.mockResolvedValue(connections);
        mockFindByIdWithData
            .mockResolvedValueOnce(connections[0])
            .mockResolvedValueOnce(connections[1]);

        (oauthService.refreshAccessToken as jest.Mock)
            .mockResolvedValueOnce({
                access_token: "new-token",
                token_type: "Bearer"
            })
            .mockRejectedValueOnce(new Error("Refresh failed"));

        const results = await refreshExpiringTokens("user-123");

        expect(results.refreshed).toBe(1);
        expect(results.failed).toBe(1);
        expect(results.errors).toHaveLength(1);
        expect(results.errors[0].connectionId).toBe("conn-2");
    });

    it("should handle no expiring connections", async () => {
        mockFindExpiringSoon.mockResolvedValue([]);

        const results = await refreshExpiringTokens("user-123");

        expect(results).toEqual({
            refreshed: 0,
            failed: 0,
            errors: []
        });
    });
});
