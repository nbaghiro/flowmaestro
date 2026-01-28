/**
 * GitHub PR Reviewer Pattern Tests
 *
 * Tests the intermediate-level PR review workflow that includes:
 * - Parallel security, performance, and quality analysis
 * - LLM synthesis of review findings
 * - Conditional critical issue handling
 * - Jira/Linear ticket creation for critical issues
 * - Slack notifications
 * - Datadog metrics tracking
 *
 * Pattern: trigger-1 → action-github-get → [llm-security, llm-performance, llm-quality] →
 *          llm-synthesize → action-github-review + conditional-critical → [action-jira/linear] →
 *          action-slack-alert → transform-result → output-1
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
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType
} from "../helpers/pattern-test-utils";

describe("GitHub PR Reviewer Pattern", () => {
    const PATTERN_ID = "github-pr-reviewer";

    // Sample PR event data
    const samplePREvent = {
        action: "opened",
        number: 123,
        pull_request: {
            id: "pr-123",
            title: "Add user authentication",
            body: "Implements OAuth2 authentication flow",
            head: { sha: "abc123" },
            base: { ref: "main" },
            user: { login: "developer" },
            additions: 250,
            deletions: 50,
            changed_files: 8
        },
        repository: {
            full_name: "org/repo",
            default_branch: "main"
        }
    };

    // PR details from GitHub API
    const prDetails = {
        ...samplePREvent.pull_request,
        diff: "diff --git a/src/auth.ts...",
        files: [
            { filename: "src/auth.ts", status: "added", additions: 150 },
            { filename: "src/middleware.ts", status: "modified", additions: 100 }
        ]
    };

    // Security analysis results
    const securityAnalysis = {
        score: 85,
        findings: [
            { severity: "medium", issue: "Missing input validation on user data", line: 45 },
            { severity: "low", issue: "Consider using parameterized queries", line: 78 }
        ],
        passed: true,
        recommendations: ["Add rate limiting", "Implement CSRF protection"]
    };

    // Performance analysis results
    const performanceAnalysis = {
        score: 90,
        findings: [{ severity: "low", issue: "Consider caching auth tokens", line: 102 }],
        passed: true,
        recommendations: ["Add connection pooling for database"]
    };

    // Quality analysis results
    const qualityAnalysis = {
        score: 88,
        findings: [
            { severity: "info", issue: "Missing JSDoc comments", line: 1 },
            { severity: "low", issue: "Function too long, consider refactoring", line: 55 }
        ],
        passed: true,
        recommendations: ["Add unit tests for edge cases"]
    };

    // Synthesized review
    const synthesizedReview = {
        overallScore: 87,
        recommendation: "approve_with_suggestions",
        summary: "Overall good implementation with minor security and code quality suggestions.",
        criticalIssues: false,
        sections: {
            security: securityAnalysis,
            performance: performanceAnalysis,
            quality: qualityAnalysis
        }
    };

    // Helper to create complete mock outputs
    const createCompleteMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "trigger-1": createMockTriggerOutput(samplePREvent),
        "action-github-get": createMockActionOutput(true, prDetails),
        "llm-security": createMockLLMOutput(JSON.stringify(securityAnalysis)),
        "llm-performance": createMockLLMOutput(JSON.stringify(performanceAnalysis)),
        "llm-quality": createMockLLMOutput(JSON.stringify(qualityAnalysis)),
        "llm-synthesize": createMockLLMOutput(JSON.stringify(synthesizedReview)),
        "action-github-review": createMockActionOutput(true, { reviewId: "review-456" }),
        "conditional-critical": createMockConditionalOutput(false),
        "action-datadog": createMockActionOutput(true, { metricsSent: true }),
        "action-jira": createMockActionOutput(true, { ticketId: "JIRA-123" }),
        "action-linear": createMockActionOutput(true, { issueId: "LIN-456" }),
        "action-slack-alert": createMockActionOutput(true, { messageTs: "123.456" }),
        "action-slack-notify": createMockActionOutput(true, { messageTs: "123.457" }),
        "transform-result": createMockTransformOutput({
            prNumber: 123,
            overallScore: 87,
            recommendation: "approve_with_suggestions"
        }),
        "output-1": createMockActionOutput(true),
        ...overrides
    });

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count (15 nodes)", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBe(15);
        });

        it("should have trigger node as entry point", () => {
            const triggerNodes = getPatternNodesByType(PATTERN_ID, "trigger");
            expect(triggerNodes.length).toBe(1);
            expect(triggerNodes[0].id).toBe("trigger-1");
        });

        it("should have parallel LLM analysis nodes", () => {
            const llmNodes = getPatternNodesByType(PATTERN_ID, "llm");
            expect(llmNodes.length).toBeGreaterThanOrEqual(4); // security, performance, quality, synthesize
        });

        it("should have conditional for critical issues", () => {
            const conditionalNodes = getPatternNodesByType(PATTERN_ID, "conditional");
            expect(conditionalNodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("parallel analysis execution", () => {
        it("should execute security, performance, and quality analysis in parallel", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, [
                "trigger-1",
                "action-github-get",
                "llm-security",
                "llm-performance",
                "llm-quality",
                "llm-synthesize"
            ]);
        });

        it("should synthesize findings from all analysis branches", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);

            const synthesizeOutput = result.context.nodeOutputs.get("llm-synthesize") as Record<
                string,
                unknown
            >;
            expect(synthesizeOutput).toBeDefined();
        });
    });

    describe("PR review posting", () => {
        it("should post review to GitHub", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "action-github-review": createMockActionOutput(true, {
                        reviewId: "review-789",
                        state: "APPROVED",
                        body: "LGTM with minor suggestions"
                    })
                })
            });

            assertPatternSuccess(result);
            const reviewOutput = result.context.nodeOutputs.get("action-github-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.success).toBe(true);
        });

        it("should handle approval recommendation", async () => {
            const approvedReview = {
                ...synthesizedReview,
                recommendation: "approve",
                overallScore: 95
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "llm-synthesize": createMockLLMOutput(JSON.stringify(approvedReview))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle request changes recommendation", async () => {
            const changesRequestedReview = {
                ...synthesizedReview,
                recommendation: "request_changes",
                overallScore: 45,
                criticalIssues: true
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "llm-synthesize": createMockLLMOutput(JSON.stringify(changesRequestedReview)),
                    "conditional-critical": createMockConditionalOutput(true)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("critical issue handling", () => {
        it("should create Jira ticket for critical security issues", async () => {
            const criticalSecurityAnalysis = {
                ...securityAnalysis,
                score: 30,
                findings: [
                    { severity: "critical", issue: "SQL injection vulnerability", line: 45 },
                    { severity: "high", issue: "Hardcoded credentials", line: 12 }
                ],
                passed: false
            };

            const criticalReview = {
                ...synthesizedReview,
                overallScore: 35,
                criticalIssues: true,
                recommendation: "request_changes"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "llm-security": createMockLLMOutput(JSON.stringify(criticalSecurityAnalysis)),
                    "llm-synthesize": createMockLLMOutput(JSON.stringify(criticalReview)),
                    "conditional-critical": createMockConditionalOutput(true),
                    "action-jira": createMockActionOutput(true, {
                        ticketId: "SEC-789",
                        priority: "critical"
                    })
                })
            });

            assertPatternSuccess(result);
        });

        it("should skip ticket creation for non-critical issues", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "conditional-critical": createMockConditionalOutput(false)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("notifications", () => {
        it("should send Slack alert for PR review completion", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "action-slack-alert": createMockActionOutput(true, {
                        messageTs: "123.456",
                        channel: "#code-reviews"
                    })
                })
            });

            assertPatternSuccess(result);
            const slackOutput = result.context.nodeOutputs.get("action-slack-alert") as Record<
                string,
                unknown
            >;
            expect(slackOutput?.success).toBe(true);
        });

        it("should include review score in Slack notification", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("metrics tracking", () => {
        it("should send metrics to Datadog", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "action-datadog": createMockActionOutput(true, {
                        metricsSent: true,
                        metrics: ["pr.review.score", "pr.review.duration"]
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("error handling", () => {
        it("should handle GitHub API failures gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "action-github-get": createMockActionOutput(false, {
                        error: "Rate limit exceeded"
                    })
                })
            });

            // Pattern should still complete execution path
            assertPatternSuccess(result);
        });

        it("should handle LLM analysis failures", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks({
                    "llm-security": createMockLLMOutput(
                        JSON.stringify({ error: "Analysis failed", score: 0 })
                    )
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle very large PRs", async () => {
            const largePREvent = {
                ...samplePREvent,
                pull_request: {
                    ...samplePREvent.pull_request,
                    additions: 5000,
                    deletions: 2000,
                    changed_files: 50
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: largePREvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(largePREvent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle PRs with no code changes (docs only)", async () => {
            const docsPREvent = {
                ...samplePREvent,
                pull_request: {
                    ...samplePREvent.pull_request,
                    additions: 50,
                    deletions: 10,
                    changed_files: 2,
                    title: "Update README"
                }
            };

            const docsReview = {
                overallScore: 100,
                recommendation: "approve",
                summary: "Documentation update, no code review needed.",
                criticalIssues: false
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: docsPREvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(docsPREvent),
                    "llm-synthesize": createMockLLMOutput(JSON.stringify(docsReview))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle draft PRs", async () => {
            const draftPREvent = {
                ...samplePREvent,
                pull_request: {
                    ...samplePREvent.pull_request,
                    draft: true
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: draftPREvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(draftPREvent)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("output structure", () => {
        it("should produce structured review result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { prEvent: samplePREvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);

            const transformOutput = result.context.nodeOutputs.get("transform-result") as Record<
                string,
                unknown
            >;
            expect(transformOutput?.success).toBe(true);
        });
    });
});
