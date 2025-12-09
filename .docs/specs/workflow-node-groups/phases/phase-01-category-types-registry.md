# Phase 01: Category Types & Node Registry

## Overview

Establish the shared type system and node registry that all subsequent phases depend on. This creates the architectural foundation for the entire node reorganization.

---

## Prerequisites

None - this is the first phase.

---

## Existing Infrastructure

The codebase already has partial implementations that this phase will extend:

### Current Category System

**File**: `frontend/src/canvas/nodes/BaseNode.tsx`

```typescript
// Current categories (limited)
category: "ai" | "logic" | "interaction" | "data" | "connect" | "voice";
```

### Current Node Library

**File**: `frontend/src/canvas/panels/NodeLibrary.tsx`

```typescript
// Current flat structure - no subcategories
const nodeLibrary: NodeDefinition[] = [
    { type: "llm", label: "LLM", icon: Bot, category: "ai", description: "..." }
    // ... 20+ nodes
];
```

### Current Shared Types

**File**: `shared/src/types.ts`

```typescript
// Existing types to extend
export interface NodeMetadata {
    type: string;
    displayName: string;
    category: string; // Currently flat
    // ...
}
```

---

## Deliverables

| Item                           | Description                            |
| ------------------------------ | -------------------------------------- |
| `NodeCategory` type            | Type definitions for 7 node categories |
| `NodeSubcategory` type         | Type definitions for 17 subcategories  |
| `NodeTypeDefinition` interface | Full node type definition for registry |
| `registerNode()` function      | Add nodes to the registry              |
| `getNodesByCategory()` helper  | Retrieve nodes by category             |
| `searchNodes()` function       | Search nodes by query string           |

---

## Files to Create/Modify

### 1. `shared/src/types/node-categories.ts` (NEW)

```typescript
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
```

### 2. `frontend/src/config/node-registry.ts` (NEW)

```typescript
import type { NodeTypeDefinition, NodeCategory, NodeSubcategory } from "@flowmaestro/shared";

/**
 * Global node registry
 * Populated by registerNode() calls from node implementations
 */
const nodeRegistry: Map<string, NodeTypeDefinition> = new Map();

/**
 * Index for fast category lookups
 */
const categoryIndex: Map<NodeCategory, Set<string>> = new Map();
const subcategoryIndex: Map<NodeSubcategory, Set<string>> = new Map();

/**
 * Register a node type in the registry
 * Called during node module initialization
 *
 * @example
 * registerNode({
 *     type: "llm",
 *     label: "Ask AI",
 *     description: "Generate text with LLM models",
 *     category: "ai",
 *     subcategory: "using-ai",
 *     icon: "Bot",
 *     keywords: ["gpt", "openai", "anthropic", "chat", "generate"]
 * });
 */
export function registerNode(node: NodeTypeDefinition): void {
    // Validate required fields
    if (!node.type || !node.label || !node.category) {
        throw new Error(`Invalid node definition: ${JSON.stringify(node)}`);
    }

    // Check for duplicates
    if (nodeRegistry.has(node.type)) {
        console.warn(`Node type "${node.type}" already registered, overwriting`);
    }

    // Add to registry
    nodeRegistry.set(node.type, node);

    // Update category index
    if (!categoryIndex.has(node.category)) {
        categoryIndex.set(node.category, new Set());
    }
    categoryIndex.get(node.category)!.add(node.type);

    // Update subcategory index
    if (node.subcategory) {
        if (!subcategoryIndex.has(node.subcategory)) {
            subcategoryIndex.set(node.subcategory, new Set());
        }
        subcategoryIndex.get(node.subcategory)!.add(node.type);
    }
}

/**
 * Get all nodes in a category
 */
export function getNodesByCategory(category: NodeCategory): NodeTypeDefinition[] {
    const nodeTypes = categoryIndex.get(category);
    if (!nodeTypes) return [];

    return Array.from(nodeTypes)
        .map((type) => nodeRegistry.get(type)!)
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get all nodes in a subcategory
 */
export function getNodesBySubcategory(subcategory: NodeSubcategory): NodeTypeDefinition[] {
    const nodeTypes = subcategoryIndex.get(subcategory);
    if (!nodeTypes) return [];

    return Array.from(nodeTypes)
        .map((type) => nodeRegistry.get(type)!)
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Search nodes by query string
 * Searches label, description, and keywords
 */
export function searchNodes(query: string): NodeTypeDefinition[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: NodeTypeDefinition[] = [];

    for (const node of nodeRegistry.values()) {
        const matchLabel = node.label.toLowerCase().includes(lowerQuery);
        const matchDesc = node.description.toLowerCase().includes(lowerQuery);
        const matchKeywords = node.keywords.some((k) => k.toLowerCase().includes(lowerQuery));

        if (matchLabel || matchDesc || matchKeywords) {
            results.push(node);
        }
    }

    // Sort: exact label matches first, then by label
    return results.sort((a, b) => {
        const aExact = a.label.toLowerCase() === lowerQuery;
        const bExact = b.label.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.label.localeCompare(b.label);
    });
}

/**
 * Get node definition by type
 */
export function getNodeDefinition(type: string): NodeTypeDefinition | undefined {
    return nodeRegistry.get(type);
}

/**
 * Get all registered node types
 */
export function getAllNodes(): NodeTypeDefinition[] {
    return Array.from(nodeRegistry.values());
}

/**
 * Get frequently used nodes (placeholder - implement with usage tracking)
 */
export function getFrequentlyUsedNodes(): NodeTypeDefinition[] {
    // Default frequently used nodes
    const frequentTypes = ["llm", "transform", "conditional", "http", "variable"];
    return frequentTypes
        .map((type) => nodeRegistry.get(type))
        .filter((node): node is NodeTypeDefinition => node !== undefined);
}
```

### 3. Update `shared/src/index.ts`

Add exports for new types:

```typescript
// Add to existing exports
export * from "./types/node-categories";
```

---

## Migration: Existing Nodes

After this phase, existing nodes in `NodeLibrary.tsx` should be migrated to use `registerNode()`. Example migration:

```typescript
// Before (in NodeLibrary.tsx)
const nodeLibrary = [{ type: "llm", label: "LLM", icon: Bot, category: "ai", description: "..." }];

// After (in each node file or a registration file)
registerNode({
    type: "llm",
    label: "Ask AI",
    description: "Generate text with LLM models (OpenAI, Anthropic, Google)",
    category: "ai",
    subcategory: "using-ai",
    icon: "Bot",
    keywords: ["gpt", "openai", "anthropic", "claude", "chat", "generate", "llm"]
});
```

---

## How to Deliver

1. Create `shared/src/types/node-categories.ts` with all type definitions
2. Update `shared/src/index.ts` to export new types
3. Run `cd shared && npm run build` to compile shared package
4. Create `frontend/src/config/node-registry.ts` with registry functions
5. Run `npx tsc --noEmit` to verify no type errors
6. Create a test file that imports and uses all exported functions

---

## How to Test

| Test                              | Expected Result                               |
| --------------------------------- | --------------------------------------------- |
| Import `NodeCategory` in frontend | Type available without errors                 |
| Call `registerNode({...})`        | Node added to registry                        |
| Call `getNodesByCategory("ai")`   | Returns empty array (no nodes registered yet) |
| Call `searchNodes("email")`       | Returns empty array (no nodes registered yet) |
| Run TypeScript compiler           | No errors                                     |

### Verification Commands

```bash
# Build shared package
cd shared && npm run build

# Check types compile
npx tsc --noEmit

# Run frontend build
cd frontend && npm run build
```

---

## Acceptance Criteria

- [ ] `NodeCategory` type is importable from `@flowmaestro/shared`
- [ ] `NodeSubcategory` type covers all 17 subcategories
- [ ] `NodeTypeDefinition` interface includes all required fields
- [ ] `registerNode()` adds nodes to registry without errors
- [ ] `getNodesByCategory()` returns nodes grouped by category
- [ ] `getNodesBySubcategory()` returns nodes grouped by subcategory
- [ ] `searchNodes()` searches across label, description, and keywords
- [ ] TypeScript compiles without errors in both shared and frontend packages
- [ ] No runtime errors when importing types

---

## Dependencies

This phase enables:

- **Phase 02+**: Node implementations use `registerNode()` to add themselves
