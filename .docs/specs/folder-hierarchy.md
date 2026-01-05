# Folder Organization - Implementation Spec

## Overview

Folder organization allows users to group their resources (Workflows, Agents, Form Interfaces, Chat Interfaces, and Knowledge Bases) into unified folders. This enables project-based organization where related resources of different types can be kept together.

**Core Value Proposition**: Turn a flat list of resources into organized projects. A "Customer Onboarding" folder can contain the onboarding workflow, support agent, feedback form, and FAQ knowledge base all in one place.

---

## Design Decisions

| Decision       | Choice                                                             |
| -------------- | ------------------------------------------------------------------ |
| **Navigation** | Page-level folders - keep current sidebar, each page shows folders |
| **Depth**      | Flat folders only (single level, no nesting)                       |
| **Display**    | Grouped by type when viewing folder contents                       |
| **Scope**      | Unified folders - one folder can contain any resource type         |

---

## UX Design

### Current State (Before Folders)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workflows                               [Generate with AI] [+ New Workflow]│
│  3 workflows                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │ Workflow 1  │  │ Workflow 2  │  │ Workflow 3  │                          │
│  │             │  │             │  │             │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### With Folders (Root View)

Folders appear in their own section at the top, with a divider separating them from unfiled items below.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workflows                [+ New Folder] [Generate with AI] [+ New Workflow]│
│  2 folders, 3 workflows                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FOLDERS                                                                    │
│  ┌─────────────┐  ┌─────────────┐                                           │
│  │ 📁          │  │ 📁          │                                           │
│  │ Customer    │  │ Internal    │                                           │
│  │ Onboarding  │  │ Tools       │                                           │
│  │ 5 items     │  │ 3 items     │                                           │
│  └─────────────┘  └─────────────┘                                           │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                             │
│  WORKFLOWS                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │ Standalone  │  │ Quick Test  │  │ Demo Flow   │                          │
│  │ Workflow    │  │ Workflow    │  │             │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Section Labels:**

- "FOLDERS" section header (only shown when folders exist)
- Divider line between folders and items
- Resource type header showing current page type (e.g., "WORKFLOWS", "AGENTS")

### Inside a Folder (Single Resource Type View)

When clicking a folder from the Workflows page, breadcrumb updates and only workflows within that folder are shown.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workflows  /  Customer Onboarding       [Generate with AI] [+ New Workflow]│
│  ↑ breadcrumb (clickable)                                                   │
│  2 workflows in this folder                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐                                           │
│  │ Onboarding  │  │ Welcome     │                                           │
│  │ Flow        │  │ Email       │                                           │
│  │             │  │ Sequence    │                                           │
│  └─────────────┘  └─────────────┘                                           │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                             │
│  Also in this folder:                                                       │
│  [Agents: 1]  [Form Interfaces: 1]  [Knowledge Bases: 2]                    │
│  ↑ clickable chips that navigate to that page with same folder selected     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Breadcrumb Behavior:**

- Shows: `{Page Title} / {Folder Name}`
- Page title ("Workflows") is clickable → returns to root view
- Folder name shows current folder context

**"Also in this folder" Section:**

- Shows counts of other resource types in this folder
- Clickable chips navigate to other pages with same folder selected
- Example: Clicking "Agents: 1" goes to `/agents?folderId=xxx`
- Only shows types that have items in this folder (hides empty types)

### Inside a Folder (Empty State for Current Type)

When a folder has items but none of the current page's type:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workflows  /  Marketing Campaigns       [Generate with AI] [+ New Workflow]│
│  0 workflows in this folder                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                     ┌──────────────────────────┐                            │
│                     │      📄                  │                            │
│                     │  No workflows yet        │                            │
│                     │                          │                            │
│                     │  This folder doesn't     │                            │
│                     │  have any workflows.     │                            │
│                     │                          │                            │
│                     │  [+ Create Workflow]     │                            │
│                     └──────────────────────────┘                            │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                             │
│  Also in this folder:                                                       │
│  [Agents: 2]  [Form Interfaces: 3]                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agents Page Example (Root View)

Same pattern applies to all resource pages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Agents                                         [+ New Folder] [+ New Agent]│
│  2 folders, 1 agent                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FOLDERS                                                                    │
│  ┌─────────────┐  ┌─────────────┐                                           │
│  │ 📁          │  │ 📁          │                                           │
│  │ Customer    │  │ Internal    │                                           │
│  │ Onboarding  │  │ Tools       │                                           │
│  │ 5 items     │  │ 3 items     │                                           │
│  └─────────────┘  └─────────────┘                                           │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                             │
│  AGENTS                                                                     │
│  ┌─────────────┐                                                            │
│  │ 🤖 General  │                                                            │
│  │ Assistant   │                                                            │
│  │ GPT-4       │                                                            │
│  └─────────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agents Page Inside Folder

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Agents  /  Customer Onboarding                            [+ New Agent]    │
│  1 agent in this folder                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ 🤖 Support  │                                                            │
│  │ Agent       │                                                            │
│  │ GPT-4       │                                                            │
│  └─────────────┘                                                            │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                             │
│  Also in this folder:                                                       │
│  [Workflows: 2]  [Form Interfaces: 1]  [Knowledge Bases: 2]                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### No Folders Yet (First Time User)

When user has no folders, show normal list without folder section:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workflows                [+ New Folder] [Generate with AI] [+ New Workflow]│
│  3 workflows                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │ Workflow 1  │  │ Workflow 2  │  │ Workflow 3  │                          │
│  │             │  │             │  │             │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Note:** "New Folder" button always visible, but FOLDERS section only shows when at least one folder exists.

---

## User Flows

### Creating a Folder

1. User clicks "New Folder" button (next to existing "New Workflow" etc.)
2. Dialog appears with:
    - Name input (required)
    - Color selector (optional, preset palette)
3. User enters name, optionally picks color
4. Folder appears in the grid

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Folder                                              [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name                                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Customer Onboarding                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Color (optional)                                               │
│  [🔵] [🟢] [🟡] [🟠] [🔴] [🟣] [⚫] [⚪]                       │
│                                                                 │
│                                      [Cancel]  [Create Folder]  │
└─────────────────────────────────────────────────────────────────┘
```

### Moving Items to a Folder

**Method 1: Context Menu (Single Item)**

1. Right-click on any item card
2. Select "Move to folder..."
3. Dialog shows list of folders + "No folder" option
4. Select destination, item moves

**Method 2: Bulk Selection**

1. Select multiple items (shift+click)
2. Click "Move to folder" in bulk actions bar
3. Same dialog appears
4. All selected items move together

```
┌─────────────────────────────────────────────────────────────────┐
│  Move to Folder                                             [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select destination for 3 items:                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📁 Customer Onboarding                                 │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  📁 Internal Tools                                      │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  📁 Marketing Campaigns                                 │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  ○ No folder (root level)                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                                         [Cancel]  [Move Items]  │
└─────────────────────────────────────────────────────────────────┘
```

### Navigating Folders

**Entering a Folder:**

1. Click folder card to enter
2. URL updates: `/workflows?folderId=<id>`
3. Breadcrumb updates: "Workflows / Customer Onboarding"
4. Shows only items of current page type (e.g., workflows) that are in this folder
5. "Also in this folder" section shows counts for other resource types

**Exiting a Folder:**

1. Click the page title in breadcrumb (e.g., "Workflows")
2. Returns to root view with folders section + unfiled items
3. URL clears folderId param

**Navigating to Other Types in Same Folder:**

1. Click a chip in "Also in this folder" section (e.g., "Agents: 1")
2. Navigates to `/agents?folderId=<id>`
3. Shows agents in that folder with same breadcrumb pattern

### Folder Management

**Rename/Edit Folder:**

1. Click folder card's 3-dot menu
2. Select "Edit folder"
3. Dialog with name/color fields
4. Save changes

**Delete Folder:**

1. Click folder card's 3-dot menu
2. Select "Delete folder"
3. Confirmation dialog explains items will return to root
4. Confirm → folder deleted, items move to root (not deleted)

---

## Cross-Page Folder Behavior

Since folders are unified (one folder can contain multiple resource types), the same folders appear across all resource pages.

### Root View (No Folder Selected)

| Page               | Shows                                                       |
| ------------------ | ----------------------------------------------------------- |
| `/workflows`       | FOLDERS section + divider + unfiled WORKFLOWS section       |
| `/agents`          | FOLDERS section + divider + unfiled AGENTS section          |
| `/form-interfaces` | FOLDERS section + divider + unfiled FORM INTERFACES section |
| `/chat-interfaces` | FOLDERS section + divider + unfiled CHAT INTERFACES section |
| `/knowledge-bases` | FOLDERS section + divider + unfiled KNOWLEDGE BASES section |

**Key behaviors:**

- Same folders appear on all pages (unified folder system)
- Each page shows only its own resource type below the divider
- Folder cards show total item count across all types

### Inside a Folder

| URL                                | Shows                                              |
| ---------------------------------- | -------------------------------------------------- |
| `/workflows?folderId=abc123`       | Workflows in folder + "Also in folder" chips       |
| `/agents?folderId=abc123`          | Agents in folder + "Also in folder" chips          |
| `/form-interfaces?folderId=abc123` | Form interfaces in folder + "Also in folder" chips |

**Key behaviors:**

- Shows only items of the current page type that are in the folder
- Breadcrumb shows: `{Page Title} / {Folder Name}`
- "Also in this folder" shows clickable chips for other types with items
- Clicking a chip navigates to that page with same folderId preserved

### Example Navigation Flow

1. User is on `/workflows` (root)
    - Sees: FOLDERS section with "Customer Onboarding" + divider + WORKFLOWS with 3 unfiled items

2. User clicks "Customer Onboarding" folder
    - URL: `/workflows?folderId=abc123`
    - Breadcrumb: "Workflows / Customer Onboarding"
    - Sees: 2 workflows in this folder
    - "Also in this folder": [Agents: 1] [Knowledge Bases: 2]

3. User clicks "Agents: 1" chip
    - URL: `/agents?folderId=abc123`
    - Breadcrumb: "Agents / Customer Onboarding"
    - Sees: 1 agent in this folder
    - "Also in this folder": [Workflows: 2] [Knowledge Bases: 2]

4. User clicks "Agents" in breadcrumb
    - URL: `/agents` (root)
    - Sees: FOLDERS section + divider + AGENTS section with unfiled agents

---

## Database Schema

### New Table: folders

```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',  -- hex color
    position INTEGER DEFAULT 0,          -- for manual ordering
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,              -- soft delete

    CONSTRAINT unique_folder_name_per_user UNIQUE (user_id, name) WHERE deleted_at IS NULL
);

-- Indexes
CREATE INDEX idx_folders_user_id ON folders(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_position ON folders(user_id, position) WHERE deleted_at IS NULL;

-- Updated at trigger
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Schema Changes: Add folder_id to Resource Tables

```sql
-- Workflows
ALTER TABLE workflows
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX idx_workflows_folder ON workflows(folder_id) WHERE deleted_at IS NULL;

-- Agents
ALTER TABLE agents
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX idx_agents_folder ON agents(folder_id) WHERE deleted_at IS NULL;

-- Form Interfaces
ALTER TABLE form_interfaces
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX idx_form_interfaces_folder ON form_interfaces(folder_id) WHERE deleted_at IS NULL;

-- Chat Interfaces
ALTER TABLE chat_interfaces
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX idx_chat_interfaces_folder ON chat_interfaces(folder_id) WHERE deleted_at IS NULL;

-- Knowledge Bases
ALTER TABLE knowledge_bases
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX idx_knowledge_bases_folder ON knowledge_bases(folder_id) WHERE deleted_at IS NULL;
```

**Note:** Using `ON DELETE SET NULL` so when a folder is deleted, items return to root level (folder_id becomes NULL) rather than being deleted.

---

## Shared Types

### File: `shared/src/folder.ts`

```typescript
// Folder entity
export interface Folder {
    id: string;
    userId: string;
    name: string;
    color: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}

// Create folder input
export interface CreateFolderInput {
    name: string;
    color?: string;
}

// Update folder input
export interface UpdateFolderInput {
    name?: string;
    color?: string;
    position?: number;
}

// Folder with item counts (for display)
export interface FolderWithCounts extends Folder {
    itemCounts: {
        workflows: number;
        agents: number;
        formInterfaces: number;
        chatInterfaces: number;
        knowledgeBases: number;
        total: number;
    };
}

// Folder contents response (grouped by type)
export interface FolderContents {
    folder: Folder;
    items: {
        workflows: WorkflowSummary[];
        agents: AgentSummary[];
        formInterfaces: FormInterfaceSummary[];
        chatInterfaces: ChatInterfaceSummary[];
        knowledgeBases: KnowledgeBaseSummary[];
    };
}

// Move items request
export interface MoveItemsToFolderInput {
    itemIds: string[];
    itemType: "workflow" | "agent" | "form-interface" | "chat-interface" | "knowledge-base";
    folderId: string | null; // null = move to root
}

// Color palette (predefined options)
export const FOLDER_COLORS = [
    "#6366f1", // Indigo (default)
    "#22c55e", // Green
    "#eab308", // Yellow
    "#f97316", // Orange
    "#ef4444", // Red
    "#a855f7", // Purple
    "#64748b", // Slate
    "#0ea5e9" // Sky
] as const;
```

---

## API Endpoints

### Folder CRUD

```
POST   /api/folders                     Create folder
GET    /api/folders                     List all folders with item counts
GET    /api/folders/:id                 Get folder details
PATCH  /api/folders/:id                 Update folder (name, color, position)
DELETE /api/folders/:id                 Delete folder (items → root)
GET    /api/folders/:id/contents        Get all items in folder (grouped by type)
```

### Folder Filtering on Existing Endpoints

```
GET /api/workflows?folderId=:id         Workflows in specific folder
GET /api/workflows?folderId=null        Workflows not in any folder (root)
GET /api/agents?folderId=:id            Agents in specific folder
GET /api/form-interfaces?folderId=:id   Form interfaces in specific folder
GET /api/chat-interfaces?folderId=:id   Chat interfaces in specific folder
GET /api/knowledge-bases?folderId=:id   Knowledge bases in specific folder
```

### Move Items

```
POST /api/resources/move                Move items to folder
     Body: { itemIds: [], itemType: 'workflow', folderId: 'xxx' | null }
```

---

## API Response Examples

### GET /api/folders

```json
{
    "success": true,
    "data": {
        "folders": [
            {
                "id": "folder-123",
                "name": "Customer Onboarding",
                "color": "#22c55e",
                "position": 0,
                "itemCounts": {
                    "workflows": 2,
                    "agents": 1,
                    "formInterfaces": 1,
                    "chatInterfaces": 0,
                    "knowledgeBases": 2,
                    "total": 6
                },
                "createdAt": "2024-01-15T10:00:00Z",
                "updatedAt": "2024-01-20T15:30:00Z"
            },
            {
                "id": "folder-456",
                "name": "Internal Tools",
                "color": "#6366f1",
                "position": 1,
                "itemCounts": {
                    "workflows": 3,
                    "agents": 0,
                    "formInterfaces": 0,
                    "chatInterfaces": 1,
                    "knowledgeBases": 0,
                    "total": 4
                },
                "createdAt": "2024-01-10T08:00:00Z",
                "updatedAt": "2024-01-10T08:00:00Z"
            }
        ]
    }
}
```

### GET /api/folders/:id/contents

```json
{
    "success": true,
    "data": {
        "folder": {
            "id": "folder-123",
            "name": "Customer Onboarding",
            "color": "#22c55e"
        },
        "items": {
            "workflows": [
                { "id": "wf-1", "name": "Onboarding Flow", "createdAt": "..." },
                { "id": "wf-2", "name": "Welcome Email", "createdAt": "..." }
            ],
            "agents": [
                { "id": "ag-1", "name": "Support Agent", "provider": "openai", "model": "gpt-4" }
            ],
            "formInterfaces": [{ "id": "fi-1", "name": "Feedback Form", "status": "published" }],
            "chatInterfaces": [],
            "knowledgeBases": [
                { "id": "kb-1", "name": "FAQ Docs", "documentCount": 15 },
                { "id": "kb-2", "name": "Product Guide", "documentCount": 8 }
            ]
        }
    }
}
```

---

## Frontend Components

### New Components

```
frontend/src/components/folders/
├── FolderCard.tsx              Folder card for grid display
├── FolderSection.tsx           "FOLDERS" section with header and grid
├── CreateFolderDialog.tsx      Create/edit folder dialog
├── MoveToFolderDialog.tsx      Select folder destination
├── FolderBreadcrumb.tsx        Navigation breadcrumb (Page / Folder)
├── FolderOtherTypesChips.tsx   "Also in this folder" clickable chips
├── FolderColorPicker.tsx       Color selector component
├── FolderDivider.tsx           Visual divider between folders and items
└── EmptyFolderState.tsx        Empty state when folder has no items of current type
```

### FolderCard Component

```tsx
interface FolderCardProps {
    folder: FolderWithCounts;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

// Displays:
// - Folder icon with color accent
// - Folder name
// - Total item count (e.g., "5 items")
// - 3-dot menu (Edit, Delete)
// - Hover effect matching other cards
```

### FolderSection Component

```tsx
interface FolderSectionProps {
    folders: FolderWithCounts[];
    onFolderClick: (folderId: string) => void;
    onEditFolder: (folder: Folder) => void;
    onDeleteFolder: (folder: Folder) => void;
}

// Renders:
// - "FOLDERS" section header (only if folders.length > 0)
// - Grid of FolderCards
// - Hidden when no folders exist
```

### FolderBreadcrumb Component

```tsx
interface FolderBreadcrumbProps {
    pageTitle: string; // "Workflows", "Agents", etc.
    pagePath: string; // "/workflows", "/agents", etc.
    folder: Folder | null; // Current folder (null = root, don't render)
}

// Renders when folder is selected:
// "Workflows  /  Customer Onboarding"
//  ↑ clickable    ↑ static text
// Clicking page title navigates to root (clears folderId param)
// Does not render when folder is null (root view)
```

### FolderOtherTypesChips Component

```tsx
interface FolderOtherTypesChipsProps {
    folder: Folder;
    itemCounts: FolderWithCounts["itemCounts"];
    currentType: "workflows" | "agents" | "formInterfaces" | "chatInterfaces" | "knowledgeBases";
}

// Renders "Also in this folder:" section with clickable chips
// Example: [Agents: 1] [Form Interfaces: 1] [Knowledge Bases: 2]
// Each chip navigates to that page with folderId preserved
// Only shows types with count > 0
// Excludes current page type from chips
```

### MoveToFolderDialog Component

```tsx
interface MoveToFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemCount: number;
    itemType: string;
    currentFolderId: string | null;
    onMove: (folderId: string | null) => void;
}

// Shows list of folders + "No folder (root level)" option
// Highlights current folder if item is already in one
// Handles loading state while moving
```

---

## Page Updates

### Updates to List Pages

Each list page (Workflows, Agents, FormInterfaces, ChatInterfaces, KnowledgeBases) needs:

1. **URL Parameter**: Read `folderId` from URL query params
2. **Folder State**: Track current folder (if any)
3. **Fetch Logic**:
    - If no folderId (root): fetch all folders + items where folder_id IS NULL
    - If folderId (inside folder): fetch folder details + items of current type in folder
4. **UI Updates - Root View** (no folderId):
    - Add "New Folder" button in header
    - Show FolderSection with all folders (if any exist)
    - Show FolderDivider (if folders exist)
    - Show section header for current type (e.g., "WORKFLOWS")
    - Show items not in any folder
5. **UI Updates - Inside Folder** (with folderId):
    - Show FolderBreadcrumb: "Workflows / Folder Name"
    - Show items of current type in this folder
    - Show FolderDivider
    - Show FolderOtherTypesChips with counts for other types
6. **Context Menu**: Add "Move to folder..." option

### Modified Files

```
frontend/src/pages/Workflows.tsx
frontend/src/pages/Agents.tsx
frontend/src/pages/FormInterfaces.tsx
frontend/src/pages/ChatInterfaces.tsx
frontend/src/pages/KnowledgeBases.tsx
```

### Shared Logic Hook

```tsx
// frontend/src/hooks/useFolderNavigation.ts
export function useFolderNavigation() {
    const [searchParams, setSearchParams] = useSearchParams();
    const folderId = searchParams.get("folderId");

    const navigateToFolder = (id: string) => {
        setSearchParams({ folderId: id });
    };

    const navigateToRoot = () => {
        setSearchParams({});
    };

    return { folderId, navigateToFolder, navigateToRoot };
}
```

---

## Backend Implementation

### FolderRepository

```typescript
// backend/src/storage/repositories/FolderRepository.ts

export class FolderRepository {
    async create(userId: string, input: CreateFolderInput): Promise<Folder>;
    async findById(id: string, userId: string): Promise<Folder | null>;
    async findByUserId(userId: string): Promise<Folder[]>;
    async findByUserIdWithCounts(userId: string): Promise<FolderWithCounts[]>;
    async update(id: string, userId: string, input: UpdateFolderInput): Promise<Folder | null>;
    async softDelete(id: string, userId: string): Promise<boolean>;
    async getContents(id: string, userId: string): Promise<FolderContents>;
    async isNameAvailable(name: string, userId: string, excludeId?: string): Promise<boolean>;
}
```

### Item Count Query

```sql
-- Get folder with item counts
SELECT
    f.*,
    (SELECT COUNT(*) FROM workflows w WHERE w.folder_id = f.id AND w.deleted_at IS NULL) as workflow_count,
    (SELECT COUNT(*) FROM agents a WHERE a.folder_id = f.id AND a.deleted_at IS NULL) as agent_count,
    (SELECT COUNT(*) FROM form_interfaces fi WHERE fi.folder_id = f.id AND fi.deleted_at IS NULL) as form_interface_count,
    (SELECT COUNT(*) FROM chat_interfaces ci WHERE ci.folder_id = f.id AND ci.deleted_at IS NULL) as chat_interface_count,
    (SELECT COUNT(*) FROM knowledge_bases kb WHERE kb.folder_id = f.id AND kb.deleted_at IS NULL) as knowledge_base_count
FROM folders f
WHERE f.user_id = $1 AND f.deleted_at IS NULL
ORDER BY f.position, f.created_at;
```

### Move Items Service

```typescript
// backend/src/services/FolderService.ts

export class FolderService {
    async moveItems(
        userId: string,
        itemIds: string[],
        itemType: string,
        folderId: string | null
    ): Promise<void> {
        // Verify folder ownership (if folderId provided)
        if (folderId) {
            const folder = await this.folderRepo.findById(folderId, userId);
            if (!folder) throw new NotFoundError("Folder not found");
        }

        // Update items based on type
        const repo = this.getRepositoryForType(itemType);
        await repo.updateFolderId(itemIds, userId, folderId);
    }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [ ] Database migration for folders table
- [ ] Add folder_id to all 5 resource tables
- [ ] Folder model and repository
- [ ] Shared types in `@flowmaestro/shared`
- [ ] Basic CRUD API routes for folders

### Phase 2: Frontend Foundation

- [ ] FolderCard component
- [ ] FolderSection component (with "FOLDERS" header)
- [ ] FolderDivider component
- [ ] CreateFolderDialog component
- [ ] FolderBreadcrumb component
- [ ] useFolderNavigation hook
- [ ] Add folder API methods to `api.ts`

### Phase 3: List Page Integration

- [ ] Update Workflows page with folder support (root view + inside folder view)
- [ ] Update Agents page with folder support
- [ ] Update Form Interfaces page with folder support
- [ ] Update Chat Interfaces page with folder support
- [ ] Update Knowledge Bases page with folder support
- [ ] FolderOtherTypesChips component ("Also in this folder")
- [ ] EmptyFolderState component

### Phase 4: Move Functionality

- [ ] MoveToFolderDialog component
- [ ] Context menu "Move to folder..." option
- [ ] Bulk move with selection
- [ ] Move items API endpoint

### Phase 5: Polish

- [ ] FolderColorPicker with preset palette
- [ ] Folder ordering (drag to reorder)
- [ ] Keyboard shortcuts (Enter to open folder, Backspace to go back)
- [ ] Toast notifications for folder operations

---

## Edge Cases & Considerations

### Folder Deletion

- Items in folder return to root (folder_id → NULL)
- Soft delete folder (can potentially restore)
- Show confirmation dialog explaining behavior

### Duplicate Folder Names

- Enforce unique folder names per user
- Case-insensitive comparison
- Show validation error in create/edit dialog

### Empty Folders

- Allow empty folders (no items)
- Show empty state with helpful message
- Quick-add buttons for each resource type

### URL Handling

- Invalid folderId in URL → redirect to root with toast
- Folder deleted while viewing → redirect to root with toast
- Deep linking works: `/workflows?folderId=abc123`

### Sorting

- Folders always appear before items in grid
- Within folders: sorted by position (manual), then created_at
- Within items: maintain existing sort (usually by updated_at desc)

### Search

- Future enhancement: search across all folders
- Current: search only within current view (root or specific folder)

### Performance

- Item counts fetched with single query (subqueries)
- Folder contents paginated if needed (future)
- Cache folder list (short TTL)

---

## Files to Create/Modify

### Backend (New)

```
backend/migrations/1730000000035_create-folders.sql
backend/src/storage/models/Folder.ts
backend/src/storage/repositories/FolderRepository.ts
backend/src/api/routes/folders/index.ts
backend/src/api/routes/folders/create.ts
backend/src/api/routes/folders/list.ts
backend/src/api/routes/folders/get.ts
backend/src/api/routes/folders/update.ts
backend/src/api/routes/folders/delete.ts
backend/src/api/routes/folders/contents.ts
backend/src/api/routes/resources/move.ts
backend/src/services/FolderService.ts
```

### Backend (Modify)

```
backend/src/api/routes/workflows/list.ts          - add folderId filter
backend/src/api/routes/agents/list.ts             - add folderId filter
backend/src/api/routes/form-interfaces/list.ts    - add folderId filter
backend/src/api/routes/chat-interfaces/list.ts    - add folderId filter
backend/src/api/routes/knowledge-bases/list.ts    - add folderId filter
backend/src/api/server.ts                         - register folder routes
```

### Shared (New)

```
shared/src/folder.ts
```

### Frontend (New)

```
frontend/src/components/folders/FolderCard.tsx
frontend/src/components/folders/FolderSection.tsx
frontend/src/components/folders/CreateFolderDialog.tsx
frontend/src/components/folders/MoveToFolderDialog.tsx
frontend/src/components/folders/FolderBreadcrumb.tsx
frontend/src/components/folders/FolderOtherTypesChips.tsx
frontend/src/components/folders/FolderColorPicker.tsx
frontend/src/components/folders/FolderDivider.tsx
frontend/src/components/folders/EmptyFolderState.tsx
frontend/src/hooks/useFolderNavigation.ts
```

### Frontend (Modify)

```
frontend/src/lib/api.ts                    - add folder API methods
frontend/src/pages/Workflows.tsx           - integrate folders
frontend/src/pages/Agents.tsx              - integrate folders
frontend/src/pages/FormInterfaces.tsx      - integrate folders
frontend/src/pages/ChatInterfaces.tsx      - integrate folders
frontend/src/pages/KnowledgeBases.tsx      - integrate folders
```

---

## Reference Files

| Pattern            | Reference File                                                  |
| ------------------ | --------------------------------------------------------------- |
| Repository pattern | `backend/src/storage/repositories/WorkflowRepository.ts`        |
| List page pattern  | `frontend/src/pages/Workflows.tsx`                              |
| Card component     | `frontend/src/pages/FormInterfaces.tsx` (FormInterfaceCard)     |
| Dialog pattern     | `frontend/src/components/common/ConfirmDialog.tsx`              |
| Context menu       | `frontend/src/pages/Workflows.tsx` (handleContextMenu)          |
| URL params hook    | `react-router-dom` useSearchParams                              |
| Shared types       | `shared/src/form-interface.ts`                                  |
| Migration pattern  | `backend/migrations/1730000000034_create-public-api-tables.sql` |
