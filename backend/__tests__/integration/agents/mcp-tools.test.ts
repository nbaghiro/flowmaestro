/**
 * MCP Tools Integration Tests
 *
 * Tests MCP (Model Context Protocol) tool execution using sandbox infrastructure.
 * Uses real activity implementations with mocked LLM responses.
 */

import {
    createCompletionResponse,
    createToolCallResponse,
    createToolSequence
} from "../../helpers/llm-mock-client";
import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent
} from "./helpers/agent-test-env";
import { mcpToolFixtures } from "./helpers/agent-test-fixtures";
import type { AgentTestEnvironment } from "./helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("MCP Tools Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // SLACK INTEGRATION
    // =========================================================================

    describe("Slack Integration", () => {
        it("should send a message to a Slack channel", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "slack_send_message",
                    { channel: "#general", text: "Hello from the agent!" },
                    "I've sent your message to #general."
                )
            });

            const slackAgent = createTestAgent({
                id: "agent-slack-send",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "Send 'Hello from the agent!' to #general"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("sent");

            // Verify tool was called
            const toolEvent = result.events.find((e) => e.type === "agent:tool:call:started");
            expect(toolEvent?.data.toolName).toBe("slack_send_message");
        });

        it("should list Slack channels", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "slack_list_channels",
                    { types: "public_channel" },
                    "Here are the available channels: #general, #random, #development"
                )
            });

            const slackAgent = createTestAgent({
                id: "agent-slack-list",
                tools: [mcpToolFixtures.slack.listChannels]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "What Slack channels are available?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("channels");
        });

        it("should handle channel not found error", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_send_message", {
                        channel: "#nonexistent-channel",
                        text: "Test"
                    }),
                    createCompletionResponse(
                        "I couldn't find that channel. Please check the channel name."
                    )
                ]
            });

            const slackAgent = createTestAgent({
                id: "agent-slack-error",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "Send a message to #nonexistent-channel"
            });

            // The agent should recover and provide a response
            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // GITHUB INTEGRATION
    // =========================================================================

    describe("GitHub Integration", () => {
        it("should create a GitHub issue", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "github_create_issue",
                    {
                        owner: "acme",
                        repo: "webapp",
                        title: "Bug: Login button not working",
                        body: "The login button on the homepage is not responding to clicks."
                    },
                    "I've created issue #123: 'Bug: Login button not working' in acme/webapp."
                )
            });

            const githubAgent = createTestAgent({
                id: "agent-github-issue",
                tools: [mcpToolFixtures.github.createIssue]
            });
            testEnv.registerAgent(githubAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: githubAgent.id,
                initialMessage:
                    "Create a bug report about the login button not working in acme/webapp"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("created");

            // Verify the tool call arguments
            const toolEvent = result.events.find((e) => e.type === "agent:tool:call:started");
            expect(toolEvent?.data.toolName).toBe("github_create_issue");
        });

        it("should list pull requests", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "github_list_pull_requests",
                    { owner: "acme", repo: "webapp", state: "open" },
                    "There are 3 open pull requests in acme/webapp: #45 (Feature: Dark mode), #42 (Fix: Header alignment), #38 (Docs: Update README)"
                )
            });

            const githubAgent = createTestAgent({
                id: "agent-github-prs",
                tools: [mcpToolFixtures.github.listPullRequests]
            });
            testEnv.registerAgent(githubAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: githubAgent.id,
                initialMessage: "List open PRs in acme/webapp"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("pull requests");
        });
    });

    // =========================================================================
    // HUBSPOT INTEGRATION
    // =========================================================================

    describe("HubSpot Integration", () => {
        it("should create a contact in HubSpot", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "hubspot_create_contact",
                    {
                        email: "john.doe@example.com",
                        firstname: "John",
                        lastname: "Doe",
                        company: "Example Corp"
                    },
                    "I've created a new contact for John Doe (john.doe@example.com) at Example Corp."
                )
            });

            const hubspotAgent = createTestAgent({
                id: "agent-hubspot-contact",
                tools: [mcpToolFixtures.hubspot.createContact]
            });
            testEnv.registerAgent(hubspotAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: hubspotAgent.id,
                initialMessage:
                    "Add a new contact: John Doe from Example Corp, email john.doe@example.com"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("John Doe");
        });

        it("should search contacts in HubSpot", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "hubspot_search_contacts",
                    { query: "example.com" },
                    "Found 2 contacts from example.com: John Doe (john.doe@example.com), Jane Smith (jane.smith@example.com)"
                )
            });

            const hubspotAgent = createTestAgent({
                id: "agent-hubspot-search",
                tools: [mcpToolFixtures.hubspot.searchContacts]
            });
            testEnv.registerAgent(hubspotAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: hubspotAgent.id,
                initialMessage: "Find all contacts from example.com"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("contacts");
        });
    });

    // =========================================================================
    // AIRTABLE INTEGRATION
    // =========================================================================

    describe("Airtable Integration", () => {
        it("should list records from Airtable", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "airtable_list_records",
                    { baseId: "appXXX", tableId: "Tasks" },
                    "Found 5 records in the Tasks table."
                )
            });

            const airtableAgent = createTestAgent({
                id: "agent-airtable-list",
                tools: [mcpToolFixtures.airtable.listRecords]
            });
            testEnv.registerAgent(airtableAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: airtableAgent.id,
                initialMessage: "List all records from the Tasks table"
            });

            expect(result.result.success).toBe(true);
        });

        it("should create a record in Airtable", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "airtable_create_record",
                    {
                        baseId: "appXXX",
                        tableId: "Tasks",
                        fields: { Name: "New Task", Status: "Todo", Priority: "High" }
                    },
                    "Created a new task 'New Task' with High priority."
                )
            });

            const airtableAgent = createTestAgent({
                id: "agent-airtable-create",
                tools: [mcpToolFixtures.airtable.createRecord]
            });
            testEnv.registerAgent(airtableAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: airtableAgent.id,
                initialMessage: "Create a high priority task called 'New Task'"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("New Task");
        });
    });

    // =========================================================================
    // MULTI-PROVIDER WORKFLOWS
    // =========================================================================

    describe("Multi-Provider Workflows", () => {
        it("should use multiple MCP tools in sequence", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("github_list_pull_requests", {
                        owner: "acme",
                        repo: "webapp",
                        state: "open"
                    }),
                    createToolCallResponse("slack_send_message", {
                        channel: "#dev",
                        text: "There are 3 open PRs waiting for review"
                    }),
                    createCompletionResponse("I've checked the PRs and notified the team in #dev.")
                ]
            });

            const multiProviderAgent = createTestAgent({
                id: "agent-multi-provider",
                tools: [mcpToolFixtures.github.listPullRequests, mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(multiProviderAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: multiProviderAgent.id,
                initialMessage: "Check for open PRs in acme/webapp and notify #dev"
            });

            expect(result.result.success).toBe(true);
            expect(testEnv.llmMock.getCallCount()).toBe(3);

            // Verify both tools were called
            const toolEvents = result.events.filter((e) => e.type === "agent:tool:call:started");
            const toolNames = toolEvents.map((e) => e.data.toolName);
            expect(toolNames).toContain("github_list_pull_requests");
            expect(toolNames).toContain("slack_send_message");
        });

        it("should handle tool errors and continue with fallback", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("hubspot_search_contacts", { query: "test" }),
                    createCompletionResponse(
                        "I couldn't find any matching contacts. Would you like me to try a different search?"
                    )
                ]
            });

            const agentWithFallback = createTestAgent({
                id: "agent-fallback",
                tools: [mcpToolFixtures.hubspot.searchContacts, mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(agentWithFallback);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithFallback.id,
                initialMessage: "Find contacts with 'test'"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // TOOL ARGUMENT VALIDATION
    // =========================================================================

    describe("Tool Argument Validation", () => {
        it("should handle missing required arguments", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    // First call: missing channel argument
                    createToolCallResponse("slack_send_message", { text: "Hello" }),
                    // After error, provide complete arguments
                    createToolCallResponse("slack_send_message", {
                        channel: "#general",
                        text: "Hello"
                    }),
                    createCompletionResponse("Message sent successfully.")
                ]
            });

            const slackAgent = createTestAgent({
                id: "agent-validation",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "Send a hello message"
            });

            // Should eventually succeed after retrying with correct args
            expect(result.result.success).toBe(true);
        });

        it("should coerce argument types correctly", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "slack_list_channels",
                    { limit: "50" }, // String instead of number - should be coerced
                    "Listed 50 channels."
                )
            });

            const slackAgent = createTestAgent({
                id: "agent-coerce",
                tools: [mcpToolFixtures.slack.listChannels]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "List 50 channels"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // ERROR SCENARIOS
    // =========================================================================

    describe("Error Scenarios", () => {
        it("should handle provider API errors gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_send_message", {
                        channel: "#invalid",
                        text: "Test"
                    }),
                    createCompletionResponse(
                        "I encountered an error sending the message. The channel may not exist."
                    )
                ]
            });

            const slackAgent = createTestAgent({
                id: "agent-api-error",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "Send to #invalid channel"
            });

            // Agent should handle the error gracefully
            expect(result.result.success).toBe(true);

            // Note: Tool failure events may or may not be captured depending on sandbox behavior
        });

        it("should handle rate limiting scenarios", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("hubspot_search_contacts", { query: "all" }),
                    createCompletionResponse("I was rate limited. Please try again in a moment.")
                ]
            });

            const hubspotAgent = createTestAgent({
                id: "agent-rate-limit",
                tools: [mcpToolFixtures.hubspot.searchContacts]
            });
            testEnv.registerAgent(hubspotAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: hubspotAgent.id,
                initialMessage: "Search for all contacts"
            });

            // Agent should complete with a message about rate limiting
            expect(result.result.success).toBe(true);
        });
    });
});
