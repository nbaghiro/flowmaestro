import { FastifyInstance } from "fastify";
import { config } from "../../../core/config";
import { deviceCodeService, type DeviceFlowError } from "../../../services/auth/DeviceCodeService";
import { UserRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

interface DeviceCodeRequest {
    client_id: string;
}

interface DeviceTokenRequest {
    device_code: string;
    client_id: string;
    grant_type: string;
}

interface AuthorizeRequest {
    user_code: string;
    action: "authorize" | "deny";
}

/**
 * Device Authorization Flow Routes
 *
 * Implements RFC 8628 (OAuth 2.0 Device Authorization Grant) for CLI authentication.
 *
 * Flow:
 * 1. CLI calls POST /device/code to get device_code and user_code
 * 2. User visits verification_uri and enters user_code
 * 3. User authorizes in browser (must be logged in)
 * 4. CLI polls POST /device/token until authorized
 * 5. CLI receives access_token
 */
export async function deviceFlowRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * POST /oauth/device/code
     *
     * Generate device code and user code for CLI authentication.
     * Called by CLI to start the device authorization flow.
     */
    fastify.post<{ Body: DeviceCodeRequest }>("/device/code", async (request, reply) => {
        const { client_id } = request.body || {};

        if (!client_id) {
            return reply.status(400).send({
                error: "invalid_request",
                error_description: "client_id is required"
            });
        }

        // Validate client_id (for now, just accept flowmaestro-cli)
        if (client_id !== "flowmaestro-cli") {
            return reply.status(400).send({
                error: "invalid_client",
                error_description: "Unknown client_id"
            });
        }

        try {
            const deviceCode = await deviceCodeService.generateDeviceCode(client_id);

            return reply.send(deviceCode);
        } catch (error) {
            fastify.log.error(error, "Failed to generate device code");
            return reply.status(500).send({
                error: "server_error",
                error_description: "Failed to generate device code"
            });
        }
    });

    /**
     * POST /oauth/device/token
     *
     * Poll for token after user authorization.
     * Called repeatedly by CLI until user authorizes or code expires.
     *
     * Returns:
     * - 200 with access_token if authorized
     * - 400 with error if pending, denied, or expired
     */
    fastify.post<{ Body: DeviceTokenRequest }>("/device/token", async (request, reply) => {
        const { device_code, client_id, grant_type } = request.body || {};

        if (!device_code || !client_id) {
            return reply.status(400).send({
                error: "invalid_request",
                error_description: "device_code and client_id are required"
            });
        }

        if (grant_type !== "urn:ietf:params:oauth:grant-type:device_code") {
            return reply.status(400).send({
                error: "unsupported_grant_type",
                error_description: "grant_type must be urn:ietf:params:oauth:grant-type:device_code"
            });
        }

        try {
            const result = await deviceCodeService.pollForToken(device_code, client_id);

            if ("error" in result) {
                const statusCode = result.error === "authorization_pending" ? 400 : 400;
                return reply.status(statusCode).send({
                    error: result.error,
                    error_description: getErrorDescription(result.error)
                });
            }

            // User authorized - generate JWT token
            const userRepository = new UserRepository();
            const user = await userRepository.findById(result.userId);

            if (!user) {
                return reply.status(400).send({
                    error: "invalid_request",
                    error_description: "User not found"
                });
            }

            // Update last login
            await userRepository.update(user.id, {
                last_login_at: new Date()
            });

            // Generate tokens
            const accessToken = fastify.jwt.sign(
                { id: user.id, email: user.email },
                { expiresIn: config.jwt.expiresIn }
            );

            // For CLI, we use a longer-lived refresh token
            const refreshToken = fastify.jwt.sign(
                { id: user.id, email: user.email, type: "refresh" },
                { expiresIn: "30d" }
            );

            return reply.send({
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: "Bearer",
                expires_in: parseExpiresIn(config.jwt.expiresIn)
            });
        } catch (error) {
            fastify.log.error(error, "Failed to poll for token");
            return reply.status(500).send({
                error: "server_error",
                error_description: "Failed to process token request"
            });
        }
    });

    /**
     * GET /oauth/device/verify
     *
     * Verification page for user to authorize device.
     * User must be logged in. Shows form to enter/confirm user code.
     */
    fastify.get<{ Querystring: { user_code?: string } }>(
        "/device/verify",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { user_code } = request.query;
            const user = request.user!;

            // Return JSON for API clients
            if (request.headers.accept?.includes("application/json")) {
                if (!user_code) {
                    return reply.send({
                        success: true,
                        data: {
                            message: "Enter the code displayed on your CLI",
                            user: {
                                id: user.id,
                                email: user.email
                            }
                        }
                    });
                }

                // Verify the code exists
                const deviceCode = await deviceCodeService.getDeviceCodeByUserCode(user_code);
                if (!deviceCode) {
                    return reply.status(404).send({
                        success: false,
                        error: "Invalid or expired code"
                    });
                }

                return reply.send({
                    success: true,
                    data: {
                        user_code,
                        client_id: deviceCode.clientId,
                        user: {
                            id: user.id,
                            email: user.email
                        }
                    }
                });
            }

            // Return HTML for browser
            const html = generateVerificationHtml(user_code, user.email);
            return reply.type("text/html").send(html);
        }
    );

    /**
     * POST /oauth/device/verify
     *
     * Authorize or deny a device code.
     * Called when user clicks Authorize/Deny in browser.
     */
    fastify.post<{ Body: AuthorizeRequest }>(
        "/device/verify",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { user_code, action } = request.body || {};
            const user = request.user!;

            if (!user_code || !action) {
                return reply.status(400).send({
                    success: false,
                    error: "user_code and action are required"
                });
            }

            try {
                if (action === "authorize") {
                    const success = await deviceCodeService.authorizeDeviceCode(user_code, user.id);

                    if (!success) {
                        return reply.status(400).send({
                            success: false,
                            error: "Invalid or expired code"
                        });
                    }

                    fastify.log.info(
                        { userId: user.id, userCode: user_code },
                        "User authorized CLI device"
                    );

                    // Return JSON for API clients
                    if (request.headers.accept?.includes("application/json")) {
                        return reply.send({
                            success: true,
                            data: {
                                message:
                                    "Device authorized. You can close this page and return to your CLI."
                            }
                        });
                    }

                    // Return HTML for browser
                    return reply.type("text/html").send(generateSuccessHtml());
                } else if (action === "deny") {
                    await deviceCodeService.denyDeviceCode(user_code);

                    if (request.headers.accept?.includes("application/json")) {
                        return reply.send({
                            success: true,
                            data: {
                                message: "Authorization denied."
                            }
                        });
                    }

                    return reply.type("text/html").send(generateDeniedHtml());
                } else {
                    return reply.status(400).send({
                        success: false,
                        error: "action must be 'authorize' or 'deny'"
                    });
                }
            } catch (error) {
                fastify.log.error(error, "Failed to process device authorization");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to process authorization"
                });
            }
        }
    );
}

function getErrorDescription(error: DeviceFlowError): string {
    switch (error) {
        case "authorization_pending":
            return "The authorization request is still pending.";
        case "slow_down":
            return "Polling too frequently. Please slow down.";
        case "expired_token":
            return "The device code has expired. Please restart the authorization.";
        case "access_denied":
            return "The user denied the authorization request.";
        case "invalid_request":
            return "The request was invalid.";
        default:
            return "An unknown error occurred.";
    }
}

function parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case "d":
            return value * 86400;
        case "h":
            return value * 3600;
        case "m":
            return value * 60;
        case "s":
            return value;
        default:
            return 3600;
    }
}

function generateVerificationHtml(userCode: string | undefined, email: string): string {
    const appName = "FlowMaestro";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize Device - ${appName}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            padding: 40px;
            max-width: 420px;
            width: 100%;
        }
        .logo {
            text-align: center;
            margin-bottom: 24px;
        }
        .logo h1 {
            font-size: 24px;
            color: #1a1a2e;
        }
        h2 {
            font-size: 20px;
            color: #1a1a2e;
            margin-bottom: 8px;
            text-align: center;
        }
        .subtitle {
            color: #6b7280;
            text-align: center;
            margin-bottom: 24px;
        }
        .user-info {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 24px;
            text-align: center;
        }
        .user-info span {
            color: #374151;
            font-weight: 500;
        }
        .code-display {
            background: #f9fafb;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 24px;
        }
        .code-display code {
            font-size: 32px;
            font-family: 'SF Mono', Monaco, monospace;
            font-weight: 600;
            color: #1a1a2e;
            letter-spacing: 4px;
        }
        .code-input {
            margin-bottom: 24px;
        }
        .code-input label {
            display: block;
            margin-bottom: 8px;
            color: #374151;
            font-weight: 500;
        }
        .code-input input {
            width: 100%;
            padding: 12px 16px;
            font-size: 18px;
            text-align: center;
            letter-spacing: 4px;
            text-transform: uppercase;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            transition: border-color 0.2s;
        }
        .code-input input:focus {
            outline: none;
            border-color: #667eea;
        }
        .buttons {
            display: flex;
            gap: 12px;
        }
        button {
            flex: 1;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-authorize {
            background: #667eea;
            color: white;
        }
        .btn-authorize:hover {
            background: #5a67d8;
        }
        .btn-deny {
            background: #f3f4f6;
            color: #374151;
        }
        .btn-deny:hover {
            background: #e5e7eb;
        }
        .warning {
            margin-top: 24px;
            padding: 12px;
            background: #fef3c7;
            border-radius: 8px;
            color: #92400e;
            font-size: 14px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>${appName}</h1>
        </div>
        <h2>Authorize CLI Access</h2>
        <p class="subtitle">A CLI is requesting access to your account</p>

        <div class="user-info">
            Logged in as <span>${email}</span>
        </div>

        <form method="POST" action="/oauth/device/verify">
            ${
                userCode
                    ? `
                <div class="code-display">
                    <code>${userCode}</code>
                </div>
                <input type="hidden" name="user_code" value="${userCode}">
            `
                    : `
                <div class="code-input">
                    <label for="user_code">Enter the code from your CLI:</label>
                    <input type="text" id="user_code" name="user_code" placeholder="XXXX-XXXX" maxlength="9" required>
                </div>
            `
            }

            <div class="buttons">
                <button type="submit" name="action" value="deny" class="btn-deny">Deny</button>
                <button type="submit" name="action" value="authorize" class="btn-authorize">Authorize</button>
            </div>
        </form>

        <div class="warning">
            Only authorize if you initiated this request from your CLI.
        </div>
    </div>
</body>
</html>`;
}

function generateSuccessHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Device Authorized - FlowMaestro</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            padding: 40px;
            max-width: 420px;
            width: 100%;
            text-align: center;
        }
        .checkmark {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .checkmark svg {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
        }
        h2 {
            font-size: 24px;
            color: #1a1a2e;
            margin-bottom: 12px;
        }
        p {
            color: #6b7280;
            margin-bottom: 24px;
        }
        .close-hint {
            color: #9ca3af;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">
            <svg fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <h2>Device Authorized</h2>
        <p>Your CLI has been successfully authorized. You can return to your terminal.</p>
        <p class="close-hint">You can close this page.</p>
    </div>
</body>
</html>`;
}

function generateDeniedHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Denied - FlowMaestro</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            padding: 40px;
            max-width: 420px;
            width: 100%;
            text-align: center;
        }
        .icon {
            width: 80px;
            height: 80px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .icon svg {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
        }
        h2 {
            font-size: 24px;
            color: #1a1a2e;
            margin-bottom: 12px;
        }
        p {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
        <h2>Authorization Denied</h2>
        <p>The CLI authorization request was denied.</p>
    </div>
</body>
</html>`;
}
