/**
 * Jira Provider Operation Tests
 *
 * Tests Jira operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { jiraFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(jiraFixtures);

describe("Jira Provider Operations", () => {
    describeProviderFixtures("jira");
});
