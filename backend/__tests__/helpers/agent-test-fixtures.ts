/**
 * Agent Test Fixtures
 *
 * Reusable configurations for agent, tool, and scenario testing.
 * Provides standard fixtures that align with sandbox data infrastructure.
 */

import type { SafetyConfig } from "../../src/core/safety/types";
import type { Tool, MemoryConfig } from "../../src/storage/models/Agent";
import type { AgentConfig } from "../../src/temporal/workflows/agent-orchestrator";

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
    enablePiiDetection: false,
    enablePromptInjectionDetection: false,
    enableContentModeration: false,
    piiRedactionEnabled: false,
    promptInjectionAction: "allow"
};

export const STRICT_SAFETY_CONFIG: SafetyConfig = {
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    enableContentModeration: true,
    piiRedactionEnabled: true,
    piiRedactionPlaceholder: "[REDACTED]",
    promptInjectionAction: "block",
    contentModerationThreshold: 0.7
};

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
    type: "buffer",
    max_messages: 100
};

export const VECTOR_MEMORY_CONFIG: MemoryConfig = {
    type: "vector",
    max_messages: 1000
};

// ============================================================================
// MCP TOOL FIXTURES (defined first since agent fixtures depend on them)
// ============================================================================

export const mcpToolFixtures = {
    slack: {
        sendMessage: {
            id: "tool-slack-send",
            name: "slack_send_message",
            description: "Send a message to a Slack channel",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    channel: {
                        type: "string",
                        description: "Channel ID or name (e.g., #general)"
                    },
                    text: {
                        type: "string",
                        description: "Message text to send"
                    }
                },
                required: ["channel", "text"]
            },
            config: {
                provider: "slack",
                operation: "sendMessage"
            }
        } as Tool,

        listChannels: {
            id: "tool-slack-channels",
            name: "slack_list_channels",
            description: "List available Slack channels",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    types: {
                        type: "string",
                        description: "Channel types to include (public_channel, private_channel)",
                        default: "public_channel"
                    },
                    limit: {
                        type: "number",
                        description: "Maximum number of channels to return",
                        default: 100
                    }
                },
                required: []
            },
            config: {
                provider: "slack",
                operation: "listChannels"
            }
        } as Tool
    },

    github: {
        createIssue: {
            id: "tool-github-issue",
            name: "github_create_issue",
            description: "Create a new GitHub issue",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    owner: {
                        type: "string",
                        description: "Repository owner"
                    },
                    repo: {
                        type: "string",
                        description: "Repository name"
                    },
                    title: {
                        type: "string",
                        description: "Issue title"
                    },
                    body: {
                        type: "string",
                        description: "Issue body/description"
                    }
                },
                required: ["owner", "repo", "title"]
            },
            config: {
                provider: "github",
                operation: "createIssue"
            }
        } as Tool,

        listPullRequests: {
            id: "tool-github-prs",
            name: "github_list_pull_requests",
            description: "List pull requests in a repository",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    owner: {
                        type: "string",
                        description: "Repository owner"
                    },
                    repo: {
                        type: "string",
                        description: "Repository name"
                    },
                    state: {
                        type: "string",
                        enum: ["open", "closed", "all"],
                        default: "open"
                    }
                },
                required: ["owner", "repo"]
            },
            config: {
                provider: "github",
                operation: "listPullRequests"
            }
        } as Tool
    },

    hubspot: {
        createContact: {
            id: "tool-hubspot-contact",
            name: "hubspot_create_contact",
            description: "Create a new contact in HubSpot",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    email: {
                        type: "string",
                        description: "Contact email address"
                    },
                    firstname: {
                        type: "string",
                        description: "Contact first name"
                    },
                    lastname: {
                        type: "string",
                        description: "Contact last name"
                    },
                    company: {
                        type: "string",
                        description: "Company name"
                    }
                },
                required: ["email"]
            },
            config: {
                provider: "hubspot",
                operation: "createContact"
            }
        } as Tool,

        searchContacts: {
            id: "tool-hubspot-search",
            name: "hubspot_search_contacts",
            description: "Search contacts in HubSpot",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Search query"
                    },
                    limit: {
                        type: "number",
                        description: "Maximum results to return",
                        default: 10
                    }
                },
                required: ["query"]
            },
            config: {
                provider: "hubspot",
                operation: "searchContacts"
            }
        } as Tool
    },

    airtable: {
        listRecords: {
            id: "tool-airtable-list",
            name: "airtable_list_records",
            description: "List records from an Airtable table",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    baseId: {
                        type: "string",
                        description: "Airtable base ID"
                    },
                    tableId: {
                        type: "string",
                        description: "Table ID or name"
                    },
                    maxRecords: {
                        type: "number",
                        description: "Maximum records to return",
                        default: 100
                    }
                },
                required: ["baseId", "tableId"]
            },
            config: {
                provider: "airtable",
                operation: "listRecords"
            }
        } as Tool,

        createRecord: {
            id: "tool-airtable-create",
            name: "airtable_create_record",
            description: "Create a new record in Airtable",
            type: "mcp" as const,
            schema: {
                type: "object",
                properties: {
                    baseId: {
                        type: "string",
                        description: "Airtable base ID"
                    },
                    tableId: {
                        type: "string",
                        description: "Table ID or name"
                    },
                    fields: {
                        type: "object",
                        description: "Record fields"
                    }
                },
                required: ["baseId", "tableId", "fields"]
            },
            config: {
                provider: "airtable",
                operation: "createRecord"
            }
        } as Tool
    }
};

// ============================================================================
// BUILTIN TOOL FIXTURES
// ============================================================================

export const builtinToolFixtures = {
    webSearch: {
        id: "tool-web-search",
        name: "web_search",
        description: "Search the web for information",
        type: "builtin" as const,
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query"
                },
                numResults: {
                    type: "number",
                    description: "Number of results to return",
                    default: 5
                }
            },
            required: ["query"]
        },
        config: {}
    } as Tool,

    pdfExtract: {
        id: "tool-pdf-extract",
        name: "pdf_extract",
        description: "Extract text content from a PDF file",
        type: "builtin" as const,
        schema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL of the PDF file"
                },
                pages: {
                    type: "string",
                    description: "Page range to extract (e.g., '1-5' or 'all')",
                    default: "all"
                }
            },
            required: ["url"]
        },
        config: {}
    } as Tool,

    chartGenerate: {
        id: "tool-chart-gen",
        name: "chart_generate",
        description: "Generate a chart from data",
        type: "builtin" as const,
        schema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["bar", "line", "pie", "scatter"],
                    description: "Chart type"
                },
                data: {
                    type: "array",
                    description: "Chart data points"
                },
                title: {
                    type: "string",
                    description: "Chart title"
                }
            },
            required: ["type", "data"]
        },
        config: {}
    } as Tool,

    fileRead: {
        id: "tool-file-read",
        name: "file_read",
        description: "Read a file from storage",
        type: "builtin" as const,
        schema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path"
                }
            },
            required: ["path"]
        },
        config: {}
    } as Tool,

    fileWrite: {
        id: "tool-file-write",
        name: "file_write",
        description: "Write content to a file",
        type: "builtin" as const,
        schema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path"
                },
                content: {
                    type: "string",
                    description: "File content"
                }
            },
            required: ["path", "content"]
        },
        config: {}
    } as Tool
};

// ============================================================================
// KNOWLEDGE BASE TOOL FIXTURES
// ============================================================================

export const knowledgeBaseToolFixtures = {
    searchKB: {
        id: "tool-kb-search",
        name: "search_knowledge_base",
        description: "Search the company knowledge base for relevant information",
        type: "knowledge_base" as const,
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query"
                },
                topK: {
                    type: "number",
                    description: "Number of results to return",
                    default: 5
                },
                minScore: {
                    type: "number",
                    description: "Minimum similarity score (0-1)",
                    default: 0.7
                }
            },
            required: ["query"]
        },
        config: {
            knowledgeBaseId: "kb-test-default"
        }
    } as Tool
};

// ============================================================================
// AGENT TOOL FIXTURES (for agent-to-agent)
// ============================================================================

export const agentToolFixtures = {
    callResearchAgent: {
        id: "tool-call-research",
        name: "call_research_agent",
        description: "Delegate a research task to the research agent",
        type: "agent" as const,
        schema: {
            type: "object",
            properties: {
                task: {
                    type: "string",
                    description: "Research task to perform"
                },
                context: {
                    type: "string",
                    description: "Additional context for the task"
                }
            },
            required: ["task"]
        },
        config: {
            agentId: "agent-research"
        }
    } as Tool,

    callSlackAgent: {
        id: "tool-call-slack",
        name: "call_slack_agent",
        description: "Delegate a Slack task to the Slack agent",
        type: "agent" as const,
        schema: {
            type: "object",
            properties: {
                task: {
                    type: "string",
                    description: "Slack task to perform"
                }
            },
            required: ["task"]
        },
        config: {
            agentId: "agent-slack"
        }
    } as Tool
};

// ============================================================================
// AGENT FIXTURES (defined after tool fixtures since they depend on them)
// ============================================================================

/**
 * Simple chat agent with no tools
 */
export const simpleChatAgent: AgentConfig = {
    id: "agent-simple-chat",
    name: "Simple Chat Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: "You are a helpful assistant. Answer questions clearly and concisely.",
    temperature: 0.7,
    max_tokens: 1000,
    max_iterations: 5,
    available_tools: [],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

/**
 * Slack-enabled agent with MCP tools
 */
export const slackAgent: AgentConfig = {
    id: "agent-slack",
    name: "Slack Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: `You are a Slack assistant. You can send messages, list channels, and manage conversations.
Use the available tools to help users interact with Slack.`,
    temperature: 0.5,
    max_tokens: 1000,
    max_iterations: 10,
    available_tools: [mcpToolFixtures.slack.sendMessage, mcpToolFixtures.slack.listChannels],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

/**
 * GitHub-enabled agent with MCP tools
 */
export const githubAgent: AgentConfig = {
    id: "agent-github",
    name: "GitHub Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: `You are a GitHub assistant. You can create issues, list pull requests, and manage repositories.
Use the available tools to help users interact with GitHub.`,
    temperature: 0.5,
    max_tokens: 1000,
    max_iterations: 10,
    available_tools: [mcpToolFixtures.github.createIssue, mcpToolFixtures.github.listPullRequests],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

/**
 * HubSpot CRM agent with MCP tools
 */
export const hubspotAgent: AgentConfig = {
    id: "agent-hubspot",
    name: "HubSpot Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: `You are a CRM assistant. You can create contacts, search for companies, and manage HubSpot data.
Use the available tools to help users interact with HubSpot CRM.`,
    temperature: 0.5,
    max_tokens: 1000,
    max_iterations: 10,
    available_tools: [
        mcpToolFixtures.hubspot.createContact,
        mcpToolFixtures.hubspot.searchContacts
    ],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

/**
 * Research agent with built-in tools
 */
export const researchAgent: AgentConfig = {
    id: "agent-research",
    name: "Research Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: `You are a research assistant. You can search the web, extract information from PDFs, and generate charts.
Use the available tools to help users with research tasks.`,
    temperature: 0.7,
    max_tokens: 2000,
    max_iterations: 15,
    available_tools: [builtinToolFixtures.webSearch, builtinToolFixtures.pdfExtract],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

/**
 * Knowledge base agent
 */
export const knowledgeBaseAgent: AgentConfig = {
    id: "agent-kb",
    name: "Knowledge Base Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: `You are a knowledge assistant. You can search the company knowledge base to answer questions.
Always cite your sources when providing information from the knowledge base.`,
    temperature: 0.3,
    max_tokens: 1500,
    max_iterations: 10,
    available_tools: [knowledgeBaseToolFixtures.searchKB],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

/**
 * Agent with strict safety settings
 */
export const safetyEnabledAgent: AgentConfig = {
    id: "agent-safe",
    name: "Safety-Enabled Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: "You are a helpful assistant that handles sensitive information carefully.",
    temperature: 0.5,
    max_tokens: 1000,
    max_iterations: 5,
    available_tools: [],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: STRICT_SAFETY_CONFIG
};

/**
 * Multi-tool agent with various capabilities
 */
export const multiToolAgent: AgentConfig = {
    id: "agent-multi",
    name: "Multi-Tool Agent",
    model: "gpt-4",
    provider: "openai",
    connection_id: null,
    system_prompt: `You are a versatile assistant with access to multiple tools.
Use the appropriate tool based on the user's request.`,
    temperature: 0.7,
    max_tokens: 1500,
    max_iterations: 20,
    available_tools: [
        mcpToolFixtures.slack.sendMessage,
        mcpToolFixtures.github.createIssue,
        builtinToolFixtures.webSearch
    ],
    memory_config: DEFAULT_MEMORY_CONFIG,
    safety_config: DEFAULT_SAFETY_CONFIG
};

// ============================================================================
// COLLECTION EXPORTS
// ============================================================================

/**
 * All agent fixtures keyed by type
 */
export const agentFixtures = {
    simpleChatAgent,
    slackAgent,
    githubAgent,
    hubspotAgent,
    researchAgent,
    knowledgeBaseAgent,
    safetyEnabledAgent,
    multiToolAgent
};

/**
 * All tool fixtures organized by type
 */
export const toolFixtures = {
    mcp: mcpToolFixtures,
    builtin: builtinToolFixtures,
    knowledgeBase: knowledgeBaseToolFixtures,
    agent: agentToolFixtures
};

// ============================================================================
// SCENARIO FIXTURES
// ============================================================================

/**
 * Pre-configured test scenarios
 */
export const testScenarios = {
    /**
     * Simple chat without tools
     */
    simpleChat: {
        agent: simpleChatAgent,
        initialMessage: "Hello, how are you?",
        expectedBehavior: "Agent responds with greeting, no tools used"
    },

    /**
     * Slack message sending
     */
    slackMessage: {
        agent: slackAgent,
        initialMessage: "Send a message to #general saying 'Hello team!'",
        expectedBehavior: "Agent calls slack_send_message tool"
    },

    /**
     * GitHub issue creation
     */
    githubIssue: {
        agent: githubAgent,
        initialMessage: "Create a bug report for the login issue in acme/webapp",
        expectedBehavior: "Agent calls github_create_issue tool"
    },

    /**
     * HubSpot contact creation
     */
    hubspotContact: {
        agent: hubspotAgent,
        initialMessage: "Add a new contact: John Doe, john@example.com from Acme Corp",
        expectedBehavior: "Agent calls hubspot_create_contact tool"
    },

    /**
     * Multi-step research task
     */
    research: {
        agent: researchAgent,
        initialMessage: "Research the latest trends in AI and summarize the key points",
        expectedBehavior: "Agent uses web_search, possibly multiple iterations"
    },

    /**
     * Knowledge base query
     */
    knowledgeQuery: {
        agent: knowledgeBaseAgent,
        initialMessage: "What is our company's vacation policy?",
        expectedBehavior: "Agent searches knowledge base and summarizes results"
    },

    /**
     * Safety-sensitive input
     */
    piiHandling: {
        agent: safetyEnabledAgent,
        initialMessage: "My social security number is 123-45-6789",
        expectedBehavior: "Agent detects and redacts PII"
    },

    /**
     * Multi-tool workflow
     */
    multiTool: {
        agent: multiToolAgent,
        initialMessage:
            "Search for information about AI and then post a summary to #research in Slack",
        expectedBehavior: "Agent uses web_search then slack_send_message"
    }
};
