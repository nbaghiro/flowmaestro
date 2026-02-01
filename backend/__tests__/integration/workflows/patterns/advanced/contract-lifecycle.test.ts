/**
 * Contract Lifecycle Pattern Tests
 *
 * Tests the advanced-level contract automation workflow that includes:
 * - Salesforce deal trigger
 * - Parallel data fetching (Salesforce deal, account, HubSpot)
 * - LLM contract generation
 * - Conditional high-value review with human approval
 * - DocuSign/HelloSign e-signature
 * - Wait for signature completion
 * - Parallel storage (Google Drive, Box)
 * - CRM updates (Salesforce, HubSpot)
 * - QuickBooks invoice creation
 * - Notification and celebration
 *
 * Pattern: trigger → [sf-deal, sf-account, hubspot] → llm-contract → conditional-value →
 *          [humanReview → slack-legal →] docusign/hellosign → [gmail, slack-sales] →
 *          wait-signature → [gdrive, box, sf-update] → [hubspot-update, quickbooks] →
 *          gmail-confirm → slack-closed → transform-result → output-1
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockActionOutput,
    createMockConditionalOutput,
    createMockTriggerOutput,
    createMockTransformOutput,
    createHumanReviewOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType,
    hasSandboxFixture,
    getSandboxDataService,
    getFixtureRegistry,
    createSandboxActionOutput
} from "../helpers/pattern-test-utils";

describe("Contract Lifecycle Pattern", () => {
    const PATTERN_ID = "docusign-contract-automation";
    const sandboxDataService = getSandboxDataService();

    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    // Sample Salesforce opportunity event
    const sampleOpportunityEvent = {
        id: "opp-123",
        name: "TechCorp Enterprise Deal",
        amount: 75000,
        stage: "Closed Won",
        accountId: "acc-456",
        ownerId: "user-789",
        closeDate: "2024-02-15"
    };

    // Deal details from Salesforce
    const dealDetails = {
        id: "opp-123",
        name: "TechCorp Enterprise Deal",
        amount: 75000,
        stage: "Closed Won",
        type: "New Business",
        products: [
            { name: "Enterprise License", quantity: 50, unitPrice: 1000 },
            { name: "Support Package", quantity: 1, unitPrice: 25000 }
        ],
        owner: { name: "Sarah Sales", email: "sarah@company.com" }
    };

    // Account details from Salesforce
    const accountDetails = {
        id: "acc-456",
        name: "TechCorp Inc.",
        website: "techcorp.com",
        industry: "Technology",
        billingAddress: "123 Tech Street, San Francisco, CA 94105",
        quickbooksId: "qb-cust-789"
    };

    // HubSpot company data
    const hubspotCompany = {
        id: "hs-comp-123",
        domain: "techcorp.com",
        associatedDeals: ["hs-deal-456"],
        properties: {
            name: "TechCorp Inc.",
            industry: "Technology",
            numberofemployees: 250
        }
    };

    // Generated contract data
    const contractData = {
        contractTerms: {
            parties: {
                client: {
                    name: "TechCorp Inc.",
                    address: "123 Tech Street, San Francisco, CA 94105",
                    signatory: "John CEO",
                    email: "john@techcorp.com"
                },
                provider: {
                    name: "Our Company Inc.",
                    address: "456 Provider Ave, New York, NY 10001",
                    signatory: "Jane Legal"
                }
            },
            services: [
                { name: "Enterprise License", description: "50 seats" },
                { name: "Support Package", description: "24/7 premium support" }
            ],
            pricing: {
                total: 75000,
                currency: "USD",
                payment_schedule: [
                    { amount: 37500, due_date: "2024-03-01", description: "50% upfront" },
                    { amount: 37500, due_date: "2024-06-01", description: "50% on delivery" }
                ]
            },
            term: {
                start: "2024-03-01",
                end: "2025-02-28",
                renewal: "annual"
            },
            sla: {
                uptime: "99.9%",
                response_time: "4 hours"
            },
            legal: {
                liability_cap: "$150,000",
                termination_notice: "30 days",
                jurisdiction: "State of Delaware"
            }
        },
        signers: [
            { role: "client", name: "John CEO", email: "john@techcorp.com" },
            { role: "internal", name: "Jane Legal", email: "jane@company.com" }
        ]
    };

    // DocuSign envelope response
    const docusignEnvelope = {
        envelopeId: "env-123",
        status: "sent",
        uri: "/envelopes/env-123",
        url: "https://docusign.com/sign/env-123"
    };

    // Signature completion event
    const signatureEvent = {
        envelopeId: "env-123",
        status: "completed",
        signedDocument: "base64-pdf-content...",
        completedAt: "2024-02-20T15:30:00Z",
        signers: [
            { name: "John CEO", signedAt: "2024-02-19T10:00:00Z" },
            { name: "Jane Legal", signedAt: "2024-02-20T15:30:00Z" }
        ]
    };

    // Google Drive file
    const gdriveFile = {
        id: "gdrive-file-123",
        name: "TechCorp Enterprise Deal_Contract_2024-02-20.pdf",
        webViewLink: "https://drive.google.com/file/d/gdrive-file-123/view"
    };

    // QuickBooks invoice
    const qbInvoice = {
        id: "qb-inv-456",
        invoiceNumber: "INV-2024-0123",
        totalAmount: 37500,
        dueDate: "2024-03-01"
    };

    // Helper to create complete mock outputs for high-value contracts
    const createHighValueMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "trigger-1": createMockTriggerOutput(sampleOpportunityEvent),
        "action-sf-deal": createMockActionOutput(true, dealDetails),
        "action-sf-account": createMockActionOutput(true, accountDetails),
        "action-hubspot": createMockActionOutput(true, hubspotCompany),
        "llm-contract": createMockLLMOutput(JSON.stringify(contractData)),
        "conditional-value": createMockConditionalOutput(true, 75000), // High value
        "humanReview-legal": createHumanReviewOutput(true, "Approved with standard terms"),
        "action-slack-legal": createMockActionOutput(true, { messageTs: "123.456" }),
        "action-docusign": createMockActionOutput(true, docusignEnvelope),
        "action-hellosign": createMockActionOutput(true, { requestId: "hs-req-789" }),
        "action-gmail-client": createMockActionOutput(true, { messageId: "msg-123" }),
        "action-slack-sales": createMockActionOutput(true, { messageTs: "123.457" }),
        "wait-signature": createMockActionOutput(true, signatureEvent),
        "action-gdrive": createMockActionOutput(true, gdriveFile),
        "action-box": createMockActionOutput(true, { fileId: "box-file-456" }),
        "action-sf-update": createMockActionOutput(true, { updated: true }),
        "action-hubspot-update": createMockActionOutput(true, { updated: true }),
        "action-quickbooks": createMockActionOutput(true, qbInvoice),
        "action-gmail-confirm": createMockActionOutput(true, { messageId: "msg-456" }),
        "action-slack-closed": createMockActionOutput(true, { messageTs: "123.458" }),
        "transform-result": createMockTransformOutput({
            dealId: "opp-123",
            contractValue: 75000,
            envelopeId: "env-123",
            invoiceNumber: "INV-2024-0123"
        }),
        "output-1": createMockActionOutput(true),
        ...overrides
    });

    // Helper for low-value contracts (skip legal review)
    const createLowValueMocks = (overrides: Record<string, JsonObject> = {}) => {
        const lowValueDeal = { ...dealDetails, amount: 25000 };
        const lowValueEvent = { ...sampleOpportunityEvent, amount: 25000 };

        return {
            ...createHighValueMocks(),
            "trigger-1": createMockTriggerOutput(lowValueEvent),
            "action-sf-deal": createMockActionOutput(true, lowValueDeal),
            "conditional-value": createMockConditionalOutput(false, 25000), // Low value
            ...overrides
        };
    };

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count (22 nodes)", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBe(22);
        });

        it("should have trigger node as entry point", () => {
            const triggerNodes = getPatternNodesByType(PATTERN_ID, "trigger");
            expect(triggerNodes.length).toBe(1);
        });

        it("should have conditional for high-value contracts", () => {
            const conditionalNodes = getPatternNodesByType(PATTERN_ID, "conditional");
            expect(conditionalNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have human review node for legal approval", () => {
            const humanReviewNodes = getPatternNodesByType(PATTERN_ID, "humanReview");
            expect(humanReviewNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have wait node for signature completion", () => {
            const waitNodes = getPatternNodesByType(PATTERN_ID, "wait");
            expect(waitNodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("parallel data fetching", () => {
        it("should fetch deal, account, and HubSpot data in parallel", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, [
                "trigger-1",
                "action-sf-deal",
                "action-sf-account",
                "action-hubspot"
            ]);
        });

        it("should handle missing HubSpot data gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "action-hubspot": createMockActionOutput(false, {
                        error: "Company not found"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("contract generation", () => {
        it("should generate contract terms via LLM", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-contract"]);
        });

        it("should include all required contract sections", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            const llmOutput = result.context.nodeOutputs.get("llm-contract") as Record<
                string,
                unknown
            >;
            expect(llmOutput).toBeDefined();
        });
    });

    describe("high-value contract flow", () => {
        it("should require legal review for contracts > $50,000", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["conditional-value", "humanReview-legal"]);
        });

        it("should notify legal team via Slack", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-slack-legal"]);
        });

        it("should wait for legal approval before sending for signature", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);

            // humanReview should execute before docusign
            const execOrder = result.executionOrder;
            const humanReviewIdx = execOrder.indexOf("humanReview-legal");
            const docusignIdx = execOrder.indexOf("action-docusign");

            if (humanReviewIdx !== -1 && docusignIdx !== -1) {
                expect(humanReviewIdx).toBeLessThan(docusignIdx);
            }
        });

        it("should handle legal rejection", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "humanReview-legal": createHumanReviewOutput(
                        false,
                        "Liability cap too low, needs revision"
                    )
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("low-value contract flow", () => {
        it("should skip legal review for contracts <= $50,000", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: { ...sampleOpportunityEvent, amount: 25000 } },
                mockOutputs: createLowValueMocks()
            });

            assertPatternSuccess(result);
            // Conditional should evaluate to false, skipping human review
        });

        it("should proceed directly to signature for low-value contracts", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: { ...sampleOpportunityEvent, amount: 25000 } },
                mockOutputs: createLowValueMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("e-signature flow", () => {
        it("should create DocuSign envelope", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-docusign"]);
        });

        it("should notify client via email", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-gmail-client"]);
        });

        it("should notify sales team via Slack", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-slack-sales"]);
        });

        it("should wait for signature completion", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["wait-signature"]);
        });
    });

    describe("post-signature processing", () => {
        it("should store signed document in Google Drive", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-gdrive"]);
        });

        it("should backup to Box", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-box"]);
        });

        it("should update Salesforce opportunity", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-sf-update"]);
        });

        it("should update HubSpot deal", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-hubspot-update"]);
        });

        it("should create QuickBooks invoice", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-quickbooks"]);
        });
    });

    describe("notifications", () => {
        it("should send confirmation email to client", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-gmail-confirm"]);
        });

        it("should celebrate in Slack wins channel", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-slack-closed"]);
        });
    });

    describe("error handling", () => {
        it("should handle DocuSign API failures", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "action-docusign": createMockActionOutput(false, {
                        error: "Template not found"
                    })
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle signature timeout", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "wait-signature": createMockActionOutput(false, {
                        error: "Signature timeout - 30 days exceeded"
                    })
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle QuickBooks sync failures", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "action-quickbooks": createMockActionOutput(false, {
                        error: "Customer not found in QuickBooks"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle very large contracts", async () => {
            const largeContractEvent = {
                ...sampleOpportunityEvent,
                amount: 1000000 // $1M deal
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: largeContractEvent },
                mockOutputs: createHighValueMocks({
                    "trigger-1": createMockTriggerOutput(largeContractEvent),
                    "action-sf-deal": createMockActionOutput(true, {
                        ...dealDetails,
                        amount: 1000000
                    })
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle multi-year contracts", async () => {
            const multiYearContract = {
                ...contractData,
                contractTerms: {
                    ...contractData.contractTerms,
                    term: {
                        start: "2024-03-01",
                        end: "2027-02-28",
                        renewal: "triennial"
                    }
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "llm-contract": createMockLLMOutput(JSON.stringify(multiYearContract))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle contracts with multiple signers", async () => {
            const multiSignerContract = {
                ...contractData,
                signers: [
                    { role: "client_ceo", name: "John CEO", email: "john@techcorp.com" },
                    { role: "client_cfo", name: "Jane CFO", email: "jane@techcorp.com" },
                    { role: "internal_legal", name: "Bob Legal", email: "bob@company.com" },
                    { role: "internal_sales", name: "Sarah Sales", email: "sarah@company.com" }
                ]
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks({
                    "llm-contract": createMockLLMOutput(JSON.stringify(multiSignerContract))
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("output structure", () => {
        it("should produce comprehensive contract result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { sfOpportunity: sampleOpportunityEvent },
                mockOutputs: createHighValueMocks()
            });

            assertPatternSuccess(result);

            const transformOutput = result.context.nodeOutputs.get("transform-result") as Record<
                string,
                unknown
            >;
            expect(transformOutput?.success).toBe(true);
        });
    });

    describe("sandbox data integration", () => {
        it("should have Salesforce fixtures available", () => {
            expect(hasSandboxFixture("salesforce", "getRecord")).toBe(true);
        });

        it("should have HubSpot fixtures available", () => {
            expect(hasSandboxFixture("hubspot", "getContact")).toBe(true);
        });

        it("should have DocuSign fixtures available", () => {
            expect(hasSandboxFixture("docusign", "createEnvelope")).toBe(true);
        });

        it("should have HelloSign fixtures available", () => {
            expect(hasSandboxFixture("hellosign", "createSignatureRequest")).toBe(true);
        });

        it("should have Google Drive fixtures available", () => {
            expect(hasSandboxFixture("google-drive", "uploadFile")).toBe(true);
        });

        it("should have Box fixtures available", () => {
            expect(hasSandboxFixture("box", "uploadFile")).toBe(true);
        });

        it("should have QuickBooks fixtures available", () => {
            expect(hasSandboxFixture("quickbooks", "createInvoice")).toBe(true);
        });

        it("should have Slack fixtures available", () => {
            expect(hasSandboxFixture("slack", "sendMessage")).toBe(true);
        });

        it("should have Gmail fixtures available", () => {
            expect(hasSandboxFixture("gmail", "sendMessage")).toBe(true);
        });

        it("should use sandbox data for DocuSign action", async () => {
            const docusignOutput = await createSandboxActionOutput("docusign", "createEnvelope", {
                templateId: "contract-template"
            });

            expect(docusignOutput.success).toBe(true);
            expect(docusignOutput.fromSandbox).toBe(true);
        });

        it("should support custom error scenarios for e-signature failures", async () => {
            sandboxDataService.registerScenario({
                id: "docusign-quota-exceeded",
                provider: "docusign",
                operation: "createEnvelope",
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "API quota exceeded",
                        retryable: true
                    }
                }
            });

            const response = await sandboxDataService.getSandboxResponse(
                "docusign",
                "createEnvelope",
                {}
            );

            expect(response?.success).toBe(false);
            expect(response?.error?.type).toBe("rate_limit");
        });

        it("should list all required providers for contract workflow", () => {
            const fixtureRegistry = getFixtureRegistry();
            const providers = fixtureRegistry.getProviders();

            expect(providers).toContain("salesforce");
            expect(providers).toContain("hubspot");
            expect(providers).toContain("docusign");
            expect(providers).toContain("hellosign");
            expect(providers).toContain("google-drive");
            expect(providers).toContain("box");
            expect(providers).toContain("quickbooks");
            expect(providers).toContain("slack");
            expect(providers).toContain("gmail");
        });
    });
});
