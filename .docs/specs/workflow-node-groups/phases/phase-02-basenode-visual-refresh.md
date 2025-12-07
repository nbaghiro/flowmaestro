# Phase 02: BaseNode Visual Refresh

## Overview

Enhance the BaseNode component with category-colored gradient headers, badge pills, hover-activated I/O chips, selection glow effects, and running state animations.

---

## Prerequisites

- **Phase 01**: Category styles configuration (`categoryStyles`, `getCategoryStyle()`)

---

## Existing Infrastructure

### Current BaseNode Implementation

**File**: `frontend/src/canvas/nodes/BaseNode.tsx`

```typescript
// Current props interface
interface BaseNodeProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    category?: "ai" | "logic" | "interaction" | "data" | "connect" | "voice";
    children?: React.ReactNode;
    selected?: boolean;
    hasInputHandle?: boolean;
    hasOutputHandle?: boolean;
    customHandles?: React.ReactNode;
}

// Current category colors (hardcoded in component)
const categoryColors = {
    ai: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500" },
    logic: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500" }
    // ...
};
```

### Current Node Constants

**File**: `frontend/src/stores/workflowStore.ts`

```typescript
export const INITIAL_NODE_WIDTH = 260;
export const INITIAL_NODE_HEIGHT = 160;
```

### Current Status Handling

**File**: `frontend/src/canvas/nodes/BaseNode.tsx`

- Uses `NodeExecutionPopover` for showing execution details on hover
- Status indicator in header: idle (gray), pending (yellow), running (blue pulse), success (green), error (red)

---

## Deliverables

| Item               | Description                              |
| ------------------ | ---------------------------------------- |
| Gradient headers   | Category-colored gradient in node header |
| Category badges    | Small pill showing category label        |
| I/O chips on hover | Show inputs/outputs when hovering        |
| Selection glow     | Category-colored glow when selected      |
| Running animation  | Animated border during execution         |
| Config preview     | Key settings summary in node body        |

---

## Visual Design

### Default State

```
┌────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░ [Icon]  Node Label          [Category Badge] ░░ │ ← Gradient header
│ ░░         Subtitle                             ░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│────────────────────────────────────────────────────│
│  Model: GPT-4  •  Temp: 0.7                        │ ← Config preview
└────────────────────────────────────────────────────┘
```

### Hover State (shows I/O)

```
┌─────────────────────────────────────────────────────┐
│ ░░ [Icon]  Summarizer          [Using AI]       ░░  │
│─────────────────────────────────────────────────────│
│  Model: GPT-4                                       │
│─────────────────────────────────────────────────────│
│  Inputs                                             │
│  ● content ← "Extract Data"                         │ ← Shows on hover
│  Outputs                                            │
│  ○ summary → string                                 │
└─────────────────────────────────────────────────────┘
```

### Selected State

```
┌──────────────────────────────────────────────────────┐
│ ░░ [Icon]  Ask AI               [Using AI]       ░░  │
│──────────────────────────────────────────────────────│
│  Model: GPT-4  •  Temp: 0.7                          │
└──────────────────────────────────────────────────────┘
  ↑ 2px ring + soft shadow in category color (glow)
```

---

## Files to Modify

### 1. `frontend/src/canvas/nodes/BaseNode.tsx`

```typescript
import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { getCategoryStyle, getGradientClasses } from "../../config/category-styles";
import type { NodeCategory } from "@flowmaestro/shared";

export interface BaseNodeProps {
    // Required
    icon: React.ComponentType<{ className?: string }> | string;
    label: string;
    category: NodeCategory;

    // Optional display
    subtitle?: string;
    configPreview?: React.ReactNode;      // Summary of key settings
    status?: "idle" | "pending" | "running" | "success" | "error";

    // I/O definition for hover display
    inputs?: Array<{
        name: string;
        type?: string;
        connectedTo?: string;             // Source node label
    }>;
    outputs?: Array<{
        name: string;
        type?: string;
    }>;

    // Handles
    hasInputHandle?: boolean;
    hasOutputHandle?: boolean;
    customHandles?: React.ReactNode;

    // State
    selected?: boolean;
    children?: React.ReactNode;
}

export const BaseNode = memo(function BaseNode({
    icon: Icon,
    label,
    category,
    subtitle,
    configPreview,
    status = "idle",
    inputs = [],
    outputs = [],
    hasInputHandle = true,
    hasOutputHandle = true,
    customHandles,
    selected = false,
    children
}: BaseNodeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const style = getCategoryStyle(category);
    const gradientClasses = getGradientClasses(category);

    // Status indicator colors
    const statusColors = {
        idle: "bg-gray-400",
        pending: "bg-yellow-400 animate-pulse",
        running: "bg-blue-500 animate-pulse",
        success: "bg-green-500",
        error: "bg-red-500"
    };

    return (
        <div
            className={cn(
                "relative rounded-xl border bg-card shadow-sm transition-all duration-200",
                "min-w-[240px] max-w-[320px]",
                selected && style.glow,
                status === "running" && "animate-gradient-border"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Input Handle */}
            {hasInputHandle && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
                />
            )}

            {/* Gradient Header */}
            <div className={cn("px-3 py-2.5 rounded-t-xl", gradientClasses)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Status indicator */}
                        <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />

                        {/* Icon */}
                        {typeof Icon === "string" ? (
                            <span className="text-lg">{Icon}</span>
                        ) : (
                            <Icon className={cn("w-4 h-4", `text-[${style.accent}]`)} />
                        )}

                        {/* Label */}
                        <span className="font-medium text-sm text-foreground">{label}</span>
                    </div>

                    {/* Category Badge */}
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium",
                        style.badge.bg,
                        style.badge.text
                    )}>
                        {style.label}
                    </span>
                </div>

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{subtitle}</p>
                )}
            </div>

            {/* Config Preview / Body */}
            <div className="px-3 py-2 border-t border-border/50">
                {configPreview && (
                    <div className="text-xs text-muted-foreground">
                        {configPreview}
                    </div>
                )}
                {children}
            </div>

            {/* I/O Chips (show on hover) */}
            {isHovered && (inputs.length > 0 || outputs.length > 0) && (
                <div className="px-3 py-2 border-t border-border/50 animate-fade-in">
                    {inputs.length > 0 && (
                        <div className="mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Inputs
                            </span>
                            {inputs.map((input, i) => (
                                <div key={i} className="flex items-center gap-1.5 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/50" />
                                    <span className="text-xs font-medium">{input.name}</span>
                                    {input.connectedTo && (
                                        <span className="text-xs text-muted-foreground">
                                            ← {input.connectedTo}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {outputs.length > 0 && (
                        <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Outputs
                            </span>
                            {outputs.map((output, i) => (
                                <div key={i} className="flex items-center gap-1.5 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full border border-foreground/50" />
                                    <span className="text-xs font-medium">{output.name}</span>
                                    {output.type && (
                                        <span className="text-xs text-muted-foreground">
                                            → {output.type}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Output Handle */}
            {hasOutputHandle && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
                />
            )}

            {/* Custom Handles (for conditional/switch nodes) */}
            {customHandles}
        </div>
    );
});
```

### 2. `frontend/src/index.css`

Add animations:

```css
/* Gradient border animation for running state */
@keyframes gradient-border {
    0%,
    100% {
        border-color: rgba(59, 130, 246, 0.5);
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
    }
    50% {
        border-color: rgba(59, 130, 246, 0.8);
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }
}

.animate-gradient-border {
    animation: gradient-border 1.5s ease-in-out infinite;
}

/* Fade in for I/O chips */
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.15s ease-out forwards;
}

/* Slide in for sidebar */
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

### 3. `frontend/tailwind.config.js`

Add animation utilities:

```javascript
module.exports = {
    // ... existing config
    theme: {
        extend: {
            animation: {
                "gradient-border": "gradient-border 1.5s ease-in-out infinite",
                "fade-in": "fade-in 0.15s ease-out forwards",
                "slide-in-right": "slide-in-right 0.2s ease-out forwards"
            },
            keyframes: {
                "gradient-border": {
                    "0%, 100%": {
                        borderColor: "rgba(59, 130, 246, 0.5)",
                        boxShadow: "0 0 10px rgba(59, 130, 246, 0.3)"
                    },
                    "50%": {
                        borderColor: "rgba(59, 130, 246, 0.8)",
                        boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)"
                    }
                },
                "fade-in": {
                    from: { opacity: "0", transform: "translateY(-4px)" },
                    to: { opacity: "1", transform: "translateY(0)" }
                },
                "slide-in-right": {
                    from: { opacity: "0", transform: "translateX(10px)" },
                    to: { opacity: "1", transform: "translateX(0)" }
                }
            }
        }
    }
};
```

---

## Updating Existing Nodes

Each existing node needs to be updated to use the new BaseNode props. Example for LLMNode:

### Before

```typescript
// frontend/src/canvas/nodes/LLMNode.tsx
function LLMNode({ data, selected }: NodeProps<LLMNodeData>) {
    return (
        <BaseNode
            icon={Bot}
            label={data.label || "LLM"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="text-xs">
                {data.model && <span>Model: {data.model}</span>}
            </div>
        </BaseNode>
    );
}
```

### After

```typescript
// frontend/src/canvas/nodes/LLMNode.tsx
function LLMNode({ data, selected }: NodeProps<LLMNodeData>) {
    return (
        <BaseNode
            icon={Bot}
            label={data.label || "Ask AI"}
            category="ai"
            subtitle={data.provider}
            status={data.status}
            selected={selected}
            configPreview={
                <span>
                    {data.model && `Model: ${data.model}`}
                    {data.temperature !== undefined && ` • Temp: ${data.temperature}`}
                </span>
            }
            inputs={[
                { name: "prompt", type: "string" },
                { name: "context", type: "object" }
            ]}
            outputs={[
                { name: "response", type: "string" },
                { name: "usage", type: "object" }
            ]}
        />
    );
}
```

---

## How to Deliver

1. Import `getCategoryStyle` and `getGradientClasses` from Phase 01
2. Add CSS animations to `frontend/src/index.css`
3. Update Tailwind config with animation utilities
4. Refactor `BaseNode.tsx` with new props and styling
5. Create `frontend/src/canvas/nodes/node-status.ts` for status types
6. Update each existing node to use new BaseNode props
7. Test with existing node types to verify backwards compatibility
8. Run `npx tsc --noEmit` to verify no type errors

---

## How to Test

| Test                     | Expected Result                            |
| ------------------------ | ------------------------------------------ |
| Add AI node to canvas    | Blue gradient header with "Using AI" badge |
| Add Tools node to canvas | Slate gradient header with "Tools" badge   |
| Hover over any node      | I/O chips fade in below config             |
| Click to select node     | Category-colored glow surrounds node       |
| Trigger workflow run     | Node shows animated gradient border        |
| Zoom to 50%              | Node still readable                        |
| Zoom to 150%             | Node proportions maintained                |
| Toggle dark mode         | Gradients look correct                     |

### Manual Testing Checklist

1. Create workflow with one node from each category
2. Verify each has distinct gradient color:
    - AI: Blue
    - Knowledge: Violet
    - Integration: Rose
    - Automation: Amber
    - Tools: Slate
    - Custom: Cyan
    - Subflow: Indigo
3. Hover each node - verify I/O chips appear smoothly
4. Select each node - verify glow effect
5. Run a workflow - verify running animation

---

## Acceptance Criteria

- [ ] Node header shows category-colored gradient
- [ ] Category badge pill appears in header (e.g., "Using AI")
- [ ] I/O chips appear only on hover with fade-in animation
- [ ] I/O chips show source node name when connected
- [ ] Selected node has category-colored glow shadow
- [ ] Running node has animated gradient border
- [ ] Config preview shows key settings in body
- [ ] All 8 category colors display correctly
- [ ] Dark mode gradients work correctly
- [ ] Animations are smooth (60fps, no jank)
- [ ] Existing nodes continue to work with new BaseNode

---

## Dependencies

This phase enables:

- **Phase 03**: Attached sidebar uses selection state
- **Phase 06+**: Each node provides `configPreview`, `inputs`, `outputs` props
