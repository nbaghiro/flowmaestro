import path from "path";
import dotenv from "dotenv";

// Load .env from project root
// When compiled, this will be in dist/, so we go up to backend/, then to project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * Centralized Configuration
 *
 * All environment variables should be accessed through this config object.
 * This provides:
 * - Single source of truth for all configuration
 * - Type safety and defaults in one place
 * - Easier testing (can mock config)
 * - Clear documentation of what env vars are needed
 *
 * IMPORTANT: Do NOT access process.env directly elsewhere in the codebase.
 */
export const config = {
    // ==========================================================================
    // Environment
    // ==========================================================================
    env: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",

    // ==========================================================================
    // Logging Configuration
    // ==========================================================================
    logging: {
        level: process.env.LOG_LEVEL || "info",
        serviceName: process.env.SERVICE_NAME || "flowmaestro-api",
        serviceVersion: process.env.APP_VERSION || "1.0.0",
        gcpProjectId: process.env.GCP_PROJECT_ID || "",
        enableCloudLogging: process.env.ENABLE_CLOUD_LOGGING === "true",
        enableClientLogIngestion: process.env.ENABLE_CLIENT_LOG_INGESTION === "true"
    },

    // ==========================================================================
    // Server Configuration
    // ==========================================================================
    server: {
        port: parseInt(process.env.BACKEND_PORT || "3001"),
        host: process.env.BACKEND_HOST || "0.0.0.0"
    },

    // ==========================================================================
    // Service URLs
    // ==========================================================================
    apiUrl: process.env.API_URL || "http://localhost:3001",
    appUrl: process.env.APP_URL || "http://localhost:3000",
    marketingUrl: process.env.MARKETING_URL || "http://localhost:5173",

    // ==========================================================================
    // Database Configuration (PostgreSQL)
    // ==========================================================================
    database: {
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        database: process.env.POSTGRES_DB || "flowmaestro",
        user: process.env.POSTGRES_USER || "flowmaestro",
        password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
    },

    // ==========================================================================
    // Redis Configuration
    // ==========================================================================
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379")
    },

    // ==========================================================================
    // Temporal Configuration
    // ==========================================================================
    temporal: {
        address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
    },

    // ==========================================================================
    // JWT Authentication
    // ==========================================================================
    jwt: {
        secret: process.env.JWT_SECRET || "your-secret-key-change-this-in-production",
        expiresIn: "100y" // Essentially indefinite - sessions only expire on manual logout
    },

    // ==========================================================================
    // CORS Configuration
    // ==========================================================================
    cors: {
        origin: [
            process.env.APP_URL || "http://localhost:3000",
            process.env.MARKETING_URL || "http://localhost:5173"
        ],
        credentials: true
    },

    // ==========================================================================
    // Encryption
    // ==========================================================================
    encryption: {
        key: process.env.ENCRYPTION_KEY || ""
    },

    // ==========================================================================
    // Google Cloud Storage
    // ==========================================================================
    gcs: {
        bucketName: process.env.GCS_BUCKET_NAME || ""
    },

    // ==========================================================================
    // Token Settings
    // ==========================================================================
    tokens: {
        passwordResetExpiryMinutes: 30,
        emailVerificationExpiryMinutes: 30
    },

    // ==========================================================================
    // Rate Limiting
    // ==========================================================================
    rateLimit: {
        passwordReset: {
            maxRequests: 10,
            windowMinutes: 60
        },
        emailVerification: {
            maxRequests: 10,
            windowMinutes: 60
        }
    },

    // ==========================================================================
    // AI Provider API Keys
    // ==========================================================================
    ai: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY || ""
        },
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY || ""
        },
        google: {
            apiKey: process.env.GOOGLE_API_KEY || ""
        },
        cohere: {
            apiKey: process.env.COHERE_API_KEY || ""
        },
        huggingface: {
            apiKey: process.env.HUGGINGFACE_API_KEY || ""
        },
        elevenlabs: {
            apiKey: process.env.ELEVENLABS_API_KEY || ""
        },
        deepgram: {
            apiKey: process.env.DEEPGRAM_API_KEY || ""
        },
        stabilityai: {
            apiKey: process.env.STABILITY_API_KEY || ""
        },
        replicate: {
            apiKey: process.env.REPLICATE_API_KEY || ""
        },
        runway: {
            apiKey: process.env.RUNWAY_API_KEY || ""
        },
        luma: {
            apiKey: process.env.LUMA_API_KEY || ""
        }
    },

    // ==========================================================================
    // Email Services
    // ==========================================================================
    resend: {
        apiKey: process.env.RESEND_API_KEY || ""
    },

    // ==========================================================================
    // SMS Services
    // ==========================================================================
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || "",
        authToken: process.env.TWILIO_AUTH_TOKEN || "",
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || ""
    },

    // ==========================================================================
    // OAuth Providers
    // ==========================================================================
    oauth: {
        // Google (Google Workspace, Sheets, Calendar, Drive, Gmail)
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirectUri:
                process.env.GOOGLE_OAUTH_REDIRECT_URI ||
                `${process.env.API_URL || "http://localhost:3001"}/oauth/google/callback`
        },

        // Slack
        slack: {
            clientId: process.env.SLACK_CLIENT_ID || "",
            clientSecret: process.env.SLACK_CLIENT_SECRET || ""
        },

        // Notion
        notion: {
            clientId: process.env.NOTION_CLIENT_ID || "",
            clientSecret: process.env.NOTION_CLIENT_SECRET || ""
        },

        // Airtable
        airtable: {
            clientId: process.env.AIRTABLE_CLIENT_ID || "",
            clientSecret: process.env.AIRTABLE_CLIENT_SECRET || ""
        },

        // GitHub
        github: {
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || ""
        },

        // HubSpot
        hubspot: {
            clientId: process.env.HUBSPOT_CLIENT_ID || "",
            clientSecret: process.env.HUBSPOT_CLIENT_SECRET || ""
        },

        // Linear
        linear: {
            clientId: process.env.LINEAR_CLIENT_ID || "",
            clientSecret: process.env.LINEAR_CLIENT_SECRET || ""
        },

        // Figma
        figma: {
            clientId: process.env.FIGMA_CLIENT_ID || "",
            clientSecret: process.env.FIGMA_CLIENT_SECRET || ""
        },

        // Microsoft (OneDrive, Excel, Word, Teams)
        microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID || "",
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || ""
        },

        // Meta (WhatsApp, Instagram, Facebook, Facebook Ads)
        meta: {
            appId: process.env.META_APP_ID || "",
            appSecret: process.env.META_APP_SECRET || "",
            whatsappConfigId: process.env.META_WHATSAPP_CONFIG_ID || "",
            webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || ""
        },

        // Salesforce
        salesforce: {
            clientId: process.env.SALESFORCE_CLIENT_ID || "",
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET || ""
        },

        // Zendesk
        zendesk: {
            clientId: process.env.ZENDESK_CLIENT_ID || "",
            clientSecret: process.env.ZENDESK_CLIENT_SECRET || ""
        },

        // Apollo.io
        apollo: {
            clientId: process.env.APOLLO_CLIENT_ID || "",
            clientSecret: process.env.APOLLO_CLIENT_SECRET || ""
        },

        // Jira (Atlassian)
        jira: {
            clientId: process.env.JIRA_CLIENT_ID || "",
            clientSecret: process.env.JIRA_CLIENT_SECRET || ""
        },

        // Shopify
        shopify: {
            clientId: process.env.SHOPIFY_CLIENT_ID || "",
            clientSecret: process.env.SHOPIFY_CLIENT_SECRET || ""
        },

        // Typeform
        typeform: {
            clientId: process.env.TYPEFORM_CLIENT_ID || "",
            clientSecret: process.env.TYPEFORM_CLIENT_SECRET || ""
        },

        // Dropbox
        dropbox: {
            clientId: process.env.DROPBOX_CLIENT_ID || "",
            clientSecret: process.env.DROPBOX_CLIENT_SECRET || ""
        },

        // Box
        box: {
            clientId: process.env.BOX_CLIENT_ID || "",
            clientSecret: process.env.BOX_CLIENT_SECRET || ""
        },

        // X (Twitter)
        twitter: {
            clientId: process.env.TWITTER_CLIENT_ID || "",
            clientSecret: process.env.TWITTER_CLIENT_SECRET || ""
        },

        // LinkedIn
        linkedin: {
            clientId: process.env.LINKEDIN_CLIENT_ID || "",
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || ""
        },

        // Reddit
        reddit: {
            clientId: process.env.REDDIT_CLIENT_ID || "",
            clientSecret: process.env.REDDIT_CLIENT_SECRET || ""
        },

        // Discord
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID || "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
            botToken: process.env.DISCORD_BOT_TOKEN || ""
        }
    }
};

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Get OAuth redirect URI for a provider
 */
export function getOAuthRedirectUri(provider: string): string {
    // Map provider names to their callback paths
    const callbackPaths: Record<string, string> = {
        // Google services all use the same callback
        google: "/oauth/google/callback",
        "google-auth": "/oauth/google/callback",
        "google-sheets": "/oauth/google/callback",
        "google-calendar": "/oauth/google/callback",
        "google-drive": "/oauth/google/callback",
        gmail: "/oauth/google/callback",

        // Microsoft services all use the same callback
        microsoft: "/oauth/microsoft/callback",
        "microsoft-auth": "/oauth/microsoft/callback",
        "microsoft-onedrive": "/oauth/microsoft/callback",
        "microsoft-excel": "/oauth/microsoft/callback",
        "microsoft-word": "/oauth/microsoft/callback",
        "microsoft-teams": "/oauth/microsoft/callback",

        // Meta services all use the same callback
        whatsapp: "/oauth/meta/callback",
        instagram: "/oauth/meta/callback",
        facebook: "/oauth/meta/callback",
        "facebook-ads": "/oauth/meta/callback",

        // Other providers have their own callbacks
        slack: "/oauth/slack/callback",
        notion: "/oauth/notion/callback",
        airtable: "/oauth/airtable/callback",
        github: "/oauth/github/callback",
        hubspot: "/oauth/hubspot/callback",
        linear: "/oauth/linear/callback",
        figma: "/oauth/figma/callback",
        salesforce: "/oauth/salesforce/callback",
        zendesk: "/oauth/zendesk/callback",
        apollo: "/oauth/apollo/callback",
        jira: "/oauth/jira/callback",
        shopify: "/oauth/shopify/callback",
        typeform: "/oauth/typeform/callback",
        dropbox: "/oauth/dropbox/callback",
        box: "/oauth/box/callback",
        twitter: "/oauth/twitter/callback",
        linkedin: "/oauth/linkedin/callback",
        reddit: "/oauth/reddit/callback",
        discord: "/oauth/discord/callback"
    };

    const callbackPath = callbackPaths[provider] || `/oauth/${provider}/callback`;
    return `${config.apiUrl}${callbackPath}`;
}

/**
 * Get OAuth credentials for a provider
 */
export function getOAuthCredentials(provider: string): { clientId: string; clientSecret: string } {
    // Map provider names to their OAuth config keys
    const providerMap: Record<string, keyof typeof config.oauth> = {
        // Google services
        google: "google",
        "google-auth": "google",
        "google-sheets": "google",
        "google-calendar": "google",
        "google-drive": "google",
        gmail: "google",

        // Microsoft services
        microsoft: "microsoft",
        "microsoft-auth": "microsoft",
        "microsoft-onedrive": "microsoft",
        "microsoft-excel": "microsoft",
        "microsoft-word": "microsoft",
        "microsoft-teams": "microsoft",

        // Meta services - special handling
        whatsapp: "meta",
        instagram: "meta",
        facebook: "meta",
        "facebook-ads": "meta",

        // Direct mappings
        slack: "slack",
        notion: "notion",
        airtable: "airtable",
        github: "github",
        hubspot: "hubspot",
        linear: "linear",
        figma: "figma",
        salesforce: "salesforce",
        zendesk: "zendesk",
        apollo: "apollo",
        jira: "jira",
        shopify: "shopify",
        typeform: "typeform",
        dropbox: "dropbox",
        box: "box",
        twitter: "twitter",
        linkedin: "linkedin",
        reddit: "reddit",
        discord: "discord"
    };

    const configKey = providerMap[provider];
    if (!configKey) {
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    const providerConfig = config.oauth[configKey];

    // Meta uses appId/appSecret instead of clientId/clientSecret
    if (configKey === "meta") {
        const metaConfig = providerConfig as typeof config.oauth.meta;
        return {
            clientId: metaConfig.appId,
            clientSecret: metaConfig.appSecret
        };
    }

    return {
        clientId: (providerConfig as { clientId: string; clientSecret: string }).clientId,
        clientSecret: (providerConfig as { clientId: string; clientSecret: string }).clientSecret
    };
}

/**
 * Get AI provider API key
 */
export function getAIProviderApiKey(
    provider:
        | "openai"
        | "anthropic"
        | "google"
        | "cohere"
        | "huggingface"
        | "elevenlabs"
        | "deepgram"
): string {
    return config.ai[provider]?.apiKey || "";
}
