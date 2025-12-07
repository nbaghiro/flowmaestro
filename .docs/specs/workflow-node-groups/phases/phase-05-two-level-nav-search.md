# Phase 05: Two-Level Navigation & Search

## Overview

Add subcategory expansion, search with highlighting, and drag-and-drop to canvas within the Node Library panel.

---

## Prerequisites

- **Phase 01**: Node registry with `searchNodes()` function
- **Phase 04**: Collapsible Node Library panel

---

## Existing Infrastructure

### Node Registry from Phase 01

**File**: `frontend/src/config/node-registry.ts`

```typescript
// These functions are available from Phase 01
import {
    getNodesByCategory,
    getNodesBySubcategory,
    searchNodes,
    getAllSubcategories
} from "./node-registry";

// Search returns matched nodes
const results = searchNodes("email");
// Returns: [{ type: "gmailTrigger", label: "On New Email", ... }, ...]

// Get nodes grouped by subcategory
const aiNodes = getNodesByCategory("ai");
// Returns: { "using-ai": [...], "vision-media": [...], ... }
```

### React Flow Drop Handler Pattern

**File**: `frontend/src/canvas/WorkflowCanvas.tsx`

```typescript
// React Flow supports drag-and-drop natively
import { ReactFlowProvider, useReactFlow } from "reactflow";

function WorkflowCanvas() {
    const { screenToFlowPosition, addNodes } = useReactFlow();

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();

        const type = event.dataTransfer.getData("application/reactflow");
        if (!type) return;

        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
        });

        const newNode = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: { label: type }
        };

        addNodes(newNode);
    }, [screenToFlowPosition, addNodes]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    return (
        <ReactFlow
            onDrop={onDrop}
            onDragOver={onDragOver}
            // ... other props
        />
    );
}
```

### Subcategory Configuration from Phase 01

**File**: `frontend/src/config/category-styles.ts`

```typescript
// Subcategory configuration per category
const subcategoryConfig: Record<NodeCategory, SubcategoryConfig[]> = {
    ai: [
        { id: "using-ai", label: "Using AI", icon: "Bot" },
        { id: "vision-media", label: "Vision & Media", icon: "Image" },
        { id: "agents", label: "Agents", icon: "Users" },
        { id: "advanced", label: "Advanced", icon: "Sparkles" }
    ]
    // ... other categories
};
```

---

## Deliverables

| Item                  | Description                         |
| --------------------- | ----------------------------------- |
| Subcategory expansion | Click category → show subcategories |
| Node list             | Click subcategory → show nodes      |
| Search input          | Filter nodes across all categories  |
| Search highlighting   | Highlight matching text             |
| Drag-and-drop         | Drag node from library to canvas    |
| Frequently used       | Section showing commonly used nodes |

---

## Visual Design

### Expanded Category

```
┌────────────────────────────────┐
│ 🔍 Search nodes...             │
│────────────────────────────────│
│ 🤖 AI & Agents              ▼  │ ← Expanded
│    ├─ Using AI                 │
│    │   • Ask AI                │
│    │   • Extract Data          │
│    │   • Summarizer            │
│    │   • Translator            │
│    ├─ Vision & Media           │
│    ├─ Agents                   │
│    └─ Advanced                 │
│ 📚 Knowledge                ▶  │
│ ⚡ Automations               ▶  │
└────────────────────────────────┘
```

### Search Results

```
┌────────────────────────────────┐
│ 🔍 email                    ✕  │
│────────────────────────────────│
│ Results for "email"            │
│                                │
│ 📧 On New [Email]              │
│    Trigger when email arrives  │
│                                │
│ 📧 Gmail Reader                │
│    Fetch [email]s by query     │
│                                │
│ 📧 Gmail                       │
│    Send and manage [email]s    │
└────────────────────────────────┘
```

---

## Files to Create

### 1. `frontend/src/canvas/panels/CategoryList.tsx`

```typescript
import { memo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { categoryStyles } from "../../config/category-styles";
import type { NodeCategory } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

interface CategoryListProps {
    expandedCategory: NodeCategory | null;
    onCategoryClick: (category: NodeCategory) => void;
}

export const CategoryList = memo(function CategoryList({
    expandedCategory,
    onCategoryClick
}: CategoryListProps) {
    const categories = Object.entries(categoryStyles) as [NodeCategory, typeof categoryStyles[keyof typeof categoryStyles]][];

    return (
        <div className="space-y-1">
            {categories.map(([category, style]) => {
                const isExpanded = expandedCategory === category;

                return (
                    <button
                        key={category}
                        onClick={() => onCategoryClick(category)}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg",
                            "hover:bg-muted/50 transition-colors text-left",
                            isExpanded && "bg-muted"
                        )}
                    >
                        <span className="text-lg">{style.icon}</span>
                        <span className="flex-1 text-sm font-medium">{style.label}</span>
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                );
            })}
        </div>
    );
});
```

### 2. `frontend/src/canvas/panels/SubcategoryList.tsx`

```typescript
import { memo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { getSubcategoriesForCategory } from "../../config/category-styles";
import type { NodeCategory, NodeSubcategory } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

interface SubcategoryListProps {
    category: NodeCategory;
    expandedSubcategory: NodeSubcategory | null;
    onSubcategoryClick: (subcategory: NodeSubcategory) => void;
}

export const SubcategoryList = memo(function SubcategoryList({
    category,
    expandedSubcategory,
    onSubcategoryClick
}: SubcategoryListProps) {
    const subcategories = getSubcategoriesForCategory(category);

    return (
        <div className="ml-6 space-y-0.5 border-l border-border/50 pl-2">
            {subcategories.map((sub) => {
                const isExpanded = expandedSubcategory === sub.id;

                return (
                    <button
                        key={sub.id}
                        onClick={() => onSubcategoryClick(sub.id)}
                        className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded",
                            "hover:bg-muted/50 transition-colors text-left text-sm",
                            isExpanded && "bg-muted/50"
                        )}
                    >
                        <span className="flex-1 text-muted-foreground">{sub.label}</span>
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        )}
                    </button>
                );
            })}
        </div>
    );
});
```

### 3. `frontend/src/canvas/panels/NodeList.tsx`

```typescript
import { memo } from "react";
import { DraggableNode } from "./DraggableNode";
import type { NodeTypeDefinition } from "../../config/node-registry";

interface NodeListProps {
    nodes: NodeTypeDefinition[];
    searchHighlight?: string;
}

export const NodeList = memo(function NodeList({
    nodes,
    searchHighlight
}: NodeListProps) {
    if (nodes.length === 0) {
        return (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No nodes found
            </div>
        );
    }

    return (
        <div className="ml-8 space-y-1 py-1">
            {nodes.map((node) => (
                <DraggableNode
                    key={node.type}
                    node={node}
                    searchHighlight={searchHighlight}
                />
            ))}
        </div>
    );
});
```

### 4. `frontend/src/canvas/panels/NodeSearch.tsx`

```typescript
import { memo, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { searchNodes } from "../../config/node-registry";
import { DraggableNode } from "./DraggableNode";
import { cn } from "../../lib/utils";

interface NodeSearchProps {
    onClose?: () => void;
}

export const NodeSearch = memo(function NodeSearch({ onClose }: NodeSearchProps) {
    const [query, setQuery] = useState("");
    const results = query.length >= 2 ? searchNodes(query) : [];

    // Highlight matching text in label/description
    const highlightText = useCallback((text: string, search: string): React.ReactNode => {
        if (!search || search.length < 2) return text;

        const regex = new RegExp(`(${search})`, "gi");
        const parts = text.split(regex);

        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    }, []);

    return (
        <div className="p-3 border-b">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search nodes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={cn(
                        "w-full pl-9 pr-8 py-2 text-sm rounded-lg",
                        "border border-input bg-background",
                        "focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    autoFocus
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Search Results */}
            {query.length >= 2 && (
                <div className="mt-3 max-h-[400px] overflow-y-auto">
                    {results.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No nodes match "{query}"
                        </p>
                    ) : (
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground px-1">
                                {results.length} result{results.length !== 1 ? "s" : ""}
                            </p>
                            {results.map((node) => (
                                <DraggableNode
                                    key={node.type}
                                    node={node}
                                    searchHighlight={query}
                                    highlightText={highlightText}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
```

### 5. `frontend/src/canvas/panels/DraggableNode.tsx`

```typescript
import { memo, useCallback } from "react";
import { getCategoryStyle } from "../../config/category-styles";
import type { NodeTypeDefinition } from "../../config/node-registry";
import { cn } from "../../lib/utils";

interface DraggableNodeProps {
    node: NodeTypeDefinition;
    searchHighlight?: string;
    highlightText?: (text: string, query: string) => React.ReactNode;
}

export const DraggableNode = memo(function DraggableNode({
    node,
    searchHighlight,
    highlightText
}: DraggableNodeProps) {
    const style = getCategoryStyle(node.category);

    const onDragStart = useCallback((event: React.DragEvent) => {
        // Set the node type for React Flow drop handler
        event.dataTransfer.setData("application/reactflow", node.type);
        event.dataTransfer.effectAllowed = "move";

        // Create drag preview
        const preview = document.createElement("div");
        preview.className = "bg-card border rounded-lg shadow-lg px-3 py-2 text-sm";
        preview.textContent = node.label;
        document.body.appendChild(preview);
        event.dataTransfer.setDragImage(preview, 0, 0);

        // Clean up preview after drag starts
        setTimeout(() => preview.remove(), 0);
    }, [node.type, node.label]);

    const displayLabel = searchHighlight && highlightText
        ? highlightText(node.label, searchHighlight)
        : node.label;

    const displayDescription = searchHighlight && highlightText && node.description
        ? highlightText(node.description, searchHighlight)
        : node.description;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={cn(
                "flex items-start gap-2 px-2 py-1.5 rounded cursor-grab",
                "hover:bg-muted/50 transition-colors",
                "active:cursor-grabbing"
            )}
        >
            {/* Node Icon */}
            <span className="text-base mt-0.5">{node.icon}</span>

            {/* Node Info */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{displayLabel}</div>
                {node.description && (
                    <div className="text-xs text-muted-foreground truncate">
                        {displayDescription}
                    </div>
                )}
            </div>

            {/* Category indicator dot */}
            <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: style.accent }}
            />
        </div>
    );
});
```

---

## Files to Modify

### `frontend/src/stores/nodeLibraryStore.ts`

Extend the store from Phase 04:

```typescript
import { create } from "zustand";
import type { NodeCategory, NodeSubcategory } from "@flowmaestro/shared";

interface NodeLibraryState {
    // Panel state (from Phase 04)
    isExpanded: boolean;
    isLocked: boolean;
    hoverTimeout: NodeJS.Timeout | null;

    // Navigation state
    selectedCategory: NodeCategory | null;
    expandedSubcategory: NodeSubcategory | null;

    // Search state
    searchQuery: string;
    isSearching: boolean;

    // Panel actions (from Phase 04)
    expand: () => void;
    collapse: () => void;
    toggleLock: () => void;
    startHoverExpand: () => void;
    cancelHoverExpand: () => void;

    // Navigation actions
    selectCategory: (category: NodeCategory | null) => void;
    selectSubcategory: (sub: NodeSubcategory | null) => void;

    // Search actions
    setSearchQuery: (query: string) => void;
    clearSearch: () => void;
}

export const useNodeLibraryStore = create<NodeLibraryState>((set, get) => ({
    // Initial state
    isExpanded: false,
    isLocked: false,
    hoverTimeout: null,
    selectedCategory: null,
    expandedSubcategory: null,
    searchQuery: "",
    isSearching: false,

    // ... Phase 04 actions ...

    selectCategory: (category) =>
        set((state) => ({
            selectedCategory: category === state.selectedCategory ? null : category,
            expandedSubcategory: null, // Reset subcategory when changing category
            isExpanded: true,
            isLocked: true
        })),

    selectSubcategory: (sub) =>
        set((state) => ({
            expandedSubcategory: sub === state.expandedSubcategory ? null : sub
        })),

    setSearchQuery: (query) =>
        set({
            searchQuery: query,
            isSearching: query.length >= 2,
            // Clear navigation when searching
            selectedCategory: query.length >= 2 ? null : get().selectedCategory,
            expandedSubcategory: query.length >= 2 ? null : get().expandedSubcategory
        }),

    clearSearch: () =>
        set({
            searchQuery: "",
            isSearching: false
        })
}));
```

### `frontend/src/canvas/WorkflowCanvas.tsx`

Add drop handler for new nodes from library:

```typescript
import { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { useWorkflowStore } from "../../stores/workflowStore";
import { getNodeDefinition } from "../../config/node-registry";

export function WorkflowCanvas() {
    const { screenToFlowPosition } = useReactFlow();
    const { addNode } = useWorkflowStore();

    // Handle drop from node library
    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();

        const nodeType = event.dataTransfer.getData("application/reactflow");
        if (!nodeType) return;

        // Get node definition from registry
        const definition = getNodeDefinition(nodeType);
        if (!definition) {
            console.error(`Unknown node type: ${nodeType}`);
            return;
        }

        // Convert screen coordinates to flow coordinates
        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
        });

        // Create new node with default data
        const newNode = {
            id: `${nodeType}-${Date.now()}`,
            type: nodeType,
            position,
            data: {
                label: definition.label,
                ...definition.defaultConfig
            }
        };

        addNode(newNode);
    }, [screenToFlowPosition, addNode]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    return (
        <ReactFlow
            onDrop={onDrop}
            onDragOver={onDragOver}
            // ... other props
        />
    );
}
```

---

## How to Deliver

1. Create `CategoryList.tsx` with expand/collapse
2. Create `SubcategoryList.tsx` with nested navigation
3. Create `NodeList.tsx` with node cards
4. Create `NodeSearch.tsx` with highlight logic
5. Create `DraggableNode.tsx` with drag-and-drop
6. Update `nodeLibraryStore.ts` with search state
7. Update `WorkflowCanvas.tsx` with drop handler
8. Integrate all components in `NodeLibraryPanel.tsx`
9. Add keyboard navigation (up/down arrows)

---

## How to Test

| Test                | Expected Result                    |
| ------------------- | ---------------------------------- |
| Click category      | Subcategories appear               |
| Click subcategory   | Node list appears                  |
| Type "email"        | Filtered results with highlighting |
| Clear search        | Return to category view            |
| Drag node to canvas | Node appears at drop location      |
| Press arrow keys    | Navigate through list              |
| Press Enter on node | Add node to canvas center          |

### Search Test Cases

| Query       | Expected Results                  |
| ----------- | --------------------------------- |
| "email"     | On New Email, Gmail Reader, Gmail |
| "AI"        | Ask AI, and other AI nodes        |
| "transform" | Transform node                    |
| "xyz"       | "No results" message              |

---

## Acceptance Criteria

- [ ] Categories show icons and labels
- [ ] Click category expands to show subcategories
- [ ] Click subcategory shows node list
- [ ] Chevron rotates on expand/collapse
- [ ] Search filters across all categories
- [ ] Search highlights matching text in results
- [ ] Drag from library works
- [ ] Drop on canvas creates node at location
- [ ] Drag preview shows node appearance
- [ ] Panel remembers last category selection
- [ ] Empty state shows "No results" message
- [ ] Keyboard navigation works (arrows, enter)
- [ ] Frequently used section shows top nodes

---

## Dependencies

This phase completes the UI foundation. All subsequent phases add nodes to the library.

Enables:

- **Phase 06+**: All node phases populate the library via `registerNode()`
