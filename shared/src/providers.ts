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
    hellosign: "hellosign.com",
    docusign: "docusign.com",
    surveymonkey: "surveymonkey.com",
    looker: "looker.com",
    tableau: "tableau.com"
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
        provider: "outlook",
        displayName: "Outlook",
        description: "Email and calendar service",
        logoUrl: getBrandLogo("outlook.com"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
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
        description: "Manage GitLab projects and issues",
        logoUrl: getBrandLogo("gitlab.com"),
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true
    },
    {
        provider: "bitbucket",
        displayName: "Bitbucket",
        description: "Manage Bitbucket repositories",
        logoUrl: getBrandLogo("bitbucket.org"),
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true
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
        description: "Manage tasks and docs",
        logoUrl: getBrandLogo("clickup.com"),
        category: "Project Management",
        methods: ["api_key"],
        comingSoon: true
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
        description: "Manage email campaigns and lists",
        logoUrl: getBrandLogo("mailchimp.com"),
        category: "Marketing",
        methods: ["api_key", "oauth2"],
        comingSoon: true
    },
    {
        provider: "sendgrid",
        displayName: "SendGrid",
        description: "Send transactional emails",
        logoUrl: getBrandLogo("sendgrid.com"),
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
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
        comingSoon: true
    },
    {
        provider: "hotjar",
        displayName: "Hotjar",
        description: "Behavior analytics and user feedback",
        logoUrl: getBrandLogo("hotjar.com"),
        category: "Analytics",
        methods: ["api_key"],
        comingSoon: true
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
        provider: "chartmogul",
        displayName: "ChartMogul",
        description: "Subscription analytics platform",
        logoUrl: getBrandLogo("chartmogul.com"),
        category: "Analytics",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "fathom",
        displayName: "Fathom Analytics",
        description: "Privacy-focused web analytics",
        logoUrl: getBrandLogo("usefathom.com"),
        category: "Analytics",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "plausible",
        displayName: "Plausible",
        description: "Privacy-friendly analytics",
        logoUrl: getBrandLogo("plausible.io"),
        category: "Analytics",
        methods: ["api_key"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "xero",
        displayName: "Xero",
        description: "Cloud accounting software",
        logoUrl: getBrandLogo("xero.com"),
        category: "Accounting",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "stripe",
        displayName: "Stripe",
        description: "Payment processing platform",
        logoUrl: getBrandLogo("stripe.com"),
        category: "Payment Processing",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "plaid",
        displayName: "Plaid",
        description: "Banking and financial data",
        logoUrl: getBrandLogo("plaid.com"),
        category: "Accounting",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "sage",
        displayName: "Sage",
        description: "Business accounting software",
        logoUrl: getBrandLogo("sage.com"),
        category: "Accounting",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "freshbooks",
        displayName: "FreshBooks",
        description: "Small business accounting",
        logoUrl: getBrandLogo("freshbooks.com"),
        category: "Accounting",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "wave",
        displayName: "Wave",
        description: "Free accounting software",
        logoUrl: getBrandLogo("waveapps.com"),
        category: "Accounting",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "bill-com",
        displayName: "Bill.com",
        description: "Accounts payable and receivable automation",
        logoUrl: getBrandLogo("bill.com"),
        category: "Accounting",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "expensify",
        displayName: "Expensify",
        description: "Expense management and reporting",
        logoUrl: getBrandLogo("expensify.com"),
        category: "Accounting",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "ramp",
        displayName: "Ramp",
        description: "Corporate card and expense management",
        logoUrl: getBrandLogo("ramp.com"),
        category: "Accounting",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "wise",
        displayName: "Wise",
        description: "International money transfers",
        logoUrl: getBrandLogo("wise.com"),
        category: "Accounting",
        methods: ["api_key"],
        comingSoon: true
    },

    // HR & Recruiting
    {
        provider: "workday",
        displayName: "Workday",
        description: "Enterprise HR and finance",
        logoUrl: getBrandLogo("workday.com"),
        category: "HR",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "adp",
        displayName: "ADP",
        description: "Payroll and HR management",
        logoUrl: getBrandLogo("adp.com"),
        category: "HR",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "gusto",
        displayName: "Gusto",
        description: "Payroll and benefits platform",
        logoUrl: getBrandLogo("gusto.com"),
        category: "HR",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "rippling",
        displayName: "Rippling",
        description: "HR and IT management",
        logoUrl: getBrandLogo("rippling.com"),
        category: "HR",
        methods: ["oauth2"],
        comingSoon: true
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
        description: "Customer messaging platform",
        logoUrl: getBrandLogo("intercom.com"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "freshdesk",
        displayName: "Freshdesk",
        description: "Customer support software",
        logoUrl: getBrandLogo("freshdesk.com"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "helpscout",
        displayName: "Help Scout",
        description: "Help desk software",
        logoUrl: getBrandLogo("helpscout.com"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "livechat",
        displayName: "LiveChat",
        description: "Live chat customer service",
        logoUrl: getBrandLogo("livechat.com"),
        category: "Customer Support",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "drift",
        displayName: "Drift",
        description: "Conversational marketing platform",
        logoUrl: getBrandLogo("drift.com"),
        category: "Customer Support",
        methods: ["oauth2"],
        comingSoon: true
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
        provider: "chatbase",
        displayName: "Chatbase",
        description: "AI chatbot platform",
        logoUrl: getBrandLogo("chatbase.co"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "gorgias",
        displayName: "Gorgias",
        description: "E-commerce helpdesk platform",
        logoUrl: getBrandLogo("gorgias.com"),
        category: "Customer Support",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "kustomer",
        displayName: "Kustomer",
        description: "CRM-powered customer service",
        logoUrl: getBrandLogo("kustomer.com"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "reamaze",
        displayName: "Re:amaze",
        description: "Customer service and live chat",
        logoUrl: getBrandLogo("reamaze.com"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "tidio",
        displayName: "Tidio",
        description: "Live chat and chatbots",
        logoUrl: getBrandLogo("tidio.com"),
        category: "Customer Support",
        methods: ["api_key"],
        comingSoon: true
    },

    // E-commerce (Additional)
    {
        provider: "woocommerce",
        displayName: "WooCommerce",
        description: "WordPress e-commerce plugin",
        logoUrl: getBrandLogo("woocommerce.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
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
        description: "E-commerce platform",
        logoUrl: getBrandLogo("bigcommerce.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "square",
        displayName: "Square",
        description: "Payment and POS system",
        logoUrl: getBrandLogo("squareup.com"),
        category: "Payment Processing",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "paypal",
        displayName: "PayPal",
        description: "Payment processing platform",
        logoUrl: getBrandLogo("paypal.com"),
        category: "Payment Processing",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "amazon-seller-central",
        displayName: "Amazon Seller Central",
        description: "Amazon marketplace management",
        logoUrl: getBrandLogo("sellercentral.amazon.com"),
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "printful",
        displayName: "Printful",
        description: "Print-on-demand dropshipping",
        logoUrl: getBrandLogo("printful.com"),
        category: "E-commerce",
        methods: ["oauth2"],
        comingSoon: true
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
        comingSoon: true
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
        methods: ["api_key"],
        comingSoon: true
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
        description: "Publishing platform for writers",
        logoUrl: getBrandLogo("medium.com"),
        category: "Marketing",
        methods: ["oauth2"],
        comingSoon: true
    },

    // CRM & Sales (Additional)
    {
        provider: "zoho-crm",
        displayName: "Zoho CRM",
        description: "Customer relationship management",
        logoUrl: getBrandLogo("zoho.com"),
        category: "CRM & Sales",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "copper",
        displayName: "Copper",
        description: "CRM for Google Workspace",
        logoUrl: getBrandLogo("copper.com"),
        category: "CRM & Sales",
        methods: ["api_key"],
        comingSoon: true
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
        provider: "capsule",
        displayName: "Capsule CRM",
        description: "Simple CRM for small businesses",
        logoUrl: getBrandLogo("capsulecrm.com"),
        category: "CRM & Sales",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "insightly",
        displayName: "Insightly",
        description: "CRM and project management",
        logoUrl: getBrandLogo("insightly.com"),
        category: "CRM & Sales",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "nutshell",
        displayName: "Nutshell",
        description: "Sales automation CRM",
        logoUrl: getBrandLogo("nutshell.com"),
        category: "CRM & Sales",
        methods: ["api_key"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "confluence",
        displayName: "Confluence",
        description: "Team workspace by Atlassian",
        logoUrl: getBrandLogo("atlassian.com/confluence"),
        category: "Productivity",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "sharepoint",
        displayName: "SharePoint",
        description: "Microsoft document management",
        logoUrl: getBrandLogo("sharepoint.com"),
        category: "Productivity",
        methods: ["oauth2"],
        comingSoon: true
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
        category: "Design",
        methods: ["oauth2"]
    },
    {
        provider: "canva",
        displayName: "Canva",
        description: "Graphic design platform",
        logoUrl: getBrandLogo("canva.com"),
        category: "Design",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Video & Communication
    {
        provider: "zoom",
        displayName: "Zoom",
        description: "Video conferencing platform",
        logoUrl: getBrandLogo("zoom.us"),
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "calendly",
        displayName: "Calendly",
        description: "Meeting scheduling tool",
        logoUrl: getBrandLogo("calendly.com"),
        category: "Productivity",
        methods: ["api_key"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
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
        description: "Frontend deployment platform",
        logoUrl: getBrandLogo("vercel.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
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
        description: "Monitoring and analytics",
        logoUrl: getBrandLogo("datadoghq.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "sentry",
        displayName: "Sentry",
        description: "Error tracking and monitoring",
        logoUrl: getBrandLogo("sentry.io"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "pagerduty",
        displayName: "PagerDuty",
        description: "Incident management platform",
        logoUrl: getBrandLogo("pagerduty.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "aws",
        displayName: "AWS",
        description: "Amazon Web Services cloud platform",
        logoUrl: getBrandLogo("aws.amazon.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "google-cloud",
        displayName: "Google Cloud Platform",
        description: "Google cloud services",
        logoUrl: getBrandLogo("cloud.google.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "azure",
        displayName: "Microsoft Azure",
        description: "Microsoft cloud platform",
        logoUrl: getBrandLogo("azure.microsoft.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "circleci",
        displayName: "CircleCI",
        description: "Continuous integration platform",
        logoUrl: getBrandLogo("circleci.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "cloudflare",
        displayName: "Cloudflare",
        description: "CDN and security platform",
        logoUrl: getBrandLogo("cloudflare.com"),
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "digitalocean",
        displayName: "DigitalOcean",
        description: "Cloud infrastructure provider",
        logoUrl: getBrandLogo("digitalocean.com"),
        category: "Developer Tools",
        methods: ["oauth2"],
        comingSoon: true
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

    // Cloud Storage (Additional)
    {
        provider: "aws-s3",
        displayName: "AWS S3",
        description: "Amazon cloud storage",
        logoUrl: getBrandLogo("aws.amazon.com"),
        category: "File Storage",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "google-cloud-storage",
        displayName: "Google Cloud Storage",
        description: "Google cloud storage",
        logoUrl: getBrandLogo("cloud.google.com"),
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "azure-storage",
        displayName: "Azure Storage",
        description: "Microsoft cloud storage",
        logoUrl: getBrandLogo("azure.microsoft.com"),
        category: "File Storage",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "icloud",
        displayName: "iCloud",
        description: "Apple cloud storage",
        logoUrl: getBrandLogo("icloud.com"),
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true
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
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "redis",
        displayName: "Redis",
        description: "In-memory data store",
        logoUrl: getBrandLogo("redis.io"),
        category: "Databases",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "snowflake",
        displayName: "Snowflake",
        description: "Cloud data warehouse",
        logoUrl: getBrandLogo("snowflake.com"),
        category: "Databases",
        methods: ["api_key"],
        comingSoon: true
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
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "elasticsearch",
        displayName: "Elasticsearch",
        description: "Search and analytics engine",
        logoUrl: getBrandLogo("elastic.co"),
        category: "Databases",
        methods: ["api_key"],
        comingSoon: true
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
        comingSoon: true
    },
    {
        provider: "netsuite",
        displayName: "NetSuite",
        description: "Cloud ERP software",
        logoUrl: getBrandLogo("netsuite.com"),
        category: "ERP",
        methods: ["oauth2"],
        comingSoon: true
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
        provider: "braintree",
        displayName: "Braintree",
        description: "PayPal payment gateway",
        logoUrl: getBrandLogo("braintreepayments.com"),
        category: "Payment Processing",
        methods: ["api_key"],
        comingSoon: true
    },
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
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "hellosign",
        displayName: "HelloSign",
        description: "E-signature platform",
        logoUrl: getBrandLogo("hellosign.com"),
        category: "Legal & Contracts",
        methods: ["oauth2"]
    },

    // Knowledge Base
    {
        provider: "gitbook",
        displayName: "GitBook",
        description: "Documentation platform",
        logoUrl: getBrandLogo("gitbook.com"),
        category: "Knowledge Base",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Social Media Management
    {
        provider: "buffer",
        displayName: "Buffer",
        description: "Social media scheduling",
        logoUrl: getBrandLogo("buffer.com"),
        category: "Social Media Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "hootsuite",
        displayName: "Hootsuite",
        description: "Social media management platform",
        logoUrl: getBrandLogo("hootsuite.com"),
        category: "Social Media Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "later",
        displayName: "Later",
        description: "Visual social media scheduler",
        logoUrl: getBrandLogo("later.com"),
        category: "Social Media Management",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "sprout-social",
        displayName: "Sprout Social",
        description: "Social media management suite",
        logoUrl: getBrandLogo("sproutsocial.com"),
        category: "Social Media Management",
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
        description: "Open source scheduling platform",
        logoUrl: getBrandLogo("cal.com"),
        category: "Scheduling",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "chili-piper",
        displayName: "Chili Piper",
        description: "Revenue scheduling platform",
        logoUrl: getBrandLogo("chilipiper.com"),
        category: "Scheduling",
        methods: ["api_key"],
        comingSoon: true
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
        provider: "wufoo",
        displayName: "Wufoo",
        description: "Online form builder",
        logoUrl: getBrandLogo("wufoo.com"),
        category: "Forms & Surveys",
        methods: ["api_key"],
        comingSoon: true
    },

    // Video & Webinar
    {
        provider: "demio",
        displayName: "Demio",
        description: "Webinar platform",
        logoUrl: getBrandLogo("demio.com"),
        category: "Video & Webinar",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "gotowebinar",
        displayName: "GoToWebinar",
        description: "Webinar software",
        logoUrl: getBrandLogo("goto.com/webinar"),
        category: "Video & Webinar",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "riverside",
        displayName: "Riverside.fm",
        description: "Podcast and video recording",
        logoUrl: getBrandLogo("riverside.fm"),
        category: "Video & Webinar",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "streamyard",
        displayName: "StreamYard",
        description: "Live streaming studio",
        logoUrl: getBrandLogo("streamyard.com"),
        category: "Video & Webinar",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "vimeo",
        displayName: "Vimeo",
        description: "Video hosting platform",
        logoUrl: getBrandLogo("vimeo.com"),
        category: "Video & Webinar",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "wistia",
        displayName: "Wistia",
        description: "Video hosting for business",
        logoUrl: getBrandLogo("wistia.com"),
        category: "Video & Webinar",
        methods: ["api_key"],
        comingSoon: true
    },

    // SMS & Messaging
    {
        provider: "clicksend",
        displayName: "ClickSend",
        description: "SMS and communication APIs",
        logoUrl: getBrandLogo("clicksend.com"),
        category: "SMS & Messaging",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "plivo",
        displayName: "Plivo",
        description: "SMS and voice API platform",
        logoUrl: getBrandLogo("plivo.com"),
        category: "SMS & Messaging",
        methods: ["api_key"],
        comingSoon: true
    },

    // Security & Authentication
    {
        provider: "auth0",
        displayName: "Auth0",
        description: "Authentication and authorization platform",
        logoUrl: getBrandLogo("auth0.com"),
        category: "Security & Authentication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "okta",
        displayName: "Okta",
        description: "Identity and access management",
        logoUrl: getBrandLogo("okta.com"),
        category: "Security & Authentication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "onelogin",
        displayName: "OneLogin",
        description: "Identity and access management",
        logoUrl: getBrandLogo("onelogin.com"),
        category: "Security & Authentication",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Notifications
    {
        provider: "onesignal",
        displayName: "OneSignal",
        description: "Push notification service",
        logoUrl: getBrandLogo("onesignal.com"),
        category: "Notifications",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "pusher",
        displayName: "Pusher",
        description: "Real-time messaging APIs",
        logoUrl: getBrandLogo("pusher.com"),
        category: "Notifications",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "sendbird",
        displayName: "Sendbird",
        description: "Chat and messaging API",
        logoUrl: getBrandLogo("sendbird.com"),
        category: "Notifications",
        methods: ["api_key"],
        comingSoon: true
    },

    // Cloud Storage
    {
        provider: "backblaze-b2",
        displayName: "Backblaze B2",
        description: "Cloud storage service",
        logoUrl: getBrandLogo("backblaze.com"),
        category: "Cloud Storage",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "wasabi",
        displayName: "Wasabi",
        description: "Cloud object storage",
        logoUrl: getBrandLogo("wasabi.com"),
        category: "Cloud Storage",
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

    // Business Intelligence
    {
        provider: "looker",
        displayName: "Looker",
        description: "Google business intelligence platform",
        logoUrl: getBrandLogo("looker.com"),
        category: "Business Intelligence",
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
        category: "Business Intelligence",
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
        category: "Business Intelligence",
        methods: ["oauth2"],
        comingSoon: true
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
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "ghost",
        displayName: "Ghost",
        description: "Open source publishing platform",
        logoUrl: getBrandLogo("ghost.org"),
        category: "Content Management",
        methods: ["api_key"],
        comingSoon: true
    },

    // Invoicing & Billing
    {
        provider: "chargebee",
        displayName: "Chargebee",
        description: "Subscription billing platform",
        logoUrl: getBrandLogo("chargebee.com"),
        category: "Invoicing & Billing",
        methods: ["api_key"],
        comingSoon: true
    },

    // Call Center
    {
        provider: "aircall",
        displayName: "Aircall",
        description: "Cloud phone system",
        logoUrl: getBrandLogo("aircall.io"),
        category: "Call Center",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "dialpad",
        displayName: "Dialpad",
        description: "Business communication platform",
        logoUrl: getBrandLogo("dialpad.com"),
        category: "Call Center",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Monitoring & Logging
    {
        provider: "splunk",
        displayName: "Splunk",
        description: "Log analysis and monitoring",
        logoUrl: getBrandLogo("splunk.com"),
        category: "Monitoring & Logging",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "rollbar",
        displayName: "Rollbar",
        description: "Error tracking and monitoring",
        logoUrl: getBrandLogo("rollbar.com"),
        category: "Monitoring & Logging",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "bugsnag",
        displayName: "Bugsnag",
        description: "Error monitoring platform",
        logoUrl: getBrandLogo("bugsnag.com"),
        category: "Monitoring & Logging",
        methods: ["api_key"],
        comingSoon: true
    },

    // AB Testing & Optimization
    {
        provider: "optimizely",
        displayName: "Optimizely",
        description: "Experimentation and A/B testing",
        logoUrl: getBrandLogo("optimizely.com"),
        category: "AB Testing & Optimization",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "launchdarkly",
        displayName: "LaunchDarkly",
        description: "Feature flags and experimentation",
        logoUrl: getBrandLogo("launchdarkly.com"),
        category: "AB Testing & Optimization",
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
