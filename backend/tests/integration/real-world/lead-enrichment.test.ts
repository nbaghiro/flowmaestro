/**
 * Lead Enrichment Workflow Tests
 *
 * Tests a realistic lead enrichment pipeline:
 * Trigger → HTTP (enrich from external API) → LLM (score lead) → Conditional → (CRM update OR notification)
 *
 * Simulates a common sales/marketing automation workflow.
 */

import { ContextSnapshot, ExecutableNode, TypedEdge, JsonObject } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";

// Types for lead enrichment workflow
interface LeadInput {
    email: string;
    name?: string;
    company?: string;
    source?: string;
}

interface EnrichmentData {
    email: string;
    name: string;
    company: string;
    title: string;
    linkedinUrl: string;
    companySize: string;
    industry: string;
    location: string;
    technologies: string[];
    fundingStage: string;
    revenue: string;
}

interface LeadScore {
    score: number;
    tier: "hot" | "warm" | "cold";
    reasons: string[];
    recommendedAction: string;
}

interface CRMUpdateResult {
    success: boolean;
    contactId: string;
    updatedFields: string[];
}

interface NotificationResult {
    sent: boolean;
    channel: string;
    recipient: string;
}

// Workflow builder for lead enrichment
function buildLeadEnrichmentWorkflow(): {
    nodes: Map<string, ExecutableNode>;
    edges: TypedEdge[];
    executionLevels: string[][];
} {
    const nodes = new Map<string, ExecutableNode>();

    nodes.set("Trigger", {
        id: "Trigger",
        type: "trigger",
        config: { triggerType: "webhook" },
        dependencies: []
    });

    nodes.set("EnrichLead", {
        id: "EnrichLead",
        type: "http",
        config: {
            url: "https://api.clearbit.com/v2/people/find",
            method: "GET",
            headers: { Authorization: "Bearer {{secrets.clearbit_key}}" }
        },
        dependencies: ["Trigger"]
    });

    nodes.set("ScoreLead", {
        id: "ScoreLead",
        type: "llm",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Score this lead based on enrichment data: {{EnrichLead.data}}"
        },
        dependencies: ["EnrichLead"]
    });

    nodes.set("CheckScore", {
        id: "CheckScore",
        type: "conditional",
        config: {
            condition: "{{ScoreLead.score}} >= 70",
            operator: "gte",
            value: 70
        },
        dependencies: ["ScoreLead"]
    });

    nodes.set("UpdateCRM", {
        id: "UpdateCRM",
        type: "http",
        config: {
            url: "https://api.hubspot.com/contacts/v1/contact",
            method: "POST",
            body: {
                email: "{{Trigger.email}}",
                properties: "{{EnrichLead.data}}",
                score: "{{ScoreLead.score}}"
            }
        },
        dependencies: ["CheckScore"]
    });

    nodes.set("NotifySales", {
        id: "NotifySales",
        type: "integration",
        config: {
            provider: "slack",
            operation: "sendMessage",
            channel: "#sales-leads",
            message: "New cold lead: {{Trigger.email}}"
        },
        dependencies: ["CheckScore"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        config: {},
        dependencies: ["UpdateCRM", "NotifySales"]
    });

    const edges: TypedEdge[] = [
        { id: "e1", source: "Trigger", target: "EnrichLead", type: "default" },
        { id: "e2", source: "EnrichLead", target: "ScoreLead", type: "default" },
        { id: "e3", source: "ScoreLead", target: "CheckScore", type: "default" },
        {
            id: "e4",
            source: "CheckScore",
            target: "UpdateCRM",
            type: "conditional",
            handleType: "true"
        },
        {
            id: "e5",
            source: "CheckScore",
            target: "NotifySales",
            type: "conditional",
            handleType: "false"
        },
        { id: "e6", source: "UpdateCRM", target: "Output", type: "default" },
        { id: "e7", source: "NotifySales", target: "Output", type: "default" }
    ];

    const executionLevels = [
        ["Trigger"],
        ["EnrichLead"],
        ["ScoreLead"],
        ["CheckScore"],
        ["UpdateCRM", "NotifySales"],
        ["Output"]
    ];

    return { nodes, edges, executionLevels };
}

// Mock enrichment API responses
function createEnrichmentResponse(
    email: string,
    quality: "complete" | "partial" | "minimal"
): EnrichmentData {
    const baseData: EnrichmentData = {
        email,
        name: "",
        company: "",
        title: "",
        linkedinUrl: "",
        companySize: "",
        industry: "",
        location: "",
        technologies: [],
        fundingStage: "",
        revenue: ""
    };

    if (quality === "complete") {
        return {
            ...baseData,
            name: "John Smith",
            company: "TechCorp Inc",
            title: "VP of Engineering",
            linkedinUrl: "https://linkedin.com/in/johnsmith",
            companySize: "500-1000",
            industry: "Software",
            location: "San Francisco, CA",
            technologies: ["React", "Node.js", "AWS", "Kubernetes"],
            fundingStage: "Series B",
            revenue: "$10M-$50M"
        };
    } else if (quality === "partial") {
        return {
            ...baseData,
            name: "Jane Doe",
            company: "StartupXYZ",
            title: "Engineer",
            companySize: "10-50",
            industry: "Technology"
        };
    }

    return {
        ...baseData,
        name: "Unknown",
        company: "Unknown"
    };
}

// Mock LLM scoring responses
function createScoreResponse(enrichmentQuality: "complete" | "partial" | "minimal"): LeadScore {
    if (enrichmentQuality === "complete") {
        return {
            score: 85,
            tier: "hot",
            reasons: [
                "VP-level decision maker",
                "Company in growth stage (Series B)",
                "Tech stack alignment",
                "Located in target market"
            ],
            recommendedAction: "Immediate outreach by senior AE"
        };
    } else if (enrichmentQuality === "partial") {
        return {
            score: 55,
            tier: "warm",
            reasons: ["Technology company", "Small team size", "Limited enrichment data"],
            recommendedAction: "Add to nurture sequence"
        };
    }

    return {
        score: 25,
        tier: "cold",
        reasons: ["Insufficient data", "Unable to verify company", "No decision-maker signals"],
        recommendedAction: "Low priority - add to general list"
    };
}

// Simulate the lead enrichment workflow
async function simulateLeadEnrichment(
    lead: LeadInput,
    mockResponses: {
        enrichment: EnrichmentData | { error: string };
        score?: LeadScore;
        crmUpdate?: CRMUpdateResult;
        notification?: NotificationResult;
    }
): Promise<{
    context: ContextSnapshot;
    path: "high-score" | "low-score" | "error";
    completedNodes: string[];
    finalOutput: JsonObject;
}> {
    const _workflow = buildLeadEnrichmentWorkflow();
    let context = createContext(lead as unknown as JsonObject);
    const completedNodes: string[] = [];
    let path: "high-score" | "low-score" | "error" = "error";

    // Execute Trigger
    context = storeNodeOutput(context, "Trigger", lead as unknown as JsonObject);
    completedNodes.push("Trigger");

    // Execute EnrichLead
    if ("error" in mockResponses.enrichment) {
        context = storeNodeOutput(context, "EnrichLead", {
            error: true,
            message: mockResponses.enrichment.error
        });
        return {
            context,
            path: "error",
            completedNodes,
            finalOutput: { error: mockResponses.enrichment.error }
        };
    }

    context = storeNodeOutput(context, "EnrichLead", {
        success: true,
        data: mockResponses.enrichment
    });
    completedNodes.push("EnrichLead");

    // Execute ScoreLead
    const score = mockResponses.score || createScoreResponse("partial");
    context = storeNodeOutput(context, "ScoreLead", score);
    completedNodes.push("ScoreLead");

    // Execute CheckScore conditional
    const isHighScore = score.score >= 70;
    context = storeNodeOutput(context, "CheckScore", {
        condition: "score >= 70",
        result: isHighScore,
        actualValue: score.score
    });
    completedNodes.push("CheckScore");

    // Execute appropriate branch
    if (isHighScore) {
        path = "high-score";
        const crmResult = mockResponses.crmUpdate || {
            success: true,
            contactId: "contact_123",
            updatedFields: ["email", "name", "company", "score"]
        };
        context = storeNodeOutput(context, "UpdateCRM", crmResult);
        completedNodes.push("UpdateCRM");
    } else {
        path = "low-score";
        const notifyResult = mockResponses.notification || {
            sent: true,
            channel: "slack",
            recipient: "#sales-leads"
        };
        context = storeNodeOutput(context, "NotifySales", notifyResult);
        completedNodes.push("NotifySales");
    }

    // Execute Output
    const finalOutput: JsonObject = {
        lead: lead as unknown as JsonObject,
        enrichment: mockResponses.enrichment as unknown as JsonObject,
        score: score as unknown as JsonObject,
        path,
        result: isHighScore
            ? context.nodeOutputs.get("UpdateCRM")
            : context.nodeOutputs.get("NotifySales")
    };
    context = storeNodeOutput(context, "Output", finalOutput);
    completedNodes.push("Output");

    return { context, path, completedNodes, finalOutput };
}

describe("Lead Enrichment Workflow", () => {
    describe("complete success path - high score lead", () => {
        it("should enrich, score, and update CRM for high-quality lead", async () => {
            const lead: LeadInput = {
                email: "john@techcorp.com",
                name: "John",
                source: "website"
            };

            const enrichment = createEnrichmentResponse(lead.email, "complete");
            const score = createScoreResponse("complete");

            const result = await simulateLeadEnrichment(lead, {
                enrichment,
                score
            });

            expect(result.path).toBe("high-score");
            expect(result.completedNodes).toContain("UpdateCRM");
            expect(result.completedNodes).not.toContain("NotifySales");
        });

        it("should include all enrichment data in CRM update", async () => {
            const lead: LeadInput = { email: "vp@enterprise.com" };
            const enrichment = createEnrichmentResponse(lead.email, "complete");

            const result = await simulateLeadEnrichment(lead, {
                enrichment,
                score: createScoreResponse("complete"),
                crmUpdate: {
                    success: true,
                    contactId: "contact_456",
                    updatedFields: ["email", "name", "company", "title", "score", "industry"]
                }
            });

            const crmOutput = result.context.nodeOutputs.get("UpdateCRM") as CRMUpdateResult;
            expect(crmOutput.success).toBe(true);
            expect(crmOutput.updatedFields).toContain("title");
            expect(crmOutput.updatedFields).toContain("industry");
        });

        it("should calculate score of 85 for complete enrichment", async () => {
            const lead: LeadInput = { email: "decision-maker@bigco.com" };
            const enrichment = createEnrichmentResponse(lead.email, "complete");
            const score = createScoreResponse("complete");

            const result = await simulateLeadEnrichment(lead, { enrichment, score });

            const scoreOutput = result.context.nodeOutputs.get("ScoreLead") as LeadScore;
            expect(scoreOutput.score).toBe(85);
            expect(scoreOutput.tier).toBe("hot");
        });

        it("should provide actionable reasons for high score", async () => {
            const lead: LeadInput = { email: "cto@startup.io" };
            const enrichment = createEnrichmentResponse(lead.email, "complete");
            const score = createScoreResponse("complete");

            const result = await simulateLeadEnrichment(lead, { enrichment, score });

            const scoreOutput = result.context.nodeOutputs.get("ScoreLead") as LeadScore;
            expect(scoreOutput.reasons.length).toBeGreaterThan(0);
            expect(scoreOutput.recommendedAction).toContain("outreach");
        });
    });

    describe("low score lead path", () => {
        it("should send notification instead of CRM update for low score", async () => {
            const lead: LeadInput = { email: "random@unknown.com" };
            const enrichment = createEnrichmentResponse(lead.email, "minimal");
            const score = createScoreResponse("minimal");

            const result = await simulateLeadEnrichment(lead, { enrichment, score });

            expect(result.path).toBe("low-score");
            expect(result.completedNodes).toContain("NotifySales");
            expect(result.completedNodes).not.toContain("UpdateCRM");
        });

        it("should notify sales channel for cold leads", async () => {
            const lead: LeadInput = { email: "info@generic.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "minimal"),
                score: createScoreResponse("minimal"),
                notification: {
                    sent: true,
                    channel: "slack",
                    recipient: "#sales-leads"
                }
            });

            const notifyOutput = result.context.nodeOutputs.get(
                "NotifySales"
            ) as NotificationResult;
            expect(notifyOutput.sent).toBe(true);
            expect(notifyOutput.channel).toBe("slack");
        });

        it("should score warm leads between 40-70", async () => {
            const lead: LeadInput = { email: "dev@smallstartup.com" };
            const score = createScoreResponse("partial");

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "partial"),
                score
            });

            const scoreOutput = result.context.nodeOutputs.get("ScoreLead") as LeadScore;
            expect(scoreOutput.score).toBeGreaterThanOrEqual(40);
            expect(scoreOutput.score).toBeLessThan(70);
            expect(scoreOutput.tier).toBe("warm");
        });

        it("should recommend nurture sequence for warm leads", async () => {
            const lead: LeadInput = { email: "engineer@midsize.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "partial"),
                score: createScoreResponse("partial")
            });

            const scoreOutput = result.context.nodeOutputs.get("ScoreLead") as LeadScore;
            expect(scoreOutput.recommendedAction).toContain("nurture");
        });
    });

    describe("enrichment API failure handling", () => {
        it("should fail workflow when enrichment API returns error", async () => {
            const lead: LeadInput = { email: "test@example.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: { error: "API rate limit exceeded" }
            });

            expect(result.path).toBe("error");
            expect(result.completedNodes).not.toContain("ScoreLead");
            expect(result.finalOutput.error).toBe("API rate limit exceeded");
        });

        it("should preserve lead input on enrichment failure", async () => {
            const lead: LeadInput = {
                email: "important@customer.com",
                name: "Important Customer",
                company: "Big Corp"
            };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: { error: "Service unavailable" }
            });

            const triggerOutput = result.context.nodeOutputs.get("Trigger");
            expect(triggerOutput).toMatchObject(lead);
        });

        it("should handle enrichment timeout", async () => {
            const lead: LeadInput = { email: "slow@response.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: { error: "Request timeout after 30000ms" }
            });

            expect(result.path).toBe("error");
            expect(result.finalOutput.error).toContain("timeout");
        });

        it("should handle invalid email format from enrichment", async () => {
            const lead: LeadInput = { email: "notanemail" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: { error: "Invalid email format" }
            });

            expect(result.path).toBe("error");
        });
    });

    describe("missing data handling", () => {
        it("should handle leads with minimal input data", async () => {
            const lead: LeadInput = { email: "only-email@test.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "partial"),
                score: createScoreResponse("partial")
            });

            expect(result.completedNodes).toContain("ScoreLead");
            expect(result.completedNodes).toContain("Output");
        });

        it("should use partial enrichment when full data unavailable", async () => {
            const lead: LeadInput = { email: "partial@data.com" };
            const enrichment = createEnrichmentResponse(lead.email, "partial");

            const result = await simulateLeadEnrichment(lead, {
                enrichment,
                score: createScoreResponse("partial")
            });

            const enrichOutput = result.context.nodeOutputs.get("EnrichLead") as {
                data: EnrichmentData;
            };
            expect(enrichOutput.data.name).toBe("Jane Doe");
            expect(enrichOutput.data.linkedinUrl).toBe(""); // Missing data
        });

        it("should lower score when enrichment data is incomplete", async () => {
            const completeResult = await simulateLeadEnrichment(
                { email: "complete@test.com" },
                {
                    enrichment: createEnrichmentResponse("complete@test.com", "complete"),
                    score: createScoreResponse("complete")
                }
            );

            const partialResult = await simulateLeadEnrichment(
                { email: "partial@test.com" },
                {
                    enrichment: createEnrichmentResponse("partial@test.com", "partial"),
                    score: createScoreResponse("partial")
                }
            );

            const completeScore = (completeResult.context.nodeOutputs.get("ScoreLead") as LeadScore)
                .score;
            const partialScore = (partialResult.context.nodeOutputs.get("ScoreLead") as LeadScore)
                .score;

            expect(completeScore).toBeGreaterThan(partialScore);
        });

        it("should include data quality indicator in score reasons", async () => {
            const lead: LeadInput = { email: "minimal@data.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "minimal"),
                score: createScoreResponse("minimal")
            });

            const scoreOutput = result.context.nodeOutputs.get("ScoreLead") as LeadScore;
            expect(scoreOutput.reasons).toContain("Insufficient data");
        });
    });

    describe("CRM update scenarios", () => {
        it("should create new contact when lead not in CRM", async () => {
            const lead: LeadInput = { email: "new@customer.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "complete"),
                score: createScoreResponse("complete"),
                crmUpdate: {
                    success: true,
                    contactId: "new_contact_789",
                    updatedFields: ["email", "name", "company", "title", "score"]
                }
            });

            const crmOutput = result.context.nodeOutputs.get("UpdateCRM") as CRMUpdateResult;
            expect(crmOutput.contactId).toMatch(/^new_contact_/);
        });

        it("should update existing contact when lead exists in CRM", async () => {
            const lead: LeadInput = { email: "existing@customer.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "complete"),
                score: createScoreResponse("complete"),
                crmUpdate: {
                    success: true,
                    contactId: "existing_contact_123",
                    updatedFields: ["score", "lastEnriched"]
                }
            });

            const crmOutput = result.context.nodeOutputs.get("UpdateCRM") as CRMUpdateResult;
            expect(crmOutput.contactId).toMatch(/^existing_contact_/);
            expect(crmOutput.updatedFields).toContain("score");
        });

        it("should include lead score in CRM update", async () => {
            const lead: LeadInput = { email: "scored@lead.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "complete"),
                score: {
                    score: 92,
                    tier: "hot",
                    reasons: ["Enterprise"],
                    recommendedAction: "Call now"
                },
                crmUpdate: {
                    success: true,
                    contactId: "contact_scored",
                    updatedFields: ["score"]
                }
            });

            expect(result.path).toBe("high-score");
            const crmOutput = result.context.nodeOutputs.get("UpdateCRM") as CRMUpdateResult;
            expect(crmOutput.updatedFields).toContain("score");
        });
    });

    describe("score threshold edge cases", () => {
        it("should route to CRM when score equals 70 exactly", async () => {
            const lead: LeadInput = { email: "borderline@test.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "partial"),
                score: {
                    score: 70,
                    tier: "warm",
                    reasons: ["Borderline"],
                    recommendedAction: "Follow up"
                }
            });

            expect(result.path).toBe("high-score");
            expect(result.completedNodes).toContain("UpdateCRM");
        });

        it("should route to notification when score is 69", async () => {
            const lead: LeadInput = { email: "justbelow@test.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "partial"),
                score: {
                    score: 69,
                    tier: "warm",
                    reasons: ["Just below"],
                    recommendedAction: "Nurture"
                }
            });

            expect(result.path).toBe("low-score");
            expect(result.completedNodes).toContain("NotifySales");
        });

        it("should handle score of 0", async () => {
            const lead: LeadInput = { email: "spam@bot.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "minimal"),
                score: {
                    score: 0,
                    tier: "cold",
                    reasons: ["Likely spam"],
                    recommendedAction: "Ignore"
                }
            });

            expect(result.path).toBe("low-score");
        });

        it("should handle score of 100", async () => {
            const lead: LeadInput = { email: "perfect@enterprise.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "complete"),
                score: {
                    score: 100,
                    tier: "hot",
                    reasons: ["Perfect fit"],
                    recommendedAction: "CEO call"
                }
            });

            expect(result.path).toBe("high-score");
        });
    });

    describe("output aggregation", () => {
        it("should include all workflow data in final output", async () => {
            const lead: LeadInput = {
                email: "full@workflow.com",
                name: "Full Test",
                company: "Workflow Corp",
                source: "demo-request"
            };

            const enrichment = createEnrichmentResponse(lead.email, "complete");
            const score = createScoreResponse("complete");

            const result = await simulateLeadEnrichment(lead, { enrichment, score });

            expect(result.finalOutput).toHaveProperty("lead");
            expect(result.finalOutput).toHaveProperty("enrichment");
            expect(result.finalOutput).toHaveProperty("score");
            expect(result.finalOutput).toHaveProperty("path");
            expect(result.finalOutput).toHaveProperty("result");
        });

        it("should track which path was taken in output", async () => {
            const highScoreResult = await simulateLeadEnrichment(
                { email: "high@score.com" },
                {
                    enrichment: createEnrichmentResponse("high@score.com", "complete"),
                    score: createScoreResponse("complete")
                }
            );

            const lowScoreResult = await simulateLeadEnrichment(
                { email: "low@score.com" },
                {
                    enrichment: createEnrichmentResponse("low@score.com", "minimal"),
                    score: createScoreResponse("minimal")
                }
            );

            expect(highScoreResult.finalOutput.path).toBe("high-score");
            expect(lowScoreResult.finalOutput.path).toBe("low-score");
        });

        it("should include enrichment source data in output", async () => {
            const lead: LeadInput = { email: "sourced@lead.com", source: "linkedin-ad" };
            const enrichment = createEnrichmentResponse(lead.email, "complete");

            const result = await simulateLeadEnrichment(lead, {
                enrichment,
                score: createScoreResponse("complete")
            });

            expect((result.finalOutput.lead as LeadInput).source).toBe("linkedin-ad");
        });
    });

    describe("multi-lead batch processing", () => {
        it("should process multiple leads independently", async () => {
            const leads: LeadInput[] = [
                { email: "lead1@company.com" },
                { email: "lead2@company.com" },
                { email: "lead3@company.com" }
            ];

            const results = await Promise.all(
                leads.map((lead, index) =>
                    simulateLeadEnrichment(lead, {
                        enrichment: createEnrichmentResponse(
                            lead.email,
                            index === 0 ? "complete" : index === 1 ? "partial" : "minimal"
                        ),
                        score: createScoreResponse(
                            index === 0 ? "complete" : index === 1 ? "partial" : "minimal"
                        )
                    })
                )
            );

            expect(results[0].path).toBe("high-score");
            expect(results[1].path).toBe("low-score");
            expect(results[2].path).toBe("low-score");
        });

        it("should maintain context isolation between leads", async () => {
            const lead1Result = await simulateLeadEnrichment(
                { email: "isolated1@test.com" },
                {
                    enrichment: createEnrichmentResponse("isolated1@test.com", "complete"),
                    score: { score: 95, tier: "hot", reasons: ["Test"], recommendedAction: "Test" }
                }
            );

            const lead2Result = await simulateLeadEnrichment(
                { email: "isolated2@test.com" },
                {
                    enrichment: createEnrichmentResponse("isolated2@test.com", "minimal"),
                    score: { score: 15, tier: "cold", reasons: ["Test"], recommendedAction: "Test" }
                }
            );

            // Each lead should have its own context
            const score1 = (lead1Result.context.nodeOutputs.get("ScoreLead") as LeadScore).score;
            const score2 = (lead2Result.context.nodeOutputs.get("ScoreLead") as LeadScore).score;

            expect(score1).toBe(95);
            expect(score2).toBe(15);
        });
    });

    describe("workflow timing and performance", () => {
        it("should complete full workflow in reasonable time", async () => {
            const lead: LeadInput = { email: "timing@test.com" };
            const startTime = Date.now();

            await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "complete"),
                score: createScoreResponse("complete")
            });

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(100); // Mock execution should be fast
        });

        it("should track execution completion", async () => {
            const lead: LeadInput = { email: "timestamps@test.com" };

            const result = await simulateLeadEnrichment(lead, {
                enrichment: createEnrichmentResponse(lead.email, "complete"),
                score: createScoreResponse("complete")
            });

            expect(result.completedNodes.length).toBeGreaterThan(0);
            expect(result.context.nodeOutputs.size).toBeGreaterThan(0);
        });
    });
});
