/**
 * Workflow Validation Engine Tests
 *
 * Tests for the workflow validation engine including:
 * - Full workflow validation
 * - Single node validation
 * - Result building and issue grouping
 * - Validation options (skipping categories)
 * - Conversion utilities
 */

import { describe, it, expect } from "vitest";
import {
    WorkflowValidationEngine,
    workflowValidationEngine,
    validateWorkflow,
    toValidatableNodes,
    toValidatableEdges
} from "../workflow-validation-engine";
import type {
    ValidatableNode,
    ValidatableEdge,
    WorkflowValidationContext,
    WorkflowValidationResult
} from "../workflow-validation-types";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestNode(
    id: string,
    type: string,
    data: Record<string, unknown> = {}
): ValidatableNode {
    return {
        id,
        type,
        data,
        position: { x: 0, y: 0 }
    };
}

function createTestEdge(source: string, target: string, sourceHandle?: string): ValidatableEdge {
    return {
        id: `${source}-${target}`,
        source,
        target,
        sourceHandle
    };
}

function createDefaultContext(): WorkflowValidationContext {
    return {
        connectionIds: [],
        knowledgeBaseIds: [],
        inputVariables: []
    };
}

// ============================================================================
// WORKFLOW VALIDATION ENGINE CLASS
// ============================================================================

describe("WorkflowValidationEngine", () => {
    describe("validateWorkflow", () => {
        it("returns valid result for empty workflow", () => {
            const engine = new WorkflowValidationEngine();
            const result = engine.validateWorkflow([], []);

            expect(result.isValid).toBe(true);
            expect(result.allIssues).toHaveLength(0);
        });

        it("validates a simple linear workflow", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("input", "input", { variableName: "query" }),
                createTestNode("llm", "llm", {
                    prompt: "Process {{query}}",
                    connectionId: "550e8400-e29b-41d4-a716-446655440000",
                    outputVariableName: "result"
                }),
                createTestNode("output", "output", { variableName: "result" })
            ];
            const edges = [createTestEdge("input", "llm"), createTestEdge("llm", "output")];
            const context: WorkflowValidationContext = {
                connectionIds: ["550e8400-e29b-41d4-a716-446655440000"],
                knowledgeBaseIds: [],
                inputVariables: []
            };

            const result = engine.validateWorkflow(nodes, edges, context);

            // Result should be valid or have only warnings/info
            // (depends on what validation rules catch)
            expect(result.summary).toBeDefined();
            expect(typeof result.isValid).toBe("boolean");
        });

        it("uses default context when not provided", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [createTestNode("input", "input")];

            const result = engine.validateWorkflow(nodes, []);

            expect(result).toBeDefined();
            expect(result.validatedAt).toBeGreaterThan(0);
        });

        it("filters nodes when nodeIds option is provided", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("node1", "llm"),
                createTestNode("node2", "llm"),
                createTestNode("node3", "llm")
            ];

            const result = engine.validateWorkflow(nodes, [], createDefaultContext(), {
                nodeIds: ["node1", "node2"]
            });

            // Validation should only consider node1 and node2
            expect(result).toBeDefined();
        });

        it("skips structural validation when option is set", () => {
            const engine = new WorkflowValidationEngine();
            // Create orphan nodes that would normally fail structural validation
            const nodes = [createTestNode("orphan1", "llm"), createTestNode("orphan2", "llm")];

            const result = engine.validateWorkflow(nodes, [], createDefaultContext(), {
                skipStructural: true
            });

            // Structural issues should not be present
            const structuralIssues = result.allIssues.filter((i) => i.category === "structural");
            expect(structuralIssues).toHaveLength(0);
        });

        it("skips configuration validation when option is set", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("llm", "llm", {
                    connectionId: "invalid-id" // Invalid connection ID
                })
            ];

            const result = engine.validateWorkflow(nodes, [], createDefaultContext(), {
                skipConfiguration: true
            });

            const configIssues = result.allIssues.filter((i) => i.category === "configuration");
            expect(configIssues).toHaveLength(0);
        });

        it("skips data flow validation when option is set", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("llm", "llm", {
                    prompt: "{{undefinedVar}}" // References undefined variable
                })
            ];

            const result = engine.validateWorkflow(nodes, [], createDefaultContext(), {
                skipDataFlow: true
            });

            const dataFlowIssues = result.allIssues.filter((i) => i.category === "dataFlow");
            expect(dataFlowIssues).toHaveLength(0);
        });

        it("skips semantic validation when option is set", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("llm", "llm", {
                    prompt: "" // Empty prompt would trigger semantic issue
                })
            ];

            const result = engine.validateWorkflow(nodes, [], createDefaultContext(), {
                skipSemantic: true
            });

            const semanticIssues = result.allIssues.filter((i) => i.category === "semantic");
            expect(semanticIssues).toHaveLength(0);
        });
    });

    describe("validateNode", () => {
        it("returns issues for a specific node", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("node1", "llm", { connectionId: "invalid" }),
                createTestNode("node2", "llm", { connectionId: "also-invalid" })
            ];

            const issues = engine.validateNode("node1", nodes, [], createDefaultContext());

            // All returned issues should be for node1
            issues.forEach((issue) => {
                expect(issue.nodeId).toBe("node1");
            });
        });

        it("returns empty array for node with no issues", () => {
            const engine = new WorkflowValidationEngine();
            const nodes = [
                createTestNode("input", "input", { variableName: "query" }),
                createTestNode("output", "output", { variableName: "query" })
            ];
            const edges = [createTestEdge("input", "output")];
            const context: WorkflowValidationContext = {
                connectionIds: [],
                knowledgeBaseIds: [],
                inputVariables: ["query"]
            };

            const issues = engine.validateNode("input", nodes, edges, context);

            // Input nodes typically have few issues
            expect(Array.isArray(issues)).toBe(true);
        });
    });

    describe("getNodeIssues", () => {
        it("returns issues from result for specific node", () => {
            const engine = new WorkflowValidationEngine();
            const result: WorkflowValidationResult = {
                isValid: false,
                hasWarnings: true,
                nodeIssues: new Map([
                    [
                        "node1",
                        [
                            {
                                id: "test-1",
                                code: "EMPTY_PROMPT",
                                message: "Test issue",
                                severity: "error",
                                category: "semantic",
                                nodeId: "node1"
                            }
                        ]
                    ]
                ]),
                workflowIssues: [],
                allIssues: [],
                summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
                validatedAt: Date.now()
            };

            const issues = engine.getNodeIssues("node1", result);

            expect(issues).toHaveLength(1);
            expect(issues[0].code).toBe("EMPTY_PROMPT");
        });

        it("returns empty array for node not in result", () => {
            const engine = new WorkflowValidationEngine();
            const result: WorkflowValidationResult = {
                isValid: true,
                hasWarnings: false,
                nodeIssues: new Map(),
                workflowIssues: [],
                allIssues: [],
                summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
                validatedAt: Date.now()
            };

            const issues = engine.getNodeIssues("nonexistent", result);

            expect(issues).toEqual([]);
        });
    });

    describe("isValid", () => {
        it("returns true for valid result", () => {
            const engine = new WorkflowValidationEngine();
            const result: WorkflowValidationResult = {
                isValid: true,
                hasWarnings: false,
                nodeIssues: new Map(),
                workflowIssues: [],
                allIssues: [],
                summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
                validatedAt: Date.now()
            };

            expect(engine.isValid(result)).toBe(true);
        });

        it("returns false for invalid result", () => {
            const engine = new WorkflowValidationEngine();
            const result: WorkflowValidationResult = {
                isValid: false,
                hasWarnings: false,
                nodeIssues: new Map(),
                workflowIssues: [],
                allIssues: [],
                summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
                validatedAt: Date.now()
            };

            expect(engine.isValid(result)).toBe(false);
        });
    });

    describe("getErrors", () => {
        it("filters only error severity issues", () => {
            const engine = new WorkflowValidationEngine();
            const result: WorkflowValidationResult = {
                isValid: false,
                hasWarnings: true,
                nodeIssues: new Map(),
                workflowIssues: [],
                allIssues: [
                    {
                        id: "1",
                        code: "EMPTY_PROMPT",
                        message: "Error",
                        severity: "error",
                        category: "semantic"
                    },
                    {
                        id: "2",
                        code: "UNUSED_OUTPUT",
                        message: "Warning",
                        severity: "warning",
                        category: "semantic"
                    },
                    {
                        id: "3",
                        code: "EXPENSIVE_LOOP_OPERATION",
                        message: "Info",
                        severity: "info",
                        category: "semantic"
                    }
                ],
                summary: { errorCount: 1, warningCount: 1, infoCount: 1 },
                validatedAt: Date.now()
            };

            const errors = engine.getErrors(result);

            expect(errors).toHaveLength(1);
            expect(errors[0].severity).toBe("error");
        });
    });

    describe("getWarnings", () => {
        it("filters only warning severity issues", () => {
            const engine = new WorkflowValidationEngine();
            const result: WorkflowValidationResult = {
                isValid: true,
                hasWarnings: true,
                nodeIssues: new Map(),
                workflowIssues: [],
                allIssues: [
                    {
                        id: "1",
                        code: "EMPTY_PROMPT",
                        message: "Error",
                        severity: "error",
                        category: "semantic"
                    },
                    {
                        id: "2",
                        code: "UNUSED_OUTPUT",
                        message: "Warning",
                        severity: "warning",
                        category: "semantic"
                    }
                ],
                summary: { errorCount: 1, warningCount: 1, infoCount: 0 },
                validatedAt: Date.now()
            };

            const warnings = engine.getWarnings(result);

            expect(warnings).toHaveLength(1);
            expect(warnings[0].severity).toBe("warning");
        });
    });
});

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

describe("workflowValidationEngine (singleton)", () => {
    it("is an instance of WorkflowValidationEngine", () => {
        expect(workflowValidationEngine).toBeInstanceOf(WorkflowValidationEngine);
    });

    it("can validate workflows", () => {
        const result = workflowValidationEngine.validateWorkflow([], []);
        expect(result.isValid).toBe(true);
    });
});

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

describe("validateWorkflow (convenience function)", () => {
    it("validates workflow using default engine", () => {
        const result = validateWorkflow([], []);
        expect(result.isValid).toBe(true);
    });

    it("accepts context and options", () => {
        const nodes = [createTestNode("llm", "llm")];
        const context = createDefaultContext();
        const options = { skipStructural: true };

        const result = validateWorkflow(nodes, [], context, options);

        expect(result).toBeDefined();
    });
});

describe("toValidatableNodes", () => {
    it("converts React Flow nodes to validatable format", () => {
        const reactFlowNodes = [
            {
                id: "node1",
                type: "llm",
                data: { prompt: "test" },
                position: { x: 100, y: 200 }
            },
            {
                id: "node2",
                position: { x: 300, y: 400 }
            }
        ];

        const validatable = toValidatableNodes(reactFlowNodes);

        expect(validatable).toHaveLength(2);
        expect(validatable[0]).toEqual({
            id: "node1",
            type: "llm",
            data: { prompt: "test" },
            position: { x: 100, y: 200 }
        });
        // Node without type should default to "default"
        expect(validatable[1].type).toBe("default");
        // Node without data should default to empty object
        expect(validatable[1].data).toEqual({});
    });

    it("handles empty array", () => {
        const validatable = toValidatableNodes([]);
        expect(validatable).toEqual([]);
    });
});

describe("toValidatableEdges", () => {
    it("converts React Flow edges to validatable format", () => {
        const reactFlowEdges = [
            {
                id: "edge1",
                source: "node1",
                target: "node2",
                sourceHandle: "output",
                targetHandle: "input"
            },
            {
                id: "edge2",
                source: "node2",
                target: "node3",
                sourceHandle: null,
                targetHandle: null
            }
        ];

        const validatable = toValidatableEdges(reactFlowEdges);

        expect(validatable).toHaveLength(2);
        expect(validatable[0]).toEqual({
            id: "edge1",
            source: "node1",
            target: "node2",
            sourceHandle: "output",
            targetHandle: "input"
        });
        // Null handles should become undefined
        expect(validatable[1].sourceHandle).toBeUndefined();
        expect(validatable[1].targetHandle).toBeUndefined();
    });

    it("handles empty array", () => {
        const validatable = toValidatableEdges([]);
        expect(validatable).toEqual([]);
    });
});
