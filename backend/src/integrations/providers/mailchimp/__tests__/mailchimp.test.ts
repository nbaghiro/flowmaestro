/**
 * Mailchimp Provider Operation Tests
 *
 * Tests Mailchimp operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { mailchimpFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(mailchimpFixtures);

describe("Mailchimp Provider Operations", () => {
    describeProviderFixtures("mailchimp");
});
