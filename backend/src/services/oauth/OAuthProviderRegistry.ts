import { config, getOAuthRedirectUri } from "../../core/config";

/**
 * OAuth Provider Configuration
 * Defines the structure for OAuth 2.0 provider configuration
 */
export interface OAuthProvider {
    name: string;
    displayName: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientId: string;
    clientSecret: string;
    redirectUri: string;

    // Optional customizations
    authParams?: Record<string, string>;
    tokenParams?: Record<string, string>;
    getUserInfo?: (accessToken: string, subdomain?: string) => Promise<unknown>;
    revokeUrl?: string;
    refreshable?: boolean;
    pkceEnabled?: boolean; // Enable PKCE (Proof Key for Code Exchange)
}

/**
 * Central Registry of OAuth Providers
 *
 * Adding a new OAuth integration is as simple as adding a new entry here!
 * The generic OAuth system handles all the rest.
 */
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
    slack: {
        name: "slack",
        displayName: "Slack",
        authUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        scopes: [
            "chat:write",
            "channels:read",
            "channels:history",
            "files:write",
            "users:read",
            "users:read.email"
        ],
        clientId: config.oauth.slack.clientId,
        clientSecret: config.oauth.slack.clientSecret,
        redirectUri: getOAuthRedirectUri("slack"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://slack.com/api/auth.test", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });

                const data = (await response.json()) as {
                    ok?: boolean;
                    error?: string;
                    team?: string;
                    team_id?: string;
                    user?: string;
                    user_id?: string;
                    email?: string;
                };

                if (!data.ok) {
                    throw new Error(data.error || "Failed to get Slack user info");
                }

                return {
                    workspace: data.team,
                    workspaceId: data.team_id,
                    user: data.user,
                    userId: data.user_id,
                    email: data.email || `${data.user}@slack`
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Slack user info:", error);
                return {
                    user: "Slack User",
                    email: "unknown@slack"
                };
            }
        },
        revokeUrl: "https://slack.com/api/auth.revoke",
        refreshable: true
    },

    google: {
        name: "google",
        displayName: "Google Workspace",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/calendar.events"
        ],
        authParams: {
            access_type: "offline", // Required to get refresh token
            prompt: "consent" // Force consent screen to ensure refresh token
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-auth": {
        name: "google-auth",
        displayName: "Google Sign-In",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ],
        authParams: {
            access_type: "offline",
            prompt: "consent"
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-sheets": {
        name: "google-sheets",
        displayName: "Google Sheets",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        authParams: {
            access_type: "offline",
            prompt: "consent"
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google Sheets user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-calendar": {
        name: "google-calendar",
        displayName: "Google Calendar",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
        authParams: {
            access_type: "offline",
            prompt: "consent"
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google Calendar user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-docs": {
        name: "google-docs",
        displayName: "Google Docs",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/drive.file"
        ],
        authParams: {
            access_type: "offline",
            prompt: "consent"
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google Docs user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    notion: {
        name: "notion",
        displayName: "Notion",
        authUrl: "https://api.notion.com/v1/oauth/authorize",
        tokenUrl: "https://api.notion.com/v1/oauth/token",
        scopes: [], // Notion doesn't use traditional scopes
        authParams: {
            owner: "user"
        },
        clientId: config.oauth.notion.clientId,
        clientSecret: config.oauth.notion.clientSecret,
        redirectUri: getOAuthRedirectUri("notion"),
        tokenParams: {
            // Notion requires Basic Auth for token exchange
            grant_type: "authorization_code"
        },
        getUserInfo: async (accessToken: string) => {
            try {
                // Notion OAuth returns workspace info in the token response
                // We need to get the bot user info which has workspace details
                const response = await fetch("https://api.notion.com/v1/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Notion-Version": "2022-06-28"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    object?: string;
                    id?: string;
                    type?: string;
                    name?: string;
                    avatar_url?: string | null;
                    bot?: {
                        owner?: {
                            type?: string;
                            workspace?: boolean | { id?: string; name?: string };
                            user?: {
                                object?: string;
                                id?: string;
                                name?: string;
                                avatar_url?: string;
                                type?: string;
                                person?: { email?: string };
                            };
                        };
                        workspace_name?: string;
                    };
                    workspace_name?: string;
                };

                console.log("[OAuth] Notion user info response:", JSON.stringify(data, null, 2));

                // Extract workspace name and user info
                let workspaceName = "Notion Workspace";
                let userName = "Notion User";
                let userEmail = "unknown@notion";

                if (data.bot?.workspace_name) {
                    workspaceName = data.bot.workspace_name;
                } else if (data.workspace_name) {
                    workspaceName = data.workspace_name;
                }

                if (data.bot?.owner?.user) {
                    userName = data.bot.owner.user.name || userName;
                    userEmail = data.bot.owner.user.person?.email || userEmail;
                } else if (data.name) {
                    userName = data.name;
                }

                return {
                    workspace: workspaceName,
                    user: userName,
                    email: userEmail,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Notion user info:", error);
                return {
                    workspace: "Notion Workspace",
                    user: "Notion User",
                    email: "unknown@notion"
                };
            }
        },
        refreshable: true
    },

    airtable: {
        name: "airtable",
        displayName: "Airtable",
        authUrl: "https://airtable.com/oauth2/v1/authorize",
        tokenUrl: "https://airtable.com/oauth2/v1/token",
        scopes: [
            "data.records:read",
            "data.records:write",
            "schema.bases:read",
            "schema.bases:write",
            "data.recordComments:read",
            "data.recordComments:write",
            "webhook:manage"
        ],
        clientId: config.oauth.airtable.clientId,
        clientSecret: config.oauth.airtable.clientSecret,
        redirectUri: getOAuthRedirectUri("airtable"),
        pkceEnabled: true, // Airtable requires PKCE for enhanced security
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.airtable.com/v0/meta/whoami", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    scopes?: string[];
                };

                return {
                    userId: data.id || "unknown",
                    scopes: data.scopes || []
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Airtable user info:", error);
                return {
                    userId: "unknown",
                    scopes: []
                };
            }
        },
        refreshable: true
    },

    github: {
        name: "github",
        displayName: "GitHub",
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scopes: [
            "repo", // Full repository access
            "read:org", // Read organization membership
            "workflow", // Manage GitHub Actions workflows
            "write:discussion" // Write discussions
        ],
        clientId: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        redirectUri: getOAuthRedirectUri("github"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    login?: string;
                    id?: number;
                    email?: string;
                    name?: string;
                    avatar_url?: string;
                    company?: string;
                    location?: string;
                };

                return {
                    username: data.login || "unknown",
                    userId: data.id?.toString() || "unknown",
                    email: data.email || `${data.login}@github`,
                    name: data.name || data.login,
                    avatar: data.avatar_url,
                    company: data.company,
                    location: data.location
                };
            } catch (error) {
                console.error("[OAuth] Failed to get GitHub user info:", error);
                return {
                    username: "GitHub User",
                    userId: "unknown",
                    email: "unknown@github"
                };
            }
        },
        refreshable: false // GitHub OAuth tokens don't expire unless revoked
    },

    hubspot: {
        name: "hubspot",
        displayName: "HubSpot",
        authUrl: "https://app.hubspot.com/oauth/authorize",
        tokenUrl: "https://api.hubapi.com/oauth/v1/token",
        scopes: [
            // CRM Objects
            "crm.objects.contacts.read",
            "crm.objects.contacts.write",
            "crm.objects.companies.read",
            "crm.objects.companies.write",
            "crm.objects.deals.read",
            "crm.objects.deals.write",
            "crm.objects.tickets.read",
            "crm.objects.tickets.write",
            "crm.objects.quotes.read",
            "crm.objects.quotes.write",
            "crm.objects.line_items.read",
            "crm.objects.line_items.write",
            // Engagements
            "crm.objects.meetings.read",
            "crm.objects.meetings.write",
            "crm.objects.tasks.read",
            "crm.objects.tasks.write",
            "crm.objects.notes.read",
            "crm.objects.notes.write",
            "crm.objects.calls.read",
            "crm.objects.calls.write",
            "crm.objects.emails.read",
            "crm.objects.emails.write",
            // Schema & Lists
            "crm.schemas.contacts.read",
            "crm.schemas.companies.read",
            "crm.schemas.deals.read",
            "crm.lists.read",
            "crm.lists.write",
            // Marketing
            "content",
            "forms",
            "automation",
            // Files & Communication
            "files",
            "conversations.read",
            "conversations.write"
        ],
        clientId: config.oauth.hubspot.clientId,
        clientSecret: config.oauth.hubspot.clientSecret,
        redirectUri: getOAuthRedirectUri("hubspot"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch(
                    "https://api.hubapi.com/account-info/v3/api-usage/daily",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    portalId?: number;
                    timeZone?: string;
                };

                return {
                    portalId: data.portalId || "unknown",
                    timeZone: data.timeZone || "UTC"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get HubSpot account info:", error);
                return {
                    portalId: "unknown",
                    timeZone: "UTC"
                };
            }
        },
        refreshable: true
    },

    linear: {
        name: "linear",
        displayName: "Linear",
        authUrl: "https://linear.app/oauth/authorize",
        tokenUrl: "https://api.linear.app/oauth/token",
        scopes: ["read", "write"],
        clientId: config.oauth.linear.clientId,
        clientSecret: config.oauth.linear.clientSecret,
        redirectUri: getOAuthRedirectUri("linear"),
        tokenParams: {
            grant_type: "authorization_code"
        },
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.linear.app/graphql", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        query: "query { viewer { id name email } }"
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    data?: {
                        viewer?: {
                            id?: string;
                            name?: string;
                            email?: string;
                        };
                    };
                    errors?: Array<{ message: string }>;
                };

                if (result.errors && result.errors.length > 0) {
                    throw new Error(result.errors[0].message);
                }

                const viewer = result.data?.viewer;

                return {
                    userId: viewer?.id || "unknown",
                    name: viewer?.name || "Linear User",
                    email: viewer?.email || "unknown@linear.app"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Linear user info:", error);
                return {
                    userId: "unknown",
                    name: "Linear User",
                    email: "unknown@linear.app"
                };
            }
        },
        refreshable: true
    },

    figma: {
        name: "figma",
        displayName: "Figma",
        authUrl: "https://www.figma.com/oauth",
        tokenUrl: "https://api.figma.com/v1/oauth/token",
        scopes: [
            "file_content:read",
            "file_metadata:read",
            "file_comments:read",
            "file_comments:write",
            "webhooks:write"
        ],
        clientId: config.oauth.figma.clientId,
        clientSecret: config.oauth.figma.clientSecret,
        redirectUri: getOAuthRedirectUri("figma"),
        pkceEnabled: true,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.figma.com/v1/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    handle?: string;
                    email?: string;
                    img_url?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.handle || "Figma User",
                    email: data.email || "unknown@figma.com",
                    avatar: data.img_url
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Figma user info:", error);
                return {
                    userId: "unknown",
                    name: "Figma User",
                    email: "unknown@figma.com"
                };
            }
        },
        refreshable: true
    },

    "google-drive": {
        name: "google-drive",
        displayName: "Google Drive",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: ["https://www.googleapis.com/auth/drive"],
        authParams: {
            access_type: "offline",
            prompt: "consent"
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google Drive user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    gmail: {
        name: "gmail",
        displayName: "Gmail",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.compose"
        ],
        authParams: {
            access_type: "offline",
            prompt: "consent"
        },
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        redirectUri: getOAuthRedirectUri("google"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Use Gmail API to get user profile
                const response = await fetch(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    emailAddress?: string;
                    messagesTotal?: number;
                    threadsTotal?: number;
                    historyId?: string;
                };

                return {
                    email: data.emailAddress,
                    name: data.emailAddress, // Gmail profile doesn't have display name
                    userId: data.emailAddress
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Gmail user info:", error);
                return {
                    email: "unknown@gmail.com",
                    name: "Gmail User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    // ==========================================================================
    // Microsoft Platform Services (OneDrive, Excel, Word, etc.)
    // All use MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET credentials
    // Uses Microsoft Graph API with common tenant for multi-tenant support
    // ==========================================================================

    "microsoft-auth": {
        name: "microsoft-auth",
        displayName: "Microsoft Sign-In",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: ["User.Read", "offline_access"],
        authParams: {
            response_mode: "query",
            prompt: "consent"
        },
        clientId: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        redirectUri: getOAuthRedirectUri("microsoft"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    displayName?: string;
                    mail?: string;
                    userPrincipalName?: string;
                };

                return {
                    userId: data.id,
                    email: data.mail || data.userPrincipalName,
                    name: data.displayName,
                    picture: null // Microsoft profile photos require separate API call
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Microsoft user info:", error);
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    microsoft: {
        name: "microsoft",
        displayName: "Microsoft 365",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: ["User.Read", "Files.ReadWrite.All", "Sites.ReadWrite.All", "offline_access"],
        authParams: {
            response_mode: "query",
            prompt: "consent"
        },
        clientId: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        redirectUri: getOAuthRedirectUri("microsoft"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    displayName?: string;
                    mail?: string;
                    userPrincipalName?: string;
                };

                return {
                    userId: data.id,
                    email: data.mail || data.userPrincipalName,
                    name: data.displayName
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Microsoft 365 user info:", error);
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    "microsoft-onedrive": {
        name: "microsoft-onedrive",
        displayName: "Microsoft OneDrive",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: ["User.Read", "Files.ReadWrite", "offline_access"],
        authParams: {
            response_mode: "query",
            prompt: "consent"
        },
        clientId: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        redirectUri: getOAuthRedirectUri("microsoft"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    displayName?: string;
                    mail?: string;
                    userPrincipalName?: string;
                };

                return {
                    userId: data.id,
                    email: data.mail || data.userPrincipalName,
                    name: data.displayName
                };
            } catch (error) {
                console.error("[OAuth] Failed to get OneDrive user info:", error);
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    "microsoft-excel": {
        name: "microsoft-excel",
        displayName: "Microsoft Excel",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: ["User.Read", "Files.ReadWrite", "offline_access"],
        authParams: {
            response_mode: "query",
            prompt: "consent"
        },
        clientId: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        redirectUri: getOAuthRedirectUri("microsoft"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    displayName?: string;
                    mail?: string;
                    userPrincipalName?: string;
                };

                return {
                    userId: data.id,
                    email: data.mail || data.userPrincipalName,
                    name: data.displayName
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Excel user info:", error);
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    "microsoft-word": {
        name: "microsoft-word",
        displayName: "Microsoft Word",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: ["User.Read", "Files.ReadWrite", "offline_access"],
        authParams: {
            response_mode: "query",
            prompt: "consent"
        },
        clientId: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        redirectUri: getOAuthRedirectUri("microsoft"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    displayName?: string;
                    mail?: string;
                    userPrincipalName?: string;
                };

                return {
                    userId: data.id,
                    email: data.mail || data.userPrincipalName,
                    name: data.displayName
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Word user info:", error);
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    "microsoft-teams": {
        name: "microsoft-teams",
        displayName: "Microsoft Teams",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: [
            "User.Read",
            "Team.ReadBasic.All",
            "Channel.ReadBasic.All",
            "Channel.Create",
            "ChannelMessage.Send",
            "ChannelMessage.Read.All",
            "Chat.ReadWrite",
            "ChatMessage.Send",
            "ChatMessage.Read",
            "ChatMember.Read",
            "offline_access"
        ],
        authParams: {
            response_mode: "query",
            prompt: "consent"
        },
        clientId: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        redirectUri: getOAuthRedirectUri("microsoft"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    displayName?: string;
                    mail?: string;
                    userPrincipalName?: string;
                };

                return {
                    userId: data.id,
                    email: data.mail || data.userPrincipalName,
                    name: data.displayName
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Teams user info:", error);
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Meta Platform Services (WhatsApp, Instagram, Messenger, Facebook Ads)
    // All use same META_APP_ID and META_APP_SECRET credentials
    // ==========================================================================

    whatsapp: {
        name: "whatsapp",
        displayName: "WhatsApp Business",
        authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
            "business_management"
        ],
        authParams: {
            ...(config.oauth.meta.whatsappConfigId
                ? { config_id: config.oauth.meta.whatsappConfigId }
                : {})
        },
        clientId: config.oauth.meta.appId,
        clientSecret: config.oauth.meta.appSecret,
        redirectUri: getOAuthRedirectUri("whatsapp"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Get the WhatsApp Business Account info
                const response = await fetch("https://graph.facebook.com/v21.0/me?fields=id,name", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    name?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.name || "WhatsApp Business User"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get WhatsApp user info:", error);
                return {
                    userId: "unknown",
                    name: "WhatsApp Business User"
                };
            }
        },
        refreshable: true
    },

    instagram: {
        name: "instagram",
        displayName: "Instagram",
        authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        scopes: [
            "instagram_basic",
            "instagram_manage_messages",
            "instagram_content_publish",
            "pages_show_list",
            "pages_read_engagement",
            "pages_messaging"
        ],
        clientId: config.oauth.meta.appId,
        clientSecret: config.oauth.meta.appSecret,
        redirectUri: getOAuthRedirectUri("facebook"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Get basic user info
                const userResponse = await fetch(
                    "https://graph.facebook.com/v21.0/me?fields=id,name",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!userResponse.ok) {
                    throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`);
                }

                const userData = (await userResponse.json()) as {
                    id?: string;
                    name?: string;
                };

                // Get pages with Instagram business accounts
                const pagesResponse = await fetch(
                    "https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!pagesResponse.ok) {
                    throw new Error(`Failed to fetch pages: HTTP ${pagesResponse.status}`);
                }

                const pagesData = (await pagesResponse.json()) as {
                    data?: Array<{
                        id: string;
                        name: string;
                        access_token: string;
                        instagram_business_account?: {
                            id: string;
                            username?: string;
                            name?: string;
                            profile_picture_url?: string;
                        };
                    }>;
                };

                // Find pages with Instagram business accounts
                const pagesWithInstagram = (pagesData.data || []).filter(
                    (page) => page.instagram_business_account
                );

                if (pagesWithInstagram.length === 0) {
                    console.warn("[OAuth] No Instagram Business Account found linked to any page");
                }

                // Exchange for long-lived page tokens
                const pages = await Promise.all(
                    pagesWithInstagram.map(async (page) => {
                        // Page tokens derived from long-lived user tokens are automatically long-lived
                        return {
                            pageId: page.id,
                            pageName: page.name,
                            pageAccessToken: page.access_token,
                            instagramAccountId: page.instagram_business_account?.id,
                            instagramUsername: page.instagram_business_account?.username,
                            instagramName: page.instagram_business_account?.name,
                            instagramProfilePicture:
                                page.instagram_business_account?.profile_picture_url
                        };
                    })
                );

                // Use the first page with Instagram as primary
                const primaryPage = pages[0];

                return {
                    userId: userData.id || "unknown",
                    name: userData.name || "Instagram User",
                    user: primaryPage?.instagramUsername || userData.name || "Instagram Account",
                    pages,
                    // Primary account info for easy access
                    pageId: primaryPage?.pageId,
                    pageName: primaryPage?.pageName,
                    pageAccessToken: primaryPage?.pageAccessToken,
                    instagramAccountId: primaryPage?.instagramAccountId,
                    instagramUsername: primaryPage?.instagramUsername
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Instagram user info:", error);
                return {
                    userId: "unknown",
                    name: "Instagram User"
                };
            }
        },
        refreshable: true
    },

    facebook: {
        name: "facebook",
        displayName: "Facebook",
        authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        scopes: [
            "pages_messaging",
            "pages_manage_metadata",
            "pages_read_engagement",
            "pages_show_list"
        ],
        clientId: config.oauth.meta.appId,
        clientSecret: config.oauth.meta.appSecret,
        redirectUri: getOAuthRedirectUri("facebook"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Get basic user info
                const userResponse = await fetch(
                    "https://graph.facebook.com/v21.0/me?fields=id,name",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!userResponse.ok) {
                    throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`);
                }

                const userData = (await userResponse.json()) as {
                    id?: string;
                    name?: string;
                };

                // Get pages the user manages (Facebook uses Pages for Messenger communication)
                const pagesResponse = await fetch(
                    "https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,picture{url}",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!pagesResponse.ok) {
                    throw new Error(`Failed to fetch pages: HTTP ${pagesResponse.status}`);
                }

                const pagesData = (await pagesResponse.json()) as {
                    data?: Array<{
                        id: string;
                        name: string;
                        access_token: string;
                        category?: string;
                        picture?: {
                            data?: {
                                url?: string;
                            };
                        };
                    }>;
                };

                if (!pagesData.data || pagesData.data.length === 0) {
                    console.warn("[OAuth] No Facebook Pages found");
                }

                // Map pages with their access tokens
                const pages = (pagesData.data || []).map((page) => ({
                    pageId: page.id,
                    pageName: page.name,
                    pageAccessToken: page.access_token,
                    category: page.category,
                    pictureUrl: page.picture?.data?.url
                }));

                // Use the first page as primary
                const primaryPage = pages[0];

                return {
                    userId: userData.id || "unknown",
                    name: userData.name || "Facebook User",
                    user: primaryPage?.pageName || userData.name || "Facebook Page",
                    pages,
                    // Primary page info for easy access
                    pageId: primaryPage?.pageId,
                    pageName: primaryPage?.pageName,
                    pageAccessToken: primaryPage?.pageAccessToken
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Facebook user info:", error);
                return {
                    userId: "unknown",
                    name: "Facebook User"
                };
            }
        },
        refreshable: true
    },

    "facebook-ads": {
        name: "facebook-ads",
        displayName: "Facebook Ads",
        authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        scopes: ["ads_management", "ads_read", "business_management"],
        clientId: config.oauth.meta.appId,
        clientSecret: config.oauth.meta.appSecret,
        redirectUri: getOAuthRedirectUri("facebook"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://graph.facebook.com/v21.0/me?fields=id,name", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    name?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.name || "Facebook Ads User"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Facebook Ads user info:", error);
                return {
                    userId: "unknown",
                    name: "Facebook Ads User"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Zendesk Support
    // NOTE: Zendesk requires subdomain in OAuth URLs. The {subdomain} placeholder
    // is replaced at runtime based on user-provided subdomain.
    // ==========================================================================

    // ==========================================================================
    // Salesforce CRM
    // Uses OAuth 2.0 Web Server Flow with production login endpoint
    // ==========================================================================

    salesforce: {
        name: "salesforce",
        displayName: "Salesforce",
        authUrl: "https://login.salesforce.com/services/oauth2/authorize",
        tokenUrl: "https://login.salesforce.com/services/oauth2/token",
        scopes: ["api", "refresh_token", "id"],
        authParams: {
            prompt: "consent" // Force consent to ensure we get refresh token
        },
        clientId: config.oauth.salesforce.clientId,
        clientSecret: config.oauth.salesforce.clientSecret,
        redirectUri: getOAuthRedirectUri("salesforce"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Use Salesforce's userinfo endpoint which returns instance URLs
                const response = await fetch(
                    "https://login.salesforce.com/services/oauth2/userinfo",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    sub?: string;
                    user_id?: string;
                    organization_id?: string;
                    name?: string;
                    email?: string;
                    nickname?: string;
                    picture?: string;
                    urls?: {
                        enterprise?: string;
                        metadata?: string;
                        partner?: string;
                        rest?: string;
                        sobjects?: string;
                        search?: string;
                        query?: string;
                        profile?: string;
                        custom_domain?: string;
                    };
                };

                // Extract instance URL from the urls object
                // The 'rest' URL format is: https://instance.salesforce.com/services/data/v{version}/
                let instanceUrl = "";
                if (data.urls?.rest) {
                    // Extract base URL (everything before /services/)
                    const restUrl = data.urls.rest;
                    const servicesIndex = restUrl.indexOf("/services/");
                    if (servicesIndex > 0) {
                        instanceUrl = restUrl.substring(0, servicesIndex);
                    }
                } else if (data.urls?.profile) {
                    // Fallback: extract from profile URL
                    // Format: https://instance.salesforce.com/005xxxxx
                    const profileUrl = data.urls.profile;
                    const match = profileUrl.match(/^(https:\/\/[^/]+)/);
                    if (match) {
                        instanceUrl = match[1];
                    }
                }

                return {
                    userId: data.user_id || "unknown",
                    organizationId: data.organization_id,
                    name: data.name || "Salesforce User",
                    email: data.email || "unknown@salesforce",
                    nickname: data.nickname,
                    picture: data.picture,
                    instanceUrl, // Critical: needed for all API calls
                    urls: data.urls
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Salesforce user info:", error);
                return {
                    userId: "unknown",
                    name: "Salesforce User",
                    email: "unknown@salesforce",
                    instanceUrl: ""
                };
            }
        },
        revokeUrl: "https://login.salesforce.com/services/oauth2/revoke",
        refreshable: true
    },

    // ==========================================================================
    // Zendesk Support
    // NOTE: Zendesk requires subdomain in OAuth URLs. The {subdomain} placeholder
    // is replaced at runtime based on user-provided subdomain.
    // ==========================================================================

    zendesk: {
        name: "zendesk",
        displayName: "Zendesk",
        // Template URLs - {subdomain} must be replaced at runtime
        authUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new",
        tokenUrl: "https://{subdomain}.zendesk.com/oauth/tokens",
        scopes: [
            "read",
            "write",
            "tickets:read",
            "tickets:write",
            "users:read",
            "users:write",
            "hc:read",
            "hc:write"
        ],
        clientId: config.oauth.zendesk.clientId,
        clientSecret: config.oauth.zendesk.clientSecret,
        redirectUri: getOAuthRedirectUri("zendesk"),
        // PKCE required for Public OAuth clients in Zendesk
        pkceEnabled: true,
        getUserInfo: async (accessToken: string, subdomain?: string) => {
            try {
                if (!subdomain) {
                    throw new Error("Zendesk subdomain is required");
                }

                const response = await fetch(
                    `https://${subdomain}.zendesk.com/api/v2/users/me.json`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    user?: {
                        id?: number;
                        name?: string;
                        email?: string;
                        role?: string;
                    };
                };

                return {
                    userId: data.user?.id?.toString() || "unknown",
                    name: data.user?.name || "Zendesk User",
                    email: data.user?.email || "unknown@zendesk",
                    role: data.user?.role || "end-user",
                    subdomain
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Zendesk user info:", error);
                return {
                    userId: "unknown",
                    name: "Zendesk User",
                    email: "unknown@zendesk",
                    subdomain
                };
            }
        },
        refreshable: true
    },

    apollo: {
        name: "apollo",
        displayName: "Apollo.io",
        authUrl: "https://app.apollo.io/#/oauth/authorize",
        tokenUrl: "https://app.apollo.io/api/v1/oauth/token",
        scopes: ["read_user_profile", "app_scopes"],
        clientId: config.oauth.apollo.clientId,
        clientSecret: config.oauth.apollo.clientSecret,
        redirectUri: getOAuthRedirectUri("apollo"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://app.apollo.io/api/v1/users/api_profile", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    user?: {
                        id?: string;
                        email?: string;
                        first_name?: string;
                        last_name?: string;
                    };
                    team?: {
                        id?: string;
                        name?: string;
                    };
                };

                return {
                    userId: data.user?.id || "unknown",
                    email: data.user?.email || "unknown@apollo.io",
                    name:
                        `${data.user?.first_name || ""} ${data.user?.last_name || ""}`.trim() ||
                        "Apollo User",
                    teamId: data.team?.id,
                    teamName: data.team?.name
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Apollo user info:", error);
                return {
                    userId: "unknown",
                    email: "unknown@apollo.io",
                    name: "Apollo User"
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
    },

    jira: {
        name: "jira",
        displayName: "Jira Cloud",
        authUrl: "https://auth.atlassian.com/authorize",
        tokenUrl: "https://auth.atlassian.com/oauth/token",
        scopes: [
            "read:jira-work",
            "write:jira-work",
            "read:jira-user",
            "manage:jira-webhook",
            "offline_access"
        ],
        authParams: {
            audience: "api.atlassian.com",
            prompt: "consent"
        },
        clientId: config.oauth.jira.clientId,
        clientSecret: config.oauth.jira.clientSecret,
        redirectUri: getOAuthRedirectUri("jira"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Get accessible Jira sites (cloudIds)
                const response = await fetch(
                    "https://api.atlassian.com/oauth/token/accessible-resources",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: "application/json"
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const sites = (await response.json()) as Array<{
                    id: string;
                    url: string;
                    name: string;
                    scopes: string[];
                    avatarUrl?: string;
                }>;

                return {
                    sites: sites.map((s) => ({
                        cloudId: s.id,
                        url: s.url,
                        name: s.name,
                        scopes: s.scopes,
                        avatarUrl: s.avatarUrl
                    }))
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Jira accessible resources:", error);
                return {
                    sites: []
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
    },

    // ==========================================================================
    // Shopify E-commerce
    // NOTE: Shopify requires shop name in OAuth URLs. The {shop} placeholder
    // is replaced at runtime based on user-provided shop name (like Zendesk subdomain).
    // ==========================================================================

    shopify: {
        name: "shopify",
        displayName: "Shopify",
        // Template URLs - {shop} must be replaced at runtime with shop name
        authUrl: "https://{shop}.myshopify.com/admin/oauth/authorize",
        tokenUrl: "https://{shop}.myshopify.com/admin/oauth/access_token",
        scopes: [
            "read_products",
            "write_products",
            "read_orders",
            "write_orders",
            "read_customers",
            "write_customers",
            "read_inventory",
            "write_inventory",
            "read_fulfillments",
            "write_fulfillments"
        ],
        clientId: config.oauth.shopify.clientId,
        clientSecret: config.oauth.shopify.clientSecret,
        redirectUri: getOAuthRedirectUri("shopify"),
        getUserInfo: async (accessToken: string, shop?: string) => {
            try {
                if (!shop) {
                    throw new Error("Shopify shop name is required");
                }

                // Fetch shop info using Shop API
                const response = await fetch(
                    `https://${shop}.myshopify.com/admin/api/2025-01/shop.json`,
                    {
                        headers: {
                            "X-Shopify-Access-Token": accessToken,
                            "Content-Type": "application/json"
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    shop?: {
                        id?: number;
                        name?: string;
                        email?: string;
                        domain?: string;
                        myshopify_domain?: string;
                        plan_name?: string;
                        shop_owner?: string;
                        currency?: string;
                        timezone?: string;
                    };
                };

                return {
                    shopId: data.shop?.id?.toString() || "unknown",
                    shopName: data.shop?.name || "Shopify Store",
                    email: data.shop?.email || "unknown@shopify",
                    domain: data.shop?.domain,
                    myshopifyDomain: data.shop?.myshopify_domain,
                    plan: data.shop?.plan_name,
                    owner: data.shop?.shop_owner,
                    currency: data.shop?.currency,
                    timezone: data.shop?.timezone,
                    shop // Store shop name for API calls
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Shopify shop info:", error);
                return {
                    shopId: "unknown",
                    shopName: "Shopify Store",
                    email: "unknown@shopify",
                    shop
                };
            }
        },
        refreshable: false // Shopify offline tokens don't expire unless app is uninstalled
    },

    // ==========================================================================
    // Typeform Forms & Surveys
    // ==========================================================================

    typeform: {
        name: "typeform",
        displayName: "Typeform",
        authUrl: "https://api.typeform.com/oauth/authorize",
        tokenUrl: "https://api.typeform.com/oauth/token",
        scopes: ["accounts:read", "forms:read", "responses:read", "workspaces:read", "offline"],
        clientId: config.oauth.typeform.clientId,
        clientSecret: config.oauth.typeform.clientSecret,
        redirectUri: getOAuthRedirectUri("typeform"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.typeform.com/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    user_id?: string;
                    email?: string;
                    alias?: string;
                    language?: string;
                };

                return {
                    userId: data.user_id || "unknown",
                    email: data.email || "unknown@typeform",
                    alias: data.alias,
                    language: data.language
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Typeform user info:", error);
                return {
                    userId: "unknown",
                    email: "unknown@typeform"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Dropbox File Storage
    // ==========================================================================

    dropbox: {
        name: "dropbox",
        displayName: "Dropbox",
        authUrl: "https://www.dropbox.com/oauth2/authorize",
        tokenUrl: "https://api.dropboxapi.com/oauth2/token",
        scopes: [
            "account_info.read",
            "files.content.write",
            "files.content.read",
            "files.metadata.write",
            "files.metadata.read",
            "sharing.write",
            "sharing.read"
        ],
        authParams: {
            token_access_type: "offline" // Required to get refresh token
        },
        clientId: config.oauth.dropbox.clientId,
        clientSecret: config.oauth.dropbox.clientSecret,
        redirectUri: getOAuthRedirectUri("dropbox"),
        pkceEnabled: true, // Dropbox recommends PKCE
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch(
                    "https://api.dropboxapi.com/2/users/get_current_account",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(null)
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    account_id?: string;
                    name?: { display_name?: string };
                    email?: string;
                };

                return {
                    userId: data.account_id || "unknown",
                    name: data.name?.display_name || "Dropbox User",
                    email: data.email || "unknown@dropbox"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Dropbox user info:", error);
                return {
                    userId: "unknown",
                    name: "Dropbox User",
                    email: "unknown@dropbox"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Box File Storage
    // ==========================================================================

    box: {
        name: "box",
        displayName: "Box",
        authUrl: "https://account.box.com/api/oauth2/authorize",
        tokenUrl: "https://api.box.com/oauth2/token",
        scopes: [], // Box uses application scopes configured in Developer Console
        clientId: config.oauth.box.clientId,
        clientSecret: config.oauth.box.clientSecret,
        redirectUri: getOAuthRedirectUri("box"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.box.com/2.0/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    name?: string;
                    login?: string;
                    space_amount?: number;
                    space_used?: number;
                    avatar_url?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.name || "Box User",
                    email: data.login || "unknown@box.com",
                    spaceAmount: data.space_amount,
                    spaceUsed: data.space_used,
                    avatar: data.avatar_url
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Box user info:", error);
                return {
                    userId: "unknown",
                    name: "Box User",
                    email: "unknown@box.com"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // X (Twitter) - Social Media
    // Uses OAuth 2.0 with PKCE (Proof Key for Code Exchange)
    // ==========================================================================

    twitter: {
        name: "twitter",
        displayName: "X (Twitter)",
        authUrl: "https://x.com/i/oauth2/authorize",
        tokenUrl: "https://api.x.com/2/oauth2/token",
        scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
        clientId: config.oauth.twitter.clientId,
        clientSecret: config.oauth.twitter.clientSecret,
        redirectUri: getOAuthRedirectUri("twitter"),
        pkceEnabled: true, // X requires PKCE
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch(
                    "https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    data?: {
                        id?: string;
                        name?: string;
                        username?: string;
                        profile_image_url?: string;
                    };
                };

                return {
                    userId: result.data?.id || "unknown",
                    name: result.data?.name || "X User",
                    username: result.data?.username || "unknown",
                    user: `@${result.data?.username || "unknown"}`,
                    email: `@${result.data?.username || "unknown"}`,
                    avatar: result.data?.profile_image_url
                };
            } catch (error) {
                console.error("[OAuth] Failed to get X user info:", error);
                return {
                    userId: "unknown",
                    name: "X User",
                    user: "@unknown",
                    email: "@unknown"
                };
            }
        },
        revokeUrl: "https://api.x.com/2/oauth2/revoke",
        refreshable: true
    },

    // ==========================================================================
    // LinkedIn - Professional Network & Social Media
    // Uses OAuth 2.0 with OpenID Connect
    // ==========================================================================

    linkedin: {
        name: "linkedin",
        displayName: "LinkedIn",
        authUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        scopes: ["openid", "profile", "email", "w_member_social"],
        clientId: config.oauth.linkedin.clientId,
        clientSecret: config.oauth.linkedin.clientSecret,
        redirectUri: getOAuthRedirectUri("linkedin"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Use LinkedIn's OpenID Connect userinfo endpoint
                const response = await fetch("https://api.linkedin.com/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    sub?: string;
                    name?: string;
                    given_name?: string;
                    family_name?: string;
                    picture?: string;
                    email?: string;
                    email_verified?: boolean;
                    locale?: string;
                };

                return {
                    userId: data.sub || "unknown",
                    name: data.name || "LinkedIn User",
                    firstName: data.given_name,
                    lastName: data.family_name,
                    email: data.email || "unknown@linkedin.com",
                    emailVerified: data.email_verified,
                    picture: data.picture,
                    locale: data.locale,
                    user: data.name || data.email || "LinkedIn User"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get LinkedIn user info:", error);
                return {
                    userId: "unknown",
                    name: "LinkedIn User",
                    email: "unknown@linkedin.com",
                    user: "LinkedIn User"
                };
            }
        },
        refreshable: true
    }
};

/**
 * Get OAuth provider configuration by name
 * @throws Error if provider not found
 */
export function getOAuthProvider(provider: string): OAuthProvider {
    const config = OAUTH_PROVIDERS[provider];

    if (!config) {
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    // Validate configuration
    if (!config.clientId || !config.clientSecret) {
        throw new Error(
            `OAuth provider ${provider} is not configured. ` +
                `Please set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET environment variables.`
        );
    }

    return config;
}

/**
 * List all available OAuth providers
 */
export function listOAuthProviders() {
    return Object.values(OAUTH_PROVIDERS).map((provider) => ({
        name: provider.name,
        displayName: provider.displayName,
        scopes: provider.scopes,
        configured: !!(provider.clientId && provider.clientSecret)
    }));
}

/**
 * Check if a provider is configured (has client ID and secret)
 */
export function isProviderConfigured(provider: string): boolean {
    const config = OAUTH_PROVIDERS[provider];
    if (!config) return false;
    return !!(config.clientId && config.clientSecret);
}
