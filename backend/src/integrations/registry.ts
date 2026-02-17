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

// Register Supabase provider
const supabaseEntry: ProviderRegistryEntry = {
    name: "supabase",
    displayName: "Supabase",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { SupabaseProvider } = await import("./providers/supabase/SupabaseProvider");
        return new SupabaseProvider();
    }
};

// Register MySQL provider
const mysqlEntry: ProviderRegistryEntry = {
    name: "mysql",
    displayName: "MySQL",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { MysqlProvider } = await import("./providers/mysql/MysqlProvider");
        return new MysqlProvider();
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

// Register Google Slides provider
const googleSlidesEntry: ProviderRegistryEntry = {
    name: "google-slides",
    displayName: "Google Slides",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { GoogleSlidesProvider } = await import(
            "./providers/google-slides/GoogleSlidesProvider"
        );
        return new GoogleSlidesProvider();
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

// Register Microsoft PowerPoint provider
const microsoftPowerPointEntry: ProviderRegistryEntry = {
    name: "microsoft-powerpoint",
    displayName: "Microsoft PowerPoint",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { MicrosoftPowerPointProvider } = await import(
            "./providers/microsoft-powerpoint/MicrosoftPowerPointProvider"
        );
        return new MicrosoftPowerPointProvider();
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
providerRegistry.register(supabaseEntry);
providerRegistry.register(mysqlEntry);
providerRegistry.register(mongodbEntry);
providerRegistry.register(githubEntry);
providerRegistry.register(linearEntry);
providerRegistry.register(figmaEntry);
providerRegistry.register(googleSheetsEntry);
providerRegistry.register(googleDriveEntry);
providerRegistry.register(googleCalendarEntry);
providerRegistry.register(googleDocsEntry);
providerRegistry.register(googleSlidesEntry);
providerRegistry.register(gmailEntry);
providerRegistry.register(youtubeEntry);
providerRegistry.register(whatsappEntry);
providerRegistry.register(instagramEntry);
providerRegistry.register(facebookEntry);
providerRegistry.register(microsoftOneDriveEntry);
providerRegistry.register(microsoftExcelEntry);
providerRegistry.register(microsoftWordEntry);
providerRegistry.register(microsoftPowerPointEntry);
providerRegistry.register(microsoftTeamsEntry);
providerRegistry.register(zendeskEntry);
providerRegistry.register(apolloEntry);
providerRegistry.register(jiraEntry);

// Register Buffer provider
const bufferEntry: ProviderRegistryEntry = {
    name: "buffer",
    displayName: "Buffer",
    authMethod: "oauth2",
    category: "social_media",
    loader: async () => {
        const { BufferProvider } = await import("./providers/buffer/BufferProvider");
        return new BufferProvider();
    }
};

providerRegistry.register(bufferEntry);

// Register Hootsuite provider
const hootsuiteEntry: ProviderRegistryEntry = {
    name: "hootsuite",
    displayName: "Hootsuite",
    authMethod: "oauth2",
    category: "social_media",
    loader: async () => {
        const { HootsuiteProvider } = await import("./providers/hootsuite/HootsuiteProvider");
        return new HootsuiteProvider();
    }
};

providerRegistry.register(hootsuiteEntry);

// Register Calendly provider
const calendlyEntry: ProviderRegistryEntry = {
    name: "calendly",
    displayName: "Calendly",
    authMethod: "oauth2",
    category: "scheduling",
    loader: async () => {
        const { CalendlyProvider } = await import("./providers/calendly/CalendlyProvider");
        return new CalendlyProvider();
    }
};

providerRegistry.register(calendlyEntry);

// Register Cal.com provider
const calcomEntry: ProviderRegistryEntry = {
    name: "cal-com",
    displayName: "Cal.com",
    authMethod: "oauth2",
    category: "scheduling",
    loader: async () => {
        const { CalComProvider } = await import("./providers/cal-com/CalComProvider");
        return new CalComProvider();
    }
};

providerRegistry.register(calcomEntry);

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
    category: "forms_surveys",
    loader: async () => {
        const { TypeformProvider } = await import("./providers/typeform/TypeformProvider");
        return new TypeformProvider();
    }
};

providerRegistry.register(typeformEntry);

// Register SurveyMonkey provider
const surveymonkeyEntry: ProviderRegistryEntry = {
    name: "surveymonkey",
    displayName: "SurveyMonkey",
    authMethod: "oauth2",
    category: "forms_surveys",
    loader: async () => {
        const { SurveyMonkeyProvider } = await import(
            "./providers/surveymonkey/SurveyMonkeyProvider"
        );
        return new SurveyMonkeyProvider();
    }
};

providerRegistry.register(surveymonkeyEntry);

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

// Register Hotjar provider
const hotjarEntry: ProviderRegistryEntry = {
    name: "hotjar",
    displayName: "Hotjar",
    authMethod: "api_key",
    category: "analytics",
    loader: async () => {
        const { HotjarProvider } = await import("./providers/hotjar/HotjarProvider");
        return new HotjarProvider();
    }
};

providerRegistry.register(hotjarEntry);

// Register HelloSign provider
const hellosignEntry: ProviderRegistryEntry = {
    name: "hellosign",
    displayName: "HelloSign",
    authMethod: "oauth2",
    category: "legal",
    loader: async () => {
        const { HelloSignProvider } = await import("./providers/hellosign/HelloSignProvider");
        return new HelloSignProvider();
    }
};

providerRegistry.register(hellosignEntry);

// Register DocuSign provider
const docusignEntry: ProviderRegistryEntry = {
    name: "docusign",
    displayName: "DocuSign",
    authMethod: "oauth2",
    category: "legal",
    loader: async () => {
        const { DocuSignProvider } = await import("./providers/docusign/DocuSignProvider");
        return new DocuSignProvider();
    }
};

providerRegistry.register(docusignEntry);

// Register PandaDoc provider
const pandadocEntry: ProviderRegistryEntry = {
    name: "pandadoc",
    displayName: "PandaDoc",
    authMethod: "oauth2",
    category: "legal",
    loader: async () => {
        const { PandaDocProvider } = await import("./providers/pandadoc/PandaDocProvider");
        return new PandaDocProvider();
    }
};

providerRegistry.register(pandadocEntry);

// Register Google Forms provider
const googleFormsEntry: ProviderRegistryEntry = {
    name: "google-forms",
    displayName: "Google Forms",
    authMethod: "oauth2",
    category: "forms_surveys",
    loader: async () => {
        const { GoogleFormsProvider } = await import(
            "./providers/google-forms/GoogleFormsProvider"
        );
        return new GoogleFormsProvider();
    }
};

providerRegistry.register(googleFormsEntry);

// Register Looker provider
const lookerEntry: ProviderRegistryEntry = {
    name: "looker",
    displayName: "Looker",
    authMethod: "api_key",
    category: "business_intelligence",
    loader: async () => {
        const { LookerProvider } = await import("./providers/looker/LookerProvider");
        return new LookerProvider();
    }
};

providerRegistry.register(lookerEntry);

// Register Tableau provider
const tableauEntry: ProviderRegistryEntry = {
    name: "tableau",
    displayName: "Tableau",
    authMethod: "api_key",
    category: "business_intelligence",
    loader: async () => {
        const { TableauProvider } = await import("./providers/tableau/TableauProvider");
        return new TableauProvider();
    }
};

providerRegistry.register(tableauEntry);

// Register Intercom provider
const intercomEntry: ProviderRegistryEntry = {
    name: "intercom",
    displayName: "Intercom",
    authMethod: "oauth2",
    category: "support",
    loader: async () => {
        const { IntercomProvider } = await import("./providers/intercom/IntercomProvider");
        return new IntercomProvider();
    }
};

providerRegistry.register(intercomEntry);

// Register Freshdesk provider
const freshdeskEntry: ProviderRegistryEntry = {
    name: "freshdesk",
    displayName: "Freshdesk",
    authMethod: "api_key",
    category: "support",
    loader: async () => {
        const { FreshdeskProvider } = await import("./providers/freshdesk/FreshdeskProvider");
        return new FreshdeskProvider();
    }
};

providerRegistry.register(freshdeskEntry);

// Register ClickUp provider
const clickupEntry: ProviderRegistryEntry = {
    name: "clickup",
    displayName: "ClickUp",
    authMethod: "oauth2",
    category: "project_management",
    loader: async () => {
        const { ClickUpProvider } = await import("./providers/clickup/ClickUpProvider");
        return new ClickUpProvider();
    }
};

providerRegistry.register(clickupEntry);

// Register Marketo provider
const marketoEntry: ProviderRegistryEntry = {
    name: "marketo",
    displayName: "Marketo",
    authMethod: "api_key",
    category: "marketing",
    loader: async () => {
        const { MarketoProvider } = await import("./providers/marketo/MarketoProvider");
        return new MarketoProvider();
    }
};

providerRegistry.register(marketoEntry);

// Register Klaviyo provider
const klaviyoEntry: ProviderRegistryEntry = {
    name: "klaviyo",
    displayName: "Klaviyo",
    authMethod: "oauth2",
    category: "marketing",
    loader: async () => {
        const { KlaviyoProvider } = await import("./providers/klaviyo/KlaviyoProvider");
        return new KlaviyoProvider();
    }
};

providerRegistry.register(klaviyoEntry);

// Register Mailchimp provider
const mailchimpEntry: ProviderRegistryEntry = {
    name: "mailchimp",
    displayName: "Mailchimp",
    authMethod: "oauth2",
    category: "marketing",
    loader: async () => {
        const { MailchimpProvider } = await import("./providers/mailchimp/MailchimpProvider");
        return new MailchimpProvider();
    }
};

providerRegistry.register(mailchimpEntry);

// Register SendGrid provider
const sendgridEntry: ProviderRegistryEntry = {
    name: "sendgrid",
    displayName: "SendGrid",
    authMethod: "api_key",
    category: "communication",
    loader: async () => {
        const { SendGridProvider } = await import("./providers/sendgrid/SendGridProvider");
        return new SendGridProvider();
    }
};

providerRegistry.register(sendgridEntry);

// Register Datadog provider
const datadogEntry: ProviderRegistryEntry = {
    name: "datadog",
    displayName: "Datadog",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { DatadogProvider } = await import("./providers/datadog/DatadogProvider");
        return new DatadogProvider();
    }
};

providerRegistry.register(datadogEntry);

// Register Sentry provider
const sentryEntry: ProviderRegistryEntry = {
    name: "sentry",
    displayName: "Sentry",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { SentryProvider } = await import("./providers/sentry/SentryProvider");
        return new SentryProvider();
    }
};

providerRegistry.register(sentryEntry);

// Register PagerDuty provider
const pagerdutyEntry: ProviderRegistryEntry = {
    name: "pagerduty",
    displayName: "PagerDuty",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { PagerDutyProvider } = await import("./providers/pagerduty/PagerDutyProvider");
        return new PagerDutyProvider();
    }
};

providerRegistry.register(pagerdutyEntry);

// Register GitLab provider
const gitlabEntry: ProviderRegistryEntry = {
    name: "gitlab",
    displayName: "GitLab",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { GitLabProvider } = await import("./providers/gitlab/GitLabProvider");
        return new GitLabProvider();
    }
};

providerRegistry.register(gitlabEntry);

// Register Bitbucket provider
const bitbucketEntry: ProviderRegistryEntry = {
    name: "bitbucket",
    displayName: "Bitbucket",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { BitbucketProvider } = await import("./providers/bitbucket/BitbucketProvider");
        return new BitbucketProvider();
    }
};

providerRegistry.register(bitbucketEntry);

// Register Vercel provider
const vercelEntry: ProviderRegistryEntry = {
    name: "vercel",
    displayName: "Vercel",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { VercelProvider } = await import("./providers/vercel/VercelProvider");
        return new VercelProvider();
    }
};

providerRegistry.register(vercelEntry);

// Register CircleCI provider
const circleCIEntry: ProviderRegistryEntry = {
    name: "circleci",
    displayName: "CircleCI",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { CircleCIProvider } = await import("./providers/circleci/CircleCIProvider");
        return new CircleCIProvider();
    }
};

providerRegistry.register(circleCIEntry);

// Register Microsoft Outlook provider
const microsoftOutlookEntry: ProviderRegistryEntry = {
    name: "microsoft-outlook",
    displayName: "Microsoft Outlook",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { MicrosoftOutlookProvider } = await import(
            "./providers/microsoft-outlook/MicrosoftOutlookProvider"
        );
        return new MicrosoftOutlookProvider();
    }
};

providerRegistry.register(microsoftOutlookEntry);

// Register Segment provider
const segmentEntry: ProviderRegistryEntry = {
    name: "segment",
    displayName: "Segment",
    authMethod: "api_key",
    category: "analytics",
    loader: async () => {
        const { SegmentProvider } = await import("./providers/segment/SegmentProvider");
        return new SegmentProvider();
    }
};

providerRegistry.register(segmentEntry);

// Register Medium provider
const mediumEntry: ProviderRegistryEntry = {
    name: "medium",
    displayName: "Medium",
    authMethod: "api_key",
    category: "content_management",
    loader: async () => {
        const { MediumProvider } = await import("./providers/medium/MediumProvider");
        return new MediumProvider();
    }
};

providerRegistry.register(mediumEntry);

// Register QuickBooks provider
const quickbooksEntry: ProviderRegistryEntry = {
    name: "quickbooks",
    displayName: "QuickBooks",
    authMethod: "oauth2",
    category: "accounting",
    loader: async () => {
        const { QuickBooksProvider } = await import("./providers/quickbooks/QuickBooksProvider");
        return new QuickBooksProvider();
    }
};

providerRegistry.register(quickbooksEntry);

// Register FreshBooks provider
const freshbooksEntry: ProviderRegistryEntry = {
    name: "freshbooks",
    displayName: "FreshBooks",
    authMethod: "oauth2",
    category: "accounting",
    loader: async () => {
        const { FreshBooksProvider } = await import("./providers/freshbooks/FreshBooksProvider");
        return new FreshBooksProvider();
    }
};

providerRegistry.register(freshbooksEntry);

// Register Workday provider
const workdayEntry: ProviderRegistryEntry = {
    name: "workday",
    displayName: "Workday",
    authMethod: "oauth2",
    category: "hr",
    loader: async () => {
        const { WorkdayProvider } = await import("./providers/workday/WorkdayProvider");
        return new WorkdayProvider();
    }
};

providerRegistry.register(workdayEntry);

// Register Rippling provider
const ripplingEntry: ProviderRegistryEntry = {
    name: "rippling",
    displayName: "Rippling",
    authMethod: "oauth2",
    category: "hr",
    loader: async () => {
        const { RipplingProvider } = await import("./providers/rippling/RipplingProvider");
        return new RipplingProvider();
    }
};

providerRegistry.register(ripplingEntry);

// Register Stripe provider
const stripeEntry: ProviderRegistryEntry = {
    name: "stripe",
    displayName: "Stripe",
    authMethod: "api_key",
    category: "payments",
    loader: async () => {
        const { StripeProvider } = await import("./providers/stripe/StripeProvider");
        return new StripeProvider();
    }
};

providerRegistry.register(stripeEntry);

// Register Square provider
const squareEntry: ProviderRegistryEntry = {
    name: "square",
    displayName: "Square",
    authMethod: "oauth2",
    category: "payments",
    loader: async () => {
        const { SquareProvider } = await import("./providers/square/SquareProvider");
        return new SquareProvider();
    }
};

providerRegistry.register(squareEntry);

// Register PayPal provider
const paypalEntry: ProviderRegistryEntry = {
    name: "paypal",
    displayName: "PayPal",
    authMethod: "oauth2",
    category: "payments",
    loader: async () => {
        const { PaypalProvider } = await import("./providers/paypal/PaypalProvider");
        return new PaypalProvider();
    }
};

providerRegistry.register(paypalEntry);

// Register Canva provider
const canvaEntry: ProviderRegistryEntry = {
    name: "canva",
    displayName: "Canva",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { CanvaProvider } = await import("./providers/canva/CanvaProvider");
        return new CanvaProvider();
    }
};

providerRegistry.register(canvaEntry);

// Register Miro provider
const miroEntry: ProviderRegistryEntry = {
    name: "miro",
    displayName: "Miro",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { MiroProvider } = await import("./providers/miro/MiroProvider");
        return new MiroProvider();
    }
};

providerRegistry.register(miroEntry);

// Register Confluence provider
const confluenceEntry: ProviderRegistryEntry = {
    name: "confluence",
    displayName: "Confluence",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { ConfluenceProvider } = await import("./providers/confluence/ConfluenceProvider");
        return new ConfluenceProvider();
    }
};

providerRegistry.register(confluenceEntry);

// Register SharePoint provider
const sharepointEntry: ProviderRegistryEntry = {
    name: "sharepoint",
    displayName: "SharePoint",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { SharePointProvider } = await import("./providers/sharepoint/SharePointProvider");
        return new SharePointProvider();
    }
};

providerRegistry.register(sharepointEntry);

// Register Google Cloud Storage provider
const googleCloudStorageEntry: ProviderRegistryEntry = {
    name: "google-cloud-storage",
    displayName: "Google Cloud Storage",
    authMethod: "oauth2",
    category: "file_storage",
    loader: async () => {
        const { GoogleCloudStorageProvider } = await import(
            "./providers/google-cloud-storage/GoogleCloudStorageProvider"
        );
        return new GoogleCloudStorageProvider();
    }
};

providerRegistry.register(googleCloudStorageEntry);

// Register AWS provider (unified Lambda, CloudWatch, ECS)
const awsEntry: ProviderRegistryEntry = {
    name: "aws",
    displayName: "AWS",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { AWSProvider } = await import("./providers/aws/AWSProvider");
        return new AWSProvider();
    }
};

providerRegistry.register(awsEntry);

// Register Google Cloud provider (unified Cloud Build, Secret Manager, Compute Engine, Cloud Run)
const googleCloudEntry: ProviderRegistryEntry = {
    name: "google-cloud",
    displayName: "Google Cloud",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { GoogleCloudProvider } = await import(
            "./providers/google-cloud/GoogleCloudProvider"
        );
        return new GoogleCloudProvider();
    }
};

providerRegistry.register(googleCloudEntry);

// Register Azure DevOps provider (unified Work Items, Repos, Pipelines, Releases, Test Plans)
const azureDevOpsEntry: ProviderRegistryEntry = {
    name: "azure-devops",
    displayName: "Azure DevOps",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { AzureDevOpsProvider } = await import(
            "./providers/azure-devops/AzureDevOpsProvider"
        );
        return new AzureDevOpsProvider();
    }
};

providerRegistry.register(azureDevOpsEntry);

// Register AWS S3 provider
const awsS3Entry: ProviderRegistryEntry = {
    name: "aws-s3",
    displayName: "AWS S3",
    authMethod: "api_key",
    category: "file_storage",
    loader: async () => {
        const { AWSS3Provider } = await import("./providers/aws-s3/AWSS3Provider");
        return new AWSS3Provider();
    }
};

providerRegistry.register(awsS3Entry);

// Register Azure Blob Storage provider
const azureStorageEntry: ProviderRegistryEntry = {
    name: "azure-storage",
    displayName: "Azure Blob Storage",
    authMethod: "api_key",
    category: "file_storage",
    loader: async () => {
        const { AzureStorageProvider } = await import(
            "./providers/azure-storage/AzureStorageProvider"
        );
        return new AzureStorageProvider();
    }
};

providerRegistry.register(azureStorageEntry);

// Register WooCommerce provider
const woocommerceEntry: ProviderRegistryEntry = {
    name: "woocommerce",
    displayName: "WooCommerce",
    authMethod: "api_key",
    category: "ecommerce",
    loader: async () => {
        const { WooCommerceProvider } = await import("./providers/woocommerce/WooCommerceProvider");
        return new WooCommerceProvider();
    }
};

providerRegistry.register(woocommerceEntry);

// Register BigCommerce provider
const bigcommerceEntry: ProviderRegistryEntry = {
    name: "bigcommerce",
    displayName: "BigCommerce",
    authMethod: "api_key",
    category: "ecommerce",
    loader: async () => {
        const { BigCommerceProvider } = await import("./providers/bigcommerce/BigCommerceProvider");
        return new BigCommerceProvider();
    }
};

providerRegistry.register(bigcommerceEntry);

// Register Magento provider
const magentoEntry: ProviderRegistryEntry = {
    name: "magento",
    displayName: "Magento",
    authMethod: "api_key",
    category: "ecommerce",
    loader: async () => {
        const { MagentoProvider } = await import("./providers/magento/MagentoProvider");
        return new MagentoProvider();
    }
};

providerRegistry.register(magentoEntry);

// Register Shippo provider
const shippoEntry: ProviderRegistryEntry = {
    name: "shippo",
    displayName: "Shippo",
    authMethod: "api_key",
    category: "ecommerce",
    loader: async () => {
        const { ShippoProvider } = await import("./providers/shippo/ShippoProvider");
        return new ShippoProvider();
    }
};

providerRegistry.register(shippoEntry);

// Register ShipStation provider
const shipstationEntry: ProviderRegistryEntry = {
    name: "shipstation",
    displayName: "ShipStation",
    authMethod: "api_key",
    category: "ecommerce",
    loader: async () => {
        const { ShipStationProvider } = await import("./providers/shipstation/ShipStationProvider");
        return new ShipStationProvider();
    }
};

providerRegistry.register(shipstationEntry);

// Register Google Analytics provider
const googleAnalyticsEntry: ProviderRegistryEntry = {
    name: "google-analytics",
    displayName: "Google Analytics",
    authMethod: "oauth2",
    category: "analytics",
    loader: async () => {
        const { GoogleAnalyticsProvider } = await import(
            "./providers/google-analytics/GoogleAnalyticsProvider"
        );
        return new GoogleAnalyticsProvider();
    }
};

providerRegistry.register(googleAnalyticsEntry);

// Register Power BI provider
const powerBIEntry: ProviderRegistryEntry = {
    name: "power-bi",
    displayName: "Power BI",
    authMethod: "oauth2",
    category: "analytics",
    loader: async () => {
        const { PowerBIProvider } = await import("./providers/power-bi/PowerBIProvider");
        return new PowerBIProvider();
    }
};

providerRegistry.register(powerBIEntry);

// Register Cloudflare provider
const cloudflareEntry: ProviderRegistryEntry = {
    name: "cloudflare",
    displayName: "Cloudflare",
    authMethod: "api_key",
    category: "developer_tools",
    loader: async () => {
        const { CloudflareProvider } = await import("./providers/cloudflare/CloudflareProvider");
        return new CloudflareProvider();
    }
};

providerRegistry.register(cloudflareEntry);

// Register DigitalOcean provider
const digitaloceanEntry: ProviderRegistryEntry = {
    name: "digitalocean",
    displayName: "DigitalOcean",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { DigitalOceanProvider } = await import(
            "./providers/digitalocean/DigitalOceanProvider"
        );
        return new DigitalOceanProvider();
    }
};

providerRegistry.register(digitaloceanEntry);

// Register Amazon Seller Central provider
const amazonSellerCentralEntry: ProviderRegistryEntry = {
    name: "amazon-seller-central",
    displayName: "Amazon Seller Central",
    authMethod: "oauth2",
    category: "ecommerce",
    loader: async () => {
        const { AmazonSellerCentralProvider } = await import(
            "./providers/amazon-seller-central/AmazonSellerCentralProvider"
        );
        return new AmazonSellerCentralProvider();
    }
};

providerRegistry.register(amazonSellerCentralEntry);

// Register Help Scout provider
const helpscoutEntry: ProviderRegistryEntry = {
    name: "helpscout",
    displayName: "Help Scout",
    authMethod: "oauth2",
    category: "customer_support",
    loader: async () => {
        const { HelpScoutProvider } = await import("./providers/helpscout/HelpScoutProvider");
        return new HelpScoutProvider();
    }
};

providerRegistry.register(helpscoutEntry);

// Register LiveChat provider
const livechatEntry: ProviderRegistryEntry = {
    name: "livechat",
    displayName: "LiveChat",
    authMethod: "oauth2",
    category: "customer_support",
    loader: async () => {
        const { LiveChatProvider } = await import("./providers/livechat/LiveChatProvider");
        return new LiveChatProvider();
    }
};

providerRegistry.register(livechatEntry);

// Register Drift provider
const driftEntry: ProviderRegistryEntry = {
    name: "drift",
    displayName: "Drift",
    authMethod: "oauth2",
    category: "customer_support",
    loader: async () => {
        const { DriftProvider } = await import("./providers/drift/DriftProvider");
        return new DriftProvider();
    }
};

providerRegistry.register(driftEntry);

// Register Google Meet provider
const googleMeetEntry: ProviderRegistryEntry = {
    name: "google-meet",
    displayName: "Google Meet",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { GoogleMeetProvider } = await import("./providers/google-meet/GoogleMeetProvider");
        return new GoogleMeetProvider();
    }
};

providerRegistry.register(googleMeetEntry);

// Register Zoom provider
const zoomEntry: ProviderRegistryEntry = {
    name: "zoom",
    displayName: "Zoom",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { ZoomProvider } = await import("./providers/zoom/ZoomProvider");
        return new ZoomProvider();
    }
};

providerRegistry.register(zoomEntry);

// Register SAP provider
const sapEntry: ProviderRegistryEntry = {
    name: "sap",
    displayName: "SAP",
    authMethod: "oauth2",
    category: "erp",
    loader: async () => {
        const { SapProvider } = await import("./providers/sap/SapProvider");
        return new SapProvider();
    }
};

providerRegistry.register(sapEntry);

// Register NetSuite provider
const netsuiteEntry: ProviderRegistryEntry = {
    name: "netsuite",
    displayName: "NetSuite",
    authMethod: "oauth2",
    category: "erp",
    loader: async () => {
        const { NetsuiteProvider } = await import("./providers/netsuite/NetsuiteProvider");
        return new NetsuiteProvider();
    }
};

providerRegistry.register(netsuiteEntry);

// Register Lattice provider
const latticeEntry: ProviderRegistryEntry = {
    name: "lattice",
    displayName: "Lattice",
    authMethod: "api_key",
    category: "hr",
    loader: async () => {
        const { LatticeProvider } = await import("./providers/lattice/LatticeProvider");
        return new LatticeProvider();
    }
};

providerRegistry.register(latticeEntry);

// Register ADP provider
const adpEntry: ProviderRegistryEntry = {
    name: "adp",
    displayName: "ADP",
    authMethod: "oauth2",
    category: "hr",
    loader: async () => {
        const { ADPProvider } = await import("./providers/adp/ADPProvider");
        return new ADPProvider();
    }
};

providerRegistry.register(adpEntry);

// Register Gusto provider
const gustoEntry: ProviderRegistryEntry = {
    name: "gusto",
    displayName: "Gusto",
    authMethod: "oauth2",
    category: "hr",
    loader: async () => {
        const { GustoProvider } = await import("./providers/gusto/GustoProvider");
        return new GustoProvider();
    }
};

providerRegistry.register(gustoEntry);

// Register BambooHR provider
const bamboohrEntry: ProviderRegistryEntry = {
    name: "bamboohr",
    displayName: "BambooHR",
    authMethod: "oauth2",
    category: "hr",
    loader: async () => {
        const { BambooHRProvider } = await import("./providers/bamboohr/BambooHRProvider");
        return new BambooHRProvider();
    }
};

providerRegistry.register(bamboohrEntry);

// Register Redis provider
const redisEntry: ProviderRegistryEntry = {
    name: "redis",
    displayName: "Redis",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { RedisProvider } = await import("./providers/redis/RedisProvider");
        return new RedisProvider();
    }
};

providerRegistry.register(redisEntry);

// Register Snowflake provider
const snowflakeEntry: ProviderRegistryEntry = {
    name: "snowflake",
    displayName: "Snowflake",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { SnowflakeProvider } = await import("./providers/snowflake/SnowflakeProvider");
        return new SnowflakeProvider();
    }
};

providerRegistry.register(snowflakeEntry);

// Register Xero provider
const xeroEntry: ProviderRegistryEntry = {
    name: "xero",
    displayName: "Xero",
    authMethod: "oauth2",
    category: "accounting",
    loader: async () => {
        const { XeroProvider } = await import("./providers/xero/XeroProvider");
        return new XeroProvider();
    }
};

providerRegistry.register(xeroEntry);

// Register Sage provider
const sageEntry: ProviderRegistryEntry = {
    name: "sage",
    displayName: "Sage",
    authMethod: "oauth2",
    category: "accounting",
    loader: async () => {
        const { SageProvider } = await import("./providers/sage/SageProvider");
        return new SageProvider();
    }
};

providerRegistry.register(sageEntry);

// Register Plaid provider
const plaidEntry: ProviderRegistryEntry = {
    name: "plaid",
    displayName: "Plaid",
    authMethod: "api_key",
    category: "accounting",
    loader: async () => {
        const { PlaidProvider } = await import("./providers/plaid/PlaidProvider");
        return new PlaidProvider();
    }
};

providerRegistry.register(plaidEntry);

// Register Contentful provider
const contentfulEntry: ProviderRegistryEntry = {
    name: "contentful",
    displayName: "Contentful",
    authMethod: "api_key",
    category: "content_management",
    loader: async () => {
        const { ContentfulProvider } = await import("./providers/contentful/ContentfulProvider");
        return new ContentfulProvider();
    }
};

providerRegistry.register(contentfulEntry);

// Register Ghost provider
const ghostEntry: ProviderRegistryEntry = {
    name: "ghost",
    displayName: "Ghost",
    authMethod: "api_key",
    category: "content_management",
    loader: async () => {
        const { GhostProvider } = await import("./providers/ghost/GhostProvider");
        return new GhostProvider();
    }
};

providerRegistry.register(ghostEntry);

// Register eBay provider
const ebayEntry: ProviderRegistryEntry = {
    name: "ebay",
    displayName: "eBay",
    authMethod: "oauth2",
    category: "ecommerce",
    loader: async () => {
        const { EbayProvider } = await import("./providers/ebay/EbayProvider");
        return new EbayProvider();
    }
};

providerRegistry.register(ebayEntry);

// Register Etsy provider
const etsyEntry: ProviderRegistryEntry = {
    name: "etsy",
    displayName: "Etsy",
    authMethod: "oauth2",
    category: "ecommerce",
    loader: async () => {
        const { EtsyProvider } = await import("./providers/etsy/EtsyProvider");
        return new EtsyProvider();
    }
};

providerRegistry.register(etsyEntry);

// Register Kustomer provider
const kustomerEntry: ProviderRegistryEntry = {
    name: "kustomer",
    displayName: "Kustomer",
    authMethod: "api_key",
    category: "customer_support",
    loader: async () => {
        const { KustomerProvider } = await import("./providers/kustomer/KustomerProvider");
        return new KustomerProvider();
    }
};

providerRegistry.register(kustomerEntry);

// Register Squarespace provider
const squarespaceEntry: ProviderRegistryEntry = {
    name: "squarespace",
    displayName: "Squarespace",
    authMethod: "oauth2",
    category: "ecommerce",
    loader: async () => {
        const { SquarespaceProvider } = await import("./providers/squarespace/SquarespaceProvider");
        return new SquarespaceProvider();
    }
};

providerRegistry.register(squarespaceEntry);

// Register Gorgias provider
const gorgiasEntry: ProviderRegistryEntry = {
    name: "gorgias",
    displayName: "Gorgias",
    authMethod: "oauth2",
    category: "customer_support",
    loader: async () => {
        const { GorgiasProvider } = await import("./providers/gorgias/GorgiasProvider");
        return new GorgiasProvider();
    }
};

providerRegistry.register(gorgiasEntry);

// Register Wix provider
const wixEntry: ProviderRegistryEntry = {
    name: "wix",
    displayName: "Wix",
    authMethod: "api_key",
    category: "ecommerce",
    loader: async () => {
        const { WixProvider } = await import("./providers/wix/WixProvider");
        return new WixProvider();
    }
};

providerRegistry.register(wixEntry);

// Register GitBook provider
const gitbookEntry: ProviderRegistryEntry = {
    name: "gitbook",
    displayName: "GitBook",
    authMethod: "api_key",
    category: "documentation",
    loader: async () => {
        const { GitBookProvider } = await import("./providers/gitbook/GitBookProvider");
        return new GitBookProvider();
    }
};

providerRegistry.register(gitbookEntry);

// Register Zoho CRM provider
const zohoCrmEntry: ProviderRegistryEntry = {
    name: "zoho-crm",
    displayName: "Zoho CRM",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { ZohoCrmProvider } = await import("./providers/zoho-crm/ZohoCrmProvider");
        return new ZohoCrmProvider();
    }
};

providerRegistry.register(zohoCrmEntry);

// Register Copper CRM provider
const copperEntry: ProviderRegistryEntry = {
    name: "copper",
    displayName: "Copper",
    authMethod: "api_key",
    category: "crm",
    loader: async () => {
        const { CopperProvider } = await import("./providers/copper/CopperProvider");
        return new CopperProvider();
    }
};

providerRegistry.register(copperEntry);

// Register Insightly CRM provider
const insightlyEntry: ProviderRegistryEntry = {
    name: "insightly",
    displayName: "Insightly",
    authMethod: "api_key",
    category: "crm",
    loader: async () => {
        const { InsightlyProvider } = await import("./providers/insightly/InsightlyProvider");
        return new InsightlyProvider();
    }
};

providerRegistry.register(insightlyEntry);

// Register Databricks provider
const databricksEntry: ProviderRegistryEntry = {
    name: "databricks",
    displayName: "Databricks",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { DatabricksProvider } = await import("./providers/databricks/DatabricksProvider");
        return new DatabricksProvider();
    }
};

providerRegistry.register(databricksEntry);

// Register Elasticsearch provider
const elasticsearchEntry: ProviderRegistryEntry = {
    name: "elasticsearch",
    displayName: "Elasticsearch",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { ElasticsearchProvider } = await import(
            "./providers/elasticsearch/ElasticsearchProvider"
        );
        return new ElasticsearchProvider();
    }
};

providerRegistry.register(elasticsearchEntry);

// Register Bill.com provider
const billComEntry: ProviderRegistryEntry = {
    name: "bill-com",
    displayName: "Bill.com",
    authMethod: "oauth2",
    category: "accounting",
    loader: async () => {
        const { BillComProvider } = await import("./providers/bill-com/BillComProvider");
        return new BillComProvider();
    }
};

providerRegistry.register(billComEntry);

// Register Expensify provider
const expensifyEntry: ProviderRegistryEntry = {
    name: "expensify",
    displayName: "Expensify",
    authMethod: "api_key",
    category: "accounting",
    loader: async () => {
        const { ExpensifyProvider } = await import("./providers/expensify/ExpensifyProvider");
        return new ExpensifyProvider();
    }
};

providerRegistry.register(expensifyEntry);

// Register Ramp provider
const rampEntry: ProviderRegistryEntry = {
    name: "ramp",
    displayName: "Ramp",
    authMethod: "oauth2",
    category: "accounting",
    loader: async () => {
        const { RampProvider } = await import("./providers/ramp/RampProvider");
        return new RampProvider();
    }
};

providerRegistry.register(rampEntry);

// Register Wise provider
const wiseEntry: ProviderRegistryEntry = {
    name: "wise",
    displayName: "Wise",
    authMethod: "api_key",
    category: "accounting",
    loader: async () => {
        const { WiseProvider } = await import("./providers/wise/WiseProvider");
        return new WiseProvider();
    }
};

providerRegistry.register(wiseEntry);

// Register Chargebee provider
const chargebeeEntry: ProviderRegistryEntry = {
    name: "chargebee",
    displayName: "Chargebee",
    authMethod: "api_key",
    category: "accounting",
    loader: async () => {
        const { ChargebeeProvider } = await import("./providers/chargebee/ChargebeeProvider");
        return new ChargebeeProvider();
    }
};

providerRegistry.register(chargebeeEntry);

// Register BigQuery provider
const bigqueryEntry: ProviderRegistryEntry = {
    name: "bigquery",
    displayName: "BigQuery",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { BigQueryProvider } = await import("./providers/bigquery/BigQueryProvider");
        return new BigQueryProvider();
    }
};

providerRegistry.register(bigqueryEntry);

// Register Redshift provider
const redshiftEntry: ProviderRegistryEntry = {
    name: "redshift",
    displayName: "Amazon Redshift",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { RedshiftProvider } = await import("./providers/redshift/RedshiftProvider");
        return new RedshiftProvider();
    }
};

providerRegistry.register(redshiftEntry);

// Register Twilio provider
const twilioEntry: ProviderRegistryEntry = {
    name: "twilio",
    displayName: "Twilio",
    authMethod: "api_key",
    category: "marketing",
    loader: async () => {
        const { TwilioProvider } = await import("./providers/twilio/TwilioProvider");
        return new TwilioProvider();
    }
};

providerRegistry.register(twilioEntry);

// Register HiBob provider
const hibobEntry: ProviderRegistryEntry = {
    name: "hibob",
    displayName: "HiBob",
    authMethod: "api_key",
    category: "hr",
    loader: async () => {
        const { HiBobProvider } = await import("./providers/hibob/HiBobProvider");
        return new HiBobProvider();
    }
};

providerRegistry.register(hibobEntry);

// Register Personio provider
const personioEntry: ProviderRegistryEntry = {
    name: "personio",
    displayName: "Personio",
    authMethod: "api_key",
    category: "hr",
    loader: async () => {
        const { PersonioProvider } = await import("./providers/personio/PersonioProvider");
        return new PersonioProvider();
    }
};

providerRegistry.register(personioEntry);

// Register Postmark provider
const postmarkEntry: ProviderRegistryEntry = {
    name: "postmark",
    displayName: "Postmark",
    authMethod: "api_key",
    category: "communication",
    loader: async () => {
        const { PostmarkProvider } = await import("./providers/postmark/PostmarkProvider");
        return new PostmarkProvider();
    }
};

providerRegistry.register(postmarkEntry);

// Register Front provider
const frontEntry: ProviderRegistryEntry = {
    name: "front",
    displayName: "Front",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { FrontProvider } = await import("./providers/front/FrontProvider");
        return new FrontProvider();
    }
};

providerRegistry.register(frontEntry);

// Register RingCentral provider
const ringcentralEntry: ProviderRegistryEntry = {
    name: "ringcentral",
    displayName: "RingCentral",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { RingCentralProvider } = await import("./providers/ringcentral/RingCentralProvider");
        return new RingCentralProvider();
    }
};

providerRegistry.register(ringcentralEntry);

// Register Deel provider
const deelEntry: ProviderRegistryEntry = {
    name: "deel",
    displayName: "Deel",
    authMethod: "api_key",
    category: "hr",
    loader: async () => {
        const { DeelProvider } = await import("./providers/deel/DeelProvider");
        return new DeelProvider();
    }
};

providerRegistry.register(deelEntry);

// Register SAP SuccessFactors provider
const sapSuccessFactorsEntry: ProviderRegistryEntry = {
    name: "sap-successfactors",
    displayName: "SAP SuccessFactors",
    authMethod: "oauth2",
    category: "hr",
    loader: async () => {
        const { SAPSuccessFactorsProvider } = await import(
            "./providers/sap-successfactors/SAPSuccessFactorsProvider"
        );
        return new SAPSuccessFactorsProvider();
    }
};

providerRegistry.register(sapSuccessFactorsEntry);

// Register Crisp provider
const crispEntry: ProviderRegistryEntry = {
    name: "crisp",
    displayName: "Crisp",
    authMethod: "api_key",
    category: "customer_support",
    loader: async () => {
        const { CrispProvider } = await import("./providers/crisp/CrispProvider");
        return new CrispProvider();
    }
};

providerRegistry.register(crispEntry);

// Register HubSpot Marketing provider
const hubspotMarketingEntry: ProviderRegistryEntry = {
    name: "hubspot-marketing",
    displayName: "HubSpot Marketing",
    authMethod: "oauth2",
    category: "marketing",
    loader: async () => {
        const { HubspotMarketingProvider } = await import(
            "./providers/hubspot-marketing/HubspotMarketingProvider"
        );
        return new HubspotMarketingProvider();
    }
};

providerRegistry.register(hubspotMarketingEntry);

// Register ActiveCampaign provider
const activecampaignEntry: ProviderRegistryEntry = {
    name: "activecampaign",
    displayName: "ActiveCampaign",
    authMethod: "api_key",
    category: "marketing",
    loader: async () => {
        const { ActiveCampaignProvider } = await import(
            "./providers/activecampaign/ActiveCampaignProvider"
        );
        return new ActiveCampaignProvider();
    }
};

providerRegistry.register(activecampaignEntry);

// Export for use in application
export { providerRegistry };
