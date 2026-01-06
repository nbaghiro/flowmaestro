/**
 * Example 04: AI Agent Chatbot
 *
 * This example demonstrates building a conversational chatbot:
 * 1. Create a conversation thread with an AI agent
 * 2. Send messages and receive responses
 * 3. Maintain conversation history
 *
 * Run: npx tsx 04-agent-chatbot.ts
 */

import "dotenv/config";
import * as readline from "readline";
import { FlowMaestroClient } from "@flowmaestro/sdk";

// Configuration from environment
const API_KEY = process.env.FLOWMAESTRO_API_KEY!;
const BASE_URL = process.env.FLOWMAESTRO_BASE_URL;
const AGENT_ID = process.env.AGENT_ID!;

async function main() {
    // Validate configuration
    if (!API_KEY || API_KEY === "fm_live_your_api_key_here") {
        console.error("Error: Please set FLOWMAESTRO_API_KEY in your .env file");
        process.exit(1);
    }
    if (!AGENT_ID || AGENT_ID === "agent_your_agent_id") {
        console.error("Error: Please set AGENT_ID in your .env file");
        process.exit(1);
    }

    const client = new FlowMaestroClient({
        apiKey: API_KEY,
        baseUrl: BASE_URL
    });

    console.log("FlowMaestro AI Chatbot Example\n");
    console.log("=".repeat(50));

    try {
        // Step 1: Get agent details
        console.log("\n1. Loading agent...");
        const { data: agent } = await client.agents.get(AGENT_ID);
        console.log(`   Agent: ${agent.name}`);
        console.log(`   Model: ${agent.model}`);
        if (agent.description) {
            console.log(`   Description: ${agent.description}`);
        }

        // Step 2: Create a conversation thread
        console.log("\n2. Creating conversation thread...");
        const { data: thread } = await client.agents.createThread(AGENT_ID, {
            metadata: {
                source: "cli-example",
                created_at: new Date().toISOString()
            }
        });
        console.log(`   Thread ID: ${thread.id}`);

        // Step 3: Start interactive chat
        console.log("\n3. Starting chat session...");
        console.log("   Type 'exit' to end the conversation");
        console.log("   Type 'history' to view message history");
        console.log("   Type 'clear' to start a new thread\n");
        console.log("-".repeat(50) + "\n");

        await runChatLoop(client, thread.id, agent.name);

        // Step 4: Show conversation summary
        console.log("\n" + "-".repeat(50));
        console.log("Conversation ended. Fetching history...\n");

        const { data: messagesData } = await client.threads.listMessages(thread.id);
        console.log(`Total messages: ${messagesData.messages.length}`);

        // Optionally delete the thread
        // await client.threads.delete(thread.id);
        // console.log('Thread deleted.');
    } catch (error) {
        console.error("\nError:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function runChatLoop(
    client: FlowMaestroClient,
    threadId: string,
    agentName: string
): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const prompt = () => {
        return new Promise<string>((resolve) => {
            rl.question("You: ", (answer) => {
                resolve(answer);
            });
        });
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const input = await prompt();
        const trimmedInput = input.trim();

        // Handle special commands
        if (trimmedInput.toLowerCase() === "exit") {
            rl.close();
            break;
        }

        if (trimmedInput.toLowerCase() === "history") {
            await showHistory(client, threadId);
            continue;
        }

        if (trimmedInput.toLowerCase() === "clear") {
            console.log("\n[Starting new conversation would require creating a new thread]");
            console.log("[In production, you would create a new thread here]\n");
            continue;
        }

        if (!trimmedInput) {
            continue;
        }

        try {
            // Send message and get response
            process.stdout.write(`${agentName}: `);

            // Note: If streaming is supported, use sendMessageStream
            // For now, using non-streaming approach
            const { data: response } = await client.threads.sendMessage(threadId, {
                content: trimmedInput
            });

            // The actual response content would come from fetching messages
            // This is a simplified example
            if (response.status === "completed") {
                // Fetch the latest messages to get the response
                const { data: messagesData } = await client.threads.listMessages(threadId);
                const lastMessage = messagesData.messages[messagesData.messages.length - 1];

                if (lastMessage && lastMessage.role === "assistant") {
                    console.log(lastMessage.content);
                } else {
                    console.log("[Response received]");
                }
            } else {
                console.log(`[Message status: ${response.status}]`);
            }

            console.log();
        } catch (error) {
            if (error instanceof Error) {
                // Handle specific error for unimplemented endpoint
                if (error.message.includes("not yet implemented")) {
                    console.log("[Agent messaging not yet available in public API]");
                    console.log("[This example demonstrates the intended API pattern]\n");
                } else {
                    console.log(`[Error: ${error.message}]\n`);
                }
            }
        }
    }
}

async function showHistory(client: FlowMaestroClient, threadId: string): Promise<void> {
    try {
        const { data: messagesData } = await client.threads.listMessages(threadId);

        console.log("\n--- Message History ---");
        if (messagesData.messages.length === 0) {
            console.log("(no messages yet)");
        } else {
            for (const msg of messagesData.messages) {
                const role = msg.role === "user" ? "You" : "Agent";
                const time = new Date(msg.created_at).toLocaleTimeString();
                console.log(`[${time}] ${role}: ${msg.content.substring(0, 100)}...`);
            }
        }
        console.log("-----------------------\n");
    } catch (_error) {
        console.log("\n[Could not fetch history]\n");
    }
}

main();
