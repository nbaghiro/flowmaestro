import type { JsonValue } from "@flowmaestro/shared";
import { isOAuth1Provider } from "../../../services/oauth/OAuth1ProviderRegistry";
import { oauth1Service } from "../../../services/oauth/OAuth1Service";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import type { FastifyInstance } from "fastify";

interface CallbackParams {
    provider: string;
}

interface CallbackQuery {
    oauth_token?: string;
    oauth_verifier?: string;
    error?: string;
}

/**
 * GET /oauth1/:provider/callback
 *
 * OAuth 1.0a callback handler
 *
 * This endpoint receives the oauth_token and oauth_verifier from the provider,
 * exchanges them for an access token, and stores the connection.
 */
export async function oauth1CallbackRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Params: CallbackParams; Querystring: CallbackQuery }>(
        "/:provider/callback",
        async (request, reply) => {
            const { provider } = request.params;
            const { oauth_token, oauth_verifier, error } = request.query;

            // Check if provider uses OAuth 1.0a
            if (!isOAuth1Provider(provider)) {
                return reply.header("Cross-Origin-Opener-Policy", "unsafe-none").type("text/html")
                    .send(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Invalid Provider</title>
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
                                <h1>Invalid Provider</h1>
                                <p>Provider ${provider} does not use OAuth 1.0a</p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_error',
                                    provider: '${provider}',
                                    error: 'Invalid provider'
                                }, '*');
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                    </html>
                `);
            }

            // Handle OAuth error from provider
            if (error) {
                fastify.log.error(`OAuth 1.0a error from ${provider}: ${error}`);

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
                                <h1>Authorization Failed</h1>
                                <p>Failed to connect to ${provider}</p>
                                <p class="error">${error}</p>
                                <p style="margin-top: 2rem; font-size: 0.9em;">
                                    This window will close automatically...
                                </p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_error',
                                    provider: '${provider}',
                                    error: ${JSON.stringify(error)}
                                }, '*');
                                setTimeout(() => window.close(), 3000);
                            </script>
                        </body>
                    </html>
                `);
            }

            // Validate required parameters
            if (!oauth_token || !oauth_verifier) {
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
                                <h1>Invalid Request</h1>
                                <p>Missing required parameters (oauth_token or oauth_verifier)</p>
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
                fastify.log.info(`Processing OAuth 1.0a callback for ${provider}`);

                // Exchange request token for access token
                const result = await oauth1Service.exchangeForAccessToken(
                    provider,
                    oauth_token,
                    oauth_verifier
                );

                fastify.log.info(
                    `Successfully exchanged token for ${provider}, user: ${result.userId}`
                );

                // Store connection in database
                const connectionRepo = new ConnectionRepository();
                const accountInfo = result.accountInfo as Record<string, unknown> | undefined;

                // For Evernote, extract user ID from tokens
                const evernoteUserId = result.tokens.edam_userId;
                const connectionName = evernoteUserId
                    ? `${provider} - User ${evernoteUserId}`
                    : `${provider} - Account`;

                const connection = await connectionRepo.create({
                    user_id: result.userId,
                    workspace_id: result.workspaceId,
                    name: connectionName,
                    connection_method: "oauth1",
                    provider: result.provider,
                    data: result.tokens,
                    metadata: {
                        account_info: {
                            ...((accountInfo || {}) as Record<string, JsonValue>),
                            ...(evernoteUserId && { user_id: evernoteUserId }),
                            ...(result.tokens.edam_noteStoreUrl && {
                                note_store_url: result.tokens.edam_noteStoreUrl
                            }),
                            ...(result.tokens.edam_webApiUrlPrefix && {
                                web_api_url: result.tokens.edam_webApiUrlPrefix
                            }),
                            ...(result.tokens.edam_shard && { shard: result.tokens.edam_shard })
                        },
                        // Evernote tokens expire after 1 year
                        expires_at: result.tokens.edam_expires
                            ? parseInt(result.tokens.edam_expires, 10)
                            : undefined
                    },
                    status: "active"
                });

                fastify.log.info(`Created connection ${connection.id} for ${provider}`);

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
                                    ${evernoteUserId ? `User ID: ${evernoteUserId}` : "Account connected"}
                                </div>
                                <p style="margin-top: 1.5rem; font-size: 0.85em; color: #95a5a6;">
                                    This window will close automatically...
                                </p>
                            </div>
                            <script>
                                window.opener?.postMessage({
                                    type: 'oauth_success',
                                    provider: '${provider}',
                                    connection: ${JSON.stringify(connection)}
                                }, '*');
                                setTimeout(() => window.close(), 2000);
                            </script>
                        </body>
                    </html>
                `);
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                fastify.log.error(error, `OAuth 1.0a callback failed for ${provider}`);

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
                                <h1>Authorization Failed</h1>
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
