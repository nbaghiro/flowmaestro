import chalk from "chalk";
import open from "open";
import { getEffectiveApiUrl, saveCredentials } from "../config";
import { ApiError, NetworkError } from "../utils/errors";
import { startSpinner, succeedSpinner, failSpinner } from "../utils/spinner";

export interface DeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

export interface DeviceFlowError {
    error: string;
    error_description?: string;
}

export async function initiateDeviceFlow(): Promise<DeviceCodeResponse> {
    const baseUrl = getEffectiveApiUrl();

    const response = await fetch(`${baseUrl}/api/oauth/device/code`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            client_id: "flowmaestro-cli"
        })
    });

    if (!response.ok) {
        throw new ApiError("Failed to initiate device flow", response.status);
    }

    return (await response.json()) as DeviceCodeResponse;
}

export async function pollForToken(
    deviceCode: string,
    interval: number,
    expiresIn: number
): Promise<TokenResponse> {
    const baseUrl = getEffectiveApiUrl();
    const startTime = Date.now();
    const expiresAt = startTime + expiresIn * 1000;
    let pollInterval = interval * 1000;

    while (Date.now() < expiresAt) {
        await sleep(pollInterval);

        try {
            const response = await fetch(`${baseUrl}/api/oauth/device/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    device_code: deviceCode,
                    client_id: "flowmaestro-cli",
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code"
                })
            });

            if (response.ok) {
                return (await response.json()) as TokenResponse;
            }

            const errorData = (await response.json()) as DeviceFlowError;

            switch (errorData.error) {
                case "authorization_pending":
                    continue;

                case "slow_down":
                    pollInterval += 5000;
                    continue;

                case "expired_token":
                    throw new ApiError(
                        "Device code expired. Please try again.",
                        400,
                        "expired_token"
                    );

                case "access_denied":
                    throw new ApiError("Authorization denied by user.", 403, "access_denied");

                default:
                    throw new ApiError(
                        errorData.error_description || "Authorization failed",
                        response.status,
                        errorData.error
                    );
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new NetworkError("Network error during authorization polling");
        }
    }

    throw new ApiError("Device code expired. Please try again.", 400, "expired_token");
}

export async function performDeviceLogin(): Promise<void> {
    console.log();
    console.log(chalk.bold("Logging in to FlowMaestro..."));
    console.log();

    const deviceCode = await initiateDeviceFlow();

    console.log(chalk.cyan("To complete login:"));
    console.log();
    console.log(`  1. Visit: ${chalk.bold.underline(deviceCode.verification_uri)}`);
    console.log(`  2. Enter code: ${chalk.bold.yellow(deviceCode.user_code)}`);
    console.log();

    const shouldOpen = process.stdout.isTTY;

    if (shouldOpen) {
        console.log(chalk.gray("Opening browser..."));
        try {
            await open(deviceCode.verification_uri_complete);
        } catch {
            console.log(chalk.gray("Could not open browser automatically."));
        }
    }

    console.log();
    startSpinner("Waiting for authorization...");

    try {
        const token = await pollForToken(
            deviceCode.device_code,
            deviceCode.interval,
            deviceCode.expires_in
        );

        saveCredentials({
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + token.expires_in * 1000
        });

        succeedSpinner("Successfully logged in!");
    } catch (error) {
        failSpinner("Login failed");
        throw error;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
