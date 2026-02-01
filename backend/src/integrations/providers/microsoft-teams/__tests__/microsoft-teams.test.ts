/**
 * MicrosoftTeams Provider Operation Tests
 *
 * Tests MicrosoftTeams operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { microsoftTeamsFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(microsoftTeamsFixtures);

describe("MicrosoftTeams Provider Operations", () => {
    describeProviderFixtures("microsoft-teams");
});
