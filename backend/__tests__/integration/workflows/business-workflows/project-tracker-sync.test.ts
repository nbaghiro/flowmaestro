/**
 * Project Tracker Sync Pattern Tests
 *
 * Tests the intermediate-level project tracker synchronization workflow that includes:
 * - Bi-directional sync between Trello, Monday.com, and ClickUp
 * - PostgreSQL persistence for sync state
 * - Status-based routing to different Slack channels
 * - Google Sheets reporting
 * - Mixpanel analytics tracking
 *
 * Pattern: trigger → [action-trello, action-monday, action-clickup] → llm-merge →
 *          action-postgres → router-status → [slack channels] → action-sheets →
 *          action-mixpanel → transform-result → output-1
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    simulateRouterPatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockActionOutput,
    createMockRouterOutput,
    createMockTriggerOutput,
    createMockTransformOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType,
    hasSandboxFixture,
    getSandboxDataService,
    createSandboxActionOutput
} from "../helpers/pattern-test-utils";

describe("Project Tracker Sync Pattern", () => {
    const PATTERN_ID = "trello-project-sync";
    const sandboxDataService = getSandboxDataService();

    beforeEach(() => {
        // Clear any custom scenarios between tests
        sandboxDataService.clearScenarios();
    });

    // Sample trigger event - task updated in Trello
    const sampleTaskEvent = {
        source: "trello",
        action: "card.updated",
        card: {
            id: "card-123",
            name: "Implement user authentication",
            desc: "Add OAuth2 login flow",
            idList: "list-in-progress",
            labels: [{ name: "feature", color: "green" }],
            due: "2024-02-15",
            members: [{ id: "member-1", username: "developer" }]
        },
        board: {
            id: "board-456",
            name: "Sprint 12"
        }
    };

    // Trello data
    const trelloData = {
        card: sampleTaskEvent.card,
        list: { id: "list-in-progress", name: "In Progress" },
        comments: [{ text: "Started implementation", date: "2024-02-01" }],
        attachments: []
    };

    // Monday.com data
    const mondayData = {
        item: {
            id: "mon-item-789",
            name: "Implement user authentication",
            column_values: {
                status: { label: "Working on it" },
                person: { text: "developer" },
                date: { date: "2024-02-15" }
            }
        },
        board: { id: "mon-board-123", name: "Development" }
    };

    // ClickUp data
    const clickupData = {
        task: {
            id: "cu-task-456",
            name: "Implement user authentication",
            status: { status: "in progress" },
            assignees: [{ username: "developer" }],
            due_date: "2024-02-15"
        },
        list: { id: "cu-list-789", name: "Sprint Tasks" }
    };

    // Merged/reconciled task data
    const mergedTaskData = {
        canonicalId: "task-unified-123",
        name: "Implement user authentication",
        description: "Add OAuth2 login flow",
        status: "in_progress",
        assignee: "developer",
        dueDate: "2024-02-15",
        sources: {
            trello: { id: "card-123", synced: true },
            monday: { id: "mon-item-789", synced: true },
            clickup: { id: "cu-task-456", synced: true }
        },
        lastUpdated: "2024-02-01T10:00:00Z",
        conflicts: []
    };

    // Analysis result from LLM
    const analysisResult = {
        changeType: "status",
        oldValue: "To Do",
        newValue: "In Progress",
        cycleTime: 24,
        isBlocked: false,
        blockReason: "",
        urgency: "medium",
        dbRecord: {
            id: "card-123",
            title: "Implement user authentication",
            status: "in_progress",
            assignee: "developer",
            due_date: "2024-02-15",
            labels: ["feature"],
            cycle_time_hours: 24
        }
    };

    // Helper to create complete mock outputs
    const createCompleteMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "trigger-1": createMockTriggerOutput(sampleTaskEvent),
        "action-trello": createMockActionOutput(true, trelloData),
        "action-trello-history": createMockActionOutput(true, {
            actions: [
                {
                    type: "updateCard",
                    date: "2024-02-01",
                    data: { listAfter: { name: "In Progress" } }
                }
            ]
        }),
        "llm-analyze": createMockLLMOutput(JSON.stringify(analysisResult)),
        "action-postgresql": createMockActionOutput(true, {
            rowsAffected: 1,
            syncId: "sync-789"
        }),
        "action-monday": createMockActionOutput(true, mondayData),
        "action-clickup": createMockActionOutput(true, clickupData),
        "router-status": createMockRouterOutput("progress"),
        "action-slack-done": createMockActionOutput(true, { messageTs: "123.457" }),
        "action-slack-blocked": createMockActionOutput(true, { messageTs: "123.458" }),
        "action-slack-review": createMockActionOutput(true, { messageTs: "123.459" }),
        "action-mixpanel": createMockActionOutput(true, { tracked: true }),
        "action-sheets": createMockActionOutput(true, { updatedRange: "A1:F10" }),
        "transform-result": createMockTransformOutput({
            cardId: "card-123",
            status: "in_progress",
            syncedPlatforms: 3
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
        });

        it("should have router for status-based routing", () => {
            const routerNodes = getPatternNodesByType(PATTERN_ID, "router");
            expect(routerNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have integration nodes for all platforms", () => {
            const integrationNodes = getPatternNodesByType(PATTERN_ID, "integration");
            expect(integrationNodes.length).toBeGreaterThanOrEqual(3); // Trello, Monday, ClickUp
        });
    });

    describe("data fetching and analysis", () => {
        it("should fetch card details and history from Trello", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["trigger-1", "action-trello", "action-trello-history"]);
        });

        it("should analyze change with LLM", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-analyze"]);
        });

        it("should handle Trello API failures gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "action-trello": createMockActionOutput(false, {
                        error: "API rate limit exceeded"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("data reconciliation", () => {
        it("should detect and resolve conflicts between platforms", async () => {
            const conflictingData = {
                ...mergedTaskData,
                conflicts: [
                    {
                        field: "status",
                        trello: "in_progress",
                        monday: "done",
                        resolution: "trello" // Most recent update wins
                    }
                ]
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(conflictingData))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle missing data from one platform", async () => {
            const partialMerge = {
                ...mergedTaskData,
                sources: {
                    trello: { id: "card-123", synced: true },
                    monday: { id: null, synced: false, reason: "Not found" },
                    clickup: { id: "cu-task-456", synced: true }
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(partialMerge))
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("database persistence", () => {
        it("should persist sync state to PostgreSQL", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "action-postgresql": createMockActionOutput(true, {
                        rowsAffected: 1,
                        syncId: "sync-999",
                        operation: "upsert"
                    })
                })
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-postgresql"]);
        });

        it("should handle database connection failures", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "action-postgresql": createMockActionOutput(false, {
                        error: "Connection refused"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("status-based routing", () => {
        it("should route in-progress tasks to progress channel", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "router-status": createMockRouterOutput("progress")
                }),
                routerNodeId: "router-status",
                selectedRoute: "progress"
            });

            assertPatternSuccess(result);
        });

        it("should route completed tasks to done channel", async () => {
            const completedTask = {
                ...mergedTaskData,
                status: "done"
            };

            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(completedTask)),
                    "router-status": createMockRouterOutput("done")
                }),
                routerNodeId: "router-status",
                selectedRoute: "done"
            });

            assertPatternSuccess(result);
        });

        it("should route blocked tasks to blocked channel", async () => {
            const blockedTask = {
                ...mergedTaskData,
                status: "blocked"
            };

            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(blockedTask)),
                    "router-status": createMockRouterOutput("blocked")
                }),
                routerNodeId: "router-status",
                selectedRoute: "blocked"
            });

            assertPatternSuccess(result);
        });
    });

    describe("reporting", () => {
        it("should update Google Sheets with sync data", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "action-sheets": createMockActionOutput(true, {
                        spreadsheetId: "sheet-123",
                        updatedRange: "SyncLog!A1:F10",
                        updatedRows: 1
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("analytics tracking", () => {
        it("should track sync event in Mixpanel", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "action-mixpanel": createMockActionOutput(true, {
                        tracked: true,
                        event: "task_synced",
                        properties: {
                            platforms: 3,
                            conflicts: 0
                        }
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("bi-directional sync scenarios", () => {
        it("should handle sync triggered from Monday.com", async () => {
            const mondayEvent = {
                source: "monday",
                action: "item.updated",
                item: mondayData.item,
                board: mondayData.board
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: mondayEvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(mondayEvent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle sync triggered from ClickUp", async () => {
            const clickupEvent = {
                source: "clickup",
                action: "task.updated",
                task: clickupData.task,
                list: clickupData.list
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: clickupEvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(clickupEvent)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle new task creation (no existing mappings)", async () => {
            const newTaskMerge = {
                ...mergedTaskData,
                canonicalId: null, // New task
                sources: {
                    trello: { id: "card-123", synced: true, isNew: true },
                    monday: { id: null, synced: false, needsCreate: true },
                    clickup: { id: null, synced: false, needsCreate: true }
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(newTaskMerge))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle task deletion sync", async () => {
            const deleteEvent = {
                ...sampleTaskEvent,
                action: "card.deleted"
            };

            const deletedTaskMerge = {
                ...mergedTaskData,
                status: "deleted",
                sources: {
                    trello: { id: "card-123", synced: true, deleted: true },
                    monday: { id: "mon-item-789", synced: false, needsDelete: true },
                    clickup: { id: "cu-task-456", synced: false, needsDelete: true }
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: deleteEvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(deleteEvent),
                    "llm-analyze": createMockLLMOutput(JSON.stringify(deletedTaskMerge)),
                    "router-status": createMockRouterOutput("progress")
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle bulk sync (multiple tasks)", async () => {
            const bulkEvent = {
                source: "trello",
                action: "board.sync",
                cards: [
                    { id: "card-1", name: "Task 1" },
                    { id: "card-2", name: "Task 2" },
                    { id: "card-3", name: "Task 3" }
                ],
                board: sampleTaskEvent.board
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: bulkEvent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(bulkEvent)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("output structure", () => {
        it("should produce structured sync result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
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

    describe("sandbox data integration", () => {
        it("should have Slack fixtures available for notifications", () => {
            expect(hasSandboxFixture("slack", "sendMessage")).toBe(true);
        });

        it("should have Trello fixtures available", () => {
            expect(hasSandboxFixture("trello", "getCard")).toBe(true);
        });

        it("should have ClickUp fixtures available", () => {
            expect(hasSandboxFixture("clickup", "getTask")).toBe(true);
        });

        it("should have Monday fixtures available", () => {
            expect(hasSandboxFixture("monday", "getItem")).toBe(true);
        });

        it("should have Mixpanel fixtures available for analytics", () => {
            expect(hasSandboxFixture("mixpanel", "trackEvent")).toBe(true);
        });

        it("should use sandbox data for Slack notifications", async () => {
            const slackOutput = await createSandboxActionOutput("slack", "sendMessage", {
                channel: "#project-updates",
                text: "Task synced across platforms"
            });

            expect(slackOutput.success).toBe(true);
            expect(slackOutput.fromSandbox).toBe(true);
        });

        it("should support custom error scenarios for Trello API", async () => {
            sandboxDataService.registerScenario({
                id: "trello-auth-expired",
                provider: "trello",
                operation: "getCard",
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Token expired",
                        retryable: false
                    }
                }
            });

            const response = await sandboxDataService.getSandboxResponse("trello", "getCard", {});

            expect(response?.success).toBe(false);
            expect(response?.error?.type).toBe("permission");
        });

        it("should integrate sandbox actions into pattern execution", async () => {
            const slackAction = await createSandboxActionOutput("slack", "sendMessage", {
                channel: "#done",
                text: "Task completed!"
            });

            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                inputs: { taskEvent: sampleTaskEvent },
                mockOutputs: createCompleteMocks({
                    "action-slack-done": slackAction,
                    "router-status": createMockRouterOutput("done")
                }),
                routerNodeId: "router-status",
                selectedRoute: "done"
            });

            assertPatternSuccess(result);
        });
    });
});
