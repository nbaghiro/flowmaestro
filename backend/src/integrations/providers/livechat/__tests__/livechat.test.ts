/**
 * LiveChat Provider Operation Tests
 *
 * Tests LiveChat operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { livechatFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(livechatFixtures);

describe("LiveChat Provider Operations", () => {
    describeProviderFixtures("livechat");
});
