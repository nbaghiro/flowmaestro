/**
 * Workflow Utils Tests
 *
 * Tests for workflow utility functions including provider extraction
 * from workflow nodes.
 */

import { describe, it, expect } from "vitest";

import { extractProvidersFromNodes } from "../workflowUtils";

describe("workflowUtils", () => {
    describe("extractProvidersFromNodes", () => {
        it("returns empty array for undefined nodes", () => {
            const result = extractProvidersFromNodes(undefined);
            expect(result).toEqual([]);
        });

        it("returns empty array for null nodes", () => {
            const result = extractProvidersFromNodes(null as unknown as undefined);
            expect(result).toEqual([]);
        });

        it("returns empty array for empty nodes object", () => {
            const result = extractProvidersFromNodes({});
            expect(result).toEqual([]);
        });

        it("extracts provider from llm node", () => {
            const nodes = {
                "node-1": {
                    type: "llm",
                    config: { provider: "openai" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("openai");
        });

        it("extracts provider from integration node", () => {
            const nodes = {
                "node-1": {
                    type: "integration",
                    config: { provider: "slack" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("slack");
        });

        it("extracts provider from vision node", () => {
            const nodes = {
                "node-1": {
                    type: "vision",
                    config: { provider: "anthropic" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("anthropic");
        });

        it("extracts provider from embeddings node", () => {
            const nodes = {
                "node-1": {
                    type: "embeddings",
                    config: { provider: "openai" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("openai");
        });

        it("extracts provider from audio nodes", () => {
            const nodes = {
                "node-1": {
                    type: "audio",
                    config: { provider: "elevenlabs" }
                },
                "node-2": {
                    type: "audioInput",
                    config: { provider: "whisper" }
                },
                "node-3": {
                    type: "audioOutput",
                    config: { provider: "elevenlabs" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("elevenlabs");
            expect(result).toContain("whisper");
        });

        it("extracts provider from router node", () => {
            const nodes = {
                "node-1": {
                    type: "router",
                    config: { provider: "openai" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("openai");
        });

        it("extracts provider from action node", () => {
            const nodes = {
                "node-1": {
                    type: "action",
                    config: { provider: "gmail" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("gmail");
        });

        it("extracts providerId from trigger node", () => {
            const nodes = {
                "node-1": {
                    type: "trigger",
                    config: { providerId: "webhook" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("webhook");
        });

        it("prefers provider over providerId when both present", () => {
            const nodes = {
                "node-1": {
                    type: "llm",
                    config: { provider: "anthropic", providerId: "legacy" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toContain("anthropic");
            expect(result).not.toContain("legacy");
        });

        it("ignores non-provider node types", () => {
            const nodes = {
                "node-1": {
                    type: "input",
                    config: { provider: "should-ignore" }
                },
                "node-2": {
                    type: "output",
                    config: { provider: "should-ignore-too" }
                },
                "node-3": {
                    type: "transform",
                    config: { provider: "also-ignore" }
                },
                "node-4": {
                    type: "comment",
                    config: {}
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toEqual([]);
        });

        it("returns unique providers (deduplicates)", () => {
            const nodes = {
                "node-1": {
                    type: "llm",
                    config: { provider: "openai" }
                },
                "node-2": {
                    type: "vision",
                    config: { provider: "openai" }
                },
                "node-3": {
                    type: "embeddings",
                    config: { provider: "openai" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toHaveLength(1);
            expect(result).toContain("openai");
        });

        it("extracts multiple different providers", () => {
            const nodes = {
                "node-1": {
                    type: "llm",
                    config: { provider: "openai" }
                },
                "node-2": {
                    type: "llm",
                    config: { provider: "anthropic" }
                },
                "node-3": {
                    type: "integration",
                    config: { provider: "slack" }
                },
                "node-4": {
                    type: "integration",
                    config: { provider: "gmail" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toHaveLength(4);
            expect(result).toContain("openai");
            expect(result).toContain("anthropic");
            expect(result).toContain("slack");
            expect(result).toContain("gmail");
        });

        it("handles nodes without config", () => {
            const nodes = {
                "node-1": {
                    type: "llm"
                    // no config
                }
            };

            const result = extractProvidersFromNodes(
                nodes as unknown as Record<string, { type: string; config?: { provider?: string } }>
            );
            expect(result).toEqual([]);
        });

        it("handles nodes with config but no provider", () => {
            const nodes = {
                "node-1": {
                    type: "llm",
                    config: { model: "gpt-4" }
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toEqual([]);
        });

        it("handles mixed nodes (some with providers, some without)", () => {
            const nodes = {
                "node-1": {
                    type: "llm",
                    config: { provider: "openai" }
                },
                "node-2": {
                    type: "input",
                    config: {}
                },
                "node-3": {
                    type: "integration",
                    config: { provider: "slack" }
                },
                "node-4": {
                    type: "output",
                    config: {}
                }
            };

            const result = extractProvidersFromNodes(nodes);
            expect(result).toHaveLength(2);
            expect(result).toContain("openai");
            expect(result).toContain("slack");
        });
    });
});
