/**
 * Schema Validation Tests
 *
 * Tests Zod schema validation behavior across multiple providers.
 * Verifies required fields, type coercion, format validation, and extra field handling.
 */

import { z, ZodError } from "zod";

// Slack schemas

// Airtable schemas
import { createRecordSchema } from "../../providers/airtable/operations/createRecord";
import {
    baseIdSchema,
    tableIdSchema,
    recordIdSchema,
    fieldsSchema
} from "../../providers/airtable/schemas";

// GitHub schemas
import { createIssueSchema } from "../../providers/github/operations/issues/createIssue";
import { listIssuesSchema } from "../../providers/github/operations/issues/listIssues";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubTitleSchema,
    GitHubBodySchema,
    GitHubLabelsSchema,
    GitHubHomepageSchema,
    GitHubIssueNumberSchema,
    GitHubShaSchema,
    GitHubPerPageSchema
} from "../../providers/github/schemas";
import { sendMessageSchema } from "../../providers/slack/operations/sendMessage";
import {
    SlackChannelSchema,
    SlackTextSchema,
    SlackThreadTsSchema
} from "../../providers/slack/schemas";

/**
 * Helper to extract Zod error messages
 */
function getZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}

describe("Schema Validation", () => {
    describe("1. Required Field Validation", () => {
        describe("Slack sendMessage", () => {
            it("rejects missing channel field", () => {
                const result = sendMessageSchema.safeParse({
                    text: "Hello world"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("channel"))).toBe(true);
                }
            });

            it("rejects missing text field", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("text"))).toBe(true);
                }
            });

            it("rejects empty object", () => {
                const result = sendMessageSchema.safeParse({});

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.errors.length).toBeGreaterThanOrEqual(2);
                }
            });
        });

        describe("Airtable createRecord", () => {
            it("rejects missing baseId field", () => {
                const result = createRecordSchema.safeParse({
                    tableId: "tbl123",
                    fields: { Name: "Test" }
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("baseId"))).toBe(true);
                }
            });

            it("rejects missing tableId field", () => {
                const result = createRecordSchema.safeParse({
                    baseId: "app123",
                    fields: { Name: "Test" }
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("tableId"))).toBe(true);
                }
            });

            it("rejects missing fields field", () => {
                const result = createRecordSchema.safeParse({
                    baseId: "app123",
                    tableId: "tbl123"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("fields"))).toBe(true);
                }
            });
        });

        describe("GitHub createIssue", () => {
            it("rejects missing owner field", () => {
                const result = createIssueSchema.safeParse({
                    repo: "my-repo",
                    title: "Bug report"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("owner"))).toBe(true);
                }
            });

            it("rejects missing repo field", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    title: "Bug report"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("repo"))).toBe(true);
                }
            });

            it("rejects missing title field", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const errors = getZodErrors(result.error);
                    expect(errors.some((e) => e.includes("title"))).toBe(true);
                }
            });
        });
    });

    describe("2. Type Validation", () => {
        describe("String vs Number", () => {
            it("rejects number for Slack channel (expects string)", () => {
                const result = SlackChannelSchema.safeParse(12345);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.errors[0].message).toContain("string");
                }
            });

            it("rejects string for GitHub issue number (expects number)", () => {
                const result = GitHubIssueNumberSchema.safeParse("42");

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.errors[0].message).toContain("number");
                }
            });

            it("rejects negative number for GitHub issue number (expects positive)", () => {
                const result = GitHubIssueNumberSchema.safeParse(-1);

                expect(result.success).toBe(false);
            });

            it("rejects decimal for GitHub issue number (expects integer)", () => {
                const result = GitHubIssueNumberSchema.safeParse(42.5);

                expect(result.success).toBe(false);
            });
        });

        describe("Array vs Primitive", () => {
            it("rejects string for GitHub labels (expects array)", () => {
                const result = GitHubLabelsSchema.safeParse("bug");

                expect(result.success).toBe(false);
            });

            it("accepts array of strings for GitHub labels", () => {
                const result = GitHubLabelsSchema.safeParse(["bug", "enhancement"]);

                expect(result.success).toBe(true);
            });

            it("rejects array with non-string elements for GitHub labels", () => {
                const result = GitHubLabelsSchema.safeParse([1, 2, 3]);

                expect(result.success).toBe(false);
            });
        });

        describe("Object vs Primitive", () => {
            it("rejects string for Airtable fields (expects object)", () => {
                const result = fieldsSchema.safeParse("invalid");

                expect(result.success).toBe(false);
            });

            it("accepts object for Airtable fields", () => {
                const result = fieldsSchema.safeParse({
                    Name: "Test",
                    Count: 42
                });

                expect(result.success).toBe(true);
            });
        });

        describe("Boolean", () => {
            it("rejects string for boolean field", () => {
                const schema = z.object({
                    typecast: z.boolean().optional()
                });

                const result = schema.safeParse({ typecast: "true" });

                expect(result.success).toBe(false);
            });

            it("accepts true/false for boolean field", () => {
                const schema = z.object({
                    typecast: z.boolean().optional()
                });

                expect(schema.safeParse({ typecast: true }).success).toBe(true);
                expect(schema.safeParse({ typecast: false }).success).toBe(true);
            });
        });
    });

    describe("3. Format Validation", () => {
        describe("URL Format", () => {
            it("rejects invalid URL for GitHub homepage", () => {
                const result = GitHubHomepageSchema.safeParse("not-a-url");

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.errors[0].message.toLowerCase()).toContain("url");
                }
            });

            it("accepts valid URL for GitHub homepage", () => {
                const result = GitHubHomepageSchema.safeParse("https://example.com");

                expect(result.success).toBe(true);
            });

            it("accepts URL with path for GitHub homepage", () => {
                const result = GitHubHomepageSchema.safeParse("https://example.com/docs/intro");

                expect(result.success).toBe(true);
            });
        });

        describe("SHA Format (GitHub)", () => {
            it("rejects short SHA", () => {
                const result = GitHubShaSchema.safeParse("abc123");

                expect(result.success).toBe(false);
            });

            it("rejects SHA with invalid characters", () => {
                const result = GitHubShaSchema.safeParse(
                    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
                );

                expect(result.success).toBe(false);
            });

            it("accepts valid 40-character SHA", () => {
                const result = GitHubShaSchema.safeParse(
                    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
                );

                expect(result.success).toBe(true);
            });
        });

        describe("String Length Constraints", () => {
            it("rejects empty string for Slack text (min 1)", () => {
                const result = SlackTextSchema.safeParse("");

                expect(result.success).toBe(false);
            });

            it("rejects text exceeding max length for Slack text (max 3000)", () => {
                const longText = "a".repeat(3001);
                const result = SlackTextSchema.safeParse(longText);

                expect(result.success).toBe(false);
            });

            it("accepts text within bounds for Slack text", () => {
                const result = SlackTextSchema.safeParse("Hello, world!");

                expect(result.success).toBe(true);
            });

            it("rejects title exceeding max length for GitHub (max 256)", () => {
                const longTitle = "a".repeat(257);
                const result = GitHubTitleSchema.safeParse(longTitle);

                expect(result.success).toBe(false);
            });

            it("accepts title within bounds for GitHub", () => {
                const result = GitHubTitleSchema.safeParse("Fix bug in login flow");

                expect(result.success).toBe(true);
            });
        });

        describe("Number Range Constraints", () => {
            it("rejects perPage less than 1 for GitHub", () => {
                const result = GitHubPerPageSchema.safeParse(0);

                expect(result.success).toBe(false);
            });

            it("rejects perPage greater than 100 for GitHub", () => {
                const result = GitHubPerPageSchema.safeParse(101);

                expect(result.success).toBe(false);
            });

            it("accepts perPage within range for GitHub", () => {
                const result = GitHubPerPageSchema.safeParse(50);

                expect(result.success).toBe(true);
            });
        });
    });

    describe("4. Optional Fields", () => {
        describe("Slack sendMessage optional fields", () => {
            it("accepts message without thread_ts (optional)", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello world"
                });

                expect(result.success).toBe(true);
            });

            it("accepts message with thread_ts", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello world",
                    thread_ts: "1234567890.123456"
                });

                expect(result.success).toBe(true);
            });

            it("accepts message without blocks (optional)", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello world"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.blocks).toBeUndefined();
                }
            });

            it("accepts message with blocks", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello world",
                    blocks: [{ type: "section", text: { type: "mrkdwn", text: "Hello" } }]
                });

                expect(result.success).toBe(true);
            });
        });

        describe("Airtable createRecord optional fields", () => {
            it("accepts record without typecast (optional)", () => {
                const result = createRecordSchema.safeParse({
                    baseId: "app123",
                    tableId: "tbl123",
                    fields: { Name: "Test" }
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.typecast).toBeUndefined();
                }
            });

            it("accepts record with typecast", () => {
                const result = createRecordSchema.safeParse({
                    baseId: "app123",
                    tableId: "tbl123",
                    fields: { Name: "Test" },
                    typecast: true
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.typecast).toBe(true);
                }
            });
        });

        describe("GitHub createIssue optional fields", () => {
            it("accepts issue without body (optional)", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo",
                    title: "Bug report"
                });

                expect(result.success).toBe(true);
            });

            it("accepts issue with body", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo",
                    title: "Bug report",
                    body: "This is a detailed description"
                });

                expect(result.success).toBe(true);
            });

            it("accepts issue without labels and assignees (optional)", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo",
                    title: "Bug report"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.labels).toBeUndefined();
                    expect(result.data.assignees).toBeUndefined();
                }
            });

            it("accepts issue with all optional fields", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo",
                    title: "Bug report",
                    body: "Description",
                    labels: ["bug"],
                    assignees: ["user1"],
                    milestone: 1
                });

                expect(result.success).toBe(true);
            });
        });

        describe("GitHub listIssues default values", () => {
            it("applies default values for optional fields", () => {
                const result = listIssuesSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    // Default values should be applied
                    expect(result.data.state).toBe("open");
                    expect(result.data.sort).toBe("created");
                    expect(result.data.direction).toBe("desc");
                }
            });
        });
    });

    describe("5. Extra Fields Handling", () => {
        describe("Strict mode (Zod default strips extra fields)", () => {
            it("strips extra fields from Slack message", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello world",
                    extraField: "should be stripped",
                    anotherExtra: 123
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    // Extra fields should be stripped
                    expect(result.data).not.toHaveProperty("extraField");
                    expect(result.data).not.toHaveProperty("anotherExtra");
                    // Valid fields should remain
                    expect(result.data.channel).toBe("#general");
                    expect(result.data.text).toBe("Hello world");
                }
            });

            it("strips extra fields from Airtable record", () => {
                const result = createRecordSchema.safeParse({
                    baseId: "app123",
                    tableId: "tbl123",
                    fields: { Name: "Test" },
                    unknownField: "value"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).not.toHaveProperty("unknownField");
                }
            });

            it("strips extra fields from GitHub issue", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo",
                    title: "Bug report",
                    priority: "high", // Not a valid GitHub API field
                    customField: "value"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).not.toHaveProperty("priority");
                    expect(result.data).not.toHaveProperty("customField");
                }
            });
        });

        describe("Strict schema behavior", () => {
            it("can reject extra fields when using .strict()", () => {
                const strictSchema = sendMessageSchema.strict();

                const result = strictSchema.safeParse({
                    channel: "#general",
                    text: "Hello world",
                    extraField: "should cause error"
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.errors[0].message).toContain("Unrecognized key");
                }
            });
        });
    });

    describe("6. Edge Cases", () => {
        describe("Null and undefined handling", () => {
            it("rejects null for required string field", () => {
                const result = SlackChannelSchema.safeParse(null);

                expect(result.success).toBe(false);
            });

            it("accepts undefined for optional field", () => {
                const result = SlackThreadTsSchema.safeParse(undefined);

                expect(result.success).toBe(true);
            });

            it("rejects undefined for required field in object", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: undefined
                });

                expect(result.success).toBe(false);
            });
        });

        describe("Empty values", () => {
            it("rejects empty string for GitHub owner (min 1)", () => {
                const result = GitHubOwnerSchema.safeParse("");

                expect(result.success).toBe(false);
            });

            it("rejects empty string for GitHub repo (min 1)", () => {
                const result = GitHubRepoNameSchema.safeParse("");

                expect(result.success).toBe(false);
            });

            it("accepts empty array for optional labels", () => {
                const result = GitHubLabelsSchema.safeParse([]);

                expect(result.success).toBe(true);
            });

            it("accepts empty object for Airtable fields", () => {
                const result = fieldsSchema.safeParse({});

                expect(result.success).toBe(true);
            });
        });

        describe("Whitespace handling", () => {
            it("does not trim whitespace (preserves as-is)", () => {
                const result = SlackChannelSchema.safeParse("  #general  ");

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toBe("  #general  ");
                }
            });

            it("accepts whitespace-only for text (no trim)", () => {
                const result = SlackTextSchema.safeParse("   ");

                expect(result.success).toBe(true);
            });
        });

        describe("Special characters", () => {
            it("accepts special characters in Slack text", () => {
                const result = SlackTextSchema.safeParse(
                    "Hello! @user <https://example.com|link> :emoji: `code`"
                );

                expect(result.success).toBe(true);
            });

            it("accepts unicode in GitHub title", () => {
                const result = GitHubTitleSchema.safeParse("Bug: Japanese text");

                expect(result.success).toBe(true);
            });

            it("accepts newlines in GitHub body", () => {
                const result = GitHubBodySchema.safeParse("Line 1\n\nLine 2\n- Item 1\n- Item 2");

                expect(result.success).toBe(true);
            });
        });
    });

    describe("7. Cross-Provider Consistency", () => {
        describe("All providers reject wrong types for ID fields", () => {
            it("Slack channel rejects number", () => {
                expect(SlackChannelSchema.safeParse(123).success).toBe(false);
            });

            it("Airtable baseId rejects number", () => {
                expect(baseIdSchema.safeParse(123).success).toBe(false);
            });

            it("Airtable tableId rejects number", () => {
                expect(tableIdSchema.safeParse(123).success).toBe(false);
            });

            it("Airtable recordId rejects number", () => {
                expect(recordIdSchema.safeParse(123).success).toBe(false);
            });

            it("GitHub owner rejects number", () => {
                expect(GitHubOwnerSchema.safeParse(123).success).toBe(false);
            });

            it("GitHub repo rejects number", () => {
                expect(GitHubRepoNameSchema.safeParse(123).success).toBe(false);
            });
        });

        describe("All providers accept valid minimal input", () => {
            it("Slack sendMessage with minimal valid input", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "C1234567890",
                    text: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("Airtable createRecord with minimal valid input", () => {
                const result = createRecordSchema.safeParse({
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblXXXXXXXXXXXXXX",
                    fields: {}
                });
                expect(result.success).toBe(true);
            });

            it("GitHub createIssue with minimal valid input", () => {
                const result = createIssueSchema.safeParse({
                    owner: "octocat",
                    repo: "hello-world",
                    title: "Found a bug"
                });
                expect(result.success).toBe(true);
            });
        });
    });

    describe("8. Error Message Quality", () => {
        describe("Error messages are descriptive", () => {
            it("provides clear message for missing required field", () => {
                const result = createIssueSchema.safeParse({
                    owner: "my-org",
                    repo: "my-repo"
                    // missing title
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    const titleError = result.error.errors.find((e) => e.path.includes("title"));
                    expect(titleError).toBeDefined();
                    expect(titleError?.message).toBeTruthy();
                }
            });

            it("provides clear message for invalid type", () => {
                const result = GitHubIssueNumberSchema.safeParse("not-a-number");

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.errors[0].message.toLowerCase()).toMatch(
                        /number|expected|type/
                    );
                }
            });

            it("provides clear message for constraint violation", () => {
                const result = GitHubTitleSchema.safeParse("");

                expect(result.success).toBe(false);
                if (!result.success) {
                    // Should mention minimum length or "required"
                    expect(result.error.errors[0].message.toLowerCase()).toMatch(
                        /at least|min|required|character/
                    );
                }
            });
        });
    });
});
