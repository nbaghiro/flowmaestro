# Phase 03: Node Sidebar

## Overview

Replace the separate NodeInspector right panel with an attached sidebar that connects visually to the selected node. This creates a more direct connection between the node and its configuration.

---

## Prerequisites

- **Phase 02**: BaseNode with selection state and category styling

---

## Existing Infrastructure

### Current NodeInspector Implementation

**File**: `frontend/src/canvas/panels/NodeInspector.tsx`

```typescript
// Current implementation - separate right panel
// Renders config based on selected node type
export function NodeInspector() {
    const { selectedNode, nodes, updateNode } = useWorkflowStore();

    const node = nodes.find(n => n.id === selectedNode);
    if (!node) return null;

    const ConfigComponent = getConfigComponent(node.type);

    return (
        <div className="w-80 border-l bg-card p-4">
            <ConfigComponent
                data={node.data}
                onUpdate={(data) => updateNode(node.id, data)}
            />
        </div>
    );
}
```

### Current Config Components

**File**: `frontend/src/canvas/panels/configs/LLMNodeConfig.tsx`

```typescript
// Each config follows this pattern
interface LLMNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

export function LLMNodeConfig({ data, onUpdate }: LLMNodeConfigProps) {
    // State for each field
    const [model, setModel] = useState(data.model || "gpt-4");

    // Effect to propagate changes
    useEffect(() => {
        onUpdate({ model, temperature, /* ... */ });
    }, [model, temperature]);

    return (
        <FormSection title="Model Settings">
            <FormField label="Model">
                <Select value={model} onChange={setModel} options={models} />
            </FormField>
        </FormSection>
    );
}
```

### Current Workflow Store

**File**: `frontend/src/stores/workflowStore.ts`

```typescript
interface WorkflowStore {
    selectedNode: string | null;
    selectNode: (nodeId: string | null) => void;
    updateNode: (nodeId: string, data: JsonObject) => void;
    // ...
}
```

### React Flow Node Selection

**File**: `frontend/src/canvas/WorkflowCanvas.tsx`

```typescript
// Current selection handling
<ReactFlow
    nodes={nodes}
    onNodeClick={(event, node) => selectNode(node.id)}
    onPaneClick={() => selectNode(null)}
/>
```

---

## Deliverables

| Item                    | Description                                |
| ----------------------- | ------------------------------------------ |
| `NodeSidebar` component | Config panel attached to node's right edge |
| `nodeSidebarStore`      | Zustand store tracking open sidebar        |
| `NodeConfigWrapper`     | Helper to wrap config forms                |
| Close behaviors         | Escape key, click outside, X button        |
| Remove `NodeInspector`  | Delete the separate right panel            |

---

## Visual Design

```
                                                    Canvas
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│    ┌──────────────────────┐┌─────────────────────────────┐               │
│    │ ░░░░░░░░░░░░░░░░░░░  ││ Ask AI                  [×] │               │
│    │ ░░ [🤖] Ask AI    ░░ ││─────────────────────────────│               │
│    │ ░░ GPT-4          ░░ ││ Model                       │               │
│    │ ░░░░░░░░░░░░░░░░░░░  ││ [GPT-4              ▼]      │               │
│    │──────────────────────││ Temperature                 │               │
│    │  Model: GPT-4        ││ [━━━━━●━━━━━━━━] 0.7        │               │
│    │  Temp: 0.7           ││ System Prompt               │               │
│    └──────────────────────┘│ ┌─────────────────────────┐ │               │
│            Node            │ │ You are a helpful...    │ │               │
│       (260px wide)         │ └─────────────────────────┘ │               │
│                            └─────────────────────────────┘               │
│                               Attached Sidebar (300px)                   │
│                                   8px gap                                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. `frontend/src/stores/nodeSidebarStore.ts`

```typescript
import { create } from "zustand";

interface NodeSidebarState {
    openNodeId: string | null;

    open: (nodeId: string) => void;
    close: () => void;
    toggle: (nodeId: string) => void;
    isOpen: (nodeId: string) => boolean;
}

export const useNodeSidebarStore = create<NodeSidebarState>((set, get) => ({
    openNodeId: null,

    open: (nodeId) => set({ openNodeId: nodeId }),

    close: () => set({ openNodeId: null }),

    toggle: (nodeId) => {
        const current = get().openNodeId;
        set({ openNodeId: current === nodeId ? null : nodeId });
    },

    isOpen: (nodeId) => get().openNodeId === nodeId
}));
```

### 2. `frontend/src/canvas/nodes/NodeSidebar.tsx`

```typescript
import { memo, useEffect, useRef } from "react";
import { useReactFlow, useViewport } from "reactflow";
import { X } from "lucide-react";
import { getCategoryStyle, getGradientClasses } from "../../config/category-styles";
import type { NodeCategory } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

interface NodeSidebarProps {
    nodeId: string;
    title: string;
    category: NodeCategory;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const NodeSidebar = memo(function NodeSidebar({
    nodeId,
    title,
    category,
    isOpen,
    onClose,
    children
}: NodeSidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const { getNode } = useReactFlow();
    const { x, y, zoom } = useViewport();

    const style = getCategoryStyle(category);
    const gradientClasses = getGradientClasses(category);

    // Get node position for sidebar placement
    const node = getNode(nodeId);
    if (!node || !isOpen) return null;

    // Calculate sidebar position (right of node, accounting for zoom/pan)
    const nodeRight = (node.position.x + (node.width || 260)) * zoom + x;
    const nodeTop = node.position.y * zoom + y;

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                // Check if click was on the node itself
                const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
                if (!nodeElement?.contains(e.target as Node)) {
                    onClose();
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [nodeId, onClose]);

    return (
        <div
            ref={sidebarRef}
            className={cn(
                "absolute z-50 w-[300px] bg-card border rounded-xl shadow-xl",
                "animate-slide-in-right"
            )}
            style={{
                left: nodeRight + 8,  // 8px gap from node
                top: nodeTop,
                maxHeight: "80vh"
            }}
        >
            {/* Connector triangle */}
            <div
                className="absolute -left-2 top-4 w-0 h-0"
                style={{
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderRight: `8px solid ${style.accent}`
                }}
            />

            {/* Header with gradient */}
            <div className={cn("px-4 py-3 rounded-t-xl flex items-center justify-between", gradientClasses)}>
                <span className="font-medium text-sm">{title}</span>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-background/50 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Scrollable content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-48px)]">
                {children}
            </div>
        </div>
    );
});
```

### 3. `frontend/src/canvas/nodes/NodeConfigWrapper.tsx`

````typescript
import { useNodeSidebarStore } from "../../stores/nodeSidebarStore";
import { NodeSidebar } from "./NodeSidebar";
import type { NodeCategory } from "@flowmaestro/shared";

interface NodeConfigWrapperProps {
    nodeId: string;
    title: string;
    category: NodeCategory;
    children: React.ReactNode;
}

/**
 * Wrapper component for node config forms
 * Renders config inside an attached sidebar when node is selected
 *
 * Usage in node component:
 * ```tsx
 * function LLMNode({ data, id }: NodeProps) {
 *     return (
 *         <>
 *             <BaseNode ... />
 *             <NodeConfigWrapper nodeId={id} title="Ask AI" category="ai">
 *                 <LLMNodeConfig data={data} onUpdate={...} />
 *             </NodeConfigWrapper>
 *         </>
 *     );
 * }
 * ```
 */
export function NodeConfigWrapper({
    nodeId,
    title,
    category,
    children
}: NodeConfigWrapperProps) {
    const { isOpen, close } = useNodeSidebarStore();

    return (
        <NodeSidebar
            nodeId={nodeId}
            title={title}
            category={category}
            isOpen={isOpen(nodeId)}
            onClose={close}
        >
            {children}
        </NodeSidebar>
    );
}
````

---

## Files to Modify

### 1. `frontend/src/canvas/nodes/BaseNode.tsx`

Add click handler to toggle sidebar:

```typescript
import { useNodeSidebarStore } from "../../stores/nodeSidebarStore";

export const BaseNode = memo(function BaseNode({ id, ...props }: BaseNodeProps & { id: string }) {
    const { toggle } = useNodeSidebarStore();

    return (
        <div
            onClick={() => toggle(id)}
            className={cn(/* existing classes */)}
        >
            {/* existing content */}
        </div>
    );
});
```

### 2. `frontend/src/canvas/WorkflowCanvas.tsx`

Remove NodeInspector, canvas takes full width:

```typescript
// Before
<div className="flex h-full">
    <div className="flex-1">
        <ReactFlow ... />
    </div>
    <NodeInspector />  {/* Remove this */}
</div>

// After
<div className="h-full">
    <ReactFlow ... />
</div>
```

### 3. `frontend/src/pages/FlowBuilder.tsx`

Remove inspector panel space:

```typescript
// Before
<div className="grid grid-cols-[1fr,320px]">
    <WorkflowCanvas />
    <div className="border-l" />  {/* Inspector space - remove */}
</div>

// After
<div className="h-full">
    <WorkflowCanvas />
</div>
```

### 4. Update Each Node Component

Example for LLMNode:

```typescript
// frontend/src/canvas/nodes/LLMNode.tsx
import { NodeConfigWrapper } from "./NodeConfigWrapper";
import { LLMNodeConfig } from "../panels/configs/LLMNodeConfig";
import { useWorkflowStore } from "../../stores/workflowStore";

function LLMNode({ id, data, selected }: NodeProps<LLMNodeData>) {
    const { updateNode } = useWorkflowStore();

    return (
        <>
            <BaseNode
                id={id}
                icon={Bot}
                label={data.label || "Ask AI"}
                category="ai"
                selected={selected}
                configPreview={data.model ? `Model: ${data.model}` : undefined}
            />
            <NodeConfigWrapper nodeId={id} title="Ask AI" category="ai">
                <LLMNodeConfig
                    data={data}
                    onUpdate={(config) => updateNode(id, config)}
                />
            </NodeConfigWrapper>
        </>
    );
}
```

---

## Files to Delete

- `frontend/src/canvas/panels/NodeInspector.tsx`

---

## CSS Additions

Add to `frontend/src/index.css`:

```css
/* Slide in animation for sidebar */
@keyframes slide-in-right {
    from {
        opacity: 0;
        transform: translateX(10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.animate-slide-in-right {
    animation: slide-in-right 0.2s ease-out forwards;
}
```

---

## How to Deliver

1. Create `nodeSidebarStore.ts` with open/close/toggle actions
2. Create `NodeSidebar.tsx` component with positioning logic
3. Create `NodeConfigWrapper.tsx` helper component
4. Add slide-in animation CSS
5. Modify `BaseNode.tsx` to toggle sidebar on click
6. Update each node component to use `NodeConfigWrapper`
7. Remove `NodeInspector.tsx` and its imports
8. Update `WorkflowCanvas.tsx` layout (full-width canvas)
9. Update `FlowBuilder.tsx` to remove inspector space
10. Test positioning at various zoom levels

---

## How to Test

| Test                       | Expected Result                      |
| -------------------------- | ------------------------------------ |
| Click node                 | Sidebar opens attached to right edge |
| Press Escape               | Sidebar closes                       |
| Click X button             | Sidebar closes                       |
| Click outside sidebar+node | Sidebar closes                       |
| Click different node       | Current closes, new opens            |
| Pan canvas                 | Sidebar follows node position        |
| Zoom in/out                | Sidebar maintains relative position  |
| Delete selected node       | Sidebar closes                       |
| Modify field in sidebar    | Change reflects immediately in node  |
| Scroll long config         | Content scrolls, header stays fixed  |

### Keyboard Shortcuts

| Key    | Action                             |
| ------ | ---------------------------------- |
| Escape | Close sidebar                      |
| Tab    | Navigate form fields               |
| Enter  | Submit/confirm (context-dependent) |

---

## Acceptance Criteria

- [ ] Clicking node opens sidebar attached to right edge
- [ ] Sidebar positioned 8px to the right of node
- [ ] Visual connector (triangle) links sidebar to node
- [ ] Connector uses category accent color
- [ ] Only one sidebar open at a time
- [ ] Escape key closes sidebar
- [ ] Click outside closes sidebar
- [ ] Click on node keeps sidebar open
- [ ] X button closes sidebar
- [ ] Sidebar follows node during pan/zoom
- [ ] Sidebar has scrollable content area with fixed header
- [ ] Sidebar animates in smoothly (0.2s ease-out)
- [ ] NodeInspector panel removed completely
- [ ] Canvas takes full width
- [ ] Config forms display correctly in 300px width
- [ ] All existing config components work in sidebar

---

## Dependencies

This phase enables:

- **Phase 04+**: Each node implementation uses `NodeConfigWrapper` for config forms
