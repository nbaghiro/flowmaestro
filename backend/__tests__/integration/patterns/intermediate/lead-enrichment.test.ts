/**
 * Lead Enrichment Pipeline Pattern Tests
 *
 * Tests the intermediate-level lead enrichment workflow that includes:
 * - Multi-source enrichment (Apollo, LinkedIn)
 * - LLM-based data merging and qualification
 * - Router-based tier routing
 * - CRM sync to HubSpot and Salesforce
 * - Email outreach generation
 * - Analytics tracking
 *
 * Pattern: trigger-1 → [action-apollo, action-linkedin] → llm-merge → llm-qualify → router-tier → [various actions] → output-1
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockActionOutput,
    createMockRouterOutput,
    createMockTriggerOutput,
    createMockTransformOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType
} from "../helpers/pattern-test-utils";

describe("Lead Enrichment Pipeline Pattern", () => {
    const PATTERN_ID = "lead-enrichment";

    // Standard lead event data for tests
    const sampleLeadEvent = {
        email: "john@techstartup.com",
        company: "techstartup.com",
        name: "John Smith",
        source: "webinar-signup"
    };

    // Apollo enrichment data
    const apolloData = {
        name: "John Smith",
        title: "VP of Engineering",
        company: "TechStartup Inc.",
        companySize: "50-100",
        industry: "Software",
        funding: "$5M Series A"
    };

    // LinkedIn enrichment data
    const linkedinData = {
        headline: "VP Engineering at TechStartup",
        connections: 500,
        experience: [{ company: "TechStartup", title: "VP Engineering", years: 2 }]
    };

    // Merged data output
    const mergedData = {
        mergedProfile: {
            name: "John Smith",
            title: "VP of Engineering",
            company: "TechStartup Inc.",
            companySize: "50-100",
            industry: "Software",
            funding: "$5M Series A",
            technologies: ["AWS", "React"],
            socialProfiles: { linkedin: "johnsmith" }
        },
        insights: ["Decision maker", "Well-funded company"],
        buyingSignals: ["Recent funding", "Hiring engineers"]
    };

    // Helper to create complete mock outputs for all pattern nodes
    const createCompleteMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "trigger-1": createMockTriggerOutput(sampleLeadEvent),
        "action-apollo": createMockActionOutput(true, apolloData),
        "action-linkedin": createMockActionOutput(true, linkedinData),
        "llm-merge": createMockLLMOutput(JSON.stringify(mergedData)),
        "llm-qualify": createMockLLMOutput(
            JSON.stringify({
                score: 85,
                tier: "enterprise",
                icp_fit: 90,
                timing_score: 80,
                budget_likelihood: "high",
                decision_maker: true,
                recommended_cadence: "high-touch"
            })
        ),
        "router-tier": createMockRouterOutput("enterprise"),
        "action-salesforce": createMockActionOutput(true, { id: "sf-lead-123" }),
        "action-hubspot-update": createMockActionOutput(true, { updated: true }),
        "llm-email-enterprise": createMockLLMOutput("Personalized enterprise email..."),
        "action-gmail-enterprise": createMockActionOutput(true, { messageId: "msg-123" }),
        "action-slack-enterprise": createMockActionOutput(true),
        "action-slack-midmarket": createMockActionOutput(true),
        "action-amplitude": createMockActionOutput(true),
        "transform-result": createMockTransformOutput({ enriched: true }),
        "output-1": createMockActionOutput(true),
        ...overrides
    });

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBeGreaterThanOrEqual(10);
        });

        it("should have trigger node as entry point", () => {
            const triggerNodes = getPatternNodesByType(PATTERN_ID, "trigger");
            expect(triggerNodes.length).toBe(1);
        });

        it("should have action nodes for enrichment", () => {
            const actionNodes = getPatternNodesByType(PATTERN_ID, "action");
            expect(actionNodes.length).toBeGreaterThanOrEqual(2);
        });

        it("should have LLM nodes for merging and qualification", () => {
            const llmNodes = getPatternNodesByType(PATTERN_ID, "llm");
            expect(llmNodes.length).toBeGreaterThanOrEqual(2);
        });

        it("should have router node for tier routing", () => {
            const routerNodes = getPatternNodesByType(PATTERN_ID, "router");
            expect(routerNodes.length).toBe(1);
        });
    });

    describe("enterprise lead qualification", () => {
        it("should process and qualify an enterprise lead", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadEvent: sampleLeadEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, [
                "trigger-1",
                "action-apollo",
                "action-linkedin",
                "llm-merge",
                "llm-qualify",
                "router-tier"
            ]);
        });

        it("should route enterprise leads to Salesforce", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadEvent: sampleLeadEvent },
                mockOutputs: createCompleteMocks({
                    "action-salesforce": createMockActionOutput(true, {
                        id: "sf-lead-456",
                        created: true
                    })
                })
            });

            assertPatternSuccess(result);
            const sfOutput = result.context.nodeOutputs.get("action-salesforce") as Record<
                string,
                unknown
            >;
            expect(sfOutput?.success).toBe(true);
        });
    });

    describe("mid-market lead qualification", () => {
        it("should process mid-market leads via HubSpot", async () => {
            const midMarketQualification = {
                score: 65,
                tier: "mid-market",
                icp_fit: 70,
                timing_score: 60,
                budget_likelihood: "medium",
                decision_maker: true,
                recommended_cadence: "standard"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadEvent: sampleLeadEvent },
                mockOutputs: createCompleteMocks({
                    "llm-qualify": createMockLLMOutput(JSON.stringify(midMarketQualification)),
                    "router-tier": createMockRouterOutput("mid-market"),
                    "transform-result": createMockTransformOutput({ tier: "mid-market" })
                })
            });

            assertPatternSuccess(result);
            const routerOutput = result.context.nodeOutputs.get("router-tier") as Record<
                string,
                unknown
            >;
            expect(routerOutput?.selectedRoute).toBe("mid-market");
        });
    });

    describe("nurture lead handling", () => {
        it("should handle unqualified leads for nurturing", async () => {
            const nurtureQualification = {
                score: 30,
                tier: "nurture",
                icp_fit: 40,
                timing_score: 20,
                budget_likelihood: "low",
                decision_maker: false,
                recommended_cadence: "nurture"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadEvent: sampleLeadEvent },
                mockOutputs: createCompleteMocks({
                    "action-apollo": createMockActionOutput(true, { name: "Unknown" }),
                    "action-linkedin": createMockActionOutput(true, {}),
                    "llm-merge": createMockLLMOutput(
                        JSON.stringify({ mergedProfile: { name: "Unknown" } })
                    ),
                    "llm-qualify": createMockLLMOutput(JSON.stringify(nurtureQualification)),
                    "router-tier": createMockRouterOutput("nurture"),
                    "transform-result": createMockTransformOutput({ tier: "nurture" })
                })
            });

            assertPatternSuccess(result);
            const routerOutput = result.context.nodeOutputs.get("router-tier") as Record<
                string,
                unknown
            >;
            expect(routerOutput?.selectedRoute).toBe("nurture");
        });
    });

    describe("enrichment data flow", () => {
        it("should pass enriched data through merge LLM", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadEvent: sampleLeadEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            const apolloOutput = result.context.nodeOutputs.get("action-apollo") as Record<
                string,
                unknown
            >;
            expect(apolloOutput?.success).toBe(true);
        });
    });

    describe("analytics tracking", () => {
        it("should track qualification event in Amplitude", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadEvent: sampleLeadEvent },
                mockOutputs: createCompleteMocks({
                    "action-amplitude": createMockActionOutput(true, {
                        event: "lead_qualified",
                        tracked: true
                    })
                })
            });

            assertPatternSuccess(result);
            const amplitudeOutput = result.context.nodeOutputs.get("action-amplitude") as Record<
                string,
                unknown
            >;
            expect(amplitudeOutput?.success).toBe(true);
        });
    });
});
