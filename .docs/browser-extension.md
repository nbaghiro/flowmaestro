# FlowMaestro Browser Extension

> **Status**: ✅ Implemented | **Location**: `extensions/chrome/`

## Executive Summary

A Chrome browser extension that enables users to interact with FlowMaestro workflows and agents using web page content as context. Similar to Claude's browser extension, it provides a sidebar interface for AI-powered analysis while leveraging FlowMaestro's unique workflow execution and agent capabilities.

---

## User Problem Statement

FlowMaestro users currently need to manually copy-paste web content into the application or use the URL node to fetch pages. This creates friction when:

1. **Analyzing dynamic content** - Pages behind authentication, SPAs, or content that requires user interaction
2. **Working with visual data** - Dashboards, charts, ad managers, analytics tools
3. **Contextual automation** - Triggering workflows based on what they're currently viewing
4. **Quick agent queries** - Asking questions about page content without context switching

---

## User Personas & Use Cases

### Persona 1: Marketing Manager (Sarah)

**Current Pain:**

- Viewing Meta Ads Manager, needs to analyze campaign performance
- Has to screenshot data, upload to FlowMaestro, run analysis workflow
- Loses context switching between tabs

**With Extension:**

- Opens sidebar while on Ads Manager
- Clicks "Analyze with Workflow" → selects "Campaign Analysis" workflow
- Extension captures page data + screenshot → sends to workflow
- Gets optimization recommendations in sidebar

### Persona 2: Sales Representative (Mike)

**Current Pain:**

- Researching prospect on LinkedIn
- Manually copies company info, pastes into FlowMaestro agent
- Creates personalized outreach

**With Extension:**

- Opens sidebar on LinkedIn profile
- Chats with "Sales Assistant" agent with page context
- Agent sees company details, role, posts → generates personalized message
- One-click copy to clipboard or insert into page

### Persona 3: Customer Support Lead (Ana)

**Current Pain:**

- Reviewing customer support tickets in Zendesk
- Needs to cross-reference with knowledge base
- Manually searches KB, then responds

**With Extension:**

- Opens sidebar on Zendesk ticket
- Extension reads ticket content
- Agent searches FlowMaestro KB + provides suggested response
- Can trigger "Escalation Workflow" if needed

### Persona 4: Content Researcher (James)

**Current Pain:**

- Reading articles for research
- Manually extracts key points, summarizes
- Adds to knowledge base through FlowMaestro UI

**With Extension:**

- Opens sidebar on article
- One-click "Add to Knowledge Base" with auto-extraction
- Can run "Research Summary" workflow inline

---

## Feature Capabilities

### 1. Page Content Reading

| Capability          | Description                                     |
| ------------------- | ----------------------------------------------- |
| DOM Text Extraction | Extract visible text content from the page      |
| Structured Data     | Parse tables, lists, forms into structured JSON |
| Screenshot Capture  | Full page or visible viewport screenshots       |
| Selected Text       | Use user-selected text as context               |
| Dynamic Content     | Handle SPAs and dynamically loaded content      |
| Metadata            | Page title, URL, meta tags, Open Graph data     |

### 2. Workflow Integration

| Capability      | Description                                  |
| --------------- | -------------------------------------------- |
| Quick Run       | Execute workflows with page content as input |
| Workflow Picker | Search/select from user's workflows          |
| Input Mapping   | Map page data to workflow input nodes        |
| Output Display  | Show workflow results in sidebar             |
| Trigger Actions | Use page content for workflow triggers       |

### 3. Agent Chat

| Capability          | Description                                      |
| ------------------- | ------------------------------------------------ |
| Context-Aware Chat  | Chat with agents using page as context           |
| Agent Selector      | Switch between user's configured agents          |
| Thread Continuity   | Continue conversations across pages              |
| Tool Visibility     | See when agent uses tools (KB search, workflows) |
| Streaming Responses | Real-time token streaming in sidebar             |

### 4. Knowledge Base Integration

| Capability | Description                          |
| ---------- | ------------------------------------ |
| Quick Add  | Add page content to knowledge base   |
| KB Search  | Search KB with page content as query |
| Citation   | Reference KB documents in responses  |

### 5. Quick Actions

| Capability         | Description                                          |
| ------------------ | ---------------------------------------------------- |
| Pinned Workflows   | One-click access to favorite workflows               |
| Page Actions       | Context-specific actions (e.g., "Analyze this form") |
| Keyboard Shortcuts | Power user shortcuts for common actions              |

---

## Permission Model (Critical for Trust)

Following Claude's pattern - explicit, user-controlled permissions:

### Permission Levels

1. **No Access (Default)** - Extension installed but no page reading
2. **Allow Once** - Read this specific page once
3. **Allow for Site** - Always read pages on this domain
4. **Allow All** - Read any page (power user setting)

### Permission UI

```
┌─────────────────────────────────────────┐
│ FlowMaestro needs permission            │
│                                         │
│ FlowMaestro wants to read page content  │
│ on: adsmanager.facebook.com             │
│                                         │
│ [Allow this action]              →      │
│ [Decline]                       ESC     │
│                                         │
│ ─────────────────────────────────────   │
│ Site-level permissions disabled         │
│ FlowMaestro will not purchase items,    │
│ create accounts, or bypass captchas     │
│ without input. Manage in settings.      │
└─────────────────────────────────────────┘
```

### Sensitive Domain Handling

- Banking sites: Extra confirmation required
- Password managers: Auto-blocked
- User can configure blocked domains

---

## UI/UX Design

### Sidebar Panel (Primary Interface)

```
┌──────────────────────────────────────┐
│ ≡ FlowMaestro                    ✕   │
├──────────────────────────────────────┤
│ [Workflows] [Agents] [KB]            │  ← Tab navigation
├──────────────────────────────────────┤
│                                      │
│  Agent: Sales Assistant       ▼      │  ← Agent/Workflow selector
│                                      │
│ ┌────────────────────────────────┐   │
│ │ User: Analyze this LinkedIn    │   │
│ │ profile and suggest outreach   │   │
│ └────────────────────────────────┘   │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Assistant:                     │   │
│ │ Based on the profile, I see... │   │
│ │                                │   │
│ │ • Role: VP of Engineering      │   │
│ │ • Company: TechCorp (Series B) │   │
│ │ • Recent activity: AI posts    │   │
│ │                                │   │
│ │ Suggested outreach:            │   │
│ │ "Hi [Name], noticed your..."   │   │
│ └────────────────────────────────┘   │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Using: KB Search               │   │  ← Tool usage indicator
│ │    Searched: company research  │   │
│ └────────────────────────────────┘   │
│                                      │
├──────────────────────────────────────┤
│ [Screenshot] [Page Text]             │  ← Context controls
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ Type your message...        ⏎  │   │
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

### Workflow Tab

```
┌──────────────────────────────────────┐
│ ≡ FlowMaestro                    ✕   │
├──────────────────────────────────────┤
│ [Workflows] [Agents] [KB]            │
├──────────────────────────────────────┤
│ Search workflows...                  │
├──────────────────────────────────────┤
│ PINNED                               │
│ ├─ Campaign Analysis                 │
│ ├─ Content Summary                   │
│ └─ Competitor Research               │
├──────────────────────────────────────┤
│ RECENT                               │
│ ├─ Lead Enrichment                   │
│ ├─ Article to KB                     │
│ └─ Screenshot Analysis               │
├──────────────────────────────────────┤
│ Page Context:                        │
│ ┌────────────────────────────────┐   │
│ │ [x] Include page text          │   │
│ │ [x] Include screenshot         │   │
│ │ [ ] Include page metadata      │   │
│ └────────────────────────────────┘   │
│                                      │
│        [Run Selected Workflow]       │
└──────────────────────────────────────┘
```

### Popup (Quick Access)

```
┌─────────────────────────────┐
│ FlowMaestro                 │
├─────────────────────────────┤
│ Quick Chat    →             │
│ Run Workflow  →             │
│ Add to KB     →             │
├─────────────────────────────┤
│ Settings                    │
│ Open FlowMaestro            │
└─────────────────────────────┘
```

### Floating Action Button (Optional)

Small, draggable button on page corner for quick sidebar toggle.

---

## Technical Architecture

### Extension Components

```
extensions/chrome/
├── manifest.json           # Extension config (MV3)
├── src/
│   ├── background/
│   │   └── service-worker.ts   # Background service worker
│   ├── content/
│   │   ├── content-script.ts   # Page content extraction
│   │   └── injected.ts         # In-page utilities
│   ├── sidebar/
│   │   ├── App.tsx            # Sidebar React app
│   │   ├── components/        # UI components
│   │   └── stores/            # Zustand stores
│   ├── popup/
│   │   └── Popup.tsx          # Quick access popup
│   └── shared/
│       ├── api.ts             # FlowMaestro API client
│       ├── permissions.ts     # Permission management
│       └── types.ts           # Shared types
├── styles/
│   └── sidebar.css            # Tailwind CSS
└── assets/
    └── icons/                 # Extension icons
```

### Communication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│   Sidebar   │◄──►│  Service    │◄──►│  FlowMaestro    │
│   (React)   │    │  Worker     │    │  Backend API    │
└─────────────┘    └─────────────┘    └─────────────────┘
       ▲                  ▲
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   Content   │◄──►│  Injected   │
│   Script    │    │   Script    │
└─────────────┘    └─────────────┘
       │
       ▼
┌─────────────┐
│  Web Page   │
│   (DOM)     │
└─────────────┘
```

### API Integration Points

**New Backend Endpoints:**

```
POST /api/extension/page-context
  - Receives page content, screenshot, metadata
  - Returns structured extraction

POST /api/extension/execute-workflow
  - Workflow ID + page context
  - Returns execution result (streaming)

POST /api/extension/agent-chat
  - Agent ID + message + page context
  - Returns streaming response

GET /api/extension/user-context
  - Returns user's workflows, agents, KBs
  - Cached for offline display
```

**Authentication:**

- OAuth flow initiated from extension popup
- Token stored in extension storage (encrypted)
- Refresh token handling in background worker

### Page Content Extraction

**DOM Extraction Strategy:**

```typescript
interface PageContext {
    url: string;
    title: string;
    text: string; // Cleaned visible text
    html?: string; // Optional raw HTML
    screenshot?: ScreenshotData;
    metadata: {
        description?: string;
        keywords?: string[];
        ogImage?: string;
        author?: string;
        publishDate?: string;
    };
    structured?: {
        tables: TableData[];
        lists: ListData[];
        forms: FormData[];
        headings: HeadingData[];
    };
    selection?: string; // User-selected text
}

interface ScreenshotData {
    type: "viewport" | "fullpage" | "element";
    data: string; // Base64 encoded PNG
    dimensions: { width: number; height: number };
    elementSelector?: string; // CSS selector if element capture
}
```

**Screenshot Capture Methods:**

1. **Visible Viewport** - `chrome.tabs.captureVisibleTab()` - instant, single capture
2. **Full Page Scroll** - Scroll + stitch multiple captures - handles long pages
3. **Element Selection** - Overlay picker UI → capture bounding box of selected element

**Content Cleaning:**

- Remove scripts, styles, hidden elements
- Preserve semantic structure (headings, lists, tables)
- Handle SPAs (wait for dynamic content)
- Respect robots.txt / meta robots

### Workflow Input Auto-Detection

**Mapping Algorithm:**

```typescript
function autoMapInputs(workflow: Workflow, pageContext: PageContext): InputMapping[] {
    const mappings: InputMapping[] = [];

    for (const node of workflow.inputNodes) {
        if (node.type === "input" && node.config.inputType === "text") {
            // Text inputs → page text or selection
            mappings.push({
                nodeId: node.id,
                source: pageContext.selection ? "selection" : "text",
                confidence: pageContext.selection ? 0.9 : 0.7
            });
        }

        if (node.type === "files" || node.type === "vision") {
            // File/Vision inputs → screenshot
            mappings.push({
                nodeId: node.id,
                source: "screenshot",
                confidence: 0.8
            });
        }

        if (node.type === "url") {
            // URL inputs → current page URL
            mappings.push({
                nodeId: node.id,
                source: "url",
                confidence: 0.95
            });
        }
    }

    return mappings;
}
```

**Manual Override UI:**

- Shows auto-detected mappings with confidence scores
- User can change source for any input
- Can exclude inputs from receiving page context
- Preview of what data will be sent

---

## Security Considerations

### Data Handling

- Page content only sent when user initiates action
- No automatic background scraping
- Content encrypted in transit (HTTPS)
- No persistent storage of page content

### Permission Boundaries

- CSP compliance for injected scripts
- Sandboxed iframe for sidebar
- No cross-origin requests without permission
- Clear audit log of page reads

### Sensitive Content

- PII detection before sending (warn user)
- Option to redact sensitive fields
- Banking/finance site warnings
- Password field detection and blocking

---

## MVP Scope (Phase 1)

### Key Decisions

- **UI Model**: Sidebar panel (like Claude's extension)
- **Browser**: Chrome only (Manifest V3)
- **Input Mapping**: Auto-detect with manual override
- **Screenshots**: Full capabilities (viewport, full page, element selection)

### Included

1. **Sidebar panel** with chat interface (primary interaction)
2. **Agent integration** - chat with any user agent using page context
3. **Page text extraction** - clean text from current page
4. **Screenshot capture** - viewport, full page scroll, and element selection
5. **Permission system** - per-site, per-action (following Claude's model)
6. **Workflow execution** - run workflows with auto-detected input mapping + manual override
7. **Authentication** - OAuth with FlowMaestro account
8. **Small popup** - for quick access/settings only (sidebar is primary UI)

### Deferred to Phase 2

- Knowledge base quick-add
- Structured data extraction (tables, forms)
- Keyboard shortcuts
- Floating action button
- Multi-page context (tabs)
- Offline mode
- Firefox support

---

## Success Metrics

| Metric                            | Target                 |
| --------------------------------- | ---------------------- |
| Extension installs                | 1,000 in first month   |
| Daily active users                | 30% of installs        |
| Avg. sessions per user            | 5+ per week            |
| Workflow executions via extension | 20% of total           |
| Agent chats with page context     | 40% of extension chats |
| Permission grant rate             | >70%                   |

---

## Implementation Approach

### Phase 1: Core Extension (MVP)

1. **Extension scaffolding**
    - Chrome Manifest V3 setup
    - Vite + React + TypeScript build
    - Tailwind CSS for styling (matching FlowMaestro design)

2. **Authentication flow**
    - OAuth popup flow with FlowMaestro backend
    - Token storage in chrome.storage.local
    - Refresh token handling in service worker

3. **Sidebar UI**
    - Side panel API (chrome.sidePanel)
    - Agent chat component with streaming
    - Workflow picker with search
    - Tab navigation (Agents / Workflows)

4. **Page content extraction**
    - DOM text extraction with cleaning
    - Screenshot capture (viewport, full page, element)
    - Element picker overlay for selection
    - Metadata extraction (title, URL, OG tags)

5. **Permission system**
    - Per-action permission prompts
    - Site-level permission storage
    - Sensitive domain warnings

6. **Workflow execution**
    - Auto-detect input mapping
    - Manual override UI
    - Execution progress display
    - Result rendering in sidebar

7. **Backend API endpoints**
    - `/api/extension/*` routes
    - Page context processing
    - Streaming response support

### Phase 2: Enhanced Features

1. Knowledge base quick-add
2. Structured data extraction (tables, forms)
3. Keyboard shortcuts
4. User preferences sync across devices
5. Pinned workflows/agents

### Phase 3: Advanced

1. Firefox support (Manifest V2/V3 compatibility)
2. Multi-tab context aggregation
3. Advanced permission rules (wildcards, regex)
4. Usage analytics
5. Team/workspace features

---

## Files to Create/Modify

### New Files (Extension)

```
extensions/chrome/
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── background/service-worker.ts
│   ├── content/content-script.ts
│   ├── sidebar/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── AgentChat.tsx
│   │       ├── WorkflowPicker.tsx
│   │       ├── PermissionDialog.tsx
│   │       └── PageContextPanel.tsx
│   ├── popup/
│   │   ├── index.html
│   │   └── Popup.tsx
│   └── shared/
│       ├── api.ts
│       ├── auth.ts
│       ├── permissions.ts
│       └── extraction.ts
└── assets/
    └── icons/
```

### Backend Modifications

```
backend/src/api/routes/extension/
├── page-context.ts       # Page context processing
├── execute-workflow.ts   # Workflow execution endpoint
├── agent-chat.ts         # Agent chat with context
└── user-context.ts       # User's workflows/agents/KBs
```

### Shared Types

```
shared/src/extension.ts   # Extension-specific types
```
