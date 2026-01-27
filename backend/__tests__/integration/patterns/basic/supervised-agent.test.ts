/**
 * Supervised Agent Pattern Tests
 *
 * Tests human-in-the-loop workflow with approval step.
 * Pattern: input-1 → llm-propose → human-review → llm-execute → output-1
 */

import {
    simulatePatternExecution,
    loadPattern,
    validatePatternStructure,
    createMockLLMOutput,
    createHumanReviewOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodesByType
} from "../helpers/pattern-test-utils";

describe("Supervised Agent Pattern", () => {
    const PATTERN_ID = "supervised-agent";

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count", () => {
            const pattern = loadPattern(PATTERN_ID);
            const nodeCount = Object.keys(pattern.definition.nodes).length;
            expect(nodeCount).toBeGreaterThanOrEqual(5);
        });

        it("should have human review node", () => {
            const humanReviewNodes = getPatternNodesByType(PATTERN_ID, "humanReview");
            expect(humanReviewNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have LLM nodes for propose and execute", () => {
            const pattern = loadPattern(PATTERN_ID);
            const llmNodes = Object.values(pattern.definition.nodes).filter(
                (n) => n.type === "llm"
            );
            expect(llmNodes.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("approved workflow", () => {
        it("should execute action when human approves", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Send email to all team members about meeting" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({
                            action: "send_email",
                            recipients: ["team@company.com"],
                            subject: "Team Meeting Tomorrow",
                            body: "Please join us for the weekly team meeting at 2 PM."
                        })
                    ),
                    "human-review": createHumanReviewOutput(true, "Email looks good, proceed"),
                    "llm-execute": createMockLLMOutput(
                        JSON.stringify({
                            status: "completed",
                            result: "Email sent to team@company.com"
                        })
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["human-review", "llm-execute"]);
            const reviewOutput = result.context.nodeOutputs.get("human-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.approved).toBe(true);
        });

        it("should pass proposal to human reviewer", async () => {
            const proposedAction = {
                action: "delete_files",
                files: ["/tmp/old_backup.zip"],
                reason: "Cleanup old backups"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Clean up old backup files" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(JSON.stringify(proposedAction)),
                    "human-review": createHumanReviewOutput(true),
                    "llm-execute": createMockLLMOutput(
                        JSON.stringify({ status: "completed", filesDeleted: 1 })
                    )
                }
            });

            assertPatternSuccess(result);
            const proposeOutput = result.context.nodeOutputs.get("llm-propose") as Record<
                string,
                unknown
            >;
            const proposal = JSON.parse(proposeOutput?.text as string);
            expect(proposal.action).toBe("delete_files");
        });

        it("should include reviewer feedback in context", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Update database schema" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "alter_table", changes: ["add column"] })
                    ),
                    "human-review": createHumanReviewOutput(
                        true,
                        "Approved. Make sure to backup first."
                    ),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "completed" }))
                }
            });

            assertPatternSuccess(result);
            const reviewOutput = result.context.nodeOutputs.get("human-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.feedback).toContain("backup");
        });
    });

    describe("rejected workflow", () => {
        it("should record rejection when human rejects", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Delete all user data" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({
                            action: "delete_all",
                            target: "users",
                            warning: "This action is destructive"
                        })
                    ),
                    "human-review": createHumanReviewOutput(
                        false,
                        "This action is too dangerous. Please limit the scope."
                    ),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "skipped" }))
                }
            });

            assertPatternSuccess(result);
            const reviewOutput = result.context.nodeOutputs.get("human-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.approved).toBe(false);
        });

        it("should include rejection reason", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Send mass email" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "mass_email", recipients: 10000 })
                    ),
                    "human-review": createHumanReviewOutput(
                        false,
                        "Too many recipients. Please segment the list and send in batches."
                    ),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "skipped" }))
                }
            });

            assertPatternSuccess(result);
            const reviewOutput = result.context.nodeOutputs.get("human-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.feedback).toContain("segment");
            expect(reviewOutput?.approved).toBe(false);
        });
    });

    describe("proposal generation", () => {
        it("should generate detailed action proposal", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Create new user account for John Doe" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({
                            action: "create_user",
                            details: {
                                name: "John Doe",
                                email: "john.doe@company.com",
                                role: "employee",
                                department: "Engineering"
                            },
                            permissions: ["read", "write"],
                            sendWelcomeEmail: true
                        })
                    ),
                    "human-review": createHumanReviewOutput(true),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ userId: "user-123" }))
                }
            });

            assertPatternSuccess(result);
            const proposeOutput = result.context.nodeOutputs.get("llm-propose") as Record<
                string,
                unknown
            >;
            const proposal = JSON.parse(proposeOutput?.text as string);
            expect(proposal.action).toBe("create_user");
            expect(proposal.details.name).toBe("John Doe");
            expect(proposal.permissions).toContain("read");
        });

        it("should include safety considerations in proposal", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Restart production server" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({
                            action: "restart_server",
                            target: "prod-server-01",
                            risks: [
                                "Service interruption for ~30 seconds",
                                "Active sessions will be terminated"
                            ],
                            mitigations: [
                                "Schedule during low traffic period",
                                "Notify users in advance"
                            ],
                            recommendation: "Proceed with caution"
                        })
                    ),
                    "human-review": createHumanReviewOutput(
                        true,
                        "Proceed during maintenance window"
                    ),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "restarted" }))
                }
            });

            assertPatternSuccess(result);
            const proposeOutput = result.context.nodeOutputs.get("llm-propose") as Record<
                string,
                unknown
            >;
            const proposal = JSON.parse(proposeOutput?.text as string);
            expect(proposal.risks).toHaveLength(2);
            expect(proposal.mitigations).toBeDefined();
        });
    });

    describe("execution phase", () => {
        it("should execute approved action with context", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Archive old records" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "archive", recordCount: 1500 })
                    ),
                    "human-review": createHumanReviewOutput(true),
                    "llm-execute": createMockLLMOutput(
                        JSON.stringify({
                            status: "completed",
                            recordsArchived: 1500,
                            archiveLocation: "/archives/2024/records.zip"
                        })
                    )
                }
            });

            assertPatternSuccess(result);
            const executeOutput = result.context.nodeOutputs.get("llm-execute") as Record<
                string,
                unknown
            >;
            const execution = JSON.parse(executeOutput?.text as string);
            expect(execution.status).toBe("completed");
            expect(execution.recordsArchived).toBe(1500);
        });

        it("should handle execution with modifications", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Update configuration" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "update_config", setting: "timeout", value: 60 })
                    ),
                    "human-review": {
                        approved: true,
                        feedback: "Approved with modification: use value 120 instead",
                        modifications: { value: 120 },
                        reviewedAt: new Date().toISOString(),
                        reviewerId: "test-reviewer"
                    },
                    "llm-execute": createMockLLMOutput(
                        JSON.stringify({
                            status: "completed",
                            appliedValue: 120
                        })
                    )
                }
            });

            assertPatternSuccess(result);
            const reviewOutput = result.context.nodeOutputs.get("human-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.modifications).toBeDefined();
        });
    });

    describe("audit trail", () => {
        it("should track review metadata", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Sensitive operation" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(JSON.stringify({ action: "sensitive_op" })),
                    "human-review": {
                        approved: true,
                        feedback: "Approved",
                        reviewerId: "admin-001",
                        reviewedAt: "2024-01-15T10:30:00Z",
                        reviewDurationMs: 45000
                    },
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "completed" }))
                }
            });

            assertPatternSuccess(result);
            const reviewOutput = result.context.nodeOutputs.get("human-review") as Record<
                string,
                unknown
            >;
            expect(reviewOutput?.reviewerId).toBe("admin-001");
            expect(reviewOutput?.reviewedAt).toBeDefined();
        });
    });

    describe("edge cases", () => {
        it("should handle empty task", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "clarify", message: "Please provide a task" })
                    ),
                    "human-review": createHumanReviewOutput(false, "No task provided"),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "skipped" }))
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle very long task descriptions", async () => {
            const longTask = "Please perform the following task: ".repeat(50);

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: longTask },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "process", summary: "Long task processed" })
                    ),
                    "human-review": createHumanReviewOutput(true),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "completed" }))
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle special characters in task", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Update user's data: <script>alert('xss')</script>" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(
                        JSON.stringify({ action: "update", sanitized: true })
                    ),
                    "human-review": createHumanReviewOutput(true),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "completed" }))
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("token tracking", () => {
        it("should track tokens for both LLM nodes", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { task: "Token tracking test" },
                mockOutputs: {
                    "llm-propose": createMockLLMOutput(JSON.stringify({ action: "test" }), {
                        tokens: { prompt: 100, completion: 50 }
                    }),
                    "human-review": createHumanReviewOutput(true),
                    "llm-execute": createMockLLMOutput(JSON.stringify({ status: "done" }), {
                        tokens: { prompt: 150, completion: 25 }
                    })
                }
            });

            assertPatternSuccess(result);

            const proposeOutput = result.context.nodeOutputs.get("llm-propose") as Record<
                string,
                unknown
            >;
            const executeOutput = result.context.nodeOutputs.get("llm-execute") as Record<
                string,
                unknown
            >;

            expect(proposeOutput?.tokens).toEqual({ prompt: 100, completion: 50 });
            expect(executeOutput?.tokens).toEqual({ prompt: 150, completion: 25 });
        });
    });
});
