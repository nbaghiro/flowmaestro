/**
 * GoogleForms Provider Operation Tests
 *
 * Tests GoogleForms operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleFormsFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleFormsFixtures);

describe("GoogleForms Provider Operations", () => {
    describeProviderFixtures("google-forms");
});
