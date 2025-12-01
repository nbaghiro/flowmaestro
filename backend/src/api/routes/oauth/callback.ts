import { FastifyInstance } from "fastify";
import type { JsonValue } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { oauthService } from "../../../services/oauth/OAuthService";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { UserRepository } from "../../../storage/repositories/UserRepository";

interface CallbackParams {
    provider: string;
}

interface CallbackQuery {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
}

/**
 * GET /oauth/:provider/callback
 *
 * GENERIC OAuth callback handler - works for ALL providers!
 *
 * This endpoint receives the authorization code from the OAuth provider,
 * exchanges it for access/refresh tokens, and stores them securely.
 *
 * The provider is determined by the URL parameter (:provider),
 * making this a truly generic endpoint.
 */
export async function callbackRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: CallbackParams; Querystring: CallbackQuery }>(
        "/:provider/callback",
        async (request, reply) => {
            const { provider } = request.params;
            const { code, state, error, error_description } = request.query;

            // Handle OAuth error from provider
            if (error) {
                const errorMessage = error_description || error;
                fastify.log.error(`OAuth error from ${provider}: ${errorMessage}`);

                return reply.header("Cross-Origin-Opener-Policy", "unsafe-none").type("text/html")
                    .send(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Authorization Failed</title>
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: #f5f5f5;
                                }
                                .container {
                                    background: white;
                                    padding: 2rem;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                    text-align: center;
                                    max-width: 400px;
                                }
                                h1 { color: #e74c3c; margin-top: 0; }
                                p { color: #666; }
                                .error { color: #e74c3c; font-size: 0.9em; margin-top: 1rem; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>❌ Authorization Failed</h1>
                                <p>Failed to connect to ${provider}</p>
                                <p class="error">${errorMessage}</p>
                                <p style="margin-top: 2rem; font-size: 0.9em;">
                                    This window will close automatically...
                                </p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_error',
                                    provider: '${provider}',
                                    error: ${JSON.stringify(errorMessage)}
                                }, '*');
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                    </html>
                `);
            }

            // Validate required parameters
            if (!code || !state) {
                return reply.header("Cross-Origin-Opener-Policy", "unsafe-none").type("text/html")
                    .send(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Invalid Request</title>
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: #f5f5f5;
                                }
                                .container {
                                    background: white;
                                    padding: 2rem;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                    text-align: center;
                                }
                                h1 { color: #e74c3c; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>❌ Invalid Request</h1>
                                <p>Missing required parameters (code or state)</p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_error',
                                    provider: '${provider}',
                                    error: 'Missing required parameters'
                                }, '*');
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                    </html>
                `);
            }

            try {
                fastify.log.info(`Processing OAuth callback for ${provider}`);

                // Exchange authorization code for tokens
                const result = await oauthService.exchangeCodeForToken(provider, code, state);

                // Use the actual provider from the state (handles shared callbacks)
                const actualProvider = result.provider;

                fastify.log.info(
                    `Successfully exchanged code for ${actualProvider}, user: ${result.userId}`
                );

                // Check if this is authentication (google-auth, microsoft-auth) vs integration
                if (actualProvider === "google-auth") {
                    // GOOGLE AUTHENTICATION FLOW - Create/login user
                    const accountInfo = result.accountInfo as {
                        email?: string;
                        name?: string;
                        picture?: string;
                        userId?: string;
                    };

                    if (!accountInfo?.email || !accountInfo?.userId) {
                        throw new Error("Google user info missing required fields");
                    }

                    const userRepository = new UserRepository();

                    // Check if user exists by google_id or email
                    let user = await userRepository.findByEmailOrGoogleId(
                        accountInfo.email,
                        accountInfo.userId
                    );

                    if (user) {
                        // Existing user - link Google account if not already linked
                        if (!user.google_id) {
                            user = await userRepository.update(user.id, {
                                google_id: accountInfo.userId,
                                avatar_url: accountInfo.picture,
                                last_login_at: new Date()
                            });
                        } else {
                            // Just update last login
                            user = await userRepository.update(user.id, {
                                last_login_at: new Date()
                            });
                        }

                        if (!user) {
                            throw new Error("Failed to update user");
                        }

                        fastify.log.info(`User ${user.id} logged in via Google`);
                    } else {
                        // New user - create account
                        user = await userRepository.create({
                            email: accountInfo.email,
                            name: accountInfo.name,
                            google_id: accountInfo.userId,
                            auth_provider: "google",
                            avatar_url: accountInfo.picture
                        });

                        fastify.log.info(`New user ${user.id} created via Google OAuth`);
                    }

                    // Generate JWT token
                    const token = fastify.jwt.sign({
                        id: user.id,
                        email: user.email
                    });

                    // Redirect to frontend with token in URL hash
                    const userData = encodeURIComponent(
                        JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.name || "",
                            avatar_url: user.avatar_url || "",
                            google_id: user.google_id,
                            microsoft_id: user.microsoft_id,
                            has_password: !!user.password_hash
                        })
                    );

                    const redirectUrl = `${config.frontend.url}#auth_token=${token}&user_data=${userData}`;

                    return reply.redirect(redirectUrl);
                }

                if (actualProvider === "microsoft-auth") {
                    // MICROSOFT AUTHENTICATION FLOW - Create/login user
                    const accountInfo = result.accountInfo as {
                        email?: string;
                        name?: string;
                        picture?: string | null;
                        userId?: string;
                    };

                    if (!accountInfo?.email || !accountInfo?.userId) {
                        throw new Error("Microsoft user info missing required fields");
                    }

                    const userRepository = new UserRepository();

                    // Check if user exists by microsoft_id or email
                    let user = await userRepository.findByEmailOrMicrosoftId(
                        accountInfo.email,
                        accountInfo.userId
                    );

                    if (user) {
                        // Existing user - link Microsoft account if not already linked
                        if (!user.microsoft_id) {
                            user = await userRepository.update(user.id, {
                                microsoft_id: accountInfo.userId,
                                avatar_url: accountInfo.picture || user.avatar_url,
                                last_login_at: new Date()
                            });
                        } else {
                            // Just update last login
                            user = await userRepository.update(user.id, {
                                last_login_at: new Date()
                            });
                        }

                        if (!user) {
                            throw new Error("Failed to update user");
                        }

                        fastify.log.info(`User ${user.id} logged in via Microsoft`);
                    } else {
                        // New user - create account
                        user = await userRepository.create({
                            email: accountInfo.email,
                            name: accountInfo.name,
                            microsoft_id: accountInfo.userId,
                            auth_provider: "microsoft",
                            avatar_url: accountInfo.picture || undefined
                        });

                        fastify.log.info(`New user ${user.id} created via Microsoft OAuth`);
                    }

                    // Generate JWT token
                    const token = fastify.jwt.sign({
                        id: user.id,
                        email: user.email
                    });

                    // Redirect to frontend with token in URL hash
                    const userData = encodeURIComponent(
                        JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.name || "",
                            avatar_url: user.avatar_url || "",
                            google_id: user.google_id,
                            microsoft_id: user.microsoft_id,
                            has_password: !!user.password_hash
                        })
                    );

                    const redirectUrl = `${config.frontend.url}#auth_token=${token}&user_data=${userData}`;

                    return reply.redirect(redirectUrl);
                }

                // INTEGRATION FLOW - Store connection in database
                const connectionRepo = new ConnectionRepository();
                const accountInfo = result.accountInfo as Record<string, unknown> | undefined;
                const connection = await connectionRepo.create({
                    user_id: result.userId,
                    name: `${actualProvider} - ${
                        (accountInfo?.email as string) ||
                        (accountInfo?.workspace as string) ||
                        (accountInfo?.user as string) ||
                        "Account"
                    }`,
                    connection_method: "oauth2",
                    provider: actualProvider,
                    data: result.tokens,
                    metadata: {
                        scopes: result.tokens.scope?.split(" ") || [],
                        expires_at: result.tokens.expires_in
                            ? Date.now() + result.tokens.expires_in * 1000
                            : undefined,
                        account_info: accountInfo as Record<string, JsonValue>
                    },
                    status: "active"
                });

                fastify.log.info(`Created connection ${connection.id} for ${actualProvider}`);

                // Return success page that notifies parent window
                return reply.header("Cross-Origin-Opener-Policy", "unsafe-none").type("text/html")
                    .send(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Connected Successfully</title>
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                }
                                .container {
                                    background: white;
                                    padding: 2.5rem;
                                    border-radius: 12px;
                                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                                    text-align: center;
                                    max-width: 400px;
                                    animation: slideIn 0.3s ease-out;
                                }
                                @keyframes slideIn {
                                    from {
                                        opacity: 0;
                                        transform: translateY(-20px);
                                    }
                                    to {
                                        opacity: 1;
                                        transform: translateY(0);
                                    }
                                }
                                .checkmark {
                                    width: 80px;
                                    height: 80px;
                                    margin: 0 auto 1rem;
                                    background: #27ae60;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 3rem;
                                }
                                h1 {
                                    color: #2c3e50;
                                    margin: 0.5rem 0;
                                    font-size: 1.5rem;
                                }
                                p {
                                    color: #7f8c8d;
                                    margin: 0.5rem 0;
                                }
                                .provider {
                                    font-weight: 600;
                                    color: #667eea;
                                    text-transform: capitalize;
                                }
                                .account {
                                    background: #f8f9fa;
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    margin: 1rem 0;
                                    font-size: 0.9em;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="checkmark">✓</div>
                                <h1>Connected Successfully!</h1>
                                <p>You've connected to <span class="provider">${provider}</span></p>
                                <div class="account">
                                    ${
                                        (accountInfo?.email as string) ||
                                        (accountInfo?.workspace as string) ||
                                        (accountInfo?.user as string) ||
                                        "Account connected"
                                    }
                                </div>
                                <p style="margin-top: 1.5rem; font-size: 0.85em; color: #95a5a6;">
                                    This window will close automatically...
                                </p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_success',
                                    provider: '${actualProvider}',
                                    connection: ${JSON.stringify(connection)}
                                }, '*');
                                setTimeout(() => window.close(), 2000);
                            </script>
                        </body>
                    </html>
                `);
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                fastify.log.error(error, `OAuth callback failed for ${provider}`);

                return reply.header("Cross-Origin-Opener-Policy", "unsafe-none").type("text/html")
                    .send(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Authorization Failed</title>
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: #f5f5f5;
                                }
                                .container {
                                    background: white;
                                    padding: 2rem;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                    text-align: center;
                                    max-width: 400px;
                                }
                                h1 { color: #e74c3c; }
                                .error {
                                    background: #fee;
                                    border: 1px solid #fcc;
                                    padding: 1rem;
                                    border-radius: 4px;
                                    margin: 1rem 0;
                                    font-size: 0.9em;
                                    color: #c0392b;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>❌ Authorization Failed</h1>
                                <p>Failed to complete authorization for ${provider}</p>
                                <div class="error">${errorMsg}</div>
                                <p style="margin-top: 1.5rem; font-size: 0.9em;">
                                    This window will close automatically...
                                </p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_error',
                                    provider: '${provider}',
                                    error: ${JSON.stringify(errorMsg)}
                                }, '*');
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                    </html>
                `);
            }
        }
    );
}
