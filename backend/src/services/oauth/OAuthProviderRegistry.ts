import { config, getOAuthRedirectUri } from "../../core/config";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("OAuthProviderRegistry");

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
                logger.error({ err: error }, "Failed to get Slack user info");
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
                logger.error({ err: error }, "Failed to get Google user info");
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
                logger.error({ err: error }, "Failed to get Google auth user info");
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
                logger.error({ err: error }, "Failed to get Google Sheets user info");
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
                logger.error({ err: error }, "Failed to get Google Calendar user info");
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
                logger.error({ err: error }, "Failed to get Google Docs user info");
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-slides": {
        name: "google-slides",
        displayName: "Google Slides",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/presentations",
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
                logger.error({ err: error }, "Failed to get Google Slides user info");
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-forms": {
        name: "google-forms",
        displayName: "Google Forms",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/forms.body",
            "https://www.googleapis.com/auth/forms.responses.readonly"
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
                logger.error({ err: error }, "Failed to get Google Forms user info");
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

                logger.info({ data }, "Notion user info response");

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
                logger.error({ err: error }, "Failed to get Notion user info");
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
                logger.error({ err: error }, "Failed to get Airtable user info");
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
                logger.error({ err: error }, "Failed to get GitHub user info");
                return {
                    username: "GitHub User",
                    userId: "unknown",
                    email: "unknown@github"
                };
            }
        },
        refreshable: false // GitHub OAuth tokens don't expire unless revoked
    },

    gitlab: {
        name: "gitlab",
        displayName: "GitLab",
        authUrl: "https://gitlab.com/oauth/authorize",
        tokenUrl: "https://gitlab.com/oauth/token",
        scopes: ["api", "read_user", "read_repository", "write_repository"],
        clientId: config.oauth.gitlab.clientId,
        clientSecret: config.oauth.gitlab.clientSecret,
        redirectUri: getOAuthRedirectUri("gitlab"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://gitlab.com/api/v4/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    username?: string;
                    id?: number;
                    email?: string;
                    name?: string;
                    avatar_url?: string;
                    web_url?: string;
                };

                return {
                    username: data.username || "unknown",
                    userId: data.id?.toString() || "unknown",
                    email: data.email || `${data.username}@gitlab`,
                    name: data.name || data.username,
                    avatar: data.avatar_url,
                    profileUrl: data.web_url
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get GitLab user info");
                return {
                    username: "GitLab User",
                    userId: "unknown",
                    email: "unknown@gitlab"
                };
            }
        },
        refreshable: true
    },

    bitbucket: {
        name: "bitbucket",
        displayName: "Bitbucket",
        authUrl: "https://bitbucket.org/site/oauth2/authorize",
        tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
        scopes: [
            "repository",
            "repository:write",
            "pullrequest",
            "pullrequest:write",
            "pipeline",
            "pipeline:write",
            "account"
        ],
        clientId: config.oauth.bitbucket.clientId,
        clientSecret: config.oauth.bitbucket.clientSecret,
        redirectUri: getOAuthRedirectUri("bitbucket"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.bitbucket.org/2.0/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    username?: string;
                    uuid?: string;
                    display_name?: string;
                    links?: {
                        avatar?: { href?: string };
                    };
                };

                // Bitbucket may not return email in basic user endpoint
                // It needs a separate call to /user/emails
                return {
                    username: data.username || "unknown",
                    userId: data.uuid || "unknown",
                    email: `${data.username}@bitbucket`,
                    name: data.display_name || data.username,
                    avatar: data.links?.avatar?.href
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Bitbucket user info");
                return {
                    username: "Bitbucket User",
                    userId: "unknown",
                    email: "unknown@bitbucket"
                };
            }
        },
        refreshable: true
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
                logger.error({ err: error }, "Failed to get HubSpot account info");
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
                logger.error({ err: error }, "Failed to get Linear user info");
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
                logger.error({ err: error }, "Failed to get Figma user info");
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
                logger.error({ err: error }, "Failed to get Google Drive user info");
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    "google-cloud-storage": {
        name: "google-cloud-storage",
        displayName: "Google Cloud Storage",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: ["https://www.googleapis.com/auth/devstorage.full_control"],
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
                logger.error({ err: error }, "Failed to get Google Cloud Storage user info");
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
                logger.error({ err: error }, "Failed to get Gmail user info");
                return {
                    email: "unknown@gmail.com",
                    name: "Gmail User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    youtube: {
        name: "youtube",
        displayName: "YouTube",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/youtube",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.force-ssl"
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
                // Fetch authenticated user's YouTube channel info
                const response = await fetch(
                    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
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
                    items?: Array<{
                        id?: string;
                        snippet?: {
                            title?: string;
                            description?: string;
                            customUrl?: string;
                            thumbnails?: {
                                default?: { url?: string };
                            };
                        };
                        statistics?: {
                            subscriberCount?: string;
                            videoCount?: string;
                            viewCount?: string;
                        };
                    }>;
                };

                const channel = data.items?.[0];

                return {
                    channelId: channel?.id,
                    channelTitle: channel?.snippet?.title,
                    channelDescription: channel?.snippet?.description,
                    customUrl: channel?.snippet?.customUrl,
                    thumbnailUrl: channel?.snippet?.thumbnails?.default?.url,
                    subscriberCount: channel?.statistics?.subscriberCount,
                    videoCount: channel?.statistics?.videoCount,
                    viewCount: channel?.statistics?.viewCount,
                    email: channel?.snippet?.title || "YouTube User",
                    user:
                        channel?.snippet?.customUrl || channel?.snippet?.title || "YouTube Channel"
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get YouTube channel info");
                return {
                    email: "unknown@youtube",
                    user: "YouTube User",
                    channelTitle: "YouTube User"
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
                logger.error({ err: error }, "Failed to get Microsoft user info");
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
                logger.error({ err: error }, "Failed to get Microsoft 365 user info");
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
                logger.error({ err: error }, "Failed to get OneDrive user info");
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
                logger.error({ err: error }, "Failed to get Excel user info");
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
                logger.error({ err: error }, "Failed to get Word user info");
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    "microsoft-powerpoint": {
        name: "microsoft-powerpoint",
        displayName: "Microsoft PowerPoint",
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
                logger.error({ err: error }, "Failed to get PowerPoint user info");
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
                logger.error({ err: error }, "Failed to get Teams user info");
                return {
                    email: "unknown@microsoft",
                    name: "Microsoft User"
                };
            }
        },
        refreshable: true
    },

    "microsoft-outlook": {
        name: "microsoft-outlook",
        displayName: "Microsoft Outlook",
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes: [
            "User.Read",
            "Mail.Read",
            "Mail.ReadWrite",
            "Mail.Send",
            "Calendars.Read",
            "Calendars.ReadWrite",
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
                logger.error({ err: error }, "Failed to get Outlook user info");
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
                logger.error({ err: error }, "Failed to get WhatsApp user info");
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
                    logger.warn("No Instagram Business Account found linked to any page");
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
                logger.error({ err: error }, "Failed to get Instagram user info");
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
                    logger.warn("No Facebook Pages found");
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
                logger.error({ err: error }, "Failed to get Facebook user info");
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
                logger.error({ err: error }, "Failed to get Facebook Ads user info");
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
                logger.error({ err: error }, "Failed to get Salesforce user info");
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
                logger.error({ err: error }, "Failed to get Zendesk user info");
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
                logger.error({ err: error }, "Failed to get Apollo user info");
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
                logger.error({ err: error }, "Failed to get Jira accessible resources");
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
                logger.error({ err: error }, "Failed to get Shopify shop info");
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
                logger.error({ err: error }, "Failed to get Typeform user info");
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
                logger.error({ err: error }, "Failed to get Dropbox user info");
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
                logger.error({ err: error }, "Failed to get Box user info");
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
                logger.error({ err: error }, "Failed to get X user info");
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
                logger.error({ err: error }, "Failed to get LinkedIn user info");
                return {
                    userId: "unknown",
                    name: "LinkedIn User",
                    email: "unknown@linkedin.com",
                    user: "LinkedIn User"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Reddit - Social Media
    // Uses OAuth 2.0 with HTTP Basic Auth for token exchange
    // ==========================================================================

    reddit: {
        name: "reddit",
        displayName: "Reddit",
        authUrl: "https://www.reddit.com/api/v1/authorize",
        tokenUrl: "https://www.reddit.com/api/v1/access_token",
        scopes: [
            "identity", // User identity
            "read", // Read content
            "submit", // Submit posts
            "vote", // Vote on content
            "save", // Save posts/comments
            "edit", // Edit submissions
            "history" // Access history
        ],
        authParams: {
            duration: "permanent" // Required to get refresh token
        },
        clientId: config.oauth.reddit.clientId,
        clientSecret: config.oauth.reddit.clientSecret,
        redirectUri: getOAuthRedirectUri("reddit"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://oauth.reddit.com/api/v1/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "User-Agent": "FlowMaestro/1.0 (by /u/flowmaestro)"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    name?: string;
                    icon_img?: string;
                    created_utc?: number;
                    total_karma?: number;
                    link_karma?: number;
                    comment_karma?: number;
                };

                return {
                    userId: data.id || "unknown",
                    username: data.name || "Reddit User",
                    user: `u/${data.name || "unknown"}`,
                    email: `${data.name || "unknown"}@reddit`,
                    avatar: data.icon_img,
                    karma: data.total_karma,
                    linkKarma: data.link_karma,
                    commentKarma: data.comment_karma
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Reddit user info");
                return {
                    userId: "unknown",
                    username: "Reddit User",
                    user: "u/unknown",
                    email: "unknown@reddit"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Discord - Communication & Gaming Platform
    // Uses OAuth 2.0 for user authentication, Bot token for actions
    // ==========================================================================

    discord: {
        name: "discord",
        displayName: "Discord",
        authUrl: "https://discord.com/oauth2/authorize",
        tokenUrl: "https://discord.com/api/oauth2/token",
        scopes: [
            "identify", // Access user's ID, username, avatar
            "email", // Access user's email
            "guilds" // Access list of guilds user is in
        ],
        clientId: config.oauth.discord.clientId,
        clientSecret: config.oauth.discord.clientSecret,
        redirectUri: getOAuthRedirectUri("discord"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://discord.com/api/v10/users/@me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    username?: string;
                    discriminator?: string;
                    global_name?: string | null;
                    avatar?: string | null;
                    email?: string | null;
                    verified?: boolean;
                };

                // Generate avatar URL if avatar hash exists
                const avatarUrl = data.avatar
                    ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${data.avatar.startsWith("a_") ? "gif" : "png"}`
                    : null;

                return {
                    userId: data.id || "unknown",
                    username: data.username || "Discord User",
                    globalName: data.global_name,
                    discriminator: data.discriminator,
                    email: data.email || `${data.username}@discord`,
                    avatar: avatarUrl,
                    verified: data.verified,
                    user: data.global_name || data.username || "Discord User"
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Discord user info");
                return {
                    userId: "unknown",
                    username: "Discord User",
                    email: "unknown@discord",
                    user: "Discord User"
                };
            }
        },
        revokeUrl: "https://discord.com/api/oauth2/token/revoke",
        refreshable: true,
        pkceEnabled: false
    },

    pipedrive: {
        name: "pipedrive",
        displayName: "Pipedrive",
        authUrl: "https://oauth.pipedrive.com/oauth/authorize",
        tokenUrl: "https://oauth.pipedrive.com/oauth/token",
        scopes: [
            "base",
            "deals:full",
            "contacts:full",
            "organizations:full",
            "leads:full",
            "activities:full",
            "products:read"
        ],
        clientId: config.oauth.pipedrive.clientId,
        clientSecret: config.oauth.pipedrive.clientSecret,
        redirectUri: getOAuthRedirectUri("pipedrive"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.pipedrive.com/v1/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    success: boolean;
                    data?: {
                        id?: number;
                        name?: string;
                        email?: string;
                        company_id?: number;
                        company_name?: string;
                    };
                };

                if (!result.success || !result.data) {
                    throw new Error("Failed to get user info from Pipedrive");
                }

                return {
                    userId: String(result.data.id || "unknown"),
                    name: result.data.name || "Pipedrive User",
                    email: result.data.email || "unknown@pipedrive",
                    companyId: result.data.company_id,
                    companyName: result.data.company_name,
                    user: result.data.name || result.data.email || "Pipedrive User"
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to fetch Pipedrive user info");
                return {
                    userId: "unknown",
                    name: "Pipedrive User",
                    email: "unknown@pipedrive",
                    user: "Pipedrive User"
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
    },

    close: {
        name: "close",
        displayName: "Close",
        authUrl: "https://app.close.com/oauth2/authorize/",
        tokenUrl: "https://api.close.com/oauth2/token/",
        scopes: ["all.full_access", "offline_access"],
        clientId: config.oauth.close.clientId,
        clientSecret: config.oauth.close.clientSecret,
        redirectUri: getOAuthRedirectUri("close"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.close.com/api/v1/me/", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    email?: string;
                    first_name?: string;
                    last_name?: string;
                    organizations?: Array<{ id: string; name: string }>;
                };

                const fullName =
                    [data.first_name, data.last_name].filter(Boolean).join(" ") || "Close User";

                return {
                    userId: data.id || "unknown",
                    name: fullName,
                    email: data.email || "unknown@close",
                    organizations: data.organizations,
                    user: fullName
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to fetch Close user info");
                return {
                    userId: "unknown",
                    name: "Close User",
                    email: "unknown@close",
                    user: "Close User"
                };
            }
        },
        revokeUrl: "https://api.close.com/oauth2/revoke/",
        refreshable: true,
        pkceEnabled: false
    },

    // ==========================================================================
    // TikTok - Social Media
    // Uses OAuth 2.0 with client_key parameter (not standard client_id)
    // ==========================================================================

    tiktok: {
        name: "tiktok",
        displayName: "TikTok",
        authUrl: "https://www.tiktok.com/v2/auth/authorize/",
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        scopes: ["user.info.basic", "user.info.profile", "video.list"],
        clientId: config.oauth.tiktok.clientId,
        clientSecret: config.oauth.tiktok.clientSecret,
        redirectUri: getOAuthRedirectUri("tiktok"),
        authParams: {
            client_key: config.oauth.tiktok.clientId // TikTok uses client_key instead of client_id
        },
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch(
                    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
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
                        user?: {
                            open_id?: string;
                            union_id?: string;
                            avatar_url?: string;
                            display_name?: string;
                        };
                    };
                    error?: {
                        code?: string;
                        message?: string;
                    };
                };

                if (result.error?.code) {
                    throw new Error(result.error.message || "TikTok API error");
                }

                return {
                    userId: result.data?.user?.open_id || "unknown",
                    name: result.data?.user?.display_name || "TikTok User",
                    user: result.data?.user?.display_name || "TikTok User",
                    avatar: result.data?.user?.avatar_url
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get TikTok user info");
                return {
                    userId: "unknown",
                    name: "TikTok User",
                    user: "TikTok User"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // Pinterest - Social Media
    // Uses OAuth 2.0 with Basic Auth for token exchange
    // ==========================================================================

    pinterest: {
        name: "pinterest",
        displayName: "Pinterest",
        authUrl: "https://www.pinterest.com/oauth/",
        tokenUrl: "https://api.pinterest.com/v5/oauth/token",
        scopes: ["user_accounts:read", "boards:read", "pins:read", "pins:write"],
        clientId: config.oauth.pinterest.clientId,
        clientSecret: config.oauth.pinterest.clientSecret,
        redirectUri: getOAuthRedirectUri("pinterest"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.pinterest.com/v5/user_account", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    username?: string;
                    profile_image?: string;
                    website_url?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.username || "Pinterest User",
                    user: data.username || "Pinterest User",
                    avatar: data.profile_image
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Pinterest user info");
                return {
                    userId: "unknown",
                    name: "Pinterest User",
                    user: "Pinterest User"
                };
            }
        },
        revokeUrl: "https://api.pinterest.com/v5/oauth/token/revoke",
        refreshable: true,
        pkceEnabled: true // Pinterest uses Basic Auth + PKCE for enhanced security
    },

    // ==========================================================================
    // HelloSign (Dropbox Sign) - E-Signature
    // OAuth 2.0 with refresh token support
    // ==========================================================================

    hellosign: {
        name: "hellosign",
        displayName: "HelloSign",
        authUrl: "https://app.hellosign.com/oauth/authorize",
        tokenUrl: "https://app.hellosign.com/oauth/token",
        scopes: ["signature_request_access", "template_access", "account_access"],
        clientId: config.oauth.hellosign.clientId,
        clientSecret: config.oauth.hellosign.clientSecret,
        redirectUri: getOAuthRedirectUri("hellosign"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.hellosign.com/v3/account", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    account?: {
                        account_id?: string;
                        email_address?: string;
                        role_code?: string;
                        is_paid_hs?: boolean;
                        is_paid_hf?: boolean;
                    };
                };

                return {
                    userId: result.account?.account_id || "unknown",
                    email: result.account?.email_address || "unknown@hellosign",
                    name: result.account?.email_address || "HelloSign User",
                    user: result.account?.email_address || "HelloSign User",
                    isPaid: result.account?.is_paid_hs || result.account?.is_paid_hf
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get HelloSign user info");
                return {
                    userId: "unknown",
                    email: "unknown@hellosign",
                    name: "HelloSign User",
                    user: "HelloSign User"
                };
            }
        },
        refreshable: true
    },

    // ==========================================================================
    // DocuSign - E-Signature
    // OAuth 2.0 with PKCE, requires fetching accountId and base_uri after auth
    // ==========================================================================

    docusign: {
        name: "docusign",
        displayName: "DocuSign",
        authUrl: "https://account.docusign.com/oauth/auth",
        tokenUrl: "https://account.docusign.com/oauth/token",
        scopes: ["signature", "extended"],
        authParams: {
            response_type: "code",
            prompt: "login"
        },
        clientId: config.oauth.docusign.clientId,
        clientSecret: config.oauth.docusign.clientSecret,
        redirectUri: getOAuthRedirectUri("docusign"),
        getUserInfo: async (accessToken: string) => {
            try {
                // DocuSign requires calling /oauth/userinfo to get accountId and base_uri
                const response = await fetch("https://account.docusign.com/oauth/userinfo", {
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
                    email?: string;
                    accounts?: Array<{
                        account_id: string;
                        account_name: string;
                        is_default: boolean;
                        base_uri: string;
                    }>;
                };

                // Get the default account or first available
                const defaultAccount =
                    data.accounts?.find((a) => a.is_default) || data.accounts?.[0];

                if (!defaultAccount) {
                    throw new Error("No DocuSign accounts found for this user");
                }

                return {
                    userId: data.sub || "unknown",
                    email: data.email || "unknown@docusign",
                    name: data.name || "DocuSign User",
                    user: data.name || data.email || "DocuSign User",
                    // These are critical for API calls
                    account_id: defaultAccount.account_id,
                    account_name: defaultAccount.account_name,
                    base_uri: defaultAccount.base_uri,
                    accounts: data.accounts
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get DocuSign user info");
                return {
                    userId: "unknown",
                    email: "unknown@docusign",
                    name: "DocuSign User",
                    user: "DocuSign User"
                };
            }
        },
        refreshable: true,
        pkceEnabled: true
    },

    surveymonkey: {
        name: "surveymonkey",
        displayName: "SurveyMonkey",
        authUrl: "https://api.surveymonkey.com/oauth/authorize",
        tokenUrl: "https://api.surveymonkey.com/oauth/token",
        scopes: [
            "users_read",
            "surveys_read",
            "collectors_read",
            "responses_read",
            "responses_read_detail"
        ],
        clientId: config.oauth.surveymonkey.clientId,
        clientSecret: config.oauth.surveymonkey.clientSecret,
        redirectUri: getOAuthRedirectUri("surveymonkey"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.surveymonkey.com/v3/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    username?: string;
                    email?: string;
                    first_name?: string;
                    last_name?: string;
                    account_type?: string;
                };

                const fullName =
                    data.first_name && data.last_name
                        ? `${data.first_name} ${data.last_name}`
                        : data.username || "SurveyMonkey User";

                return {
                    userId: data.id || "unknown",
                    email: data.email || "unknown@surveymonkey",
                    name: fullName,
                    user: data.username || fullName,
                    account_type: data.account_type
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get SurveyMonkey user info");
                return {
                    userId: "unknown",
                    email: "unknown@surveymonkey",
                    name: "SurveyMonkey User",
                    user: "SurveyMonkey User"
                };
            }
        },
        // SurveyMonkey tokens don't expire for authorized apps
        refreshable: false
    },

    // ==========================================================================
    // Buffer - Social Media Management
    // Uses OAuth 2.0 with no specific scopes (implicit full access)
    // ==========================================================================

    buffer: {
        name: "buffer",
        displayName: "Buffer",
        authUrl: "https://bufferapp.com/oauth2/authorize",
        tokenUrl: "https://api.bufferapp.com/1/oauth2/token.json",
        scopes: [], // Buffer uses implicit full access, no scopes needed
        clientId: config.oauth.buffer.clientId,
        clientSecret: config.oauth.buffer.clientSecret,
        redirectUri: getOAuthRedirectUri("buffer"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch(
                    `https://api.bufferapp.com/1/user.json?access_token=${accessToken}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    name?: string;
                    activity_at?: number;
                    plan?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.name || "Buffer User",
                    user: data.name || "Buffer User",
                    plan: data.plan
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Buffer user info");
                return {
                    userId: "unknown",
                    name: "Buffer User",
                    user: "Buffer User"
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
    },

    // ==========================================================================
    // Hootsuite - Social Media Management
    // Uses OAuth 2.0 with Basic Auth for token exchange
    // Tokens expire in ~1 hour, requires refresh token
    // ==========================================================================

    hootsuite: {
        name: "hootsuite",
        displayName: "Hootsuite",
        authUrl: "https://platform.hootsuite.com/oauth2/auth",
        tokenUrl: "https://platform.hootsuite.com/oauth2/token",
        scopes: ["offline"], // Required for refresh token
        clientId: config.oauth.hootsuite.clientId,
        clientSecret: config.oauth.hootsuite.clientSecret,
        redirectUri: getOAuthRedirectUri("hootsuite"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://platform.hootsuite.com/v1/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    data?: {
                        id?: string;
                        fullName?: string;
                        email?: string;
                        companyName?: string;
                        timezone?: string;
                        language?: string;
                    };
                };

                return {
                    userId: result.data?.id || "unknown",
                    name: result.data?.fullName || "Hootsuite User",
                    email: result.data?.email || "unknown@hootsuite",
                    user: result.data?.fullName || result.data?.email || "Hootsuite User",
                    companyName: result.data?.companyName,
                    timezone: result.data?.timezone
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Hootsuite user info");
                return {
                    userId: "unknown",
                    name: "Hootsuite User",
                    email: "unknown@hootsuite",
                    user: "Hootsuite User"
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
    },

    // ==========================================================================
    // Calendly - Scheduling & Meeting Management
    // Uses OAuth 2.0 with Bearer token for API access
    // Calendly doesn't use traditional scopes - access based on user role
    // ==========================================================================

    calendly: {
        name: "calendly",
        displayName: "Calendly",
        authUrl: "https://auth.calendly.com/oauth/authorize",
        tokenUrl: "https://auth.calendly.com/oauth/token",
        scopes: [], // Calendly doesn't use traditional scopes - access based on user role
        clientId: config.oauth.calendly.clientId,
        clientSecret: config.oauth.calendly.clientSecret,
        redirectUri: getOAuthRedirectUri("calendly"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.calendly.com/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    resource?: {
                        uri?: string;
                        name?: string;
                        email?: string;
                        slug?: string;
                        timezone?: string;
                        avatar_url?: string;
                        current_organization?: string;
                    };
                };

                return {
                    userId: result.resource?.uri || "unknown",
                    name: result.resource?.name || "Calendly User",
                    email: result.resource?.email || "unknown@calendly",
                    user: result.resource?.name || result.resource?.email || "Calendly User",
                    slug: result.resource?.slug,
                    timezone: result.resource?.timezone,
                    avatarUrl: result.resource?.avatar_url,
                    organization: result.resource?.current_organization
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Calendly user info");
                return {
                    userId: "unknown",
                    name: "Calendly User",
                    email: "unknown@calendly",
                    user: "Calendly User"
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
    },

    clickup: {
        name: "clickup",
        displayName: "ClickUp",
        authUrl: "https://app.clickup.com/api",
        tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
        scopes: [], // ClickUp doesn't use traditional scopes - access is workspace-based
        clientId: config.oauth.clickup.clientId,
        clientSecret: config.oauth.clickup.clientSecret,
        redirectUri: getOAuthRedirectUri("clickup"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Note: ClickUp uses raw access token, no "Bearer" prefix
                const response = await fetch("https://api.clickup.com/api/v2/user", {
                    headers: {
                        Authorization: accessToken,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    user?: {
                        id?: number;
                        username?: string;
                        email?: string;
                        color?: string;
                        profilePicture?: string;
                    };
                };

                return {
                    userId: result.user?.id?.toString() || "unknown",
                    name: result.user?.username || "ClickUp User",
                    email: result.user?.email || "unknown@clickup",
                    user: result.user?.username || result.user?.email || "ClickUp User",
                    color: result.user?.color,
                    profilePicture: result.user?.profilePicture
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get ClickUp user info");
                return {
                    userId: "unknown",
                    name: "ClickUp User",
                    email: "unknown@clickup",
                    user: "ClickUp User"
                };
            }
        },
        refreshable: false, // ClickUp tokens don't currently expire
        pkceEnabled: false
    },

    // ==========================================================================
    // Marketing Automation
    // ==========================================================================

    klaviyo: {
        name: "klaviyo",
        displayName: "Klaviyo",
        authUrl: "https://www.klaviyo.com/oauth/authorize",
        tokenUrl: "https://a.klaviyo.com/oauth/token",
        scopes: [
            "lists:read",
            "lists:write",
            "profiles:read",
            "profiles:write",
            "campaigns:read",
            "events:read",
            "events:write",
            "segments:read",
            "metrics:read"
        ],
        clientId: config.oauth.klaviyo.clientId,
        clientSecret: config.oauth.klaviyo.clientSecret,
        redirectUri: getOAuthRedirectUri("klaviyo"),
        pkceEnabled: true, // Klaviyo requires PKCE
        getUserInfo: async (accessToken: string) => {
            try {
                // Klaviyo API uses revision header for versioning
                const response = await fetch("https://a.klaviyo.com/api/accounts/", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        revision: "2024-10-15",
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    data?: Array<{
                        type?: string;
                        id?: string;
                        attributes?: {
                            test_account?: boolean;
                            contact_information?: {
                                default_sender_name?: string;
                                default_sender_email?: string;
                                website_url?: string;
                            };
                            industry?: string;
                            timezone?: string;
                            preferred_currency?: string;
                            public_api_key?: string;
                        };
                    }>;
                };

                const account = data.data?.[0];
                const attrs = account?.attributes;
                const contactInfo = attrs?.contact_information;

                return {
                    accountId: account?.id,
                    accountName:
                        contactInfo?.default_sender_name ||
                        contactInfo?.default_sender_email ||
                        "Klaviyo Account",
                    email: contactInfo?.default_sender_email || "unknown@klaviyo",
                    user: contactInfo?.default_sender_name || "Klaviyo User",
                    website: contactInfo?.website_url,
                    industry: attrs?.industry,
                    timezone: attrs?.timezone,
                    currency: attrs?.preferred_currency,
                    isTestAccount: attrs?.test_account || false
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Klaviyo account info");
                return {
                    email: "unknown@klaviyo",
                    user: "Klaviyo User",
                    accountName: "Klaviyo Account"
                };
            }
        },
        refreshable: true
    },

    quickbooks: {
        name: "quickbooks",
        displayName: "QuickBooks",
        authUrl: "https://appcenter.intuit.com/connect/oauth2",
        tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        scopes: ["com.intuit.quickbooks.accounting"],
        clientId: config.oauth.quickbooks.clientId,
        clientSecret: config.oauth.quickbooks.clientSecret,
        redirectUri: getOAuthRedirectUri("quickbooks"),
        getUserInfo: async (accessToken: string) => {
            try {
                // QuickBooks doesn't have a user info endpoint, but we get company info
                // The realmId is provided in the callback URL, not from an API call
                // We'll return minimal info here; realmId is captured during token exchange
                const response = await fetch(
                    "https://accounts.platform.intuit.com/v1/openid_connect/userinfo",
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

                const data = (await response.json()) as {
                    sub?: string;
                    email?: string;
                    emailVerified?: boolean;
                    givenName?: string;
                    familyName?: string;
                    phoneNumber?: string;
                };

                return {
                    userId: data.sub || "unknown",
                    email: data.email || "unknown@quickbooks",
                    name:
                        data.givenName && data.familyName
                            ? `${data.givenName} ${data.familyName}`
                            : "QuickBooks User"
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get QuickBooks user info");
                return {
                    userId: "unknown",
                    email: "unknown@quickbooks",
                    name: "QuickBooks User"
                };
            }
        },
        refreshable: true
    },

    freshbooks: {
        name: "freshbooks",
        displayName: "FreshBooks",
        authUrl: "https://auth.freshbooks.com/oauth/authorize",
        tokenUrl: "https://api.freshbooks.com/auth/oauth/token",
        scopes: [
            "user:profile:read",
            "user:clients:read",
            "user:clients:write",
            "user:invoices:read",
            "user:invoices:write",
            "user:expenses:read",
            "user:expenses:write"
        ],
        clientId: config.oauth.freshbooks.clientId,
        clientSecret: config.oauth.freshbooks.clientSecret,
        redirectUri: getOAuthRedirectUri("freshbooks"),
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.freshbooks.com/auth/api/v1/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    response?: {
                        id?: number;
                        first_name?: string;
                        last_name?: string;
                        email?: string;
                        business_memberships?: Array<{
                            business?: {
                                id?: number;
                                name?: string;
                                account_id?: string;
                            };
                        }>;
                    };
                };

                const user = data.response;
                const business = user?.business_memberships?.[0]?.business;

                return {
                    userId: user?.id?.toString() || "unknown",
                    email: user?.email || "unknown@freshbooks",
                    name:
                        user?.first_name && user?.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : "FreshBooks User",
                    accountId: business?.account_id,
                    businessName: business?.name
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get FreshBooks user info");
                return {
                    userId: "unknown",
                    email: "unknown@freshbooks",
                    name: "FreshBooks User"
                };
            }
        },
        refreshable: true
    },

    workday: {
        name: "workday",
        displayName: "Workday",
        // Note: Workday URLs are tenant-specific. The tenant is collected via oauthSettings
        // and substituted at runtime by the OAuth service. Default placeholder used here.
        authUrl: "https://TENANT.workday.com/oauth2/TENANT/authorize",
        tokenUrl: "https://TENANT.workday.com/ccx/oauth2/TENANT/token",
        scopes: ["staffing", "system", "absenceManagement"],
        clientId: config.oauth.workday.clientId,
        clientSecret: config.oauth.workday.clientSecret,
        redirectUri: getOAuthRedirectUri("workday"),
        refreshable: true,
        pkceEnabled: false
    },

    rippling: {
        name: "rippling",
        displayName: "Rippling",
        authUrl: "https://api.rippling.com/o/authorize/",
        tokenUrl: "https://api.rippling.com/o/token/",
        scopes: [
            "employee:read",
            "department:read",
            "company:read",
            "leave_request:read",
            "leave_request:write"
        ],
        clientId: config.oauth.rippling.clientId,
        clientSecret: config.oauth.rippling.clientSecret,
        redirectUri: getOAuthRedirectUri("rippling"),
        refreshable: true,
        pkceEnabled: false
    },

    // ==========================================================================
    // Square - Payment Processing
    // Uses OAuth 2.0 with standard flow
    // ==========================================================================

    square: {
        name: "square",
        displayName: "Square",
        authUrl: "https://connect.squareup.com/oauth2/authorize",
        tokenUrl: "https://connect.squareup.com/oauth2/token",
        scopes: [
            "PAYMENTS_READ",
            "PAYMENTS_WRITE",
            "CUSTOMERS_READ",
            "CUSTOMERS_WRITE",
            "ORDERS_READ",
            "ORDERS_WRITE"
        ],
        clientId: config.oauth.square.clientId,
        clientSecret: config.oauth.square.clientSecret,
        redirectUri: getOAuthRedirectUri("square"),
        getUserInfo: async (accessToken: string) => {
            try {
                // Get merchant info using the Merchants API
                const response = await fetch("https://connect.squareup.com/v2/merchants/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        "Square-Version": "2025-01-23"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    merchant?: {
                        id?: string;
                        business_name?: string;
                        country?: string;
                        currency?: string;
                        status?: string;
                    };
                };

                return {
                    merchantId: data.merchant?.id || "unknown",
                    businessName: data.merchant?.business_name || "Square Merchant",
                    country: data.merchant?.country,
                    currency: data.merchant?.currency,
                    status: data.merchant?.status
                };
            } catch (error) {
                logger.error({ err: error }, "Failed to get Square merchant info");
                return {
                    merchantId: "unknown",
                    businessName: "Square Merchant"
                };
            }
        },
        refreshable: true,
        pkceEnabled: false
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
