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
        password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password",
        // Pool size - keep low for small CloudSQL instances (db-g1-small has ~25-50 max connections)
        // temporal-server uses 10-20+ connections, so app services need to share the rest
        poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || "5")
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
        // Bucket for user uploads (icons, covers, images)
        uploadsBucket: process.env.GCS_UPLOADS_BUCKET || "",
        // Bucket for knowledge base documents
        knowledgeDocsBucket: process.env.GCS_KNOWLEDGE_DOCS_BUCKET || "",
        // Bucket for workflow execution artifacts
        artifactsBucket: process.env.GCS_ARTIFACTS_BUCKET || ""
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
        },
        fal: {
            apiKey: process.env.FAL_API_KEY || ""
        },
        xai: {
            apiKey: process.env.XAI_API_KEY || ""
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

        // GitLab
        gitlab: {
            clientId: process.env.GITLAB_CLIENT_ID || "",
            clientSecret: process.env.GITLAB_CLIENT_SECRET || ""
        },

        // Bitbucket
        bitbucket: {
            clientId: process.env.BITBUCKET_CLIENT_ID || "",
            clientSecret: process.env.BITBUCKET_CLIENT_SECRET || ""
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
        },

        // Asana
        asana: {
            clientId: process.env.ASANA_CLIENT_ID || "",
            clientSecret: process.env.ASANA_CLIENT_SECRET || ""
        },

        // Monday.com
        monday: {
            clientId: process.env.MONDAY_CLIENT_ID || "",
            clientSecret: process.env.MONDAY_CLIENT_SECRET || ""
        },

        // Evernote (OAuth 1.0a)
        evernote: {
            consumerKey: process.env.EVERNOTE_CONSUMER_KEY || "",
            consumerSecret: process.env.EVERNOTE_CONSUMER_SECRET || "",
            sandbox: process.env.EVERNOTE_SANDBOX === "true"
        },

        // Pipedrive
        pipedrive: {
            clientId: process.env.PIPEDRIVE_CLIENT_ID || "",
            clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET || ""
        },

        // Close CRM
        close: {
            clientId: process.env.CLOSE_CLIENT_ID || "",
            clientSecret: process.env.CLOSE_CLIENT_SECRET || ""
        },

        // Zoho CRM
        zohoCrm: {
            clientId: process.env.ZOHO_CRM_CLIENT_ID || "",
            clientSecret: process.env.ZOHO_CRM_CLIENT_SECRET || ""
        },

        // TikTok
        tiktok: {
            clientId: process.env.TIKTOK_CLIENT_ID || "",
            clientSecret: process.env.TIKTOK_CLIENT_SECRET || ""
        },

        // Pinterest
        pinterest: {
            clientId: process.env.PINTEREST_CLIENT_ID || "",
            clientSecret: process.env.PINTEREST_CLIENT_SECRET || ""
        },

        // HelloSign (Dropbox Sign)
        hellosign: {
            clientId: process.env.HELLOSIGN_CLIENT_ID || "",
            clientSecret: process.env.HELLOSIGN_CLIENT_SECRET || ""
        },

        // DocuSign
        docusign: {
            clientId: process.env.DOCUSIGN_CLIENT_ID || "",
            clientSecret: process.env.DOCUSIGN_CLIENT_SECRET || ""
        },

        // PandaDoc
        pandadoc: {
            clientId: process.env.PANDADOC_CLIENT_ID || "",
            clientSecret: process.env.PANDADOC_CLIENT_SECRET || ""
        },

        // SurveyMonkey
        surveymonkey: {
            clientId: process.env.SURVEYMONKEY_CLIENT_ID || "",
            clientSecret: process.env.SURVEYMONKEY_CLIENT_SECRET || ""
        },

        // Intercom
        intercom: {
            clientId: process.env.INTERCOM_CLIENT_ID || "",
            clientSecret: process.env.INTERCOM_CLIENT_SECRET || ""
        },

        // Buffer
        buffer: {
            clientId: process.env.BUFFER_CLIENT_ID || "",
            clientSecret: process.env.BUFFER_CLIENT_SECRET || ""
        },

        // Hootsuite
        hootsuite: {
            clientId: process.env.HOOTSUITE_CLIENT_ID || "",
            clientSecret: process.env.HOOTSUITE_CLIENT_SECRET || ""
        },

        // Calendly
        calendly: {
            clientId: process.env.CALENDLY_CLIENT_ID || "",
            clientSecret: process.env.CALENDLY_CLIENT_SECRET || ""
        },

        // Cal.com
        calcom: {
            clientId: process.env.CALCOM_CLIENT_ID || "",
            clientSecret: process.env.CALCOM_CLIENT_SECRET || ""
        },

        // ClickUp
        clickup: {
            clientId: process.env.CLICKUP_CLIENT_ID || "",
            clientSecret: process.env.CLICKUP_CLIENT_SECRET || ""
        },

        // Klaviyo
        klaviyo: {
            clientId: process.env.KLAVIYO_CLIENT_ID || "",
            clientSecret: process.env.KLAVIYO_CLIENT_SECRET || ""
        },

        // Mailchimp
        mailchimp: {
            clientId: process.env.MAILCHIMP_CLIENT_ID || "",
            clientSecret: process.env.MAILCHIMP_CLIENT_SECRET || ""
        },

        // QuickBooks
        quickbooks: {
            clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
            clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || ""
        },

        // FreshBooks
        freshbooks: {
            clientId: process.env.FRESHBOOKS_CLIENT_ID || "",
            clientSecret: process.env.FRESHBOOKS_CLIENT_SECRET || ""
        },

        // Workday
        workday: {
            clientId: process.env.WORKDAY_CLIENT_ID || "",
            clientSecret: process.env.WORKDAY_CLIENT_SECRET || ""
        },

        // Rippling
        rippling: {
            clientId: process.env.RIPPLING_CLIENT_ID || "",
            clientSecret: process.env.RIPPLING_CLIENT_SECRET || ""
        },

        // BambooHR
        bamboohr: {
            clientId: process.env.BAMBOOHR_CLIENT_ID || "",
            clientSecret: process.env.BAMBOOHR_CLIENT_SECRET || ""
        },

        // ADP
        adp: {
            clientId: process.env.ADP_CLIENT_ID || "",
            clientSecret: process.env.ADP_CLIENT_SECRET || ""
        },

        // Gusto
        gusto: {
            clientId: process.env.GUSTO_CLIENT_ID || "",
            clientSecret: process.env.GUSTO_CLIENT_SECRET || ""
        },

        // Square
        square: {
            clientId: process.env.SQUARE_CLIENT_ID || "",
            clientSecret: process.env.SQUARE_CLIENT_SECRET || ""
        },

        // PayPal
        paypal: {
            clientId: process.env.PAYPAL_CLIENT_ID || "",
            clientSecret: process.env.PAYPAL_CLIENT_SECRET || ""
        },

        // DigitalOcean
        digitalocean: {
            clientId: process.env.DIGITALOCEAN_CLIENT_ID || "",
            clientSecret: process.env.DIGITALOCEAN_CLIENT_SECRET || ""
        },

        // Amazon Seller Central
        amazonSellerCentral: {
            clientId: process.env.AMAZON_SELLER_CENTRAL_CLIENT_ID || "",
            clientSecret: process.env.AMAZON_SELLER_CENTRAL_CLIENT_SECRET || ""
        },

        // Canva
        canva: {
            clientId: process.env.CANVA_CLIENT_ID || "",
            clientSecret: process.env.CANVA_CLIENT_SECRET || ""
        },

        // Miro
        miro: {
            clientId: process.env.MIRO_CLIENT_ID || "",
            clientSecret: process.env.MIRO_CLIENT_SECRET || ""
        },

        // Confluence (Atlassian - separate from Jira)
        confluence: {
            clientId: process.env.CONFLUENCE_CLIENT_ID || "",
            clientSecret: process.env.CONFLUENCE_CLIENT_SECRET || ""
        },

        // Help Scout
        helpscout: {
            clientId: process.env.HELPSCOUT_CLIENT_ID || "",
            clientSecret: process.env.HELPSCOUT_CLIENT_SECRET || ""
        },

        // LiveChat
        livechat: {
            clientId: process.env.LIVECHAT_CLIENT_ID || "",
            clientSecret: process.env.LIVECHAT_CLIENT_SECRET || ""
        },

        // Drift
        drift: {
            clientId: process.env.DRIFT_CLIENT_ID || "",
            clientSecret: process.env.DRIFT_CLIENT_SECRET || ""
        },

        // Zoom
        zoom: {
            clientId: process.env.ZOOM_CLIENT_ID || "",
            clientSecret: process.env.ZOOM_CLIENT_SECRET || ""
        },

        // SAP
        sap: {
            clientId: process.env.SAP_CLIENT_ID || "",
            clientSecret: process.env.SAP_CLIENT_SECRET || ""
        },

        // NetSuite
        netsuite: {
            clientId: process.env.NETSUITE_CLIENT_ID || "",
            clientSecret: process.env.NETSUITE_CLIENT_SECRET || ""
        },

        // Xero
        xero: {
            clientId: process.env.XERO_CLIENT_ID || "",
            clientSecret: process.env.XERO_CLIENT_SECRET || ""
        },

        // Sage
        sage: {
            clientId: process.env.SAGE_CLIENT_ID || "",
            clientSecret: process.env.SAGE_CLIENT_SECRET || ""
        },

        // Etsy
        etsy: {
            clientId: process.env.ETSY_CLIENT_ID || "",
            clientSecret: process.env.ETSY_CLIENT_SECRET || ""
        },

        // Squarespace
        squarespace: {
            clientId: process.env.SQUARESPACE_CLIENT_ID || "",
            clientSecret: process.env.SQUARESPACE_CLIENT_SECRET || ""
        },

        // eBay
        ebay: {
            clientId: process.env.EBAY_CLIENT_ID || "",
            clientSecret: process.env.EBAY_CLIENT_SECRET || ""
        },

        // Gorgias
        gorgias: {
            clientId: process.env.GORGIAS_CLIENT_ID || "",
            clientSecret: process.env.GORGIAS_CLIENT_SECRET || ""
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
        "google-docs": "/oauth/google/callback",
        "google-slides": "/oauth/google/callback",
        "google-forms": "/oauth/google/callback",
        gmail: "/oauth/google/callback",
        "google-analytics": "/oauth/google/callback",
        "google-cloud-storage": "/oauth/google/callback",

        // Microsoft services all use the same callback
        microsoft: "/oauth/microsoft/callback",
        "microsoft-auth": "/oauth/microsoft/callback",
        "microsoft-onedrive": "/oauth/microsoft/callback",
        "microsoft-excel": "/oauth/microsoft/callback",
        "microsoft-word": "/oauth/microsoft/callback",
        "microsoft-powerpoint": "/oauth/microsoft/callback",
        "microsoft-teams": "/oauth/microsoft/callback",
        "microsoft-outlook": "/oauth/microsoft/callback",
        "power-bi": "/oauth/microsoft/callback",

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
        gitlab: "/oauth/gitlab/callback",
        bitbucket: "/oauth/bitbucket/callback",
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
        discord: "/oauth/discord/callback",
        asana: "/oauth/asana/callback",
        monday: "/oauth/monday/callback",
        pipedrive: "/oauth/pipedrive/callback",
        close: "/oauth/close/callback",
        tiktok: "/oauth/tiktok/callback",
        pinterest: "/oauth/pinterest/callback",
        hellosign: "/oauth/hellosign/callback",
        docusign: "/oauth/docusign/callback",
        pandadoc: "/oauth/pandadoc/callback",
        surveymonkey: "/oauth/surveymonkey/callback",
        intercom: "/oauth/intercom/callback",
        buffer: "/oauth/buffer/callback",
        hootsuite: "/oauth/hootsuite/callback",
        calendly: "/oauth/calendly/callback",
        "cal-com": "/oauth/cal-com/callback",
        clickup: "/oauth/clickup/callback",
        klaviyo: "/oauth/klaviyo/callback",
        mailchimp: "/oauth/mailchimp/callback",
        quickbooks: "/oauth/quickbooks/callback",
        freshbooks: "/oauth/freshbooks/callback",
        workday: "/oauth/workday/callback",
        rippling: "/oauth/rippling/callback",
        adp: "/oauth/adp/callback",
        gusto: "/oauth/gusto/callback",
        bamboohr: "/oauth/bamboohr/callback",
        square: "/oauth/square/callback",
        paypal: "/oauth/paypal/callback",
        digitalocean: "/oauth/digitalocean/callback",
        "amazon-seller-central": "/oauth/amazon-seller-central/callback",
        canva: "/oauth/canva/callback",
        miro: "/oauth/miro/callback",
        confluence: "/oauth/confluence/callback",
        sharepoint: "/oauth/microsoft/callback",
        helpscout: "/oauth/helpscout/callback",
        livechat: "/oauth/livechat/callback",
        drift: "/oauth/drift/callback",
        zoom: "/oauth/zoom/callback",
        "google-meet": "/oauth/google/callback",
        sap: "/oauth/sap/callback",
        netsuite: "/oauth/netsuite/callback",
        xero: "/oauth/xero/callback",
        sage: "/oauth/sage/callback",
        etsy: "/oauth/etsy/callback",
        squarespace: "/oauth/squarespace/callback",
        ebay: "/oauth/ebay/callback",
        gorgias: "/oauth/gorgias/callback",
        "zoho-crm": "/oauth/zoho-crm/callback",

        // OAuth 1.0a providers
        evernote: "/oauth1/evernote/callback"
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
        "google-docs": "google",
        "google-slides": "google",
        "google-forms": "google",
        gmail: "google",
        "google-analytics": "google",
        "google-cloud-storage": "google",

        // Microsoft services
        microsoft: "microsoft",
        "microsoft-auth": "microsoft",
        "microsoft-onedrive": "microsoft",
        "microsoft-excel": "microsoft",
        "microsoft-word": "microsoft",
        "microsoft-powerpoint": "microsoft",
        "microsoft-teams": "microsoft",
        "microsoft-outlook": "microsoft",
        "power-bi": "microsoft",

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
        gitlab: "gitlab",
        bitbucket: "bitbucket",
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
        discord: "discord",
        asana: "asana",
        monday: "monday",
        pipedrive: "pipedrive",
        close: "close",
        tiktok: "tiktok",
        pinterest: "pinterest",
        hellosign: "hellosign",
        docusign: "docusign",
        pandadoc: "pandadoc",
        surveymonkey: "surveymonkey",
        intercom: "intercom",
        buffer: "buffer",
        hootsuite: "hootsuite",
        calendly: "calendly",
        "cal-com": "calcom",
        clickup: "clickup",
        klaviyo: "klaviyo",
        mailchimp: "mailchimp",
        quickbooks: "quickbooks",
        freshbooks: "freshbooks",
        workday: "workday",
        rippling: "rippling",
        adp: "adp",
        gusto: "gusto",
        bamboohr: "bamboohr",
        paypal: "paypal",
        "amazon-seller-central": "amazonSellerCentral",
        canva: "canva",
        miro: "miro",
        confluence: "confluence",
        sharepoint: "microsoft",
        helpscout: "helpscout",
        livechat: "livechat",
        drift: "drift",
        zoom: "zoom",
        "google-meet": "google",
        sap: "sap",
        netsuite: "netsuite",
        xero: "xero",
        sage: "sage",
        etsy: "etsy",
        squarespace: "squarespace",
        ebay: "ebay",
        gorgias: "gorgias",
        "zoho-crm": "zohoCrm"
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
        | "stabilityai"
        | "replicate"
        | "runway"
        | "luma"
        | "fal"
        | "xai"
): string {
    return config.ai[provider]?.apiKey || "";
}
