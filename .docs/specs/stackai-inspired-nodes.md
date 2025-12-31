# Node Reorganization Spec: StackAI-Inspired Categories

## Background

This spec outlines a reorganization of FlowMaestro's workflow node palette to align with StackAI's user-friendly structure. The goal is to improve discoverability, emphasize data flow (inputs → processing → outputs), and provide individual integration nodes for better UX.

### StackAI Reference (Competitor Analysis)

StackAI organizes nodes into 6 categories:

1. **Inputs** - Entry points (Input, Files, Trigger, URL, Audio)
2. **Outputs** - Exit points (Output, Action, Audio, Template)
3. **Core Nodes** - Primary AI capabilities (AI Agent, Knowledge Base)
4. **Apps** - 50+ individual integration nodes (Slack, Gmail, Airtable, etc.)
5. **Logic** - Control flow (Python, If/Else, AI Routing, Loop)
6. **Utils** - Helpers (Sticky Note, Delay, Shared Memory, etc.)

Key insights:

- Data flow oriented (Inputs/Outputs at top)
- Each integration is a separate draggable node
- Minimal, focused Logic category
- Utils for auxiliary functionality

---

## Design Decisions

- **6 categories** (StackAI-style with custom naming)
- **Individual app nodes** for integrations (Slack, Gmail, Airtable as separate nodes)
- **Add icons** to category headers
- **Implemented providers only** (~26 with working backends, not 100+ "coming soon")
- **Sidebar UX**: Auto-collapse by default, pin button to keep open, remove "Nodes" label
- **Expanded Inputs/Outputs**: More node types (visual variants, same execution logic)
- **Single integration logic**: All provider nodes use same IntegrationNodeConfig and execution logic, just displayed as separate nodes
- **Integrations category**: Dedicated to external provider connections only (no HTTP/Database)

---

## New Category Structure

```
Inputs (↓ Download icon, Cyan)
├── Input (text/data collection) - existing
├── Trigger (manual, schedule, webhook, integration webhook) - existing, expanded
├── Files (file upload) - NEW visual variant of Input
├── URL (web scraping) - NEW visual variant of Input
└── Audio Input (speech input) - NEW visual variant of Input

Outputs (↑ Upload icon, Pink)
├── Output (display text) - existing
├── Action (external provider action) - NEW visual variant of Output
└── Audio Output (speech synthesis) - NEW visual variant of Output

AI & ML (□ Cpu icon, Blue)
├── LLM
├── Vision
├── Audio (processing, not I/O)
├── Embeddings
├── KB Query
└── Router

Integrations (⚡ Zap icon, Orange)
├── Slack
├── Gmail
├── Google Sheets
├── Airtable
├── Notion
├── HubSpot
├── ... (26+ providers)
└── [External provider integrations only]

Logic & Code (< > Brackets icon, Purple)
├── Conditional
├── Switch
├── Loop
├── Code
├── Wait/Delay
├── Transform
└── Variable

Utils (🔧 Wrench icon, Gray)
├── HTTP (generic API calls)
├── Database (SQL/NoSQL queries)
└── Comment (sticky note for documentation) - NEW
```

---

## Detailed Node Specifications

### Input Nodes (Inputs Category)

#### Input Node (existing)

- **Type**: `input`
- **Purpose**: Collect text/data from user
- **Config**: `inputType: "text" | "textarea" | "select" | "multiselect"`
- **No changes needed**

#### Trigger Node (existing, expanded)

- **Type**: `trigger`
- **Purpose**: Start workflow execution
- **Current Config**:
    ```typescript
    {
        triggerType: "manual" | "schedule" | "webhook";
        // ... existing fields
    }
    ```
- **New Config** (add integration webhook support):
    ```typescript
    {
      triggerType: "manual" | "schedule" | "webhook" | "integration_webhook"
      // For integration_webhook:
      provider?: string           // e.g., "slack", "github"
      connectionId?: string       // user's connection to that provider
      webhookEvent?: string       // e.g., "message_received", "pull_request_opened"
      filters?: Record<string, unknown>  // e.g., { channel: "#support" }
    }
    ```
- **UI Changes** (TriggerNodeConfig.tsx):
    - Add "Integration Webhook" option to trigger type selector
    - When selected, show:
        1. Provider dropdown (from implemented providers list)
        2. Connection selector (user's connections for that provider)
        3. Event selector (fetched from backend based on provider)
        4. Filter inputs (provider-specific, e.g., channel for Slack)
- **Execution Logic Changes**: None - webhook handling already exists, just needs event routing

#### Files Node (NEW - variant of Input)

- **Type**: `files`
- **Purpose**: File upload input
- **Display**: Shows file icon, "Files" label
- **Config**: Preset `inputType: "file"`
- **UI**: Same as Input node with file type preset, shows file upload UI
- **Execution**: Uses existing Input node executor

#### URL Node (NEW - variant of Input)

- **Type**: `url`
- **Purpose**: Fetch content from URL
- **Display**: Shows link icon, "URL" label
- **Config**:
    ```typescript
    {
      inputType: "url"
      url?: string              // static URL or variable reference
      fetchContent?: boolean    // whether to fetch and parse content
      contentType?: "html" | "json" | "text"
    }
    ```
- **UI**: URL input field, content type selector, fetch toggle
- **Execution**: Fetch URL content, parse based on content type

#### Audio Input Node (NEW - variant of Input)

- **Type**: `audioInput`
- **Purpose**: Audio/speech input
- **Display**: Shows microphone icon, "Audio Input" label
- **Config**:
    ```typescript
    {
      inputType: "audio"
      audioSource?: "upload" | "record" | "url"
      transcribe?: boolean      // auto-transcribe to text
      language?: string         // transcription language
    }
    ```
- **UI**: Audio upload/record UI, transcription toggle
- **Execution**: Handle audio file, optionally transcribe using Audio node logic

---

### Output Nodes (Outputs Category)

#### Output Node (existing)

- **Type**: `output`
- **Purpose**: Display final workflow results
- **No changes needed**

#### Action Node (NEW - variant of Output)

- **Type**: `action`
- **Purpose**: Trigger external action (send email, post message, etc.)
- **Display**: Shows play/action icon, "Action" label
- **Config**:
    ```typescript
    {
      outputType: "action"
      actionType?: "notification" | "webhook" | "integration"
      // For webhook:
      webhookUrl?: string
      webhookMethod?: "POST" | "PUT"
      // For integration:
      provider?: string
      connectionId?: string
      operation?: string
      parameters?: Record<string, unknown>
    }
    ```
- **UI**: Action type selector, then provider/webhook config
- **Execution**: Execute configured action (webhook call or integration operation)

#### Audio Output Node (NEW - variant of Output)

- **Type**: `audioOutput`
- **Purpose**: Text-to-speech output
- **Display**: Shows speaker icon, "Audio Output" label
- **Config**:
    ```typescript
    {
      outputType: "audio"
      ttsProvider?: "openai" | "elevenlabs" | "google"
      voice?: string
      textInput?: string        // variable reference to text to speak
    }
    ```
- **UI**: TTS provider selector, voice selector, text input
- **Execution**: Use TTS provider to generate audio from text

---

### Integration Nodes (Integrations Category)

All integration nodes share the same underlying implementation but are displayed as separate nodes in the library.

#### Common Integration Node Pattern

- **Type**: Provider name (e.g., `slack`, `gmail`, `airtable`)
- **Display**: Provider logo, provider display name
- **Config**:
    ```typescript
    {
      provider: string          // preset to node type
      connectionId?: string     // user's connection
      operation?: string        // selected operation
      parameters?: Record<string, unknown>
      outputVariable?: string
    }
    ```
- **UI**: IntegrationNodeConfig with provider pre-selected (skips provider selection step)
- **Execution**: Uses existing integration execution logic

#### Implemented Providers (26)

| Provider          | Display Name    | Logo Source             |
| ----------------- | --------------- | ----------------------- |
| `slack`           | Slack           | `ALL_PROVIDERS` logoUrl |
| `discord`         | Discord         | `ALL_PROVIDERS` logoUrl |
| `telegram`        | Telegram        | `ALL_PROVIDERS` logoUrl |
| `microsoft-teams` | Microsoft Teams | `ALL_PROVIDERS` logoUrl |
| `notion`          | Notion          | `ALL_PROVIDERS` logoUrl |
| `airtable`        | Airtable        | `ALL_PROVIDERS` logoUrl |
| `google-sheets`   | Google Sheets   | `ALL_PROVIDERS` logoUrl |
| `coda`            | Coda            | `ALL_PROVIDERS` logoUrl |
| `hubspot`         | HubSpot         | `ALL_PROVIDERS` logoUrl |
| `salesforce`      | Salesforce      | `ALL_PROVIDERS` logoUrl |
| `zendesk`         | Zendesk         | `ALL_PROVIDERS` logoUrl |
| `postgresql`      | PostgreSQL      | `ALL_PROVIDERS` logoUrl |
| `mongodb`         | MongoDB         | `ALL_PROVIDERS` logoUrl |
| `github`          | GitHub          | `ALL_PROVIDERS` logoUrl |
| `gitlab`          | GitLab          | `ALL_PROVIDERS` logoUrl |
| `linear`          | Linear          | `ALL_PROVIDERS` logoUrl |
| `jira`            | Jira            | `ALL_PROVIDERS` logoUrl |
| `resend`          | Resend          | `ALL_PROVIDERS` logoUrl |
| `twilio`          | Twilio          | `ALL_PROVIDERS` logoUrl |
| `email`           | Email           | `ALL_PROVIDERS` logoUrl |
| `stripe`          | Stripe          | `ALL_PROVIDERS` logoUrl |
| `figma`           | Figma           | `ALL_PROVIDERS` logoUrl |
| `youtube`         | YouTube         | `ALL_PROVIDERS` logoUrl |
| `twitter`         | Twitter/X       | `ALL_PROVIDERS` logoUrl |
| `linkedin`        | LinkedIn        | `ALL_PROVIDERS` logoUrl |
| `shopify`         | Shopify         | `ALL_PROVIDERS` logoUrl |

---

### Utils Nodes

#### HTTP Node (existing, moved to Utils)

- **Type**: `http`
- **Category change**: "connect" → "utils"
- **No other changes**

#### Database Node (existing, moved to Utils)

- **Type**: `database`
- **Category change**: "connect" → "utils"
- **No other changes**

#### Comment Node (NEW)

- **Type**: `comment`
- **Purpose**: Documentation/notes on canvas (not executed)
- **Display**: Sticky note style, different from other nodes
- **Config**:
    ```typescript
    {
      text: string              // comment content
      color?: "yellow" | "blue" | "green" | "pink"  // note color
    }
    ```
- **UI**:
    - No input/output handles
    - Resizable text area
    - Color picker in toolbar
    - Different visual style (paper/sticky note appearance)
- **Execution**: Skipped - comments are not executed

---

## Implementation Plan

### Phase 1: Sidebar UX Improvements

#### Files to Modify

- `frontend/src/canvas/panels/NodeLibrary.tsx`

#### Changes

**1.1 Auto-collapse State**

```typescript
// Change from:
const [isCollapsed, setIsCollapsed] = useState(false);

// To:
const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed
const [isPinned, setIsPinned] = useState(false); // New pin state
```

**1.2 Pin Functionality**

```typescript
// Add to imports
import { Pin, PinOff } from "lucide-react";

// Add auto-collapse on drag
const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.effectAllowed = "move";

        // Auto-collapse if not pinned
        if (!isPinned) {
            setIsCollapsed(true);
        }
    },
    [isPinned]
);

// Add click-outside handler to auto-collapse when not pinned
useEffect(() => {
    if (!isPinned && !isCollapsed) {
        const handleClickOutside = (e: MouseEvent) => {
            // Check if click is outside sidebar
            if (!sidebarRef.current?.contains(e.target as Node)) {
                setIsCollapsed(true);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }
}, [isPinned, isCollapsed]);
```

**1.3 Header Redesign**

```tsx
// Remove "Nodes" label, add pin button
<div className="px-3 py-3 border-b border-border">
    <div className="flex items-center gap-2">
        {/* Search input takes most space */}
        <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs"
            />
        </div>

        {/* Pin button */}
        <Button
            variant="icon"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            className="p-1.5"
        >
            {isPinned ? (
                <Pin className="w-4 h-4 text-primary" />
            ) : (
                <PinOff className="w-4 h-4 text-muted-foreground" />
            )}
        </Button>
    </div>
</div>
```

---

### Phase 2: Restructure Categories & Basic Nodes

#### Files to Modify

- `frontend/src/canvas/panels/NodeLibrary.tsx`
- `frontend/src/canvas/nodes/BaseNode.tsx`

#### Changes

**2.1 Update Categories Array**

```typescript
import { Download, Upload, Cpu, Zap, Code2, Wrench } from "lucide-react";

const categories = [
    {
        id: "inputs",
        label: "Inputs",
        icon: Download,
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-500/10 dark:bg-cyan-400/20"
    },
    {
        id: "outputs",
        label: "Outputs",
        icon: Upload,
        color: "text-pink-600 dark:text-pink-400",
        bgColor: "bg-pink-500/10 dark:bg-pink-400/20"
    },
    {
        id: "ai",
        label: "AI & ML",
        icon: Cpu,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10 dark:bg-blue-400/20"
    },
    {
        id: "integrations",
        label: "Integrations",
        icon: Zap,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500/10 dark:bg-orange-400/20"
    },
    {
        id: "logic",
        label: "Logic & Code",
        icon: Code2,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-500/10 dark:bg-purple-400/20"
    },
    {
        id: "utils",
        label: "Utils",
        icon: Wrench,
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-500/10 dark:bg-slate-400/20"
    }
];
```

**2.2 Update Node Library Array**

```typescript
const nodeLibrary: NodeDefinition[] = [
    // === INPUTS ===
    {
        type: "input",
        label: "Input",
        icon: Hand,
        category: "inputs",
        description: "Collect user input, file upload, or choices"
    },
    {
        type: "trigger",
        label: "Trigger",
        icon: Zap,
        category: "inputs",
        description: "Schedule, webhook, or manual workflow trigger"
    },
    // ... new variants added in Phase 3

    // === OUTPUTS ===
    {
        type: "output",
        label: "Output",
        icon: Send,
        category: "outputs",
        description: "Display final workflow results"
    },
    // ... new variants added in Phase 3

    // === AI & ML ===
    {
        type: "llm",
        label: "LLM",
        icon: Bot,
        category: "ai",
        description: "Text generation with OpenAI, Anthropic, Google, etc."
    },
    // ... other AI nodes (vision, audio, embeddings, knowledgeBaseQuery, router)

    // === INTEGRATIONS ===
    // Generated dynamically from provider list (Phase 4)

    // === LOGIC & CODE ===
    {
        type: "conditional",
        label: "Conditional",
        icon: GitBranch,
        category: "logic",
        description: "Branch workflow based on if/else conditions"
    },
    {
        type: "switch",
        label: "Switch",
        icon: GitMerge,
        category: "logic",
        description: "Multiple branch conditions like switch/case"
    },
    {
        type: "loop",
        label: "Loop",
        icon: Repeat,
        category: "logic",
        description: "Iterate over arrays or lists of items"
    },
    {
        type: "code",
        label: "Code",
        icon: Code2,
        category: "logic",
        description: "Run custom JavaScript or Python code"
    },
    {
        type: "wait",
        label: "Wait/Delay",
        icon: Clock,
        category: "logic",
        description: "Pause workflow execution for a duration"
    },
    {
        type: "transform",
        label: "Transform",
        icon: Shuffle,
        category: "logic",
        description: "Transform data with JSONPath, templates, filters"
    },
    {
        type: "variable",
        label: "Variable",
        icon: Variable,
        category: "logic",
        description: "Set or get workflow variables"
    },

    // === UTILS ===
    {
        type: "http",
        label: "HTTP",
        icon: Globe,
        category: "utils",
        description: "Make HTTP requests to external APIs"
    },
    {
        type: "database",
        label: "Database",
        icon: Database,
        category: "utils",
        description: "Query SQL or NoSQL databases"
    },
    {
        type: "comment",
        label: "Comment",
        icon: StickyNote,
        category: "utils",
        description: "Add notes and documentation to your workflow"
    }
];
```

**2.3 Update Category Header Rendering**

```tsx
{
    categories.map((category) => {
        const CategoryIcon = category.icon;
        // ... existing filter logic

        return (
            <div key={category.id} className="mb-1">
                <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/50 transition-colors group"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    )}
                    {/* Category icon */}
                    <CategoryIcon className={`w-3.5 h-3.5 ${category.color}`} />
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {category.label}
                    </h3>
                </button>
                {/* ... existing node rendering */}
            </div>
        );
    });
}
```

**2.4 Update BaseNode Category Colors**

```typescript
// In BaseNode.tsx, update categoryConfig
const categoryConfig: Record<string, CategoryStyle> = {
    inputs: {
        borderColor: "border-cyan-500/50",
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-600 dark:text-cyan-400",
        ringColor: "ring-cyan-500/30"
    },
    outputs: {
        borderColor: "border-pink-500/50",
        iconBg: "bg-pink-500/10",
        iconColor: "text-pink-600 dark:text-pink-400",
        ringColor: "ring-pink-500/30"
    },
    ai: {
        borderColor: "border-blue-500/50",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-600 dark:text-blue-400",
        ringColor: "ring-blue-500/30"
    },
    integrations: {
        borderColor: "border-orange-500/50",
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-600 dark:text-orange-400",
        ringColor: "ring-orange-500/30"
    },
    logic: {
        borderColor: "border-purple-500/50",
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-600 dark:text-purple-400",
        ringColor: "ring-purple-500/30"
    },
    utils: {
        borderColor: "border-slate-500/50",
        iconBg: "bg-slate-500/10",
        iconColor: "text-slate-600 dark:text-slate-400",
        ringColor: "ring-slate-500/30"
    }
};
```

---

### Phase 3: Add Input/Output Visual Variants

#### Files to Modify

- `frontend/src/canvas/panels/NodeLibrary.tsx`
- `frontend/src/canvas/nodes/InputNode.tsx`
- `frontend/src/canvas/nodes/OutputNode.tsx`
- `frontend/src/canvas/nodes/TriggerNode.tsx`
- `frontend/src/canvas/panels/configs/InputNodeConfig.tsx`
- `frontend/src/canvas/panels/configs/OutputNodeConfig.tsx`
- `frontend/src/canvas/panels/configs/TriggerNodeConfig.tsx`
- `frontend/src/canvas/WorkflowCanvas.tsx`
- `frontend/src/canvas/panels/NodeInspector.tsx`

#### Changes

**3.1 Add Variant Node Entries to Library**

```typescript
// In NodeLibrary.tsx, add to nodeLibrary array
// === INPUTS (add after trigger) ===
{
    type: "files",
    label: "Files",
    icon: FileUp,
    category: "inputs",
    description: "Upload files to the workflow"
},
{
    type: "url",
    label: "URL",
    icon: Link,
    category: "inputs",
    description: "Fetch content from a URL"
},
{
    type: "audioInput",
    label: "Audio Input",
    icon: Mic,
    category: "inputs",
    description: "Record or upload audio input"
},

// === OUTPUTS (add after output) ===
{
    type: "action",
    label: "Action",
    icon: Play,
    category: "outputs",
    description: "Trigger external actions (webhook, notification)"
},
{
    type: "audioOutput",
    label: "Audio Output",
    icon: Volume2,
    category: "outputs",
    description: "Generate speech from text"
},
```

**3.2 Create Variant Node Factory**

```typescript
// In WorkflowCanvas.tsx
import InputNode from "./nodes/InputNode";
import OutputNode from "./nodes/OutputNode";

// Factory for input variants
const createInputVariant = (presetType: string) => {
    return (props: NodeProps) => (
        <InputNode {...props} data={{ ...props.data, presetInputType: presetType }} />
    );
};

// Factory for output variants
const createOutputVariant = (presetType: string) => {
    return (props: NodeProps) => (
        <OutputNode {...props} data={{ ...props.data, presetOutputType: presetType }} />
    );
};

const nodeTypes = {
    // ... existing nodes ...

    // Input variants
    files: createInputVariant("file"),
    url: createInputVariant("url"),
    audioInput: createInputVariant("audio"),

    // Output variants
    action: createOutputVariant("action"),
    audioOutput: createOutputVariant("audio"),
};
```

**3.3 Update InputNode to Support Variants**

```typescript
// In InputNode.tsx
interface InputNodeData {
    label?: string;
    inputType?: string;
    presetInputType?: string; // NEW: preset from variant
    // ... other fields
}

export default function InputNode({ data, selected, id }: NodeProps<InputNodeData>) {
    // Use preset type if provided (for variant nodes)
    const effectiveInputType = data.presetInputType || data.inputType || "text";

    // Update icon based on type
    const getIcon = () => {
        switch (effectiveInputType) {
            case "file":
                return FileUp;
            case "url":
                return Link;
            case "audio":
                return Mic;
            default:
                return Hand;
        }
    };

    // ... rest of component
}
```

**3.4 Update InputNodeConfig for Variants**

```typescript
// In InputNodeConfig.tsx
interface InputNodeConfigProps {
    data: InputNodeData;
    onUpdate: (config: unknown) => void;
    presetInputType?: string;  // NEW: passed from variant
}

export function InputNodeConfig({ data, onUpdate, presetInputType }: InputNodeConfigProps) {
    // If preset type, don't show type selector
    const inputType = presetInputType || data.inputType || "text";
    const showTypeSelector = !presetInputType;

    return (
        <div className="space-y-4">
            {showTypeSelector && (
                <div>
                    <label>Input Type</label>
                    <Select value={inputType} onChange={...}>
                        {/* options */}
                    </Select>
                </div>
            )}

            {/* Type-specific config */}
            {inputType === "file" && <FileInputConfig ... />}
            {inputType === "url" && <UrlInputConfig ... />}
            {inputType === "audio" && <AudioInputConfig ... />}
            {/* ... other types */}
        </div>
    );
}
```

**3.5 Add Integration Webhooks to TriggerNodeConfig**

```typescript
// In TriggerNodeConfig.tsx
export function TriggerNodeConfig({ data, onUpdate }: TriggerNodeConfigProps) {
    const [triggerType, setTriggerType] = useState(data.triggerType || "manual");
    const [provider, setProvider] = useState(data.provider || "");
    const [webhookEvent, setWebhookEvent] = useState(data.webhookEvent || "");
    const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);

    // Fetch webhook events when provider changes
    useEffect(() => {
        if (triggerType === "integration_webhook" && provider) {
            fetchWebhookEvents(provider).then(setWebhookEvents);
        }
    }, [triggerType, provider]);

    return (
        <div className="space-y-4">
            {/* Trigger Type Selector */}
            <Select value={triggerType} onChange={setTriggerType}>
                <option value="manual">Manual</option>
                <option value="schedule">Schedule</option>
                <option value="webhook">Webhook</option>
                <option value="integration_webhook">Integration Webhook</option>
            </Select>

            {/* Integration Webhook Config */}
            {triggerType === "integration_webhook" && (
                <>
                    {/* Provider Selector */}
                    <ProviderSelector
                        value={provider}
                        onChange={setProvider}
                        filter={(p) => p.supportsWebhooks}
                    />

                    {/* Connection Selector */}
                    {provider && (
                        <ConnectionSelector
                            provider={provider}
                            value={data.connectionId}
                            onChange={(id) => onUpdate({ connectionId: id })}
                        />
                    )}

                    {/* Event Selector */}
                    {provider && webhookEvents.length > 0 && (
                        <Select value={webhookEvent} onChange={setWebhookEvent}>
                            {webhookEvents.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.name}
                                </option>
                            ))}
                        </Select>
                    )}

                    {/* Event-specific filters */}
                    {webhookEvent && (
                        <WebhookFilters
                            provider={provider}
                            event={webhookEvent}
                            filters={data.filters}
                            onChange={(filters) => onUpdate({ filters })}
                        />
                    )}
                </>
            )}

            {/* ... existing config for other trigger types */}
        </div>
    );
}
```

**3.6 Update NodeInspector Routing**

```typescript
// In NodeInspector.tsx
const renderConfig = () => {
    switch (node.type) {
        // Input variants - route to InputNodeConfig with preset
        case "files":
            return <InputNodeConfig data={node.data} onUpdate={handleUpdate} presetInputType="file" />;
        case "url":
            return <InputNodeConfig data={node.data} onUpdate={handleUpdate} presetInputType="url" />;
        case "audioInput":
            return <InputNodeConfig data={node.data} onUpdate={handleUpdate} presetInputType="audio" />;

        // Output variants - route to OutputNodeConfig with preset
        case "action":
            return <OutputNodeConfig data={node.data} onUpdate={handleUpdate} presetOutputType="action" />;
        case "audioOutput":
            return <OutputNodeConfig data={node.data} onUpdate={handleUpdate} presetOutputType="audio" />;

        // ... existing cases
    }
};
```

---

### Phase 4: Add Individual Integration Nodes

#### Files to Modify

- `frontend/src/canvas/panels/NodeLibrary.tsx`
- `frontend/src/canvas/nodes/IntegrationNode.tsx`
- `frontend/src/canvas/panels/configs/IntegrationNodeConfig.tsx`
- `frontend/src/canvas/WorkflowCanvas.tsx`
- `frontend/src/canvas/panels/NodeInspector.tsx`

#### Changes

**4.1 Generate Integration Node Entries**

```typescript
// In NodeLibrary.tsx
import { ALL_PROVIDERS } from "@flowmaestro/shared";

// Get implemented providers (filter coming soon)
const IMPLEMENTED_PROVIDERS = [
    "slack",
    "discord",
    "telegram",
    "microsoft-teams",
    "notion",
    "airtable",
    "google-sheets",
    "coda",
    "hubspot",
    "salesforce",
    "zendesk",
    "postgresql",
    "mongodb",
    "github",
    "gitlab",
    "linear",
    "jira",
    "resend",
    "twilio",
    "email",
    "stripe",
    "figma",
    "youtube",
    "twitter",
    "linkedin",
    "shopify"
];

// Generate integration node definitions
const integrationNodes: NodeDefinition[] = IMPLEMENTED_PROVIDERS.map((providerId) => {
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === providerId);
    return {
        type: providerId,
        label: providerInfo?.displayName || providerId,
        icon: null, // Will use logo image instead
        logoUrl: providerInfo?.logoUrl,
        category: "integrations",
        description: providerInfo?.description || `Connect to ${providerId}`
    };
});

// Merge with static node definitions
const nodeLibrary: NodeDefinition[] = [...staticNodeDefinitions, ...integrationNodes];
```

**4.2 Update Node Library Rendering for Logos**

```tsx
// In NodeLibrary.tsx, update node rendering
{
    nodes.map((node) => {
        const IconComponent = node.icon;
        return (
            <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className="group px-3 py-1.5 cursor-move hover:bg-muted/70"
                title={node.description}
            >
                <div className={`p-1 rounded ${category.bgColor} flex-shrink-0`}>
                    {node.logoUrl ? (
                        // Provider logo
                        <img
                            src={node.logoUrl}
                            alt={node.label}
                            className="w-4 h-4 object-contain"
                        />
                    ) : IconComponent ? (
                        // Lucide icon
                        <IconComponent className={`w-3.5 h-3.5 ${category.color}`} />
                    ) : null}
                </div>
                <span className="text-xs font-medium">{node.label}</span>
            </div>
        );
    });
}
```

**4.3 Create Integration Node Factory**

```typescript
// In WorkflowCanvas.tsx
const createIntegrationNode = (provider: string) => {
    return (props: NodeProps) => (
        <IntegrationNode {...props} data={{ ...props.data, presetProvider: provider }} />
    );
};

// Generate node types for all providers
const integrationNodeTypes = IMPLEMENTED_PROVIDERS.reduce((acc, provider) => {
    acc[provider] = createIntegrationNode(provider);
    return acc;
}, {} as Record<string, React.ComponentType<NodeProps>>);

const nodeTypes = {
    // ... existing nodes ...
    ...integrationNodeTypes
};
```

**4.4 Update IntegrationNode for Preset Provider**

```typescript
// In IntegrationNode.tsx
interface IntegrationNodeData {
    provider?: string;
    presetProvider?: string;  // NEW
    operation?: string;
    connectionId?: string;
    // ...
}

export default function IntegrationNode({ data, selected, id }: NodeProps<IntegrationNodeData>) {
    const effectiveProvider = data.presetProvider || data.provider;
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === effectiveProvider);

    return (
        <BaseNode
            id={id}
            selected={selected}
            category="integrations"
            icon={null}
            title={providerInfo?.displayName || effectiveProvider || "Integration"}
            subtitle={data.operation ? formatOperation(data.operation) : "Select operation"}
        >
            {/* Show provider logo */}
            {providerInfo?.logoUrl && (
                <img src={providerInfo.logoUrl} className="w-6 h-6" alt={providerInfo.displayName} />
            )}
        </BaseNode>
    );
}
```

**4.5 Update IntegrationNodeConfig to Skip Provider Selection**

```typescript
// In IntegrationNodeConfig.tsx
interface IntegrationNodeConfigProps {
    data: IntegrationNodeData;
    onUpdate: (config: unknown) => void;
    presetProvider?: string;  // NEW
}

export function IntegrationNodeConfig({ data, onUpdate, presetProvider }: IntegrationNodeConfigProps) {
    const effectiveProvider = presetProvider || data.provider;
    const showProviderSelector = !presetProvider;

    // If we have a preset provider, skip straight to connection/operation selection
    return (
        <div className="space-y-4">
            {showProviderSelector ? (
                // Existing provider selection UI
                <ProviderConnectionDialog ... />
            ) : (
                // Direct to connection selection for this provider
                <ConnectionSelector
                    provider={effectiveProvider}
                    value={data.connectionId}
                    onChange={(connectionId) => onUpdate({ provider: effectiveProvider, connectionId })}
                />
            )}

            {/* Operation selection (shown after connection is selected) */}
            {data.connectionId && (
                <OperationSelector
                    provider={effectiveProvider}
                    value={data.operation}
                    onChange={(operation) => onUpdate({ operation })}
                />
            )}

            {/* Parameter inputs */}
            {data.operation && (
                <OperationParameters ... />
            )}
        </div>
    );
}
```

**4.6 Update NodeInspector for Provider Routing**

```typescript
// In NodeInspector.tsx
const renderConfig = () => {
    // Check if this is an integration provider node
    if (IMPLEMENTED_PROVIDERS.includes(node.type)) {
        return (
            <IntegrationNodeConfig
                data={node.data}
                onUpdate={handleUpdate}
                presetProvider={node.type}
            />
        );
    }

    switch (node.type) {
        // ... existing cases
    }
};
```

---

### Phase 5: Add Comment Node

#### Files to Create

- `frontend/src/canvas/nodes/CommentNode.tsx`
- `frontend/src/canvas/panels/configs/CommentNodeConfig.tsx`

#### Files to Modify

- `frontend/src/canvas/WorkflowCanvas.tsx`
- `frontend/src/canvas/panels/NodeInspector.tsx`

#### Changes

**5.1 Create CommentNode Component**

```typescript
// frontend/src/canvas/nodes/CommentNode.tsx
import { memo } from "react";
import { NodeProps, NodeResizer } from "reactflow";

interface CommentNodeData {
    text?: string;
    color?: "yellow" | "blue" | "green" | "pink";
}

const colorStyles = {
    yellow: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
    blue: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
    green: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
    pink: "bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700"
};

function CommentNode({ data, selected }: NodeProps<CommentNodeData>) {
    const color = data.color || "yellow";

    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={80}
                isVisible={selected}
            />
            <div
                className={`
                    p-3 rounded-lg border-2 shadow-sm min-w-[150px] min-h-[80px]
                    ${colorStyles[color]}
                    ${selected ? "ring-2 ring-primary" : ""}
                `}
            >
                <p className="text-sm whitespace-pre-wrap">
                    {data.text || "Add a comment..."}
                </p>
            </div>
        </>
    );
}

export default memo(CommentNode);
```

**5.2 Create CommentNodeConfig**

```typescript
// frontend/src/canvas/panels/configs/CommentNodeConfig.tsx
interface CommentNodeConfigProps {
    data: CommentNodeData;
    onUpdate: (config: unknown) => void;
}

export function CommentNodeConfig({ data, onUpdate }: CommentNodeConfigProps) {
    return (
        <div className="space-y-4">
            {/* Text area */}
            <div>
                <label className="text-sm font-medium">Comment</label>
                <textarea
                    value={data.text || ""}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    placeholder="Add notes about this workflow..."
                    className="w-full h-32 p-2 border rounded resize-none"
                />
            </div>

            {/* Color picker */}
            <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-1">
                    {(["yellow", "blue", "green", "pink"] as const).map((color) => (
                        <button
                            key={color}
                            onClick={() => onUpdate({ color })}
                            className={`
                                w-6 h-6 rounded-full border-2
                                ${colorStyles[color]}
                                ${data.color === color ? "ring-2 ring-offset-2 ring-primary" : ""}
                            `}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
```

**5.3 Register Comment Node**

```typescript
// In WorkflowCanvas.tsx
import CommentNode from "./nodes/CommentNode";

const nodeTypes = {
    // ... existing nodes ...
    comment: CommentNode
};
```

**5.4 Add to NodeInspector**

```typescript
// In NodeInspector.tsx
case "comment":
    return <CommentNodeConfig data={node.data} onUpdate={handleUpdate} />;
```

---

### Phase 6: Backend Changes for Integration Webhooks

#### Files to Modify

- `backend/src/integrations/core/types.ts`
- `backend/src/api/routes/integrations/webhook-events.ts` (NEW)

#### Changes

**6.1 Add Webhook Events to Provider Interface**

```typescript
// In backend/src/integrations/core/types.ts
export interface WebhookEvent {
    id: string;
    name: string;
    description: string;
    filters?: WebhookFilter[];
}

export interface WebhookFilter {
    id: string;
    name: string;
    type: "string" | "select" | "multiselect";
    options?: string[]; // For select/multiselect
}

export interface IProvider {
    // ... existing methods ...

    // NEW: Get available webhook events
    getWebhookEvents?(): Promise<WebhookEvent[]>;

    // NEW: Check if provider supports webhooks
    supportsWebhooks?(): boolean;
}
```

**6.2 Create Webhook Events Endpoint**

```typescript
// backend/src/api/routes/integrations/webhook-events.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { ProviderRegistry } from "../../../integrations/core/ProviderRegistry";

interface WebhookEventsParams {
    provider: string;
}

export async function getWebhookEvents(
    request: FastifyRequest<{ Params: WebhookEventsParams }>,
    reply: FastifyReply
) {
    const { provider } = request.params;

    const providerInstance = await ProviderRegistry.loadProvider(provider);

    if (!providerInstance.supportsWebhooks?.()) {
        return reply.code(400).send({
            success: false,
            error: `Provider ${provider} does not support webhooks`
        });
    }

    const events = (await providerInstance.getWebhookEvents?.()) || [];

    return reply.send({
        success: true,
        data: { provider, events }
    });
}
```

**6.3 Example Provider Webhook Implementation**

```typescript
// In SlackProvider.ts
class SlackProvider extends BaseProvider {
    supportsWebhooks(): boolean {
        return true;
    }

    async getWebhookEvents(): Promise<WebhookEvent[]> {
        return [
            {
                id: "message_received",
                name: "Message Received",
                description: "Triggered when a new message is posted",
                filters: [
                    {
                        id: "channel",
                        name: "Channel",
                        type: "select"
                        // Options fetched dynamically from connection
                    }
                ]
            },
            {
                id: "reaction_added",
                name: "Reaction Added",
                description: "Triggered when a reaction is added to a message",
                filters: [
                    {
                        id: "emoji",
                        name: "Emoji",
                        type: "string"
                    }
                ]
            }
            // ... more events
        ];
    }
}
```

---

## Files Summary

### Frontend Files to Modify

| File                                                           | Changes                                       |
| -------------------------------------------------------------- | --------------------------------------------- |
| `frontend/src/canvas/panels/NodeLibrary.tsx`                   | Sidebar UX, categories, icons, provider nodes |
| `frontend/src/canvas/nodes/BaseNode.tsx`                       | New category color schemes                    |
| `frontend/src/canvas/nodes/InputNode.tsx`                      | Support variant presets                       |
| `frontend/src/canvas/nodes/OutputNode.tsx`                     | Support variant presets                       |
| `frontend/src/canvas/nodes/TriggerNode.tsx`                    | Integration webhook support                   |
| `frontend/src/canvas/nodes/IntegrationNode.tsx`                | Preset provider support, logo display         |
| `frontend/src/canvas/panels/configs/InputNodeConfig.tsx`       | Variant-specific UI                           |
| `frontend/src/canvas/panels/configs/OutputNodeConfig.tsx`      | Variant-specific UI                           |
| `frontend/src/canvas/panels/configs/TriggerNodeConfig.tsx`     | Integration webhook UI                        |
| `frontend/src/canvas/panels/configs/IntegrationNodeConfig.tsx` | Skip provider selection                       |
| `frontend/src/canvas/WorkflowCanvas.tsx`                       | Register all new node types                   |
| `frontend/src/canvas/panels/NodeInspector.tsx`                 | Route variants + providers                    |

### Frontend Files to Create

| File                                                       | Purpose                  |
| ---------------------------------------------------------- | ------------------------ |
| `frontend/src/canvas/nodes/CommentNode.tsx`                | Comment/sticky note node |
| `frontend/src/canvas/panels/configs/CommentNodeConfig.tsx` | Comment config panel     |

### Backend Files to Modify

| File                                     | Changes                        |
| ---------------------------------------- | ------------------------------ |
| `backend/src/integrations/core/types.ts` | Add webhook types to IProvider |

### Backend Files to Create

| File                                                    | Purpose                     |
| ------------------------------------------------------- | --------------------------- |
| `backend/src/api/routes/integrations/webhook-events.ts` | Endpoint for webhook events |

---

## Migration Notes

- The generic `integration` node type will be removed from the node library
- All provider nodes (slack, gmail, etc.) use the same `IntegrationNodeConfig` and execution logic
- Existing workflows with `integration` node type may need manual migration to specific provider types
- Provider nodes are purely a UI/presentation change - backend execution remains identical
- Comment nodes are not executed (skipped in workflow execution)
