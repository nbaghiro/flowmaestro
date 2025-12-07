# Phase 04: Collapsible Node Library Panel

## Overview

Create a collapsible left panel for the node library that expands on hover or click. In collapsed state, only category icons are visible.

---

## Prerequisites

- **Phase 01**: Category configuration (icons, labels)
- **Phase 03**: Node Sidebar (panel interaction patterns)

---

## Existing Infrastructure

### Current Canvas Layout

**File**: `frontend/src/pages/FlowBuilder.tsx`

```typescript
// Current layout structure
export function FlowBuilder() {
    return (
        <div className="flex h-screen">
            <Sidebar />  {/* App navigation - not this panel */}
            <main className="flex-1">
                <WorkflowCanvas />
            </main>
        </div>
    );
}
```

### Category Configuration from Phase 01

**File**: `frontend/src/config/category-styles.ts`

```typescript
// Use these for the panel icons and styling
import { categoryStyles, getCategoryStyle } from "./category-styles";

// categoryStyles provides icons, colors, and labels for each category
```

### Zustand Store Pattern

**File**: `frontend/src/stores/workflowStore.ts`

```typescript
// Follow this pattern for the nodeLibraryStore
export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
    // State
    selectedNode: null,

    // Actions
    selectNode: (nodeId) => set({ selectedNode: nodeId })
}));
```

### Existing Panel Patterns

The codebase uses consistent panel patterns - look at existing panels for reference:

- `frontend/src/components/common/Panel.tsx` - if it exists
- The NodeInspector pattern from Phase 03

---

## Deliverables

| Item               | Description                               |
| ------------------ | ----------------------------------------- |
| `NodeLibraryPanel` | Collapsible left panel component          |
| `AddNodeButton`    | Floating plus button on canvas            |
| Collapsed state    | Show category icons only (48px wide)      |
| Expanded state     | Full panel (280px wide) with content      |
| Hover expand       | Panel expands after 300ms hover           |
| Click lock         | Click locks panel open                    |
| Drag-to-close      | Panel closes when dragging node to canvas |

---

## Visual Design

### Collapsed State (48px)

```
┌────┐
│ >  │  ← Chevron arrow (hover to expand)
│────│
│ 🤖 │  AI
│ 📚 │  Knowledge
│ ⚡  │  Automation
│ 🔧 │  Tools
│ 🧩 │  Integration
│ 📦 │  Custom
│ 🔀 │  Subflow
└────┘

   ┌───┐
   │ + │  ← Plus button (top-left corner of canvas, click to expand)
   └───┘
```

### Trigger Behaviors

| Trigger             | Action                                       |
| ------------------- | -------------------------------------------- |
| Click `>` arrow     | Toggle panel open/closed                     |
| Hover over panel    | Show panel after 300ms (auto-hide on leave)  |
| Click `+` button    | Show panel (stays open until explicit close) |
| Click outside panel | Close panel (if not locked)                  |
| Escape key          | Close panel                                  |
| Drag node to canvas | Close panel                                  |

### Expanded State (280px)

```
┌────────────────────────────────┐
│ 🔍 Search nodes...             │
│────────────────────────────────│
│ ⭐ Frequently Used             │
│    Ask AI, Transform, Router   │
│────────────────────────────────│
│ 🤖 AI & Agents              ▼  │
│ 📚 Knowledge                ▶  │
│ ⚡ Automations               ▶  │
│ 🔧 Tools                    ▶  │
│ 📞 Voice & Calls            ▶  │
│ 🧩 Integrations             ▶  │
│ 📦 Custom Nodes             ▶  │
│ 🔀 Subflows                 ▶  │
└────────────────────────────────┘
```

---

## Files to Create

### 1. `frontend/src/canvas/panels/NodeLibraryPanel.tsx`

```typescript
import { memo, useEffect, useRef } from "react";
import { Pin, PinOff } from "lucide-react";
import { useNodeLibraryStore } from "../../stores/nodeLibraryStore";
import { categoryStyles, getCategoryStyle } from "../../config/category-styles";
import type { NodeCategory } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

export const NodeLibraryPanel = memo(function NodeLibraryPanel() {
    const panelRef = useRef<HTMLDivElement>(null);
    const {
        isExpanded,
        isLocked,
        selectedCategory,
        expand,
        collapse,
        toggleLock,
        selectCategory,
        startHoverExpand,
        cancelHoverExpand
    } = useNodeLibraryStore();

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLocked) {
                collapse();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [collapse, isLocked]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!isLocked &&
                panelRef.current &&
                !panelRef.current.contains(e.target as Node)
            ) {
                collapse();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [collapse, isLocked]);

    const categories = Object.entries(categoryStyles) as [NodeCategory, typeof categoryStyles[keyof typeof categoryStyles]][];

    return (
        <div
            ref={panelRef}
            className={cn(
                "fixed left-0 top-0 h-full z-40 bg-card border-r shadow-lg",
                "flex flex-col transition-all duration-200",
                isExpanded ? "w-[280px]" : "w-[48px]"
            )}
            onMouseEnter={() => {
                if (!isExpanded) startHoverExpand();
            }}
            onMouseLeave={() => {
                cancelHoverExpand();
                if (!isLocked) collapse();
            }}
        >
            {/* Header (visible when expanded) */}
            {isExpanded && (
                <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-medium text-sm">Node Library</span>
                    <button
                        onClick={toggleLock}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title={isLocked ? "Unpin panel" : "Pin panel open"}
                    >
                        {isLocked ? (
                            <Pin className="w-4 h-4 text-primary" />
                        ) : (
                            <PinOff className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                </div>
            )}

            {/* Category List */}
            <div className="flex-1 overflow-y-auto py-2">
                {categories.map(([category, style]) => (
                    <button
                        key={category}
                        onClick={() => selectCategory(
                            selectedCategory === category ? null : category
                        )}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2",
                            "hover:bg-muted/50 transition-colors",
                            selectedCategory === category && "bg-muted"
                        )}
                    >
                        {/* Category Icon */}
                        <div
                            className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                "text-lg"
                            )}
                            style={{ backgroundColor: `${style.accent}20` }}
                        >
                            {style.icon}
                        </div>

                        {/* Category Label (only when expanded) */}
                        {isExpanded && (
                            <span className="text-sm font-medium flex-1 text-left">
                                {style.label}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
});
```

### 2. `frontend/src/stores/nodeLibraryStore.ts`

```typescript
import { create } from "zustand";
import type { NodeCategory } from "@flowmaestro/shared";

interface NodeLibraryState {
    // Panel state
    isExpanded: boolean;
    isLocked: boolean; // Prevents auto-collapse on mouse leave
    selectedCategory: NodeCategory | null;

    // Hover tracking
    hoverTimeout: NodeJS.Timeout | null;

    // Actions
    expand: () => void;
    collapse: () => void;
    toggleLock: () => void;
    selectCategory: (category: NodeCategory | null) => void;

    // Hover behavior
    startHoverExpand: () => void;
    cancelHoverExpand: () => void;
}

export const useNodeLibraryStore = create<NodeLibraryState>((set, get) => ({
    isExpanded: false,
    isLocked: false,
    selectedCategory: null,
    hoverTimeout: null,

    expand: () => set({ isExpanded: true }),

    collapse: () => {
        const { isLocked, hoverTimeout } = get();
        if (isLocked) return; // Don't collapse if locked
        if (hoverTimeout) clearTimeout(hoverTimeout);
        set({ isExpanded: false, hoverTimeout: null });
    },

    toggleLock: () =>
        set((state) => ({
            isLocked: !state.isLocked,
            isExpanded: true // Locking always expands
        })),

    selectCategory: (category) =>
        set({
            selectedCategory: category,
            isExpanded: true,
            isLocked: true // Selecting category locks panel open
        }),

    startHoverExpand: () => {
        const timeout = setTimeout(() => {
            set({ isExpanded: true });
        }, 300); // 300ms delay
        set({ hoverTimeout: timeout });
    },

    cancelHoverExpand: () => {
        const { hoverTimeout } = get();
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            set({ hoverTimeout: null });
        }
    }
}));
```

### 3. `frontend/src/canvas/components/AddNodeButton.tsx`

```typescript
import { memo } from "react";
import { Plus } from "lucide-react";
import { useNodeLibraryStore } from "../../stores/nodeLibraryStore";
import { cn } from "../../lib/utils";

/**
 * Floating plus button on canvas to open node library
 * Positioned top-left corner, always visible
 */
export const AddNodeButton = memo(function AddNodeButton() {
    const { expand, isExpanded } = useNodeLibraryStore();

    return (
        <button
            onClick={() => expand()}
            className={cn(
                "fixed top-4 left-16 z-50",
                "w-10 h-10 rounded-full",
                "bg-primary text-primary-foreground",
                "shadow-lg hover:shadow-xl",
                "flex items-center justify-center",
                "transition-all duration-200",
                "hover:scale-105 active:scale-95",
                isExpanded && "opacity-0 pointer-events-none"
            )}
            title="Add node"
        >
            <Plus className="w-5 h-5" />
        </button>
    );
});
```

---

## Files to Modify

### `frontend/src/canvas/WorkflowCanvas.tsx`

Add NodeLibraryPanel and AddNodeButton:

```tsx
import { useNodeLibraryStore } from "../../stores/nodeLibraryStore";
import { NodeLibraryPanel } from "../panels/NodeLibraryPanel";
import { AddNodeButton } from "./components/AddNodeButton";

export function WorkflowCanvas() {
    const { isExpanded, isLocked, collapse } = useNodeLibraryStore();

    // Close panel when dragging node to canvas
    const handleNodeDragStart = () => {
        collapse();
    };

    return (
        <div className="flex h-full relative">
            {/* Node Library Panel */}
            <NodeLibraryPanel />

            {/* Add Node Button (visible when panel collapsed) */}
            <AddNodeButton />

            {/* React Flow Canvas */}
            <div
                className={cn(
                    "flex-1 transition-all duration-200",
                    isExpanded && isLocked ? "ml-[280px]" : "ml-[48px]"
                )}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeDragStart={handleNodeDragStart}
                    nodeTypes={nodeTypes}
                    // ... other props
                >
                    <Controls />
                    <Background />
                </ReactFlow>
            </div>
        </div>
    );
}
```

### `frontend/src/index.css`

Add panel animation CSS:

```css
/* Panel slide animation */
@keyframes slide-in-panel {
    from {
        width: 48px;
    }
    to {
        width: 280px;
    }
}

.panel-expand {
    animation: slide-in-panel 0.2s ease-out forwards;
}

.panel-collapsed {
    width: 48px;
    transition: width 0.2s ease-out;
}

.panel-expanded {
    width: 280px;
    transition: width 0.2s ease-out;
}
```

---

## How to Deliver

1. Create `nodeLibraryStore.ts` with state management
2. Create `NodeLibraryPanel.tsx` component
3. Add panel to `WorkflowCanvas.tsx`
4. Add collapse/expand animations to CSS
5. Implement hover delay (300ms)
6. Implement click-to-lock behavior
7. Implement escape/outside-click collapse
8. Style category icons with correct colors

---

## How to Test

| Test                   | Expected Result                 |
| ---------------------- | ------------------------------- |
| Page load              | Panel collapsed, icons visible  |
| Page load              | Plus button visible on canvas   |
| Click plus button      | Panel expands and locks         |
| Hover left edge 300ms+ | Panel expands smoothly          |
| Move cursor away       | Panel collapses                 |
| Click category icon    | Panel expands and locks         |
| Press Escape           | Panel collapses                 |
| Click outside panel    | Panel collapses (if not locked) |
| Click lock toggle      | Panel stays open                |
| Drag node to canvas    | Panel closes automatically      |

### Interaction Flow

```
Initial: Collapsed
    │
    ├─ Hover (300ms) ──► Expanded (not locked)
    │                         │
    │                         ├─ Mouse leaves ──► Collapsed
    │                         │
    │                         └─ Click category ──► Expanded (locked)
    │                                                    │
    │                                                    ├─ Escape ──► Collapsed
    │                                                    │
    │                                                    └─ Click lock ──► Toggle lock
    │
    └─ Click icon ──► Expanded (locked)
```

---

## Acceptance Criteria

- [ ] Panel collapsed by default (48px wide)
- [ ] Category icons visible in collapsed state
- [ ] Icons have correct category colors
- [ ] Plus button visible on canvas (top-left)
- [ ] Clicking plus button expands and locks panel
- [ ] Plus button hides when panel is expanded
- [ ] Hover expands panel after 300ms delay
- [ ] Panel stays open while cursor is inside
- [ ] Click locks panel open
- [ ] Escape key collapses panel
- [ ] Click outside collapses (when not locked)
- [ ] Dragging node to canvas closes panel
- [ ] Smooth expand/collapse animation
- [ ] Panel doesn't overlap canvas content
- [ ] Touch devices: tap to toggle

---

## Dependencies

This phase enables:

- **Phase 05**: Two-level navigation within the expanded panel
