import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { WorkspaceRole } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { WorkspaceMemberRepository } from "../../../storage/repositories/WorkspaceMemberRepository";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";

/**
 * Helper to get all workspaces a user has access to
 */
async function getUserWorkspaces(userId: string): Promise<Array<{ id: string; name: string }>> {
    const workspaceRepo = new WorkspaceRepository();
    const memberRepo = new WorkspaceMemberRepository();

    // Get all workspace memberships
    const memberships = await memberRepo.findByUserId(userId);
    const workspaceIds = memberships.map((m) => m.workspace_id);

    // Get workspace details for each membership
    const workspaces: Array<{ id: string; name: string }> = [];
    for (const wsId of workspaceIds) {
        const workspace = await workspaceRepo.findById(wsId);
        if (workspace && !workspace.deleted_at) {
            workspaces.push({ id: workspace.id, name: workspace.name });
        }
    }

    return workspaces;
}

const refreshTokenSchema = z.object({
    refreshToken: z.string()
});

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
     * GET /extension/auth/verify
     *
     * Verifies that the JWT token is valid.
     * Does NOT require workspace context - just validates the token.
     */
    fastify.get("/auth/verify", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Try to verify JWT from Authorization header
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return reply.status(401).send({
                    success: false,
                    error: "No authentication token provided"
                });
            }

            const token = authHeader.substring(7);
            const decoded = fastify.jwt.verify(token) as { id: string; email: string };

            // Token is valid - look up user to get workspace info
            const userRepository = new UserRepository();

            const user = await userRepository.findById(decoded.id);
            if (!user) {
                return reply.status(401).send({
                    success: false,
                    error: "User not found"
                });
            }

            // Get all workspaces user has access to
            const workspaces = await getUserWorkspaces(user.id);
            const defaultWorkspace = workspaces[0] || null;

            return reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url
                    },
                    workspace: defaultWorkspace,
                    workspaces
                }
            });
        } catch (error) {
            fastify.log.error(error, "Token verification failed");
            return reply.status(401).send({
                success: false,
                error: "Invalid or expired token"
            });
        }
    });

    /**
     * POST /extension/auth/refresh
     *
     * Refreshes an expired access token using a refresh token.
     * Returns new access and refresh tokens.
     */
    fastify.post(
        "/auth/refresh",
        async (
            request: FastifyRequest<{ Body: z.infer<typeof refreshTokenSchema> }>,
            reply: FastifyReply
        ) => {
            try {
                const body = refreshTokenSchema.parse(request.body);
                const { refreshToken } = body;

                // Verify the refresh token
                let decoded: { id: string; type?: string };
                try {
                    decoded = fastify.jwt.verify(refreshToken) as { id: string; type?: string };
                } catch {
                    return reply.status(401).send({
                        success: false,
                        error: "Invalid or expired refresh token"
                    });
                }

                // Validate it's a refresh token
                if (decoded.type !== "refresh") {
                    return reply.status(401).send({
                        success: false,
                        error: "Invalid token type"
                    });
                }

                // Look up the user
                const userRepository = new UserRepository();

                const user = await userRepository.findById(decoded.id);
                if (!user) {
                    return reply.status(401).send({
                        success: false,
                        error: "User not found"
                    });
                }

                // Get all workspaces user has access to
                const workspaces = await getUserWorkspaces(user.id);
                const defaultWorkspace = workspaces[0] || null;

                // Generate new tokens
                const newAccessToken = fastify.jwt.sign({
                    id: user.id,
                    email: user.email
                });

                const newRefreshToken = fastify.jwt.sign(
                    {
                        id: user.id,
                        type: "refresh"
                    },
                    { expiresIn: "30d" }
                );

                fastify.log.info({ userId: user.id }, "Extension token refreshed");

                return reply.send({
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            avatar_url: user.avatar_url
                        },
                        workspace: defaultWorkspace,
                        workspaces,
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                        expiresIn: 3600 // 1 hour
                    }
                });
            } catch (error) {
                fastify.log.error(error, "Extension token refresh failed");
                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Token refresh failed"
                });
            }
        }
    );

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

                    const newWorkspace = await workspaceRepository.create({
                        name: `${userInfo.name}'s Workspace`,
                        slug,
                        owner_id: user.id
                    });

                    // Add owner as workspace member with owner role
                    const memberRepo = new WorkspaceMemberRepository();
                    await memberRepo.create({
                        workspace_id: newWorkspace.id,
                        user_id: user.id,
                        role: "owner" as WorkspaceRole,
                        accepted_at: new Date()
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

                // Get all workspaces user has access to
                const workspaces = await getUserWorkspaces(user.id);
                const defaultWorkspace = workspaces[0] || null;

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
                        workspace: defaultWorkspace,
                        workspaces,
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
