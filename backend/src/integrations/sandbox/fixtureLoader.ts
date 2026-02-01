/**
 * Fixture Loader
 *
 * Loads all provider fixtures into the registry at runtime.
 * This enables the sandbox data explorer API to access fixture data.
 */

import { createServiceLogger } from "../../core/logging";
import { fixtureRegistry } from "./FixtureRegistry";

const logger = createServiceLogger("FixtureLoader");

let loaded = false;

/**
 * Load all provider fixtures into the registry.
 * This is idempotent - subsequent calls are no-ops.
 */
export async function loadAllFixtures(): Promise<void> {
    if (loaded) {
        return;
    }

    const providers = [
        "airtable",
        "amplitude",
        "apollo",
        "asana",
        "bitbucket",
        "box",
        "buffer",
        "cal-com",
        "calendly",
        "circleci",
        "clickup",
        "close",
        "coda",
        "datadog",
        "discord",
        "docusign",
        "dropbox",
        "evernote",
        "facebook",
        "figma",
        "freshbooks",
        "freshdesk",
        "github",
        "gitlab",
        "gmail",
        "google-calendar",
        "google-docs",
        "google-drive",
        "google-forms",
        "google-sheets",
        "google-slides",
        "heap",
        "hellosign",
        "hootsuite",
        "hubspot",
        "instagram",
        "intercom",
        "jira",
        "klaviyo",
        "linear",
        "linkedin",
        "looker",
        "mailchimp",
        "marketo",
        "medium",
        "microsoft-excel",
        "microsoft-onedrive",
        "microsoft-outlook",
        "microsoft-powerpoint",
        "microsoft-teams",
        "microsoft-word",
        "mixpanel",
        "monday",
        "mongodb",
        "notion",
        "pagerduty",
        "pipedrive",
        "postgresql",
        "posthog",
        "quickbooks",
        "reddit",
        "rippling",
        "salesforce",
        "segment",
        "sendgrid",
        "sentry",
        "shopify",
        "slack",
        "square",
        "stripe",
        "surveymonkey",
        "tableau",
        "telegram",
        "trello",
        "twitter",
        "typeform",
        "vercel",
        "whatsapp",
        "workday",
        "youtube",
        "zendesk"
    ];

    let loadedCount = 0;
    let fixtureCount = 0;

    for (const provider of providers) {
        try {
            // Dynamic import of fixtures
            const module = await import(`../providers/${provider}/__tests__/fixtures`);
            const fixturesKey = Object.keys(module).find((key) => key.endsWith("Fixtures"));

            if (fixturesKey && Array.isArray(module[fixturesKey])) {
                fixtureRegistry.registerAll(module[fixturesKey]);
                fixtureCount += module[fixturesKey].length;
                loadedCount++;
            }
        } catch (error) {
            // Fixture file might not exist for some providers - this is okay
            logger.debug({ provider, error }, "Could not load fixtures for provider");
        }
    }

    loaded = true;
    logger.info({ loadedCount, fixtureCount }, "Loaded sandbox fixtures");
}

/**
 * Check if fixtures have been loaded
 */
export function areFixturesLoaded(): boolean {
    return loaded;
}
