import { providerRegistry } from "./core/ProviderRegistry";
import type { ProviderRegistryEntry } from "./core/types";

/**
 * Register all providers
 *
 * This is the single place where all providers are registered.
 * To add a new provider, simply add a new entry here.
 */

// Register Slack provider
const slackEntry: ProviderRegistryEntry = {
    name: "slack",
    displayName: "Slack",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { SlackProvider } = await import("./providers/slack/SlackProvider");
        return new SlackProvider();
    }
};

// Register Coda provider
const codaEntry: ProviderRegistryEntry = {
    name: "coda",
    displayName: "Coda",
    authMethod: "api_key",
    category: "productivity",
    loader: async () => {
        const { CodaProvider } = await import("./providers/coda/CodaProvider");
        return new CodaProvider();
    }
};

// Register Notion provider
const notionEntry: ProviderRegistryEntry = {
    name: "notion",
    displayName: "Notion",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { NotionProvider } = await import("./providers/notion/NotionProvider");
        return new NotionProvider();
    }
};

// Register Airtable provider
const airtableEntry: ProviderRegistryEntry = {
    name: "airtable",
    displayName: "Airtable",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { AirtableProvider } = await import("./providers/airtable/AirtableProvider");
        return new AirtableProvider();
    }
};

// Register HubSpot provider
const hubspotEntry: ProviderRegistryEntry = {
    name: "hubspot",
    displayName: "HubSpot",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { HubspotProvider } = await import("./providers/hubspot/HubspotProvider");
        return new HubspotProvider();
    }
};

// Register Salesforce provider
const salesforceEntry: ProviderRegistryEntry = {
    name: "salesforce",
    displayName: "Salesforce",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { SalesforceProvider } = await import("./providers/salesforce/SalesforceProvider");
        return new SalesforceProvider();
    }
};

// Register PostgreSQL provider
const postgresqlEntry: ProviderRegistryEntry = {
    name: "postgresql",
    displayName: "PostgreSQL",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { PostgresqlProvider } = await import("./providers/postgresql/PostgresqlProvider");
        return new PostgresqlProvider();
    }
};

// Register MongoDB provider
const mongodbEntry: ProviderRegistryEntry = {
    name: "mongodb",
    displayName: "MongoDB",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { MongoDBProvider } = await import("./providers/mongodb/MongoDBProvider");
        return new MongoDBProvider();
    }
};

// Register GitHub provider
const githubEntry: ProviderRegistryEntry = {
    name: "github",
    displayName: "GitHub",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { GitHubProvider } = await import("./providers/github/GitHubProvider");
        return new GitHubProvider();
    }
};

// Register Linear provider
const linearEntry: ProviderRegistryEntry = {
    name: "linear",
    displayName: "Linear",
    authMethod: "oauth2",
    category: "project_management",
    loader: async () => {
        const { LinearProvider } = await import("./providers/linear/LinearProvider");
        return new LinearProvider();
    }
};

// Register Figma provider
const figmaEntry: ProviderRegistryEntry = {
    name: "figma",
    displayName: "Figma",
    authMethod: "oauth2",
    category: "design",
    loader: async () => {
        const { FigmaProvider } = await import("./providers/figma/FigmaProvider");
        return new FigmaProvider();
    }
};

// Register Google Sheets provider
const googleSheetsEntry: ProviderRegistryEntry = {
    name: "google-sheets",
    displayName: "Google Sheets",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { GoogleSheetsProvider } = await import(
            "./providers/google-sheets/GoogleSheetsProvider"
        );
        return new GoogleSheetsProvider();
    }
};

// Register Google Drive provider
const googleDriveEntry: ProviderRegistryEntry = {
    name: "google-drive",
    displayName: "Google Drive",
    authMethod: "oauth2",
    category: "file_storage",
    loader: async () => {
        const { GoogleDriveProvider } = await import(
            "./providers/google-drive/GoogleDriveProvider"
        );
        return new GoogleDriveProvider();
    }
};

// Register Google Calendar provider
const googleCalendarEntry: ProviderRegistryEntry = {
    name: "google-calendar",
    displayName: "Google Calendar",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { GoogleCalendarProvider } = await import(
            "./providers/google-calendar/GoogleCalendarProvider"
        );
        return new GoogleCalendarProvider();
    }
};

// Register Google Docs provider
const googleDocsEntry: ProviderRegistryEntry = {
    name: "google-docs",
    displayName: "Google Docs",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { GoogleDocsProvider } = await import("./providers/google-docs/GoogleDocsProvider");
        return new GoogleDocsProvider();
    }
};

// Register Gmail provider
const gmailEntry: ProviderRegistryEntry = {
    name: "gmail",
    displayName: "Gmail",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { GmailProvider } = await import("./providers/gmail/GmailProvider");
        return new GmailProvider();
    }
};

// Register YouTube provider
const youtubeEntry: ProviderRegistryEntry = {
    name: "youtube",
    displayName: "YouTube",
    authMethod: "oauth2",
    category: "social_media",
    loader: async () => {
        const { YouTubeProvider } = await import("./providers/youtube/YouTubeProvider");
        return new YouTubeProvider();
    }
};

// Register WhatsApp Business provider
const whatsappEntry: ProviderRegistryEntry = {
    name: "whatsapp",
    displayName: "WhatsApp Business",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { WhatsAppProvider } = await import("./providers/whatsapp/WhatsAppProvider");
        return new WhatsAppProvider();
    }
};

// Register Instagram provider
const instagramEntry: ProviderRegistryEntry = {
    name: "instagram",
    displayName: "Instagram",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { InstagramProvider } = await import("./providers/instagram/InstagramProvider");
        return new InstagramProvider();
    }
};

// Register Facebook provider
const facebookEntry: ProviderRegistryEntry = {
    name: "facebook",
    displayName: "Facebook",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { FacebookProvider } = await import("./providers/facebook/FacebookProvider");
        return new FacebookProvider();
    }
};

// Register Microsoft OneDrive provider
const microsoftOneDriveEntry: ProviderRegistryEntry = {
    name: "microsoft-onedrive",
    displayName: "Microsoft OneDrive",
    authMethod: "oauth2",
    category: "file_storage",
    loader: async () => {
        const { MicrosoftOneDriveProvider } = await import(
            "./providers/microsoft-onedrive/MicrosoftOneDriveProvider"
        );
        return new MicrosoftOneDriveProvider();
    }
};

// Register Microsoft Excel provider
const microsoftExcelEntry: ProviderRegistryEntry = {
    name: "microsoft-excel",
    displayName: "Microsoft Excel",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { MicrosoftExcelProvider } = await import(
            "./providers/microsoft-excel/MicrosoftExcelProvider"
        );
        return new MicrosoftExcelProvider();
    }
};

// Register Microsoft Word provider
const microsoftWordEntry: ProviderRegistryEntry = {
    name: "microsoft-word",
    displayName: "Microsoft Word",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { MicrosoftWordProvider } = await import(
            "./providers/microsoft-word/MicrosoftWordProvider"
        );
        return new MicrosoftWordProvider();
    }
};

// Register Microsoft Teams provider
const microsoftTeamsEntry: ProviderRegistryEntry = {
    name: "microsoft-teams",
    displayName: "Microsoft Teams",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { MicrosoftTeamsProvider } = await import(
            "./providers/microsoft-teams/MicrosoftTeamsProvider"
        );
        return new MicrosoftTeamsProvider();
    }
};

// Register Zendesk provider
const zendeskEntry: ProviderRegistryEntry = {
    name: "zendesk",
    displayName: "Zendesk",
    authMethod: "oauth2",
    category: "support",
    loader: async () => {
        const { ZendeskProvider } = await import("./providers/zendesk/ZendeskProvider");
        return new ZendeskProvider();
    }
};

// Register Apollo provider
const apolloEntry: ProviderRegistryEntry = {
    name: "apollo",
    displayName: "Apollo.io",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { ApolloProvider } = await import("./providers/apollo/ApolloProvider");
        return new ApolloProvider();
    }
};

// Register Jira provider
const jiraEntry: ProviderRegistryEntry = {
    name: "jira",
    displayName: "Jira Cloud",
    authMethod: "oauth2",
    category: "project_management",
    loader: async () => {
        const { JiraProvider } = await import("./providers/jira/JiraProvider");
        return new JiraProvider();
    }
};

// Register all providers
providerRegistry.register(slackEntry);
providerRegistry.register(codaEntry);
providerRegistry.register(notionEntry);
providerRegistry.register(airtableEntry);
providerRegistry.register(hubspotEntry);
providerRegistry.register(salesforceEntry);
providerRegistry.register(postgresqlEntry);
providerRegistry.register(mongodbEntry);
providerRegistry.register(githubEntry);
providerRegistry.register(linearEntry);
providerRegistry.register(figmaEntry);
providerRegistry.register(googleSheetsEntry);
providerRegistry.register(googleDriveEntry);
providerRegistry.register(googleCalendarEntry);
providerRegistry.register(googleDocsEntry);
providerRegistry.register(gmailEntry);
providerRegistry.register(youtubeEntry);
providerRegistry.register(whatsappEntry);
providerRegistry.register(instagramEntry);
providerRegistry.register(facebookEntry);
providerRegistry.register(microsoftOneDriveEntry);
providerRegistry.register(microsoftExcelEntry);
providerRegistry.register(microsoftWordEntry);
providerRegistry.register(microsoftTeamsEntry);
providerRegistry.register(zendeskEntry);
providerRegistry.register(apolloEntry);
providerRegistry.register(jiraEntry);

// Register Shopify provider
const shopifyEntry: ProviderRegistryEntry = {
    name: "shopify",
    displayName: "Shopify",
    authMethod: "oauth2",
    category: "ecommerce",
    loader: async () => {
        const { ShopifyProvider } = await import("./providers/shopify/ShopifyProvider");
        return new ShopifyProvider();
    }
};

providerRegistry.register(shopifyEntry);

// Register Typeform provider
const typeformEntry: ProviderRegistryEntry = {
    name: "typeform",
    displayName: "Typeform",
    authMethod: "oauth2",
    category: "marketing",
    loader: async () => {
        const { TypeformProvider } = await import("./providers/typeform/TypeformProvider");
        return new TypeformProvider();
    }
};

providerRegistry.register(typeformEntry);

// Register Dropbox provider
const dropboxEntry: ProviderRegistryEntry = {
    name: "dropbox",
    displayName: "Dropbox",
    authMethod: "oauth2",
    category: "file_storage",
    loader: async () => {
        const { DropboxProvider } = await import("./providers/dropbox/DropboxProvider");
        return new DropboxProvider();
    }
};

providerRegistry.register(dropboxEntry);

// Register Box provider
const boxEntry: ProviderRegistryEntry = {
    name: "box",
    displayName: "Box",
    authMethod: "oauth2",
    category: "file_storage",
    loader: async () => {
        const { BoxProvider } = await import("./providers/box/BoxProvider");
        return new BoxProvider();
    }
};

providerRegistry.register(boxEntry);

// Register X (Twitter) provider
const twitterEntry: ProviderRegistryEntry = {
    name: "twitter",
    displayName: "X (Twitter)",
    authMethod: "oauth2",
    category: "social_media",
    loader: async () => {
        const { TwitterProvider } = await import("./providers/twitter/TwitterProvider");
        return new TwitterProvider();
    }
};

providerRegistry.register(twitterEntry);

// Register LinkedIn provider
const linkedinEntry: ProviderRegistryEntry = {
    name: "linkedin",
    displayName: "LinkedIn",
    authMethod: "oauth2",
    category: "social_media",
    loader: async () => {
        const { LinkedInProvider } = await import("./providers/linkedin/LinkedInProvider");
        return new LinkedInProvider();
    }
};

providerRegistry.register(linkedinEntry);

// Register Reddit provider
const redditEntry: ProviderRegistryEntry = {
    name: "reddit",
    displayName: "Reddit",
    authMethod: "oauth2",
    category: "social_media",
    loader: async () => {
        const { RedditProvider } = await import("./providers/reddit/RedditProvider");
        return new RedditProvider();
    }
};

providerRegistry.register(redditEntry);

// Register Discord provider
const discordEntry: ProviderRegistryEntry = {
    name: "discord",
    displayName: "Discord",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { DiscordProvider } = await import("./providers/discord/DiscordProvider");
        return new DiscordProvider();
    }
};

providerRegistry.register(discordEntry);

// Register Asana provider
const asanaEntry: ProviderRegistryEntry = {
    name: "asana",
    displayName: "Asana",
    authMethod: "oauth2",
    category: "project_management",
    loader: async () => {
        const { AsanaProvider } = await import("./providers/asana/AsanaProvider");
        return new AsanaProvider();
    }
};

providerRegistry.register(asanaEntry);

// Register Monday.com provider
const mondayEntry: ProviderRegistryEntry = {
    name: "monday",
    displayName: "Monday.com",
    authMethod: "oauth2",
    category: "project_management",
    loader: async () => {
        const { MondayProvider } = await import("./providers/monday/MondayProvider");
        return new MondayProvider();
    }
};

providerRegistry.register(mondayEntry);

// Register Trello provider
const trelloEntry: ProviderRegistryEntry = {
    name: "trello",
    displayName: "Trello",
    authMethod: "api_key",
    category: "project_management",
    loader: async () => {
        const { TrelloProvider } = await import("./providers/trello/TrelloProvider");
        return new TrelloProvider();
    }
};

providerRegistry.register(trelloEntry);

// Register Telegram provider
const telegramEntry: ProviderRegistryEntry = {
    name: "telegram",
    displayName: "Telegram",
    authMethod: "api_key",
    category: "communication",
    loader: async () => {
        const { TelegramProvider } = await import("./providers/telegram/TelegramProvider");
        return new TelegramProvider();
    }
};

providerRegistry.register(telegramEntry);

// Register Evernote provider (OAuth 1.0a)
const evernoteEntry: ProviderRegistryEntry = {
    name: "evernote",
    displayName: "Evernote",
    authMethod: "oauth1",
    category: "productivity",
    loader: async () => {
        const { EvernoteProvider } = await import("./providers/evernote/EvernoteProvider");
        return new EvernoteProvider();
    }
};

providerRegistry.register(evernoteEntry);

// Register Pipedrive provider
const pipedriveEntry: ProviderRegistryEntry = {
    name: "pipedrive",
    displayName: "Pipedrive",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { PipedriveProvider } = await import("./providers/pipedrive/PipedriveProvider");
        return new PipedriveProvider();
    }
};

providerRegistry.register(pipedriveEntry);

// Register Close CRM provider
const closeEntry: ProviderRegistryEntry = {
    name: "close",
    displayName: "Close",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { CloseProvider } = await import("./providers/close/CloseProvider");
        return new CloseProvider();
    }
};

providerRegistry.register(closeEntry);

// Register Amplitude provider
const amplitudeEntry: ProviderRegistryEntry = {
    name: "amplitude",
    displayName: "Amplitude",
    authMethod: "api_key",
    category: "analytics",
    loader: async () => {
        const { AmplitudeProvider } = await import("./providers/amplitude/AmplitudeProvider");
        return new AmplitudeProvider();
    }
};

providerRegistry.register(amplitudeEntry);

// Register Mixpanel provider
const mixpanelEntry: ProviderRegistryEntry = {
    name: "mixpanel",
    displayName: "Mixpanel",
    authMethod: "api_key",
    category: "analytics",
    loader: async () => {
        const { MixpanelProvider } = await import("./providers/mixpanel/MixpanelProvider");
        return new MixpanelProvider();
    }
};

providerRegistry.register(mixpanelEntry);

// Register Heap provider
const heapEntry: ProviderRegistryEntry = {
    name: "heap",
    displayName: "Heap",
    authMethod: "api_key",
    category: "analytics",
    loader: async () => {
        const { HeapProvider } = await import("./providers/heap/HeapProvider");
        return new HeapProvider();
    }
};

providerRegistry.register(heapEntry);

// Register PostHog provider
const posthogEntry: ProviderRegistryEntry = {
    name: "posthog",
    displayName: "PostHog",
    authMethod: "api_key",
    category: "analytics",
    loader: async () => {
        const { PostHogProvider } = await import("./providers/posthog/PostHogProvider");
        return new PostHogProvider();
    }
};

providerRegistry.register(posthogEntry);

// Export for use in application
export { providerRegistry };
