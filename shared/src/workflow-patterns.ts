// Workflow pattern definitions for the pattern selection flow
// These are starter templates displayed in the Create Workflow dialog

import type { WorkflowDefinition } from "./types";

export interface WorkflowPattern {
    id: string;
    name: string;
    description: string;
    useCase: string;
    icon: string;
    nodeCount: number;
    category: "basic" | "intermediate" | "advanced";
    integrations?: string[];
    definition: WorkflowDefinition;
}

// ============================================================================
// BASIC PATTERNS (11 patterns)
// Simple foundational patterns for learning workflow concepts
// ============================================================================

// Basic Pattern 1: Simple Chat
// Basic Pattern 1: Chain of Thought
const chainOfThoughtPattern: WorkflowPattern = {
    id: "chain-of-thought",
    name: "Chain of Thought",
    description: "Multi-step reasoning with sequential LLM calls",
    useCase: "Complex reasoning",
    icon: "Link",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Chain of Thought",
        nodes: {
            "input-1": {
                type: "input",
                name: "Problem",
                config: {
                    inputName: "problem",
                    inputVariable: "problem",
                    inputType: "text",
                    required: true,
                    description: "The problem or question to reason about"
                },
                position: { x: 100, y: 140 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an analytical assistant. Break down the problem into its key components.",
                    prompt: "Analyze this problem and identify the key components:\n\n{{problem}}",
                    temperature: 0.3,
                    maxTokens: 1024,
                    outputVariable: "analysis"
                },
                position: { x: 480, y: 180 }
            },
            "llm-reason": {
                type: "llm",
                name: "Reason",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a logical reasoning assistant. Given an analysis, think through the implications step by step.",
                    prompt: "Based on this analysis:\n{{analysis.text}}\n\nReason through the problem step by step.",
                    temperature: 0.3,
                    maxTokens: 1024,
                    outputVariable: "reasoning"
                },
                position: { x: 860, y: 140 }
            },
            "llm-synthesize": {
                type: "llm",
                name: "Synthesize",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a synthesis assistant. Combine analysis and reasoning into a clear, actionable conclusion.",
                    prompt: "Analysis:\n{{analysis.text}}\n\nReasoning:\n{{reasoning.text}}\n\nSynthesize these into a clear conclusion.",
                    temperature: 0.5,
                    maxTokens: 1024,
                    outputVariable: "conclusion"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Conclusion",
                config: {
                    outputName: "conclusion",
                    value: "{{conclusion.text}}",
                    format: "string",
                    description: "The synthesized conclusion"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-analyze" },
            { id: "edge-2", source: "llm-analyze", target: "llm-reason" },
            { id: "edge-3", source: "llm-reason", target: "llm-synthesize" },
            { id: "edge-4", source: "llm-synthesize", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 3: Smart Router
const smartRouterPattern: WorkflowPattern = {
    id: "smart-router",
    name: "Smart Router",
    description: "Route requests to specialized handlers based on content",
    useCase: "Dynamic routing",
    icon: "GitBranch",
    nodeCount: 6,
    category: "basic",
    definition: {
        name: "Smart Router",
        nodes: {
            "input-1": {
                type: "input",
                name: "Request",
                config: {
                    inputName: "request",
                    inputVariable: "request",
                    inputType: "text",
                    required: true,
                    description: "The incoming request to route"
                },
                position: { x: 100, y: 300 }
            },
            "router-1": {
                type: "router",
                name: "Intent Router",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "You are a request classifier. Analyze the request and classify it into one of the available categories.",
                    prompt: "{{request}}",
                    temperature: 0.1,
                    routes: [
                        {
                            value: "technical",
                            label: "Technical",
                            description: "Technical questions, debugging, code issues"
                        },
                        {
                            value: "general",
                            label: "General",
                            description: "General questions and information"
                        },
                        {
                            value: "creative",
                            label: "Creative",
                            description: "Creative writing, brainstorming, ideas"
                        }
                    ],
                    defaultRoute: "general",
                    outputVariable: "routeResult"
                },
                position: { x: 480, y: 340 }
            },
            "llm-technical": {
                type: "llm",
                name: "Technical Expert",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a technical expert. Provide detailed, accurate technical answers.",
                    prompt: "{{request}}",
                    temperature: 0.3,
                    maxTokens: 2048,
                    outputVariable: "technicalResponse"
                },
                position: { x: 860, y: 500 }
            },
            "llm-general": {
                type: "llm",
                name: "General Assistant",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a helpful general assistant. Provide clear, friendly responses.",
                    prompt: "{{request}}",
                    temperature: 0.7,
                    maxTokens: 2048,
                    outputVariable: "generalResponse"
                },
                position: { x: 860, y: 300 }
            },
            "llm-creative": {
                type: "llm",
                name: "Creative Writer",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a creative assistant. Be imaginative, engaging, and original.",
                    prompt: "{{request}}",
                    temperature: 0.9,
                    maxTokens: 2048,
                    outputVariable: "creativeResponse"
                },
                position: { x: 860, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Response",
                config: {
                    outputName: "response",
                    value: "{{technicalResponse.text || generalResponse.text || creativeResponse.text}}",
                    format: "string",
                    description: "The routed response"
                },
                position: { x: 1240, y: 260 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "router-1" },
            {
                id: "edge-2",
                source: "router-1",
                target: "llm-technical",
                sourceHandle: "technical"
            },
            { id: "edge-3", source: "router-1", target: "llm-general", sourceHandle: "general" },
            { id: "edge-4", source: "router-1", target: "llm-creative", sourceHandle: "creative" },
            { id: "edge-5", source: "llm-technical", target: "output-1" },
            { id: "edge-6", source: "llm-general", target: "output-1" },
            { id: "edge-7", source: "llm-creative", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 4: Self-Improving
const selfImprovingPattern: WorkflowPattern = {
    id: "self-improving",
    name: "Self-Improving",
    description: "Generate content, critique it, then refine based on feedback",
    useCase: "Quality improvement",
    icon: "RefreshCw",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Self-Improving",
        nodes: {
            "input-1": {
                type: "input",
                name: "Task",
                config: {
                    inputName: "task",
                    inputVariable: "task",
                    inputType: "text",
                    required: true,
                    description: "The task to complete"
                },
                position: { x: 100, y: 140 }
            },
            "llm-generate": {
                type: "llm",
                name: "Generate",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a skilled content creator. Complete the task to the best of your ability.",
                    prompt: "Task: {{task}}\n\nComplete this task:",
                    temperature: 0.7,
                    maxTokens: 2048,
                    outputVariable: "draft"
                },
                position: { x: 480, y: 180 }
            },
            "llm-critique": {
                type: "llm",
                name: "Critique",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a critical reviewer. Identify specific weaknesses and suggest improvements.",
                    prompt: "Original task: {{task}}\n\nDraft:\n{{draft.text}}\n\nProvide constructive criticism and specific improvement suggestions:",
                    temperature: 0.3,
                    maxTokens: 1024,
                    outputVariable: "critique"
                },
                position: { x: 860, y: 140 }
            },
            "llm-refine": {
                type: "llm",
                name: "Refine",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an editor. Incorporate the feedback to create an improved version.",
                    prompt: "Original task: {{task}}\n\nDraft:\n{{draft.text}}\n\nCritique:\n{{critique.text}}\n\nCreate an improved version:",
                    temperature: 0.5,
                    maxTokens: 2048,
                    outputVariable: "refined"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Final Output",
                config: {
                    outputName: "finalOutput",
                    value: "{{refined.text}}",
                    format: "string",
                    description: "The refined output"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-generate" },
            { id: "edge-2", source: "llm-generate", target: "llm-critique" },
            { id: "edge-3", source: "llm-critique", target: "llm-refine" },
            { id: "edge-4", source: "llm-refine", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 5: Research Agent
const researchAgentPattern: WorkflowPattern = {
    id: "research-agent",
    name: "Research Agent",
    description: "Search knowledge bases and synthesize findings",
    useCase: "Knowledge retrieval",
    icon: "Search",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Research Agent",
        nodes: {
            "input-1": {
                type: "input",
                name: "Research Query",
                config: {
                    inputName: "query",
                    inputVariable: "query",
                    inputType: "text",
                    required: true,
                    description: "The research question"
                },
                position: { x: 100, y: 140 }
            },
            "kb-1": {
                type: "knowledgeBaseQuery",
                name: "Search Knowledge Base",
                config: {
                    knowledgeBaseId: "{{env.KNOWLEDGE_BASE_ID}}",
                    queryText: "{{query}}",
                    topK: 5,
                    similarityThreshold: 0.7,
                    outputVariable: "searchResults"
                },
                position: { x: 480, y: 180 }
            },
            "llm-synthesize": {
                type: "llm",
                name: "Synthesize Findings",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a research analyst. Synthesize the search results into a comprehensive answer.",
                    prompt: "Query: {{query}}\n\nSearch Results:\n{{searchResults.results}}\n\nSynthesize these findings into a comprehensive answer:",
                    temperature: 0.4,
                    maxTokens: 2048,
                    outputVariable: "synthesis"
                },
                position: { x: 860, y: 140 }
            },
            "output-1": {
                type: "output",
                name: "Research Results",
                config: {
                    outputName: "results",
                    value: "{{synthesis.text}}",
                    format: "string",
                    description: "Synthesized research findings"
                },
                position: { x: 1240, y: 100 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "kb-1" },
            { id: "edge-2", source: "kb-1", target: "llm-synthesize" },
            { id: "edge-3", source: "llm-synthesize", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 6: Quality Reviewer
const qualityReviewerPattern: WorkflowPattern = {
    id: "quality-reviewer",
    name: "Quality Reviewer",
    description: "Generate and evaluate content until quality threshold met",
    useCase: "Quality assurance",
    icon: "CheckCircle",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Quality Reviewer",
        nodes: {
            "input-1": {
                type: "input",
                name: "Content Request",
                config: {
                    inputName: "request",
                    inputVariable: "request",
                    inputType: "text",
                    required: true,
                    description: "What content to create"
                },
                position: { x: 100, y: 200 }
            },
            "llm-generate": {
                type: "llm",
                name: "Generate Content",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a professional content writer. Create high-quality content as requested.",
                    prompt: "Create the following content:\n\n{{request}}",
                    temperature: 0.7,
                    maxTokens: 2048,
                    outputVariable: "content"
                },
                position: { x: 480, y: 200 }
            },
            "llm-evaluate": {
                type: "llm",
                name: "Evaluate Quality",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        'You are a quality evaluator. Rate the content on a scale of 1-10 and provide feedback. Respond with JSON: {"score": N, "feedback": "..."}',
                    prompt: "Request: {{request}}\n\nContent:\n{{content.text}}\n\nEvaluate the quality:",
                    temperature: 0.2,
                    maxTokens: 512,
                    outputVariable: "evaluation"
                },
                position: { x: 860, y: 200 }
            },
            "conditional-quality": {
                type: "conditional",
                name: "Quality Check",
                config: {
                    conditionType: "expression",
                    expression:
                        "evaluation.text.includes('\"score\": 8') || evaluation.text.includes('\"score\": 9') || evaluation.text.includes('\"score\": 10')",
                    outputVariable: "passesQuality"
                },
                position: { x: 1240, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Final Content",
                config: {
                    outputName: "content",
                    value: "{{content.text}}",
                    format: "string",
                    description: "Quality-checked content"
                },
                position: { x: 1620, y: 100 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-generate" },
            { id: "edge-2", source: "llm-generate", target: "llm-evaluate" },
            { id: "edge-3", source: "llm-evaluate", target: "conditional-quality" },
            {
                id: "edge-4",
                source: "conditional-quality",
                target: "output-1",
                sourceHandle: "true"
            },
            {
                id: "edge-5",
                source: "conditional-quality",
                target: "llm-generate",
                sourceHandle: "false"
            }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 7: Parallel Analyzer
const parallelAnalyzerPattern: WorkflowPattern = {
    id: "parallel-analyzer",
    name: "Parallel Analyzer",
    description: "Analyze input from multiple perspectives simultaneously",
    useCase: "Multi-perspective analysis",
    icon: "Layers",
    nodeCount: 6,
    category: "basic",
    definition: {
        name: "Parallel Analyzer",
        nodes: {
            "input-1": {
                type: "input",
                name: "Content to Analyze",
                config: {
                    inputName: "content",
                    inputVariable: "content",
                    inputType: "text",
                    required: true,
                    description: "Content for multi-perspective analysis"
                },
                position: { x: 100, y: 300 }
            },
            "llm-technical": {
                type: "llm",
                name: "Technical Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a technical analyst. Focus on technical accuracy, implementation details, and feasibility.",
                    prompt: "Analyze from a technical perspective:\n\n{{content}}",
                    temperature: 0.3,
                    maxTokens: 1024,
                    outputVariable: "technicalAnalysis"
                },
                position: { x: 480, y: 500 }
            },
            "llm-business": {
                type: "llm",
                name: "Business Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a business analyst. Focus on business value, ROI, and strategic implications.",
                    prompt: "Analyze from a business perspective:\n\n{{content}}",
                    temperature: 0.5,
                    maxTokens: 1024,
                    outputVariable: "businessAnalysis"
                },
                position: { x: 480, y: 340 }
            },
            "llm-risk": {
                type: "llm",
                name: "Risk Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a risk analyst. Identify potential risks, challenges, and mitigation strategies.",
                    prompt: "Analyze from a risk perspective:\n\n{{content}}",
                    temperature: 0.3,
                    maxTokens: 1024,
                    outputVariable: "riskAnalysis"
                },
                position: { x: 480, y: 100 }
            },
            "llm-synthesize": {
                type: "llm",
                name: "Synthesize",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a senior analyst. Synthesize multiple analyses into a comprehensive summary.",
                    prompt: "Technical Analysis:\n{{technicalAnalysis.text}}\n\nBusiness Analysis:\n{{businessAnalysis.text}}\n\nRisk Analysis:\n{{riskAnalysis.text}}\n\nSynthesize into a comprehensive analysis:",
                    temperature: 0.5,
                    maxTokens: 2048,
                    outputVariable: "synthesis"
                },
                position: { x: 860, y: 300 }
            },
            "output-1": {
                type: "output",
                name: "Analysis Report",
                config: {
                    outputName: "report",
                    value: "{{synthesis.text}}",
                    format: "string",
                    description: "Comprehensive multi-perspective analysis"
                },
                position: { x: 1240, y: 260 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-technical" },
            { id: "edge-2", source: "input-1", target: "llm-business" },
            { id: "edge-3", source: "input-1", target: "llm-risk" },
            { id: "edge-4", source: "llm-technical", target: "llm-synthesize" },
            { id: "edge-5", source: "llm-business", target: "llm-synthesize" },
            { id: "edge-6", source: "llm-risk", target: "llm-synthesize" },
            { id: "edge-7", source: "llm-synthesize", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 8: Supervised Agent
const supervisedAgentPattern: WorkflowPattern = {
    id: "supervised-agent",
    name: "Supervised Agent",
    description: "AI proposes actions, human reviews before execution",
    useCase: "Human-in-the-loop",
    icon: "UserCheck",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Supervised Agent",
        nodes: {
            "input-1": {
                type: "input",
                name: "Task Request",
                config: {
                    inputName: "task",
                    inputVariable: "task",
                    inputType: "text",
                    required: true,
                    description: "Task for supervised execution"
                },
                position: { x: 100, y: 140 }
            },
            "llm-propose": {
                type: "llm",
                name: "Propose Action",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a careful AI assistant. Analyze the task and propose a detailed action plan for human review.",
                    prompt: "Task: {{task}}\n\nPropose a detailed action plan:",
                    temperature: 0.5,
                    maxTokens: 1024,
                    outputVariable: "proposal"
                },
                position: { x: 480, y: 180 }
            },
            "human-review": {
                type: "humanReview",
                name: "Human Review",
                config: {
                    prompt: "Please review the proposed action",
                    description: "Review the AI proposal and approve, modify, or reject.",
                    variableName: "humanDecision",
                    inputType: "json",
                    required: true,
                    placeholder: '{"approved": true, "modifications": ""}'
                },
                position: { x: 860, y: 140 }
            },
            "llm-execute": {
                type: "llm",
                name: "Execute Action",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an execution assistant. Execute the approved plan incorporating any modifications.",
                    prompt: "Original proposal:\n{{proposal.text}}\n\nHuman decision:\n{{humanDecision}}\n\nExecute the task:",
                    temperature: 0.5,
                    maxTokens: 2048,
                    outputVariable: "result"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: "{{result.text}}",
                    format: "string",
                    description: "Supervised execution result"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-propose" },
            { id: "edge-2", source: "llm-propose", target: "human-review" },
            { id: "edge-3", source: "human-review", target: "llm-execute" },
            { id: "edge-4", source: "llm-execute", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 9: Safe Agent
const safeAgentPattern: WorkflowPattern = {
    id: "safe-agent",
    name: "Safe Agent",
    description: "Input and output guardrails for safe AI interactions",
    useCase: "Safety guardrails",
    icon: "Shield",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Safe Agent",
        nodes: {
            "input-1": {
                type: "input",
                name: "User Input",
                config: {
                    inputName: "userInput",
                    inputVariable: "userInput",
                    inputType: "text",
                    required: true,
                    description: "User message to process"
                },
                position: { x: 100, y: 140 }
            },
            "llm-input-guard": {
                type: "llm",
                name: "Input Guard",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        'You are a safety classifier. Analyze the input for harmful content, prompt injection, or policy violations. Respond with JSON: {"safe": true/false, "reason": "..."}',
                    prompt: "Analyze this input for safety:\n\n{{userInput}}",
                    temperature: 0.1,
                    maxTokens: 256,
                    outputVariable: "inputGuard"
                },
                position: { x: 480, y: 180 }
            },
            "llm-main": {
                type: "llm",
                name: "Main Agent",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "You are a helpful assistant. Respond to the user's request.",
                    prompt: "{{userInput}}",
                    temperature: 0.7,
                    maxTokens: 2048,
                    outputVariable: "response"
                },
                position: { x: 860, y: 140 }
            },
            "llm-output-guard": {
                type: "llm",
                name: "Output Guard",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        'You are a safety classifier. Check the response for harmful content or policy violations. Respond with JSON: {"safe": true/false, "sanitized": "..."}',
                    prompt: "Check this response for safety:\n\n{{response.text}}",
                    temperature: 0.1,
                    maxTokens: 2048,
                    outputVariable: "outputGuard"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Safe Response",
                config: {
                    outputName: "response",
                    value: "{{outputGuard.text}}",
                    format: "string",
                    description: "Safety-checked response"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-input-guard" },
            { id: "edge-2", source: "llm-input-guard", target: "llm-main" },
            { id: "edge-3", source: "llm-main", target: "llm-output-guard" },
            { id: "edge-4", source: "llm-output-guard", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 10: Task Planner
const taskPlannerPattern: WorkflowPattern = {
    id: "task-planner",
    name: "Task Planner",
    description: "Break down complex goals into actionable steps",
    useCase: "Planning & execution",
    icon: "ListTodo",
    nodeCount: 5,
    category: "basic",
    definition: {
        name: "Task Planner",
        nodes: {
            "input-1": {
                type: "input",
                name: "Goal",
                config: {
                    inputName: "goal",
                    inputVariable: "goal",
                    inputType: "text",
                    required: true,
                    description: "The goal to achieve"
                },
                position: { x: 100, y: 140 }
            },
            "llm-plan": {
                type: "llm",
                name: "Create Plan",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a strategic planner. Break down goals into clear, actionable steps. Return a numbered list of steps.",
                    prompt: "Goal: {{goal}}\n\nCreate a detailed action plan with numbered steps:",
                    temperature: 0.5,
                    maxTokens: 1024,
                    outputVariable: "plan"
                },
                position: { x: 480, y: 180 }
            },
            "llm-execute": {
                type: "llm",
                name: "Execute Steps",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an execution assistant. Work through each step of the plan and provide results.",
                    prompt: "Goal: {{goal}}\n\nPlan:\n{{plan.text}}\n\nExecute each step and provide results:",
                    temperature: 0.5,
                    maxTokens: 2048,
                    outputVariable: "execution"
                },
                position: { x: 860, y: 140 }
            },
            "llm-summarize": {
                type: "llm",
                name: "Summarize Results",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a results summarizer. Provide a clear summary of what was accomplished.",
                    prompt: "Goal: {{goal}}\n\nExecution results:\n{{execution.text}}\n\nProvide a clear summary:",
                    temperature: 0.5,
                    maxTokens: 1024,
                    outputVariable: "summary"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Results",
                config: {
                    outputName: "results",
                    value: "{{summary.text}}",
                    format: "string",
                    description: "Task execution summary"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-plan" },
            { id: "edge-2", source: "llm-plan", target: "llm-execute" },
            { id: "edge-3", source: "llm-execute", target: "llm-summarize" },
            { id: "edge-4", source: "llm-summarize", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Basic Pattern 11: Blank Workflow
const blankWorkflowPattern: WorkflowPattern = {
    id: "blank",
    name: "Blank Workflow",
    description: "Start from scratch with input, LLM, and output nodes",
    useCase: "Custom workflow",
    icon: "Plus",
    nodeCount: 3,
    category: "basic",
    definition: {
        name: "New Workflow",
        nodes: {
            "input-1": {
                type: "input",
                name: "User Input",
                config: {
                    inputName: "userInput",
                    inputVariable: "userInput",
                    inputType: "text",
                    required: true,
                    description: "The input from the user"
                },
                position: { x: 100, y: 100 }
            },
            "llm-1": {
                type: "llm",
                name: "AI Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a helpful assistant. Answer the user's question clearly and concisely.",
                    prompt: "{{userInput}}",
                    temperature: 0.7,
                    maxTokens: 2048,
                    outputVariable: "aiResponse"
                },
                position: { x: 480, y: 140 }
            },
            "output-1": {
                type: "output",
                name: "Response",
                config: {
                    outputName: "response",
                    value: "{{aiResponse.text}}",
                    format: "string",
                    description: "The AI-generated response"
                },
                position: { x: 860, y: 100 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-1" },
            { id: "edge-2", source: "llm-1", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// ============================================================================
// INTERMEDIATE PATTERNS (6 patterns)
// Integration-focused patterns with external services
// ============================================================================

// Intermediate Pattern 1: Discord Community Bot
// Complex hub-and-spoke pattern with parallel processing and multiple integrations
const discordCommunityBotPattern: WorkflowPattern = {
    id: "discord-community-bot",
    name: "Discord Community Bot",
    description:
        "Monitor Discord channels, categorize feedback with AI, route to appropriate teams via Slack, log to Notion, track in Airtable, and send email digests",
    useCase: "Community management",
    icon: "MessageCircle",
    nodeCount: 14,
    category: "intermediate",
    integrations: ["Discord", "Notion", "Slack", "Airtable", "Gmail"],
    definition: {
        name: "Discord Community Bot",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Discord Message",
                config: {
                    triggerType: "webhook",
                    provider: "discord",
                    event: "message",
                    outputVariable: "discordMessage",
                    description: "Triggered when a message is received in Discord"
                },
                position: { x: 100, y: 350 }
            },
            "llm-categorize": {
                type: "llm",
                name: "Categorize & Analyze",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a community feedback analyst. Categorize Discord messages, extract insights, and identify actionable items.",
                    prompt: 'Analyze this Discord message:\n\nAuthor: {{discordMessage.author}}\nChannel: {{discordMessage.channel}}\nContent: {{discordMessage.content}}\n\nReturn JSON: {"category": "bug/feature/question/praise/complaint/support", "sentiment": "positive/neutral/negative", "priority": "critical/high/medium/low", "summary": "brief summary", "actionRequired": true/false, "suggestedTeam": "engineering/product/support/marketing", "keywords": []}',
                    temperature: 0.2,
                    maxTokens: 600,
                    outputVariable: "categorization"
                },
                position: { x: 480, y: 350 }
            },
            "router-1": {
                type: "router",
                name: "Route by Category",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{categorization.category}}",
                    routes: [
                        { value: "bug", label: "Bug Report", description: "Technical issues" },
                        {
                            value: "feature",
                            label: "Feature Request",
                            description: "New feature ideas"
                        },
                        { value: "support", label: "Support", description: "Help requests" },
                        { value: "other", label: "Other", description: "General feedback" }
                    ],
                    defaultRoute: "other",
                    outputVariable: "routeResult"
                },
                position: { x: 860, y: 350 }
            },
            "action-notion-bug": {
                type: "action",
                name: "Create Bug Ticket",
                config: {
                    provider: "notion",
                    action: "createPage",
                    databaseId: "{{env.NOTION_BUGS_DB}}",
                    properties: {
                        title: "[Discord] {{categorization.summary}}",
                        priority: "{{categorization.priority}}",
                        source: "Discord",
                        reporter: "{{discordMessage.author}}"
                    },
                    outputVariable: "notionBug"
                },
                position: { x: 1240, y: 100 }
            },
            "action-notion-feature": {
                type: "action",
                name: "Log Feature Request",
                config: {
                    provider: "notion",
                    action: "createPage",
                    databaseId: "{{env.NOTION_FEATURES_DB}}",
                    properties: {
                        title: "{{categorization.summary}}",
                        votes: 1,
                        source: "Discord"
                    },
                    outputVariable: "notionFeature"
                },
                position: { x: 1240, y: 280 }
            },
            "action-slack-support": {
                type: "action",
                name: "Alert Support Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#support-queue",
                    text: "🆘 Support request from Discord\n\n*User:* {{discordMessage.author}}\n*Summary:* {{categorization.summary}}\n*Priority:* {{categorization.priority}}",
                    outputVariable: "slackSupport"
                },
                position: { x: 1240, y: 450 }
            },
            "action-airtable": {
                type: "action",
                name: "Track in Airtable",
                config: {
                    provider: "airtable",
                    action: "createRecord",
                    baseId: "{{env.AIRTABLE_FEEDBACK_BASE}}",
                    tableId: "Community Feedback",
                    fields: {
                        Summary: "{{categorization.summary}}",
                        Category: "{{categorization.category}}",
                        Sentiment: "{{categorization.sentiment}}",
                        Priority: "{{categorization.priority}}",
                        Source: "Discord",
                        Keywords: "{{categorization.keywords}}"
                    },
                    outputVariable: "airtableRecord"
                },
                position: { x: 1240, y: 620 }
            },
            "action-slack-eng": {
                type: "action",
                name: "Notify Engineering",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#engineering-bugs",
                    text: "🐛 New bug from Discord\n\n*Summary:* {{categorization.summary}}\n*Priority:* {{categorization.priority}}\n*Notion:* {{notionBug.url}}",
                    outputVariable: "slackEng"
                },
                position: { x: 1620, y: 100 }
            },
            "action-slack-product": {
                type: "action",
                name: "Notify Product",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#product-feedback",
                    text: "💡 Feature request from Discord\n\n*Summary:* {{categorization.summary}}\n*Notion:* {{notionFeature.url}}",
                    outputVariable: "slackProduct"
                },
                position: { x: 1620, y: 280 }
            },
            "action-discord-reply": {
                type: "action",
                name: "Send Acknowledgment",
                config: {
                    provider: "discord",
                    action: "sendMessage",
                    channelId: "{{discordMessage.channelId}}",
                    content:
                        "Thanks for your feedback! We've logged this and our {{categorization.suggestedTeam}} team will review it.",
                    outputVariable: "discordReply"
                },
                position: { x: 2000, y: 350 }
            },
            "conditional-digest": {
                type: "conditional",
                name: "High Priority?",
                config: {
                    conditionType: "expression",
                    expression:
                        'categorization.text.includes(\'"priority": "critical"\') || categorization.text.includes(\'"priority": "high"\')',
                    outputVariable: "isHighPriority"
                },
                position: { x: 2000, y: 550 }
            },
            "action-gmail": {
                type: "action",
                name: "Email Alert",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{env.ALERTS_EMAIL}}",
                    subject: "[URGENT] High priority Discord feedback: {{categorization.summary}}",
                    body: "A high priority item requires attention.\n\nCategory: {{categorization.category}}\nSentiment: {{categorization.sentiment}}\nOriginal message: {{discordMessage.content}}",
                    outputVariable: "emailSent"
                },
                position: { x: 2380, y: 450 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"processed": true, "category": "{{categorization.category}}", "priority": "{{categorization.priority}}", "airtableId": "{{airtableRecord.id}}", "notified": true}',
                    outputVariable: "compiledResult"
                },
                position: { x: 2380, y: 620 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: "{{compiledResult}}",
                    format: "json",
                    description: "Processing result"
                },
                position: { x: 2760, y: 520 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "llm-categorize" },
            { id: "edge-2", source: "llm-categorize", target: "router-1" },
            { id: "edge-3", source: "router-1", target: "action-notion-bug", sourceHandle: "bug" },
            {
                id: "edge-4",
                source: "router-1",
                target: "action-notion-feature",
                sourceHandle: "feature"
            },
            {
                id: "edge-5",
                source: "router-1",
                target: "action-slack-support",
                sourceHandle: "support"
            },
            { id: "edge-6", source: "router-1", target: "action-airtable", sourceHandle: "other" },
            { id: "edge-7", source: "action-notion-bug", target: "action-slack-eng" },
            { id: "edge-8", source: "action-notion-feature", target: "action-slack-product" },
            { id: "edge-9", source: "action-slack-eng", target: "action-discord-reply" },
            { id: "edge-10", source: "action-slack-product", target: "action-discord-reply" },
            { id: "edge-11", source: "action-slack-support", target: "action-discord-reply" },
            { id: "edge-12", source: "action-airtable", target: "conditional-digest" },
            { id: "edge-13", source: "action-discord-reply", target: "transform-result" },
            {
                id: "edge-14",
                source: "conditional-digest",
                target: "action-gmail",
                sourceHandle: "true"
            },
            {
                id: "edge-15",
                source: "conditional-digest",
                target: "transform-result",
                sourceHandle: "false"
            },
            { id: "edge-16", source: "action-gmail", target: "transform-result" },
            { id: "edge-17", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 2: GitHub PR Reviewer
// Parallel analysis pattern with security scanning, performance checks, and multi-channel notifications
const githubPrReviewerPattern: WorkflowPattern = {
    id: "github-pr-reviewer",
    name: "GitHub PR Reviewer",
    description:
        "Comprehensive PR review with parallel security, performance, and style analysis, Jira ticket linking, Slack notifications, and Datadog metrics tracking",
    useCase: "Code review automation",
    icon: "GitPullRequest",
    nodeCount: 15,
    category: "intermediate",
    integrations: ["GitHub", "Jira", "Slack", "Datadog", "Linear"],
    definition: {
        name: "GitHub PR Reviewer",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "PR Opened",
                config: {
                    triggerType: "webhook",
                    provider: "github",
                    event: "pull_request.opened",
                    outputVariable: "prEvent",
                    description: "Triggered when a PR is opened or updated"
                },
                position: { x: 100, y: 400 }
            },
            "action-github-get": {
                type: "action",
                name: "Get PR Details",
                config: {
                    provider: "github",
                    action: "getPullRequest",
                    repo: "{{prEvent.repository.full_name}}",
                    pullNumber: "{{prEvent.number}}",
                    outputVariable: "prData"
                },
                position: { x: 480, y: 400 }
            },
            "llm-security": {
                type: "llm",
                name: "Security Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a security expert. Analyze code for vulnerabilities: SQL injection, XSS, authentication issues, secrets exposure, insecure dependencies.",
                    prompt: 'Analyze this code diff for security issues:\n\n```\n{{prData.diff}}\n```\n\nReturn JSON: {"vulnerabilities": [{"severity": "critical/high/medium/low", "type": "", "line": 0, "description": "", "fix": ""}], "securityScore": 0-100}',
                    temperature: 0.1,
                    maxTokens: 2000,
                    outputVariable: "securityAnalysis"
                },
                position: { x: 860, y: 150 }
            },
            "llm-performance": {
                type: "llm",
                name: "Performance Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a performance engineer. Analyze code for: N+1 queries, memory leaks, inefficient algorithms, missing caching, blocking operations.",
                    prompt: 'Analyze this code diff for performance issues:\n\n```\n{{prData.diff}}\n```\n\nReturn JSON: {"issues": [{"impact": "high/medium/low", "type": "", "description": "", "suggestion": ""}], "performanceScore": 0-100}',
                    temperature: 0.1,
                    maxTokens: 1500,
                    outputVariable: "performanceAnalysis"
                },
                position: { x: 860, y: 400 }
            },
            "llm-quality": {
                type: "llm",
                name: "Code Quality Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a code quality expert. Check for: naming conventions, SOLID principles, code duplication, test coverage, documentation.",
                    prompt: 'Analyze this code diff for quality:\n\n```\n{{prData.diff}}\n```\n\nReturn JSON: {"issues": [{"type": "", "description": "", "suggestion": ""}], "qualityScore": 0-100, "testCoverage": "adequate/needs-improvement/missing"}',
                    temperature: 0.2,
                    maxTokens: 1500,
                    outputVariable: "qualityAnalysis"
                },
                position: { x: 860, y: 650 }
            },
            "llm-synthesize": {
                type: "llm",
                name: "Synthesize Review",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a senior engineer. Synthesize multiple analyses into a comprehensive, constructive PR review.",
                    prompt: "Create a PR review combining:\n\nSecurity: {{securityAnalysis.text}}\nPerformance: {{performanceAnalysis.text}}\nQuality: {{qualityAnalysis.text}}\n\nFormat as GitHub markdown with sections for each area. End with overall recommendation: APPROVE, REQUEST_CHANGES, or COMMENT.",
                    temperature: 0.3,
                    maxTokens: 2500,
                    outputVariable: "synthesizedReview"
                },
                position: { x: 1240, y: 400 }
            },
            "action-github-review": {
                type: "action",
                name: "Post Review",
                config: {
                    provider: "github",
                    action: "createReview",
                    repo: "{{prEvent.repository.full_name}}",
                    pullNumber: "{{prEvent.number}}",
                    body: "{{synthesizedReview.text}}",
                    event: "COMMENT",
                    outputVariable: "githubReview"
                },
                position: { x: 1620, y: 300 }
            },
            "conditional-critical": {
                type: "conditional",
                name: "Critical Issues?",
                config: {
                    conditionType: "expression",
                    expression:
                        'securityAnalysis.text.includes(\'"severity": "critical"\') || performanceAnalysis.text.includes(\'"impact": "high"\')',
                    outputVariable: "hasCritical"
                },
                position: { x: 1620, y: 500 }
            },
            "action-jira": {
                type: "action",
                name: "Create Jira Issue",
                config: {
                    provider: "jira",
                    action: "createIssue",
                    projectKey: "{{env.JIRA_PROJECT_KEY}}",
                    issueType: "Bug",
                    summary: "Critical issues in PR #{{prEvent.number}}: {{prData.title}}",
                    description:
                        "Security/Performance issues found:\n\n{{securityAnalysis.text}}\n\n{{performanceAnalysis.text}}",
                    priority: "High",
                    outputVariable: "jiraIssue"
                },
                position: { x: 2000, y: 200 }
            },
            "action-linear": {
                type: "action",
                name: "Create Linear Issue",
                config: {
                    provider: "linear",
                    action: "createIssue",
                    teamId: "{{env.LINEAR_TEAM_ID}}",
                    title: "Review PR #{{prEvent.number}} - Critical Issues",
                    description: "{{synthesizedReview.text}}",
                    priority: 1,
                    outputVariable: "linearIssue"
                },
                position: { x: 2000, y: 400 }
            },
            "action-slack-alert": {
                type: "action",
                name: "Alert Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#code-review-alerts",
                    text: "🚨 *Critical issues in PR #{{prEvent.number}}*\n\n*Title:* {{prData.title}}\n*Author:* {{prEvent.user.login}}\n*Jira:* {{jiraIssue.key}}\n\nReview needed immediately.",
                    outputVariable: "slackAlert"
                },
                position: { x: 2380, y: 300 }
            },
            "action-slack-notify": {
                type: "action",
                name: "Notify Channel",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#pull-requests",
                    text: "📝 *PR Review Posted*\n\n*PR:* #{{prEvent.number}} - {{prData.title}}\n*Author:* {{prEvent.user.login}}\n*Review:* {{githubReview.html_url}}",
                    outputVariable: "slackNotify"
                },
                position: { x: 2000, y: 600 }
            },
            "action-datadog": {
                type: "action",
                name: "Track Metrics",
                config: {
                    provider: "datadog",
                    action: "submitMetrics",
                    metrics: [
                        {
                            name: "pr_review.security_score",
                            value: "{{securityAnalysis.securityScore}}",
                            tags: ["repo:{{prEvent.repository.name}}"]
                        },
                        {
                            name: "pr_review.performance_score",
                            value: "{{performanceAnalysis.performanceScore}}",
                            tags: ["repo:{{prEvent.repository.name}}"]
                        },
                        {
                            name: "pr_review.quality_score",
                            value: "{{qualityAnalysis.qualityScore}}",
                            tags: ["repo:{{prEvent.repository.name}}"]
                        }
                    ],
                    outputVariable: "datadogMetrics"
                },
                position: { x: 2380, y: 550 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"pr": "{{prEvent.number}}", "securityScore": "{{securityAnalysis.securityScore}}", "performanceScore": "{{performanceAnalysis.performanceScore}}", "qualityScore": "{{qualityAnalysis.qualityScore}}", "reviewPosted": true, "criticalIssues": "{{hasCritical}}"}',
                    outputVariable: "finalResult"
                },
                position: { x: 2760, y: 450 }
            },
            "output-1": {
                type: "output",
                name: "Review Result",
                config: {
                    outputName: "result",
                    value: "{{finalResult}}",
                    format: "json",
                    description: "Comprehensive code review result"
                },
                position: { x: 3140, y: 450 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-github-get" },
            { id: "edge-2", source: "action-github-get", target: "llm-security" },
            { id: "edge-3", source: "action-github-get", target: "llm-performance" },
            { id: "edge-4", source: "action-github-get", target: "llm-quality" },
            { id: "edge-5", source: "llm-security", target: "llm-synthesize" },
            { id: "edge-6", source: "llm-performance", target: "llm-synthesize" },
            { id: "edge-7", source: "llm-quality", target: "llm-synthesize" },
            { id: "edge-8", source: "llm-synthesize", target: "action-github-review" },
            { id: "edge-9", source: "llm-synthesize", target: "conditional-critical" },
            {
                id: "edge-10",
                source: "conditional-critical",
                target: "action-jira",
                sourceHandle: "true"
            },
            {
                id: "edge-11",
                source: "conditional-critical",
                target: "action-linear",
                sourceHandle: "true"
            },
            { id: "edge-12", source: "action-jira", target: "action-slack-alert" },
            { id: "edge-13", source: "action-linear", target: "action-slack-alert" },
            {
                id: "edge-14",
                source: "conditional-critical",
                target: "action-slack-notify",
                sourceHandle: "false"
            },
            { id: "edge-15", source: "action-github-review", target: "action-slack-notify" },
            { id: "edge-16", source: "action-slack-notify", target: "action-datadog" },
            { id: "edge-17", source: "action-slack-alert", target: "action-datadog" },
            { id: "edge-18", source: "action-datadog", target: "transform-result" },
            { id: "edge-19", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 3: Lead Enrichment Pipeline
// Diamond pattern with parallel enrichment sources and tiered routing
const leadEnrichmentPattern: WorkflowPattern = {
    id: "lead-enrichment",
    name: "Lead Enrichment Pipeline",
    description:
        "Multi-source lead enrichment from Apollo and LinkedIn, AI qualification with scoring, CRM sync to HubSpot and Salesforce, tiered outreach via Gmail, and analytics tracking in Amplitude",
    useCase: "Sales lead qualification",
    icon: "UserPlus",
    nodeCount: 15,
    category: "intermediate",
    integrations: ["HubSpot", "Salesforce", "Apollo", "LinkedIn", "Gmail", "Amplitude", "Slack"],
    definition: {
        name: "Lead Enrichment Pipeline",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "New Lead",
                config: {
                    triggerType: "webhook",
                    provider: "hubspot",
                    event: "contact.created",
                    outputVariable: "leadEvent",
                    description: "Triggered when a new lead is created"
                },
                position: { x: 100, y: 400 }
            },
            "action-apollo": {
                type: "action",
                name: "Apollo Enrichment",
                config: {
                    provider: "apollo",
                    action: "enrichPerson",
                    email: "{{leadEvent.email}}",
                    outputVariable: "apolloData"
                },
                position: { x: 480, y: 200 }
            },
            "action-linkedin": {
                type: "action",
                name: "LinkedIn Lookup",
                config: {
                    provider: "linkedin",
                    action: "getProfile",
                    email: "{{leadEvent.email}}",
                    outputVariable: "linkedinData"
                },
                position: { x: 480, y: 600 }
            },
            "llm-merge": {
                type: "llm",
                name: "Merge & Analyze",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a sales intelligence analyst. Merge data from multiple sources and extract key insights for sales qualification.",
                    prompt: 'Merge and analyze lead data:\n\nOriginal: {{leadEvent}}\nApollo: {{apolloData}}\nLinkedIn: {{linkedinData}}\n\nReturn JSON: {"mergedProfile": {"name": "", "title": "", "company": "", "companySize": "", "industry": "", "funding": "", "technologies": [], "socialProfiles": {}}, "insights": [], "buyingSignals": []}',
                    temperature: 0.2,
                    maxTokens: 1500,
                    outputVariable: "mergedData"
                },
                position: { x: 860, y: 400 }
            },
            "llm-qualify": {
                type: "llm",
                name: "AI Qualification",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a lead scoring expert. Score leads based on ICP fit, buying signals, and engagement potential. Be precise with your scoring.",
                    prompt: 'Score this lead:\n\n{{mergedData.text}}\n\nReturn JSON: {"score": 0-100, "tier": "enterprise/mid-market/smb/unqualified", "icp_fit": 0-100, "timing_score": 0-100, "budget_likelihood": "high/medium/low/unknown", "decision_maker": true/false, "recommended_cadence": "high-touch/standard/nurture/disqualify", "personalization_hooks": [], "objection_predictions": []}',
                    temperature: 0.1,
                    maxTokens: 1000,
                    outputVariable: "qualification"
                },
                position: { x: 1240, y: 400 }
            },
            "router-tier": {
                type: "router",
                name: "Route by Tier",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{qualification.tier}}",
                    routes: [
                        {
                            value: "enterprise",
                            label: "Enterprise",
                            description: "High-value enterprise leads"
                        },
                        {
                            value: "mid-market",
                            label: "Mid-Market",
                            description: "Mid-market qualified leads"
                        },
                        { value: "smb", label: "SMB", description: "Small business leads" },
                        {
                            value: "nurture",
                            label: "Nurture",
                            description: "Not ready, needs nurturing"
                        }
                    ],
                    defaultRoute: "nurture",
                    outputVariable: "tierRoute"
                },
                position: { x: 1620, y: 400 }
            },
            "action-salesforce": {
                type: "action",
                name: "Create SF Lead",
                config: {
                    provider: "salesforce",
                    action: "createLead",
                    data: {
                        FirstName: "{{mergedData.mergedProfile.name}}",
                        Company: "{{mergedData.mergedProfile.company}}",
                        Title: "{{mergedData.mergedProfile.title}}",
                        LeadScore__c: "{{qualification.score}}",
                        Tier__c: "{{qualification.tier}}"
                    },
                    outputVariable: "sfLead"
                },
                position: { x: 2000, y: 150 }
            },
            "action-hubspot-update": {
                type: "action",
                name: "Update HubSpot",
                config: {
                    provider: "hubspot",
                    action: "updateContact",
                    email: "{{leadEvent.email}}",
                    properties: {
                        lead_score: "{{qualification.score}}",
                        lead_tier: "{{qualification.tier}}",
                        icp_fit: "{{qualification.icp_fit}}",
                        enriched_data: "{{mergedData.text}}"
                    },
                    outputVariable: "hubspotUpdate"
                },
                position: { x: 2000, y: 350 }
            },
            "llm-email-enterprise": {
                type: "llm",
                name: "Enterprise Email",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Write highly personalized enterprise outreach emails. Reference specific company details and pain points.",
                    prompt: "Write a personalized enterprise outreach email for:\n\nProfile: {{mergedData.text}}\nPersonalization hooks: {{qualification.personalization_hooks}}\n\nMake it executive-level, value-focused, and reference their specific situation.",
                    temperature: 0.5,
                    maxTokens: 800,
                    outputVariable: "enterpriseEmail"
                },
                position: { x: 2000, y: 550 }
            },
            "action-gmail-enterprise": {
                type: "action",
                name: "Send Enterprise Email",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{leadEvent.email}}",
                    subject: "{{mergedData.mergedProfile.company}} + Us: Strategic Partnership",
                    body: "{{enterpriseEmail.text}}",
                    outputVariable: "enterpriseEmailSent"
                },
                position: { x: 2380, y: 550 }
            },
            "action-slack-enterprise": {
                type: "action",
                name: "Alert AE",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#enterprise-leads",
                    text: "🎯 *High-Value Enterprise Lead*\n\n*Company:* {{mergedData.mergedProfile.company}}\n*Contact:* {{mergedData.mergedProfile.name}} ({{mergedData.mergedProfile.title}})\n*Score:* {{qualification.score}}/100\n*SF Lead:* {{sfLead.id}}\n\n_Outreach email sent automatically_",
                    outputVariable: "slackEnterprise"
                },
                position: { x: 2380, y: 200 }
            },
            "action-amplitude": {
                type: "action",
                name: "Track Event",
                config: {
                    provider: "amplitude",
                    action: "track",
                    event: "lead_qualified",
                    userId: "{{leadEvent.email}}",
                    properties: {
                        score: "{{qualification.score}}",
                        tier: "{{qualification.tier}}",
                        icp_fit: "{{qualification.icp_fit}}",
                        source: "{{leadEvent.source}}"
                    },
                    outputVariable: "amplitudeEvent"
                },
                position: { x: 2380, y: 750 }
            },
            "action-slack-midmarket": {
                type: "action",
                name: "Notify SDR",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#sdr-leads",
                    text: "📊 *New Mid-Market Lead*\n\n*Company:* {{mergedData.mergedProfile.company}}\n*Contact:* {{mergedData.mergedProfile.name}}\n*Score:* {{qualification.score}}/100",
                    outputVariable: "slackMidmarket"
                },
                position: { x: 2380, y: 400 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"email": "{{leadEvent.email}}", "score": "{{qualification.score}}", "tier": "{{qualification.tier}}", "salesforceId": "{{sfLead.id}}", "enriched": true, "outreachSent": true}',
                    outputVariable: "pipelineResult"
                },
                position: { x: 2760, y: 400 }
            },
            "output-1": {
                type: "output",
                name: "Pipeline Result",
                config: {
                    outputName: "result",
                    value: "{{pipelineResult}}",
                    format: "json",
                    description: "Lead enrichment and qualification result"
                },
                position: { x: 3140, y: 400 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-apollo" },
            { id: "edge-2", source: "trigger-1", target: "action-linkedin" },
            { id: "edge-3", source: "action-apollo", target: "llm-merge" },
            { id: "edge-4", source: "action-linkedin", target: "llm-merge" },
            { id: "edge-5", source: "llm-merge", target: "llm-qualify" },
            { id: "edge-6", source: "llm-qualify", target: "router-tier" },
            {
                id: "edge-7",
                source: "router-tier",
                target: "action-salesforce",
                sourceHandle: "enterprise"
            },
            {
                id: "edge-8",
                source: "router-tier",
                target: "action-hubspot-update",
                sourceHandle: "mid-market"
            },
            {
                id: "edge-9",
                source: "router-tier",
                target: "action-hubspot-update",
                sourceHandle: "smb"
            },
            {
                id: "edge-10",
                source: "router-tier",
                target: "action-amplitude",
                sourceHandle: "nurture"
            },
            { id: "edge-11", source: "action-salesforce", target: "llm-email-enterprise" },
            { id: "edge-12", source: "action-salesforce", target: "action-slack-enterprise" },
            { id: "edge-13", source: "llm-email-enterprise", target: "action-gmail-enterprise" },
            { id: "edge-14", source: "action-hubspot-update", target: "action-slack-midmarket" },
            { id: "edge-15", source: "action-gmail-enterprise", target: "action-amplitude" },
            { id: "edge-16", source: "action-slack-enterprise", target: "transform-result" },
            { id: "edge-17", source: "action-slack-midmarket", target: "action-amplitude" },
            { id: "edge-18", source: "action-amplitude", target: "transform-result" },
            { id: "edge-19", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 4: Figma Design Handoff
// Complex design system workflow with parallel ticket creation and documentation
const figmaDesignHandoffPattern: WorkflowPattern = {
    id: "figma-design-handoff",
    name: "Figma Design Handoff",
    description:
        "Extract component specs from Figma, create Linear tickets for each component, generate Notion documentation, update Storybook specs, notify via Slack and Teams, and track in Asana milestones",
    useCase: "Design-to-development automation",
    icon: "Layers",
    nodeCount: 16,
    category: "intermediate",
    integrations: ["Figma", "Linear", "Notion", "Slack", "Microsoft Teams", "Asana", "GitHub"],
    definition: {
        name: "Figma Design Handoff",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Figma Published",
                config: {
                    triggerType: "webhook",
                    provider: "figma",
                    event: "file_version_update",
                    outputVariable: "figmaEvent",
                    description: "Triggered when a Figma file version is published"
                },
                position: { x: 100, y: 400 }
            },
            "action-figma-file": {
                type: "action",
                name: "Get File Details",
                config: {
                    provider: "figma",
                    action: "getFile",
                    fileKey: "{{figmaEvent.fileKey}}",
                    outputVariable: "figmaFile"
                },
                position: { x: 480, y: 400 }
            },
            "action-figma-components": {
                type: "action",
                name: "Get Components",
                config: {
                    provider: "figma",
                    action: "getFileComponents",
                    fileKey: "{{figmaEvent.fileKey}}",
                    outputVariable: "figmaComponents"
                },
                position: { x: 480, y: 600 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Changes",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a design systems expert. Analyze Figma file changes and extract detailed component specifications including CSS properties, accessibility requirements, and responsive behavior.",
                    prompt: 'Analyze Figma file and components:\n\nFile: {{figmaFile}}\nComponents: {{figmaComponents}}\n\nReturn JSON: {"components": [{"name": "", "type": "new/update/delete", "category": "atom/molecule/organism/template", "specs": {"colors": [], "typography": {}, "spacing": {}, "responsive": {}}, "a11y": {"role": "", "states": []}, "implementationNotes": "", "estimatedEffort": "xs/s/m/l/xl"}], "breakingChanges": [], "designTokenUpdates": []}',
                    temperature: 0.2,
                    maxTokens: 3000,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 500 }
            },
            "llm-docs": {
                type: "llm",
                name: "Generate Docs",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate comprehensive component documentation in markdown format suitable for a design system.",
                    prompt: "Generate design system documentation for:\n\n{{analysis.text}}\n\nInclude: Overview, Usage guidelines, Props/Variants, Accessibility, Do's and Don'ts, Code examples.",
                    temperature: 0.3,
                    maxTokens: 2500,
                    outputVariable: "documentation"
                },
                position: { x: 1240, y: 250 }
            },
            "llm-storybook": {
                type: "llm",
                name: "Generate Storybook",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate Storybook story files for React components based on design specs.",
                    prompt: "Generate Storybook stories for:\n\n{{analysis.text}}\n\nInclude: Default story, all variants, interactive controls, accessibility testing.",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "storybookCode"
                },
                position: { x: 1240, y: 500 }
            },
            "conditional-breaking": {
                type: "conditional",
                name: "Breaking Changes?",
                config: {
                    conditionType: "expression",
                    expression: "!analysis.text.includes('\"breakingChanges\": []')",
                    outputVariable: "hasBreaking"
                },
                position: { x: 1240, y: 750 }
            },
            "action-notion": {
                type: "action",
                name: "Update Notion Docs",
                config: {
                    provider: "notion",
                    action: "createPage",
                    parentId: "{{env.NOTION_DESIGN_SYSTEM_PAGE}}",
                    properties: {
                        title: "{{figmaFile.name}} - Design Handoff",
                        content: "{{documentation.text}}"
                    },
                    outputVariable: "notionPage"
                },
                position: { x: 1620, y: 200 }
            },
            "action-linear": {
                type: "action",
                name: "Create Linear Tickets",
                config: {
                    provider: "linear",
                    action: "createIssue",
                    teamId: "{{env.LINEAR_FRONTEND_TEAM}}",
                    title: "Implement: {{figmaFile.name}} components",
                    description:
                        "Components to implement:\n\n{{analysis.components}}\n\nFigma: {{figmaEvent.fileUrl}}\nNotion: {{notionPage.url}}",
                    labels: ["design-handoff", "frontend"],
                    outputVariable: "linearTicket"
                },
                position: { x: 1620, y: 400 }
            },
            "action-github": {
                type: "action",
                name: "Create PR Draft",
                config: {
                    provider: "github",
                    action: "createPullRequest",
                    repo: "{{env.DESIGN_SYSTEM_REPO}}",
                    title: "feat: Add {{figmaFile.name}} components",
                    body: "## Design Handoff\n\nFigma: {{figmaEvent.fileUrl}}\nLinear: {{linearTicket.url}}\n\n## Storybook Stories\n\n```tsx\n{{storybookCode.text}}\n```",
                    draft: true,
                    outputVariable: "githubPR"
                },
                position: { x: 1620, y: 600 }
            },
            "action-asana": {
                type: "action",
                name: "Update Milestone",
                config: {
                    provider: "asana",
                    action: "createTask",
                    projectId: "{{env.ASANA_DESIGN_PROJECT}}",
                    name: "Design Handoff: {{figmaFile.name}}",
                    notes: "Components: {{analysis.components.length}}\nLinear: {{linearTicket.url}}\nGitHub: {{githubPR.html_url}}",
                    outputVariable: "asanaTask"
                },
                position: { x: 2000, y: 400 }
            },
            "action-slack": {
                type: "action",
                name: "Notify Slack",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#design-engineering",
                    text: "🎨 *Design Handoff Ready*\n\n*File:* {{figmaFile.name}}\n*Components:* {{analysis.components.length}}\n\n📋 *Linear:* {{linearTicket.url}}\n📝 *Notion:* {{notionPage.url}}\n🔀 *Draft PR:* {{githubPR.html_url}}",
                    outputVariable: "slackPost"
                },
                position: { x: 2380, y: 250 }
            },
            "action-teams": {
                type: "action",
                name: "Notify Teams",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Design System",
                    text: "🎨 Design Handoff: {{figmaFile.name}}\n\nComponents ready for implementation. Check Linear for tickets.",
                    outputVariable: "teamsPost"
                },
                position: { x: 2380, y: 450 }
            },
            "action-slack-breaking": {
                type: "action",
                name: "Alert Breaking",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#design-system-alerts",
                    text: "⚠️ *Breaking Changes Detected*\n\n*File:* {{figmaFile.name}}\n*Changes:* {{analysis.breakingChanges}}\n\nReview required before implementation.",
                    outputVariable: "slackBreaking"
                },
                position: { x: 1620, y: 850 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"figmaFile": "{{figmaFile.name}}", "componentsCount": "{{analysis.components.length}}", "linearTicket": "{{linearTicket.url}}", "notionPage": "{{notionPage.url}}", "githubPR": "{{githubPR.html_url}}", "asanaTask": "{{asanaTask.gid}}"}',
                    outputVariable: "handoffResult"
                },
                position: { x: 2760, y: 400 }
            },
            "output-1": {
                type: "output",
                name: "Handoff Result",
                config: {
                    outputName: "result",
                    value: "{{handoffResult}}",
                    format: "json",
                    description: "Complete design handoff result"
                },
                position: { x: 3140, y: 400 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-figma-file" },
            { id: "edge-2", source: "trigger-1", target: "action-figma-components" },
            { id: "edge-3", source: "action-figma-file", target: "llm-analyze" },
            { id: "edge-4", source: "action-figma-components", target: "llm-analyze" },
            { id: "edge-5", source: "llm-analyze", target: "llm-docs" },
            { id: "edge-6", source: "llm-analyze", target: "llm-storybook" },
            { id: "edge-7", source: "llm-analyze", target: "conditional-breaking" },
            { id: "edge-8", source: "llm-docs", target: "action-notion" },
            { id: "edge-9", source: "llm-storybook", target: "action-linear" },
            { id: "edge-10", source: "action-notion", target: "action-linear" },
            { id: "edge-11", source: "action-linear", target: "action-github" },
            { id: "edge-12", source: "action-github", target: "action-asana" },
            { id: "edge-13", source: "action-asana", target: "action-slack" },
            { id: "edge-14", source: "action-asana", target: "action-teams" },
            {
                id: "edge-15",
                source: "conditional-breaking",
                target: "action-slack-breaking",
                sourceHandle: "true"
            },
            { id: "edge-16", source: "action-slack", target: "transform-result" },
            { id: "edge-17", source: "action-teams", target: "transform-result" },
            { id: "edge-18", source: "action-slack-breaking", target: "transform-result" },
            { id: "edge-19", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 5: Trello Project Sync
// Multi-system sync with database, analytics, and cross-platform notifications
const trelloProjectSyncPattern: WorkflowPattern = {
    id: "trello-project-sync",
    name: "Trello Project Sync",
    description:
        "Bi-directional sync between Trello, Monday.com, and ClickUp with PostgreSQL persistence, Mixpanel analytics, status-based routing to different Slack channels, and Google Sheets reporting",
    useCase: "Project tracking automation",
    icon: "Database",
    nodeCount: 16,
    category: "intermediate",
    integrations: [
        "Trello",
        "Monday",
        "ClickUp",
        "PostgreSQL",
        "Slack",
        "Mixpanel",
        "Google Sheets"
    ],
    definition: {
        name: "Trello Project Sync",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Card Updated",
                config: {
                    triggerType: "webhook",
                    provider: "trello",
                    event: "updateCard",
                    outputVariable: "trelloEvent",
                    description: "Triggered when a Trello card is updated"
                },
                position: { x: 100, y: 400 }
            },
            "action-trello": {
                type: "action",
                name: "Get Card Details",
                config: {
                    provider: "trello",
                    action: "getCard",
                    cardId: "{{trelloEvent.cardId}}",
                    outputVariable: "cardDetails"
                },
                position: { x: 480, y: 400 }
            },
            "action-trello-history": {
                type: "action",
                name: "Get Card History",
                config: {
                    provider: "trello",
                    action: "getCardActions",
                    cardId: "{{trelloEvent.cardId}}",
                    outputVariable: "cardHistory"
                },
                position: { x: 480, y: 600 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Change",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Analyze project task changes and extract insights about progress, blockers, and team performance.",
                    prompt: 'Analyze this card update:\n\nCard: {{cardDetails}}\nHistory: {{cardHistory}}\nEvent: {{trelloEvent}}\n\nReturn JSON: {"changeType": "status/assignment/due_date/description/label", "oldValue": "", "newValue": "", "cycleTime": 0, "isBlocked": false, "blockReason": "", "urgency": "critical/high/medium/low", "dbRecord": {"id": "", "title": "", "status": "", "assignee": "", "due_date": "", "labels": [], "cycle_time_hours": 0}}',
                    temperature: 0.1,
                    maxTokens: 1000,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 500 }
            },
            "action-postgresql": {
                type: "action",
                name: "Sync to Database",
                config: {
                    provider: "postgresql",
                    action: "upsert",
                    table: "project_tasks",
                    data: "{{analysis.dbRecord}}",
                    conflictColumn: "id",
                    outputVariable: "dbResult"
                },
                position: { x: 1240, y: 300 }
            },
            "action-monday": {
                type: "action",
                name: "Sync to Monday",
                config: {
                    provider: "monday",
                    action: "createOrUpdateItem",
                    boardId: "{{env.MONDAY_PROJECT_BOARD}}",
                    itemName: "{{cardDetails.name}}",
                    columnValues: {
                        status: "{{analysis.newValue}}",
                        person: "{{cardDetails.members}}",
                        date: "{{cardDetails.due}}"
                    },
                    outputVariable: "mondayItem"
                },
                position: { x: 1240, y: 500 }
            },
            "action-clickup": {
                type: "action",
                name: "Sync to ClickUp",
                config: {
                    provider: "clickup",
                    action: "createOrUpdateTask",
                    listId: "{{env.CLICKUP_LIST_ID}}",
                    name: "{{cardDetails.name}}",
                    status: "{{analysis.newValue}}",
                    outputVariable: "clickupTask"
                },
                position: { x: 1240, y: 700 }
            },
            "router-status": {
                type: "router",
                name: "Route by Status",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{analysis.newValue}}",
                    routes: [
                        { value: "done", label: "Completed", description: "Task completed" },
                        { value: "blocked", label: "Blocked", description: "Task is blocked" },
                        { value: "review", label: "In Review", description: "Ready for review" },
                        { value: "progress", label: "In Progress", description: "Work in progress" }
                    ],
                    defaultRoute: "progress",
                    outputVariable: "statusRoute"
                },
                position: { x: 1620, y: 400 }
            },
            "action-slack-done": {
                type: "action",
                name: "Celebrate Completion",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#wins",
                    text: "🎉 *Task Completed!*\n\n*{{cardDetails.name}}*\nCompleted by: {{cardDetails.members}}\nCycle time: {{analysis.cycleTime}} hours",
                    outputVariable: "slackDone"
                },
                position: { x: 2000, y: 150 }
            },
            "action-slack-blocked": {
                type: "action",
                name: "Alert Blockers",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#blockers",
                    text: "🚫 *Task Blocked*\n\n*{{cardDetails.name}}*\nReason: {{analysis.blockReason}}\nAssignee: {{cardDetails.members}}\n\n_Please help unblock!_",
                    outputVariable: "slackBlocked"
                },
                position: { x: 2000, y: 350 }
            },
            "action-slack-review": {
                type: "action",
                name: "Request Review",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#reviews",
                    text: "👀 *Ready for Review*\n\n*{{cardDetails.name}}*\nSubmitted by: {{cardDetails.members}}\nTrello: {{cardDetails.url}}",
                    outputVariable: "slackReview"
                },
                position: { x: 2000, y: 550 }
            },
            "action-mixpanel": {
                type: "action",
                name: "Track Analytics",
                config: {
                    provider: "mixpanel",
                    action: "track",
                    event: "task_status_changed",
                    properties: {
                        taskId: "{{cardDetails.id}}",
                        changeType: "{{analysis.changeType}}",
                        oldStatus: "{{analysis.oldValue}}",
                        newStatus: "{{analysis.newValue}}",
                        cycleTime: "{{analysis.cycleTime}}",
                        assignee: "{{cardDetails.members}}"
                    },
                    outputVariable: "mixpanelEvent"
                },
                position: { x: 2380, y: 400 }
            },
            "action-sheets": {
                type: "action",
                name: "Update Report",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.PROJECT_TRACKER_SHEET}}",
                    sheetName: "Activity Log",
                    values: [
                        "{{$now}}",
                        "{{cardDetails.name}}",
                        "{{analysis.changeType}}",
                        "{{analysis.oldValue}}",
                        "{{analysis.newValue}}",
                        "{{analysis.cycleTime}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 2380, y: 600 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"cardId": "{{cardDetails.id}}", "synced": {"database": true, "monday": "{{mondayItem.id}}", "clickup": "{{clickupTask.id}}"}, "status": "{{analysis.newValue}}", "cycleTime": "{{analysis.cycleTime}}"}',
                    outputVariable: "syncResult"
                },
                position: { x: 2760, y: 450 }
            },
            "output-1": {
                type: "output",
                name: "Sync Result",
                config: {
                    outputName: "result",
                    value: "{{syncResult}}",
                    format: "json",
                    description: "Multi-platform sync result"
                },
                position: { x: 3140, y: 450 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-trello" },
            { id: "edge-2", source: "trigger-1", target: "action-trello-history" },
            { id: "edge-3", source: "action-trello", target: "llm-analyze" },
            { id: "edge-4", source: "action-trello-history", target: "llm-analyze" },
            { id: "edge-5", source: "llm-analyze", target: "action-postgresql" },
            { id: "edge-6", source: "llm-analyze", target: "action-monday" },
            { id: "edge-7", source: "llm-analyze", target: "action-clickup" },
            { id: "edge-8", source: "action-postgresql", target: "router-status" },
            {
                id: "edge-9",
                source: "router-status",
                target: "action-slack-done",
                sourceHandle: "done"
            },
            {
                id: "edge-10",
                source: "router-status",
                target: "action-slack-blocked",
                sourceHandle: "blocked"
            },
            {
                id: "edge-11",
                source: "router-status",
                target: "action-slack-review",
                sourceHandle: "review"
            },
            { id: "edge-12", source: "action-slack-done", target: "action-mixpanel" },
            { id: "edge-13", source: "action-slack-blocked", target: "action-mixpanel" },
            { id: "edge-14", source: "action-slack-review", target: "action-mixpanel" },
            { id: "edge-15", source: "action-monday", target: "action-mixpanel" },
            { id: "edge-16", source: "action-clickup", target: "action-sheets" },
            { id: "edge-17", source: "action-mixpanel", target: "transform-result" },
            { id: "edge-18", source: "action-sheets", target: "transform-result" },
            { id: "edge-19", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 6: Calendly Meeting Prep
// Comprehensive meeting prep with CRM lookup, parallel research, and multi-channel delivery
const calendlyMeetingPrepPattern: WorkflowPattern = {
    id: "calendly-meeting-prep",
    name: "Calendly Meeting Prep",
    description:
        "Full meeting preparation: lookup attendee in HubSpot and Apollo, research company, generate personalized talking points, create Notion briefing doc, update Google Calendar, send Slack reminder, and log to Airtable",
    useCase: "Meeting preparation automation",
    icon: "ClipboardCheck",
    nodeCount: 17,
    category: "intermediate",
    integrations: [
        "Calendly",
        "HubSpot",
        "Apollo",
        "Notion",
        "Google Calendar",
        "Slack",
        "Airtable",
        "Gmail"
    ],
    definition: {
        name: "Calendly Meeting Prep",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Meeting Booked",
                config: {
                    triggerType: "webhook",
                    provider: "calendly",
                    event: "invitee.created",
                    outputVariable: "calendlyEvent",
                    description: "Triggered when a new meeting is scheduled"
                },
                position: { x: 100, y: 450 }
            },
            "action-calendly": {
                type: "action",
                name: "Get Event Details",
                config: {
                    provider: "calendly",
                    action: "getEvent",
                    eventUri: "{{calendlyEvent.event}}",
                    outputVariable: "eventDetails"
                },
                position: { x: 480, y: 450 }
            },
            "action-hubspot": {
                type: "action",
                name: "Get CRM Data",
                config: {
                    provider: "hubspot",
                    action: "getContactByEmail",
                    email: "{{eventDetails.invitee.email}}",
                    outputVariable: "hubspotContact"
                },
                position: { x: 860, y: 200 }
            },
            "action-apollo": {
                type: "action",
                name: "Enrich Profile",
                config: {
                    provider: "apollo",
                    action: "enrichPerson",
                    email: "{{eventDetails.invitee.email}}",
                    outputVariable: "apolloData"
                },
                position: { x: 860, y: 450 }
            },
            "url-company": {
                type: "url",
                name: "Fetch Company Info",
                config: {
                    urlVariable: "apolloData.company.website",
                    outputVariable: "companyWebsite"
                },
                position: { x: 860, y: 700 }
            },
            "llm-research": {
                type: "llm",
                name: "Deep Research",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an executive briefing specialist. Create comprehensive meeting preparation materials.",
                    prompt: 'Research and prepare briefing for meeting:\n\nInvitee: {{eventDetails.invitee}}\nMeeting Type: {{eventDetails.eventType}}\nForm Responses: {{eventDetails.questions}}\nCRM History: {{hubspotContact}}\nEnriched Profile: {{apolloData}}\nCompany Website: {{companyWebsite.text}}\n\nReturn JSON: {"executiveSummary": "", "attendeeProfile": {"name": "", "title": "", "background": "", "recentActivity": []}, "companyIntel": {"overview": "", "news": [], "competitors": [], "techStack": []}, "meetingStrategy": {"objectives": [], "talkingPoints": [], "questionsToAsk": [], "potentialObjections": [], "valueProps": []}, "riskFactors": [], "followUpActions": []}',
                    temperature: 0.3,
                    maxTokens: 2500,
                    outputVariable: "research"
                },
                position: { x: 1240, y: 450 }
            },
            "llm-briefing": {
                type: "llm",
                name: "Create Briefing Doc",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Format research into a professional briefing document in markdown.",
                    prompt: "Create a professional meeting briefing document from:\n\n{{research.text}}\n\nFormat with clear sections, bullet points, and action items. Include a 30-second elevator pitch tailored to this prospect.",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "briefingDoc"
                },
                position: { x: 1620, y: 300 }
            },
            "llm-email": {
                type: "llm",
                name: "Draft Confirmation",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Write professional meeting confirmation emails that build rapport.",
                    prompt: "Write a personalized meeting confirmation email:\n\nAttendee: {{eventDetails.invitee.name}}\nCompany: {{apolloData.company.name}}\nMeeting: {{eventDetails.eventType}} at {{eventDetails.startTime}}\nResearch: {{research.text}}\n\nReference something specific about them or their company. Be warm but professional.",
                    temperature: 0.5,
                    maxTokens: 500,
                    outputVariable: "confirmationEmail"
                },
                position: { x: 1620, y: 600 }
            },
            "action-notion": {
                type: "action",
                name: "Create Notion Page",
                config: {
                    provider: "notion",
                    action: "createPage",
                    parentId: "{{env.NOTION_MEETINGS_DB}}",
                    properties: {
                        title: "Meeting: {{eventDetails.invitee.name}} - {{eventDetails.eventType}}",
                        content: "{{briefingDoc.text}}"
                    },
                    outputVariable: "notionPage"
                },
                position: { x: 2000, y: 200 }
            },
            "action-calendar": {
                type: "action",
                name: "Update Calendar",
                config: {
                    provider: "google-calendar",
                    action: "updateEvent",
                    calendarId: "primary",
                    eventId: "{{eventDetails.googleEventId}}",
                    description:
                        "📋 Briefing: {{notionPage.url}}\n\n## Quick Summary\n{{research.executiveSummary}}\n\n## Key Talking Points\n{{research.meetingStrategy.talkingPoints}}",
                    outputVariable: "calendarUpdate"
                },
                position: { x: 2000, y: 400 }
            },
            "action-gmail": {
                type: "action",
                name: "Send Confirmation",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{eventDetails.invitee.email}}",
                    subject: "Looking forward to our call, {{eventDetails.invitee.name}}!",
                    body: "{{confirmationEmail.text}}",
                    outputVariable: "emailSent"
                },
                position: { x: 2000, y: 600 }
            },
            "action-hubspot-update": {
                type: "action",
                name: "Update CRM",
                config: {
                    provider: "hubspot",
                    action: "updateContact",
                    email: "{{eventDetails.invitee.email}}",
                    properties: {
                        last_meeting_scheduled: "{{eventDetails.startTime}}",
                        meeting_type: "{{eventDetails.eventType}}",
                        briefing_url: "{{notionPage.url}}"
                    },
                    outputVariable: "hubspotUpdate"
                },
                position: { x: 2000, y: 800 }
            },
            "action-slack": {
                type: "action",
                name: "Send Slack Prep",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "@{{env.SLACK_USER_ID}}",
                    text: "📅 *Meeting Prep Ready*\n\n*With:* {{eventDetails.invitee.name}} ({{apolloData.company.name}})\n*Time:* {{eventDetails.startTime}}\n*Type:* {{eventDetails.eventType}}\n\n📋 *Briefing:* {{notionPage.url}}\n\n*Key Point:* {{research.meetingStrategy.talkingPoints[0]}}",
                    outputVariable: "slackPrep"
                },
                position: { x: 2380, y: 350 }
            },
            "action-airtable": {
                type: "action",
                name: "Log Meeting",
                config: {
                    provider: "airtable",
                    action: "createRecord",
                    baseId: "{{env.AIRTABLE_MEETINGS_BASE}}",
                    tableId: "Meetings",
                    fields: {
                        Name: "{{eventDetails.invitee.name}}",
                        Company: "{{apolloData.company.name}}",
                        "Meeting Type": "{{eventDetails.eventType}}",
                        "Scheduled Time": "{{eventDetails.startTime}}",
                        "Briefing URL": "{{notionPage.url}}",
                        "CRM Contact": "{{hubspotContact.id}}"
                    },
                    outputVariable: "airtableRecord"
                },
                position: { x: 2380, y: 600 }
            },
            "wait-reminder": {
                type: "wait",
                name: "Wait for Reminder",
                config: {
                    duration: "{{eventDetails.startTime - 3600000}}",
                    durationUnit: "timestamp",
                    outputVariable: "waitComplete"
                },
                position: { x: 2760, y: 350 }
            },
            "action-slack-reminder": {
                type: "action",
                name: "Send 1hr Reminder",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "@{{env.SLACK_USER_ID}}",
                    text: "⏰ *Meeting in 1 hour!*\n\n*{{eventDetails.invitee.name}}* from *{{apolloData.company.name}}*\n\n📋 Review briefing: {{notionPage.url}}\n\n_Remember: {{research.meetingStrategy.talkingPoints[0]}}_",
                    outputVariable: "slackReminder"
                },
                position: { x: 3140, y: 350 }
            },
            "output-1": {
                type: "output",
                name: "Prep Result",
                config: {
                    outputName: "result",
                    value: '{"meeting": "{{eventDetails.eventType}}", "attendee": "{{eventDetails.invitee.name}}", "company": "{{apolloData.company.name}}", "notionBriefing": "{{notionPage.url}}", "calendarUpdated": true, "confirmationSent": true}',
                    format: "json",
                    description: "Complete meeting prep result"
                },
                position: { x: 3140, y: 550 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-calendly" },
            { id: "edge-2", source: "action-calendly", target: "action-hubspot" },
            { id: "edge-3", source: "action-calendly", target: "action-apollo" },
            { id: "edge-4", source: "action-calendly", target: "url-company" },
            { id: "edge-5", source: "action-hubspot", target: "llm-research" },
            { id: "edge-6", source: "action-apollo", target: "llm-research" },
            { id: "edge-7", source: "url-company", target: "llm-research" },
            { id: "edge-8", source: "llm-research", target: "llm-briefing" },
            { id: "edge-9", source: "llm-research", target: "llm-email" },
            { id: "edge-10", source: "llm-briefing", target: "action-notion" },
            { id: "edge-11", source: "action-notion", target: "action-calendar" },
            { id: "edge-12", source: "llm-email", target: "action-gmail" },
            { id: "edge-13", source: "action-calendar", target: "action-slack" },
            { id: "edge-14", source: "action-gmail", target: "action-hubspot-update" },
            { id: "edge-15", source: "action-hubspot-update", target: "action-airtable" },
            { id: "edge-16", source: "action-slack", target: "wait-reminder" },
            { id: "edge-17", source: "action-airtable", target: "output-1" },
            { id: "edge-18", source: "wait-reminder", target: "action-slack-reminder" },
            { id: "edge-19", source: "action-slack-reminder", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// ============================================================================
// ADVANCED PATTERNS (8 patterns)
// Complex multi-branched workflows with diverse integrations
// ============================================================================

// Advanced Pattern 1: WhatsApp Customer Support Bot
// Omnichannel support hub with sentiment-based escalation and full customer 360
const whatsappSupportBotPattern: WorkflowPattern = {
    id: "whatsapp-support-bot",
    name: "WhatsApp Customer Support Bot",
    description:
        "Omnichannel support: receive WhatsApp/Telegram messages, enrich from HubSpot/Salesforce, AI classification with sentiment analysis, auto-respond or escalate to Zendesk/Freshdesk, notify via Slack, track in Intercom, and log analytics to Segment",
    useCase: "Multi-channel customer support",
    icon: "MessageCircle",
    nodeCount: 20,
    category: "advanced",
    integrations: [
        "WhatsApp",
        "Telegram",
        "Zendesk",
        "Freshdesk",
        "HubSpot",
        "Salesforce",
        "Intercom",
        "Slack",
        "Segment"
    ],
    definition: {
        name: "WhatsApp Customer Support Bot",
        nodes: {
            "trigger-whatsapp": {
                type: "trigger",
                name: "WhatsApp Message",
                config: {
                    triggerType: "webhook",
                    provider: "whatsapp",
                    event: "message",
                    outputVariable: "incomingMessage",
                    description: "Triggered on incoming WhatsApp message"
                },
                position: { x: 100, y: 300 }
            },
            "trigger-telegram": {
                type: "trigger",
                name: "Telegram Message",
                config: {
                    triggerType: "webhook",
                    provider: "telegram",
                    event: "message",
                    outputVariable: "incomingMessage",
                    description: "Triggered on incoming Telegram message"
                },
                position: { x: 100, y: 550 }
            },
            "action-hubspot": {
                type: "action",
                name: "Get HubSpot Data",
                config: {
                    provider: "hubspot",
                    action: "getContactByPhone",
                    phone: "{{incomingMessage.from}}",
                    outputVariable: "hubspotContact"
                },
                position: { x: 480, y: 250 }
            },
            "action-salesforce": {
                type: "action",
                name: "Get Salesforce Data",
                config: {
                    provider: "salesforce",
                    action: "getContactByPhone",
                    phone: "{{incomingMessage.from}}",
                    outputVariable: "salesforceContact"
                },
                position: { x: 480, y: 450 }
            },
            "action-intercom": {
                type: "action",
                name: "Get Intercom History",
                config: {
                    provider: "intercom",
                    action: "searchConversations",
                    query: "{{incomingMessage.from}}",
                    outputVariable: "intercomHistory"
                },
                position: { x: 480, y: 650 }
            },
            "llm-context": {
                type: "llm",
                name: "Build Context",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Merge customer data from multiple sources into a unified customer 360 view.",
                    prompt: 'Build customer context:\n\nHubSpot: {{hubspotContact}}\nSalesforce: {{salesforceContact}}\nIntercom History: {{intercomHistory}}\n\nReturn JSON: {"customer360": {"name": "", "email": "", "phone": "", "company": "", "lifetime_value": 0, "support_tier": "enterprise/premium/standard", "open_tickets": 0, "last_interaction": "", "sentiment_history": "", "key_issues": []}}',
                    temperature: 0.1,
                    maxTokens: 1000,
                    outputVariable: "customerContext"
                },
                position: { x: 860, y: 420 }
            },
            "llm-classify": {
                type: "llm",
                name: "Classify & Analyze",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an expert customer support AI. Classify messages, analyze sentiment, and determine the best response strategy based on customer value and history.",
                    prompt: 'Analyze support message:\n\nMessage: {{incomingMessage.text}}\nChannel: {{incomingMessage.channel}}\nCustomer 360: {{customerContext.text}}\n\nReturn JSON: {"intent": "billing/technical/general/complaint/urgent", "sentiment": {"score": -1 to 1, "label": "angry/frustrated/neutral/satisfied/happy"}, "complexity": "auto-resolve/agent-assist/escalation", "priority": "p1/p2/p3/p4", "suggestedResponse": "", "escalationReason": "", "requiresSpecialist": false, "specialistType": "", "relatedKBArticles": []}',
                    temperature: 0.2,
                    maxTokens: 1200,
                    outputVariable: "classification"
                },
                position: { x: 1240, y: 420 }
            },
            "router-priority": {
                type: "router",
                name: "Route by Priority",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{classification.priority}}",
                    routes: [
                        { value: "p1", label: "Critical", description: "Immediate escalation" },
                        { value: "p2", label: "High", description: "Agent handoff" },
                        { value: "p3", label: "Medium", description: "AI + agent review" },
                        { value: "p4", label: "Low", description: "Auto-resolve" }
                    ],
                    defaultRoute: "p3",
                    outputVariable: "priorityRoute"
                },
                position: { x: 1620, y: 420 }
            },
            "action-zendesk-urgent": {
                type: "action",
                name: "Create Urgent Ticket",
                config: {
                    provider: "zendesk",
                    action: "createTicket",
                    subject: "[P1] {{classification.intent}}: {{incomingMessage.text}}",
                    description:
                        "URGENT - Customer 360:\n{{customerContext.text}}\n\nClassification:\n{{classification.text}}",
                    priority: "urgent",
                    tags: ["p1", "escalation", "{{incomingMessage.channel}}"],
                    outputVariable: "zendeskUrgent"
                },
                position: { x: 2000, y: 150 }
            },
            "action-freshdesk": {
                type: "action",
                name: "Create HD Ticket",
                config: {
                    provider: "freshdesk",
                    action: "createTicket",
                    subject: "{{classification.intent}}: {{incomingMessage.text}}",
                    description: "{{customerContext.text}}\n\n{{classification.text}}",
                    priority: 2,
                    outputVariable: "freshdeskTicket"
                },
                position: { x: 2000, y: 350 }
            },
            "llm-response": {
                type: "llm",
                name: "Generate Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate empathetic, helpful support responses tailored to the customer's history and sentiment.",
                    prompt: "Generate response for:\n\nMessage: {{incomingMessage.text}}\nCustomer: {{customerContext.text}}\nClassification: {{classification.text}}\nSuggested: {{classification.suggestedResponse}}\n\nMake it personal, empathetic, and actionable.",
                    temperature: 0.4,
                    maxTokens: 500,
                    outputVariable: "aiResponse"
                },
                position: { x: 2000, y: 550 }
            },
            "humanReview-1": {
                type: "humanReview",
                name: "Agent Review",
                config: {
                    prompt: "Review AI response before sending",
                    description:
                        "Customer: {{customerContext.customer360.name}}\nSentiment: {{classification.sentiment.label}}\n\nProposed response:\n{{aiResponse.text}}",
                    variableName: "agentApproval",
                    inputType: "text",
                    required: false
                },
                position: { x: 2000, y: 750 }
            },
            "action-slack-urgent": {
                type: "action",
                name: "Alert Urgent",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#support-escalations",
                    text: "🚨 *P1 ESCALATION*\n\n*Customer:* {{customerContext.customer360.name}} ({{customerContext.customer360.support_tier}})\n*Sentiment:* {{classification.sentiment.label}}\n*Channel:* {{incomingMessage.channel}}\n*Message:* {{incomingMessage.text}}\n\n*Zendesk:* {{zendeskUrgent.url}}",
                    outputVariable: "slackUrgent"
                },
                position: { x: 2380, y: 150 }
            },
            "action-slack-queue": {
                type: "action",
                name: "Add to Queue",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#support-queue",
                    text: "📥 *New Ticket*\n\n*Customer:* {{customerContext.customer360.name}}\n*Priority:* {{classification.priority}}\n*Intent:* {{classification.intent}}\n\n*Freshdesk:* {{freshdeskTicket.url}}",
                    outputVariable: "slackQueue"
                },
                position: { x: 2380, y: 350 }
            },
            "action-whatsapp-reply": {
                type: "action",
                name: "Send WhatsApp",
                config: {
                    provider: "whatsapp",
                    action: "sendMessage",
                    to: "{{incomingMessage.from}}",
                    text: "{{agentApproval || aiResponse.text}}",
                    outputVariable: "whatsappReply"
                },
                position: { x: 2380, y: 550 }
            },
            "action-telegram-reply": {
                type: "action",
                name: "Send Telegram",
                config: {
                    provider: "telegram",
                    action: "sendMessage",
                    chatId: "{{incomingMessage.chatId}}",
                    text: "{{agentApproval || aiResponse.text}}",
                    outputVariable: "telegramReply"
                },
                position: { x: 2380, y: 750 }
            },
            "action-intercom-update": {
                type: "action",
                name: "Log to Intercom",
                config: {
                    provider: "intercom",
                    action: "createConversation",
                    userId: "{{customerContext.customer360.email}}",
                    message: "{{incomingMessage.text}}",
                    response: "{{aiResponse.text}}",
                    outputVariable: "intercomConvo"
                },
                position: { x: 2760, y: 420 }
            },
            "action-segment": {
                type: "action",
                name: "Track Analytics",
                config: {
                    provider: "segment",
                    action: "track",
                    event: "support_interaction",
                    userId: "{{customerContext.customer360.email}}",
                    properties: {
                        channel: "{{incomingMessage.channel}}",
                        intent: "{{classification.intent}}",
                        sentiment: "{{classification.sentiment.score}}",
                        priority: "{{classification.priority}}",
                        resolution: "{{classification.complexity}}",
                        response_time_ms: "{{$elapsed}}"
                    },
                    outputVariable: "segmentEvent"
                },
                position: { x: 2760, y: 620 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"handled": true, "channel": "{{incomingMessage.channel}}", "customer": "{{customerContext.customer360.name}}", "intent": "{{classification.intent}}", "sentiment": "{{classification.sentiment.label}}", "priority": "{{classification.priority}}", "resolution": "{{classification.complexity}}", "ticketId": "{{zendeskUrgent.id || freshdeskTicket.id || null}}"}',
                    outputVariable: "supportResult"
                },
                position: { x: 3140, y: 500 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: "{{supportResult}}",
                    format: "json",
                    description: "Support interaction result"
                },
                position: { x: 3520, y: 500 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-whatsapp", target: "action-hubspot" },
            { id: "e2", source: "trigger-telegram", target: "action-hubspot" },
            { id: "e3", source: "trigger-whatsapp", target: "action-salesforce" },
            { id: "e4", source: "trigger-telegram", target: "action-salesforce" },
            { id: "e5", source: "trigger-whatsapp", target: "action-intercom" },
            { id: "e6", source: "trigger-telegram", target: "action-intercom" },
            { id: "e7", source: "action-hubspot", target: "llm-context" },
            { id: "e8", source: "action-salesforce", target: "llm-context" },
            { id: "e9", source: "action-intercom", target: "llm-context" },
            { id: "e10", source: "llm-context", target: "llm-classify" },
            { id: "e11", source: "llm-classify", target: "router-priority" },
            {
                id: "e12",
                source: "router-priority",
                target: "action-zendesk-urgent",
                sourceHandle: "p1"
            },
            {
                id: "e13",
                source: "router-priority",
                target: "action-freshdesk",
                sourceHandle: "p2"
            },
            { id: "e14", source: "router-priority", target: "llm-response", sourceHandle: "p3" },
            { id: "e15", source: "router-priority", target: "llm-response", sourceHandle: "p4" },
            { id: "e16", source: "action-zendesk-urgent", target: "action-slack-urgent" },
            { id: "e17", source: "action-freshdesk", target: "action-slack-queue" },
            { id: "e18", source: "llm-response", target: "humanReview-1" },
            { id: "e19", source: "action-slack-urgent", target: "action-whatsapp-reply" },
            { id: "e20", source: "action-slack-queue", target: "action-whatsapp-reply" },
            { id: "e21", source: "humanReview-1", target: "action-whatsapp-reply" },
            { id: "e22", source: "humanReview-1", target: "action-telegram-reply" },
            { id: "e23", source: "action-whatsapp-reply", target: "action-intercom-update" },
            { id: "e24", source: "action-telegram-reply", target: "action-intercom-update" },
            { id: "e25", source: "action-intercom-update", target: "action-segment" },
            { id: "e26", source: "action-segment", target: "transform-result" },
            { id: "e27", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-whatsapp"
    }
};

// Advanced Pattern 2: DocuSign Contract Automation
// End-to-end contract lifecycle with multi-party signatures and full audit trail
const docusignContractPattern: WorkflowPattern = {
    id: "docusign-contract-automation",
    name: "DocuSign Contract Automation",
    description:
        "Full contract lifecycle: Salesforce deal triggers contract generation, legal review via Slack approval, DocuSign/HelloSign e-signature, countersignature routing, update Salesforce/HubSpot, store in Google Drive/Box, and track in QuickBooks",
    useCase: "Contract automation",
    icon: "FileStack",
    nodeCount: 22,
    category: "advanced",
    integrations: [
        "DocuSign",
        "HelloSign",
        "Salesforce",
        "HubSpot",
        "Slack",
        "Google Drive",
        "Box",
        "QuickBooks",
        "Gmail"
    ],
    definition: {
        name: "DocuSign Contract Automation",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Deal Closed Won",
                config: {
                    triggerType: "webhook",
                    provider: "salesforce",
                    event: "opportunity.closed_won",
                    outputVariable: "sfOpportunity",
                    description: "Triggered when opportunity stage = Closed Won"
                },
                position: { x: 100, y: 500 }
            },
            "action-sf-deal": {
                type: "action",
                name: "Get Deal Details",
                config: {
                    provider: "salesforce",
                    action: "getOpportunity",
                    opportunityId: "{{sfOpportunity.id}}",
                    outputVariable: "dealDetails"
                },
                position: { x: 480, y: 350 }
            },
            "action-sf-account": {
                type: "action",
                name: "Get Account",
                config: {
                    provider: "salesforce",
                    action: "getAccount",
                    accountId: "{{sfOpportunity.accountId}}",
                    outputVariable: "accountDetails"
                },
                position: { x: 480, y: 550 }
            },
            "action-hubspot": {
                type: "action",
                name: "Get HubSpot Data",
                config: {
                    provider: "hubspot",
                    action: "getCompany",
                    domain: "{{accountDetails.website}}",
                    outputVariable: "hubspotCompany"
                },
                position: { x: 480, y: 750 }
            },
            "llm-contract": {
                type: "llm",
                name: "Generate Contract",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a legal document specialist. Generate professional contract terms based on deal parameters. Include standard clauses for liability, termination, and confidentiality.",
                    prompt: 'Generate contract for:\n\nDeal: {{dealDetails}}\nAccount: {{accountDetails}}\nHubSpot: {{hubspotCompany}}\n\nReturn JSON: {"contractTerms": {"parties": {"client": {"name": "", "address": "", "signatory": "", "email": ""}, "provider": {"name": "", "address": "", "signatory": ""}}, "services": [], "pricing": {"total": 0, "payment_schedule": [], "currency": "USD"}, "term": {"start": "", "end": "", "renewal": ""}, "sla": {}, "legal": {"liability_cap": "", "termination_notice": "", "jurisdiction": ""}}, "signers": [{"role": "client", "name": "", "email": ""}, {"role": "internal", "name": "", "email": ""}]}',
                    temperature: 0.1,
                    maxTokens: 2000,
                    outputVariable: "contractData"
                },
                position: { x: 860, y: 500 }
            },
            "conditional-value": {
                type: "conditional",
                name: "High Value?",
                config: {
                    conditionType: "expression",
                    expression: "dealDetails.amount > 50000",
                    outputVariable: "isHighValue"
                },
                position: { x: 1240, y: 350 }
            },
            "humanReview-legal": {
                type: "humanReview",
                name: "Legal Review",
                config: {
                    prompt: "Legal review required for high-value contract",
                    description:
                        "Contract Value: ${{dealDetails.amount}}\nClient: {{accountDetails.name}}\n\nPlease review terms and approve or request changes.",
                    variableName: "legalApproval",
                    inputType: "json",
                    required: true
                },
                position: { x: 1620, y: 200 }
            },
            "action-slack-legal": {
                type: "action",
                name: "Notify Legal",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#legal-review",
                    text: "⚖️ *Contract Review Required*\n\n*Deal:* {{dealDetails.name}}\n*Value:* ${{dealDetails.amount}}\n*Client:* {{accountDetails.name}}\n\nPlease review and approve in the workflow.",
                    outputVariable: "slackLegal"
                },
                position: { x: 1620, y: 400 }
            },
            "action-docusign": {
                type: "action",
                name: "Create DocuSign",
                config: {
                    provider: "docusign",
                    action: "createEnvelope",
                    templateId: "{{env.DOCUSIGN_CONTRACT_TEMPLATE}}",
                    recipients: "{{contractData.signers}}",
                    customFields: "{{contractData.contractTerms}}",
                    outputVariable: "docusignEnvelope"
                },
                position: { x: 2000, y: 350 }
            },
            "action-hellosign": {
                type: "action",
                name: "Create HelloSign",
                config: {
                    provider: "hellosign",
                    action: "createSignatureRequest",
                    templateId: "{{env.HELLOSIGN_CONTRACT_TEMPLATE}}",
                    signers: "{{contractData.signers}}",
                    customFields: "{{contractData.contractTerms}}",
                    outputVariable: "hellosignRequest"
                },
                position: { x: 2000, y: 600 }
            },
            "action-gmail-client": {
                type: "action",
                name: "Email Client",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{contractData.contractTerms.parties.client.email}}",
                    subject: "Contract Ready for Signature: {{dealDetails.name}}",
                    body: "Dear {{contractData.contractTerms.parties.client.signatory}},\n\nYour contract is ready for signature. Please review and sign at your earliest convenience.\n\nContract Value: ${{dealDetails.amount}}\nTerm: {{contractData.contractTerms.term.start}} - {{contractData.contractTerms.term.end}}\n\nBest regards",
                    outputVariable: "clientEmail"
                },
                position: { x: 2380, y: 250 }
            },
            "action-slack-sales": {
                type: "action",
                name: "Notify Sales",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#sales-contracts",
                    text: "📝 *Contract Sent!*\n\n*Deal:* {{dealDetails.name}}\n*Client:* {{accountDetails.name}}\n*Value:* ${{dealDetails.amount}}\n\n*DocuSign:* {{docusignEnvelope.url || hellosignRequest.url}}\n\n_Awaiting client signature..._",
                    outputVariable: "slackSales"
                },
                position: { x: 2380, y: 450 }
            },
            "wait-signature": {
                type: "wait",
                name: "Wait for Signature",
                config: {
                    triggerType: "webhook",
                    provider: "docusign",
                    event: "envelope.completed",
                    outputVariable: "signatureEvent"
                },
                position: { x: 2760, y: 400 }
            },
            "action-gdrive": {
                type: "action",
                name: "Store in Drive",
                config: {
                    provider: "google-drive",
                    action: "uploadFile",
                    folderId: "{{env.GDRIVE_CONTRACTS_FOLDER}}",
                    fileName: "{{dealDetails.name}}_Contract_{{$now}}.pdf",
                    file: "{{signatureEvent.signedDocument}}",
                    outputVariable: "gdriveFile"
                },
                position: { x: 3140, y: 250 }
            },
            "action-box": {
                type: "action",
                name: "Backup to Box",
                config: {
                    provider: "box",
                    action: "uploadFile",
                    folderId: "{{env.BOX_CONTRACTS_FOLDER}}",
                    fileName: "{{dealDetails.name}}_Contract.pdf",
                    file: "{{signatureEvent.signedDocument}}",
                    outputVariable: "boxFile"
                },
                position: { x: 3140, y: 450 }
            },
            "action-sf-update": {
                type: "action",
                name: "Update Salesforce",
                config: {
                    provider: "salesforce",
                    action: "updateOpportunity",
                    opportunityId: "{{sfOpportunity.id}}",
                    fields: {
                        Contract_Signed__c: true,
                        Contract_Date__c: "{{$now}}",
                        Contract_URL__c: "{{gdriveFile.webViewLink}}"
                    },
                    outputVariable: "sfUpdate"
                },
                position: { x: 3140, y: 650 }
            },
            "action-hubspot-update": {
                type: "action",
                name: "Update HubSpot",
                config: {
                    provider: "hubspot",
                    action: "updateDeal",
                    dealId: "{{hubspotCompany.associatedDeals[0]}}",
                    properties: {
                        contract_signed: true,
                        contract_date: "{{$now}}",
                        contract_value: "{{dealDetails.amount}}"
                    },
                    outputVariable: "hubspotUpdate"
                },
                position: { x: 3520, y: 350 }
            },
            "action-quickbooks": {
                type: "action",
                name: "Create Invoice",
                config: {
                    provider: "quickbooks",
                    action: "createInvoice",
                    customerId: "{{accountDetails.quickbooksId}}",
                    lineItems: "{{contractData.contractTerms.pricing.payment_schedule}}",
                    dueDate: "{{contractData.contractTerms.pricing.payment_schedule[0].due_date}}",
                    outputVariable: "qbInvoice"
                },
                position: { x: 3520, y: 550 }
            },
            "action-gmail-confirm": {
                type: "action",
                name: "Send Confirmation",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{contractData.contractTerms.parties.client.email}}",
                    subject: "Contract Executed: {{dealDetails.name}}",
                    body: "Dear {{contractData.contractTerms.parties.client.signatory}},\n\nThank you! Your contract has been fully executed.\n\nContract: {{gdriveFile.webViewLink}}\nInvoice: {{qbInvoice.invoiceNumber}}\n\nWe look forward to working with you!",
                    outputVariable: "confirmEmail"
                },
                position: { x: 3520, y: 750 }
            },
            "action-slack-closed": {
                type: "action",
                name: "Celebrate Close",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#wins",
                    text: "🎉 *CONTRACT SIGNED!*\n\n*Deal:* {{dealDetails.name}}\n*Client:* {{accountDetails.name}}\n*Value:* ${{dealDetails.amount}}\n*Owner:* {{dealDetails.owner}}\n\n🎊 Great work team!",
                    outputVariable: "slackWin"
                },
                position: { x: 3900, y: 450 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"dealId": "{{sfOpportunity.id}}", "contractValue": "{{dealDetails.amount}}", "client": "{{accountDetails.name}}", "envelopeId": "{{docusignEnvelope.envelopeId}}", "signedDate": "{{$now}}", "driveUrl": "{{gdriveFile.webViewLink}}", "invoiceNumber": "{{qbInvoice.invoiceNumber}}"}',
                    outputVariable: "contractResult"
                },
                position: { x: 3900, y: 650 }
            },
            "output-1": {
                type: "output",
                name: "Contract Result",
                config: {
                    outputName: "result",
                    value: "{{contractResult}}",
                    format: "json",
                    description: "Full contract lifecycle result"
                },
                position: { x: 4280, y: 550 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-sf-deal" },
            { id: "e2", source: "trigger-1", target: "action-sf-account" },
            { id: "e3", source: "trigger-1", target: "action-hubspot" },
            { id: "e4", source: "action-sf-deal", target: "llm-contract" },
            { id: "e5", source: "action-sf-account", target: "llm-contract" },
            { id: "e6", source: "action-hubspot", target: "llm-contract" },
            { id: "e7", source: "llm-contract", target: "conditional-value" },
            {
                id: "e8",
                source: "conditional-value",
                target: "humanReview-legal",
                sourceHandle: "true"
            },
            {
                id: "e9",
                source: "conditional-value",
                target: "action-docusign",
                sourceHandle: "false"
            },
            { id: "e10", source: "humanReview-legal", target: "action-slack-legal" },
            { id: "e11", source: "action-slack-legal", target: "action-docusign" },
            { id: "e12", source: "llm-contract", target: "action-hellosign" },
            { id: "e13", source: "action-docusign", target: "action-gmail-client" },
            { id: "e14", source: "action-docusign", target: "action-slack-sales" },
            { id: "e15", source: "action-hellosign", target: "action-slack-sales" },
            { id: "e16", source: "action-gmail-client", target: "wait-signature" },
            { id: "e17", source: "action-slack-sales", target: "wait-signature" },
            { id: "e18", source: "wait-signature", target: "action-gdrive" },
            { id: "e19", source: "wait-signature", target: "action-box" },
            { id: "e20", source: "wait-signature", target: "action-sf-update" },
            { id: "e21", source: "action-gdrive", target: "action-hubspot-update" },
            { id: "e22", source: "action-box", target: "action-hubspot-update" },
            { id: "e23", source: "action-sf-update", target: "action-quickbooks" },
            { id: "e24", source: "action-hubspot-update", target: "action-gmail-confirm" },
            { id: "e25", source: "action-quickbooks", target: "action-gmail-confirm" },
            { id: "e26", source: "action-gmail-confirm", target: "action-slack-closed" },
            { id: "e27", source: "action-slack-closed", target: "transform-result" },
            { id: "e28", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 3: TikTok Content Performance Tracker
// Multi-platform social analytics with competitive intelligence and automated reporting
const tiktokPerformancePattern: WorkflowPattern = {
    id: "tiktok-performance-tracker",
    name: "Social Media Performance Hub",
    description:
        "Cross-platform analytics: aggregate metrics from TikTok, YouTube, Instagram, analyze with AI, competitive benchmarking, automated Looker dashboards, Airtable content calendar sync, Slack trend alerts, and scheduled email reports via Gmail",
    useCase: "Social media analytics",
    icon: "Share2",
    nodeCount: 18,
    category: "advanced",
    integrations: [
        "TikTok",
        "YouTube",
        "Instagram",
        "Google Sheets",
        "Airtable",
        "Looker",
        "PostHog",
        "Slack",
        "Gmail",
        "Notion"
    ],
    definition: {
        name: "Social Media Performance Hub",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Daily 9am",
                config: {
                    triggerType: "schedule",
                    schedule: "0 9 * * *",
                    outputVariable: "scheduleEvent",
                    description: "Runs daily at 9am"
                },
                position: { x: 100, y: 450 }
            },
            "action-tiktok": {
                type: "action",
                name: "TikTok Metrics",
                config: {
                    provider: "tiktok",
                    action: "getVideoMetrics",
                    dateRange: "last_24_hours",
                    outputVariable: "tiktokMetrics"
                },
                position: { x: 480, y: 200 }
            },
            "action-youtube": {
                type: "action",
                name: "YouTube Metrics",
                config: {
                    provider: "youtube",
                    action: "getChannelAnalytics",
                    dateRange: "last_24_hours",
                    outputVariable: "youtubeMetrics"
                },
                position: { x: 480, y: 450 }
            },
            "action-instagram": {
                type: "action",
                name: "Instagram Metrics",
                config: {
                    provider: "instagram",
                    action: "getInsights",
                    dateRange: "last_24_hours",
                    outputVariable: "instagramMetrics"
                },
                position: { x: 480, y: 700 }
            },
            "llm-aggregate": {
                type: "llm",
                name: "Aggregate & Analyze",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a social media analytics expert. Aggregate cross-platform metrics and identify actionable insights.",
                    prompt: 'Aggregate and analyze:\n\nTikTok: {{tiktokMetrics}}\nYouTube: {{youtubeMetrics}}\nInstagram: {{instagramMetrics}}\n\nReturn JSON: {"summary": {"totalReach": 0, "totalEngagement": 0, "engagementRate": 0, "followerGrowth": 0}, "platformBreakdown": {"tiktok": {}, "youtube": {}, "instagram": {}}, "topContent": [{"platform": "", "title": "", "views": 0, "engagement": 0, "viralScore": 0}], "trends": [], "contentGaps": [], "competitorBenchmark": {}, "recommendations": []}',
                    temperature: 0.2,
                    maxTokens: 2000,
                    outputVariable: "aggregatedAnalysis"
                },
                position: { x: 860, y: 450 }
            },
            "llm-insights": {
                type: "llm",
                name: "Generate Insights",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate executive-level social media insights with specific action items.",
                    prompt: "Generate insights report from:\n\n{{aggregatedAnalysis.text}}\n\nInclude: Key wins, areas for improvement, content recommendations, optimal posting times, trending topics to leverage.",
                    temperature: 0.3,
                    maxTokens: 1500,
                    outputVariable: "insights"
                },
                position: { x: 1240, y: 300 }
            },
            "llm-content-ideas": {
                type: "llm",
                name: "Generate Content Ideas",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate viral content ideas based on performance data and trends.",
                    prompt: "Based on top performing content and trends:\n\n{{aggregatedAnalysis.text}}\n\nGenerate 5 content ideas for each platform with hooks, formats, and optimal posting times.",
                    temperature: 0.7,
                    maxTokens: 1500,
                    outputVariable: "contentIdeas"
                },
                position: { x: 1240, y: 600 }
            },
            "action-sheets": {
                type: "action",
                name: "Update Tracker",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.SOCIAL_TRACKER_SHEET}}",
                    sheetName: "Daily Metrics",
                    values: [
                        "{{$now}}",
                        "{{aggregatedAnalysis.summary.totalReach}}",
                        "{{aggregatedAnalysis.summary.totalEngagement}}",
                        "{{aggregatedAnalysis.summary.engagementRate}}",
                        "{{aggregatedAnalysis.summary.followerGrowth}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 1620, y: 200 }
            },
            "action-airtable": {
                type: "action",
                name: "Sync Content Calendar",
                config: {
                    provider: "airtable",
                    action: "createRecords",
                    baseId: "{{env.AIRTABLE_CONTENT_BASE}}",
                    tableId: "Content Ideas",
                    records: "{{contentIdeas.text}}",
                    outputVariable: "airtableRecords"
                },
                position: { x: 1620, y: 450 }
            },
            "action-notion": {
                type: "action",
                name: "Update Notion",
                config: {
                    provider: "notion",
                    action: "createPage",
                    parentId: "{{env.NOTION_SOCIAL_DB}}",
                    properties: {
                        title: "Daily Social Report - {{$now}}",
                        content: "{{insights.text}}"
                    },
                    outputVariable: "notionPage"
                },
                position: { x: 1620, y: 700 }
            },
            "action-looker": {
                type: "action",
                name: "Update Dashboard",
                config: {
                    provider: "looker",
                    action: "runQuery",
                    queryId: "{{env.LOOKER_SOCIAL_QUERY}}",
                    parameters: {
                        date: "{{$now}}",
                        metrics: "{{aggregatedAnalysis.summary}}"
                    },
                    outputVariable: "lookerResult"
                },
                position: { x: 2000, y: 300 }
            },
            "action-posthog": {
                type: "action",
                name: "Track Analytics",
                config: {
                    provider: "posthog",
                    action: "capture",
                    event: "daily_social_metrics",
                    properties: "{{aggregatedAnalysis.summary}}",
                    outputVariable: "posthogResult"
                },
                position: { x: 2000, y: 500 }
            },
            "conditional-viral": {
                type: "conditional",
                name: "Viral Content?",
                config: {
                    conditionType: "expression",
                    expression: "aggregatedAnalysis.topContent[0].viralScore > 80",
                    outputVariable: "hasViral"
                },
                position: { x: 2000, y: 700 }
            },
            "action-slack-alert": {
                type: "action",
                name: "Viral Alert",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#social-wins",
                    text: "🔥 *VIRAL CONTENT ALERT!*\n\n*Platform:* {{aggregatedAnalysis.topContent[0].platform}}\n*Content:* {{aggregatedAnalysis.topContent[0].title}}\n*Views:* {{aggregatedAnalysis.topContent[0].views}}\n*Viral Score:* {{aggregatedAnalysis.topContent[0].viralScore}}/100\n\n_Consider boosting or repurposing!_",
                    outputVariable: "slackViral"
                },
                position: { x: 2380, y: 600 }
            },
            "action-slack-daily": {
                type: "action",
                name: "Daily Summary",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#social-media",
                    text: "📊 *Daily Social Performance*\n\n*Reach:* {{aggregatedAnalysis.summary.totalReach}}\n*Engagement:* {{aggregatedAnalysis.summary.totalEngagement}}\n*Rate:* {{aggregatedAnalysis.summary.engagementRate}}%\n*Growth:* +{{aggregatedAnalysis.summary.followerGrowth}}\n\n📋 *Full Report:* {{notionPage.url}}",
                    outputVariable: "slackDaily"
                },
                position: { x: 2380, y: 350 }
            },
            "action-gmail": {
                type: "action",
                name: "Email Report",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{env.MARKETING_TEAM_EMAIL}}",
                    subject: "Daily Social Media Report - {{$now}}",
                    body: "{{insights.text}}\n\n---\n\nContent Ideas:\n{{contentIdeas.text}}\n\nFull dashboard: {{lookerResult.url}}",
                    outputVariable: "emailReport"
                },
                position: { x: 2760, y: 450 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"date": "{{$now}}", "totalReach": "{{aggregatedAnalysis.summary.totalReach}}", "engagement": "{{aggregatedAnalysis.summary.totalEngagement}}", "engagementRate": "{{aggregatedAnalysis.summary.engagementRate}}", "growth": "{{aggregatedAnalysis.summary.followerGrowth}}", "notionReport": "{{notionPage.url}}", "contentIdeasGenerated": 15}',
                    outputVariable: "dailyResult"
                },
                position: { x: 3140, y: 450 }
            },
            "output-1": {
                type: "output",
                name: "Analysis Result",
                config: {
                    outputName: "result",
                    value: "{{dailyResult}}",
                    format: "json",
                    description: "Cross-platform social analysis"
                },
                position: { x: 3520, y: 450 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-tiktok" },
            { id: "e2", source: "trigger-1", target: "action-youtube" },
            { id: "e3", source: "trigger-1", target: "action-instagram" },
            { id: "e4", source: "action-tiktok", target: "llm-aggregate" },
            { id: "e5", source: "action-youtube", target: "llm-aggregate" },
            { id: "e6", source: "action-instagram", target: "llm-aggregate" },
            { id: "e7", source: "llm-aggregate", target: "llm-insights" },
            { id: "e8", source: "llm-aggregate", target: "llm-content-ideas" },
            { id: "e9", source: "llm-insights", target: "action-sheets" },
            { id: "e10", source: "llm-content-ideas", target: "action-airtable" },
            { id: "e11", source: "llm-insights", target: "action-notion" },
            { id: "e12", source: "action-sheets", target: "action-looker" },
            { id: "e13", source: "action-airtable", target: "action-posthog" },
            { id: "e14", source: "action-notion", target: "conditional-viral" },
            { id: "e15", source: "action-looker", target: "action-slack-daily" },
            { id: "e16", source: "action-posthog", target: "action-slack-daily" },
            {
                id: "e17",
                source: "conditional-viral",
                target: "action-slack-alert",
                sourceHandle: "true"
            },
            {
                id: "e18",
                source: "conditional-viral",
                target: "action-slack-daily",
                sourceHandle: "false"
            },
            { id: "e19", source: "action-slack-alert", target: "action-gmail" },
            { id: "e20", source: "action-slack-daily", target: "action-gmail" },
            { id: "e21", source: "action-gmail", target: "transform-result" },
            { id: "e22", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 4: MongoDB Pipeline Monitor
// Comprehensive data infrastructure monitoring with multi-database support and incident management
const mongodbPipelineMonitorPattern: WorkflowPattern = {
    id: "mongodb-pipeline-monitor",
    name: "Data Infrastructure Monitor",
    description:
        "Monitor MongoDB and PostgreSQL pipelines, AI anomaly detection, auto-create PagerDuty/Sentry incidents, sync to Datadog dashboards, update Amplitude metrics, notify via Slack/Teams, and generate incident reports in Notion",
    useCase: "Data engineering monitoring",
    icon: "Database",
    nodeCount: 20,
    category: "advanced",
    integrations: [
        "MongoDB",
        "PostgreSQL",
        "Datadog",
        "PagerDuty",
        "Sentry",
        "Slack",
        "Microsoft Teams",
        "Amplitude",
        "Notion"
    ],
    definition: {
        name: "Data Infrastructure Monitor",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Every 5 Minutes",
                config: {
                    triggerType: "schedule",
                    schedule: "*/5 * * * *",
                    outputVariable: "scheduleEvent",
                    description: "Runs every 5 minutes"
                },
                position: { x: 100, y: 450 }
            },
            "action-mongodb": {
                type: "action",
                name: "MongoDB Metrics",
                config: {
                    provider: "mongodb",
                    action: "aggregate",
                    collection: "pipeline_metrics",
                    pipeline: [
                        { $match: { timestamp: { $gte: "{{$now - 300000}}" } } },
                        {
                            $group: {
                                _id: "$pipeline",
                                avgLatency: { $avg: "$latency" },
                                errorCount: { $sum: "$errors" },
                                throughput: { $sum: "$records" }
                            }
                        }
                    ],
                    outputVariable: "mongoMetrics"
                },
                position: { x: 480, y: 250 }
            },
            "action-postgresql": {
                type: "action",
                name: "PostgreSQL Metrics",
                config: {
                    provider: "postgresql",
                    action: "query",
                    query: "SELECT pipeline_name, AVG(latency_ms) as avg_latency, SUM(error_count) as errors, SUM(records_processed) as throughput FROM pipeline_runs WHERE created_at > NOW() - INTERVAL '5 minutes' GROUP BY pipeline_name",
                    outputVariable: "pgMetrics"
                },
                position: { x: 480, y: 450 }
            },
            "action-datadog-get": {
                type: "action",
                name: "Datadog Baselines",
                config: {
                    provider: "datadog",
                    action: "queryMetrics",
                    query: "avg:pipeline.latency{*} by {pipeline}.rollup(avg, 3600)",
                    from: "{{$now - 86400000}}",
                    to: "{{$now}}",
                    outputVariable: "datadogBaselines"
                },
                position: { x: 480, y: 650 }
            },
            "llm-analyze": {
                type: "llm",
                name: "AI Anomaly Detection",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a data engineering expert specializing in anomaly detection. Compare current metrics against baselines and identify issues requiring attention.",
                    prompt: 'Analyze infrastructure health:\n\nMongoDB: {{mongoMetrics}}\nPostgreSQL: {{pgMetrics}}\nBaselines (24h): {{datadogBaselines}}\n\nReturn JSON: {"overallHealth": "healthy/degraded/critical", "pipelines": [{"name": "", "status": "ok/warning/critical", "latencyDeviation": 0, "errorRate": 0, "throughputChange": 0}], "anomalies": [{"type": "latency_spike/error_burst/throughput_drop/connection_issue", "severity": "p1/p2/p3/p4", "pipeline": "", "description": "", "possibleCauses": [], "suggestedActions": []}], "predictions": [], "incidentRequired": false, "incidentSeverity": ""}',
                    temperature: 0.1,
                    maxTokens: 2000,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 450 }
            },
            "router-severity": {
                type: "router",
                name: "Route by Severity",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{analysis.overallHealth}}",
                    routes: [
                        { value: "critical", label: "Critical", description: "P1 incident" },
                        { value: "degraded", label: "Degraded", description: "P2/P3 issue" },
                        { value: "healthy", label: "Healthy", description: "Normal operation" }
                    ],
                    defaultRoute: "healthy",
                    outputVariable: "severityRoute"
                },
                position: { x: 1240, y: 450 }
            },
            "action-pagerduty": {
                type: "action",
                name: "Create PagerDuty",
                config: {
                    provider: "pagerduty",
                    action: "createIncident",
                    serviceId: "{{env.PAGERDUTY_DATA_SERVICE}}",
                    title: "[P1] Data Pipeline Critical: {{analysis.anomalies[0].pipeline}}",
                    description:
                        "{{analysis.anomalies[0].description}}\n\nPossible causes: {{analysis.anomalies[0].possibleCauses}}\nSuggested actions: {{analysis.anomalies[0].suggestedActions}}",
                    urgency: "high",
                    outputVariable: "pagerdutyIncident"
                },
                position: { x: 1620, y: 200 }
            },
            "action-sentry": {
                type: "action",
                name: "Create Sentry Issue",
                config: {
                    provider: "sentry",
                    action: "createIssue",
                    projectSlug: "{{env.SENTRY_DATA_PROJECT}}",
                    title: "Pipeline Degradation: {{analysis.anomalies[0].pipeline}}",
                    level: "warning",
                    extra: "{{analysis}}",
                    outputVariable: "sentryIssue"
                },
                position: { x: 1620, y: 450 }
            },
            "action-datadog-event": {
                type: "action",
                name: "Log to Datadog",
                config: {
                    provider: "datadog",
                    action: "submitEvent",
                    title: "Pipeline Health Check",
                    text: "{{analysis.overallHealth}}",
                    alertType: "{{analysis.overallHealth === 'healthy' ? 'info' : 'warning'}}",
                    tags: ["pipeline:all", "source:flowmaestro"],
                    outputVariable: "datadogEvent"
                },
                position: { x: 1620, y: 700 }
            },
            "action-slack-critical": {
                type: "action",
                name: "Critical Alert",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#data-incidents",
                    text: "🚨 *CRITICAL PIPELINE INCIDENT*\n\n*Status:* {{analysis.overallHealth}}\n*Pipeline:* {{analysis.anomalies[0].pipeline}}\n*Issue:* {{analysis.anomalies[0].description}}\n\n*PagerDuty:* {{pagerdutyIncident.html_url}}\n\n*Suggested Actions:*\n{{analysis.anomalies[0].suggestedActions}}",
                    outputVariable: "slackCritical"
                },
                position: { x: 2000, y: 200 }
            },
            "action-teams-critical": {
                type: "action",
                name: "Teams Alert",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Data Engineering",
                    text: "🚨 CRITICAL: {{analysis.anomalies[0].pipeline}} - {{analysis.anomalies[0].description}}",
                    outputVariable: "teamsCritical"
                },
                position: { x: 2000, y: 400 }
            },
            "action-slack-warning": {
                type: "action",
                name: "Warning Alert",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#data-engineering",
                    text: "⚠️ *Pipeline Degradation Detected*\n\n*Status:* {{analysis.overallHealth}}\n*Anomalies:* {{analysis.anomalies.length}}\n\n*Sentry:* {{sentryIssue.permalink}}\n\n_Investigating..._",
                    outputVariable: "slackWarning"
                },
                position: { x: 2000, y: 600 }
            },
            "action-notion-incident": {
                type: "action",
                name: "Create Incident Report",
                config: {
                    provider: "notion",
                    action: "createPage",
                    parentId: "{{env.NOTION_INCIDENTS_DB}}",
                    properties: {
                        title: "Incident: {{analysis.anomalies[0].pipeline}} - {{$now}}",
                        content:
                            "## Incident Summary\n\n**Status:** {{analysis.overallHealth}}\n**Pipeline:** {{analysis.anomalies[0].pipeline}}\n**Type:** {{analysis.anomalies[0].type}}\n**Severity:** {{analysis.anomalies[0].severity}}\n\n## Description\n{{analysis.anomalies[0].description}}\n\n## Possible Causes\n{{analysis.anomalies[0].possibleCauses}}\n\n## Actions Taken\n- PagerDuty: {{pagerdutyIncident.incident_number}}\n- Sentry: {{sentryIssue.shortId}}"
                    },
                    outputVariable: "notionIncident"
                },
                position: { x: 2380, y: 300 }
            },
            "action-amplitude": {
                type: "action",
                name: "Track Metrics",
                config: {
                    provider: "amplitude",
                    action: "track",
                    event: "pipeline_health_check",
                    userId: "system",
                    properties: {
                        overallHealth: "{{analysis.overallHealth}}",
                        pipelineCount: "{{analysis.pipelines.length}}",
                        anomalyCount: "{{analysis.anomalies.length}}",
                        incidentCreated: "{{analysis.incidentRequired}}"
                    },
                    outputVariable: "amplitudeEvent"
                },
                position: { x: 2380, y: 550 }
            },
            "action-datadog-metrics": {
                type: "action",
                name: "Submit Metrics",
                config: {
                    provider: "datadog",
                    action: "submitMetrics",
                    metrics: [
                        {
                            name: "pipeline.health_score",
                            value: "{{analysis.overallHealth === 'healthy' ? 100 : analysis.overallHealth === 'degraded' ? 50 : 0}}",
                            tags: ["source:flowmaestro"]
                        },
                        {
                            name: "pipeline.anomaly_count",
                            value: "{{analysis.anomalies.length}}",
                            tags: ["source:flowmaestro"]
                        }
                    ],
                    outputVariable: "datadogMetrics"
                },
                position: { x: 2380, y: 750 }
            },
            "conditional-healthy": {
                type: "conditional",
                name: "All Healthy?",
                config: {
                    conditionType: "expression",
                    expression: "analysis.overallHealth === 'healthy'",
                    outputVariable: "isHealthy"
                },
                position: { x: 2760, y: 450 }
            },
            "action-slack-healthy": {
                type: "action",
                name: "Status Update",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#data-engineering",
                    text: "✅ All pipelines healthy\n\nPipelines monitored: {{analysis.pipelines.length}}\nLast check: {{$now}}",
                    outputVariable: "slackHealthy"
                },
                position: { x: 3140, y: 300 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"timestamp": "{{$now}}", "health": "{{analysis.overallHealth}}", "pipelinesMonitored": "{{analysis.pipelines.length}}", "anomaliesDetected": "{{analysis.anomalies.length}}", "incidentCreated": "{{pagerdutyIncident.id || sentryIssue.id || null}}", "notionReport": "{{notionIncident.url || null}}"}',
                    outputVariable: "monitorResult"
                },
                position: { x: 3140, y: 550 }
            },
            "output-1": {
                type: "output",
                name: "Monitor Result",
                config: {
                    outputName: "result",
                    value: "{{monitorResult}}",
                    format: "json",
                    description: "Infrastructure monitoring result"
                },
                position: { x: 3520, y: 450 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-mongodb" },
            { id: "e2", source: "trigger-1", target: "action-postgresql" },
            { id: "e3", source: "trigger-1", target: "action-datadog-get" },
            { id: "e4", source: "action-mongodb", target: "llm-analyze" },
            { id: "e5", source: "action-postgresql", target: "llm-analyze" },
            { id: "e6", source: "action-datadog-get", target: "llm-analyze" },
            { id: "e7", source: "llm-analyze", target: "router-severity" },
            {
                id: "e8",
                source: "router-severity",
                target: "action-pagerduty",
                sourceHandle: "critical"
            },
            {
                id: "e9",
                source: "router-severity",
                target: "action-sentry",
                sourceHandle: "degraded"
            },
            {
                id: "e10",
                source: "router-severity",
                target: "action-datadog-event",
                sourceHandle: "healthy"
            },
            { id: "e11", source: "action-pagerduty", target: "action-slack-critical" },
            { id: "e12", source: "action-pagerduty", target: "action-teams-critical" },
            { id: "e13", source: "action-sentry", target: "action-slack-warning" },
            { id: "e14", source: "action-slack-critical", target: "action-notion-incident" },
            { id: "e15", source: "action-teams-critical", target: "action-notion-incident" },
            { id: "e16", source: "action-slack-warning", target: "action-amplitude" },
            { id: "e17", source: "action-datadog-event", target: "action-amplitude" },
            { id: "e18", source: "action-notion-incident", target: "action-amplitude" },
            { id: "e19", source: "action-amplitude", target: "action-datadog-metrics" },
            { id: "e20", source: "action-datadog-metrics", target: "conditional-healthy" },
            {
                id: "e21",
                source: "conditional-healthy",
                target: "action-slack-healthy",
                sourceHandle: "true"
            },
            {
                id: "e22",
                source: "conditional-healthy",
                target: "transform-result",
                sourceHandle: "false"
            },
            { id: "e23", source: "action-slack-healthy", target: "transform-result" },
            { id: "e24", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 5: Microsoft Teams Sales Standup
// Enterprise sales intelligence hub with multi-CRM data and comprehensive reporting
const teamsSalesStandupPattern: WorkflowPattern = {
    id: "teams-sales-standup",
    name: "Enterprise Sales Intelligence Hub",
    description:
        "Full sales intelligence: aggregate HubSpot/Salesforce/Pipedrive pipelines, AI analysis with deal coaching, post to Teams/Slack, update Excel/Sheets dashboards, sync Tableau reports, track in Mixpanel, and generate personalized rep briefings via Outlook",
    useCase: "Enterprise sales reporting",
    icon: "ListTodo",
    nodeCount: 20,
    category: "advanced",
    integrations: [
        "Microsoft Teams",
        "Slack",
        "HubSpot",
        "Salesforce",
        "Pipedrive",
        "Microsoft Excel",
        "Google Sheets",
        "Tableau",
        "Mixpanel",
        "Microsoft Outlook"
    ],
    definition: {
        name: "Enterprise Sales Intelligence Hub",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Daily 8:30am",
                config: {
                    triggerType: "schedule",
                    schedule: "30 8 * * 1-5",
                    outputVariable: "scheduleEvent",
                    description: "Runs Mon-Fri at 8:30am"
                },
                position: { x: 100, y: 500 }
            },
            "action-hubspot": {
                type: "action",
                name: "HubSpot Deals",
                config: {
                    provider: "hubspot",
                    action: "getDeals",
                    filters: { stage: "not_closed" },
                    outputVariable: "hubspotDeals"
                },
                position: { x: 480, y: 250 }
            },
            "action-salesforce": {
                type: "action",
                name: "Salesforce Opps",
                config: {
                    provider: "salesforce",
                    action: "getOpportunities",
                    filters: { isClosed: false },
                    outputVariable: "salesforceOpps"
                },
                position: { x: 480, y: 500 }
            },
            "action-pipedrive": {
                type: "action",
                name: "Pipedrive Deals",
                config: {
                    provider: "pipedrive",
                    action: "getDeals",
                    filters: { status: "open" },
                    outputVariable: "pipedriveDeals"
                },
                position: { x: 480, y: 750 }
            },
            "llm-aggregate": {
                type: "llm",
                name: "Aggregate Pipeline",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a revenue operations expert. Aggregate and normalize deal data from multiple CRMs into a unified pipeline view.",
                    prompt: 'Aggregate pipeline data:\n\nHubSpot: {{hubspotDeals}}\nSalesforce: {{salesforceOpps}}\nPipedrive: {{pipedriveDeals}}\n\nReturn JSON: {"totalPipeline": 0, "weightedPipeline": 0, "dealCount": 0, "byStage": {}, "byRep": {}, "bySource": {}, "closingThisWeek": [], "closingThisMonth": [], "stuckDeals": [], "atRiskDeals": []}',
                    temperature: 0.1,
                    maxTokens: 2000,
                    outputVariable: "aggregatedPipeline"
                },
                position: { x: 860, y: 500 }
            },
            "llm-coaching": {
                type: "llm",
                name: "Deal Coaching",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a sales coach. Analyze deals and provide specific coaching recommendations for each rep.",
                    prompt: "Generate deal coaching based on:\n\n{{aggregatedPipeline.text}}\n\nFor each rep, identify:\n1. Top priority deals to focus on\n2. Deals needing attention\n3. Specific action items\n4. Coaching tips",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "dealCoaching"
                },
                position: { x: 1240, y: 300 }
            },
            "llm-forecast": {
                type: "llm",
                name: "Revenue Forecast",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a revenue analyst. Generate accurate revenue forecasts with confidence intervals.",
                    prompt: "Generate revenue forecast from:\n\n{{aggregatedPipeline.text}}\n\nInclude: commit, best case, upside, and risk-adjusted forecast for this week, month, and quarter.",
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "forecast"
                },
                position: { x: 1240, y: 700 }
            },
            "action-teams": {
                type: "action",
                name: "Teams Standup",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Sales Team",
                    text: "📊 *Daily Sales Standup*\n\n💰 *Pipeline:* ${{aggregatedPipeline.totalPipeline}}\n🎯 *Weighted:* ${{aggregatedPipeline.weightedPipeline}}\n📈 *Deals:* {{aggregatedPipeline.dealCount}}\n\n*Closing This Week:*\n{{aggregatedPipeline.closingThisWeek}}\n\n⚠️ *At Risk:*\n{{aggregatedPipeline.atRiskDeals}}\n\n*Forecast:*\n{{forecast.text}}",
                    outputVariable: "teamsPost"
                },
                position: { x: 1620, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Slack Summary",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#sales-standup",
                    text: "📊 *Daily Pipeline Update*\n\n💰 Total: ${{aggregatedPipeline.totalPipeline}}\n🎯 Weighted: ${{aggregatedPipeline.weightedPipeline}}\n📈 Deals: {{aggregatedPipeline.dealCount}}\n\n_Full standup in Teams_",
                    outputVariable: "slackPost"
                },
                position: { x: 1620, y: 400 }
            },
            "action-excel": {
                type: "action",
                name: "Update Excel",
                config: {
                    provider: "microsoft-excel",
                    action: "appendRow",
                    workbookId: "{{env.SALES_TRACKER_WORKBOOK}}",
                    sheetName: "Daily Metrics",
                    values: [
                        "{{$now}}",
                        "{{aggregatedPipeline.totalPipeline}}",
                        "{{aggregatedPipeline.weightedPipeline}}",
                        "{{aggregatedPipeline.dealCount}}",
                        "{{aggregatedPipeline.closingThisWeek.length}}"
                    ],
                    outputVariable: "excelResult"
                },
                position: { x: 1620, y: 600 }
            },
            "action-sheets": {
                type: "action",
                name: "Update Sheets",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.SALES_DASHBOARD_SHEET}}",
                    sheetName: "Pipeline Tracker",
                    values: [
                        "{{$now}}",
                        "{{aggregatedPipeline.totalPipeline}}",
                        "{{aggregatedPipeline.weightedPipeline}}",
                        "{{aggregatedPipeline.dealCount}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 1620, y: 800 }
            },
            "action-tableau": {
                type: "action",
                name: "Refresh Tableau",
                config: {
                    provider: "tableau",
                    action: "refreshDataSource",
                    datasourceId: "{{env.TABLEAU_SALES_DATASOURCE}}",
                    outputVariable: "tableauRefresh"
                },
                position: { x: 2000, y: 300 }
            },
            "action-mixpanel": {
                type: "action",
                name: "Track Metrics",
                config: {
                    provider: "mixpanel",
                    action: "track",
                    event: "daily_pipeline_update",
                    properties: {
                        totalPipeline: "{{aggregatedPipeline.totalPipeline}}",
                        weightedPipeline: "{{aggregatedPipeline.weightedPipeline}}",
                        dealCount: "{{aggregatedPipeline.dealCount}}",
                        atRiskCount: "{{aggregatedPipeline.atRiskDeals.length}}"
                    },
                    outputVariable: "mixpanelEvent"
                },
                position: { x: 2000, y: 500 }
            },
            "loop-reps": {
                type: "loop",
                name: "For Each Rep",
                config: {
                    collection: "{{Object.keys(aggregatedPipeline.byRep)}}",
                    itemVariable: "repName"
                },
                position: { x: 2000, y: 700 }
            },
            "llm-rep-briefing": {
                type: "llm",
                name: "Rep Briefing",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Generate a personalized daily briefing for a sales rep.",
                    prompt: "Generate briefing for {{repName}}:\n\nPipeline: {{aggregatedPipeline.byRep[repName]}}\nCoaching: {{dealCoaching.text}}\n\nInclude: today's priorities, deals to focus on, specific actions, and motivational message.",
                    temperature: 0.4,
                    maxTokens: 800,
                    outputVariable: "repBriefing"
                },
                position: { x: 2380, y: 600 }
            },
            "action-outlook": {
                type: "action",
                name: "Email Rep",
                config: {
                    provider: "microsoft-outlook",
                    action: "sendEmail",
                    to: "{{repName}}@company.com",
                    subject: "Your Daily Sales Briefing - {{$now}}",
                    body: "{{repBriefing.text}}",
                    outputVariable: "outlookEmail"
                },
                position: { x: 2760, y: 600 }
            },
            "conditional-risk": {
                type: "conditional",
                name: "High Risk Deals?",
                config: {
                    conditionType: "expression",
                    expression: "aggregatedPipeline.atRiskDeals.length > 3",
                    outputVariable: "hasHighRisk"
                },
                position: { x: 2380, y: 350 }
            },
            "action-teams-alert": {
                type: "action",
                name: "Risk Alert",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Sales Leadership",
                    text: "⚠️ *Pipeline Risk Alert*\n\n{{aggregatedPipeline.atRiskDeals.length}} deals at risk totaling ${{aggregatedPipeline.atRiskDeals.reduce((sum, d) => sum + d.value, 0)}}\n\n*Deals:*\n{{aggregatedPipeline.atRiskDeals}}",
                    outputVariable: "teamsAlert"
                },
                position: { x: 2760, y: 250 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"date": "{{$now}}", "totalPipeline": "{{aggregatedPipeline.totalPipeline}}", "weightedPipeline": "{{aggregatedPipeline.weightedPipeline}}", "dealCount": "{{aggregatedPipeline.dealCount}}", "atRiskCount": "{{aggregatedPipeline.atRiskDeals.length}}", "repBriefingsSent": "{{Object.keys(aggregatedPipeline.byRep).length}}"}',
                    outputVariable: "standupResult"
                },
                position: { x: 3140, y: 500 }
            },
            "output-1": {
                type: "output",
                name: "Standup Result",
                config: {
                    outputName: "result",
                    value: "{{standupResult}}",
                    format: "json",
                    description: "Enterprise sales standup result"
                },
                position: { x: 3520, y: 500 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-hubspot" },
            { id: "e2", source: "trigger-1", target: "action-salesforce" },
            { id: "e3", source: "trigger-1", target: "action-pipedrive" },
            { id: "e4", source: "action-hubspot", target: "llm-aggregate" },
            { id: "e5", source: "action-salesforce", target: "llm-aggregate" },
            { id: "e6", source: "action-pipedrive", target: "llm-aggregate" },
            { id: "e7", source: "llm-aggregate", target: "llm-coaching" },
            { id: "e8", source: "llm-aggregate", target: "llm-forecast" },
            { id: "e9", source: "llm-coaching", target: "action-teams" },
            { id: "e10", source: "llm-forecast", target: "action-teams" },
            { id: "e11", source: "action-teams", target: "action-slack" },
            { id: "e12", source: "action-teams", target: "action-excel" },
            { id: "e13", source: "action-slack", target: "action-sheets" },
            { id: "e14", source: "action-excel", target: "action-tableau" },
            { id: "e15", source: "action-sheets", target: "action-mixpanel" },
            { id: "e16", source: "action-tableau", target: "conditional-risk" },
            { id: "e17", source: "action-mixpanel", target: "loop-reps" },
            { id: "e18", source: "loop-reps", target: "llm-rep-briefing" },
            { id: "e19", source: "llm-rep-briefing", target: "action-outlook" },
            {
                id: "e20",
                source: "conditional-risk",
                target: "action-teams-alert",
                sourceHandle: "true"
            },
            {
                id: "e21",
                source: "conditional-risk",
                target: "transform-result",
                sourceHandle: "false"
            },
            { id: "e22", source: "action-teams-alert", target: "transform-result" },
            { id: "e23", source: "action-outlook", target: "transform-result" },
            { id: "e24", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 6: Stripe Payment Reconciliation
// Full financial operations automation with multi-gateway reconciliation
const stripeReconciliationPattern: WorkflowPattern = {
    id: "stripe-payment-reconciliation",
    name: "Financial Operations Hub",
    description:
        "Multi-gateway reconciliation: aggregate Stripe/Shopify payments, match with QuickBooks/FreshBooks invoices, AI fraud detection, auto-sync to accounting, generate Looker reports, alert finance via Slack/Teams, and email executive summaries",
    useCase: "Finance automation",
    icon: "ClipboardCheck",
    nodeCount: 20,
    category: "advanced",
    integrations: [
        "Stripe",
        "Shopify",
        "QuickBooks",
        "FreshBooks",
        "Google Sheets",
        "Looker",
        "Slack",
        "Microsoft Teams",
        "Gmail"
    ],
    definition: {
        name: "Financial Operations Hub",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Daily 6am",
                config: {
                    triggerType: "schedule",
                    schedule: "0 6 * * *",
                    outputVariable: "scheduleEvent",
                    description: "Runs daily at 6am"
                },
                position: { x: 100, y: 500 }
            },
            "action-stripe": {
                type: "action",
                name: "Stripe Charges",
                config: {
                    provider: "stripe",
                    action: "listCharges",
                    dateRange: "last_24_hours",
                    outputVariable: "stripeCharges"
                },
                position: { x: 480, y: 250 }
            },
            "action-stripe-refunds": {
                type: "action",
                name: "Stripe Refunds",
                config: {
                    provider: "stripe",
                    action: "listRefunds",
                    dateRange: "last_24_hours",
                    outputVariable: "stripeRefunds"
                },
                position: { x: 480, y: 450 }
            },
            "action-shopify": {
                type: "action",
                name: "Shopify Orders",
                config: {
                    provider: "shopify",
                    action: "getOrders",
                    dateRange: "last_24_hours",
                    financialStatus: "paid",
                    outputVariable: "shopifyOrders"
                },
                position: { x: 480, y: 650 }
            },
            "action-quickbooks": {
                type: "action",
                name: "QuickBooks Invoices",
                config: {
                    provider: "quickbooks",
                    action: "getInvoices",
                    dateRange: "last_24_hours",
                    outputVariable: "qbInvoices"
                },
                position: { x: 480, y: 850 }
            },
            "llm-reconcile": {
                type: "llm",
                name: "Reconcile Payments",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a financial reconciliation expert. Match payments across gateways with invoices and identify discrepancies.",
                    prompt: 'Reconcile financial data:\n\nStripe Charges: {{stripeCharges}}\nStripe Refunds: {{stripeRefunds}}\nShopify Orders: {{shopifyOrders}}\nQuickBooks Invoices: {{qbInvoices}}\n\nReturn JSON: {"summary": {"totalRevenue": 0, "stripeVolume": 0, "shopifyVolume": 0, "totalRefunds": 0, "netRevenue": 0}, "matched": [], "unmatched": {"payments": [], "invoices": []}, "discrepancies": [{"type": "", "amount": 0, "description": ""}], "refundRate": 0, "avgTransactionValue": 0}',
                    temperature: 0.1,
                    maxTokens: 2500,
                    outputVariable: "reconciliation"
                },
                position: { x: 860, y: 500 }
            },
            "llm-fraud": {
                type: "llm",
                name: "Fraud Detection",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a fraud detection specialist. Analyze transaction patterns for suspicious activity.",
                    prompt: 'Analyze for fraud patterns:\n\n{{stripeCharges}}\n{{shopifyOrders}}\n\nLook for: unusual amounts, velocity anomalies, geographic anomalies, repeated declines, card testing patterns.\n\nReturn JSON: {"riskScore": 0-100, "flaggedTransactions": [{"id": "", "reason": "", "riskLevel": "high/medium/low"}], "patterns": [], "recommendations": []}',
                    temperature: 0.1,
                    maxTokens: 1500,
                    outputVariable: "fraudAnalysis"
                },
                position: { x: 1240, y: 300 }
            },
            "llm-insights": {
                type: "llm",
                name: "Financial Insights",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate executive-level financial insights and recommendations.",
                    prompt: "Generate financial insights from:\n\nReconciliation: {{reconciliation.text}}\nFraud: {{fraudAnalysis.text}}\n\nInclude: key metrics, trends, concerns, and recommended actions.",
                    temperature: 0.3,
                    maxTokens: 1000,
                    outputVariable: "insights"
                },
                position: { x: 1240, y: 700 }
            },
            "action-quickbooks-sync": {
                type: "action",
                name: "Sync to QuickBooks",
                config: {
                    provider: "quickbooks",
                    action: "createPayments",
                    payments: "{{reconciliation.matched}}",
                    outputVariable: "qbSync"
                },
                position: { x: 1620, y: 250 }
            },
            "action-freshbooks": {
                type: "action",
                name: "Sync to FreshBooks",
                config: {
                    provider: "freshbooks",
                    action: "recordPayments",
                    payments: "{{reconciliation.matched}}",
                    outputVariable: "fbSync"
                },
                position: { x: 1620, y: 450 }
            },
            "action-sheets": {
                type: "action",
                name: "Update Tracker",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.FINANCE_TRACKER_SHEET}}",
                    sheetName: "Daily Reconciliation",
                    values: [
                        "{{$now}}",
                        "{{reconciliation.summary.totalRevenue}}",
                        "{{reconciliation.summary.netRevenue}}",
                        "{{reconciliation.summary.totalRefunds}}",
                        "{{reconciliation.unmatched.payments.length}}",
                        "{{fraudAnalysis.riskScore}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 1620, y: 650 }
            },
            "action-looker": {
                type: "action",
                name: "Update Dashboard",
                config: {
                    provider: "looker",
                    action: "runQuery",
                    queryId: "{{env.LOOKER_FINANCE_QUERY}}",
                    outputVariable: "lookerResult"
                },
                position: { x: 1620, y: 850 }
            },
            "router-risk": {
                type: "router",
                name: "Route by Risk",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{fraudAnalysis.riskScore > 70 ? 'high' : fraudAnalysis.riskScore > 40 ? 'medium' : 'low'}}",
                    routes: [
                        {
                            value: "high",
                            label: "High Risk",
                            description: "Immediate action needed"
                        },
                        {
                            value: "medium",
                            label: "Medium Risk",
                            description: "Review recommended"
                        },
                        { value: "low", label: "Low Risk", description: "Normal operation" }
                    ],
                    defaultRoute: "low",
                    outputVariable: "riskRoute"
                },
                position: { x: 2000, y: 400 }
            },
            "action-slack-alert": {
                type: "action",
                name: "Fraud Alert",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#finance-fraud-alerts",
                    text: "🚨 *HIGH RISK FRAUD ALERT*\n\n*Risk Score:* {{fraudAnalysis.riskScore}}/100\n*Flagged Transactions:* {{fraudAnalysis.flaggedTransactions.length}}\n\n*Details:*\n{{fraudAnalysis.flaggedTransactions}}\n\n_Immediate review required!_",
                    outputVariable: "slackFraud"
                },
                position: { x: 2380, y: 200 }
            },
            "action-teams-alert": {
                type: "action",
                name: "Teams Alert",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Finance",
                    text: "🚨 FRAUD ALERT: Risk score {{fraudAnalysis.riskScore}}/100 - {{fraudAnalysis.flaggedTransactions.length}} flagged transactions",
                    outputVariable: "teamsAlert"
                },
                position: { x: 2380, y: 400 }
            },
            "action-slack-summary": {
                type: "action",
                name: "Daily Summary",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#finance",
                    text: "💰 *Daily Financial Summary*\n\n*Revenue:* ${{reconciliation.summary.totalRevenue}}\n*Net:* ${{reconciliation.summary.netRevenue}}\n*Refunds:* ${{reconciliation.summary.totalRefunds}} ({{reconciliation.refundRate}}%)\n*Avg Transaction:* ${{reconciliation.summary.avgTransactionValue}}\n\n*Unmatched:* {{reconciliation.unmatched.payments.length}} payments, {{reconciliation.unmatched.invoices.length}} invoices\n*Risk Score:* {{fraudAnalysis.riskScore}}/100\n\n📊 *Dashboard:* {{lookerResult.url}}",
                    outputVariable: "slackSummary"
                },
                position: { x: 2380, y: 600 }
            },
            "action-gmail": {
                type: "action",
                name: "Email CFO",
                config: {
                    provider: "gmail",
                    action: "sendEmail",
                    to: "{{env.CFO_EMAIL}}",
                    subject: "Daily Financial Report - {{$now}}",
                    body: "{{insights.text}}\n\n---\n\nKey Metrics:\n- Total Revenue: ${{reconciliation.summary.totalRevenue}}\n- Net Revenue: ${{reconciliation.summary.netRevenue}}\n- Refund Rate: {{reconciliation.refundRate}}%\n- Fraud Risk Score: {{fraudAnalysis.riskScore}}/100\n\nDashboard: {{lookerResult.url}}",
                    outputVariable: "cfoEmail"
                },
                position: { x: 2760, y: 500 }
            },
            "conditional-discrepancy": {
                type: "conditional",
                name: "Has Discrepancies?",
                config: {
                    conditionType: "expression",
                    expression: "reconciliation.discrepancies.length > 0",
                    outputVariable: "hasDiscrepancies"
                },
                position: { x: 2760, y: 750 }
            },
            "action-slack-discrepancy": {
                type: "action",
                name: "Alert Discrepancies",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#finance-reconciliation",
                    text: "⚠️ *Reconciliation Discrepancies*\n\n{{reconciliation.discrepancies.length}} discrepancies found:\n\n{{reconciliation.discrepancies}}\n\n_Please investigate and resolve._",
                    outputVariable: "slackDiscrepancy"
                },
                position: { x: 3140, y: 750 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"date": "{{$now}}", "totalRevenue": "{{reconciliation.summary.totalRevenue}}", "netRevenue": "{{reconciliation.summary.netRevenue}}", "refundRate": "{{reconciliation.refundRate}}", "riskScore": "{{fraudAnalysis.riskScore}}", "unmatchedPayments": "{{reconciliation.unmatched.payments.length}}", "discrepancies": "{{reconciliation.discrepancies.length}}", "syncedToQuickBooks": true}',
                    outputVariable: "financeResult"
                },
                position: { x: 3140, y: 500 }
            },
            "output-1": {
                type: "output",
                name: "Reconciliation Result",
                config: {
                    outputName: "result",
                    value: "{{financeResult}}",
                    format: "json",
                    description: "Financial operations result"
                },
                position: { x: 3520, y: 500 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-stripe" },
            { id: "e2", source: "trigger-1", target: "action-stripe-refunds" },
            { id: "e3", source: "trigger-1", target: "action-shopify" },
            { id: "e4", source: "trigger-1", target: "action-quickbooks" },
            { id: "e5", source: "action-stripe", target: "llm-reconcile" },
            { id: "e6", source: "action-stripe-refunds", target: "llm-reconcile" },
            { id: "e7", source: "action-shopify", target: "llm-reconcile" },
            { id: "e8", source: "action-quickbooks", target: "llm-reconcile" },
            { id: "e9", source: "llm-reconcile", target: "llm-fraud" },
            { id: "e10", source: "llm-reconcile", target: "llm-insights" },
            { id: "e11", source: "llm-fraud", target: "action-quickbooks-sync" },
            { id: "e12", source: "llm-insights", target: "action-freshbooks" },
            { id: "e13", source: "action-quickbooks-sync", target: "action-sheets" },
            { id: "e14", source: "action-freshbooks", target: "action-looker" },
            { id: "e15", source: "action-sheets", target: "router-risk" },
            { id: "e16", source: "action-looker", target: "router-risk" },
            {
                id: "e17",
                source: "router-risk",
                target: "action-slack-alert",
                sourceHandle: "high"
            },
            {
                id: "e18",
                source: "router-risk",
                target: "action-teams-alert",
                sourceHandle: "high"
            },
            {
                id: "e19",
                source: "router-risk",
                target: "action-slack-summary",
                sourceHandle: "medium"
            },
            {
                id: "e20",
                source: "router-risk",
                target: "action-slack-summary",
                sourceHandle: "low"
            },
            { id: "e21", source: "action-slack-alert", target: "action-gmail" },
            { id: "e22", source: "action-teams-alert", target: "action-gmail" },
            { id: "e23", source: "action-slack-summary", target: "action-gmail" },
            { id: "e24", source: "action-gmail", target: "conditional-discrepancy" },
            {
                id: "e25",
                source: "conditional-discrepancy",
                target: "action-slack-discrepancy",
                sourceHandle: "true"
            },
            {
                id: "e26",
                source: "conditional-discrepancy",
                target: "transform-result",
                sourceHandle: "false"
            },
            { id: "e27", source: "action-slack-discrepancy", target: "transform-result" },
            { id: "e28", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 7: Intercom Conversation Analyzer
// Comprehensive support intelligence with multi-channel analysis and product feedback loops
const intercomAnalyzerPattern: WorkflowPattern = {
    id: "intercom-conversation-analyzer",
    name: "Support Intelligence Platform",
    description:
        "Multi-channel support analysis: aggregate Intercom/Zendesk/Freshdesk conversations, AI sentiment and topic extraction, product feedback to Linear/Jira, customer health sync to HubSpot, Looker dashboards, Slack/Teams alerts, and Notion knowledge base updates",
    useCase: "Support analytics",
    icon: "MessageSquare",
    nodeCount: 20,
    category: "advanced",
    integrations: [
        "Intercom",
        "Zendesk",
        "Freshdesk",
        "HubSpot",
        "Linear",
        "Jira",
        "Looker",
        "Slack",
        "Microsoft Teams",
        "Notion",
        "Google Sheets"
    ],
    definition: {
        name: "Support Intelligence Platform",
        nodes: {
            "trigger-intercom": {
                type: "trigger",
                name: "Intercom Closed",
                config: {
                    triggerType: "webhook",
                    provider: "intercom",
                    event: "conversation.closed",
                    outputVariable: "supportEvent",
                    description: "Triggered when Intercom conversation closes"
                },
                position: { x: 100, y: 350 }
            },
            "trigger-zendesk": {
                type: "trigger",
                name: "Zendesk Solved",
                config: {
                    triggerType: "webhook",
                    provider: "zendesk",
                    event: "ticket.solved",
                    outputVariable: "supportEvent",
                    description: "Triggered when Zendesk ticket is solved"
                },
                position: { x: 100, y: 600 }
            },
            "action-intercom-get": {
                type: "action",
                name: "Get Conversation",
                config: {
                    provider: "intercom",
                    action: "getConversation",
                    conversationId: "{{supportEvent.conversationId}}",
                    outputVariable: "conversationData"
                },
                position: { x: 480, y: 350 }
            },
            "action-zendesk-get": {
                type: "action",
                name: "Get Ticket",
                config: {
                    provider: "zendesk",
                    action: "getTicket",
                    ticketId: "{{supportEvent.ticketId}}",
                    outputVariable: "conversationData"
                },
                position: { x: 480, y: 600 }
            },
            "action-hubspot": {
                type: "action",
                name: "Get Customer",
                config: {
                    provider: "hubspot",
                    action: "getContactByEmail",
                    email: "{{conversationData.customer.email}}",
                    outputVariable: "customerData"
                },
                position: { x: 860, y: 250 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Deep Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a customer support intelligence expert. Perform deep analysis of support conversations to extract actionable insights.",
                    prompt: 'Analyze support conversation:\n\nConversation: {{conversationData}}\nCustomer Profile: {{customerData}}\n\nReturn JSON: {"topic": {"primary": "", "secondary": []}, "sentiment": {"score": -1 to 1, "label": "", "journey": []}, "resolution": {"status": "resolved/partial/unresolved/escalated", "firstContactResolution": true/false, "timeToResolution": 0}, "rootCause": {"category": "", "description": "", "isRecurring": false}, "productFeedback": {"type": "bug/feature/improvement/docs", "priority": "p1/p2/p3/p4", "description": "", "affectedFeature": ""}, "customerHealth": {"riskLevel": "high/medium/low", "churnRisk": 0-100, "expansionOpportunity": 0-100}, "agentPerformance": {"helpful": true/false, "areas_for_improvement": []}, "kbArticleSuggestion": {"needed": true/false, "topic": "", "outline": ""}}',
                    temperature: 0.2,
                    maxTokens: 2000,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 500 }
            },
            "router-feedback": {
                type: "router",
                name: "Route Feedback",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{analysis.productFeedback.type}}",
                    routes: [
                        { value: "bug", label: "Bug", description: "Technical issue" },
                        { value: "feature", label: "Feature", description: "Feature request" },
                        { value: "improvement", label: "Improvement", description: "Enhancement" },
                        { value: "docs", label: "Documentation", description: "Docs update needed" }
                    ],
                    defaultRoute: "improvement",
                    outputVariable: "feedbackRoute"
                },
                position: { x: 1240, y: 350 }
            },
            "action-linear": {
                type: "action",
                name: "Create Linear Issue",
                config: {
                    provider: "linear",
                    action: "createIssue",
                    teamId: "{{env.LINEAR_PRODUCT_TEAM}}",
                    title: "[Support] {{analysis.productFeedback.description}}",
                    description:
                        "From support conversation:\n\nCustomer: {{customerData.email}}\nTopic: {{analysis.topic.primary}}\nRoot Cause: {{analysis.rootCause.description}}\n\nPriority: {{analysis.productFeedback.priority}}",
                    priority:
                        "{{analysis.productFeedback.priority === 'p1' ? 1 : analysis.productFeedback.priority === 'p2' ? 2 : 3}}",
                    labels: ["support-feedback", "{{analysis.productFeedback.type}}"],
                    outputVariable: "linearIssue"
                },
                position: { x: 1620, y: 200 }
            },
            "action-jira": {
                type: "action",
                name: "Create Jira Issue",
                config: {
                    provider: "jira",
                    action: "createIssue",
                    projectKey: "{{env.JIRA_SUPPORT_PROJECT}}",
                    issueType: "Bug",
                    summary: "[Support Bug] {{analysis.productFeedback.description}}",
                    description:
                        "{{analysis.rootCause.description}}\n\nAffected Feature: {{analysis.productFeedback.affectedFeature}}",
                    priority: "High",
                    outputVariable: "jiraIssue"
                },
                position: { x: 1620, y: 400 }
            },
            "action-notion": {
                type: "action",
                name: "Update KB",
                config: {
                    provider: "notion",
                    action: "createPage",
                    parentId: "{{env.NOTION_KB_DATABASE}}",
                    properties: {
                        title: "{{analysis.kbArticleSuggestion.topic}}",
                        content: "{{analysis.kbArticleSuggestion.outline}}",
                        status: "Draft"
                    },
                    outputVariable: "notionArticle"
                },
                position: { x: 1620, y: 600 }
            },
            "action-hubspot-update": {
                type: "action",
                name: "Update Health Score",
                config: {
                    provider: "hubspot",
                    action: "updateContact",
                    email: "{{conversationData.customer.email}}",
                    properties: {
                        support_sentiment: "{{analysis.sentiment.label}}",
                        churn_risk_score: "{{analysis.customerHealth.churnRisk}}",
                        last_support_topic: "{{analysis.topic.primary}}",
                        expansion_opportunity: "{{analysis.customerHealth.expansionOpportunity}}"
                    },
                    outputVariable: "hubspotUpdate"
                },
                position: { x: 1620, y: 800 }
            },
            "action-sheets": {
                type: "action",
                name: "Log Analytics",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.SUPPORT_ANALYTICS_SHEET}}",
                    sheetName: "Conversation Log",
                    values: [
                        "{{$now}}",
                        "{{analysis.topic.primary}}",
                        "{{analysis.sentiment.label}}",
                        "{{analysis.resolution.status}}",
                        "{{analysis.resolution.firstContactResolution}}",
                        "{{analysis.customerHealth.churnRisk}}",
                        "{{analysis.productFeedback.type}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 2000, y: 550 }
            },
            "action-looker": {
                type: "action",
                name: "Refresh Dashboard",
                config: {
                    provider: "looker",
                    action: "runQuery",
                    queryId: "{{env.LOOKER_SUPPORT_QUERY}}",
                    outputVariable: "lookerResult"
                },
                position: { x: 2000, y: 750 }
            },
            "conditional-churn": {
                type: "conditional",
                name: "Churn Risk?",
                config: {
                    conditionType: "expression",
                    expression: "analysis.customerHealth.churnRisk > 70",
                    outputVariable: "highChurnRisk"
                },
                position: { x: 2380, y: 300 }
            },
            "action-slack-churn": {
                type: "action",
                name: "Churn Alert",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#customer-success",
                    text: "🚨 *High Churn Risk Customer*\n\n*Customer:* {{customerData.email}}\n*Company:* {{customerData.company}}\n*Risk Score:* {{analysis.customerHealth.churnRisk}}/100\n*Last Issue:* {{analysis.topic.primary}}\n*Sentiment:* {{analysis.sentiment.label}}\n\n_Immediate outreach recommended!_",
                    outputVariable: "slackChurn"
                },
                position: { x: 2760, y: 200 }
            },
            "action-slack-insights": {
                type: "action",
                name: "Share Insights",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#support-insights",
                    text: "🔍 *Support Conversation Analyzed*\n\n*Topic:* {{analysis.topic.primary}}\n*Resolution:* {{analysis.resolution.status}}\n*FCR:* {{analysis.resolution.firstContactResolution}}\n*Sentiment:* {{analysis.sentiment.label}}\n\n*Product Feedback:* {{analysis.productFeedback.type}} - {{analysis.productFeedback.description}}\n{{linearIssue.url || jiraIssue.url || ''}}",
                    outputVariable: "slackInsights"
                },
                position: { x: 2760, y: 450 }
            },
            "action-teams": {
                type: "action",
                name: "Teams Update",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Support",
                    text: "📊 Conversation: {{analysis.topic.primary}} | {{analysis.resolution.status}} | Sentiment: {{analysis.sentiment.label}}",
                    outputVariable: "teamsUpdate"
                },
                position: { x: 2760, y: 650 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"conversationId": "{{supportEvent.conversationId || supportEvent.ticketId}}", "topic": "{{analysis.topic.primary}}", "sentiment": "{{analysis.sentiment.label}}", "resolution": "{{analysis.resolution.status}}", "churnRisk": "{{analysis.customerHealth.churnRisk}}", "productFeedback": "{{analysis.productFeedback.type}}", "linearIssue": "{{linearIssue.id || null}}", "jiraIssue": "{{jiraIssue.key || null}}"}',
                    outputVariable: "analysisResult"
                },
                position: { x: 3140, y: 500 }
            },
            "output-1": {
                type: "output",
                name: "Analysis Result",
                config: {
                    outputName: "result",
                    value: "{{analysisResult}}",
                    format: "json",
                    description: "Support intelligence result"
                },
                position: { x: 3520, y: 500 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-intercom", target: "action-intercom-get" },
            { id: "e2", source: "trigger-zendesk", target: "action-zendesk-get" },
            { id: "e3", source: "action-intercom-get", target: "action-hubspot" },
            { id: "e4", source: "action-zendesk-get", target: "action-hubspot" },
            { id: "e5", source: "action-hubspot", target: "llm-analyze" },
            { id: "e6", source: "action-intercom-get", target: "llm-analyze" },
            { id: "e7", source: "action-zendesk-get", target: "llm-analyze" },
            { id: "e8", source: "llm-analyze", target: "router-feedback" },
            {
                id: "e9",
                source: "router-feedback",
                target: "action-linear",
                sourceHandle: "feature"
            },
            {
                id: "e10",
                source: "router-feedback",
                target: "action-linear",
                sourceHandle: "improvement"
            },
            { id: "e11", source: "router-feedback", target: "action-jira", sourceHandle: "bug" },
            { id: "e12", source: "router-feedback", target: "action-notion", sourceHandle: "docs" },
            { id: "e13", source: "llm-analyze", target: "action-hubspot-update" },
            { id: "e14", source: "action-linear", target: "action-sheets" },
            { id: "e15", source: "action-jira", target: "action-sheets" },
            { id: "e16", source: "action-notion", target: "action-sheets" },
            { id: "e17", source: "action-hubspot-update", target: "action-looker" },
            { id: "e18", source: "action-sheets", target: "conditional-churn" },
            { id: "e19", source: "action-looker", target: "conditional-churn" },
            {
                id: "e20",
                source: "conditional-churn",
                target: "action-slack-churn",
                sourceHandle: "true"
            },
            {
                id: "e21",
                source: "conditional-churn",
                target: "action-slack-insights",
                sourceHandle: "false"
            },
            { id: "e22", source: "action-slack-churn", target: "action-slack-insights" },
            { id: "e23", source: "action-slack-insights", target: "action-teams" },
            { id: "e24", source: "action-teams", target: "transform-result" },
            { id: "e25", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "trigger-intercom"
    }
};

// Advanced Pattern 8: Multi-Channel Content Publisher
// Complete content distribution engine with scheduling, optimization, and performance tracking
const multiChannelPublisherPattern: WorkflowPattern = {
    id: "multi-channel-publisher",
    name: "Content Distribution Engine",
    description:
        "Omnichannel content publishing: optimize for YouTube, TikTok, Instagram, Twitter, LinkedIn, Reddit, and Medium with AI-generated platform-specific content, scheduled publishing via Buffer, performance tracking in Amplitude, Notion content calendar, and comprehensive Slack/Teams reporting",
    useCase: "Content distribution",
    icon: "Share2",
    nodeCount: 22,
    category: "advanced",
    integrations: [
        "YouTube",
        "TikTok",
        "Instagram",
        "Twitter",
        "LinkedIn",
        "Reddit",
        "Medium",
        "Buffer",
        "Amplitude",
        "Notion",
        "Slack",
        "Microsoft Teams",
        "Google Drive"
    ],
    definition: {
        name: "Content Distribution Engine",
        nodes: {
            "input-1": {
                type: "input",
                name: "Content Input",
                config: {
                    inputName: "content",
                    inputVariable: "content",
                    inputType: "json",
                    required: true,
                    description: "Content to publish",
                    defaultValue:
                        '{"title": "", "description": "", "videoUrl": "", "imageUrl": "", "tags": [], "targetAudience": "", "contentType": "video/article/image", "scheduledTime": ""}'
                },
                position: { x: 100, y: 550 }
            },
            "action-gdrive": {
                type: "action",
                name: "Get Assets",
                config: {
                    provider: "google-drive",
                    action: "getFile",
                    fileId: "{{content.assetId}}",
                    outputVariable: "contentAssets"
                },
                position: { x: 480, y: 550 }
            },
            "llm-youtube": {
                type: "llm",
                name: "YouTube Optimization",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Create SEO-optimized YouTube content with maximum discoverability.",
                    prompt: "Optimize for YouTube:\n\n{{content}}\n\nGenerate: Title (60 chars max, keyword-rich), Description (5000 chars with timestamps, chapters, links), Tags (500 chars), End screen CTA.",
                    temperature: 0.5,
                    maxTokens: 1500,
                    outputVariable: "youtubeContent"
                },
                position: { x: 860, y: 150 }
            },
            "llm-tiktok": {
                type: "llm",
                name: "TikTok Optimization",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create viral TikTok content optimized for the algorithm.",
                    prompt: "Optimize for TikTok:\n\n{{content}}\n\nGenerate: Hook (first 3 seconds script), Caption (150 chars), Hashtags (trending + niche), Sound suggestion, Duet/stitch ideas.",
                    temperature: 0.7,
                    maxTokens: 800,
                    outputVariable: "tiktokContent"
                },
                position: { x: 860, y: 350 }
            },
            "llm-instagram": {
                type: "llm",
                name: "Instagram Optimization",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create engaging Instagram content for maximum reach.",
                    prompt: "Optimize for Instagram:\n\n{{content}}\n\nGenerate: Caption (compelling story, CTA), Hashtags (30 relevant), Reel script (if video), Story sequence, Alt text.",
                    temperature: 0.6,
                    maxTokens: 1000,
                    outputVariable: "instagramContent"
                },
                position: { x: 860, y: 550 }
            },
            "llm-twitter": {
                type: "llm",
                name: "Twitter Thread",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create viral Twitter threads that drive engagement.",
                    prompt: "Create Twitter thread from:\n\n{{content}}\n\nGenerate: Hook tweet, 5-7 thread tweets, Engagement CTA, Quote tweet suggestion.",
                    temperature: 0.6,
                    maxTokens: 1200,
                    outputVariable: "twitterContent"
                },
                position: { x: 860, y: 750 }
            },
            "llm-linkedin": {
                type: "llm",
                name: "LinkedIn Post",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create professional LinkedIn content that builds authority.",
                    prompt: "Optimize for LinkedIn:\n\n{{content}}\n\nGenerate: Hook (pattern interrupt), Body (storytelling, value), Hashtags (professional), Article version if long-form.",
                    temperature: 0.5,
                    maxTokens: 1500,
                    outputVariable: "linkedinContent"
                },
                position: { x: 860, y: 950 }
            },
            "llm-reddit": {
                type: "llm",
                name: "Reddit Strategy",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create authentic Reddit content that adds value to communities.",
                    prompt: "Create Reddit strategy:\n\n{{content}}\n\nGenerate: Target subreddits (5), Post titles per subreddit, Content adapted per community, Comment engagement plan.",
                    temperature: 0.5,
                    maxTokens: 1000,
                    outputVariable: "redditContent"
                },
                position: { x: 1240, y: 150 }
            },
            "llm-medium": {
                type: "llm",
                name: "Medium Article",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create SEO-optimized Medium articles for thought leadership.",
                    prompt: "Create Medium article from:\n\n{{content}}\n\nGenerate: Title, Subtitle, Full article (1500-2000 words), Publication targeting, Tags.",
                    temperature: 0.4,
                    maxTokens: 3000,
                    outputVariable: "mediumContent"
                },
                position: { x: 1240, y: 350 }
            },
            "action-youtube": {
                type: "action",
                name: "Publish YouTube",
                config: {
                    provider: "youtube",
                    action: "uploadVideo",
                    title: "{{youtubeContent.title}}",
                    description: "{{youtubeContent.description}}",
                    tags: "{{youtubeContent.tags}}",
                    videoFile: "{{contentAssets}}",
                    outputVariable: "youtubeResult"
                },
                position: { x: 1620, y: 150 }
            },
            "action-buffer-tiktok": {
                type: "action",
                name: "Schedule TikTok",
                config: {
                    provider: "buffer",
                    action: "createPost",
                    profile: "tiktok",
                    text: "{{tiktokContent.caption}}",
                    media: "{{contentAssets}}",
                    scheduledAt: "{{content.scheduledTime}}",
                    outputVariable: "bufferTiktok"
                },
                position: { x: 1620, y: 350 }
            },
            "action-instagram": {
                type: "action",
                name: "Publish Instagram",
                config: {
                    provider: "instagram",
                    action: "createMedia",
                    caption: "{{instagramContent.caption}}",
                    media: "{{contentAssets}}",
                    outputVariable: "instagramResult"
                },
                position: { x: 1620, y: 550 }
            },
            "action-twitter": {
                type: "action",
                name: "Post Thread",
                config: {
                    provider: "twitter",
                    action: "createThread",
                    tweets: "{{twitterContent.thread}}",
                    outputVariable: "twitterResult"
                },
                position: { x: 1620, y: 750 }
            },
            "action-linkedin": {
                type: "action",
                name: "Publish LinkedIn",
                config: {
                    provider: "linkedin",
                    action: "createPost",
                    text: "{{linkedinContent.post}}",
                    media: "{{contentAssets}}",
                    outputVariable: "linkedinResult"
                },
                position: { x: 1620, y: 950 }
            },
            "action-reddit": {
                type: "action",
                name: "Submit to Reddit",
                config: {
                    provider: "reddit",
                    action: "submitPost",
                    subreddit: "{{redditContent.targetSubreddits[0]}}",
                    title: "{{redditContent.titles[0]}}",
                    text: "{{redditContent.content}}",
                    outputVariable: "redditResult"
                },
                position: { x: 2000, y: 150 }
            },
            "action-medium": {
                type: "action",
                name: "Publish Medium",
                config: {
                    provider: "medium",
                    action: "createPost",
                    title: "{{mediumContent.title}}",
                    content: "{{mediumContent.article}}",
                    tags: "{{mediumContent.tags}}",
                    publishStatus: "draft",
                    outputVariable: "mediumResult"
                },
                position: { x: 2000, y: 350 }
            },
            "action-notion": {
                type: "action",
                name: "Update Calendar",
                config: {
                    provider: "notion",
                    action: "updatePage",
                    pageId: "{{content.notionPageId}}",
                    properties: {
                        Status: "Published",
                        "YouTube URL": "{{youtubeResult.url}}",
                        "Instagram URL": "{{instagramResult.url}}",
                        "LinkedIn URL": "{{linkedinResult.url}}",
                        "Published Date": "{{$now}}"
                    },
                    outputVariable: "notionUpdate"
                },
                position: { x: 2000, y: 550 }
            },
            "action-amplitude": {
                type: "action",
                name: "Track Publish",
                config: {
                    provider: "amplitude",
                    action: "track",
                    event: "content_published",
                    properties: {
                        contentId: "{{content.id}}",
                        title: "{{content.title}}",
                        platforms: [
                            "youtube",
                            "tiktok",
                            "instagram",
                            "twitter",
                            "linkedin",
                            "reddit",
                            "medium"
                        ],
                        scheduledTime: "{{content.scheduledTime}}"
                    },
                    outputVariable: "amplitudeEvent"
                },
                position: { x: 2000, y: 750 }
            },
            "action-slack": {
                type: "action",
                name: "Notify Slack",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#content-published",
                    text: "🚀 *Content Published Across All Channels!*\n\n*Title:* {{content.title}}\n\n📺 *YouTube:* {{youtubeResult.url}}\n📱 *TikTok:* Scheduled via Buffer\n📸 *Instagram:* {{instagramResult.url}}\n🐦 *Twitter:* {{twitterResult.url}}\n💼 *LinkedIn:* {{linkedinResult.url}}\n🔗 *Reddit:* {{redditResult.url}}\n📝 *Medium:* {{mediumResult.url}}\n\n📊 *Track:* {{notionUpdate.url}}",
                    outputVariable: "slackNotify"
                },
                position: { x: 2380, y: 450 }
            },
            "action-teams": {
                type: "action",
                name: "Notify Teams",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Marketing",
                    text: '🚀 Content "{{content.title}}" published to 7 platforms! Check Notion for tracking.',
                    outputVariable: "teamsNotify"
                },
                position: { x: 2380, y: 650 }
            },
            "transform-result": {
                type: "transform",
                name: "Compile Results",
                config: {
                    transformType: "template",
                    template:
                        '{"contentId": "{{content.id}}", "title": "{{content.title}}", "publishedAt": "{{$now}}", "platforms": {"youtube": "{{youtubeResult.url}}", "tiktok": "{{bufferTiktok.id}}", "instagram": "{{instagramResult.url}}", "twitter": "{{twitterResult.url}}", "linkedin": "{{linkedinResult.url}}", "reddit": "{{redditResult.url}}", "medium": "{{mediumResult.url}}"}, "notionTracking": "{{notionUpdate.url}}"}',
                    outputVariable: "publishResult"
                },
                position: { x: 2760, y: 550 }
            },
            "output-1": {
                type: "output",
                name: "Publish Result",
                config: {
                    outputName: "result",
                    value: "{{publishResult}}",
                    format: "json",
                    description: "Multi-channel publish result"
                },
                position: { x: 3140, y: 550 }
            }
        },
        edges: [
            { id: "e1", source: "input-1", target: "action-gdrive" },
            { id: "e2", source: "action-gdrive", target: "llm-youtube" },
            { id: "e3", source: "action-gdrive", target: "llm-tiktok" },
            { id: "e4", source: "action-gdrive", target: "llm-instagram" },
            { id: "e5", source: "action-gdrive", target: "llm-twitter" },
            { id: "e6", source: "action-gdrive", target: "llm-linkedin" },
            { id: "e7", source: "action-gdrive", target: "llm-reddit" },
            { id: "e8", source: "action-gdrive", target: "llm-medium" },
            { id: "e9", source: "llm-youtube", target: "action-youtube" },
            { id: "e10", source: "llm-tiktok", target: "action-buffer-tiktok" },
            { id: "e11", source: "llm-instagram", target: "action-instagram" },
            { id: "e12", source: "llm-twitter", target: "action-twitter" },
            { id: "e13", source: "llm-linkedin", target: "action-linkedin" },
            { id: "e14", source: "llm-reddit", target: "action-reddit" },
            { id: "e15", source: "llm-medium", target: "action-medium" },
            { id: "e16", source: "action-youtube", target: "action-notion" },
            { id: "e17", source: "action-buffer-tiktok", target: "action-notion" },
            { id: "e18", source: "action-instagram", target: "action-notion" },
            { id: "e19", source: "action-twitter", target: "action-amplitude" },
            { id: "e20", source: "action-linkedin", target: "action-amplitude" },
            { id: "e21", source: "action-reddit", target: "action-amplitude" },
            { id: "e22", source: "action-medium", target: "action-amplitude" },
            { id: "e23", source: "action-notion", target: "action-slack" },
            { id: "e24", source: "action-amplitude", target: "action-slack" },
            { id: "e25", source: "action-slack", target: "action-teams" },
            { id: "e26", source: "action-teams", target: "transform-result" },
            { id: "e27", source: "transform-result", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// ============================================================================
// PATTERN ARRAYS AND EXPORTS
// ============================================================================

export const BASIC_WORKFLOW_PATTERNS: WorkflowPattern[] = [
    blankWorkflowPattern,
    chainOfThoughtPattern,
    smartRouterPattern,
    selfImprovingPattern,
    researchAgentPattern,
    qualityReviewerPattern,
    parallelAnalyzerPattern,
    supervisedAgentPattern,
    safeAgentPattern,
    taskPlannerPattern
];

export const INTERMEDIATE_WORKFLOW_PATTERNS: WorkflowPattern[] = [
    discordCommunityBotPattern,
    githubPrReviewerPattern,
    leadEnrichmentPattern,
    figmaDesignHandoffPattern,
    trelloProjectSyncPattern,
    calendlyMeetingPrepPattern
];

export const ADVANCED_WORKFLOW_PATTERNS: WorkflowPattern[] = [
    whatsappSupportBotPattern,
    docusignContractPattern,
    tiktokPerformancePattern,
    mongodbPipelineMonitorPattern,
    teamsSalesStandupPattern,
    stripeReconciliationPattern,
    intercomAnalyzerPattern,
    multiChannelPublisherPattern
];

// Helper functions
export function getBasicWorkflowPatterns(): WorkflowPattern[] {
    return BASIC_WORKFLOW_PATTERNS;
}

export function getIntermediateWorkflowPatterns(): WorkflowPattern[] {
    return INTERMEDIATE_WORKFLOW_PATTERNS;
}

export function getAdvancedWorkflowPatterns(): WorkflowPattern[] {
    return ADVANCED_WORKFLOW_PATTERNS;
}

export function getWorkflowPatternById(id: string): WorkflowPattern | undefined {
    const allPatterns = [
        ...BASIC_WORKFLOW_PATTERNS,
        ...INTERMEDIATE_WORKFLOW_PATTERNS,
        ...ADVANCED_WORKFLOW_PATTERNS
    ];
    return allPatterns.find((p) => p.id === id);
}

// Get advanced pattern by ID
export function getAdvancedPatternById(id: string): WorkflowPattern | undefined {
    return ADVANCED_WORKFLOW_PATTERNS.find((p) => p.id === id);
}

// For backwards compatibility
export function getAllPatterns(): WorkflowPattern[] {
    return BASIC_WORKFLOW_PATTERNS;
}

// Alias for backwards compatibility
export function getAdvancedPatterns(): WorkflowPattern[] {
    return ADVANCED_WORKFLOW_PATTERNS;
}

// Alias for backwards compatibility
export function getIntermediatePatterns(): WorkflowPattern[] {
    return INTERMEDIATE_WORKFLOW_PATTERNS;
}

export const BLANK_WORKFLOW_PATTERN = blankWorkflowPattern;
