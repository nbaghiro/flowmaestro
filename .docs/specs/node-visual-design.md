# Node Visual Design Enhancement Spec

## Objective

Transform FlowMaestro's plain node design into a visually distinctive, character-rich system that improves usability and adds visual appeal.

---

## Design Decisions

| Decision       | Choice                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| Config Panel   | **Replace entirely** - Remove right panel, all config in attached sidebar         |
| Gradient Style | **Header gradient only** - Gradient in header fading to card background           |
| I/O Chips      | **On hover only** - Show connected inputs/outputs when hovering to reduce clutter |

---

## Design Concept: "Header Gradient + Attached Sidebar"

### 1. Gradient Header System

**Concept**: Category-colored gradient in header area, fading into white/card background.

```
┌────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Strong gradient (category color)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Fades to white
│────────────────────────────────────────│
│                                        │  ← Solid card background
│                                        │
│                                        │
└────────────────────────────────────────┘
```

**Category Color Mapping (new expanded palette):**

```typescript
const categoryGradients = {
    ai: {
        from: "from-blue-500/20",
        via: "via-blue-400/10",
        to: "to-transparent",
        accent: "#3B82F6",
        glow: "shadow-blue-500/20"
    },
    knowledge: {
        from: "from-violet-500/20",
        via: "via-violet-400/10",
        to: "to-transparent",
        accent: "#8B5CF6",
        glow: "shadow-violet-500/20"
    },
    automation: {
        from: "from-amber-500/20",
        via: "via-amber-400/10",
        to: "to-transparent",
        accent: "#F59E0B",
        glow: "shadow-amber-500/20"
    },
    tools: {
        from: "from-slate-500/20",
        via: "via-slate-400/10",
        to: "to-transparent",
        accent: "#64748B",
        glow: "shadow-slate-500/20"
    },
    voice: {
        from: "from-emerald-500/20",
        via: "via-emerald-400/10",
        to: "to-transparent",
        accent: "#10B981",
        glow: "shadow-emerald-500/20"
    },
    integration: {
        from: "from-rose-500/20",
        via: "via-rose-400/10",
        to: "to-transparent",
        accent: "#F43F5E",
        glow: "shadow-rose-500/20"
    }
};
```

### 2. Node Card Structure (New Design)

**Default State:**

```
┌─────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░ [Icon]  Node Label          [Category Badge] ░░ │ ← Gradient header
│ ░░         Subtitle                             ░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│─────────────────────────────────────────────────────│
│                                                     │
│  Configuration Preview                              │
│  Model: GPT-4  •  Temp: 0.7                        │ ← Key config summary
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Hover State (shows I/O chips):**

```
┌─────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░ [Icon]  Summarizer          [Using AI]       ░░ │
│ ░░         GPT-4                                ░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│─────────────────────────────────────────────────────│
│  Inputs                                             │
│  ○ file_contents ← File Reader                      │ ← Shows on hover
│                                                     │
│  Outputs                                            │
│  ● summary → Text                                   │ ← Shows on hover
└─────────────────────────────────────────────────────┘
```

### 3. Attached Sidebar Panel (Replaces Right Panel)

**Trigger**: Click node or "Configure" button

**Position**: Attached to right edge of node, overlays canvas

```
┌──────────────────────┐┌─────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░ ││ Configuration          [×] │
│ ░░ [Icon] Label  ░░ ││─────────────────────────────│
│ ░░░░░░░░░░░░░░░░░░░ ││                             │
│─────────────────────││ Model                       │
│                     ││ [GPT-4          ▼]          │
│  Config Preview     ││                             │
│  Model: GPT-4       ││ Temperature                 │
│                     ││ [━━━━━●━━━━] 0.7            │
│                     ││                             │
│                     ││ System Prompt               │
│                     ││ ┌─────────────────────────┐ │
│                     ││ │ You are a helpful...    │ │
│                     ││ └─────────────────────────┘ │
│                     ││                             │
│                     ││ [Show More Options]         │
└──────────────────────┘└─────────────────────────────┘
        Node                  Attached Sidebar (280px)
```

**Behavior**:

- Opens on node click (replaces NodeInspector)
- Attached visually to node's right edge
- Slides in with animation (200ms ease-out)
- Closes on: click outside, Escape key, or × button
- Only one sidebar open at a time
- Scrollable content area

### 4. Visual Elements

#### Gradient Header

CSS gradient from category color to transparent:

```css
.node-header-ai {
    background: linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.15) 0%,
        rgba(59, 130, 246, 0.05) 50%,
        transparent 100%
    );
}
```

#### Category Badge

Small pill in header:

```tsx
<span
    className="px-2 py-0.5 text-[10px] font-medium rounded-full
                 bg-blue-500/20 text-blue-600 dark:text-blue-400"
>
    Using AI
</span>
```

#### I/O Chips (Hover Only)

```tsx
// Only render when isHovered
{
    isHovered && inputs.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50">
            <div className="text-[10px] text-muted-foreground mb-1">Inputs</div>
            {inputs.map((input) => (
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>{input.name}</span>
                    <span className="text-muted-foreground/70">← {input.source}</span>
                </div>
            ))}
        </div>
    );
}
```

#### Selection Glow

```css
.node-selected {
    box-shadow:
        0 0 0 2px var(--category-color),
        0 4px 20px rgba(var(--category-rgb), 0.25);
}
```

#### Running Status Animation

```tsx
{
    status === "running" && (
        <div
            className="absolute -inset-0.5 rounded-lg bg-gradient-to-r
                    from-blue-500 via-purple-500 to-blue-500
                    animate-gradient-x opacity-75 -z-10"
        />
    );
}
```

---

## Collapsible Node Picker

### Behavior

**Collapsed State:**

```
┌───┐
│ > │  ← Arrow icon (click to expand)
└───┘




┌───┐
│ + │  ← Plus icon (click to expand)
└───┘
```

**Expanded State (hover over > or click +):**

```
┌─────────────────────────────────────┐
│ 🔍 Search all nodes...              │
├─────────────────────────────────────┤
│ Core Nodes                        → │
│ Using AI                          → │
│ Triggers                          → │
│ ...                                 │
├─────────────────────────────────────┤
│ Frequently Used                     │
│ [Ask AI] [Input] [Extract Data]    │
│ ...                                 │
├─────────────────────────────────────┤
│ Integrations                        │
│ Airtable                     [MCP]→ │
│ Gmail                        [MCP]→ │
│ ...                                 │
└─────────────────────────────────────┘
```

### Trigger Behaviors

| Trigger              | Action                                       |
| -------------------- | -------------------------------------------- |
| Click `>` arrow      | Toggle panel open/closed                     |
| Hover over `>` arrow | Show panel (auto-hide on mouse leave)        |
| Click `+` button     | Show panel (stays open until explicit close) |
| Click outside panel  | Close panel (if opened via hover)            |
| Escape key           | Close panel                                  |
| Drag node to canvas  | Close panel                                  |

### Visual Design

**Collapsed indicator (left edge):**

- Small `>` chevron icon, vertically centered
- Subtle background on hover
- Tooltip: "Show nodes"

**Plus button (top-left corner):**

- Pink/primary colored circular button
- Fixed position on canvas
- Tooltip: "Add node"

### State Management

```typescript
interface NodeLibraryState {
    isOpen: boolean;
    openedBy: "click" | "hover" | null;
}

// Auto-close on hover leave only if opened by hover
// Stay open if opened by click until explicit close
```

---

## Implementation Plan

### Phase 1: Update BaseNode Component

**File**: `frontend/src/canvas/nodes/BaseNode.tsx`

1. Add gradient header with category colors
2. Add category badge pill
3. Add hover state for I/O chips
4. Implement selection glow effect
5. Add running state animated border

**New Props:**

```typescript
interface BaseNodeProps {
    // ... existing props
    categoryLabel?: string; // "Using AI", "Tools", etc.
    configPreview?: ReactNode; // Summary to show in body
    inputs?: Array<{ name: string; source?: string }>;
    outputs?: Array<{ name: string; type?: string }>;
}
```

### Phase 2: Create NodeSidebar Component

**New File**: `frontend/src/canvas/nodes/NodeSidebar.tsx`

```typescript
interface NodeSidebarProps {
    nodeId: string;
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number }; // Node position for attachment
    nodeWidth: number;
    children: ReactNode; // Config form content
}
```

**Features:**

- Absolute positioning attached to node's right edge
- 280px width
- Max height with scroll
- Slide-in animation (transform + opacity)
- Click-outside detection via useClickOutside hook
- Escape key handler
- Header with title and close button
- Scrollable content area

### Phase 3: Integrate Sidebar with Workflow Canvas

**File**: `frontend/src/canvas/WorkflowCanvas.tsx`

- Remove NodeInspector from layout
- Add NodeSidebar rendering logic
- Track which node has sidebar open
- Handle sidebar close on canvas click

**File**: `frontend/src/pages/FlowBuilder.tsx`

- Remove NodeInspector import and usage
- Sidebar now managed by canvas/nodes

### Phase 4: Update Category System

**File**: `frontend/src/canvas/nodes/BaseNode.tsx`

New category config structure:

```typescript
const categoryConfig = {
    ai: {
        gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
        badge: "bg-blue-500/20 text-blue-600",
        glow: "shadow-[0_0_0_2px_rgba(59,130,246,0.5),0_4px_20px_rgba(59,130,246,0.25)]",
        label: "Using AI"
    },
    knowledge: {
        gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
        badge: "bg-violet-500/20 text-violet-600",
        glow: "...",
        label: "Knowledge"
    }
    // ... etc for: automation, tools, voice, integration
};
```

### Phase 5: Add CSS/Tailwind Utilities

**File**: `frontend/tailwind.config.js`

```javascript
// Add custom animation
animation: {
    'gradient-x': 'gradient-x 3s ease infinite',
    'slide-in': 'slide-in 0.2s ease-out',
},
keyframes: {
    'gradient-x': {
        '0%, 100%': { 'background-position': '0% 50%' },
        '50%': { 'background-position': '100% 50%' },
    },
    'slide-in': {
        '0%': { opacity: 0, transform: 'translateX(-8px)' },
        '100%': { opacity: 1, transform: 'translateX(0)' },
    },
}
```

### Phase 6: Update Individual Node Components

**Files**: All `frontend/src/canvas/nodes/*.tsx`

For each node:

1. Add `categoryLabel` prop
2. Create `configPreview` component showing key settings
3. Define `inputs` and `outputs` arrays
4. Move full config to sidebar content

**Example - LLMNode.tsx:**

```typescript
<BaseNode
    icon={Bot}
    label={data.label || "Ask AI"}
    category="ai"
    categoryLabel="Using AI"
    configPreview={
        <div className="text-xs text-muted-foreground">
            {data.provider} • {data.model}
        </div>
    }
    inputs={[
        { name: "prompt", source: data.promptSource }
    ]}
    outputs={[
        { name: "response", type: "text" }
    ]}
>
    <NodeSidebar>
        <LLMNodeConfig data={data} onUpdate={handleUpdate} />
    </NodeSidebar>
</BaseNode>
```

### Phase 7: Migrate Config Components

**Files**: `frontend/src/canvas/panels/configs/*.tsx`

- Keep existing config components
- Adjust styling for narrower sidebar (280px vs 384px)
- Ensure all form elements fit properly

### Phase 8: Update NodeLibrary with Collapsible Behavior

**File**: `frontend/src/canvas/panels/NodeLibrary.tsx`

- Add hover/click state management
- Add chevron trigger on left edge
- Add plus button on top-left
- Handle escape key and click-outside
- Close panel when dragging node

---

## Files to Modify

| File                                           | Change Type | Description                              |
| ---------------------------------------------- | ----------- | ---------------------------------------- |
| `frontend/src/canvas/nodes/BaseNode.tsx`       | Major       | Gradient header, badges, I/O chips, glow |
| `frontend/src/canvas/nodes/NodeSidebar.tsx`    | New         | Attached config sidebar component        |
| `frontend/src/canvas/WorkflowCanvas.tsx`       | Modify      | Integrate sidebar, remove inspector ref  |
| `frontend/src/pages/FlowBuilder.tsx`           | Modify      | Remove NodeInspector                     |
| `frontend/src/canvas/panels/NodeInspector.tsx` | Delete      | No longer needed                         |
| `frontend/src/canvas/panels/NodeLibrary.tsx`   | Modify      | Add collapsible behavior                 |
| `frontend/src/canvas/nodes/*.tsx`              | Modify      | All 20+ nodes - add new props            |
| `frontend/src/canvas/panels/configs/*.tsx`     | Modify      | Adjust for narrower width                |
| `frontend/tailwind.config.js`                  | Modify      | Add animations, shadows                  |
| `frontend/src/index.css`                       | Modify      | Add keyframe animations                  |

---

## Visual Comparison

### Before (Current)

```
┌────────────────────────┐
│ ▌[Icon] Label     [•]  │  ← Plain white, 4px left border only
│ ├────────────────────  │
│ │ Provider: OpenAI     │
│ │ Model: GPT-4         │
│ └────────────────────  │
└────────────────────────┘
         +
┌──────────────────────────┐
│ Right Panel (384px)      │  ← Separate from node
│ Node Configuration       │
│ ...                      │
└──────────────────────────┘
```

### After (New Design)

```
┌─────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░ [Icon] Summarizer      [Using AI] ░░ │  ← Gradient header + badge
│ ░░         GPT-4                     ░░ │
│─────────────────────────────────────────│
│                                         │
│  Model: GPT-4  •  Temp: 0.7            │  ← Config preview
│                                         │
│  [On Hover: I/O chips appear]          │
│                                         │
└─────────────────────────────────────────┘
                                          ┌─────────────────────────────┐
         Click opens →                    │ Configuration          [×] │
                                          │─────────────────────────────│
                                          │ [Full config form]         │
                                          │                             │
                                          └─────────────────────────────┘
                                                 Attached Sidebar
```
