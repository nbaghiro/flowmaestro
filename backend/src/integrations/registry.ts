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
providerRegistry.register(gmailEntry);
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

// Export for use in application
export { providerRegistry };
