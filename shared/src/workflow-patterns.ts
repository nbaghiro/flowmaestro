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
const simpleChatPattern: WorkflowPattern = {
    id: "simple-chat",
    name: "Simple Chat",
    description: "Basic input to LLM to output flow",
    useCase: "Question answering",
    icon: "MessageSquare",
    nodeCount: 3,
    category: "basic",
    definition: {
        name: "Simple Chat",
        nodes: {
            "input-1": {
                type: "input",
                name: "User Question",
                config: {
                    inputName: "userQuestion",
                    inputVariable: "userQuestion",
                    inputType: "text",
                    required: true,
                    description: "The question or prompt from the user"
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
                    prompt: "{{userQuestion}}",
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

// Basic Pattern 2: Chain of Thought
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
    description: "Start from scratch with just input and output nodes",
    useCase: "Custom workflow",
    icon: "Plus",
    nodeCount: 2,
    category: "basic",
    definition: {
        name: "New Workflow",
        nodes: {
            "node-input-1": {
                type: "input",
                name: "Input",
                config: {
                    inputName: "userInput",
                    inputVariable: "userInput",
                    inputType: "text",
                    required: true,
                    description: "",
                    defaultValue: ""
                },
                position: { x: 225, y: 200 }
            },
            "node-output-1": {
                type: "output",
                name: "Output",
                config: {
                    outputName: "result",
                    value: "{{userInput}}",
                    format: "string",
                    description: ""
                },
                position: { x: 575, y: 200 }
            }
        },
        edges: [{ id: "edge-1", source: "node-input-1", target: "node-output-1" }],
        entryPoint: "node-input-1"
    }
};

// ============================================================================
// INTERMEDIATE PATTERNS (6 patterns)
// Integration-focused patterns with external services
// ============================================================================

// Intermediate Pattern 1: Discord Community Bot
const discordCommunityBotPattern: WorkflowPattern = {
    id: "discord-community-bot",
    name: "Discord Community Bot",
    description:
        "Monitor Discord channels for community feedback, categorize with AI, and log insights to Notion",
    useCase: "Community management",
    icon: "MessageCircle",
    nodeCount: 6,
    category: "intermediate",
    integrations: ["Discord", "Notion"],
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
                position: { x: 100, y: 200 }
            },
            "llm-categorize": {
                type: "llm",
                name: "Categorize Feedback",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a community feedback analyst. Categorize Discord messages and extract insights.",
                    prompt: 'Analyze this Discord message:\n\n{{discordMessage.content}}\n\nReturn JSON: {"category": "bug/feature/question/praise/complaint", "sentiment": "positive/neutral/negative", "priority": "high/medium/low", "summary": "brief summary"}',
                    temperature: 0.2,
                    maxTokens: 500,
                    outputVariable: "categorization"
                },
                position: { x: 480, y: 200 }
            },
            "conditional-1": {
                type: "conditional",
                name: "Action Required?",
                config: {
                    conditionType: "expression",
                    expression:
                        'categorization.text.includes(\'"priority": "high"\') || categorization.text.includes(\'"category": "bug"\')',
                    outputVariable: "needsAction"
                },
                position: { x: 860, y: 200 }
            },
            "action-notion": {
                type: "action",
                name: "Log to Notion",
                config: {
                    provider: "notion",
                    action: "createPage",
                    databaseId: "{{env.NOTION_FEEDBACK_DB}}",
                    properties: {
                        title: "{{categorization.summary}}",
                        category: "{{categorization.category}}",
                        sentiment: "{{categorization.sentiment}}"
                    },
                    outputVariable: "notionPage"
                },
                position: { x: 1240, y: 100 }
            },
            "action-discord": {
                type: "action",
                name: "Send Acknowledgment",
                config: {
                    provider: "discord",
                    action: "sendMessage",
                    channelId: "{{discordMessage.channelId}}",
                    content: "Thanks for your feedback! We've logged this and will follow up.",
                    outputVariable: "discordReply"
                },
                position: { x: 1240, y: 300 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: '{"logged": true, "category": "{{categorization.category}}", "notionUrl": "{{notionPage.url}}"}',
                    format: "json",
                    description: "Processing result"
                },
                position: { x: 1620, y: 200 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "llm-categorize" },
            { id: "edge-2", source: "llm-categorize", target: "conditional-1" },
            {
                id: "edge-3",
                source: "conditional-1",
                target: "action-notion",
                sourceHandle: "true"
            },
            { id: "edge-4", source: "action-notion", target: "action-discord" },
            { id: "edge-5", source: "conditional-1", target: "output-1", sourceHandle: "false" },
            { id: "edge-6", source: "action-discord", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 2: GitHub PR Reviewer
const githubPrReviewerPattern: WorkflowPattern = {
    id: "github-pr-reviewer",
    name: "GitHub PR Reviewer",
    description: "Automated code review that analyzes PRs and posts review comments",
    useCase: "Code review automation",
    icon: "GitPullRequest",
    nodeCount: 5,
    category: "intermediate",
    integrations: ["GitHub"],
    definition: {
        name: "GitHub PR Reviewer",
        nodes: {
            "input-1": {
                type: "input",
                name: "PR Data",
                config: {
                    inputName: "prData",
                    inputVariable: "prData",
                    inputType: "json",
                    required: true,
                    description: "Pull request data including title, description, and diff",
                    defaultValue:
                        '{"title": "", "description": "", "diff": "", "repo": "", "pr_number": 0}'
                },
                position: { x: 100, y: 140 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Code",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an expert code reviewer. Analyze the code changes for:\n- Bugs and logic errors\n- Security vulnerabilities\n- Performance issues\n- Code style and best practices\n- Missing tests or documentation\n\nBe thorough but constructive.",
                    prompt: "PR Title: {{prData.title}}\n\nDescription:\n{{prData.description}}\n\nCode Diff:\n```\n{{prData.diff}}\n```\n\nAnalyze these changes and identify any issues or improvements.",
                    temperature: 0.2,
                    maxTokens: 3000,
                    outputVariable: "analysis"
                },
                position: { x: 480, y: 180 }
            },
            "llm-comment": {
                type: "llm",
                name: "Generate Review",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a code reviewer. Format your analysis into a professional GitHub PR review comment. Use markdown formatting. Be constructive and specific with line references where possible.",
                    prompt: "Based on this analysis:\n\n{{analysis.text}}\n\nGenerate a GitHub PR review comment that:\n1. Summarizes the changes\n2. Lists any issues found with severity (critical/warning/suggestion)\n3. Provides specific recommendations\n4. Ends with an overall assessment (approve/request changes/comment)",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "reviewComment"
                },
                position: { x: 860, y: 140 }
            },
            "action-github": {
                type: "action",
                name: "Post Review",
                config: {
                    provider: "github",
                    action: "createReview",
                    repo: "{{prData.repo}}",
                    pullNumber: "{{prData.pr_number}}",
                    body: "{{reviewComment.text}}",
                    event: "COMMENT",
                    outputVariable: "githubReview"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Review Result",
                config: {
                    outputName: "result",
                    value: '{"analysis": "{{analysis.text}}", "review": "{{reviewComment.text}}", "posted": true}',
                    format: "json",
                    description: "Code review result"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-analyze" },
            { id: "edge-2", source: "llm-analyze", target: "llm-comment" },
            { id: "edge-3", source: "llm-comment", target: "action-github" },
            { id: "edge-4", source: "action-github", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Intermediate Pattern 3: Lead Enrichment Pipeline
const leadEnrichmentPattern: WorkflowPattern = {
    id: "lead-enrichment",
    name: "Lead Enrichment Pipeline",
    description: "Enrich new leads with external data, qualify them with AI, and update CRM",
    useCase: "Sales lead qualification",
    icon: "UserPlus",
    nodeCount: 6,
    category: "intermediate",
    integrations: ["HubSpot", "HTTP"],
    definition: {
        name: "Lead Enrichment Pipeline",
        nodes: {
            "input-1": {
                type: "input",
                name: "Lead Data",
                config: {
                    inputName: "leadData",
                    inputVariable: "leadData",
                    inputType: "json",
                    required: true,
                    description: "New lead information",
                    defaultValue: '{"email": "", "company": "", "name": "", "source": ""}'
                },
                position: { x: 100, y: 200 }
            },
            "http-enrich": {
                type: "http",
                name: "Enrich Lead",
                config: {
                    method: "POST",
                    url: "https://api.clearbit.com/v2/companies/find",
                    headers: {
                        Authorization: "Bearer {{env.CLEARBIT_API_KEY}}",
                        "Content-Type": "application/json"
                    },
                    body: '{"domain": "{{leadData.company}}"}',
                    outputVariable: "enrichedData",
                    timeout: 30000
                },
                position: { x: 480, y: 240 }
            },
            "llm-qualify": {
                type: "llm",
                name: "Qualify Lead",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a sales qualification expert. Analyze lead data and provide a qualification score (1-100) and reasoning. Consider company size, industry, funding, and fit with our ideal customer profile.",
                    prompt: 'Lead Info:\n- Name: {{leadData.name}}\n- Email: {{leadData.email}}\n- Company: {{leadData.company}}\n- Source: {{leadData.source}}\n\nEnriched Company Data:\n{{enrichedData.body}}\n\nProvide qualification in JSON:\n{"score": 0-100, "tier": "hot/warm/cold", "reasoning": "...", "nextStep": "..."}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "qualification"
                },
                position: { x: 860, y: 200 }
            },
            "conditional-score": {
                type: "conditional",
                name: "Score Check",
                config: {
                    conditionType: "expression",
                    expression:
                        'qualification.text.includes(\'"tier": "hot"\') || qualification.text.includes(\'"tier": "warm"\')',
                    outputVariable: "isQualified"
                },
                position: { x: 1240, y: 200 }
            },
            "action-crm": {
                type: "action",
                name: "Update HubSpot",
                config: {
                    provider: "hubspot",
                    action: "updateContact",
                    email: "{{leadData.email}}",
                    properties: {
                        lead_score: "{{qualification.score}}",
                        lead_tier: "{{qualification.tier}}",
                        enriched_data: "{{enrichedData.body}}"
                    },
                    outputVariable: "crmUpdate"
                },
                position: { x: 1620, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Pipeline Result",
                config: {
                    outputName: "result",
                    value: '{"lead": "{{leadData.email}}", "qualification": {{qualification.text}}, "enriched": true, "crmUpdated": true}',
                    format: "json",
                    description: "Lead enrichment result"
                },
                position: { x: 2000, y: 200 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "http-enrich" },
            { id: "edge-2", source: "http-enrich", target: "llm-qualify" },
            { id: "edge-3", source: "llm-qualify", target: "conditional-score" },
            {
                id: "edge-4",
                source: "conditional-score",
                target: "action-crm",
                sourceHandle: "true"
            },
            {
                id: "edge-5",
                source: "conditional-score",
                target: "output-1",
                sourceHandle: "false"
            },
            { id: "edge-6", source: "action-crm", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Intermediate Pattern 4: Figma Design Handoff
const figmaDesignHandoffPattern: WorkflowPattern = {
    id: "figma-design-handoff",
    name: "Figma Design Handoff",
    description:
        "Extract component specs from Figma updates, create Jira tickets, and notify developers on Slack",
    useCase: "Design-to-development automation",
    icon: "Layers",
    nodeCount: 6,
    category: "intermediate",
    integrations: ["Figma", "Jira", "Slack"],
    definition: {
        name: "Figma Design Handoff",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Figma Update",
                config: {
                    triggerType: "webhook",
                    provider: "figma",
                    event: "file_update",
                    outputVariable: "figmaEvent",
                    description: "Triggered when a Figma file is published"
                },
                position: { x: 100, y: 200 }
            },
            "action-figma": {
                type: "action",
                name: "Get File Details",
                config: {
                    provider: "figma",
                    action: "getFile",
                    fileKey: "{{figmaEvent.fileKey}}",
                    outputVariable: "figmaFile"
                },
                position: { x: 480, y: 200 }
            },
            "llm-extract": {
                type: "llm",
                name: "Extract Components",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a design systems expert. Analyze Figma file data and extract component specifications for developers.",
                    prompt: 'Analyze this Figma file update:\n\n{{figmaFile}}\n\nExtract new/updated components as JSON:\n{"components": [{"name": "", "type": "new/update", "specs": {}, "implementationNotes": ""}]}',
                    temperature: 0.2,
                    maxTokens: 2000,
                    outputVariable: "componentSpecs"
                },
                position: { x: 860, y: 200 }
            },
            "action-jira": {
                type: "action",
                name: "Create Jira Tickets",
                config: {
                    provider: "jira",
                    action: "createIssue",
                    projectKey: "{{env.JIRA_PROJECT_KEY}}",
                    issueType: "Task",
                    summary: "Implement Figma component: {{componentSpecs.components[0].name}}",
                    description: "{{componentSpecs.components[0].specs}}",
                    outputVariable: "jiraTicket"
                },
                position: { x: 1240, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Notify Developers",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#design-engineering",
                    text: "🎨 New design handoff from Figma!\n\nFile: {{figmaFile.name}}\nComponents: {{componentSpecs.components.length}}\nJira: {{jiraTicket.key}}",
                    outputVariable: "slackNotification"
                },
                position: { x: 1620, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Handoff Result",
                config: {
                    outputName: "result",
                    value: '{"figmaFile": "{{figmaFile.name}}", "jiraTicket": "{{jiraTicket.key}}", "componentCount": "{{componentSpecs.components.length}}"}',
                    format: "json",
                    description: "Design handoff result"
                },
                position: { x: 2000, y: 200 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-figma" },
            { id: "edge-2", source: "action-figma", target: "llm-extract" },
            { id: "edge-3", source: "llm-extract", target: "action-jira" },
            { id: "edge-4", source: "action-jira", target: "action-slack" },
            { id: "edge-5", source: "action-slack", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 5: Trello Project Sync
const trelloProjectSyncPattern: WorkflowPattern = {
    id: "trello-project-sync",
    name: "Trello Project Sync",
    description: "Sync Trello card movements to PostgreSQL database and notify team on Slack",
    useCase: "Project tracking automation",
    icon: "Database",
    nodeCount: 5,
    category: "intermediate",
    integrations: ["Trello", "PostgreSQL", "Slack"],
    definition: {
        name: "Trello Project Sync",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Card Moved",
                config: {
                    triggerType: "webhook",
                    provider: "trello",
                    event: "updateCard",
                    outputVariable: "trelloEvent",
                    description: "Triggered when a Trello card moves between lists"
                },
                position: { x: 100, y: 200 }
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
                position: { x: 480, y: 200 }
            },
            "llm-transform": {
                type: "llm",
                name: "Transform for DB",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt: "Transform Trello card data into a database record format.",
                    prompt: 'Transform this Trello card for database:\n\n{{cardDetails}}\n\nReturn JSON: {"id": "", "title": "", "status": "", "assignee": "", "due_date": "", "labels": [], "last_activity": ""}',
                    temperature: 0.1,
                    maxTokens: 500,
                    outputVariable: "dbRecord"
                },
                position: { x: 860, y: 200 }
            },
            "action-postgresql": {
                type: "action",
                name: "Upsert to Database",
                config: {
                    provider: "postgresql",
                    action: "upsert",
                    table: "project_tasks",
                    data: "{{dbRecord}}",
                    conflictColumn: "id",
                    outputVariable: "dbResult"
                },
                position: { x: 1240, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Notify Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#project-updates",
                    text: "📋 Card moved: {{cardDetails.name}}\nNew status: {{trelloEvent.listAfter}}\nAssigned to: {{cardDetails.members}}",
                    outputVariable: "slackNotification"
                },
                position: { x: 1620, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Sync Result",
                config: {
                    outputName: "result",
                    value: '{"cardId": "{{cardDetails.id}}", "synced": true, "newStatus": "{{trelloEvent.listAfter}}"}',
                    format: "json",
                    description: "Trello sync result"
                },
                position: { x: 2000, y: 200 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-trello" },
            { id: "edge-2", source: "action-trello", target: "llm-transform" },
            { id: "edge-3", source: "llm-transform", target: "action-postgresql" },
            { id: "edge-4", source: "action-postgresql", target: "action-slack" },
            { id: "edge-5", source: "action-slack", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Intermediate Pattern 6: Calendly Meeting Prep
const calendlyMeetingPrepPattern: WorkflowPattern = {
    id: "calendly-meeting-prep",
    name: "Calendly Meeting Prep",
    description:
        "When meetings are booked via Calendly, research attendees and create prep notes for Google Calendar",
    useCase: "Meeting preparation automation",
    icon: "ClipboardCheck",
    nodeCount: 6,
    category: "intermediate",
    integrations: ["Calendly", "Google Calendar", "Slack"],
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
                position: { x: 100, y: 200 }
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
                position: { x: 480, y: 200 }
            },
            "llm-research": {
                type: "llm",
                name: "Research Attendee",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a meeting preparation assistant. Research the attendee and prepare talking points.",
                    prompt: "Prepare meeting notes for:\n\nAttendee: {{eventDetails.invitee}}\nMeeting Type: {{eventDetails.eventType}}\nScheduled Questions: {{eventDetails.questions}}\n\nProvide:\n1. Background brief\n2. Key talking points\n3. Questions to ask\n4. Potential objections",
                    temperature: 0.3,
                    maxTokens: 1500,
                    outputVariable: "prepNotes"
                },
                position: { x: 860, y: 200 }
            },
            "action-calendar": {
                type: "action",
                name: "Update Calendar Event",
                config: {
                    provider: "google-calendar",
                    action: "updateEvent",
                    calendarId: "primary",
                    eventId: "{{eventDetails.googleEventId}}",
                    description: "{{prepNotes.text}}",
                    outputVariable: "calendarUpdate"
                },
                position: { x: 1240, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Send Prep Reminder",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "@{{env.SLACK_USER_ID}}",
                    text: "📅 Meeting prep ready!\n\nWith: {{eventDetails.invitee.name}}\nTime: {{eventDetails.startTime}}\n\nKey points:\n{{prepNotes.text}}",
                    outputVariable: "slackNotification"
                },
                position: { x: 1620, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Prep Result",
                config: {
                    outputName: "result",
                    value: '{"meeting": "{{eventDetails.name}}", "attendee": "{{eventDetails.invitee.name}}", "calendarUpdated": true}',
                    format: "json",
                    description: "Meeting prep result"
                },
                position: { x: 2000, y: 200 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "action-calendly" },
            { id: "edge-2", source: "action-calendly", target: "llm-research" },
            { id: "edge-3", source: "llm-research", target: "action-calendar" },
            { id: "edge-4", source: "action-calendar", target: "action-slack" },
            { id: "edge-5", source: "action-slack", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// ============================================================================
// ADVANCED PATTERNS (8 patterns)
// Complex multi-branched workflows with diverse integrations
// ============================================================================

// Advanced Pattern 1: WhatsApp Customer Support Bot
const whatsappSupportBotPattern: WorkflowPattern = {
    id: "whatsapp-support-bot",
    name: "WhatsApp Customer Support Bot",
    description:
        "Receive WhatsApp messages, classify with AI, create Zendesk tickets for complex issues, and update HubSpot contacts",
    useCase: "Multi-channel customer support",
    icon: "MessageCircle",
    nodeCount: 8,
    category: "advanced",
    integrations: ["WhatsApp", "Zendesk", "HubSpot"],
    definition: {
        name: "WhatsApp Customer Support Bot",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "WhatsApp Message",
                config: {
                    triggerType: "webhook",
                    provider: "whatsapp",
                    event: "message",
                    outputVariable: "whatsappMessage",
                    description: "Triggered on incoming WhatsApp message"
                },
                position: { x: 100, y: 200 }
            },
            "action-hubspot-get": {
                type: "action",
                name: "Get Customer Context",
                config: {
                    provider: "hubspot",
                    action: "getContactByPhone",
                    phone: "{{whatsappMessage.from}}",
                    outputVariable: "customerData"
                },
                position: { x: 480, y: 200 }
            },
            "llm-classify": {
                type: "llm",
                name: "Classify & Respond",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a customer support AI. Classify the message intent and draft an appropriate response.",
                    prompt: 'Analyze this WhatsApp support message:\n\nMessage: {{whatsappMessage.text}}\nCustomer History: {{customerData}}\n\nReturn JSON:\n{"intent": "question/complaint/request/feedback", "complexity": "simple/medium/complex", "sentiment": "positive/neutral/negative", "suggestedResponse": "", "requiresHumanHandoff": true/false}',
                    temperature: 0.3,
                    maxTokens: 1000,
                    outputVariable: "classification"
                },
                position: { x: 860, y: 200 }
            },
            "router-1": {
                type: "router",
                name: "Route by Complexity",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    prompt: "{{classification.complexity}}",
                    routes: [
                        { value: "simple", label: "Simple", description: "Auto-respond" },
                        { value: "medium", label: "Medium", description: "Respond + log" },
                        { value: "complex", label: "Complex", description: "Create ticket" }
                    ],
                    defaultRoute: "medium",
                    outputVariable: "routeResult"
                },
                position: { x: 1240, y: 200 }
            },
            "action-zendesk": {
                type: "action",
                name: "Create Ticket",
                config: {
                    provider: "zendesk",
                    action: "createTicket",
                    subject: "WhatsApp: {{classification.intent}}",
                    description: "{{whatsappMessage.text}}",
                    priority: "high",
                    outputVariable: "zendeskTicket"
                },
                position: { x: 1620, y: 100 }
            },
            "action-whatsapp": {
                type: "action",
                name: "Send Response",
                config: {
                    provider: "whatsapp",
                    action: "sendMessage",
                    to: "{{whatsappMessage.from}}",
                    text: "{{classification.suggestedResponse}}",
                    outputVariable: "whatsappReply"
                },
                position: { x: 1620, y: 300 }
            },
            "action-hubspot-update": {
                type: "action",
                name: "Update Contact",
                config: {
                    provider: "hubspot",
                    action: "updateContact",
                    email: "{{customerData.email}}",
                    properties: { last_support_interaction: "{{$now}}" },
                    outputVariable: "hubspotUpdate"
                },
                position: { x: 2000, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: '{"handled": true, "intent": "{{classification.intent}}", "ticketCreated": "{{zendeskTicket.id || null}}"}',
                    format: "json",
                    description: "Support interaction result"
                },
                position: { x: 2380, y: 200 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-hubspot-get" },
            { id: "e2", source: "action-hubspot-get", target: "llm-classify" },
            { id: "e3", source: "llm-classify", target: "router-1" },
            { id: "e4", source: "router-1", target: "action-whatsapp", sourceHandle: "simple" },
            { id: "e5", source: "router-1", target: "action-whatsapp", sourceHandle: "medium" },
            { id: "e6", source: "router-1", target: "action-zendesk", sourceHandle: "complex" },
            { id: "e7", source: "action-zendesk", target: "action-whatsapp" },
            { id: "e8", source: "action-whatsapp", target: "action-hubspot-update" },
            { id: "e9", source: "action-hubspot-update", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 2: DocuSign Contract Automation
const docusignContractPattern: WorkflowPattern = {
    id: "docusign-contract-automation",
    name: "DocuSign Contract Automation",
    description:
        "When deals close in Salesforce, generate contracts and send via DocuSign for e-signature",
    useCase: "Contract automation",
    icon: "FileStack",
    nodeCount: 7,
    category: "advanced",
    integrations: ["DocuSign", "Salesforce", "Slack"],
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
                position: { x: 100, y: 200 }
            },
            "action-salesforce": {
                type: "action",
                name: "Get Deal Details",
                config: {
                    provider: "salesforce",
                    action: "getOpportunity",
                    opportunityId: "{{sfOpportunity.id}}",
                    outputVariable: "dealDetails"
                },
                position: { x: 480, y: 200 }
            },
            "llm-contract": {
                type: "llm",
                name: "Prepare Contract Data",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Extract contract details from deal data.",
                    prompt: 'Prepare contract from deal:\n\n{{dealDetails}}\n\nReturn JSON:\n{"clientName": "", "clientEmail": "", "contractValue": "", "startDate": "", "services": [], "paymentTerms": ""}',
                    temperature: 0.1,
                    maxTokens: 500,
                    outputVariable: "contractData"
                },
                position: { x: 860, y: 200 }
            },
            "action-docusign-create": {
                type: "action",
                name: "Create Envelope",
                config: {
                    provider: "docusign",
                    action: "createEnvelope",
                    templateId: "{{env.DOCUSIGN_TEMPLATE_ID}}",
                    recipients: [
                        {
                            email: "{{contractData.clientEmail}}",
                            name: "{{contractData.clientName}}"
                        }
                    ],
                    outputVariable: "envelope"
                },
                position: { x: 1240, y: 200 }
            },
            "action-docusign-send": {
                type: "action",
                name: "Send for Signature",
                config: {
                    provider: "docusign",
                    action: "sendEnvelope",
                    envelopeId: "{{envelope.envelopeId}}",
                    outputVariable: "sentEnvelope"
                },
                position: { x: 1620, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Notify Sales Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#sales-contracts",
                    text: "📝 Contract sent for signature!\n\nDeal: {{dealDetails.name}}\nClient: {{contractData.clientName}}\nValue: {{contractData.contractValue}}",
                    outputVariable: "slackNotification"
                },
                position: { x: 2000, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Contract Result",
                config: {
                    outputName: "result",
                    value: '{"envelopeId": "{{envelope.envelopeId}}", "status": "sent", "client": "{{contractData.clientName}}"}',
                    format: "json",
                    description: "Contract automation result"
                },
                position: { x: 2380, y: 200 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-salesforce" },
            { id: "e2", source: "action-salesforce", target: "llm-contract" },
            { id: "e3", source: "llm-contract", target: "action-docusign-create" },
            { id: "e4", source: "action-docusign-create", target: "action-docusign-send" },
            { id: "e5", source: "action-docusign-send", target: "action-slack" },
            { id: "e6", source: "action-slack", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 3: TikTok Content Performance Tracker
const tiktokPerformancePattern: WorkflowPattern = {
    id: "tiktok-performance-tracker",
    name: "TikTok Content Performance Tracker",
    description:
        "Fetch TikTok video metrics daily, analyze trends with AI, update spreadsheet, and track in PostHog",
    useCase: "Social media analytics",
    icon: "Share2",
    nodeCount: 6,
    category: "advanced",
    integrations: ["TikTok", "Google Sheets", "PostHog"],
    definition: {
        name: "TikTok Content Performance Tracker",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Daily Schedule",
                config: {
                    triggerType: "schedule",
                    schedule: "0 10 * * *",
                    outputVariable: "scheduleEvent",
                    description: "Runs daily at 10am"
                },
                position: { x: 100, y: 200 }
            },
            "action-tiktok": {
                type: "action",
                name: "Fetch Video Metrics",
                config: {
                    provider: "tiktok",
                    action: "getVideoMetrics",
                    dateRange: "last_24_hours",
                    outputVariable: "tiktokMetrics"
                },
                position: { x: 480, y: 200 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Performance",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "You are a social media analytics expert.",
                    prompt: 'Analyze these TikTok metrics:\n\n{{tiktokMetrics}}\n\nReturn JSON:\n{"topVideos": [], "trends": [], "viralPotential": [], "recommendations": [], "alertWorthy": []}',
                    temperature: 0.2,
                    maxTokens: 1500,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 200 }
            },
            "action-sheets": {
                type: "action",
                name: "Update Tracker",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.TIKTOK_TRACKER_SHEET_ID}}",
                    sheetName: "Performance",
                    values: ["{{$now}}", "{{tiktokMetrics.totalViews}}", "{{analysis.topVideos}}"],
                    outputVariable: "sheetsResult"
                },
                position: { x: 1240, y: 200 }
            },
            "action-posthog": {
                type: "action",
                name: "Track in PostHog",
                config: {
                    provider: "posthog",
                    action: "capture",
                    event: "tiktok_daily_metrics",
                    properties: "{{analysis}}",
                    outputVariable: "posthogResult"
                },
                position: { x: 1620, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Analysis Result",
                config: {
                    outputName: "result",
                    value: "{{analysis}}",
                    format: "json",
                    description: "TikTok performance analysis"
                },
                position: { x: 2000, y: 200 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-tiktok" },
            { id: "e2", source: "action-tiktok", target: "llm-analyze" },
            { id: "e3", source: "llm-analyze", target: "action-sheets" },
            { id: "e4", source: "action-sheets", target: "action-posthog" },
            { id: "e5", source: "action-posthog", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 4: MongoDB Pipeline Monitor
const mongodbPipelineMonitorPattern: WorkflowPattern = {
    id: "mongodb-pipeline-monitor",
    name: "MongoDB Data Pipeline Monitor",
    description:
        "Query MongoDB for pipeline metrics, detect anomalies with AI, alert on issues, and log to Mixpanel",
    useCase: "Data engineering monitoring",
    icon: "Database",
    nodeCount: 6,
    category: "advanced",
    integrations: ["MongoDB", "Slack", "Mixpanel"],
    definition: {
        name: "MongoDB Data Pipeline Monitor",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Every 15 Minutes",
                config: {
                    triggerType: "schedule",
                    schedule: "*/15 * * * *",
                    outputVariable: "scheduleEvent",
                    description: "Runs every 15 minutes"
                },
                position: { x: 100, y: 200 }
            },
            "action-mongodb": {
                type: "action",
                name: "Query Pipeline Metrics",
                config: {
                    provider: "mongodb",
                    action: "aggregate",
                    collection: "pipeline_metrics",
                    pipeline: [{ $match: { timestamp: { $gte: "{{$now - 900000}}" } } }],
                    outputVariable: "pipelineMetrics"
                },
                position: { x: 480, y: 200 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Detect Anomalies",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a data pipeline monitoring expert. Detect anomalies in metrics.",
                    prompt: 'Analyze pipeline metrics:\n\n{{pipelineMetrics}}\n\nCheck for throughput deviations, latency spikes, error rates.\n\nReturn JSON:\n{"status": "healthy/warning/critical", "anomalies": [], "recommendations": [], "alertRequired": true/false}',
                    temperature: 0.1,
                    maxTokens: 1000,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 200 }
            },
            "action-mixpanel": {
                type: "action",
                name: "Log to Mixpanel",
                config: {
                    provider: "mixpanel",
                    action: "track",
                    event: "pipeline_health_check",
                    properties: "{{analysis}}",
                    outputVariable: "mixpanelResult"
                },
                position: { x: 1240, y: 200 }
            },
            "conditional-1": {
                type: "conditional",
                name: "Alert Needed?",
                config: {
                    conditionType: "expression",
                    expression: "analysis.text.includes('\"alertRequired\": true')",
                    outputVariable: "needsAlert"
                },
                position: { x: 1620, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Alert Engineering",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#data-engineering-alerts",
                    text: "🚨 Pipeline Alert!\n\nStatus: {{analysis.status}}\nAnomalies: {{analysis.anomalies}}",
                    outputVariable: "slackAlert"
                },
                position: { x: 2000, y: 100 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-mongodb" },
            { id: "e2", source: "action-mongodb", target: "llm-analyze" },
            { id: "e3", source: "llm-analyze", target: "action-mixpanel" },
            { id: "e4", source: "action-mixpanel", target: "conditional-1" },
            { id: "e5", source: "conditional-1", target: "action-slack", sourceHandle: "true" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 5: Microsoft Teams Sales Standup
const teamsSalesStandupPattern: WorkflowPattern = {
    id: "teams-sales-standup",
    name: "Microsoft Teams Sales Standup",
    description:
        "Daily automated sales standup: pull HubSpot pipeline, AI summarizes, post to Teams, log to Excel",
    useCase: "Enterprise sales reporting",
    icon: "ListTodo",
    nodeCount: 6,
    category: "advanced",
    integrations: ["Microsoft Teams", "HubSpot", "Microsoft Excel"],
    definition: {
        name: "Microsoft Teams Sales Standup",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Daily at 8:30am",
                config: {
                    triggerType: "schedule",
                    schedule: "30 8 * * 1-5",
                    outputVariable: "scheduleEvent",
                    description: "Runs Mon-Fri at 8:30am"
                },
                position: { x: 100, y: 200 }
            },
            "action-hubspot": {
                type: "action",
                name: "Fetch Pipeline Data",
                config: {
                    provider: "hubspot",
                    action: "getDeals",
                    filters: { stage: "not_closed" },
                    outputVariable: "pipelineData"
                },
                position: { x: 480, y: 200 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Pipeline",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "You are a sales analytics assistant.",
                    prompt: 'Analyze sales pipeline for standup:\n\n{{pipelineData}}\n\nReturn JSON:\n{"pipelineValue": 0, "dealsClosingThisWeek": [], "stuckDeals": [], "topPriorityActions": [], "riskAlerts": []}',
                    temperature: 0.2,
                    maxTokens: 1500,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 200 }
            },
            "action-teams": {
                type: "action",
                name: "Post to Teams",
                config: {
                    provider: "microsoft-teams",
                    action: "sendMessage",
                    channel: "Sales Team",
                    text: "📊 Daily Sales Standup\n\nPipeline: ${{analysis.pipelineValue}}\nClosing This Week: {{analysis.dealsClosingThisWeek.length}}\n\nPriorities:\n{{analysis.topPriorityActions}}",
                    outputVariable: "teamsPost"
                },
                position: { x: 1240, y: 200 }
            },
            "action-excel": {
                type: "action",
                name: "Log to Excel",
                config: {
                    provider: "microsoft-excel",
                    action: "appendRow",
                    workbookId: "{{env.SALES_TRACKER_WORKBOOK_ID}}",
                    sheetName: "Daily Metrics",
                    values: [
                        "{{$now}}",
                        "{{analysis.pipelineValue}}",
                        "{{analysis.dealsClosingThisWeek.length}}"
                    ],
                    outputVariable: "excelResult"
                },
                position: { x: 1620, y: 200 }
            },
            "output-1": {
                type: "output",
                name: "Standup Result",
                config: {
                    outputName: "result",
                    value: '{"posted": true, "pipelineValue": "{{analysis.pipelineValue}}"}',
                    format: "json",
                    description: "Sales standup result"
                },
                position: { x: 2000, y: 200 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-hubspot" },
            { id: "e2", source: "action-hubspot", target: "llm-analyze" },
            { id: "e3", source: "llm-analyze", target: "action-teams" },
            { id: "e4", source: "action-teams", target: "action-excel" },
            { id: "e5", source: "action-excel", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 6: Stripe Payment Reconciliation
const stripeReconciliationPattern: WorkflowPattern = {
    id: "stripe-payment-reconciliation",
    name: "Stripe Payment Reconciliation",
    description:
        "Daily fetch Stripe transactions, AI categorizes and detects anomalies, updates spreadsheet, alerts on issues",
    useCase: "Finance automation",
    icon: "ClipboardCheck",
    nodeCount: 7,
    category: "advanced",
    integrations: ["Stripe", "Google Sheets", "Slack"],
    definition: {
        name: "Stripe Payment Reconciliation",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Daily at 6am",
                config: {
                    triggerType: "schedule",
                    schedule: "0 6 * * *",
                    outputVariable: "scheduleEvent",
                    description: "Runs daily at 6am"
                },
                position: { x: 100, y: 200 }
            },
            "action-stripe": {
                type: "action",
                name: "Fetch Transactions",
                config: {
                    provider: "stripe",
                    action: "listCharges",
                    dateRange: "last_24_hours",
                    outputVariable: "stripeCharges"
                },
                position: { x: 480, y: 200 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze & Categorize",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a financial analyst. Categorize transactions and detect anomalies.",
                    prompt: 'Analyze Stripe transactions:\n\n{{stripeCharges}}\n\nReturn JSON:\n{"totalVolume": 0, "transactionCount": 0, "byCategory": {}, "anomalies": [], "failedPayments": [], "refundRate": 0}',
                    temperature: 0.1,
                    maxTokens: 1500,
                    outputVariable: "analysis"
                },
                position: { x: 860, y: 200 }
            },
            "action-sheets": {
                type: "action",
                name: "Update Tracker",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.PAYMENT_TRACKER_SHEET_ID}}",
                    sheetName: "Reconciliation",
                    values: [
                        "{{$now}}",
                        "{{analysis.totalVolume}}",
                        "{{analysis.transactionCount}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 1240, y: 200 }
            },
            "conditional-1": {
                type: "conditional",
                name: "Anomalies Found?",
                config: {
                    conditionType: "expression",
                    expression: "!analysis.text.includes('\"anomalies\": []')",
                    outputVariable: "hasAnomalies"
                },
                position: { x: 1620, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Alert Finance Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#finance-alerts",
                    text: "⚠️ Payment Anomalies Detected!\n\nVolume: ${{analysis.totalVolume}}\nAnomalies: {{analysis.anomalies}}",
                    outputVariable: "slackAlert"
                },
                position: { x: 2000, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Reconciliation Result",
                config: {
                    outputName: "result",
                    value: "{{analysis}}",
                    format: "json",
                    description: "Payment reconciliation result"
                },
                position: { x: 2000, y: 300 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-stripe" },
            { id: "e2", source: "action-stripe", target: "llm-analyze" },
            { id: "e3", source: "llm-analyze", target: "action-sheets" },
            { id: "e4", source: "action-sheets", target: "conditional-1" },
            { id: "e5", source: "conditional-1", target: "action-slack", sourceHandle: "true" },
            { id: "e6", source: "conditional-1", target: "output-1", sourceHandle: "false" },
            { id: "e7", source: "action-slack", target: "output-1" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 7: Intercom Conversation Analyzer
const intercomAnalyzerPattern: WorkflowPattern = {
    id: "intercom-conversation-analyzer",
    name: "Intercom Conversation Analyzer",
    description:
        "When Intercom conversations close, extract insights with AI, log to Sheets, alert on escalation patterns",
    useCase: "Support analytics",
    icon: "MessageSquare",
    nodeCount: 6,
    category: "advanced",
    integrations: ["Intercom", "Slack", "Google Sheets"],
    definition: {
        name: "Intercom Conversation Analyzer",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Conversation Closed",
                config: {
                    triggerType: "webhook",
                    provider: "intercom",
                    event: "conversation.closed",
                    outputVariable: "intercomEvent",
                    description: "Triggered when conversation is closed"
                },
                position: { x: 100, y: 200 }
            },
            "action-intercom": {
                type: "action",
                name: "Get Conversation",
                config: {
                    provider: "intercom",
                    action: "getConversation",
                    conversationId: "{{intercomEvent.conversationId}}",
                    outputVariable: "conversation"
                },
                position: { x: 480, y: 200 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Extract Insights",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a customer support analyst. Extract insights from conversations.",
                    prompt: 'Analyze this Intercom conversation:\n\n{{conversation}}\n\nReturn JSON:\n{"topic": "", "resolution": "resolved/unresolved/escalated", "sentiment": "satisfied/neutral/frustrated", "rootCause": "", "productFeedback": "", "escalationRisk": "low/medium/high"}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "insights"
                },
                position: { x: 860, y: 200 }
            },
            "action-sheets": {
                type: "action",
                name: "Log Insights",
                config: {
                    provider: "google-sheets",
                    action: "appendRow",
                    spreadsheetId: "{{env.SUPPORT_ANALYTICS_SHEET_ID}}",
                    sheetName: "Conversation Analytics",
                    values: [
                        "{{$now}}",
                        "{{insights.topic}}",
                        "{{insights.resolution}}",
                        "{{insights.sentiment}}"
                    ],
                    outputVariable: "sheetsResult"
                },
                position: { x: 1240, y: 200 }
            },
            "conditional-1": {
                type: "conditional",
                name: "High Risk?",
                config: {
                    conditionType: "expression",
                    expression: 'insights.text.includes(\'"escalationRisk": "high"\')',
                    outputVariable: "isHighRisk"
                },
                position: { x: 1620, y: 200 }
            },
            "action-slack": {
                type: "action",
                name: "Alert Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#support-insights",
                    text: "🔍 High-Risk Conversation Alert!\n\nTopic: {{insights.topic}}\nResolution: {{insights.resolution}}\nRoot Cause: {{insights.rootCause}}",
                    outputVariable: "slackAlert"
                },
                position: { x: 2000, y: 100 }
            }
        },
        edges: [
            { id: "e1", source: "trigger-1", target: "action-intercom" },
            { id: "e2", source: "action-intercom", target: "llm-analyze" },
            { id: "e3", source: "llm-analyze", target: "action-sheets" },
            { id: "e4", source: "action-sheets", target: "conditional-1" },
            { id: "e5", source: "conditional-1", target: "action-slack", sourceHandle: "true" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 8: Multi-Channel Content Publisher
const multiChannelPublisherPattern: WorkflowPattern = {
    id: "multi-channel-publisher",
    name: "Multi-Channel Content Publisher",
    description:
        "Publish content across YouTube, TikTok, and Reddit simultaneously with platform-optimized formats",
    useCase: "Content distribution",
    icon: "Share2",
    nodeCount: 8,
    category: "advanced",
    integrations: ["YouTube", "TikTok", "Reddit", "Slack"],
    definition: {
        name: "Multi-Channel Content Publisher",
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
                    defaultValue: '{"title": "", "description": "", "videoUrl": "", "tags": []}'
                },
                position: { x: 100, y: 300 }
            },
            "llm-youtube": {
                type: "llm",
                name: "YouTube Description",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create SEO-optimized YouTube descriptions.",
                    prompt: "Create YouTube description for:\n\n{{content}}\n\nInclude hooks, timestamps placeholder, CTAs, and hashtags.",
                    temperature: 0.5,
                    maxTokens: 1000,
                    outputVariable: "youtubeDesc"
                },
                position: { x: 480, y: 100 }
            },
            "llm-tiktok": {
                type: "llm",
                name: "TikTok Caption",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create viral TikTok captions.",
                    prompt: "Create TikTok caption for:\n\n{{content}}\n\nMax 150 chars, trending hashtags, engaging hook.",
                    temperature: 0.7,
                    maxTokens: 200,
                    outputVariable: "tiktokCaption"
                },
                position: { x: 480, y: 300 }
            },
            "llm-reddit": {
                type: "llm",
                name: "Reddit Post",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt: "Create Reddit-appropriate posts that won't get downvoted.",
                    prompt: "Create Reddit post for:\n\n{{content}}\n\nBe authentic, provide value, no self-promotion vibes.",
                    temperature: 0.5,
                    maxTokens: 500,
                    outputVariable: "redditPost"
                },
                position: { x: 480, y: 500 }
            },
            "action-youtube": {
                type: "action",
                name: "Post to YouTube",
                config: {
                    provider: "youtube",
                    action: "updateVideo",
                    videoId: "{{content.videoId}}",
                    description: "{{youtubeDesc.text}}",
                    outputVariable: "youtubeResult"
                },
                position: { x: 860, y: 100 }
            },
            "action-tiktok": {
                type: "action",
                name: "Post to TikTok",
                config: {
                    provider: "tiktok",
                    action: "publishVideo",
                    caption: "{{tiktokCaption.text}}",
                    outputVariable: "tiktokResult"
                },
                position: { x: 860, y: 300 }
            },
            "action-reddit": {
                type: "action",
                name: "Post to Reddit",
                config: {
                    provider: "reddit",
                    action: "submitPost",
                    subreddit: "{{content.targetSubreddit}}",
                    title: "{{content.title}}",
                    text: "{{redditPost.text}}",
                    outputVariable: "redditResult"
                },
                position: { x: 860, y: 500 }
            },
            "action-slack": {
                type: "action",
                name: "Notify Team",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "#content-published",
                    text: "🚀 Content Published!\n\n📺 YouTube: {{youtubeResult.status}}\n📱 TikTok: {{tiktokResult.status}}\n🔗 Reddit: {{redditResult.url}}",
                    outputVariable: "slackNotification"
                },
                position: { x: 1240, y: 300 }
            }
        },
        edges: [
            { id: "e1", source: "input-1", target: "llm-youtube" },
            { id: "e2", source: "input-1", target: "llm-tiktok" },
            { id: "e3", source: "input-1", target: "llm-reddit" },
            { id: "e4", source: "llm-youtube", target: "action-youtube" },
            { id: "e5", source: "llm-tiktok", target: "action-tiktok" },
            { id: "e6", source: "llm-reddit", target: "action-reddit" },
            { id: "e7", source: "action-youtube", target: "action-slack" },
            { id: "e8", source: "action-tiktok", target: "action-slack" },
            { id: "e9", source: "action-reddit", target: "action-slack" }
        ],
        entryPoint: "input-1"
    }
};

// ============================================================================
// PATTERN ARRAYS AND EXPORTS
// ============================================================================

export const BASIC_WORKFLOW_PATTERNS: WorkflowPattern[] = [
    blankWorkflowPattern,
    simpleChatPattern,
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
