/**
 * GoogleDocs Provider Operation Tests
 *
 * Tests GoogleDocs operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleDocsFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleDocsFixtures);

describe("GoogleDocs Provider Operations", () => {
    describeProviderFixtures("google-docs");
});
