import chalk from "chalk";
import { get, post, type PaginatedResponse, type ApiResponse } from "../../api-client";
import { isAuthenticated } from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import {
    output,
    formatDate,
    printSection,
    printKeyValue,
    type TableColumn
} from "../../utils/output";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface KnowledgeBase {
    id: string;
    name: string;
    description?: string;
    document_count: number;
    chunk_count: number;
    created_at: string;
    updated_at: string;
}

interface KnowledgeBaseDetail extends KnowledgeBase {
    embedding_model: string;
    chunk_size: number;
    chunk_overlap: number;
}

interface QueryResult {
    id: string;
    content: string;
    document_id: string;
    document_name: string;
    score: number;
    metadata?: Record<string, unknown>;
}

interface QueryResponse {
    results: QueryResult[];
    query: string;
    top_k: number;
}

const KB_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 25 },
    { key: "document_count", header: "Documents", width: 12 },
    { key: "chunk_count", header: "Chunks", width: 12 },
    {
        key: "updated_at",
        header: "Updated",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "-")
    }
];

export function registerKbCommand(program: Command): void {
    const kbCmd = program
        .command("kb")
        .alias("knowledge-bases")
        .description("Query and manage knowledge bases");

    kbCmd
        .command("list")
        .alias("ls")
        .description("List all knowledge bases")
        .option("-p, --page <number>", "Page number", "1")
        .option("--per-page <number>", "Items per page", "20")
        .action(async (options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching knowledge bases...",
                    () =>
                        get<PaginatedResponse<KnowledgeBase>>(
                            `/api/v1/knowledge-bases?page=${options.page}&per_page=${options.perPage}`
                        ),
                    { successText: (r) => `Found ${r.data.length} knowledge bases` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: KB_COLUMNS
                });

                if (globalOpts.output === "table" && response.pagination.total_pages > 1) {
                    console.log(
                        chalk.gray(
                            `\nPage ${response.pagination.page} of ${response.pagination.total_pages} ` +
                                `(${response.pagination.total_count} total)`
                        )
                    );
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    kbCmd
        .command("get <id>")
        .description("Get knowledge base details")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching knowledge base...",
                    () => get<ApiResponse<KnowledgeBaseDetail>>(`/api/v1/knowledge-bases/${id}`),
                    { successText: "Knowledge base loaded" }
                );

                const kb = response.data;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output(kb, { format: globalOpts.output });
                    return;
                }

                printSection("Knowledge Base Details");
                printKeyValue("ID", kb.id);
                printKeyValue("Name", kb.name);
                printKeyValue("Description", kb.description || chalk.gray("(none)"));
                printKeyValue("Documents", kb.document_count);
                printKeyValue("Chunks", kb.chunk_count);
                printKeyValue("Embedding Model", kb.embedding_model);
                printKeyValue("Chunk Size", kb.chunk_size);
                printKeyValue("Chunk Overlap", kb.chunk_overlap);
                printKeyValue("Created", formatDate(new Date(kb.created_at)));
                printKeyValue("Updated", formatDate(new Date(kb.updated_at)));

                console.log();
                console.log(chalk.gray(`Query with: fm kb query ${id} "your search query"`));
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    kbCmd
        .command("query <id> <query>")
        .description("Perform semantic search on a knowledge base")
        .option("-k, --top-k <number>", "Number of results to return", "5")
        .action(async (id: string, query: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const topK = parseInt(options.topK, 10);

                const response = await withSpinner(
                    "Searching knowledge base...",
                    () =>
                        post<ApiResponse<QueryResponse>>(`/api/v1/knowledge-bases/${id}/query`, {
                            query,
                            top_k: topK
                        }),
                    { successText: (r) => `Found ${r.data.results.length} results` }
                );

                const results = response.data.results;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output(response.data, { format: globalOpts.output });
                    return;
                }

                if (results.length === 0) {
                    console.log(chalk.yellow("No results found."));
                    return;
                }

                printSection(`Search Results for "${query}"`);
                console.log();

                for (let i = 0; i < results.length; i++) {
                    const result = results[i];
                    const scorePercent = Math.round(result.score * 100);
                    const scoreColor =
                        scorePercent >= 80
                            ? chalk.green
                            : scorePercent >= 60
                              ? chalk.yellow
                              : chalk.gray;

                    console.log(
                        chalk.bold(`${i + 1}. ${result.document_name}`) +
                            ` ${scoreColor(`[${scorePercent}%]`)}`
                    );
                    console.log(chalk.gray(`   ID: ${result.id}`));
                    console.log();

                    const content = result.content.trim();
                    const lines = content.split("\n").slice(0, 5);
                    const preview = lines.join("\n");
                    const truncated = lines.length < content.split("\n").length;

                    console.log(
                        preview
                            .split("\n")
                            .map((line) => `   ${line}`)
                            .join("\n")
                    );

                    if (truncated) {
                        console.log(chalk.gray("   ..."));
                    }

                    console.log();
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}
