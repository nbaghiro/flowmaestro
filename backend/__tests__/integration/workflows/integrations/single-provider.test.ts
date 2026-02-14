/**
 * Single Integration Node Workflow Tests
 *
 * Tests workflow execution with a single integration node using the mock infrastructure.
 * These tests verify that integration operations work correctly within the workflow context.
 */

import { sandboxDataService } from "../../../../src/integrations/sandbox";
import { withOutputs } from "../../../fixtures/activities";
import {
    createTestEnvironment,
    runWorkflowAndAssert,
    createTestWorkflowDefinition
} from "../../../helpers/temporal-test-env";
import type { TestEnvironment } from "../../../helpers/temporal-test-env";

// Import fixtures to register them
import "../../../fixtures/integration-fixtures";

describe("Workflow with Single Integration Node", () => {
    let testEnv: TestEnvironment;

    beforeEach(async () => {
        // Create fresh test environment for each test to avoid worker state issues
        testEnv = await createTestEnvironment(
            withOutputs({
                slack_integration: {
                    messageId: "1234567890.123456",
                    channel: "C024BE91L",
                    threadTimestamp: "1234567890.123456"
                },
                github_integration: {
                    id: 123456,
                    number: 42,
                    title: "Test Issue",
                    url: "https://github.com/demo-user/demo-app/issues/42",
                    state: "open"
                }
            })
        );
        // Clear custom mock scenarios between tests
        sandboxDataService.clearScenarios();
    }, 30000);

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    describe("Slack Integration", () => {
        it("executes sendMessage operation in workflow context", async () => {
            const workflow = createTestWorkflowDefinition({
                name: "Slack Send Message Workflow",
                nodes: [
                    {
                        id: "trigger",
                        type: "trigger",
                        config: {}
                    },
                    {
                        id: "slack_integration",
                        type: "integration",
                        config: {
                            provider: "slack",
                            operation: "sendMessage",
                            connectionId: "test-slack-connection",
                            inputs: {
                                channel: "{{trigger.channel}}",
                                text: "{{trigger.message}}"
                            }
                        }
                    }
                ],
                edges: [{ source: "trigger", target: "slack_integration" }]
            });

            await runWorkflowAndAssert(
                testEnv,
                workflow,
                {
                    inputs: {
                        channel: "#general",
                        message: "Hello from workflow test!"
                    }
                },
                {
                    expectSuccess: true
                }
            );
        });

        it("handles Slack channel not found error", async () => {
            // Register error scenario
            sandboxDataService.registerScenario({
                id: "slack-channel-not-found",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#nonexistent" },
                response: {
                    success: false,
                    error: {
                        type: "not_found",
                        message: "channel_not_found",
                        retryable: false
                    }
                }
            });

            const workflow = createTestWorkflowDefinition({
                name: "Slack Error Workflow",
                nodes: [
                    { id: "trigger", type: "trigger", config: {} },
                    {
                        id: "slack_integration",
                        type: "integration",
                        config: {
                            provider: "slack",
                            operation: "sendMessage",
                            connectionId: "test-slack-connection",
                            inputs: {
                                channel: "#nonexistent",
                                text: "Test message"
                            }
                        }
                    }
                ],
                edges: [{ source: "trigger", target: "slack_integration" }]
            });

            await runWorkflowAndAssert(
                testEnv,
                workflow,
                { inputs: {} },
                {
                    expectSuccess: false,
                    expectError: /channel_not_found|failed/i
                }
            );
        });

        it("executes listChannels operation", async () => {
            const workflow = createTestWorkflowDefinition({
                name: "Slack List Channels Workflow",
                nodes: [
                    { id: "trigger", type: "trigger", config: {} },
                    {
                        id: "slack_integration",
                        type: "integration",
                        config: {
                            provider: "slack",
                            operation: "listChannels",
                            connectionId: "test-slack-connection",
                            inputs: {
                                excludeArchived: true,
                                limit: 100
                            }
                        }
                    }
                ],
                edges: [{ source: "trigger", target: "slack_integration" }]
            });

            await runWorkflowAndAssert(testEnv, workflow, { inputs: {} }, { expectSuccess: true });
        });
    });

    describe("GitHub Integration", () => {
        it("executes createIssue operation in workflow context", async () => {
            const workflow = createTestWorkflowDefinition({
                name: "GitHub Create Issue Workflow",
                nodes: [
                    { id: "trigger", type: "trigger", config: {} },
                    {
                        id: "github_integration",
                        type: "integration",
                        config: {
                            provider: "github",
                            operation: "createIssue",
                            connectionId: "test-github-connection",
                            inputs: {
                                owner: "{{trigger.owner}}",
                                repo: "{{trigger.repo}}",
                                title: "{{trigger.title}}",
                                body: "{{trigger.body}}"
                            }
                        }
                    }
                ],
                edges: [{ source: "trigger", target: "github_integration" }]
            });

            await runWorkflowAndAssert(
                testEnv,
                workflow,
                {
                    inputs: {
                        owner: "demo-user",
                        repo: "demo-app",
                        title: "Test Issue from Workflow",
                        body: "This issue was created by a workflow test."
                    }
                },
                {
                    expectSuccess: true
                }
            );
        });

        it("executes getRepository operation", async () => {
            const workflow = createTestWorkflowDefinition({
                name: "GitHub Get Repository Workflow",
                nodes: [
                    { id: "trigger", type: "trigger", config: {} },
                    {
                        id: "github_integration",
                        type: "integration",
                        config: {
                            provider: "github",
                            operation: "getRepository",
                            connectionId: "test-github-connection",
                            inputs: {
                                owner: "demo-user",
                                repo: "demo-app"
                            }
                        }
                    }
                ],
                edges: [{ source: "trigger", target: "github_integration" }]
            });

            await runWorkflowAndAssert(testEnv, workflow, { inputs: {} }, { expectSuccess: true });
        });
    });

    describe("Integration with Transform", () => {
        it("passes integration output to transform node", async () => {
            const workflow = createTestWorkflowDefinition({
                name: "Integration to Transform Workflow",
                nodes: [
                    { id: "trigger", type: "trigger", config: {} },
                    {
                        id: "slack_integration",
                        type: "integration",
                        config: {
                            provider: "slack",
                            operation: "sendMessage",
                            connectionId: "test-slack-connection",
                            inputs: {
                                channel: "#general",
                                text: "Hello"
                            }
                        }
                    },
                    {
                        id: "transform",
                        type: "transform",
                        config: {
                            expression: {
                                result: "Message sent with ID: {{slack_integration.messageId}}"
                            }
                        }
                    }
                ],
                edges: [
                    { source: "trigger", target: "slack_integration" },
                    { source: "slack_integration", target: "transform" }
                ]
            });

            await runWorkflowAndAssert(testEnv, workflow, { inputs: {} }, { expectSuccess: true });
        });
    });
});
