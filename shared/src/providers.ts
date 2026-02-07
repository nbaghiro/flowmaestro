/**
 * Centralized Provider Definitions
 * Shared between frontend and backend
 */

import type { ConnectionMethod } from "./connections";

/**
 * OAuth pre-auth field configuration
 * Used to collect provider-specific settings before initiating OAuth flow
 */
export interface OAuthField {
    /** Field name (used as key in settings object) */
    name: string;
    /** Display label */
    label: string;
    /** Placeholder text */
    placeholder?: string;
    /** Help text shown below the field */
    helpText?: string;
    /** Whether the field is required */
    required: boolean;
    /** Field type */
    type: "text" | "select";
    /** Options for select fields */
    options?: { value: string; label: string }[];
    /** Validation pattern (regex) */
    pattern?: string;
    /** Pattern validation error message */
    patternError?: string;
}

/**
 * API Key field configuration
 * Used to customize the API key form for providers that need additional fields
 */
export interface ApiKeySettings {
    /** Custom label for the primary API key field (default: "API Key") */
    keyLabel?: string;
    /** Custom placeholder for the API key field */
    keyPlaceholder?: string;
    /** Whether the provider requires an api_secret field (e.g., Trello token) */
    requiresSecret?: boolean;
    /** Custom label for the api_secret field (default: "API Token") */
    secretLabel?: string;
    /** Custom placeholder for the secret field */
    secretPlaceholder?: string;
    /** Help text or instructions for users */
    helpText?: string;
    /** URL where users can get their credentials */
    helpUrl?: string;
}

export interface Provider {
    provider: string;
    displayName: string;
    description: string;
    logoUrl: string;
    category: string;
    methods: ConnectionMethod[];
    comingSoon?: boolean;
    /** Fields to collect before initiating OAuth flow (e.g., subdomain for Zendesk) */
    oauthSettings?: OAuthField[];
    /** API key form customization (labels, secret field, help text) */
    apiKeySettings?: ApiKeySettings;
}

// Brandfetch Logo API client ID
const BRANDFETCH_CLIENT_ID = "1idCpJZqz6etuVweFEJ";

/**
 * Get a provider logo URL from Brandfetch CDN.
 * Used for provider icons in connection modals, node configs, etc.
 */
export const getProviderLogoUrl = (domain: string): string =>
    `https://cdn.brandfetch.io/${domain}?c=${BRANDFETCH_CLIENT_ID}`;

// Alias for internal use
const getBrandLogo = getProviderLogoUrl;

/**
 * Domain mapping for provider IDs to their logo domains.
 * Used when you have a provider ID and need to get its logo.
 */
export const PROVIDER_LOGO_DOMAINS: Record<string, string> = {
    github: "github.com",
    gitlab: "gitlab.com",
    bitbucket: "bitbucket.org",
    slack: "slack.com",
    discord: "discord.com",
    telegram: "telegram.org",
    whatsapp: "whatsapp.com",
    airtable: "airtable.com",
    asana: "asana.com",
    monday: "monday.com",
    "google-sheets": "google.com",
    "google-calendar": "google.com",
    "google-drive": "google.com",
    "google-docs": "google.com",
    "google-forms": "google.com",
    gmail: "google.com",
    shopify: "shopify.com",
    stripe: "stripe.com",
    hubspot: "hubspot.com",
    typeform: "typeform.com",
    linear: "linear.app",
    jira: "atlassian.com",
    zendesk: "zendesk.com",
    notion: "notion.so",
    figma: "figma.com",
    salesforce: "salesforce.com",
    pandadoc: "pandadoc.com",
    twitter: "x.com",
    linkedin: "linkedin.com",
    facebook: "facebook.com",
    instagram: "instagram.com",
    youtube: "youtube.com",
    reddit: "reddit.com",
    dropbox: "dropbox.com",
    box: "box.com",
    "microsoft-onedrive": "onedrive.live.com",
    "microsoft-teams": "teams.microsoft.com",
    "microsoft-excel": "microsoft.com",
    "microsoft-word": "microsoft.com",
    "microsoft-outlook": "outlook.live.com",
    openai: "openai.com",
    anthropic: "anthropic.com",
    google: "google.com",
    cohere: "cohere.com",
    apollo: "apollo.io",
    fal: "fal.ai",
    replicate: "replicate.com",
    stabilityai: "stability.ai",
    runway: "runwayml.com",
    luma: "lumalabs.ai",
    elevenlabs: "elevenlabs.io",
    xai: "x.ai",
    trello: "trello.com",
    evernote: "evernote.com",
    pipedrive: "pipedrive.com",
    close: "close.com",
    tiktok: "tiktok.com",
    pinterest: "pinterest.com",
    amplitude: "amplitude.com",
    mixpanel: "mixpanel.com",
    "google-analytics": "analytics.google.com",
    "power-bi": "powerbi.microsoft.com",
    segment: "segment.com",
    hellosign: "hellosign.com",
    docusign: "docusign.com",
    surveymonkey: "surveymonkey.com",
    looker: "looker.com",
    tableau: "tableau.com",
    intercom: "intercom.com",
    freshdesk: "freshdesk.com",
    kustomer: "kustomer.com",
    buffer: "buffer.com",
    hootsuite: "hootsuite.com",
    calendly: "calendly.com",
    "cal-com": "cal.com",
    clickup: "clickup.com",
    marketo: "marketo.com",
    klaviyo: "klaviyo.com",
    mailchimp: "mailchimp.com",
    sendgrid: "sendgrid.com",
    datadog: "datadoghq.com",
    sentry: "sentry.io",
    pagerduty: "pagerduty.com",
    vercel: "vercel.com",
    circleci: "circleci.com",
    quickbooks: "quickbooks.intuit.com",
    freshbooks: "freshbooks.com",
    aws: "aws.amazon.com",
    "aws-s3": "aws.amazon.com",
    "google-cloud": "cloud.google.com",
    "google-cloud-storage": "cloud.google.com",
    "azure-devops": "dev.azure.com",
    "azure-storage": "azure.microsoft.com",
    wix: "wix.com",
    woocommerce: "woocommerce.com",
    bigcommerce: "bigcommerce.com",
    zoom: "zoom.us",
    "google-meet": "meet.google.com",
    supabase: "supabase.com",
    gitbook: "gitbook.com",
    "bill-com": "bill.com"
};

/**
 * Get logo URL for a provider by its ID.
 * Falls back to {providerId}.com if not in the domain map.
 */
export function getProviderLogo(providerId: string): string {
    const domain = PROVIDER_LOGO_DOMAINS[providerId] || `${providerId}.com`;
    return getProviderLogoUrl(domain);
}

/**
 * All Providers - Available and Coming Soon
 * Centralized list of all integrations
 */
export const ALL_PROVIDERS: Provider[] = [
    // AI & ML
    {
        provider: "openai",
        displayName: "OpenAI",
        description: "GPT models and AI capabilities",
        logoUrl: getBrandLogo("openai.com"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "anthropic",
        displayName: "Anthropic",
        description: "Claude AI assistant",
        logoUrl: getBrandLogo("anthropic.com"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "google",
        displayName: "Google AI",
        description: "Gemini models with vision, audio, and massive context windows",
        logoUrl: getBrandLogo("google.com"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "huggingface",
        displayName: "Hugging Face",
        description: "Access thousands of open-source AI models including Llama, Qwen, and Mistral",
        logoUrl: getBrandLogo("huggingface.co"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "fal",
        displayName: "FAL.ai",
        description: "Fast inference for Flux image generation, video models, and AI tools",
        logoUrl: getBrandLogo("fal.ai"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "xai",
        displayName: "x.ai",
        description: "Grok models with powerful reasoning and real-time knowledge",
        logoUrl: getBrandLogo("x.ai"),
        category: "AI & ML",
        methods: ["api_key"]
    },

    // Communication
    {
        provider: "slack",
        displayName: "Slack",
        description: "Send messages and manage channels",
        logoUrl: getBrandLogo("slack.com"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "discord",
        displayName: "Discord",
        description:
            "Send messages to channels, manage webhooks, and automate Discord interactions",
        logoUrl: getBrandLogo("discord.com"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "telegram",
        displayName: "Telegram",
        description: "Send messages, media, and manage chats via Telegram Bot API",
        logoUrl: getBrandLogo("telegram.org"),
        category: "Communication",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Bot Token",
            keyPlaceholder: "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ",
            helpText: "Get your bot token from @BotFather on Telegram",
            helpUrl: "https://t.me/botfather"
        }
    },
    {
        provider: "microsoft-teams",
        displayName: "Microsoft Teams",
        description: "Team collaboration and messaging",
        logoUrl: getBrandLogo("teams.microsoft.com"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-outlook",
        displayName: "Microsoft Outlook",
        description: "Email and calendar service",
        logoUrl: getBrandLogo("outlook.live.com"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-excel",
        displayName: "Microsoft Excel",
        description: "Spreadsheet automation and data processing",
        logoUrl: getBrandLogo("microsoft.com/excel"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-word",
        displayName: "Microsoft Word",
        description: "Document creation and editing",
        logoUrl: getBrandLogo("microsoft.com/word"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-powerpoint",
        displayName: "Microsoft PowerPoint",
        description: "Presentation software",
        logoUrl: getBrandLogo("microsoft.com/powerpoint"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "whatsapp",
        displayName: "WhatsApp Business",
        description: "Send WhatsApp messages via API",
        logoUrl: getBrandLogo("whatsapp.com"),
        category: "Communication",
        methods: ["oauth2"]
    },

    // Productivity & Collaboration
    {
        provider: "notion",
        displayName: "Notion",
        description: "Manage databases and pages",
        logoUrl: getBrandLogo("notion.so"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "gitbook",
        displayName: "GitBook",
        description: "Documentation platform for technical content, API docs, and knowledge bases",
        logoUrl: getBrandLogo("gitbook.com"),
        category: "Productivity",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Personal Access Token",
            keyPlaceholder: "gb_api_...",
            helpText: "Create a personal access token in your GitBook developer settings",
            helpUrl: "https://app.gitbook.com/account/developer"
        }
    },
    {
        provider: "airtable",
        displayName: "Airtable",
        description: "Manage records, bases, and collaborate in Airtable",
        logoUrl: getBrandLogo("airtable.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "coda",
        displayName: "Coda",
        description: "Interact with Coda documents and tables",
        logoUrl: getBrandLogo("coda.io"),
        category: "Productivity",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Token",
            keyPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            helpText: "Find your API token in Coda Account Settings > API Settings",
            helpUrl: "https://coda.io/account#apiSettings"
        }
    },

    // Developer Tools
    {
        provider: "github",
        displayName: "GitHub",
        description: "Manage repos, issues, and pull requests",
        logoUrl: getBrandLogo("github.com"),
        category: "Developer Tools",
        methods: ["api_key", "oauth2"]
    },
    {
        provider: "gitlab",
        displayName: "GitLab",
        description: "Manage GitLab projects, issues, merge requests, and CI/CD pipelines",
        logoUrl: getBrandLogo("gitlab.com"),
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        oauthSettings: [
            {
                name: "instanceUrl",
                label: "GitLab Instance URL (optional)",
                placeholder: "https://gitlab.example.com",
                helpText: "Leave empty for GitLab.com, or enter your self-hosted GitLab URL",
                required: false,
                type: "text"
            }
        ],
        apiKeySettings: {
            keyLabel: "Personal Access Token",
            keyPlaceholder: "glpat-xxxxxxxxxxxxxxxxxxxxx",
            helpText: "Create a Personal Access Token with api scope",
            helpUrl: "https://gitlab.com/-/profile/personal_access_tokens"
        }
    },
    {
        provider: "bitbucket",
        displayName: "Bitbucket",
        description: "Manage Bitbucket repositories, pull requests, and pipelines",
        logoUrl: getBrandLogo("bitbucket.org"),
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        apiKeySettings: {
            keyLabel: "App Password",
            keyPlaceholder: "xxxxxxxxxxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Username",
            secretPlaceholder: "your-username",
            helpText: "Create an App Password in Bitbucket settings",
            helpUrl: "https://bitbucket.org/account/settings/app-passwords/"
        }
    },

    // Project Management
    {
        provider: "jira",
        displayName: "Jira Cloud",
        description: "Project tracking and issue management for agile teams",
        logoUrl: getBrandLogo("atlassian.com/jira"),
        category: "Project Management",
        methods: ["oauth2"]
    },
    {
        provider: "asana",
        displayName: "Asana",
        description: "Manage tasks, projects, sections, and collaborate with your team",
        logoUrl: getBrandLogo("asana.com"),
        category: "Project Management",
        methods: ["oauth2"]
    },
    {
        provider: "trello",
        displayName: "Trello",
        description: "Manage boards, lists, and cards for project organization",
        logoUrl: getBrandLogo("trello.com"),
        category: "Project Management",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            secretLabel: "API Token",
            requiresSecret: true,
            helpText: "Get your API key and generate a token from the Power-Ups admin page",
            helpUrl: "https://trello.com/power-ups/admin"
        }
    },
    {
        provider: "monday",
        displayName: "Monday.com",
        description: "Manage boards, items, groups, and automate work management",
        logoUrl: getBrandLogo("monday.com"),
        category: "Project Management",
        methods: ["oauth2"]
    },
    {
        provider: "clickup",
        displayName: "ClickUp",
        description: "Manage tasks, lists, folders, and spaces in your ClickUp workspace",
        logoUrl: getBrandLogo("clickup.com"),
        category: "Project Management",
        methods: ["oauth2"]
    },
    {
        provider: "basecamp",
        displayName: "Basecamp",
        description: "Project management and collaboration",
        logoUrl: getBrandLogo("basecamp.com"),
        category: "Project Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "wrike",
        displayName: "Wrike",
        description: "Work management platform",
        logoUrl: getBrandLogo("wrike.com"),
        category: "Project Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "smartsheet",
        displayName: "Smartsheet",
        description: "Work execution platform",
        logoUrl: getBrandLogo("smartsheet.com"),
        category: "Project Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "todoist",
        displayName: "Todoist",
        description: "Task management application",
        logoUrl: getBrandLogo("todoist.com"),
        category: "Project Management",
        methods: ["api_key"],
        comingSoon: true
    },

    // CRM & Sales
    {
        provider: "salesforce",
        displayName: "Salesforce",
        description: "Manage leads, contacts, and opportunities",
        logoUrl: getBrandLogo("salesforce.com"),
        category: "CRM & Sales",
        methods: ["oauth2"]
    },
    {
        provider: "hubspot",
        displayName: "HubSpot",
        description: "Manage contacts, companies, deals, and more",
        logoUrl: getBrandLogo("hubspot.com"),
        category: "CRM & Sales",
        methods: ["oauth2"]
    },
    {
        provider: "apollo",
        displayName: "Apollo.io",
        description: "Sales intelligence platform with 210M+ contacts and 35M+ companies",
        logoUrl: getBrandLogo("apollo.io"),
        category: "CRM & Sales",
        methods: ["oauth2"]
    },
    {
        provider: "pipedrive",
        displayName: "Pipedrive",
        description: "Manage sales pipelines, deals, contacts, and activities",
        logoUrl: getBrandLogo("pipedrive.com"),
        category: "CRM & Sales",
        methods: ["api_key", "oauth2"]
    },

    // E-commerce & Payments
    {
        provider: "shopify",
        displayName: "Shopify",
        description: "Manage products, orders, inventory, and customers",
        logoUrl: getBrandLogo("shopify.com"),
        category: "E-commerce",
        methods: ["oauth2"],
        comingSoon: false
    },

    // Marketing & Email
    {
        provider: "mailchimp",
        displayName: "Mailchimp",
        description: "Manage email campaigns, audiences, members, and templates",
        logoUrl: getBrandLogo("mailchimp.com"),
        category: "Marketing",
        methods: ["oauth2"],
        comingSoon: false
    },
    {
        provider: "sendgrid",
        displayName: "SendGrid",
        description: "Send transactional emails, manage contacts and lists",
        logoUrl: getBrandLogo("sendgrid.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: false
    },
    {
        provider: "twilio",
        displayName: "Twilio",
        description: "Send SMS and make calls",
        logoUrl: getBrandLogo("twilio.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },

    // File Storage
    {
        provider: "dropbox",
        displayName: "Dropbox",
        description: "Manage files and folders",
        logoUrl: getBrandLogo("dropbox.com"),
        category: "File Storage",
        methods: ["oauth2"]
    },
    {
        provider: "box",
        displayName: "Box",
        description: "Manage enterprise files",
        logoUrl: getBrandLogo("box.com"),
        category: "File Storage",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-onedrive",
        displayName: "Microsoft OneDrive",
        description: "Cloud file storage and sync",
        logoUrl: getBrandLogo("onedrive.live.com"),
        category: "File Storage",
        methods: ["oauth2"]
    },

    // Social Media
    {
        provider: "twitter",
        displayName: "X (Twitter)",
        description: "Post tweets, read timeline, and manage your X account",
        logoUrl: getBrandLogo("x.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "linkedin",
        displayName: "LinkedIn",
        description: "Create posts, share articles, manage comments and reactions on LinkedIn",
        logoUrl: getBrandLogo("linkedin.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "facebook",
        displayName: "Facebook",
        description: "Send messages and manage pages via Messenger",
        logoUrl: getBrandLogo("facebook.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "instagram",
        displayName: "Instagram",
        description: "Send messages and publish content",
        logoUrl: getBrandLogo("instagram.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },

    // Analytics
    {
        provider: "google-analytics",
        displayName: "Google Analytics",
        description: "Track and analyze website traffic",
        logoUrl: getBrandLogo("analytics.google.com"),
        category: "Analytics",
        methods: ["oauth2"]
    },
    {
        provider: "mixpanel",
        displayName: "Mixpanel",
        description: "Product analytics and insights",
        logoUrl: getBrandLogo("mixpanel.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Project Token",
            keyPlaceholder: "your-project-token",
            helpText: "Find your Project Token in Mixpanel Project Settings",
            helpUrl: "https://mixpanel.com/settings/project"
        }
    },
    {
        provider: "amplitude",
        displayName: "Amplitude",
        description: "Product analytics platform",
        logoUrl: getBrandLogo("amplitude.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "your-api-key",
            requiresSecret: true,
            secretLabel: "Secret Key",
            secretPlaceholder: "your-secret-key",
            helpText: "Find your API Key and Secret Key in Amplitude project settings",
            helpUrl: "https://analytics.amplitude.com/settings/projects"
        }
    },
    {
        provider: "segment",
        displayName: "Segment",
        description: "Customer data platform",
        logoUrl: getBrandLogo("segment.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Write Key",
            keyPlaceholder: "Enter your Segment Write Key",
            helpText: "Find your Write Key in Segment > Sources > Your Source > API Keys",
            helpUrl: "https://segment.com/docs/connections/find-writekey/"
        }
    },
    {
        provider: "hotjar",
        displayName: "Hotjar",
        description: "Behavior analytics and user feedback",
        logoUrl: getBrandLogo("hotjar.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Client ID",
            keyPlaceholder: "Enter your Hotjar Client ID",
            requiresSecret: true,
            secretLabel: "Client Secret",
            secretPlaceholder: "Enter your Hotjar Client Secret",
            helpText: "Generate API keys in Hotjar under Organization Settings > API Keys",
            helpUrl:
                "https://help.hotjar.com/hc/en-us/articles/36819965653009-How-to-Set-Up-the-Hotjar-API"
        }
    },
    {
        provider: "heap",
        displayName: "Heap",
        description: "Product analytics platform",
        logoUrl: getBrandLogo("heap.io"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "App ID",
            keyPlaceholder: "your-app-id",
            helpText:
                "Find your App ID in Heap Administration > Account > Manage > Privacy & Security",
            helpUrl: "https://developers.heap.io/reference/server-side-apis-overview"
        }
    },
    {
        provider: "posthog",
        displayName: "PostHog",
        description: "Product analytics and feature flags",
        logoUrl: getBrandLogo("posthog.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Project API Key",
            keyPlaceholder: "phc_xxxxx",
            requiresSecret: true,
            secretLabel: "Host URL (optional)",
            secretPlaceholder: "https://us.i.posthog.com",
            helpText:
                "Find your Project API Key in PostHog Project Settings. Leave host blank for US Cloud.",
            helpUrl: "https://posthog.com/docs/api"
        }
    },

    // Accounting & Finance
    {
        provider: "quickbooks",
        displayName: "QuickBooks",
        description: "Accounting and bookkeeping",
        logoUrl: getBrandLogo("quickbooks.intuit.com"),
        category: "Accounting",
        methods: ["oauth2"]
    },
    {
        provider: "xero",
        displayName: "Xero",
        description: "Cloud accounting software",
        logoUrl: getBrandLogo("xero.com"),
        category: "Accounting",
        methods: ["oauth2"]
    },
    {
        provider: "stripe",
        displayName: "Stripe",
        description: "Payment processing platform",
        logoUrl: getBrandLogo("stripe.com"),
        category: "Payment Processing",
        methods: ["api_key"]
    },
    {
        provider: "plaid",
        displayName: "Plaid",
        description: "Banking and financial data",
        logoUrl: getBrandLogo("plaid.com"),
        category: "Accounting",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Client ID",
            keyPlaceholder: "Enter your Plaid client ID",
            requiresSecret: true,
            secretLabel: "Secret",
            secretPlaceholder: "Enter your Plaid secret",
            helpText: "Find your credentials in the Plaid Dashboard under Team Settings > Keys",
            helpUrl: "https://dashboard.plaid.com/team/keys"
        }
    },
    {
        provider: "sage",
        displayName: "Sage",
        description: "Business accounting software",
        logoUrl: getBrandLogo("sage.com"),
        category: "Accounting",
        methods: ["oauth2"]
    },
    {
        provider: "freshbooks",
        displayName: "FreshBooks",
        description: "Small business accounting",
        logoUrl: getBrandLogo("freshbooks.com"),
        category: "Accounting",
        methods: ["oauth2"]
    },
    {
        provider: "bill-com",
        displayName: "Bill.com",
        description: "Accounts payable and receivable automation",
        logoUrl: getBrandLogo("bill.com"),
        category: "Accounting",
        methods: ["oauth2"]
    },
    {
        provider: "expensify",
        displayName: "Expensify",
        description: "Expense management and reporting",
        logoUrl: getBrandLogo("expensify.com"),
        category: "Accounting",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Partner User ID",
            keyPlaceholder: "your-partner-user-id",
            requiresSecret: true,
            secretLabel: "Partner User Secret",
            secretPlaceholder: "your-partner-user-secret",
            helpText: "Get your Partner User ID and Secret from the Expensify Integrations page",
            helpUrl: "https://www.expensify.com/tools/integrations/"
        }
    },
    {
        provider: "ramp",
        displayName: "Ramp",
        description: "Corporate card and expense management",
        logoUrl: getBrandLogo("ramp.com"),
        category: "Accounting",
        methods: ["oauth2"]
    },
    {
        provider: "wise",
        displayName: "Wise",
        description: "International money transfers",
        logoUrl: getBrandLogo("wise.com"),
        category: "Accounting",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Token",
            keyPlaceholder: "your-personal-api-token",
            helpText: "Generate a Personal API Token in your Wise account settings",
            helpUrl: "https://wise.com/settings/api-tokens"
        }
    },

    // HR & Recruiting
    {
        provider: "workday",
        displayName: "Workday",
        description: "Enterprise HR and finance",
        logoUrl: getBrandLogo("workday.com"),
        category: "HR",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "tenant",
                label: "Workday Tenant",
                placeholder: "your-company",
                helpText:
                    "Enter your Workday tenant ID (found in your Workday URL, e.g., 'acme' from acme.workday.com)",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$",
                patternError: "Tenant must start and end with a letter or number"
            }
        ]
    },
    {
        provider: "adp",
        displayName: "ADP",
        description: "Payroll and HR management",
        logoUrl: getBrandLogo("adp.com"),
        category: "HR",
        methods: ["oauth2"]
    },
    {
        provider: "gusto",
        displayName: "Gusto",
        description: "Payroll and benefits platform",
        logoUrl: getBrandLogo("gusto.com"),
        category: "HR",
        methods: ["oauth2"]
    },
    {
        provider: "rippling",
        displayName: "Rippling",
        description: "HR and IT management",
        logoUrl: getBrandLogo("rippling.com"),
        category: "HR",
        methods: ["oauth2"]
    },
    {
        provider: "bamboohr",
        displayName: "BambooHR",
        description: "HR management for SMBs",
        logoUrl: getBrandLogo("bamboohr.com"),
        category: "HR",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "companyDomain",
                label: "Company Subdomain",
                placeholder: "your-company",
                helpText:
                    "Enter your BambooHR company subdomain (found in your URL, e.g., 'acme' from acme.bamboohr.com)",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$",
                patternError: "Subdomain must start and end with a letter or number"
            }
        ]
    },
    {
        provider: "hibob",
        displayName: "HiBob",
        description: "Modern HR for mid-market",
        logoUrl: getBrandLogo("hibob.com"),
        category: "HR",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "deel",
        displayName: "Deel",
        description: "Global HR and payroll",
        logoUrl: getBrandLogo("deel.com"),
        category: "HR",
        methods: ["api_key", "oauth2"],
        comingSoon: true
    },
    {
        provider: "personio",
        displayName: "Personio",
        description: "European HR platform",
        logoUrl: getBrandLogo("personio.com"),
        category: "HR",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "sap-successfactors",
        displayName: "SAP SuccessFactors",
        description: "Enterprise HCM suite",
        logoUrl: getBrandLogo("sap.com"),
        category: "HR",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "lattice",
        displayName: "Lattice",
        description: "Performance and engagement",
        logoUrl: getBrandLogo("lattice.com"),
        category: "HR",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "lat_...",
            helpText: "Generate an API key from your Lattice admin dashboard under Integrations",
            helpUrl: "https://lattice.com"
        }
    },

    // Customer Support
    {
        provider: "zendesk",
        displayName: "Zendesk",
        description: "Customer support ticketing",
        logoUrl: getBrandLogo("zendesk.com"),
        category: "Customer Support",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "subdomain",
                label: "Zendesk Subdomain",
                placeholder: "your-company",
                helpText: "Enter your Zendesk subdomain (e.g., 'acme' from acme.zendesk.com)",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$",
                patternError:
                    "Subdomain must start and end with a letter or number, and can contain hyphens"
            }
        ]
    },
    {
        provider: "intercom",
        displayName: "Intercom",
        description: "Customer messaging and engagement platform",
        logoUrl: getBrandLogo("intercom.com"),
        category: "Customer Support",
        methods: ["oauth2"]
    },
    {
        provider: "freshdesk",
        displayName: "Freshdesk",
        description: "Customer support and ticketing software",
        logoUrl: getBrandLogo("freshdesk.com"),
        category: "Customer Support",
        methods: ["api_key"],
        oauthSettings: [
            {
                name: "subdomain",
                label: "Freshdesk Subdomain",
                placeholder: "your-company",
                helpText: "Enter your Freshdesk subdomain (e.g., 'acme' from acme.freshdesk.com)",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$",
                patternError: "Subdomain must start and end with a letter or number"
            }
        ],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "your-api-key",
            helpText: "Find your API key in Freshdesk Profile Settings",
            helpUrl: "https://support.freshdesk.com/en/support/solutions/articles/215517"
        }
    },
    {
        provider: "helpscout",
        displayName: "Help Scout",
        description: "Help desk software",
        logoUrl: getBrandLogo("helpscout.com"),
        category: "Customer Support",
        methods: ["oauth2"]
    },
    {
        provider: "livechat",
        displayName: "LiveChat",
        description: "Live chat customer service",
        logoUrl: getBrandLogo("livechat.com"),
        category: "Customer Support",
        methods: ["oauth2"]
    },
    {
        provider: "drift",
        displayName: "Drift",
        description: "Conversational marketing platform",
        logoUrl: getBrandLogo("drift.com"),
        category: "Customer Support",
        methods: ["oauth2"]
    },
    {
        provider: "kustomer",
        displayName: "Kustomer",
        description: "CRM-powered customer service platform",
        logoUrl: getBrandLogo("kustomer.com"),
        category: "Customer Support",
        methods: ["api_key"],
        oauthSettings: [
            {
                name: "orgName",
                label: "Organization Name",
                placeholder: "your-org",
                helpText:
                    "Enter your Kustomer organization name (e.g., 'acme' from acme.api.kustomerapp.com)",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$",
                patternError: "Organization name must contain only letters, numbers, and hyphens"
            }
        ],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "your-api-key",
            helpText: "Create an API key in Kustomer Settings > Security > API Keys",
            helpUrl: "https://help.kustomer.com/api-introduction-BkwVN42zM"
        }
    },
    {
        provider: "crisp",
        displayName: "Crisp",
        description: "Customer messaging platform",
        logoUrl: getBrandLogo("crisp.chat"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "gorgias",
        displayName: "Gorgias",
        description:
            "E-commerce helpdesk platform for managing customer support tickets, customers, and messages",
        logoUrl: getBrandLogo("gorgias.com"),
        category: "Customer Support",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "subdomain",
                label: "Gorgias Subdomain",
                placeholder: "your-company",
                helpText: "Enter your Gorgias subdomain (e.g., 'acme' from acme.gorgias.com)",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$",
                patternError: "Subdomain must contain only letters, numbers, and hyphens"
            }
        ]
    },

    // E-commerce (Additional)
    {
        provider: "woocommerce",
        displayName: "WooCommerce",
        description: "Manage products, orders, customers, and inventory in your WooCommerce store",
        logoUrl: getBrandLogo("woocommerce.com"),
        category: "E-commerce",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Consumer Key",
            keyPlaceholder: "ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Consumer Secret",
            secretPlaceholder: "cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            helpText: "Generate REST API keys in WooCommerce > Settings > Advanced > REST API",
            helpUrl: "https://woocommerce.com/document/woocommerce-rest-api/"
        },
        oauthSettings: [
            {
                name: "storeUrl",
                label: "Store URL",
                placeholder: "https://mystore.com",
                helpText:
                    "Your WooCommerce store URL (must use HTTPS and have pretty permalinks enabled)",
                required: true,
                type: "text",
                pattern: "^https://",
                patternError: "Store URL must use HTTPS"
            }
        ]
    },
    {
        provider: "magento",
        displayName: "Magento",
        description: "E-commerce platform",
        logoUrl: getBrandLogo("magento.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "bigcommerce",
        displayName: "BigCommerce",
        description: "Manage products, orders, customers, and inventory in your BigCommerce store",
        logoUrl: getBrandLogo("bigcommerce.com"),
        category: "E-commerce",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Access Token",
            keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Store Hash",
            secretPlaceholder: "abc123xyz",
            helpText:
                "Create an API Account in BigCommerce Control Panel > Advanced Settings > API Accounts",
            helpUrl: "https://developer.bigcommerce.com/docs/start/authentication/api-accounts"
        }
    },
    {
        provider: "square",
        displayName: "Square",
        description: "Payment and POS system",
        logoUrl: getBrandLogo("squareup.com"),
        category: "Payment Processing",
        methods: ["oauth2"]
    },
    {
        provider: "paypal",
        displayName: "PayPal",
        description: "Payment processing platform",
        logoUrl: getBrandLogo("paypal.com"),
        category: "Payment Processing",
        methods: ["oauth2"]
    },
    {
        provider: "amazon-seller-central",
        displayName: "Amazon Seller Central",
        description: "Manage orders, catalog items, inventory, and pricing on Amazon marketplaces",
        logoUrl: getBrandLogo("sellercentral.amazon.com"),
        category: "E-commerce",
        methods: ["oauth2"]
    },
    {
        provider: "ebay",
        displayName: "eBay",
        description: "Manage listings, orders, and inventory on eBay marketplace",
        logoUrl: getBrandLogo("ebay.com"),
        category: "E-commerce",
        methods: ["oauth2"]
    },
    {
        provider: "etsy",
        displayName: "Etsy",
        description: "Manage shop listings, orders, and customers on Etsy marketplace",
        logoUrl: getBrandLogo("etsy.com"),
        category: "E-commerce",
        methods: ["oauth2"],
        comingSoon: false
    },
    {
        provider: "squarespace",
        displayName: "Squarespace",
        description: "Manage products, orders, and inventory in your Squarespace store",
        logoUrl: getBrandLogo("squarespace.com"),
        category: "E-commerce",
        methods: ["oauth2"],
        comingSoon: false
    },
    {
        provider: "wix",
        displayName: "Wix",
        description: "Manage products, orders, and customers in your Wix eCommerce store",
        logoUrl: getBrandLogo("wix.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: false,
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "IST.xxxxx.xxxxx",
            helpText: "Generate an API key in Wix API Keys Manager",
            helpUrl: "https://manage.wix.com/account/api-keys"
        },
        oauthSettings: [
            {
                name: "siteId",
                label: "Site ID",
                placeholder: "abc123de-f456-7890-gh12-ijklmnopqrst",
                helpText: "Find your Site ID in your Wix dashboard URL after /dashboard/",
                required: true,
                type: "text"
            }
        ]
    },
    {
        provider: "shippo",
        displayName: "Shippo",
        description: "Multi-carrier shipping API",
        logoUrl: getBrandLogo("goshippo.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "shipstation",
        displayName: "ShipStation",
        description: "Shipping and fulfillment",
        logoUrl: getBrandLogo("shipstation.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
    },

    // Marketing (Additional)
    {
        provider: "hubspot-marketing",
        displayName: "HubSpot Marketing",
        description: "Marketing automation",
        logoUrl: getBrandLogo("hubspot.com"),
        category: "Marketing",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "marketo",
        displayName: "Marketo",
        description: "Marketing automation platform",
        logoUrl: getBrandLogo("marketo.com"),
        category: "Marketing",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Client ID",
            keyPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Client Secret",
            secretPlaceholder: "your-client-secret",
            helpText:
                "Enter your Marketo REST API credentials. Also provide your Instance URL (e.g., 123-ABC-456.mktorest.com) in the connection settings.",
            helpUrl: "https://developers.marketo.com/rest-api/authentication/"
        },
        oauthSettings: [
            {
                name: "instanceUrl",
                label: "Instance URL",
                placeholder: "123-ABC-456.mktorest.com",
                helpText:
                    "Your Marketo instance URL (e.g., 123-ABC-456.mktorest.com). Find this in Admin > Integration > Web Services",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9-]+\\.mktorest\\.com$",
                patternError:
                    "Must be a valid Marketo instance URL (e.g., 123-ABC-456.mktorest.com)"
            }
        ]
    },
    {
        provider: "activecampaign",
        displayName: "ActiveCampaign",
        description: "Email marketing automation",
        logoUrl: getBrandLogo("activecampaign.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "constantcontact",
        displayName: "Constant Contact",
        description: "Email marketing platform",
        logoUrl: getBrandLogo("constantcontact.com"),
        category: "Marketing",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "typeform",
        displayName: "Typeform",
        description: "Online forms and surveys",
        logoUrl: getBrandLogo("typeform.com"),
        category: "Forms & Surveys",
        methods: ["oauth2"]
    },
    {
        provider: "surveymonkey",
        displayName: "SurveyMonkey",
        description: "Online survey platform",
        logoUrl: getBrandLogo("surveymonkey.com"),
        category: "Forms & Surveys",
        methods: ["oauth2"]
    },
    {
        provider: "klaviyo",
        displayName: "Klaviyo",
        description: "E-commerce marketing automation",
        logoUrl: getBrandLogo("klaviyo.com"),
        category: "Marketing",
        methods: ["oauth2"]
    },
    {
        provider: "pardot",
        displayName: "Pardot",
        description: "Salesforce B2B marketing automation",
        logoUrl: getBrandLogo("pardot.com"),
        category: "Marketing",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "convertkit",
        displayName: "ConvertKit",
        description: "Email marketing for creators",
        logoUrl: getBrandLogo("convertkit.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "drip",
        displayName: "Drip",
        description: "E-commerce CRM and email marketing",
        logoUrl: getBrandLogo("drip.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "getresponse",
        displayName: "GetResponse",
        description: "Email marketing and automation",
        logoUrl: getBrandLogo("getresponse.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "mailgun",
        displayName: "Mailgun",
        description: "Email API service for developers",
        logoUrl: getBrandLogo("mailgun.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "sendinblue",
        displayName: "Brevo (Sendinblue)",
        description: "Marketing automation platform",
        logoUrl: getBrandLogo("brevo.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "medium",
        displayName: "Medium",
        description: "Publish stories and manage publications on Medium",
        logoUrl: getBrandLogo("medium.com"),
        category: "Content Management",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Integration Token",
            keyPlaceholder: "Enter your Medium Integration Token",
            helpText:
                "Generate an Integration Token from Medium Settings > Security and apps > Integration tokens",
            helpUrl: "https://medium.com/me/settings/security"
        }
    },

    // CRM & Sales (Additional)
    {
        provider: "zoho-crm",
        displayName: "Zoho CRM",
        description: "Customer relationship management",
        logoUrl: getBrandLogo("zoho.com"),
        category: "CRM & Sales",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "dataCenter",
                label: "Data Center Region",
                placeholder: "Select your Zoho data center",
                helpText: "Choose the region where your Zoho account is hosted",
                required: true,
                type: "select",
                options: [
                    { value: "us", label: "United States (zoho.com)" },
                    { value: "eu", label: "Europe (zoho.eu)" },
                    { value: "au", label: "Australia (zoho.com.au)" },
                    { value: "in", label: "India (zoho.in)" },
                    { value: "jp", label: "Japan (zoho.jp)" },
                    { value: "cn", label: "China (zoho.com.cn)" },
                    { value: "ca", label: "Canada (zohocloud.ca)" }
                ]
            }
        ]
    },
    {
        provider: "copper",
        displayName: "Copper",
        description: "CRM for Google Workspace",
        logoUrl: getBrandLogo("copper.com"),
        category: "CRM & Sales",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "Your Copper API key",
            requiresSecret: true,
            secretLabel: "Email Address",
            secretPlaceholder: "you@company.com",
            helpText:
                "Enter your Copper API key and the email address associated with your Copper account",
            helpUrl:
                "https://support.copper.com/hc/en-us/articles/115001212290-How-to-generate-an-API-key"
        }
    },
    {
        provider: "close",
        displayName: "Close",
        description: "Sales engagement CRM for managing leads, contacts, and opportunities",
        logoUrl: getBrandLogo("close.com"),
        category: "CRM & Sales",
        methods: ["api_key", "oauth2"]
    },
    {
        provider: "insightly",
        displayName: "Insightly",
        description: "CRM and project management",
        logoUrl: getBrandLogo("insightly.com"),
        category: "CRM & Sales",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "Your Insightly API key",
            requiresSecret: true,
            secretLabel: "Instance Pod",
            secretPlaceholder: "na1",
            helpText:
                "Enter your API key and pod (na1, eu1, au1). Find these in User Settings > API section",
            helpUrl: "https://support.insight.ly/en/articles/1795647-find-your-api-key"
        }
    },

    // Collaboration (Additional Productivity)
    {
        provider: "google-drive",
        displayName: "Google Drive",
        description: "Cloud file storage and sharing",
        logoUrl: getBrandLogo("drive.google.com"),
        category: "File Storage",
        methods: ["oauth2"]
    },
    {
        provider: "google-sheets",
        displayName: "Google Sheets",
        description: "Cloud spreadsheet application",
        logoUrl: getBrandLogo("sheets.google.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "google-docs",
        displayName: "Google Docs",
        description: "Cloud document editing",
        logoUrl: getBrandLogo("docs.google.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "google-slides",
        displayName: "Google Slides",
        description: "Cloud presentation software",
        logoUrl: getBrandLogo("slides.google.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "gmail",
        displayName: "Gmail",
        description: "Email service and automation",
        logoUrl: getBrandLogo("gmail.com"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "google-calendar",
        displayName: "Google Calendar",
        description: "Calendar and scheduling",
        logoUrl: getBrandLogo("calendar.google.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "miro",
        displayName: "Miro",
        description: "Online whiteboard platform",
        logoUrl: getBrandLogo("miro.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "confluence",
        displayName: "Confluence",
        description: "Team workspace by Atlassian",
        logoUrl: getBrandLogo("atlassian.com/confluence"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "sharepoint",
        displayName: "SharePoint",
        description: "Microsoft document management",
        logoUrl: getBrandLogo("sharepoint.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "evernote",
        displayName: "Evernote",
        description: "Note-taking, organization, and search across notes, notebooks, and tags",
        logoUrl: getBrandLogo("evernote.com"),
        category: "Productivity",
        methods: ["oauth1"]
    },
    {
        provider: "figma",
        displayName: "Figma",
        description: "Design and prototyping tool - access files, components, comments",
        logoUrl: getBrandLogo("figma.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "canva",
        displayName: "Canva",
        description: "Graphic design platform",
        logoUrl: getBrandLogo("canva.com"),
        category: "Productivity",
        methods: ["oauth2"]
    },

    // Video & Communication
    {
        provider: "zoom",
        displayName: "Zoom",
        description: "Video conferencing platform",
        logoUrl: getBrandLogo("zoom.us"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "calendly",
        displayName: "Calendly",
        description: "Schedule meetings and manage calendar bookings",
        logoUrl: getBrandLogo("calendly.com"),
        category: "Scheduling",
        methods: ["oauth2"]
    },
    {
        provider: "loom",
        displayName: "Loom",
        description: "Video messaging platform",
        logoUrl: getBrandLogo("loom.com"),
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "ringcentral",
        displayName: "RingCentral",
        description: "Business phone and messaging",
        logoUrl: getBrandLogo("ringcentral.com"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "webex",
        displayName: "Webex",
        description: "Cisco video conferencing",
        logoUrl: getBrandLogo("webex.com"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "google-meet",
        displayName: "Google Meet",
        description: "Video conferencing by Google",
        logoUrl: getBrandLogo("meet.google.com"),
        category: "Communication",
        methods: ["oauth2"]
    },
    {
        provider: "front",
        displayName: "Front",
        description: "Shared inbox and team collaboration",
        logoUrl: getBrandLogo("front.com"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "postmark",
        displayName: "Postmark",
        description: "Transactional email delivery",
        logoUrl: getBrandLogo("postmarkapp.com"),
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "messagebird",
        displayName: "MessageBird",
        description: "Communications platform API",
        logoUrl: getBrandLogo("messagebird.com"),
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "vonage",
        displayName: "Vonage",
        description: "Communications APIs",
        logoUrl: getBrandLogo("vonage.com"),
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true
    },

    // Developer Tools (Additional)
    {
        provider: "linear",
        displayName: "Linear",
        description: "Issue tracking for software teams",
        logoUrl: getBrandLogo("linear.app"),
        category: "Developer Tools",
        methods: ["oauth2"]
    },
    {
        provider: "vercel",
        displayName: "Vercel",
        description:
            "Frontend deployment platform for managing projects, deployments, domains, and environment variables",
        logoUrl: getBrandLogo("vercel.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Access Token",
            keyPlaceholder: "Enter your Vercel Access Token",
            helpText: "Create an Access Token in Vercel Account Settings > Tokens",
            helpUrl: "https://vercel.com/account/tokens"
        }
    },
    {
        provider: "netlify",
        displayName: "Netlify",
        description: "Web hosting and automation",
        logoUrl: getBrandLogo("netlify.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "datadog",
        displayName: "Datadog",
        description: "Monitoring and analytics platform for cloud-scale applications",
        logoUrl: getBrandLogo("datadoghq.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "Enter your Datadog API Key",
            requiresSecret: true,
            secretLabel: "Application Key",
            secretPlaceholder: "Enter your Datadog Application Key",
            helpText: "Both API Key and Application Key are required",
            helpUrl: "https://docs.datadoghq.com/account_management/api-app-keys/"
        },
        oauthSettings: [
            {
                name: "site",
                label: "Datadog Site",
                type: "select",
                required: true,
                options: [
                    { value: "datadoghq.com", label: "US1 (datadoghq.com)" },
                    { value: "us3.datadoghq.com", label: "US3 (us3.datadoghq.com)" },
                    { value: "us5.datadoghq.com", label: "US5 (us5.datadoghq.com)" },
                    { value: "datadoghq.eu", label: "EU (datadoghq.eu)" },
                    { value: "ap1.datadoghq.com", label: "AP1 (ap1.datadoghq.com)" }
                ],
                helpText: "Select your Datadog site (shown in your Datadog URL)"
            }
        ]
    },
    {
        provider: "sentry",
        displayName: "Sentry",
        description: "Error tracking and performance monitoring for developers",
        logoUrl: getBrandLogo("sentry.io"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Auth Token",
            keyPlaceholder: "Enter your Sentry Auth Token",
            helpText: "Use an Organization Auth Token for best results",
            helpUrl: "https://docs.sentry.io/api/guides/create-auth-token/"
        },
        oauthSettings: [
            {
                name: "region",
                label: "Sentry Region",
                type: "select",
                required: true,
                options: [
                    { value: "sentry.io", label: "US (sentry.io)" },
                    { value: "us.sentry.io", label: "US (us.sentry.io)" },
                    { value: "de.sentry.io", label: "EU/Germany (de.sentry.io)" }
                ],
                helpText: "Select your Sentry data region"
            }
        ]
    },
    {
        provider: "pagerduty",
        displayName: "PagerDuty",
        description: "Incident management and on-call scheduling platform",
        logoUrl: getBrandLogo("pagerduty.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "Enter your PagerDuty API Key",
            helpText: "Create a REST API key with read/write permissions",
            helpUrl: "https://support.pagerduty.com/main/docs/api-access-keys"
        }
    },
    {
        provider: "aws",
        displayName: "AWS",
        description:
            "Cloud platform for Lambda, CloudWatch, and ECS - manage serverless functions, monitor metrics and logs, orchestrate containers",
        logoUrl: getBrandLogo("aws.amazon.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Access Key ID",
            keyPlaceholder: "AKIAIOSFODNN7EXAMPLE",
            requiresSecret: true,
            secretLabel: "Secret Access Key",
            secretPlaceholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            helpText:
                "Create an IAM user with appropriate permissions for Lambda, CloudWatch, and ECS",
            helpUrl:
                "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
        },
        oauthSettings: [
            {
                name: "region",
                label: "AWS Region",
                type: "select",
                required: true,
                placeholder: "Select region",
                helpText: "The AWS region where your resources are located",
                options: [
                    { value: "us-east-1", label: "US East (N. Virginia)" },
                    { value: "us-east-2", label: "US East (Ohio)" },
                    { value: "us-west-1", label: "US West (N. California)" },
                    { value: "us-west-2", label: "US West (Oregon)" },
                    { value: "eu-west-1", label: "Europe (Ireland)" },
                    { value: "eu-west-2", label: "Europe (London)" },
                    { value: "eu-west-3", label: "Europe (Paris)" },
                    { value: "eu-central-1", label: "Europe (Frankfurt)" },
                    { value: "eu-north-1", label: "Europe (Stockholm)" },
                    { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
                    { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
                    { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
                    { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
                    { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
                    { value: "sa-east-1", label: "South America (São Paulo)" },
                    { value: "ca-central-1", label: "Canada (Central)" }
                ]
            }
        ]
    },
    {
        provider: "google-cloud",
        displayName: "Google Cloud",
        description:
            "Cloud platform for Cloud Build, Secret Manager, Compute Engine, and Cloud Run - CI/CD automation, secret management, VM and container orchestration",
        logoUrl: getBrandLogo("cloud.google.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "projectId",
                label: "GCP Project ID",
                type: "text",
                required: true,
                placeholder: "my-project-123456",
                helpText: "Enter your Google Cloud Project ID",
                pattern: "^[a-z][a-z0-9-]{4,28}[a-z0-9]$",
                patternError:
                    "Project ID must be 6-30 characters, lowercase letters, numbers, and hyphens only"
            }
        ]
    },
    {
        provider: "azure-devops",
        displayName: "Azure DevOps",
        description:
            "DevOps platform covering work items, repos, pipelines, releases, and test plans - complete CI/CD and project management automation",
        logoUrl: getBrandLogo("dev.azure.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "organization",
                label: "Azure DevOps Organization",
                type: "text",
                required: true,
                placeholder: "my-organization",
                helpText: "Enter your Azure DevOps organization name (from dev.azure.com/YOUR-ORG)",
                pattern: "^[a-zA-Z0-9-]+$",
                patternError: "Organization name can only contain letters, numbers, and hyphens"
            }
        ]
    },
    {
        provider: "circleci",
        displayName: "CircleCI",
        description:
            "Continuous integration platform for managing pipelines, workflows, and build jobs",
        logoUrl: getBrandLogo("circleci.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Personal API Token",
            keyPlaceholder: "Enter your CircleCI Personal API Token",
            helpText: "Create a Personal API Token in CircleCI User Settings",
            helpUrl: "https://circleci.com/docs/managing-api-tokens/"
        }
    },
    {
        provider: "cloudflare",
        displayName: "Cloudflare",
        description:
            "Manage DNS records, Workers, KV storage, and zones - CDN and edge computing platform",
        logoUrl: getBrandLogo("cloudflare.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Token",
            keyPlaceholder: "Enter your Cloudflare API Token",
            helpText: "Create an API Token with appropriate permissions in Cloudflare dashboard",
            helpUrl: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
        },
        oauthSettings: [
            {
                name: "accountId",
                label: "Account ID",
                type: "text",
                required: true,
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                helpText: "Find your Account ID on the Cloudflare dashboard Overview page",
                pattern: "^[a-f0-9]{32}$",
                patternError: "Account ID must be a 32-character hex string"
            }
        ]
    },
    {
        provider: "digitalocean",
        displayName: "DigitalOcean",
        description:
            "Cloud platform for Droplets, Kubernetes, App Platform, Databases, and Load Balancers - manage cloud infrastructure and deployments",
        logoUrl: getBrandLogo("digitalocean.com"),
        category: "Developer Tools",
        methods: ["oauth2"]
    },
    {
        provider: "heroku",
        displayName: "Heroku",
        description: "Platform as a service",
        logoUrl: getBrandLogo("heroku.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "new-relic",
        displayName: "New Relic",
        description: "Application performance monitoring",
        logoUrl: getBrandLogo("newrelic.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "postman",
        displayName: "Postman",
        description: "API development platform",
        logoUrl: getBrandLogo("postman.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },

    // Cloud Storage
    {
        provider: "aws-s3",
        displayName: "AWS S3",
        description: "Amazon Simple Storage Service for scalable cloud object storage",
        logoUrl: getBrandLogo("aws.amazon.com"),
        category: "File Storage",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Access Key ID",
            keyPlaceholder: "AKIAIOSFODNN7EXAMPLE",
            requiresSecret: true,
            secretLabel: "Secret Access Key",
            secretPlaceholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            helpText: "Create an IAM user with S3 permissions and generate access keys",
            helpUrl:
                "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
        },
        oauthSettings: [
            {
                name: "region",
                label: "AWS Region",
                type: "select",
                required: true,
                options: [
                    { value: "us-east-1", label: "US East (N. Virginia)" },
                    { value: "us-east-2", label: "US East (Ohio)" },
                    { value: "us-west-1", label: "US West (N. California)" },
                    { value: "us-west-2", label: "US West (Oregon)" },
                    { value: "eu-west-1", label: "Europe (Ireland)" },
                    { value: "eu-west-2", label: "Europe (London)" },
                    { value: "eu-west-3", label: "Europe (Paris)" },
                    { value: "eu-central-1", label: "Europe (Frankfurt)" },
                    { value: "eu-north-1", label: "Europe (Stockholm)" },
                    { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
                    { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
                    { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
                    { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
                    { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
                    { value: "sa-east-1", label: "South America (São Paulo)" },
                    { value: "ca-central-1", label: "Canada (Central)" }
                ],
                helpText: "Select the AWS region where your S3 buckets are located"
            }
        ]
    },
    {
        provider: "google-cloud-storage",
        displayName: "Google Cloud Storage",
        description: "Google Cloud Storage for unified object storage with global edge-caching",
        logoUrl: getBrandLogo("cloud.google.com"),
        category: "File Storage",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "projectId",
                label: "Google Cloud Project ID",
                placeholder: "my-project-123",
                helpText:
                    "Your Google Cloud project ID (found in Google Cloud Console > Project Settings)",
                required: true,
                type: "text",
                pattern: "^[a-z][a-z0-9-]{4,28}[a-z0-9]$",
                patternError:
                    "Project ID must be 6-30 characters, lowercase letters, digits, hyphens"
            }
        ]
    },
    {
        provider: "azure-storage",
        displayName: "Azure Blob Storage",
        description: "Microsoft Azure Blob Storage for massively scalable object storage",
        logoUrl: getBrandLogo("azure.microsoft.com"),
        category: "File Storage",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Storage Account Name",
            keyPlaceholder: "mystorageaccount",
            requiresSecret: true,
            secretLabel: "Account Key",
            secretPlaceholder: "Base64 encoded key from Azure Portal...",
            helpText: "Find these in Azure Portal > Storage Account > Access Keys",
            helpUrl:
                "https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage"
        },
        oauthSettings: [
            {
                name: "endpointSuffix",
                label: "Endpoint Suffix",
                type: "select",
                required: false,
                options: [
                    { value: "core.windows.net", label: "Azure Public (default)" },
                    { value: "core.chinacloudapi.cn", label: "Azure China" },
                    { value: "core.usgovcloudapi.net", label: "Azure Government" }
                ],
                helpText: "Select Azure cloud environment (default: Azure Public)"
            }
        ]
    },

    // Social Media (Additional)
    {
        provider: "youtube",
        displayName: "YouTube",
        description: "Search videos, manage playlists, comments, and subscriptions",
        logoUrl: getBrandLogo("youtube.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "tiktok",
        displayName: "TikTok",
        description: "Read profile info, list videos, and publish content to TikTok",
        logoUrl: getBrandLogo("tiktok.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "pinterest",
        displayName: "Pinterest",
        description: "Read and create pins, boards, and manage your Pinterest account",
        logoUrl: getBrandLogo("pinterest.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "reddit",
        displayName: "Reddit",
        description: "Read and submit posts, comments, and votes on Reddit",
        logoUrl: getBrandLogo("reddit.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },

    // Databases & Data
    {
        provider: "mongodb",
        displayName: "MongoDB",
        description: "NoSQL database platform",
        logoUrl: getBrandLogo("mongodb.com"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "supabase",
        displayName: "Supabase",
        description: "Open source Firebase alternative",
        logoUrl: getBrandLogo("supabase.com"),
        category: "Databases",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Service Role Key",
            keyPlaceholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            requiresSecret: true,
            secretLabel: "Project URL",
            secretPlaceholder: "https://your-project.supabase.co",
            helpText: "Find these in your Supabase dashboard under Settings > API",
            helpUrl: "https://supabase.com/docs/guides/api#api-url-and-keys"
        }
    },
    {
        provider: "postgresql",
        displayName: "PostgreSQL",
        description: "Relational database",
        logoUrl: getBrandLogo("postgrespro.com"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "mysql",
        displayName: "MySQL",
        description: "Relational database",
        logoUrl: getBrandLogo("mysql.com"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "redis",
        displayName: "Redis",
        description: "In-memory data store",
        logoUrl: getBrandLogo("redis.io"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "snowflake",
        displayName: "Snowflake",
        description: "Cloud data warehouse",
        logoUrl: getBrandLogo("snowflake.com"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "bigquery",
        displayName: "BigQuery",
        description: "Google Cloud data warehouse",
        logoUrl: getBrandLogo("cloud.google.com/bigquery"),
        category: "Databases",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "databricks",
        displayName: "Databricks",
        description: "Data and AI platform",
        logoUrl: getBrandLogo("databricks.com"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "elasticsearch",
        displayName: "Elasticsearch",
        description: "Search and analytics engine",
        logoUrl: getBrandLogo("elastic.co"),
        category: "Databases",
        methods: ["api_key"]
    },
    {
        provider: "pinecone",
        displayName: "Pinecone",
        description: "Vector database for AI",
        logoUrl: getBrandLogo("pinecone.io"),
        category: "Databases",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "redshift",
        displayName: "Amazon Redshift",
        description: "Cloud data warehouse",
        logoUrl: getBrandLogo("aws.amazon.com/redshift"),
        category: "Databases",
        methods: ["api_key"],
        comingSoon: true
    },

    // AI & ML (Additional)
    {
        provider: "cohere",
        displayName: "Cohere",
        description: "Language AI platform",
        logoUrl: getBrandLogo("cohere.com"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "replicate",
        displayName: "Replicate",
        description: "Flux image generation and Wan video models",
        logoUrl: getBrandLogo("replicate.com"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "stabilityai",
        displayName: "Stability AI",
        description: "Stable Diffusion image generation, upscaling, and editing",
        logoUrl: getBrandLogo("stability.ai"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "runway",
        displayName: "Runway",
        description: "Gen-3 Alpha video generation and creative AI tools",
        logoUrl: getBrandLogo("runwayml.com"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "luma",
        displayName: "Luma AI",
        description: "Dream Machine video generation and 3D capture",
        logoUrl: getBrandLogo("lumalabs.ai"),
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "elevenlabs",
        displayName: "ElevenLabs",
        description: "AI voice generation",
        logoUrl: getBrandLogo("elevenlabs.io"),
        category: "AI & ML",
        methods: ["api_key"]
    },

    // ERP Systems
    {
        provider: "sap",
        displayName: "SAP",
        description: "Enterprise resource planning",
        logoUrl: getBrandLogo("sap.com"),
        category: "ERP",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "host",
                label: "SAP API Hostname",
                placeholder: "my12345.s4hana.cloud.sap",
                helpText:
                    "Enter your SAP S/4HANA Cloud API hostname (e.g., 'my12345.s4hana.cloud.sap')",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9]$",
                patternError:
                    "Hostname must start and end with a letter or number, and can contain dots and hyphens"
            }
        ]
    },
    {
        provider: "netsuite",
        displayName: "NetSuite",
        description: "Cloud ERP software",
        logoUrl: getBrandLogo("netsuite.com"),
        category: "ERP",
        methods: ["oauth2"],
        oauthSettings: [
            {
                name: "accountId",
                label: "NetSuite Account ID",
                placeholder: "TSTDRV1234567",
                helpText:
                    "Enter your NetSuite account ID (e.g., 'TSTDRV1234567'). Found in Setup > Company > Company Information.",
                required: true,
                type: "text",
                pattern: "^[a-zA-Z0-9_-]+$",
                patternError:
                    "Account ID must contain only letters, numbers, hyphens, and underscores"
            }
        ]
    },
    {
        provider: "odoo",
        displayName: "Odoo",
        description: "Open source ERP",
        logoUrl: getBrandLogo("odoo.com"),
        category: "ERP",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "microsoft-dynamics",
        displayName: "Microsoft Dynamics 365",
        description: "Business applications and ERP",
        logoUrl: getBrandLogo("dynamics.microsoft.com"),
        category: "ERP",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "oracle-erp",
        displayName: "Oracle ERP Cloud",
        description: "Enterprise resource planning",
        logoUrl: getBrandLogo("oracle.com"),
        category: "ERP",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Payment Processing
    {
        provider: "razorpay",
        displayName: "Razorpay",
        description: "Indian payment gateway",
        logoUrl: getBrandLogo("razorpay.com"),
        category: "Payment Processing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "adyen",
        displayName: "Adyen",
        description: "Global payment platform",
        logoUrl: getBrandLogo("adyen.com"),
        category: "Payment Processing",
        methods: ["api_key"],
        comingSoon: true
    },

    // Legal & Contracts
    {
        provider: "docusign",
        displayName: "DocuSign",
        description: "E-signature and document management",
        logoUrl: getBrandLogo("docusign.com"),
        category: "Legal & Contracts",
        methods: ["oauth2"]
    },
    {
        provider: "pandadoc",
        displayName: "PandaDoc",
        description: "Document workflow automation",
        logoUrl: getBrandLogo("pandadoc.com"),
        category: "Legal & Contracts",
        methods: ["oauth2"]
    },
    {
        provider: "hellosign",
        displayName: "HelloSign",
        description: "E-signature platform",
        logoUrl: getBrandLogo("hellosign.com"),
        category: "Legal & Contracts",
        methods: ["oauth2"]
    },

    // Social Media (Management Tools)
    {
        provider: "buffer",
        displayName: "Buffer",
        description: "Schedule and publish social media posts across multiple platforms",
        logoUrl: getBrandLogo("buffer.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "hootsuite",
        displayName: "Hootsuite",
        description: "Social media management and scheduling platform",
        logoUrl: getBrandLogo("hootsuite.com"),
        category: "Social Media",
        methods: ["oauth2"]
    },
    {
        provider: "sprout-social",
        displayName: "Sprout Social",
        description: "Social media management suite",
        logoUrl: getBrandLogo("sproutsocial.com"),
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Scheduling
    {
        provider: "acuity-scheduling",
        displayName: "Acuity Scheduling",
        description: "Appointment scheduling software",
        logoUrl: getBrandLogo("acuityscheduling.com"),
        category: "Scheduling",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "cal-com",
        displayName: "Cal.com",
        description:
            "Open source scheduling platform for managing event types, bookings, and availability",
        logoUrl: getBrandLogo("cal.com"),
        category: "Scheduling",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-bookings",
        displayName: "Microsoft Bookings",
        description: "Appointment scheduling app",
        logoUrl: getBrandLogo("microsoft.com/bookings"),
        category: "Scheduling",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Forms & Surveys
    {
        provider: "google-forms",
        displayName: "Google Forms",
        description: "Create and manage forms, retrieve responses",
        logoUrl: getBrandLogo("forms.google.com"),
        category: "Forms & Surveys",
        methods: ["oauth2"]
    },
    {
        provider: "jotform",
        displayName: "Jotform",
        description: "Online form builder",
        logoUrl: getBrandLogo("jotform.com"),
        category: "Forms & Surveys",
        methods: ["api_key"],
        comingSoon: true
    },

    {
        provider: "gotowebinar",
        displayName: "GoToWebinar",
        description: "Webinar software",
        logoUrl: getBrandLogo("goto.com/webinar"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "vimeo",
        displayName: "Vimeo",
        description: "Video hosting platform",
        logoUrl: getBrandLogo("vimeo.com"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },

    // SMS & Messaging

    {
        provider: "auth0",
        displayName: "Auth0",
        description: "Authentication and authorization platform",
        logoUrl: getBrandLogo("auth0.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "okta",
        displayName: "Okta",
        description: "Identity and access management",
        logoUrl: getBrandLogo("okta.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        comingSoon: true
    },

    {
        provider: "onesignal",
        displayName: "OneSignal",
        description: "Push notification service",
        logoUrl: getBrandLogo("onesignal.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "pusher",
        displayName: "Pusher",
        description: "Real-time messaging APIs",
        logoUrl: getBrandLogo("pusher.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "sendbird",
        displayName: "Sendbird",
        description: "Chat and messaging API",
        logoUrl: getBrandLogo("sendbird.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },

    // Cryptocurrency
    {
        provider: "coinbase",
        displayName: "Coinbase",
        description: "Cryptocurrency exchange platform",
        logoUrl: getBrandLogo("coinbase.com"),
        category: "Cryptocurrency",
        methods: ["oauth2"],
        comingSoon: true
    },

    {
        provider: "looker",
        displayName: "Looker",
        description: "Google business intelligence platform",
        logoUrl: getBrandLogo("looker.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Client ID",
            keyPlaceholder: "xxxxxxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Client Secret",
            secretPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            helpText: "Get API credentials from Looker Admin > Users > API Keys",
            helpUrl: "https://cloud.google.com/looker/docs/api-auth"
        }
    },
    {
        provider: "tableau",
        displayName: "Tableau",
        description: "Data visualization and analytics",
        logoUrl: getBrandLogo("tableau.com"),
        category: "Analytics",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Personal Access Token Name",
            keyPlaceholder: "my-token-name",
            requiresSecret: true,
            secretLabel: "Personal Access Token Secret",
            secretPlaceholder: "qlE1g9MMh9vbrjjg==:rZTHhPpP2tUW1kfn4tjg8",
            helpText: "Create a PAT in Tableau Account Settings > Personal Access Tokens",
            helpUrl:
                "https://help.tableau.com/current/server/en-us/security_personal_access_tokens.htm"
        }
    },
    {
        provider: "power-bi",
        displayName: "Power BI",
        description: "Microsoft business analytics",
        logoUrl: getBrandLogo("powerbi.microsoft.com"),
        category: "Analytics",
        methods: ["oauth2"]
    },

    // Content Management
    {
        provider: "wordpress",
        displayName: "WordPress",
        description: "Content management system",
        logoUrl: getBrandLogo("wordpress.com"),
        category: "Content Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "contentful",
        displayName: "Contentful",
        description: "Headless CMS platform",
        logoUrl: getBrandLogo("contentful.com"),
        category: "Content Management",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Personal Access Token",
            keyPlaceholder: "CFPAT-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Space ID",
            secretPlaceholder: "your-space-id",
            helpText:
                "Generate a Personal Access Token from Settings > CMA tokens in your Contentful space",
            helpUrl: "https://app.contentful.com/account/profile/cma_tokens"
        }
    },
    {
        provider: "ghost",
        displayName: "Ghost",
        description: "Open source publishing platform",
        logoUrl: getBrandLogo("ghost.org"),
        category: "Content Management",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "Admin API Key",
            keyPlaceholder: "64f3c1e82a:8b4f2a1d3e5c7f9a0b2d4e6f8a0c2e4f6a8b0d2e4f6a",
            requiresSecret: true,
            secretLabel: "Site URL",
            secretPlaceholder: "https://your-site.ghost.io",
            helpText: "Create a Custom Integration in Ghost Admin > Settings > Integrations",
            helpUrl: "https://ghost.org/docs/admin-api/#token-authentication"
        }
    },

    {
        provider: "chargebee",
        displayName: "Chargebee",
        description: "Subscription billing platform",
        logoUrl: getBrandLogo("chargebee.com"),
        category: "Accounting",
        methods: ["api_key"],
        apiKeySettings: {
            keyLabel: "API Key",
            keyPlaceholder: "test_xxxxxxxxxxxxxxxxxxxxxxxx",
            requiresSecret: true,
            secretLabel: "Site Name",
            secretPlaceholder: "your-site",
            helpText: "Enter your API key and site name (e.g., 'acme' from acme.chargebee.com)",
            helpUrl: "https://www.chargebee.com/docs/2.0/api_keys.html"
        }
    },

    {
        provider: "aircall",
        displayName: "Aircall",
        description: "Cloud phone system",
        logoUrl: getBrandLogo("aircall.io"),
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "dialpad",
        displayName: "Dialpad",
        description: "Business communication platform",
        logoUrl: getBrandLogo("dialpad.com"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },

    {
        provider: "splunk",
        displayName: "Splunk",
        description: "Log analysis and monitoring",
        logoUrl: getBrandLogo("splunk.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },

    {
        provider: "optimizely",
        displayName: "Optimizely",
        description: "Experimentation and A/B testing",
        logoUrl: getBrandLogo("optimizely.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "launchdarkly",
        displayName: "LaunchDarkly",
        description: "Feature flags and experimentation",
        logoUrl: getBrandLogo("launchdarkly.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },

    // Payment Processing (Additional)
    {
        provider: "klarna",
        displayName: "Klarna",
        description: "Buy now pay later platform",
        logoUrl: getBrandLogo("klarna.com"),
        category: "Payment Processing",
        methods: ["api_key"],
        comingSoon: true
    }
];

// ============================================================================
// Helper Functions - Use these instead of hardcoding provider lists
// ============================================================================

/**
 * Get providers that support a specific connection method.
 * Excludes "coming soon" providers by default.
 *
 * @example
 * getProvidersByMethod("api_key") // ["openai", "anthropic", ...]
 * getProvidersByMethod("oauth2") // ["slack", "google-drive", ...]
 */
export function getProvidersByMethod(
    method: ConnectionMethod,
    options: { includeComingSoon?: boolean } = {}
): string[] {
    return ALL_PROVIDERS.filter(
        (p) => p.methods.includes(method) && (options.includeComingSoon || !p.comingSoon)
    ).map((p) => p.provider);
}

/**
 * Get providers by category.
 * Excludes "coming soon" providers by default.
 *
 * @example
 * getProvidersByCategory("AI & ML") // ["openai", "anthropic", ...]
 * getProvidersByCategory("Communication") // ["slack", "discord", ...]
 */
export function getProvidersByCategory(
    category: string,
    options: { includeComingSoon?: boolean } = {}
): string[] {
    return ALL_PROVIDERS.filter(
        (p) => p.category === category && (options.includeComingSoon || !p.comingSoon)
    ).map((p) => p.provider);
}

/**
 * Get display name for a provider.
 *
 * @example
 * getProviderDisplayName("openai") // "OpenAI"
 * getProviderDisplayName("xai") // "x.ai"
 */
export function getProviderDisplayName(providerId: string): string {
    const provider = ALL_PROVIDERS.find((p) => p.provider === providerId);
    return provider?.displayName || providerId;
}

/**
 * Get full provider definition by ID.
 */
export function getProviderById(providerId: string): Provider | undefined {
    return ALL_PROVIDERS.find((p) => p.provider === providerId);
}

/**
 * Check if a provider is available (not coming soon).
 */
export function isProviderAvailable(providerId: string): boolean {
    const provider = ALL_PROVIDERS.find((p) => p.provider === providerId);
    return provider ? !provider.comingSoon : false;
}

/**
 * Get all available (not coming soon) providers.
 */
export function getAvailableProviders(): Provider[] {
    return ALL_PROVIDERS.filter((p) => !p.comingSoon);
}

/**
 * Get all unique categories.
 */
export function getAllCategories(): string[] {
    return [...new Set(ALL_PROVIDERS.map((p) => p.category))].sort();
}

/**
 * Check if a provider supports OAuth authentication (OAuth 1.0a or OAuth 2.0).
 */
export function supportsOAuth(methods: string[]): boolean {
    return methods.includes("oauth2") || methods.includes("oauth1");
}
