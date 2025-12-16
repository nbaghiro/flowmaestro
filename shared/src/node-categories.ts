/**
 * Top-level node categories - 7 total
 */
export type NodeCategory =
    | "ai" // LLM, vision, embeddings, agents
    | "knowledge" // Knowledge base operations
    | "automation" // Triggers, readers, scheduled tasks
    | "tools" // Flow control, data processing, utilities
    | "integration" // Third-party service integrations
    | "custom" // User-defined custom nodes
    | "subflow"; // Embedded workflows

/**
 * Subcategories for navigation grouping
 * Used in NodeLibrary panel
 */
export type NodeSubcategory =
    // AI subcategories (4)
    | "using-ai" // Ask AI, Summarizer, Translator, Extract Data
    | "vision-media" // Image analysis, video processing
    | "agents" // Agent runner, tool calling
    | "advanced-ai" // Fine-tuning, embeddings, RAG
    // Tools subcategories (4)
    | "flow-control" // Conditional, Switch, Loop, Router
    | "data-processing" // Transform, Variable, Merge, Filter
    | "file-processing" // Parse CSV, JSON, PDF, etc.
    | "enterprise" // Governance, security, compliance
    // Automation subcategories (2)
    | "triggers" // Webhook, Schedule, Event, Manual
    | "readers" // Gmail Reader, Sheets Reader, etc.
    // Integration subcategories (7)
    | "communication" // Slack, Email, SMS
    | "productivity" // Notion, Airtable, Google Workspace
    | "crm-sales" // HubSpot, Salesforce
    | "support" // Zendesk, Intercom
    | "project-management" // Jira, Linear, Asana
    | "developer" // GitHub, GitLab
    | "database"; // PostgreSQL, MongoDB

/**
 * Full node type definition for registry
 * Extends current NodeDefinition pattern from NodeLibrary.tsx
 */
export interface NodeTypeDefinition {
    type: string; // Unique identifier (e.g., "llm", "http")
    label: string; // Display name (e.g., "Ask AI", "HTTP Request")
    description: string; // Tooltip/search description
    category: NodeCategory; // Top-level category
    subcategory?: NodeSubcategory; // Optional subcategory for grouping
    icon: string; // Lucide icon name (e.g., "Bot", "Globe")
    keywords: string[]; // Search keywords (e.g., ["gpt", "openai", "chat"])
    isEnterprise?: boolean; // Requires enterprise plan
    isBeta?: boolean; // Beta feature flag
    defaultConfig?: Record<string, unknown>; // Default node config
}

/**
 * Category configuration for NodeLibrary display
 */
export interface CategoryConfig {
    id: NodeCategory;
    label: string; // Display label (e.g., "AI & Agents")
    icon: string; // Lucide icon name
    subcategories: SubcategoryConfig[];
}

export interface SubcategoryConfig {
    id: NodeSubcategory;
    label: string; // Display label
    nodeTypes: string[]; // Node type IDs in this subcategory
}
