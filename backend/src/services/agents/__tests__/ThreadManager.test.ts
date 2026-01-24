/**
 * ThreadManager Tests
 *
 * Tests for message abstraction and multi-format support (ThreadManager.ts)
 */

import { ThreadManager, type SerializedThread } from "../ThreadManager";
import type { ThreadMessage, ToolCall } from "../../../storage/models/AgentExecution";

describe("ThreadManager", () => {
    describe("Constructor", () => {
        it("should create manager with default metadata", () => {
            const manager = new ThreadManager();

            expect(manager.count()).toBe(0);
            expect(manager.getMetadata()).toEqual({});
        });

        it("should create manager with initial metadata", () => {
            const metadata = { source: "test", version: 1 };
            const manager = new ThreadManager(metadata);

            expect(manager.getMetadata()).toEqual(metadata);
        });
    });

    describe("Adding messages", () => {
        let manager: ThreadManager;

        beforeEach(() => {
            manager = new ThreadManager();
        });

        describe("addSystemMessage", () => {
            it("should add system message with generated ID", () => {
                const message = manager.addSystemMessage("You are a helpful assistant.");

                expect(message.role).toBe("system");
                expect(message.content).toBe("You are a helpful assistant.");
                expect(message.id).toMatch(/^sys-/);
                expect(message.timestamp).toBeInstanceOf(Date);
                expect(manager.count()).toBe(1);
            });

            it("should add system message with custom ID", () => {
                const message = manager.addSystemMessage("System prompt", "custom-sys-id");

                expect(message.id).toBe("custom-sys-id");
            });
        });

        describe("addUserMessage", () => {
            it("should add user message with generated ID", () => {
                const message = manager.addUserMessage("Hello!");

                expect(message.role).toBe("user");
                expect(message.content).toBe("Hello!");
                expect(message.id).toMatch(/^user-/);
                expect(manager.count()).toBe(1);
            });

            it("should add user message with custom ID", () => {
                const message = manager.addUserMessage("Hello!", "custom-user-id");

                expect(message.id).toBe("custom-user-id");
            });
        });

        describe("addAssistantMessage", () => {
            it("should add assistant message without tool calls", () => {
                const message = manager.addAssistantMessage("Hi there!");

                expect(message.role).toBe("assistant");
                expect(message.content).toBe("Hi there!");
                expect(message.id).toMatch(/^asst-/);
                expect(message.tool_calls).toBeUndefined();
            });

            it("should add assistant message with tool calls", () => {
                const toolCalls: ToolCall[] = [
                    { id: "call-1", name: "search", arguments: { query: "test" } }
                ];
                const message = manager.addAssistantMessage("Let me search.", toolCalls);

                expect(message.role).toBe("assistant");
                expect(message.tool_calls).toEqual(toolCalls);
            });

            it("should add assistant message with custom ID", () => {
                const message = manager.addAssistantMessage(
                    "Response",
                    undefined,
                    "custom-asst-id"
                );

                expect(message.id).toBe("custom-asst-id");
            });
        });

        describe("addToolMessage", () => {
            it("should add tool message with required fields", () => {
                const message = manager.addToolMessage("Search results: ...", "search", "call-1");

                expect(message.role).toBe("tool");
                expect(message.content).toBe("Search results: ...");
                expect(message.tool_name).toBe("search");
                expect(message.tool_call_id).toBe("call-1");
                expect(message.id).toMatch(/^tool-/);
            });

            it("should add tool message with custom ID", () => {
                const message = manager.addToolMessage(
                    "Result",
                    "tool",
                    "call-1",
                    "custom-tool-id"
                );

                expect(message.id).toBe("custom-tool-id");
            });
        });
    });

    describe("addFromMemory", () => {
        it("should add messages loaded from database", () => {
            const manager = new ThreadManager();
            const existingMessages: ThreadMessage[] = [
                { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
                { id: "msg-2", role: "assistant", content: "Hi!", timestamp: new Date() }
            ];

            manager.addFromMemory(existingMessages);

            expect(manager.count()).toBe(2);
            expect(manager.unsavedCount()).toBe(0); // Already persisted
        });

        it("should mark system messages appropriately", () => {
            const manager = new ThreadManager();
            const messages: ThreadMessage[] = [
                { id: "sys-1", role: "system", content: "System prompt", timestamp: new Date() }
            ];

            manager.addFromMemory(messages);

            expect(manager.count()).toBe(1);
        });
    });

    describe("getAll and getUnsaved", () => {
        it("should return all messages without source tracking", () => {
            const manager = new ThreadManager();
            manager.addUserMessage("Hello");
            manager.addAssistantMessage("Hi!");

            const messages = manager.getAll();

            expect(messages.length).toBe(2);
            expect(messages[0]).not.toHaveProperty("source");
            expect(messages[1]).not.toHaveProperty("source");
        });

        it("should return only unsaved messages", () => {
            const manager = new ThreadManager();

            // Add persisted messages
            manager.addFromMemory([
                { id: "old-1", role: "user", content: "Old", timestamp: new Date() }
            ]);

            // Add new messages
            manager.addUserMessage("New");

            const unsaved = manager.getUnsaved();

            expect(unsaved.length).toBe(1);
            expect(unsaved[0].content).toBe("New");
        });
    });

    describe("markSaved", () => {
        it("should mark messages as saved", () => {
            const manager = new ThreadManager();
            const msg1 = manager.addUserMessage("Hello");
            const msg2 = manager.addAssistantMessage("Hi!");

            expect(manager.unsavedCount()).toBe(2);

            manager.markSaved([msg1.id]);

            expect(manager.unsavedCount()).toBe(1);

            manager.markSaved([msg2.id]);

            expect(manager.unsavedCount()).toBe(0);
        });
    });

    describe("toOpenAI", () => {
        it("should convert messages to OpenAI format", () => {
            const manager = new ThreadManager();
            manager.addSystemMessage("You are helpful.");
            manager.addUserMessage("Hello");
            manager.addAssistantMessage("Hi there!");

            const openaiMessages = manager.toOpenAI();

            expect(openaiMessages.length).toBe(3);
            expect(openaiMessages[0]).toEqual({
                role: "system",
                content: "You are helpful."
            });
            expect(openaiMessages[1]).toEqual({
                role: "user",
                content: "Hello"
            });
            expect(openaiMessages[2]).toEqual({
                role: "assistant",
                content: "Hi there!"
            });
        });

        it("should include tool calls in OpenAI format", () => {
            const manager = new ThreadManager();
            const toolCalls: ToolCall[] = [
                { id: "call-1", name: "search", arguments: { query: "test" } }
            ];
            manager.addAssistantMessage("Searching...", toolCalls);

            const openaiMessages = manager.toOpenAI();

            expect(openaiMessages[0].tool_calls).toEqual([
                {
                    id: "call-1",
                    type: "function",
                    function: {
                        name: "search",
                        arguments: JSON.stringify({ query: "test" })
                    }
                }
            ]);
        });

        it("should include tool message metadata", () => {
            const manager = new ThreadManager();
            manager.addToolMessage("Result", "search", "call-1");

            const openaiMessages = manager.toOpenAI();

            expect(openaiMessages[0].role).toBe("tool");
            expect(openaiMessages[0].tool_call_id).toBe("call-1");
            expect(openaiMessages[0].name).toBe("search");
        });
    });

    describe("toAnthropic", () => {
        it("should separate system messages", () => {
            const manager = new ThreadManager();
            manager.addSystemMessage("First system message.");
            manager.addSystemMessage("Second system message.");
            manager.addUserMessage("Hello");

            const { system, messages } = manager.toAnthropic();

            expect(system).toBe("First system message.\n\nSecond system message.");
            expect(messages.length).toBe(1);
            expect(messages[0].role).toBe("user");
        });

        it("should convert user messages", () => {
            const manager = new ThreadManager();
            manager.addUserMessage("Hello");

            const { messages } = manager.toAnthropic();

            expect(messages[0]).toEqual({
                role: "user",
                content: "Hello"
            });
        });

        it("should convert assistant messages with text only", () => {
            const manager = new ThreadManager();
            manager.addAssistantMessage("Hi there!");

            const { messages } = manager.toAnthropic();

            expect(messages[0]).toEqual({
                role: "assistant",
                content: "Hi there!"
            });
        });

        it("should convert assistant messages with tool calls", () => {
            const manager = new ThreadManager();
            const toolCalls: ToolCall[] = [
                { id: "call-1", name: "search", arguments: { query: "test" } }
            ];
            manager.addAssistantMessage("Let me search.", toolCalls);

            const { messages } = manager.toAnthropic();

            expect(messages[0].role).toBe("assistant");
            expect(Array.isArray(messages[0].content)).toBe(true);

            const content = messages[0].content as Array<{
                type: string;
                text?: string;
                id?: string;
                name?: string;
                input?: Record<string, unknown>;
            }>;
            expect(content[0]).toEqual({ type: "text", text: "Let me search." });
            expect(content[1]).toEqual({
                type: "tool_use",
                id: "call-1",
                name: "search",
                input: { query: "test" }
            });
        });

        it("should convert tool messages to user messages with tool_result", () => {
            const manager = new ThreadManager();
            manager.addToolMessage("Search results", "search", "call-1");

            const { messages } = manager.toAnthropic();

            expect(messages[0].role).toBe("user");
            expect(Array.isArray(messages[0].content)).toBe(true);

            const content = messages[0].content as Array<{
                type: string;
                tool_use_id?: string;
                content?: string;
            }>;
            expect(content[0]).toEqual({
                type: "tool_result",
                tool_use_id: "call-1",
                content: "Search results"
            });
        });
    });

    describe("toDatabase", () => {
        it("should return all messages for storage", () => {
            const manager = new ThreadManager();
            manager.addUserMessage("Hello");
            manager.addAssistantMessage("Hi!");

            const dbMessages = manager.toDatabase();

            expect(dbMessages.length).toBe(2);
            expect(dbMessages).toEqual(manager.getAll());
        });
    });

    describe("Serialization", () => {
        it("should serialize thread state", () => {
            const manager = new ThreadManager({ source: "test" });
            const msg = manager.addUserMessage("Hello");
            manager.markSaved([msg.id]);

            const serialized = manager.serialize();

            expect(serialized.messages.length).toBe(1);
            expect(serialized.savedMessageIds).toContain(msg.id);
            expect(serialized.metadata).toEqual({ source: "test" });
        });

        it("should deserialize thread state", () => {
            const serialized: SerializedThread = {
                messages: [{ id: "msg-1", role: "user", content: "Hello", timestamp: new Date() }],
                savedMessageIds: ["msg-1"],
                metadata: { restored: true }
            };

            const manager = ThreadManager.deserialize(serialized);

            expect(manager.count()).toBe(1);
            expect(manager.unsavedCount()).toBe(0);
            expect(manager.getMetadata()).toEqual({ restored: true });
        });
    });

    describe("deduplicate", () => {
        it("should remove duplicate messages by ID", () => {
            const manager = new ThreadManager();
            const messages: ThreadMessage[] = [
                { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
                { id: "msg-1", role: "user", content: "Hello duplicate", timestamp: new Date() },
                { id: "msg-2", role: "assistant", content: "Hi!", timestamp: new Date() }
            ];

            manager.addFromMemory(messages);
            manager.deduplicate();

            expect(manager.count()).toBe(2);
            const all = manager.getAll();
            expect(all[0].content).toBe("Hello"); // First occurrence kept
        });
    });

    describe("keepLast", () => {
        it("should keep only last N messages", () => {
            const manager = new ThreadManager();
            manager.addUserMessage("Message 1");
            manager.addAssistantMessage("Response 1");
            manager.addUserMessage("Message 2");
            manager.addAssistantMessage("Response 2");
            manager.addUserMessage("Message 3");

            const removed = manager.keepLast(3);

            expect(manager.count()).toBe(3);
            expect(removed.length).toBe(2);
            expect(removed[0].content).toBe("Message 1");
        });

        it("should return empty array if count is larger than messages", () => {
            const manager = new ThreadManager();
            manager.addUserMessage("Hello");

            const removed = manager.keepLast(10);

            expect(removed.length).toBe(0);
            expect(manager.count()).toBe(1);
        });
    });

    describe("summarize", () => {
        it("should not summarize if message count is below threshold", async () => {
            const manager = new ThreadManager();
            manager.addUserMessage("Hello");
            manager.addAssistantMessage("Hi!");

            await manager.summarize(5);

            expect(manager.count()).toBe(2);
        });

        it("should use default summarizer when none provided", async () => {
            const manager = new ThreadManager();
            manager.addSystemMessage("System prompt");
            for (let i = 0; i < 10; i++) {
                manager.addUserMessage(`Message ${i}`);
                manager.addAssistantMessage(`Response ${i}`);
            }

            await manager.summarize(5);

            // Should have: system + summary + last 5 messages
            const messages = manager.getAll();
            expect(
                messages.some((m) => m.content.includes("[Previous conversation summarized:"))
            ).toBe(true);
        });

        it("should use custom summarizer when provided", async () => {
            const manager = new ThreadManager();
            manager.addSystemMessage("System prompt");
            for (let i = 0; i < 10; i++) {
                manager.addUserMessage(`Message ${i}`);
            }

            const customSummarizer = jest.fn().mockResolvedValue("Custom summary of conversation");

            await manager.summarize(5, customSummarizer);

            expect(customSummarizer).toHaveBeenCalled();
            const messages = manager.getAll();
            expect(messages.some((m) => m.content === "Custom summary of conversation")).toBe(true);
        });
    });

    describe("Metadata operations", () => {
        it("should get and set metadata", () => {
            const manager = new ThreadManager();

            manager.setMetadata("key1", "value1");
            manager.setMetadata("key2", 42);

            expect(manager.getMetadata()).toEqual({ key1: "value1", key2: 42 });
        });

        it("should return copy of metadata", () => {
            const manager = new ThreadManager({ original: true });
            const metadata = manager.getMetadata();
            metadata.modified = true;

            expect(manager.getMetadata()).toEqual({ original: true });
        });
    });

    describe("clear", () => {
        it("should remove all messages and saved IDs", () => {
            const manager = new ThreadManager();
            const msg = manager.addUserMessage("Hello");
            manager.markSaved([msg.id]);

            manager.clear();

            expect(manager.count()).toBe(0);
            expect(manager.unsavedCount()).toBe(0);
        });
    });

    describe("clone", () => {
        it("should create independent copy of messages", () => {
            const original = new ThreadManager({ source: "original" });
            original.addUserMessage("Hello");

            const cloned = original.clone();
            cloned.addAssistantMessage("Hi!");

            // Messages should be independent
            expect(original.count()).toBe(1);
            expect(cloned.count()).toBe(2);
        });

        it("should preserve metadata in cloned copy", () => {
            const original = new ThreadManager({ source: "test", count: 42 });
            original.addUserMessage("Hello");

            const cloned = original.clone();

            // Both should have the same metadata values initially
            expect(cloned.getMetadata().source).toBe("test");
            expect(cloned.getMetadata().count).toBe(42);
        });
    });
});
