import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { config } from "../../../core/config";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";

const initOAuthSchema = z.object({
    provider: z.enum(["google", "microsoft"]),
    redirect_uri: z.string().url()
});

const exchangeCodeSchema = z.object({
    provider: z.enum(["google", "microsoft"]),
    code: z.string(),
    redirect_uri: z.string().url()
});

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
}

interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

interface MicrosoftUserInfo {
    id: string;
    mail?: string;
    userPrincipalName: string;
    displayName: string;
}

/**
 * Extension OAuth routes
 * These routes handle OAuth for Chrome/Firefox extensions which need custom redirect URIs
 */
export async function extensionAuthRoutes(fastify: FastifyInstance) {
    /**
     * GET /extension/auth/init
     *
     * Returns the OAuth URL for the extension to open in a popup
     * The extension provides its redirect_uri (chrome-extension://...)
     */
    fastify.get(
        "/auth/init",
        async (
            request: FastifyRequest<{ Querystring: z.infer<typeof initOAuthSchema> }>,
            reply: FastifyReply
        ) => {
            try {
                const query = initOAuthSchema.parse(request.query);
                const { provider, redirect_uri } = query;

                let authUrl: string;
                let clientId: string;
                let scopes: string[];

                if (provider === "google") {
                    clientId = config.oauth.google.clientId;
                    scopes = [
                        "https://www.googleapis.com/auth/userinfo.email",
                        "https://www.googleapis.com/auth/userinfo.profile"
                    ];

                    const params = new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirect_uri,
                        response_type: "code",
                        scope: scopes.join(" "),
                        access_type: "offline",
                        prompt: "consent"
                    });

                    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
                } else if (provider === "microsoft") {
                    clientId = config.oauth.microsoft.clientId;
                    scopes = ["openid", "profile", "email", "offline_access"];

                    const params = new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirect_uri,
                        response_type: "code",
                        scope: scopes.join(" "),
                        response_mode: "query"
                    });

                    authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
                } else {
                    return reply.status(400).send({
                        success: false,
                        error: "Unsupported provider"
                    });
                }

                return reply.send({
                    success: true,
                    data: { authUrl }
                });
            } catch (error) {
                fastify.log.error(error, "Failed to generate extension OAuth URL");
                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Invalid request"
                });
            }
        }
    );

    /**
     * POST /extension/auth/exchange
     *
     * Exchanges the authorization code for tokens
     * Creates or updates the user and returns FlowMaestro tokens
     */
    fastify.post(
        "/auth/exchange",
        async (
            request: FastifyRequest<{ Body: z.infer<typeof exchangeCodeSchema> }>,
            reply: FastifyReply
        ) => {
            try {
                const body = exchangeCodeSchema.parse(request.body);
                const { provider, code, redirect_uri } = body;

                let tokenData: TokenResponse;
                let userInfo: {
                    email: string;
                    name: string;
                    picture?: string;
                    providerId: string;
                };

                if (provider === "google") {
                    // Exchange code for Google tokens
                    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: new URLSearchParams({
                            client_id: config.oauth.google.clientId,
                            client_secret: config.oauth.google.clientSecret,
                            code,
                            redirect_uri,
                            grant_type: "authorization_code"
                        }).toString()
                    });

                    if (!tokenResponse.ok) {
                        const errorData = await tokenResponse.json().catch(() => ({}));
                        fastify.log.error({ errorData }, "Google token exchange failed");
                        throw new Error("Failed to exchange authorization code");
                    }

                    tokenData = (await tokenResponse.json()) as TokenResponse;

                    // Get user info from Google
                    const userInfoResponse = await fetch(
                        "https://www.googleapis.com/oauth2/v2/userinfo",
                        {
                            headers: {
                                Authorization: `Bearer ${tokenData.access_token}`
                            }
                        }
                    );

                    if (!userInfoResponse.ok) {
                        throw new Error("Failed to get user info from Google");
                    }

                    const googleUser = (await userInfoResponse.json()) as GoogleUserInfo;
                    userInfo = {
                        email: googleUser.email,
                        name: googleUser.name,
                        picture: googleUser.picture,
                        providerId: googleUser.id
                    };
                } else if (provider === "microsoft") {
                    // Exchange code for Microsoft tokens
                    const tokenResponse = await fetch(
                        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded"
                            },
                            body: new URLSearchParams({
                                client_id: config.oauth.microsoft.clientId,
                                client_secret: config.oauth.microsoft.clientSecret,
                                code,
                                redirect_uri,
                                grant_type: "authorization_code"
                            }).toString()
                        }
                    );

                    if (!tokenResponse.ok) {
                        const errorData = await tokenResponse.json().catch(() => ({}));
                        fastify.log.error({ errorData }, "Microsoft token exchange failed");
                        throw new Error("Failed to exchange authorization code");
                    }

                    tokenData = (await tokenResponse.json()) as TokenResponse;

                    // Get user info from Microsoft Graph
                    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
                        headers: {
                            Authorization: `Bearer ${tokenData.access_token}`
                        }
                    });

                    if (!userInfoResponse.ok) {
                        throw new Error("Failed to get user info from Microsoft");
                    }

                    const msUser = (await userInfoResponse.json()) as MicrosoftUserInfo;
                    userInfo = {
                        email: msUser.mail || msUser.userPrincipalName,
                        name: msUser.displayName,
                        providerId: msUser.id
                    };
                } else {
                    return reply.status(400).send({
                        success: false,
                        error: "Unsupported provider"
                    });
                }

                // Find or create user
                const userRepository = new UserRepository();
                const workspaceRepository = new WorkspaceRepository();

                let user =
                    provider === "google"
                        ? await userRepository.findByEmailOrGoogleId(
                              userInfo.email,
                              userInfo.providerId
                          )
                        : await userRepository.findByEmailOrMicrosoftId(
                              userInfo.email,
                              userInfo.providerId
                          );

                if (!user) {
                    // Create new user
                    user = await userRepository.create({
                        email: userInfo.email,
                        name: userInfo.name,
                        avatar_url: userInfo.picture,
                        auth_provider: provider,
                        ...(provider === "google"
                            ? { google_id: userInfo.providerId }
                            : { microsoft_id: userInfo.providerId })
                    });

                    // Create default workspace for new user
                    // Generate a slug from the user's name
                    const baseSlug = (userInfo.name || "workspace")
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "");
                    const slug = `${baseSlug}-${Date.now().toString(36)}`;

                    await workspaceRepository.create({
                        name: `${userInfo.name}'s Workspace`,
                        slug,
                        owner_id: user.id
                    });

                    fastify.log.info(
                        { userId: user.id, provider },
                        "Created new user via extension OAuth"
                    );
                } else {
                    // Update OAuth provider ID if not set
                    const updateData: {
                        google_id?: string;
                        microsoft_id?: string;
                        avatar_url?: string;
                        last_login_at?: Date;
                    } = { last_login_at: new Date() };

                    if (provider === "google" && !user.google_id) {
                        updateData.google_id = userInfo.providerId;
                    } else if (provider === "microsoft" && !user.microsoft_id) {
                        updateData.microsoft_id = userInfo.providerId;
                    }
                    if (userInfo.picture && !user.avatar_url) {
                        updateData.avatar_url = userInfo.picture;
                    }

                    await userRepository.update(user.id, updateData);
                }

                // Get user's workspaces
                const workspaces = await workspaceRepository.findByOwnerId(user.id);
                const defaultWorkspace = workspaces[0];

                // Generate FlowMaestro JWT token
                const accessToken = fastify.jwt.sign({
                    id: user.id,
                    email: user.email
                });

                // For extension, we generate a longer-lived token
                const refreshToken = fastify.jwt.sign(
                    {
                        id: user.id,
                        type: "refresh"
                    },
                    { expiresIn: "30d" }
                );

                fastify.log.info({ userId: user.id, provider }, "Extension OAuth login successful");

                return reply.send({
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            avatar_url: user.avatar_url
                        },
                        workspace: defaultWorkspace
                            ? {
                                  id: defaultWorkspace.id,
                                  name: defaultWorkspace.name
                              }
                            : null,
                        accessToken,
                        refreshToken,
                        expiresIn: 3600 // 1 hour
                    }
                });
            } catch (error) {
                fastify.log.error(error, "Extension OAuth exchange failed");
                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Authentication failed"
                });
            }
        }
    );
}
