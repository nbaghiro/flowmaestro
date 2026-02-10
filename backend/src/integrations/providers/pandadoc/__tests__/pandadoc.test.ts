/**
 * PandaDoc Provider Operation Tests
 *
 * Tests PandaDoc operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { pandadocFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(pandadocFixtures);

describe("PandaDoc Provider Operations", () => {
    describeProviderFixtures("pandadoc");
});
