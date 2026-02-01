/**
 * Docusign Provider Operation Tests
 *
 * Tests Docusign operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { docusignFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(docusignFixtures);

describe("Docusign Provider Operations", () => {
    describeProviderFixtures("docusign");
});
