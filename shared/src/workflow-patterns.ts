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

// Intermediate Pattern 1: Slack Support Bot
const slackSupportBotPattern: WorkflowPattern = {
    id: "slack-support-bot",
    name: "Slack Support Bot",
    description:
        "Auto-respond to Slack messages by classifying intent and routing to specialized handlers",
    useCase: "Customer support automation",
    icon: "MessageCircle",
    nodeCount: 6,
    category: "intermediate",
    integrations: ["Slack"],
    definition: {
        name: "Slack Support Bot",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Slack Message",
                config: {
                    triggerType: "webhook",
                    provider: "slack",
                    event: "message",
                    outputVariable: "slackMessage",
                    description: "Triggered when a message is received in Slack"
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
                        "You are a customer support classifier. Analyze the message and classify it into exactly one category based on the primary intent.",
                    prompt: "{{slackMessage.text}}",
                    temperature: 0.1,
                    routes: [
                        {
                            value: "tech_support",
                            label: "Technical Support",
                            description:
                                "Technical issues, bugs, errors, how-to questions, troubleshooting"
                        },
                        {
                            value: "sales",
                            label: "Sales Inquiry",
                            description: "Pricing, purchasing, upgrades, billing, subscriptions"
                        },
                        {
                            value: "general",
                            label: "General Inquiry",
                            description: "General questions, feedback, other inquiries"
                        }
                    ],
                    defaultRoute: "general",
                    outputVariable: "routeResult"
                },
                position: { x: 480, y: 340 }
            },
            "llm-tech": {
                type: "llm",
                name: "Tech Support",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a technical support specialist. Provide clear, step-by-step solutions. Be concise since this will be sent as a Slack message.",
                    prompt: "User's technical issue:\n\n{{slackMessage.text}}\n\nProvide a helpful response.",
                    temperature: 0.3,
                    maxTokens: 1000,
                    outputVariable: "techResponse"
                },
                position: { x: 860, y: 500 }
            },
            "llm-sales": {
                type: "llm",
                name: "Sales Handler",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a sales assistant. Help with pricing and purchasing questions. Be helpful and professional without being pushy. Be concise for Slack.",
                    prompt: "User's sales inquiry:\n\n{{slackMessage.text}}\n\nProvide helpful information.",
                    temperature: 0.5,
                    maxTokens: 1000,
                    outputVariable: "salesResponse"
                },
                position: { x: 860, y: 300 }
            },
            "llm-general": {
                type: "llm",
                name: "General Handler",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a helpful customer service representative. Assist with general inquiries in a friendly manner. Be concise for Slack.",
                    prompt: "User's inquiry:\n\n{{slackMessage.text}}\n\nProvide a helpful response.",
                    temperature: 0.7,
                    maxTokens: 1000,
                    outputVariable: "generalResponse"
                },
                position: { x: 860, y: 100 }
            },
            "action-reply": {
                type: "action",
                name: "Reply to Slack",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "{{slackMessage.channel}}",
                    text: "{{techResponse.text || salesResponse.text || generalResponse.text}}",
                    threadTs: "{{slackMessage.ts}}",
                    outputVariable: "slackReply"
                },
                position: { x: 1240, y: 260 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "router-1" },
            { id: "edge-2", source: "router-1", target: "llm-tech", sourceHandle: "tech_support" },
            { id: "edge-3", source: "router-1", target: "llm-sales", sourceHandle: "sales" },
            { id: "edge-4", source: "router-1", target: "llm-general", sourceHandle: "general" },
            { id: "edge-5", source: "llm-tech", target: "action-reply" },
            { id: "edge-6", source: "llm-sales", target: "action-reply" },
            { id: "edge-7", source: "llm-general", target: "action-reply" }
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

// Intermediate Pattern 4: Email Autoresponder
const emailAutoresponderPattern: WorkflowPattern = {
    id: "email-autoresponder",
    name: "Email Autoresponder",
    description: "Classify incoming emails, draft AI responses, and send after human review",
    useCase: "Email automation with approval",
    icon: "Mail",
    nodeCount: 7,
    category: "intermediate",
    integrations: ["Email", "HTTP"],
    definition: {
        name: "Email Autoresponder",
        nodes: {
            "input-1": {
                type: "input",
                name: "Email Input",
                config: {
                    inputName: "emailData",
                    inputVariable: "emailData",
                    inputType: "json",
                    required: true,
                    description: "Incoming email data",
                    defaultValue: '{"from": "", "subject": "", "body": "", "replyTo": ""}'
                },
                position: { x: 100, y: 200 }
            },
            "router-1": {
                type: "router",
                name: "Email Classifier",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "You are an email classifier. Categorize the email into exactly one category based on its content and intent.",
                    prompt: "Subject: {{emailData.subject}}\n\nBody:\n{{emailData.body}}",
                    temperature: 0.1,
                    routes: [
                        {
                            value: "support",
                            label: "Support Request",
                            description: "Technical support, product issues, how-to questions"
                        },
                        {
                            value: "sales",
                            label: "Sales Inquiry",
                            description: "Pricing, demos, purchasing questions"
                        },
                        {
                            value: "info",
                            label: "Information Request",
                            description: "General information, company questions"
                        },
                        {
                            value: "spam",
                            label: "Spam/Unsubscribe",
                            description: "Spam, marketing, unsubscribe requests"
                        }
                    ],
                    defaultRoute: "info",
                    outputVariable: "emailCategory"
                },
                position: { x: 480, y: 240 }
            },
            "llm-draft": {
                type: "llm",
                name: "Draft Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a professional email assistant. Draft appropriate email responses based on the category. Be professional, helpful, and concise. Include a greeting and sign-off.",
                    prompt: "Category: {{emailCategory.selectedRoute}}\n\nOriginal Email:\nFrom: {{emailData.from}}\nSubject: {{emailData.subject}}\nBody: {{emailData.body}}\n\nDraft a professional response email.",
                    temperature: 0.5,
                    maxTokens: 1500,
                    outputVariable: "draftResponse"
                },
                position: { x: 860, y: 200 }
            },
            "human-review": {
                type: "humanReview",
                name: "Review Draft",
                config: {
                    prompt: "Please review and edit the draft email response before sending.",
                    description: "Review the AI-generated response. Edit if needed.",
                    variableName: "approvedResponse",
                    inputType: "text",
                    required: true,
                    placeholder: "Edit the response here...",
                    prefillValue: "{{draftResponse.text}}"
                },
                position: { x: 1240, y: 200 }
            },
            "conditional-send": {
                type: "conditional",
                name: "Send Check",
                config: {
                    conditionType: "expression",
                    expression:
                        "emailCategory.selectedRoute !== 'spam' && approvedResponse.trim().length > 0",
                    outputVariable: "shouldSend"
                },
                position: { x: 1620, y: 200 }
            },
            "http-send": {
                type: "http",
                name: "Send Email",
                config: {
                    method: "POST",
                    url: "https://api.resend.com/emails",
                    headers: {
                        Authorization: "Bearer {{env.RESEND_API_KEY}}",
                        "Content-Type": "application/json"
                    },
                    body: '{"from": "support@company.com", "to": "{{emailData.from}}", "subject": "Re: {{emailData.subject}}", "text": "{{approvedResponse}}"}',
                    outputVariable: "sendResult",
                    timeout: 30000
                },
                position: { x: 2000, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: '{"category": "{{emailCategory.selectedRoute}}", "draft": "{{draftResponse.text}}", "sent": true, "to": "{{emailData.from}}"}',
                    format: "json",
                    description: "Email processing result"
                },
                position: { x: 2380, y: 300 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "router-1" },
            { id: "edge-2", source: "router-1", target: "llm-draft" },
            { id: "edge-3", source: "llm-draft", target: "human-review" },
            { id: "edge-4", source: "human-review", target: "conditional-send" },
            { id: "edge-5", source: "conditional-send", target: "http-send", sourceHandle: "true" },
            { id: "edge-6", source: "conditional-send", target: "output-1", sourceHandle: "false" },
            { id: "edge-7", source: "http-send", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Intermediate Pattern 5: Jira Bug Triage
const jiraBugTriagePattern: WorkflowPattern = {
    id: "jira-bug-triage",
    name: "Jira Bug Triage",
    description:
        "Auto-analyze bug reports, determine priority and component, and create Jira issues",
    useCase: "Bug management automation",
    icon: "Bug",
    nodeCount: 5,
    category: "intermediate",
    integrations: ["Jira"],
    definition: {
        name: "Jira Bug Triage",
        nodes: {
            "input-1": {
                type: "input",
                name: "Bug Report",
                config: {
                    inputName: "bugReport",
                    inputVariable: "bugReport",
                    inputType: "json",
                    required: true,
                    description: "Bug report from user or system",
                    defaultValue:
                        '{"title": "", "description": "", "steps": "", "expected": "", "actual": "", "reporter": ""}'
                },
                position: { x: 100, y: 140 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Bug",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a bug triage specialist. Analyze bug reports and determine:\n- Severity (critical/high/medium/low)\n- Component (frontend/backend/database/api/auth/other)\n- Priority (P1/P2/P3/P4)\n- Estimated effort (hours)\n\nBase severity on user impact and system stability risks.",
                    prompt: 'Bug Report:\nTitle: {{bugReport.title}}\nDescription: {{bugReport.description}}\nSteps to Reproduce: {{bugReport.steps}}\nExpected: {{bugReport.expected}}\nActual: {{bugReport.actual}}\n\nAnalyze and respond with JSON:\n{"severity": "...", "component": "...", "priority": "...", "effort": "...", "summary": "...", "suggestedLabels": [...]}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "analysis"
                },
                position: { x: 480, y: 180 }
            },
            "transform-1": {
                type: "transform",
                name: "Format for Jira",
                config: {
                    operations: [
                        {
                            type: "parseJson",
                            input: "{{analysis.text}}",
                            output: "parsedAnalysis"
                        },
                        {
                            type: "template",
                            template:
                                "h2. Summary\n{{parsedAnalysis.summary}}\n\nh2. Reproduction Steps\n{{bugReport.steps}}\n\nh2. Expected vs Actual\n*Expected:* {{bugReport.expected}}\n*Actual:* {{bugReport.actual}}\n\nh2. Analysis\n*Severity:* {{parsedAnalysis.severity}}\n*Component:* {{parsedAnalysis.component}}\n*Estimated Effort:* {{parsedAnalysis.effort}} hours",
                            output: "jiraDescription"
                        }
                    ],
                    outputVariable: "formatted"
                },
                position: { x: 860, y: 140 }
            },
            "action-jira": {
                type: "action",
                name: "Create Jira Issue",
                config: {
                    provider: "jira",
                    action: "createIssue",
                    project: "{{env.JIRA_PROJECT_KEY}}",
                    issueType: "Bug",
                    summary: "[{{parsedAnalysis.priority}}] {{bugReport.title}}",
                    description: "{{formatted.jiraDescription}}",
                    priority: "{{parsedAnalysis.priority}}",
                    labels: "{{parsedAnalysis.suggestedLabels}}",
                    components: ["{{parsedAnalysis.component}}"],
                    outputVariable: "jiraIssue"
                },
                position: { x: 1240, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Triage Result",
                config: {
                    outputName: "result",
                    value: '{"issueKey": "{{jiraIssue.key}}", "analysis": {{analysis.text}}, "url": "{{jiraIssue.url}}"}',
                    format: "json",
                    description: "Bug triage result with Jira link"
                },
                position: { x: 1620, y: 140 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-analyze" },
            { id: "edge-2", source: "llm-analyze", target: "transform-1" },
            { id: "edge-3", source: "transform-1", target: "action-jira" },
            { id: "edge-4", source: "action-jira", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Intermediate Pattern 6: Content to Social Posts
const contentToSocialPattern: WorkflowPattern = {
    id: "content-to-social",
    name: "Content to Social Posts",
    description: "Generate platform-specific social media posts from blog content or announcements",
    useCase: "Content repurposing",
    icon: "Share2",
    nodeCount: 5,
    category: "intermediate",
    integrations: [],
    definition: {
        name: "Content to Social Posts",
        nodes: {
            "input-1": {
                type: "input",
                name: "Content Input",
                config: {
                    inputName: "content",
                    inputVariable: "content",
                    inputType: "json",
                    required: true,
                    description: "Blog post or announcement content",
                    defaultValue: '{"title": "", "body": "", "url": "", "tags": []}'
                },
                position: { x: 100, y: 300 }
            },
            "llm-twitter": {
                type: "llm",
                name: "Twitter Post",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a social media expert. Create engaging Twitter/X posts. Stay under 280 characters. Use relevant hashtags (2-3 max). Be punchy and attention-grabbing. Include a call to action.",
                    prompt: "Create a Twitter post for this content:\n\nTitle: {{content.title}}\n\nContent:\n{{content.body}}\n\nURL: {{content.url}}\n\nTags: {{content.tags}}",
                    temperature: 0.7,
                    maxTokens: 200,
                    outputVariable: "twitterPost"
                },
                position: { x: 480, y: 500 }
            },
            "llm-linkedin": {
                type: "llm",
                name: "LinkedIn Post",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a LinkedIn content expert. Create professional posts that drive engagement. Use line breaks for readability. Include 3-5 relevant hashtags at the end. Posts should be 100-200 words for optimal engagement.",
                    prompt: "Create a LinkedIn post for this content:\n\nTitle: {{content.title}}\n\nContent:\n{{content.body}}\n\nURL: {{content.url}}\n\nTags: {{content.tags}}",
                    temperature: 0.6,
                    maxTokens: 500,
                    outputVariable: "linkedinPost"
                },
                position: { x: 480, y: 340 }
            },
            "llm-summary": {
                type: "llm",
                name: "Short Summary",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a content summarizer. Create a 1-2 sentence summary suitable for email newsletters, Slack announcements, or meta descriptions.",
                    prompt: "Create a brief 1-2 sentence summary of this content:\n\nTitle: {{content.title}}\n\nContent:\n{{content.body}}",
                    temperature: 0.4,
                    maxTokens: 150,
                    outputVariable: "summary"
                },
                position: { x: 480, y: 100 }
            },
            "template-output": {
                type: "templateOutput",
                name: "Combined Output",
                config: {
                    template: {
                        title: "{{content.title}}",
                        url: "{{content.url}}",
                        platforms: {
                            twitter: "{{twitterPost.text}}",
                            linkedin: "{{linkedinPost.text}}"
                        },
                        summary: "{{summary.text}}",
                        generatedAt: "{{$now}}"
                    },
                    outputVariable: "socialPosts"
                },
                position: { x: 860, y: 300 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-twitter" },
            { id: "edge-2", source: "input-1", target: "llm-linkedin" },
            { id: "edge-3", source: "input-1", target: "llm-summary" },
            { id: "edge-4", source: "llm-twitter", target: "template-output" },
            { id: "edge-5", source: "llm-linkedin", target: "template-output" },
            { id: "edge-6", source: "llm-summary", target: "template-output" }
        ],
        entryPoint: "input-1"
    }
};

// ============================================================================
// ADVANCED PATTERNS (8 patterns)
// Complex multi-branched workflows with advanced features
// ============================================================================

// Advanced Pattern 1: Real-Time Customer Support Translation
const customerSupportTranslationPattern: WorkflowPattern = {
    id: "customer-support-translation",
    name: "Real-Time Customer Support Translation",
    description:
        "Bi-directional message translation for multi-language customer support with language preference storage",
    useCase: "Multi-language support",
    icon: "Languages",
    nodeCount: 13,
    category: "advanced",
    integrations: [],
    definition: {
        name: "Real-Time Customer Support Translation",
        nodes: {
            "input-message": {
                type: "input",
                name: "Message Input",
                config: {
                    inputName: "messageText",
                    inputVariable: "messageText",
                    inputType: "text",
                    required: true,
                    description: "The message to be translated",
                    defaultValue: ""
                },
                position: { x: 100, y: 100 }
            },
            "input-customer": {
                type: "input",
                name: "Customer ID",
                config: {
                    inputName: "customerId",
                    inputVariable: "customerId",
                    inputType: "text",
                    required: true,
                    description: "Unique customer identifier",
                    defaultValue: ""
                },
                position: { x: 100, y: 500 }
            },
            "input-sender": {
                type: "input",
                name: "Sender Role",
                config: {
                    inputName: "senderRole",
                    inputVariable: "senderRole",
                    inputType: "text",
                    required: true,
                    description: "Either 'customer' or 'agent'",
                    defaultValue: "customer"
                },
                position: { x: 100, y: 300 }
            },
            "conditional-role": {
                type: "conditional",
                name: "Check Sender Role",
                config: {
                    conditionType: "simple",
                    leftValue: "{{senderRole}}",
                    operator: "==",
                    rightValue: "customer",
                    outputVariable: "isCustomer"
                },
                position: { x: 480, y: 340 }
            },
            "memory-get": {
                type: "shared-memory",
                name: "Get Customer Language",
                config: {
                    operation: "get",
                    key: "customer_lang_{{customerId}}",
                    outputVariable: "storedLanguage"
                },
                position: { x: 860, y: 400 }
            },
            "llm-detect": {
                type: "llm",
                name: "Detect Language",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "You are a language detection expert. Detect the language of the given text and respond with ONLY the ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'de', 'zh', 'ja', 'ko'). If unsure, respond with 'en'.",
                    prompt: "{{messageText}}",
                    temperature: 0.1,
                    maxTokens: 10,
                    outputVariable: "detectedLanguage"
                },
                position: { x: 860, y: 200 }
            },
            "memory-set": {
                type: "shared-memory",
                name: "Store Language",
                config: {
                    operation: "set",
                    key: "customer_lang_{{customerId}}",
                    value: "{{detectedLanguage.text}}",
                    outputVariable: "languageStored"
                },
                position: { x: 1240, y: 200 }
            },
            "conditional-english": {
                type: "conditional",
                name: "Is English?",
                config: {
                    conditionType: "expression",
                    expression:
                        "detectedLanguage.text.trim().toLowerCase() === 'en' || storedLanguage === 'en'",
                    outputVariable: "isEnglish"
                },
                position: { x: 1620, y: 300 }
            },
            "transform-passthrough": {
                type: "transform",
                name: "Pass Through (English)",
                config: {
                    operations: [
                        {
                            type: "set",
                            path: "translatedMessage",
                            value: "{{messageText}}"
                        }
                    ],
                    outputVariable: "passthrough"
                },
                position: { x: 2000, y: 200 }
            },
            "llm-translate-to-english": {
                type: "llm",
                name: "Translate to English",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a professional translator. Translate the given text to English. Preserve the tone and meaning. Output only the translated text, nothing else.",
                    prompt: "{{messageText}}",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "toEnglish"
                },
                position: { x: 2000, y: 400 }
            },
            "llm-translate-from-english": {
                type: "llm",
                name: "Translate from English",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a professional translator. Translate the given English text to the target language specified. Preserve the tone and meaning. Output only the translated text, nothing else.",
                    prompt: "Translate to language code '{{storedLanguage}}':\n\n{{messageText}}",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "fromEnglish"
                },
                position: { x: 1240, y: 440 }
            },
            "output-text": {
                type: "output",
                name: "Translated Message",
                config: {
                    outputName: "translatedMessage",
                    value: "{{passthrough.translatedMessage || toEnglish.text || fromEnglish.text}}",
                    format: "string",
                    description: "The translated message"
                },
                position: { x: 2380, y: 260 }
            },
            "output-meta": {
                type: "output",
                name: "Translation Metadata",
                config: {
                    outputName: "metadata",
                    value: '{"originalLanguage": "{{detectedLanguage.text}}", "customerLanguage": "{{storedLanguage}}", "senderRole": "{{senderRole}}"}',
                    format: "json",
                    description: "Translation metadata"
                },
                position: { x: 2760, y: 300 }
            }
        },
        edges: [
            { id: "e1", source: "input-message", target: "conditional-role" },
            { id: "e2", source: "input-customer", target: "conditional-role" },
            { id: "e3", source: "input-sender", target: "conditional-role" },
            { id: "e4", source: "conditional-role", target: "memory-get", sourceHandle: "false" },
            { id: "e5", source: "conditional-role", target: "llm-detect", sourceHandle: "true" },
            { id: "e6", source: "llm-detect", target: "memory-set" },
            { id: "e7", source: "memory-set", target: "conditional-english" },
            { id: "e8", source: "memory-get", target: "conditional-english" },
            {
                id: "e9",
                source: "conditional-english",
                target: "transform-passthrough",
                sourceHandle: "true"
            },
            {
                id: "e10",
                source: "conditional-english",
                target: "llm-translate-to-english",
                sourceHandle: "false"
            },
            { id: "e11", source: "memory-get", target: "llm-translate-from-english" },
            { id: "e12", source: "transform-passthrough", target: "output-text" },
            { id: "e13", source: "llm-translate-to-english", target: "output-text" },
            { id: "e14", source: "llm-translate-from-english", target: "output-text" },
            { id: "e15", source: "output-text", target: "output-meta" }
        ],
        entryPoint: "input-message"
    }
};

// Advanced Pattern 2: E-commerce Order Processing Pipeline
const ecommerceOrderProcessingPattern: WorkflowPattern = {
    id: "ecommerce-order-processing",
    name: "E-commerce Order Processing Pipeline",
    description:
        "Automated order validation with fraud detection, inventory check, and payment processing",
    useCase: "Order fulfillment automation",
    icon: "ShoppingCart",
    nodeCount: 12,
    category: "advanced",
    integrations: ["Stripe", "Inventory API"],
    definition: {
        name: "E-commerce Order Processing Pipeline",
        nodes: {
            "input-order": {
                type: "input",
                name: "Order Data",
                config: {
                    inputName: "orderData",
                    inputVariable: "orderData",
                    inputType: "json",
                    required: true,
                    description: "Complete order details",
                    defaultValue:
                        '{"orderId": "", "customerId": "", "items": [], "totalAmount": 0, "shippingAddress": {}, "paymentMethod": {}}'
                },
                position: { x: 100, y: 240 }
            },
            "transform-validate": {
                type: "transform",
                name: "Validate Order",
                config: {
                    operations: [
                        {
                            type: "validate",
                            rules: [
                                { field: "orderId", required: true },
                                { field: "items", minLength: 1 },
                                { field: "totalAmount", min: 0.01 }
                            ],
                            output: "validationResult"
                        }
                    ],
                    outputVariable: "validation"
                },
                position: { x: 480, y: 340 }
            },
            "http-inventory": {
                type: "http",
                name: "Check Inventory",
                config: {
                    method: "POST",
                    url: "{{env.INVENTORY_API_URL}}/check",
                    headers: {
                        Authorization: "Bearer {{env.INVENTORY_API_KEY}}",
                        "Content-Type": "application/json"
                    },
                    body: '{"items": {{orderData.items}}}',
                    outputVariable: "inventoryCheck",
                    timeout: 15000
                },
                position: { x: 480, y: 140 }
            },
            "llm-fraud": {
                type: "llm",
                name: "Fraud Analysis",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a fraud detection specialist. Analyze the order data and provide a fraud risk score (0-100) and risk factors. Consider: shipping/billing mismatch, unusual order patterns, high-value orders from new customers, suspicious address patterns.",
                    prompt: 'Order Data:\n- Order ID: {{orderData.orderId}}\n- Customer ID: {{orderData.customerId}}\n- Total: ${{orderData.totalAmount}}\n- Items: {{orderData.items}}\n- Shipping: {{orderData.shippingAddress}}\n\nProvide analysis as JSON:\n{"riskScore": 0-100, "riskLevel": "low/medium/high", "factors": [...], "recommendation": "approve/review/decline"}',
                    temperature: 0.2,
                    maxTokens: 500,
                    outputVariable: "fraudAnalysis"
                },
                position: { x: 860, y: 380 }
            },
            "conditional-inventory": {
                type: "conditional",
                name: "Inventory Available?",
                config: {
                    conditionType: "expression",
                    expression: "inventoryCheck.body.available === true",
                    outputVariable: "hasInventory"
                },
                position: { x: 860, y: 180 }
            },
            "conditional-fraud": {
                type: "conditional",
                name: "Fraud Check",
                config: {
                    conditionType: "expression",
                    expression:
                        'fraudAnalysis.text.includes(\'"riskLevel": "low"\') || fraudAnalysis.text.includes(\'"riskLevel": "medium"\')',
                    outputVariable: "passedFraudCheck"
                },
                position: { x: 1240, y: 240 }
            },
            "human-review": {
                type: "humanReview",
                name: "Manual Review",
                config: {
                    prompt: "High-risk order requires manual review",
                    description:
                        "Review the fraud analysis and decide whether to approve or decline this order.",
                    variableName: "manualDecision",
                    inputType: "json",
                    required: true,
                    placeholder: '{"decision": "approve", "notes": ""}'
                },
                position: { x: 1620, y: 340 }
            },
            "http-payment": {
                type: "http",
                name: "Process Payment",
                config: {
                    method: "POST",
                    url: "https://api.stripe.com/v1/payment_intents",
                    headers: {
                        Authorization: "Bearer {{env.STRIPE_SECRET_KEY}}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: "amount={{orderData.totalAmount}}&currency=usd&customer={{orderData.customerId}}",
                    outputVariable: "paymentResult",
                    timeout: 30000
                },
                position: { x: 1620, y: 140 }
            },
            "conditional-payment": {
                type: "conditional",
                name: "Payment Success?",
                config: {
                    conditionType: "expression",
                    expression:
                        "paymentResult.body.status === 'succeeded' || paymentResult.body.status === 'requires_capture'",
                    outputVariable: "paymentSuccess"
                },
                position: { x: 2000, y: 100 }
            },
            "output-success": {
                type: "output",
                name: "Order Confirmed",
                config: {
                    outputName: "result",
                    value: '{"status": "confirmed", "orderId": "{{orderData.orderId}}", "paymentId": "{{paymentResult.body.id}}", "fraudScore": "{{fraudAnalysis.text}}"}',
                    format: "json",
                    description: "Successful order confirmation"
                },
                position: { x: 2380, y: 140 }
            },
            "output-declined": {
                type: "output",
                name: "Order Declined",
                config: {
                    outputName: "result",
                    value: '{"status": "declined", "orderId": "{{orderData.orderId}}", "reason": "fraud_risk", "fraudAnalysis": "{{fraudAnalysis.text}}"}',
                    format: "json",
                    description: "Order declined due to fraud risk"
                },
                position: { x: 2000, y: 300 }
            },
            "output-failed": {
                type: "output",
                name: "Order Failed",
                config: {
                    outputName: "result",
                    value: '{"status": "failed", "orderId": "{{orderData.orderId}}", "reason": "{{inventoryCheck.body.reason || paymentResult.body.error}}"}',
                    format: "json",
                    description: "Order failed due to inventory or payment issues"
                },
                position: { x: 2380, y: 340 }
            }
        },
        edges: [
            { id: "e1", source: "input-order", target: "transform-validate" },
            { id: "e2", source: "input-order", target: "http-inventory" },
            { id: "e3", source: "transform-validate", target: "llm-fraud" },
            { id: "e4", source: "http-inventory", target: "conditional-inventory" },
            { id: "e5", source: "llm-fraud", target: "conditional-fraud" },
            {
                id: "e6",
                source: "conditional-fraud",
                target: "http-payment",
                sourceHandle: "true"
            },
            {
                id: "e7",
                source: "conditional-fraud",
                target: "human-review",
                sourceHandle: "false"
            },
            { id: "e8", source: "human-review", target: "output-declined" },
            {
                id: "e9",
                source: "conditional-inventory",
                target: "http-payment",
                sourceHandle: "true"
            },
            {
                id: "e10",
                source: "conditional-inventory",
                target: "output-failed",
                sourceHandle: "false"
            },
            { id: "e11", source: "http-payment", target: "conditional-payment" },
            {
                id: "e12",
                source: "conditional-payment",
                target: "output-success",
                sourceHandle: "true"
            },
            {
                id: "e13",
                source: "conditional-payment",
                target: "output-failed",
                sourceHandle: "false"
            }
        ],
        entryPoint: "input-order"
    }
};

// Advanced Pattern 3: Document Classification & Extraction Pipeline
const documentClassificationPattern: WorkflowPattern = {
    id: "document-classification",
    name: "Document Classification & Extraction",
    description:
        "Batch document processing with AI classification, type-based routing, and structured data extraction",
    useCase: "Document processing automation",
    icon: "FileStack",
    nodeCount: 11,
    category: "advanced",
    integrations: [],
    definition: {
        name: "Document Classification & Extraction",
        nodes: {
            "input-files": {
                type: "files",
                name: "Document Upload",
                config: {
                    inputName: "documents",
                    outputVariable: "uploadedDocs",
                    chunkSize: 4000,
                    allowedTypes: [".pdf", ".docx", ".txt", ".png", ".jpg"]
                },
                position: { x: 100, y: 300 }
            },
            "loop-docs": {
                type: "loop",
                name: "Process Each Document",
                config: {
                    loopType: "forEach",
                    arrayPath: "uploadedDocs.files",
                    iterationVariable: "currentDoc",
                    maxIterations: 50
                },
                position: { x: 480, y: 300 }
            },
            "llm-classify": {
                type: "llm",
                name: "Classify Document",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a document classification expert. Analyze the document content and classify it into exactly one category. Respond with ONLY the category name in lowercase.",
                    prompt: "Document content:\n{{currentDoc.content}}\n\nCategories:\n- invoice (bills, receipts, payment requests)\n- contract (agreements, legal documents, terms)\n- resume (CVs, job applications)\n- report (analysis, summaries, findings)\n- correspondence (emails, letters, memos)\n- other (anything else)",
                    temperature: 0.1,
                    maxTokens: 20,
                    outputVariable: "docType"
                },
                position: { x: 860, y: 300 }
            },
            "switch-type": {
                type: "switch",
                name: "Route by Type",
                config: {
                    expression: "{{docType.text.trim().toLowerCase()}}",
                    cases: [
                        { value: "invoice", label: "Invoice" },
                        { value: "contract", label: "Contract" },
                        { value: "resume", label: "Resume" },
                        { value: "report", label: "Report" }
                    ],
                    defaultCase: "other"
                },
                position: { x: 1240, y: 300 }
            },
            "llm-extract-invoice": {
                type: "llm",
                name: "Extract Invoice Data",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Extract structured data from invoices. Always respond with valid JSON.",
                    prompt: '{{currentDoc.content}}\n\nExtract:\n{"vendorName": "", "invoiceNumber": "", "date": "", "dueDate": "", "lineItems": [], "subtotal": 0, "tax": 0, "total": 0}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "invoiceData"
                },
                position: { x: 1620, y: 600 }
            },
            "llm-extract-contract": {
                type: "llm",
                name: "Extract Contract Data",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Extract structured data from contracts. Always respond with valid JSON.",
                    prompt: '{{currentDoc.content}}\n\nExtract:\n{"parties": [], "effectiveDate": "", "expirationDate": "", "keyTerms": [], "obligations": [], "signatures": []}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "contractData"
                },
                position: { x: 1620, y: 400 }
            },
            "llm-extract-resume": {
                type: "llm",
                name: "Extract Resume Data",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Extract structured data from resumes/CVs. Always respond with valid JSON.",
                    prompt: '{{currentDoc.content}}\n\nExtract:\n{"name": "", "email": "", "phone": "", "skills": [], "experience": [], "education": [], "summary": ""}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "resumeData"
                },
                position: { x: 1620, y: 200 }
            },
            "llm-extract-report": {
                type: "llm",
                name: "Extract Report Data",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Extract structured data from reports. Always respond with valid JSON.",
                    prompt: '{{currentDoc.content}}\n\nExtract:\n{"title": "", "author": "", "date": "", "executiveSummary": "", "keyFindings": [], "recommendations": [], "conclusions": ""}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "reportData"
                },
                position: { x: 1620, y: 0 }
            },
            "memory-store": {
                type: "shared-memory",
                name: "Store Results",
                config: {
                    operation: "set",
                    key: "doc_{{currentDoc.name}}",
                    value: '{"type": "{{docType.text}}", "data": "{{invoiceData.text || contractData.text || resumeData.text || reportData.text}}", "filename": "{{currentDoc.name}}"}',
                    outputVariable: "stored"
                },
                position: { x: 2000, y: 300 }
            },
            "transform-aggregate": {
                type: "transform",
                name: "Aggregate Results",
                config: {
                    operations: [
                        {
                            type: "collect",
                            from: "stored",
                            output: "allResults"
                        }
                    ],
                    outputVariable: "aggregated"
                },
                position: { x: 2380, y: 300 }
            },
            "output-results": {
                type: "output",
                name: "Processing Results",
                config: {
                    outputName: "results",
                    value: '{"processedCount": {{uploadedDocs.fileCount}}, "documents": {{aggregated.allResults}}}',
                    format: "json",
                    description: "All processed documents with extracted data"
                },
                position: { x: 2760, y: 300 }
            }
        },
        edges: [
            { id: "e1", source: "input-files", target: "loop-docs" },
            { id: "e2", source: "loop-docs", target: "llm-classify", sourceHandle: "loop-body" },
            { id: "e3", source: "llm-classify", target: "switch-type" },
            {
                id: "e4",
                source: "switch-type",
                target: "llm-extract-invoice",
                sourceHandle: "invoice"
            },
            {
                id: "e5",
                source: "switch-type",
                target: "llm-extract-contract",
                sourceHandle: "contract"
            },
            {
                id: "e6",
                source: "switch-type",
                target: "llm-extract-resume",
                sourceHandle: "resume"
            },
            {
                id: "e7",
                source: "switch-type",
                target: "llm-extract-report",
                sourceHandle: "report"
            },
            { id: "e8", source: "llm-extract-invoice", target: "memory-store" },
            { id: "e9", source: "llm-extract-contract", target: "memory-store" },
            { id: "e10", source: "llm-extract-resume", target: "memory-store" },
            { id: "e11", source: "llm-extract-report", target: "memory-store" },
            { id: "e12", source: "memory-store", target: "loop-docs" },
            {
                id: "e13",
                source: "loop-docs",
                target: "transform-aggregate",
                sourceHandle: "loop-exit"
            },
            { id: "e14", source: "transform-aggregate", target: "output-results" }
        ],
        entryPoint: "input-files"
    }
};

// Advanced Pattern 4: Multi-Stage Content Moderation
const contentModerationPattern: WorkflowPattern = {
    id: "content-moderation",
    name: "Multi-Stage Content Moderation",
    description:
        "Comprehensive content safety pipeline with parallel text/image analysis, severity routing, and human escalation",
    useCase: "Content safety automation",
    icon: "Shield",
    nodeCount: 14,
    category: "advanced",
    integrations: [],
    definition: {
        name: "Multi-Stage Content Moderation",
        nodes: {
            "input-content": {
                type: "input",
                name: "Content Input",
                config: {
                    inputName: "content",
                    inputVariable: "content",
                    inputType: "json",
                    required: true,
                    description: "Content to moderate",
                    defaultValue:
                        '{"userId": "", "text": "", "imageUrl": "", "contentType": "post", "platform": ""}'
                },
                position: { x: 100, y: 400 }
            },
            "memory-history": {
                type: "shared-memory",
                name: "Get User History",
                config: {
                    operation: "get",
                    key: "mod_history_{{content.userId}}",
                    outputVariable: "userHistory"
                },
                position: { x: 480, y: 600 }
            },
            "llm-text-analysis": {
                type: "llm",
                name: "Analyze Text",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a content moderation expert. Analyze text for policy violations. Categories: hate_speech, harassment, violence, sexual_content, spam, misinformation, self_harm, none. Provide severity (0-100) for each detected issue.",
                    prompt: 'Text: "{{content.text}}"\n\nPrevious violations by user: {{userHistory}}\n\nAnalyze and respond with JSON:\n{"violations": [{"category": "", "severity": 0, "excerpt": ""}], "overallSeverity": 0, "recommendation": "approve/flag/remove/escalate"}',
                    temperature: 0.1,
                    maxTokens: 500,
                    outputVariable: "textAnalysis"
                },
                position: { x: 480, y: 440 }
            },
            "conditional-has-image": {
                type: "conditional",
                name: "Has Image?",
                config: {
                    conditionType: "expression",
                    expression: "content.imageUrl && content.imageUrl.trim().length > 0",
                    outputVariable: "hasImage"
                },
                position: { x: 860, y: 200 }
            },
            "vision-analyze": {
                type: "vision",
                name: "Analyze Image",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    prompt: 'Analyze this image for content policy violations. Check for: explicit content, violence, hate symbols, dangerous activities, spam/scam indicators. Respond with JSON: {"violations": [], "overallSeverity": 0, "description": ""}',
                    imageUrl: "{{content.imageUrl}}",
                    outputVariable: "imageAnalysis"
                },
                position: { x: 860, y: 300 }
            },
            "code-combine": {
                type: "code",
                name: "Combine Analysis",
                config: {
                    language: "javascript",
                    code: "const textSeverity = parseInt(inputs.textAnalysis?.overallSeverity) || 0;\nconst imageSeverity = parseInt(inputs.imageAnalysis?.overallSeverity) || 0;\nconst combinedSeverity = Math.max(textSeverity, imageSeverity);\nconst previousViolations = inputs.userHistory?.count || 0;\nconst adjustedSeverity = Math.min(100, combinedSeverity + (previousViolations * 10));\nreturn { combinedSeverity: adjustedSeverity, textSeverity, imageSeverity, previousViolations };",
                    timeout: 5,
                    outputVariable: "combined"
                },
                position: { x: 1240, y: 500 }
            },
            "switch-severity": {
                type: "switch",
                name: "Severity Routing",
                config: {
                    expression:
                        "{{combined.combinedSeverity >= 80 ? 'critical' : combined.combinedSeverity >= 50 ? 'high' : combined.combinedSeverity >= 20 ? 'medium' : 'low'}}",
                    cases: [
                        { value: "critical", label: "Critical (80+)" },
                        { value: "high", label: "High (50-79)" },
                        { value: "medium", label: "Medium (20-49)" },
                        { value: "low", label: "Low (<20)" }
                    ],
                    defaultCase: "low"
                },
                position: { x: 1620, y: 400 }
            },
            "human-review": {
                type: "humanReview",
                name: "Human Review",
                config: {
                    prompt: "Critical content requires human review before action",
                    description: "Review the content and AI analysis. Decide on final action.",
                    variableName: "humanDecision",
                    inputType: "json",
                    required: true,
                    placeholder: '{"action": "remove", "reason": "", "banUser": false}'
                },
                position: { x: 1960, y: 700 }
            },
            "action-auto-remove": {
                type: "action",
                name: "Auto-Remove Content",
                config: {
                    provider: "internal",
                    action: "removeContent",
                    contentId: "{{content.id}}",
                    reason: "Automated removal: {{textAnalysis.text}}",
                    outputVariable: "removeResult"
                },
                position: { x: 2000, y: 500 }
            },
            "action-flag": {
                type: "action",
                name: "Flag for Review",
                config: {
                    provider: "internal",
                    action: "flagContent",
                    contentId: "{{content.id}}",
                    priority: "medium",
                    reason: "{{textAnalysis.text}}",
                    outputVariable: "flagResult"
                },
                position: { x: 2040, y: 300 }
            },
            "transform-approve": {
                type: "transform",
                name: "Approve Content",
                config: {
                    operations: [
                        {
                            type: "set",
                            path: "status",
                            value: "approved"
                        }
                    ],
                    outputVariable: "approved"
                },
                position: { x: 2000, y: 100 }
            },
            "memory-update": {
                type: "shared-memory",
                name: "Update History",
                config: {
                    operation: "set",
                    key: "mod_history_{{content.userId}}",
                    value: '{"count": {{userHistory.count || 0}} + 1, "lastViolation": "{{$now}}", "severity": {{combined.combinedSeverity}}}',
                    outputVariable: "historyUpdated"
                },
                position: { x: 2380, y: 360 }
            },
            "output-result": {
                type: "output",
                name: "Moderation Result",
                config: {
                    outputName: "result",
                    value: '{"contentId": "{{content.id}}", "userId": "{{content.userId}}", "action": "{{humanDecision.action || removeResult.action || flagResult.action || approved.status}}", "severity": {{combined.combinedSeverity}}, "textViolations": "{{textAnalysis.text}}", "imageViolations": "{{imageAnalysis.text}}"}',
                    format: "json",
                    description: "Moderation decision and details"
                },
                position: { x: 2760, y: 400 }
            }
        },
        edges: [
            { id: "e1", source: "input-content", target: "memory-history" },
            { id: "e2", source: "input-content", target: "llm-text-analysis" },
            { id: "e3", source: "input-content", target: "conditional-has-image" },
            {
                id: "e4",
                source: "conditional-has-image",
                target: "vision-analyze",
                sourceHandle: "true"
            },
            { id: "e5", source: "memory-history", target: "code-combine" },
            { id: "e6", source: "llm-text-analysis", target: "code-combine" },
            { id: "e7", source: "vision-analyze", target: "code-combine" },
            {
                id: "e8",
                source: "conditional-has-image",
                target: "code-combine",
                sourceHandle: "false"
            },
            { id: "e9", source: "code-combine", target: "switch-severity" },
            {
                id: "e10",
                source: "switch-severity",
                target: "human-review",
                sourceHandle: "critical"
            },
            {
                id: "e11",
                source: "switch-severity",
                target: "action-auto-remove",
                sourceHandle: "high"
            },
            { id: "e12", source: "switch-severity", target: "action-flag", sourceHandle: "medium" },
            {
                id: "e13",
                source: "switch-severity",
                target: "transform-approve",
                sourceHandle: "low"
            },
            { id: "e14", source: "human-review", target: "memory-update" },
            { id: "e15", source: "action-auto-remove", target: "memory-update" },
            { id: "e16", source: "action-flag", target: "memory-update" },
            { id: "e17", source: "transform-approve", target: "output-result" },
            { id: "e18", source: "memory-update", target: "output-result" }
        ],
        entryPoint: "input-content"
    }
};

// Advanced Pattern 5: Customer Journey Orchestration
const customerJourneyPattern: WorkflowPattern = {
    id: "customer-journey",
    name: "Customer Journey Orchestration",
    description:
        "Personalized customer engagement with journey state management and multi-channel touchpoints",
    useCase: "Marketing automation",
    icon: "Route",
    nodeCount: 12,
    category: "advanced",
    integrations: ["HubSpot", "SendGrid", "Twilio"],
    definition: {
        name: "Customer Journey Orchestration",
        nodes: {
            "input-event": {
                type: "input",
                name: "Customer Event",
                config: {
                    inputName: "event",
                    inputVariable: "event",
                    inputType: "json",
                    required: true,
                    description: "Customer interaction event",
                    defaultValue:
                        '{"customerId": "", "eventType": "", "data": {}, "channel": "", "timestamp": ""}'
                },
                position: { x: 100, y: 400 }
            },
            "memory-state": {
                type: "shared-memory",
                name: "Get Journey State",
                config: {
                    operation: "get",
                    key: "journey_{{event.customerId}}",
                    outputVariable: "journeyState"
                },
                position: { x: 480, y: 500 }
            },
            "http-profile": {
                type: "http",
                name: "Fetch Profile",
                config: {
                    method: "GET",
                    url: "{{env.CRM_API_URL}}/customers/{{event.customerId}}",
                    headers: {
                        Authorization: "Bearer {{env.CRM_API_KEY}}"
                    },
                    outputVariable: "customerProfile",
                    timeout: 10000
                },
                position: { x: 480, y: 300 }
            },
            "switch-stage": {
                type: "switch",
                name: "Journey Stage",
                config: {
                    expression: "{{journeyState.stage || 'awareness'}}",
                    cases: [
                        { value: "awareness", label: "Awareness" },
                        { value: "consideration", label: "Consideration" },
                        { value: "decision", label: "Decision" },
                        { value: "retention", label: "Retention" }
                    ],
                    defaultCase: "awareness"
                },
                position: { x: 860, y: 440 }
            },
            "llm-awareness": {
                type: "llm",
                name: "Awareness Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate personalized awareness-stage content. Focus on education and problem awareness. Keep messages friendly and informative.",
                    prompt: "Customer: {{customerProfile.body}}\nEvent: {{event.eventType}}\nPrevious interactions: {{journeyState.interactions}}\n\nGenerate an appropriate response to nurture this prospect.",
                    temperature: 0.7,
                    maxTokens: 500,
                    outputVariable: "awarenessContent"
                },
                position: { x: 1200, y: 700 }
            },
            "llm-consideration": {
                type: "llm",
                name: "Consideration Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate personalized consideration-stage content. Focus on product benefits and comparisons. Include relevant case studies or testimonials.",
                    prompt: "Customer: {{customerProfile.body}}\nEvent: {{event.eventType}}\nInterest areas: {{journeyState.interests}}\n\nGenerate content to help this prospect evaluate our solution.",
                    temperature: 0.6,
                    maxTokens: 600,
                    outputVariable: "considerationContent"
                },
                position: { x: 1240, y: 500 }
            },
            "llm-decision": {
                type: "llm",
                name: "Decision Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate personalized decision-stage content. Focus on urgency, special offers, and removing obstacles. Be persuasive but not pushy.",
                    prompt: "Customer: {{customerProfile.body}}\nEvent: {{event.eventType}}\nPrevious objections: {{journeyState.objections}}\n\nGenerate content to help close this deal.",
                    temperature: 0.5,
                    maxTokens: 500,
                    outputVariable: "decisionContent"
                },
                position: { x: 1280, y: 300 }
            },
            "llm-retention": {
                type: "llm",
                name: "Retention Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate personalized retention-stage content. Focus on maximizing value, upsells, and loyalty rewards. Celebrate milestones.",
                    prompt: "Customer: {{customerProfile.body}}\nEvent: {{event.eventType}}\nPurchase history: {{journeyState.purchases}}\n\nGenerate content to delight this customer and encourage loyalty.",
                    temperature: 0.6,
                    maxTokens: 500,
                    outputVariable: "retentionContent"
                },
                position: { x: 1240, y: 100 }
            },
            "router-channel": {
                type: "router",
                name: "Channel Selector",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "Select the best communication channel based on customer preferences and event context.",
                    prompt: "Customer preferences: {{customerProfile.body.preferences}}\nEvent channel: {{event.channel}}\nMessage urgency: {{journeyState.stage}}\n\nSelect channel: email, sms, or push",
                    temperature: 0.1,
                    routes: [
                        { value: "email", label: "Email", description: "Detailed content" },
                        { value: "sms", label: "SMS", description: "Urgent, short messages" },
                        { value: "push", label: "Push", description: "In-app notifications" }
                    ],
                    defaultRoute: "email",
                    outputVariable: "channelSelection"
                },
                position: { x: 1620, y: 400 }
            },
            "memory-update": {
                type: "shared-memory",
                name: "Update Journey",
                config: {
                    operation: "set",
                    key: "journey_{{event.customerId}}",
                    value: '{"stage": "{{journeyState.stage}}", "interactions": {{journeyState.interactions || 0}} + 1, "lastContact": "{{$now}}", "lastChannel": "{{channelSelection.selectedRoute}}"}',
                    outputVariable: "journeyUpdated"
                },
                position: { x: 2000, y: 360 }
            },
            "output-action": {
                type: "output",
                name: "Journey Action",
                config: {
                    outputName: "action",
                    value: '{"customerId": "{{event.customerId}}", "stage": "{{journeyState.stage}}", "channel": "{{channelSelection.selectedRoute}}", "content": "{{awarenessContent.text || considerationContent.text || decisionContent.text || retentionContent.text}}", "nextAction": "schedule_followup"}',
                    format: "json",
                    description: "Orchestrated customer journey action"
                },
                position: { x: 2380, y: 400 }
            }
        },
        edges: [
            { id: "e1", source: "input-event", target: "memory-state" },
            { id: "e2", source: "input-event", target: "http-profile" },
            { id: "e3", source: "memory-state", target: "switch-stage" },
            { id: "e4", source: "http-profile", target: "switch-stage" },
            {
                id: "e5",
                source: "switch-stage",
                target: "llm-awareness",
                sourceHandle: "awareness"
            },
            {
                id: "e6",
                source: "switch-stage",
                target: "llm-consideration",
                sourceHandle: "consideration"
            },
            { id: "e7", source: "switch-stage", target: "llm-decision", sourceHandle: "decision" },
            {
                id: "e8",
                source: "switch-stage",
                target: "llm-retention",
                sourceHandle: "retention"
            },
            { id: "e9", source: "llm-awareness", target: "router-channel" },
            { id: "e10", source: "llm-consideration", target: "router-channel" },
            { id: "e11", source: "llm-decision", target: "router-channel" },
            { id: "e12", source: "llm-retention", target: "router-channel" },
            { id: "e13", source: "router-channel", target: "memory-update" },
            { id: "e14", source: "memory-update", target: "output-action" }
        ],
        entryPoint: "input-event"
    }
};

// Advanced Pattern 6: Intelligent Data Validation Pipeline
const dataValidationPattern: WorkflowPattern = {
    id: "data-validation-pipeline",
    name: "Intelligent Data Validation Pipeline",
    description:
        "Batch data validation with AI-powered anomaly detection, quality scoring, and error categorization",
    useCase: "Data quality automation",
    icon: "Database",
    nodeCount: 11,
    category: "advanced",
    integrations: [],
    definition: {
        name: "Intelligent Data Validation Pipeline",
        nodes: {
            "input-data": {
                type: "input",
                name: "Data Batch",
                config: {
                    inputName: "dataBatch",
                    inputVariable: "dataBatch",
                    inputType: "json",
                    required: true,
                    description: "Array of records to validate",
                    defaultValue: '{"records": [], "schema": {}, "source": ""}'
                },
                position: { x: 100, y: 300 }
            },
            "transform-parse": {
                type: "transform",
                name: "Parse & Normalize",
                config: {
                    operations: [
                        {
                            type: "normalize",
                            fields: ["email", "phone", "date"],
                            output: "normalizedRecords"
                        },
                        {
                            type: "deduplicate",
                            key: "id",
                            output: "uniqueRecords"
                        }
                    ],
                    outputVariable: "parsed"
                },
                position: { x: 480, y: 340 }
            },
            "loop-validate": {
                type: "loop",
                name: "Validate Each Record",
                config: {
                    loopType: "forEach",
                    arrayPath: "parsed.uniqueRecords",
                    iterationVariable: "record",
                    maxIterations: 1000
                },
                position: { x: 860, y: 300 }
            },
            "code-schema-check": {
                type: "code",
                name: "Schema Validation",
                config: {
                    language: "javascript",
                    code: 'const schema = inputs.dataBatch.schema;\nconst record = inputs.record;\nconst errors = [];\nfor (const [field, rules] of Object.entries(schema)) {\n  if (rules.required && !record[field]) errors.push({field, error: "required"});\n  if (rules.type && typeof record[field] !== rules.type) errors.push({field, error: "type_mismatch"});\n  if (rules.pattern && !new RegExp(rules.pattern).test(record[field])) errors.push({field, error: "pattern_mismatch"});\n}\nreturn { valid: errors.length === 0, errors, recordId: record.id };',
                    timeout: 5,
                    outputVariable: "schemaResult"
                },
                position: { x: 1240, y: 400 }
            },
            "llm-anomaly": {
                type: "llm",
                name: "Detect Anomalies",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "You are a data quality expert. Analyze the record for anomalies, outliers, or suspicious patterns. Consider business logic violations and data consistency.",
                    prompt: 'Record: {{record}}\nSchema: {{dataBatch.schema}}\nSource: {{dataBatch.source}}\n\nAnalyze for anomalies. Respond with JSON:\n{"isAnomaly": true/false, "anomalyScore": 0-100, "issues": [], "confidence": 0-100}',
                    temperature: 0.2,
                    maxTokens: 300,
                    outputVariable: "anomalyResult"
                },
                position: { x: 1240, y: 200 }
            },
            "conditional-valid": {
                type: "conditional",
                name: "Is Valid?",
                config: {
                    conditionType: "expression",
                    expression:
                        "schemaResult.valid && !anomalyResult.text.includes('\"isAnomaly\": true')",
                    outputVariable: "isValid"
                },
                position: { x: 1620, y: 300 }
            },
            "memory-valid": {
                type: "shared-memory",
                name: "Store Valid",
                config: {
                    operation: "set",
                    key: "valid_{{record.id}}",
                    value: '{"record": {{record}}, "qualityScore": 100}',
                    outputVariable: "validStored"
                },
                position: { x: 2000, y: 200 }
            },
            "memory-invalid": {
                type: "shared-memory",
                name: "Store Invalid",
                config: {
                    operation: "set",
                    key: "invalid_{{record.id}}",
                    value: '{"record": {{record}}, "schemaErrors": {{schemaResult.errors}}, "anomalies": "{{anomalyResult.text}}"}',
                    outputVariable: "invalidStored"
                },
                position: { x: 2000, y: 400 }
            },
            "transform-summary": {
                type: "transform",
                name: "Generate Summary",
                config: {
                    operations: [
                        {
                            type: "aggregate",
                            metrics: ["validCount", "invalidCount", "anomalyCount"],
                            output: "summary"
                        }
                    ],
                    outputVariable: "summaryData"
                },
                position: { x: 2380, y: 300 }
            },
            "llm-report": {
                type: "llm",
                name: "Generate Report",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Generate a concise data quality report summarizing the validation results. Include recommendations for data quality improvements.",
                    prompt: "Validation Summary:\n- Total records: {{parsed.uniqueRecords.length}}\n- Valid: {{summaryData.summary.validCount}}\n- Invalid: {{summaryData.summary.invalidCount}}\n- Anomalies: {{summaryData.summary.anomalyCount}}\n\nGenerate a brief quality report with recommendations.",
                    temperature: 0.4,
                    maxTokens: 500,
                    outputVariable: "qualityReport"
                },
                position: { x: 2760, y: 300 }
            },
            "output-results": {
                type: "output",
                name: "Validation Results",
                config: {
                    outputName: "results",
                    value: '{"totalRecords": {{parsed.uniqueRecords.length}}, "validCount": {{summaryData.summary.validCount}}, "invalidCount": {{summaryData.summary.invalidCount}}, "qualityScore": {{(summaryData.summary.validCount / parsed.uniqueRecords.length) * 100}}, "report": "{{qualityReport.text}}"}',
                    format: "json",
                    description: "Complete validation results with quality report"
                },
                position: { x: 3140, y: 300 }
            }
        },
        edges: [
            { id: "e1", source: "input-data", target: "transform-parse" },
            { id: "e2", source: "transform-parse", target: "loop-validate" },
            {
                id: "e3",
                source: "loop-validate",
                target: "code-schema-check",
                sourceHandle: "loop-body"
            },
            { id: "e4", source: "loop-validate", target: "llm-anomaly", sourceHandle: "loop-body" },
            { id: "e5", source: "code-schema-check", target: "conditional-valid" },
            { id: "e6", source: "llm-anomaly", target: "conditional-valid" },
            { id: "e7", source: "conditional-valid", target: "memory-valid", sourceHandle: "true" },
            {
                id: "e8",
                source: "conditional-valid",
                target: "memory-invalid",
                sourceHandle: "false"
            },
            { id: "e9", source: "memory-valid", target: "loop-validate" },
            { id: "e10", source: "memory-invalid", target: "loop-validate" },
            {
                id: "e11",
                source: "loop-validate",
                target: "transform-summary",
                sourceHandle: "loop-exit"
            },
            { id: "e12", source: "transform-summary", target: "llm-report" },
            { id: "e13", source: "llm-report", target: "output-results" }
        ],
        entryPoint: "input-data"
    }
};

// Advanced Pattern 7: Multi-Level Approval Workflow
const approvalWorkflowPattern: WorkflowPattern = {
    id: "approval-workflow",
    name: "Multi-Level Approval Workflow",
    description:
        "Complex approval process with threshold-based routing, escalation logic, and complete audit trail",
    useCase: "Approval process automation",
    icon: "ClipboardCheck",
    nodeCount: 13,
    category: "advanced",
    integrations: ["Slack", "Email"],
    definition: {
        name: "Multi-Level Approval Workflow",
        nodes: {
            "input-request": {
                type: "input",
                name: "Approval Request",
                config: {
                    inputName: "request",
                    inputVariable: "request",
                    inputType: "json",
                    required: true,
                    description: "Item requiring approval",
                    defaultValue:
                        '{"requestId": "", "type": "", "amount": 0, "requesterId": "", "description": "", "urgency": "normal"}'
                },
                position: { x: 100, y: 400 }
            },
            "memory-init": {
                type: "shared-memory",
                name: "Init Audit Trail",
                config: {
                    operation: "set",
                    key: "approval_{{request.requestId}}",
                    value: '{"status": "pending", "created": "{{$now}}", "approvals": [], "currentLevel": 1}',
                    outputVariable: "auditInit"
                },
                position: { x: 480, y: 300 }
            },
            "switch-amount": {
                type: "switch",
                name: "Amount Threshold",
                config: {
                    expression:
                        "{{request.amount >= 50000 ? 'executive' : request.amount >= 10000 ? 'director' : request.amount >= 1000 ? 'manager' : 'auto'}}",
                    cases: [
                        { value: "executive", label: "Executive ($50K+)" },
                        { value: "director", label: "Director ($10K-$50K)" },
                        { value: "manager", label: "Manager ($1K-$10K)" },
                        { value: "auto", label: "Auto-Approve (<$1K)" }
                    ],
                    defaultCase: "manager"
                },
                position: { x: 480, y: 500 }
            },
            "human-manager": {
                type: "humanReview",
                name: "Manager Approval",
                config: {
                    prompt: "Manager approval required for {{request.type}}",
                    description:
                        "Review and approve/reject this request. Amount: ${{request.amount}}",
                    variableName: "managerDecision",
                    inputType: "json",
                    required: true,
                    placeholder: '{"decision": "approve", "comments": ""}'
                },
                position: { x: 900, y: 340 }
            },
            "human-director": {
                type: "humanReview",
                name: "Director Approval",
                config: {
                    prompt: "Director approval required for {{request.type}}",
                    description:
                        "High-value request requiring director review. Amount: ${{request.amount}}",
                    variableName: "directorDecision",
                    inputType: "json",
                    required: true,
                    placeholder: '{"decision": "approve", "comments": ""}'
                },
                position: { x: 860, y: 540 }
            },
            "human-executive": {
                type: "humanReview",
                name: "Executive Approval",
                config: {
                    prompt: "Executive approval required for {{request.type}}",
                    description:
                        "Critical request requiring executive sign-off. Amount: ${{request.amount}}",
                    variableName: "executiveDecision",
                    inputType: "json",
                    required: true,
                    placeholder: '{"decision": "approve", "comments": "", "conditions": ""}'
                },
                position: { x: 820, y: 700 }
            },
            "transform-auto": {
                type: "transform",
                name: "Auto-Approve",
                config: {
                    operations: [
                        {
                            type: "set",
                            path: "decision",
                            value: "approve"
                        },
                        {
                            type: "set",
                            path: "approver",
                            value: "system"
                        }
                    ],
                    outputVariable: "autoApproval"
                },
                position: { x: 860, y: 100 }
            },
            "conditional-approved": {
                type: "conditional",
                name: "Is Approved?",
                config: {
                    conditionType: "expression",
                    expression:
                        "autoApproval?.decision === 'approve' || managerDecision?.decision === 'approve' || directorDecision?.decision === 'approve' || executiveDecision?.decision === 'approve'",
                    outputVariable: "isApproved"
                },
                position: { x: 1240, y: 440 }
            },
            "memory-approved": {
                type: "shared-memory",
                name: "Record Approval",
                config: {
                    operation: "set",
                    key: "approval_{{request.requestId}}",
                    value: '{"status": "approved", "approvedAt": "{{$now}}", "approver": "{{executiveDecision.approver || directorDecision.approver || managerDecision.approver || autoApproval.approver}}", "comments": "{{executiveDecision.comments || directorDecision.comments || managerDecision.comments || \'\'}}"}',
                    outputVariable: "approvalRecord"
                },
                position: { x: 1620, y: 300 }
            },
            "memory-rejected": {
                type: "shared-memory",
                name: "Record Rejection",
                config: {
                    operation: "set",
                    key: "approval_{{request.requestId}}",
                    value: '{"status": "rejected", "rejectedAt": "{{$now}}", "reason": "{{executiveDecision.comments || directorDecision.comments || managerDecision.comments}}"}',
                    outputVariable: "rejectionRecord"
                },
                position: { x: 1620, y: 500 }
            },
            "action-notify-approved": {
                type: "action",
                name: "Notify Approved",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "{{env.APPROVALS_CHANNEL}}",
                    text: "Request {{request.requestId}} APPROVED for ${{request.amount}}",
                    outputVariable: "approvedNotification"
                },
                position: { x: 2000, y: 460 }
            },
            "action-notify-rejected": {
                type: "action",
                name: "Notify Rejected",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "{{env.APPROVALS_CHANNEL}}",
                    text: "Request {{request.requestId}} REJECTED. Reason: {{rejectionRecord.reason}}",
                    outputVariable: "rejectedNotification"
                },
                position: { x: 2000, y: 260 }
            },
            "output-result": {
                type: "output",
                name: "Approval Result",
                config: {
                    outputName: "result",
                    value: '{"requestId": "{{request.requestId}}", "status": "{{approvalRecord.status || rejectionRecord.status}}", "amount": {{request.amount}}, "processedAt": "{{$now}}", "auditTrail": "{{approvalRecord || rejectionRecord}}"}',
                    format: "json",
                    description: "Complete approval workflow result"
                },
                position: { x: 2380, y: 400 }
            }
        },
        edges: [
            { id: "e1", source: "input-request", target: "memory-init" },
            { id: "e2", source: "input-request", target: "switch-amount" },
            {
                id: "e3",
                source: "switch-amount",
                target: "human-executive",
                sourceHandle: "executive"
            },
            {
                id: "e4",
                source: "switch-amount",
                target: "human-director",
                sourceHandle: "director"
            },
            { id: "e5", source: "switch-amount", target: "human-manager", sourceHandle: "manager" },
            { id: "e6", source: "switch-amount", target: "transform-auto", sourceHandle: "auto" },
            { id: "e7", source: "human-executive", target: "conditional-approved" },
            { id: "e8", source: "human-director", target: "conditional-approved" },
            { id: "e9", source: "human-manager", target: "conditional-approved" },
            { id: "e10", source: "transform-auto", target: "conditional-approved" },
            {
                id: "e11",
                source: "conditional-approved",
                target: "memory-approved",
                sourceHandle: "true"
            },
            {
                id: "e12",
                source: "conditional-approved",
                target: "memory-rejected",
                sourceHandle: "false"
            },
            { id: "e13", source: "memory-approved", target: "action-notify-approved" },
            { id: "e14", source: "memory-rejected", target: "action-notify-rejected" },
            { id: "e15", source: "action-notify-approved", target: "output-result" },
            { id: "e16", source: "action-notify-rejected", target: "output-result" }
        ],
        entryPoint: "input-request"
    }
};

// Advanced Pattern 8: AI-Powered Research Assistant
const researchAssistantPattern: WorkflowPattern = {
    id: "research-assistant",
    name: "AI-Powered Research Assistant",
    description:
        "Multi-source research with parallel knowledge base and web retrieval, synthesis, and iterative refinement",
    useCase: "Research automation",
    icon: "BookOpen",
    nodeCount: 14,
    category: "advanced",
    integrations: ["Web Search"],
    definition: {
        name: "AI-Powered Research Assistant",
        nodes: {
            "input-query": {
                type: "input",
                name: "Research Query",
                config: {
                    inputName: "query",
                    inputVariable: "query",
                    inputType: "json",
                    required: true,
                    description: "Research question and parameters",
                    defaultValue:
                        '{"question": "", "depth": "comprehensive", "sources": ["kb", "web"], "maxResults": 10}'
                },
                position: { x: 100, y: 300 }
            },
            "llm-plan": {
                type: "llm",
                name: "Research Plan",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a research planning expert. Break down the research question into specific sub-queries that can be searched independently. Output a JSON array of search queries.",
                    prompt: 'Question: {{query.question}}\nDepth: {{query.depth}}\n\nGenerate 3-5 specific search queries as JSON:\n{"queries": ["query1", "query2", ...], "keywords": ["key1", "key2", ...]}',
                    temperature: 0.3,
                    maxTokens: 500,
                    outputVariable: "researchPlan"
                },
                position: { x: 480, y: 340 }
            },
            "kb-search-1": {
                type: "knowledgeBaseQuery",
                name: "KB Search Primary",
                config: {
                    knowledgeBaseId: "{{env.PRIMARY_KB_ID}}",
                    queryText: "{{query.question}}",
                    topK: 5,
                    similarityThreshold: 0.7,
                    outputVariable: "kbResults1"
                },
                position: { x: 860, y: 500 }
            },
            "kb-search-2": {
                type: "knowledgeBaseQuery",
                name: "KB Search Secondary",
                config: {
                    knowledgeBaseId: "{{env.SECONDARY_KB_ID}}",
                    queryText: "{{query.question}}",
                    topK: 5,
                    similarityThreshold: 0.7,
                    outputVariable: "kbResults2"
                },
                position: { x: 860, y: 300 }
            },
            "http-web-search": {
                type: "http",
                name: "Web Search",
                config: {
                    method: "GET",
                    url: "{{env.SEARCH_API_URL}}?q={{query.question}}&limit={{query.maxResults}}",
                    headers: {
                        Authorization: "Bearer {{env.SEARCH_API_KEY}}"
                    },
                    outputVariable: "webResults",
                    timeout: 20000
                },
                position: { x: 860, y: 100 }
            },
            "http-fetch-urls": {
                type: "http",
                name: "Fetch Top URLs",
                config: {
                    method: "POST",
                    url: "{{env.SCRAPER_API_URL}}/batch",
                    headers: {
                        Authorization: "Bearer {{env.SCRAPER_API_KEY}}",
                        "Content-Type": "application/json"
                    },
                    body: '{"urls": {{webResults.body.results.slice(0, 3).map(r => r.url)}}}',
                    outputVariable: "fetchedContent",
                    timeout: 30000
                },
                position: { x: 1240, y: 260 }
            },
            "code-merge": {
                type: "code",
                name: "Merge Sources",
                config: {
                    language: "javascript",
                    code: 'const kb1 = inputs.kbResults1?.results || [];\nconst kb2 = inputs.kbResults2?.results || [];\nconst web = inputs.fetchedContent?.body?.contents || [];\nconst allSources = [...kb1.map(r => ({source: "kb1", content: r.content, score: r.score})), ...kb2.map(r => ({source: "kb2", content: r.content, score: r.score})), ...web.map(r => ({source: "web", content: r.text, url: r.url}))];\nreturn { sources: allSources, totalCount: allSources.length };',
                    timeout: 10,
                    outputVariable: "mergedSources"
                },
                position: { x: 1620, y: 300 }
            },
            "llm-synthesize": {
                type: "llm",
                name: "Synthesize Research",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a research synthesis expert. Analyze all provided sources and synthesize a comprehensive answer to the research question. Cite sources, identify consensus and conflicts, and note confidence levels.",
                    prompt: "Research Question: {{query.question}}\n\nSources ({{mergedSources.totalCount}} total):\n{{mergedSources.sources}}\n\nProvide a comprehensive synthesis with citations.",
                    temperature: 0.4,
                    maxTokens: 3000,
                    outputVariable: "synthesis"
                },
                position: { x: 2000, y: 340 }
            },
            "llm-evaluate": {
                type: "llm",
                name: "Evaluate Quality",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Evaluate the quality of the research synthesis. Score completeness, accuracy, source diversity, and citation quality.",
                    prompt: 'Original question: {{query.question}}\n\nSynthesis:\n{{synthesis.text}}\n\nEvaluate and respond with JSON:\n{"completeness": 0-10, "sourceQuality": 0-10, "needsRefinement": true/false, "gaps": [], "overallScore": 0-10}',
                    temperature: 0.2,
                    maxTokens: 500,
                    outputVariable: "evaluation"
                },
                position: { x: 2380, y: 300 }
            },
            "conditional-quality": {
                type: "conditional",
                name: "Quality Check",
                config: {
                    conditionType: "expression",
                    expression:
                        "evaluation.text.includes('\"overallScore\": 8') || evaluation.text.includes('\"overallScore\": 9') || evaluation.text.includes('\"overallScore\": 10') || evaluation.text.includes('\"needsRefinement\": false')",
                    outputVariable: "qualityPassed"
                },
                position: { x: 2760, y: 260 }
            },
            "llm-refine": {
                type: "llm",
                name: "Refine Research",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "Refine the research synthesis based on the evaluation feedback. Fill identified gaps and improve weak areas.",
                    prompt: "Original synthesis:\n{{synthesis.text}}\n\nEvaluation feedback:\n{{evaluation.text}}\n\nProvide a refined, improved synthesis addressing the identified gaps.",
                    temperature: 0.4,
                    maxTokens: 3000,
                    outputVariable: "refinedSynthesis"
                },
                position: { x: 3140, y: 400 }
            },
            "memory-store": {
                type: "shared-memory",
                name: "Cache Results",
                config: {
                    operation: "set",
                    key: "research_{{query.question}}",
                    value: '{"synthesis": "{{refinedSynthesis.text || synthesis.text}}", "evaluation": "{{evaluation.text}}", "sources": {{mergedSources.totalCount}}, "timestamp": "{{$now}}"}',
                    outputVariable: "cached"
                },
                position: { x: 3520, y: 200 }
            },
            "output-research": {
                type: "output",
                name: "Research Results",
                config: {
                    outputName: "research",
                    value: '{"question": "{{query.question}}", "synthesis": "{{refinedSynthesis.text || synthesis.text}}", "sourcesUsed": {{mergedSources.totalCount}}, "qualityScore": "{{evaluation.text}}", "refinementApplied": {{!qualityPassed}}}',
                    format: "json",
                    description: "Complete research results with synthesis"
                },
                position: { x: 3900, y: 300 }
            }
        },
        edges: [
            { id: "e1", source: "input-query", target: "llm-plan" },
            { id: "e2", source: "llm-plan", target: "kb-search-1" },
            { id: "e3", source: "llm-plan", target: "kb-search-2" },
            { id: "e4", source: "llm-plan", target: "http-web-search" },
            { id: "e5", source: "http-web-search", target: "http-fetch-urls" },
            { id: "e6", source: "kb-search-1", target: "code-merge" },
            { id: "e7", source: "kb-search-2", target: "code-merge" },
            { id: "e8", source: "http-fetch-urls", target: "code-merge" },
            { id: "e9", source: "code-merge", target: "llm-synthesize" },
            { id: "e10", source: "llm-synthesize", target: "llm-evaluate" },
            { id: "e11", source: "llm-evaluate", target: "conditional-quality" },
            {
                id: "e12",
                source: "conditional-quality",
                target: "memory-store",
                sourceHandle: "true"
            },
            {
                id: "e13",
                source: "conditional-quality",
                target: "llm-refine",
                sourceHandle: "false"
            },
            { id: "e14", source: "llm-refine", target: "memory-store" },
            { id: "e15", source: "memory-store", target: "output-research" }
        ],
        entryPoint: "input-query"
    }
};

export const ADVANCED_WORKFLOW_PATTERNS: WorkflowPattern[] = [
    customerSupportTranslationPattern,
    ecommerceOrderProcessingPattern,
    documentClassificationPattern,
    contentModerationPattern,
    customerJourneyPattern,
    dataValidationPattern,
    approvalWorkflowPattern,
    researchAssistantPattern
];

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
    slackSupportBotPattern,
    githubPrReviewerPattern,
    leadEnrichmentPattern,
    emailAutoresponderPattern,
    jiraBugTriagePattern,
    contentToSocialPattern
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
