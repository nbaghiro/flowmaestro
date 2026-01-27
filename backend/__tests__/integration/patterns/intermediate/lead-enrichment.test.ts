/**
 * Lead Enrichment Pipeline Pattern Tests
 *
 * Tests the intermediate-level lead enrichment workflow that includes:
 * - HTTP API calls for data enrichment
 * - LLM-based lead qualification
 * - Conditional routing based on qualification score
 * - CRM action integration
 *
 * Pattern: input-1 → http-enrich → llm-qualify → conditional-score → [action-crm] → output-1
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockHTTPOutput,
    createMockConditionalOutput,
    createMockActionOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType
} from "../helpers/pattern-test-utils";

describe("Lead Enrichment Pipeline Pattern", () => {
    const PATTERN_ID = "lead-enrichment";

    // Standard lead data for tests
    const sampleLead = {
        email: "john@techstartup.com",
        company: "techstartup.com",
        name: "John Smith",
        source: "webinar-signup"
    };

    // Standard enriched company data
    const enrichedCompanyData = {
        name: "TechStartup Inc.",
        domain: "techstartup.com",
        industry: "Software",
        employeeCount: 50,
        funding: "$5M Series A",
        location: "San Francisco, CA",
        technologies: ["AWS", "React", "Python"]
    };

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBeGreaterThanOrEqual(5);
        });

        it("should have HTTP enrichment node", () => {
            const httpNodes = getPatternNodesByType(PATTERN_ID, "http");
            expect(httpNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have conditional node for score check", () => {
            const conditionalNodes = getPatternNodesByType(PATTERN_ID, "conditional");
            expect(conditionalNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have action node for CRM", () => {
            const actionNodes = getPatternNodesByType(PATTERN_ID, "action");
            expect(actionNodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("hot lead qualification", () => {
        it("should process and qualify a hot lead", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(enrichedCompanyData),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 85,
                            tier: "hot",
                            reasoning:
                                "Well-funded tech startup in target market with matching tech stack",
                            nextStep: "Schedule demo call within 24 hours"
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true, {
                        contactId: "contact-456",
                        updated: true,
                        properties: { lead_score: "85", lead_tier: "hot" }
                    })
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["http-enrich", "llm-qualify", "conditional-score"]);
        });

        it("should pass enriched data to qualification LLM", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(enrichedCompanyData),
                    "llm-qualify": createMockLLMOutput(JSON.stringify({ score: 90, tier: "hot" })),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true)
                }
            });

            assertPatternSuccess(result);
            const httpOutput = result.context.nodeOutputs.get("http-enrich") as Record<
                string,
                unknown
            >;
            expect(httpOutput?.data).toEqual(enrichedCompanyData);
        });

        it("should update CRM for qualified leads", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(enrichedCompanyData),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({ score: 75, tier: "warm", reasoning: "Good fit" })
                    ),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true, {
                        contactId: "contact-789",
                        updated: true,
                        properties: { lead_score: "75", lead_tier: "warm" }
                    })
                }
            });

            assertPatternSuccess(result);
            const actionOutput = result.context.nodeOutputs.get("action-crm") as Record<
                string,
                unknown
            >;
            expect(actionOutput?.success).toBe(true);
        });
    });

    describe("warm lead qualification", () => {
        it("should process and qualify a warm lead", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: {
                    leadData: {
                        email: "jane@midsize.com",
                        company: "midsize.com",
                        name: "Jane Doe",
                        source: "content-download"
                    }
                },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({
                        name: "Midsize Corp",
                        employeeCount: 200,
                        industry: "Manufacturing"
                    }),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 60,
                            tier: "warm",
                            reasoning: "Decent company size but industry is secondary target",
                            nextStep: "Add to nurture sequence"
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true)
                }
            });

            assertPatternSuccess(result);
            const llmOutput = result.context.nodeOutputs.get("llm-qualify") as Record<
                string,
                unknown
            >;
            const qualification = JSON.parse(llmOutput?.text as string);
            expect(qualification.tier).toBe("warm");
        });
    });

    describe("cold lead handling", () => {
        it("should handle cold leads (below threshold)", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: {
                    leadData: {
                        email: "test@small.com",
                        company: "small.com",
                        name: "Test User",
                        source: "cold-outreach"
                    }
                },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({
                        name: "Small Business",
                        employeeCount: 5,
                        industry: "Retail"
                    }),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 25,
                            tier: "cold",
                            reasoning: "Company too small and not in target industry",
                            nextStep: "No immediate action"
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(false),
                    "action-crm": createMockActionOutput(false)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-score") as Record<
                string,
                unknown
            >;
            expect(conditionalOutput?.result).toBe(false);
        });

        it("should handle unqualified leads with condition false", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({ name: "Unknown" }),
                    "llm-qualify": createMockLLMOutput(JSON.stringify({ score: 10, tier: "cold" })),
                    "conditional-score": createMockConditionalOutput(false),
                    "action-crm": createMockActionOutput(false)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-score") as Record<
                string,
                unknown
            >;
            expect(conditionalOutput?.result).toBe(false);
        });
    });

    describe("HTTP enrichment", () => {
        it("should handle successful API enrichment", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(
                        {
                            name: "Acme Corp",
                            domain: "acme.com",
                            industry: "Technology",
                            employeeCount: 500,
                            revenue: "$50M ARR",
                            fundingTotal: "$20M",
                            technologies: ["Kubernetes", "Python", "AWS"]
                        },
                        200
                    ),
                    "llm-qualify": createMockLLMOutput(JSON.stringify({ score: 95, tier: "hot" })),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true)
                }
            });

            assertPatternSuccess(result);
            const httpOutput = result.context.nodeOutputs.get("http-enrich") as Record<
                string,
                unknown
            >;
            expect(httpOutput?.status).toBe(200);
            const httpData = httpOutput?.data as JsonObject;
            expect(httpData.employeeCount).toBe(500);
        });

        it("should handle enrichment with minimal data", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(
                        { name: "Unknown Company", domain: sampleLead.company },
                        200
                    ),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 40,
                            tier: "cold",
                            reasoning: "Insufficient company data for proper qualification"
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(false),
                    "action-crm": createMockActionOutput(false)
                }
            });

            assertPatternSuccess(result);
            const llmOutput = result.context.nodeOutputs.get("llm-qualify") as Record<
                string,
                unknown
            >;
            const qualification = JSON.parse(llmOutput?.text as string);
            expect(qualification.reasoning).toContain("Insufficient");
        });
    });

    describe("LLM qualification", () => {
        it("should qualify based on company size and funding", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({
                        name: "BigTech Inc",
                        employeeCount: 1000,
                        funding: "$100M Series C",
                        industry: "Enterprise Software"
                    }),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 95,
                            tier: "hot",
                            reasoning:
                                "Large enterprise with significant funding in target vertical",
                            nextStep: "Immediate outreach by senior AE",
                            signals: ["Enterprise buyer", "Well-funded", "Matching industry"]
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true)
                }
            });

            assertPatternSuccess(result);
            const llmOutput = result.context.nodeOutputs.get("llm-qualify") as Record<
                string,
                unknown
            >;
            const qualification = JSON.parse(llmOutput?.text as string);
            expect(qualification.score).toBe(95);
            expect(qualification.signals).toContain("Enterprise buyer");
        });
    });

    describe("CRM integration", () => {
        it("should update CRM with qualification data", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(enrichedCompanyData),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({ score: 80, tier: "hot", nextStep: "Call" })
                    ),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true, {
                        contactId: "hubspot-contact-123",
                        updated: true,
                        properties: {
                            lead_score: "80",
                            lead_tier: "hot",
                            enriched_company: "TechStartup Inc."
                        }
                    })
                }
            });

            assertPatternSuccess(result);
            const actionOutput = result.context.nodeOutputs.get("action-crm") as Record<
                string,
                unknown
            >;
            const actionResult = actionOutput?.result as JsonObject;
            expect((actionResult?.properties as JsonObject)?.lead_score).toBe("80");
        });
    });

    describe("edge cases", () => {
        it("should handle lead with missing company domain", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: {
                    leadData: {
                        email: "freelancer@gmail.com",
                        company: "",
                        name: "Freelancer",
                        source: "organic"
                    }
                },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({ error: "Domain not found" }, 404),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 15,
                            tier: "cold",
                            reasoning: "No company information available"
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(false),
                    "action-crm": createMockActionOutput(false)
                }
            });

            assertPatternSuccess(result);
            const httpOutput = result.context.nodeOutputs.get("http-enrich") as Record<
                string,
                unknown
            >;
            expect(httpOutput?.status).toBe(404);
        });

        it("should handle international leads", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: {
                    leadData: {
                        email: "takeshi@tokyo-tech.jp",
                        company: "tokyo-tech.jp",
                        name: "Takeshi Yamamoto",
                        source: "partner-referral"
                    }
                },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({
                        name: "Tokyo Technology Co.",
                        location: "Tokyo, Japan",
                        employeeCount: 300,
                        industry: "Technology"
                    }),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({
                            score: 70,
                            tier: "warm",
                            reasoning:
                                "Good company profile but APAC market requires localized approach",
                            nextStep: "Route to APAC team"
                        })
                    ),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true)
                }
            });

            assertPatternSuccess(result);
            const llmOutput = result.context.nodeOutputs.get("llm-qualify") as Record<
                string,
                unknown
            >;
            const qualification = JSON.parse(llmOutput?.text as string);
            expect(qualification.nextStep).toContain("APAC");
        });

        it("should handle empty lead data", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: {} },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput({ error: "No domain provided" }, 400),
                    "llm-qualify": createMockLLMOutput(
                        JSON.stringify({ score: 0, tier: "invalid", reasoning: "Missing data" })
                    ),
                    "conditional-score": createMockConditionalOutput(false),
                    "action-crm": createMockActionOutput(false)
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("token tracking", () => {
        it("should track tokens for qualification LLM", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { leadData: sampleLead },
                mockOutputs: {
                    "http-enrich": createMockHTTPOutput(enrichedCompanyData),
                    "llm-qualify": createMockLLMOutput(JSON.stringify({ score: 80, tier: "hot" }), {
                        tokens: { prompt: 300, completion: 75 }
                    }),
                    "conditional-score": createMockConditionalOutput(true),
                    "action-crm": createMockActionOutput(true)
                }
            });

            assertPatternSuccess(result);
            const llmOutput = result.context.nodeOutputs.get("llm-qualify") as Record<
                string,
                unknown
            >;
            expect(llmOutput?.tokens).toEqual({ prompt: 300, completion: 75 });
        });
    });
});
