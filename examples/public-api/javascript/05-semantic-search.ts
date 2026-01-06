/**
 * Example 05: Semantic Search (RAG)
 *
 * This example demonstrates using knowledge bases for semantic search:
 * 1. List available knowledge bases
 * 2. Perform semantic queries
 * 3. Display ranked results with similarity scores
 *
 * Run: npx tsx 05-semantic-search.ts
 */

import "dotenv/config";
import * as readline from "readline";
import { FlowMaestroClient } from "@flowmaestro/sdk";

// Configuration from environment
const API_KEY = process.env.FLOWMAESTRO_API_KEY!;
const BASE_URL = process.env.FLOWMAESTRO_BASE_URL;
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID!;

async function main() {
    // Validate configuration
    if (!API_KEY || API_KEY === "fm_live_your_api_key_here") {
        console.error("Error: Please set FLOWMAESTRO_API_KEY in your .env file");
        process.exit(1);
    }

    const client = new FlowMaestroClient({
        apiKey: API_KEY,
        baseUrl: BASE_URL
    });

    console.log("FlowMaestro Semantic Search Example\n");
    console.log("=".repeat(50));

    try {
        // Step 1: List available knowledge bases
        console.log("\n1. Available knowledge bases:");
        const { data: knowledgeBases } = await client.knowledgeBases.list();

        if (knowledgeBases.length === 0) {
            console.log("   No knowledge bases found. Create one in the FlowMaestro dashboard.");
            process.exit(0);
        }

        for (const kb of knowledgeBases) {
            const isSelected = kb.id === KNOWLEDGE_BASE_ID ? " <-- selected" : "";
            console.log(`   - ${kb.name} (${kb.id})${isSelected}`);
            console.log(`     Documents: ${kb.document_count}, Chunks: ${kb.chunk_count}`);
        }

        // Step 2: Get selected knowledge base details
        let kbId = KNOWLEDGE_BASE_ID;
        if (!kbId || kbId === "kb_your_knowledge_base_id") {
            kbId = knowledgeBases[0].id;
            console.log(`\n   Using first knowledge base: ${kbId}`);
        }

        console.log("\n2. Knowledge base details:");
        const { data: kb } = await client.knowledgeBases.get(kbId);
        console.log(`   Name: ${kb.name}`);
        console.log(`   Description: ${kb.description || "N/A"}`);
        console.log(`   Embedding model: ${kb.embedding_model}`);
        console.log(`   Chunk size: ${kb.chunk_size} tokens`);
        console.log(`   Total documents: ${kb.document_count}`);
        console.log(`   Total chunks: ${kb.chunk_count}`);

        // Step 3: Interactive search
        console.log("\n3. Semantic Search Interface");
        console.log("   Enter your queries below. Type 'exit' to quit.\n");
        console.log("-".repeat(50) + "\n");

        await runSearchLoop(client, kbId);
    } catch (error) {
        console.error("\nError:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function runSearchLoop(client: FlowMaestroClient, kbId: string): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const prompt = () => {
        return new Promise<string>((resolve) => {
            rl.question("Search: ", (answer) => {
                resolve(answer);
            });
        });
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const query = await prompt();
        const trimmedQuery = query.trim();

        if (trimmedQuery.toLowerCase() === "exit") {
            rl.close();
            console.log("\nGoodbye!");
            break;
        }

        if (!trimmedQuery) {
            continue;
        }

        try {
            console.log("\nSearching...\n");
            const startTime = Date.now();

            const { data: results } = await client.knowledgeBases.query(kbId, {
                query: trimmedQuery,
                top_k: 5
            });

            const elapsed = Date.now() - startTime;
            console.log(`Found ${results.results.length} results in ${elapsed}ms:\n`);

            if (results.results.length === 0) {
                console.log("No results found. Try a different query.\n");
            } else {
                for (let i = 0; i < results.results.length; i++) {
                    const result = results.results[i];
                    displayResult(i + 1, result);
                }
            }

            console.log("-".repeat(50) + "\n");
        } catch (error) {
            console.log(`\nError: ${error instanceof Error ? error.message : "Search failed"}\n`);
        }
    }
}

function displayResult(
    rank: number,
    result: {
        id: string;
        content: string;
        document_id: string;
        document_name?: string;
        score: number;
        metadata?: Record<string, unknown>;
    }
): void {
    const scorePercent = (result.score * 100).toFixed(1);
    const scoreBar = createScoreBar(result.score);

    console.log(`${rank}. [${scorePercent}%] ${scoreBar}`);
    console.log(`   Source: ${result.document_name || result.document_id}`);

    // Truncate content for display
    const maxLength = 200;
    let content = result.content.replace(/\s+/g, " ").trim();
    if (content.length > maxLength) {
        content = content.substring(0, maxLength) + "...";
    }
    console.log(`   Content: "${content}"`);

    // Show metadata if present
    if (result.metadata && Object.keys(result.metadata).length > 0) {
        const metaStr = Object.entries(result.metadata)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
        console.log(`   Metadata: ${metaStr}`);
    }

    console.log();
}

function createScoreBar(score: number, width: number = 20): string {
    const filled = Math.round(score * width);
    const empty = width - filled;
    return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}

main();
