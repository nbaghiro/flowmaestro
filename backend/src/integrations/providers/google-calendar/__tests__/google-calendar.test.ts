/**
 * GoogleCalendar Provider Operation Tests
 *
 * Tests GoogleCalendar operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleCalendarFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleCalendarFixtures);

describe("GoogleCalendar Provider Operations", () => {
    describeProviderFixtures("google-calendar");
});
